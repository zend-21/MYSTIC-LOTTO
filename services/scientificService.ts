import { getFunctions, httpsCallable } from "firebase/functions";
import { doc, getDoc } from "firebase/firestore";
import { app, db } from "./firebase";
import { LottoRound, ScientificAnalysisResult, ScientificFilterConfig } from "../types";
import ScientificWorker from "../workers/scientificWorker?worker";

// Firestore lotto_history 실시간 페치 (5분 캐시)
let _cachedHistory: LottoRound[] | null = null;
let _cacheTs = 0;
const getLiveHistory = async (): Promise<LottoRound[]> => {
  if (_cachedHistory && Date.now() - _cacheTs < 5 * 60 * 1000) return _cachedHistory;
  try {
    const snap = await getDoc(doc(db, "global", "lotto_history"));
    if (snap.exists()) {
      const raw = (snap.data().history as LottoRound[]).sort((a, b) => b.round - a.round);
      _cachedHistory = raw;
      _cacheTs = Date.now();
      return raw;
    }
  } catch { /* fall through */ }
  return [];
};

const buildHistoricalLeadingDigitDist = (history: LottoRound[]): number[] => {
  const counts = new Array(10).fill(0);
  let total = 0;
  for (const round of history) {
    for (const n of round.numbers) {
      counts[parseInt(n.toString()[0])]++;
      total++;
    }
  }
  return total > 0
    ? counts.map(c => c / total)
    : [0, 0.301, 0.176, 0.125, 0.097, 0.079, 0.067, 0.058, 0.051, 0.046];
};

// Worker에 계산을 위임하고 결과를 Promise로 반환
const runWorkerComputation = (payload: {
  config: ScientificFilterConfig;
  liveHistory: LottoRound[];
  historicalDist: number[];
  lastRoundNumbers: number[];
}): Promise<{ candidate: number[]; metrics: any; bradfordSets: number[][] }> => {
  return new Promise((resolve, reject) => {
    const worker = new ScientificWorker();
    worker.onmessage = (e: MessageEvent) => {
      resolve(e.data);
      worker.terminate();
    };
    worker.onerror = (err: ErrorEvent) => {
      reject(err);
      worker.terminate();
    };
    worker.postMessage(payload);
  });
};

const functions = getFunctions(app, "asia-northeast3");

export const getScientificRecommendation = async (config: ScientificFilterConfig): Promise<ScientificAnalysisResult> => {
  // 1. Firestore 최신 데이터 페치 (5분 캐시) — 메인 스레드
  const liveHistory = await getLiveHistory();
  const historicalDist = buildHistoricalLeadingDigitDist(liveHistory);
  const lastRoundNumbers = liveHistory[0]?.numbers ?? [];

  // 2. 20,000회 반복 계산 — Web Worker (UI 블로킹 없음)
  const { candidate, metrics, bradfordSets } = await runWorkerComputation({
    config,
    liveHistory,
    historicalDist,
    lastRoundNumbers,
  });

  // 3. 통계 지표 계산 — 메인 스레드 (빠른 연산)
  const matchProbability = liveHistory.length > 0
    ? liveHistory.filter(r => {
        const s = r.numbers.reduce((a, b) => a + b, 0);
        return s >= config.totalSumRange[0] && s <= config.totalSumRange[1];
      }).length / liveHistory.length * 100
    : 0;

  const histSums = liveHistory.map(r => r.numbers.reduce((a, b) => a + b, 0));
  const avgHistSum = histSums.length > 0 ? histSums.reduce((a, b) => a + b, 0) / histSums.length : 150;
  const stdHistSum = histSums.length > 0
    ? Math.sqrt(histSums.map(s => Math.pow(s - avgHistSum, 2)).reduce((a, b) => a + b, 0) / histSums.length)
    : 1;
  const zScore = Math.abs(metrics.sum - avgHistSum) / (stdHistSum || 1);
  const historicalRank = Math.min(50, Math.max(1, Math.round(zScore * 13) + 1));

  let engineLabel: string = config.algorithmMode;
  if      (config.algorithmMode === 'BradfordLegacy') engineLabel = "Bradford Legacy Engine (100% Coverage)";
  else if (config.algorithmMode === 'Bradford')       engineLabel = "Balanced Coverage Engine (Spatial Balance)";
  else if (config.algorithmMode === 'EntropyMax')     engineLabel = "Entropy Maximizer Engine (AC Optimization)";
  else if (config.algorithmMode === 'LowFrequency')   engineLabel = "Cold Number Recall Engine (Frequency Weighting)";
  else                                                engineLabel = "Standard Random Engine";

  // 4. Gemini AI 리포트 — Firebase Function (메인 스레드)
  const fn = httpsCallable<object, { finalReport: string }>(functions, "getScientificReport");
  const result = await fn({ candidate, metrics, engineLabel, algorithmMode: config.algorithmMode, bradfordSets });

  return {
    numbers: candidate,
    metrics,
    scientificReport: result.data.finalReport,
    matchProbability,
    historicalRank,
  };
};

/// <reference lib="webworker" />
// Web Worker — Firebase 없는 순수 계산 전용 스레드
import { ScientificFilterConfig, LottoRound } from '../types';

const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43];

const calculateAC = (numbers: number[]): number => {
  const differences = new Set<number>();
  const sorted = [...numbers].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      differences.add(Math.abs(sorted[i] - sorted[j]));
    }
  }
  return differences.size - (sorted.length - 1);
};

const calculateBenfordMetrics = (numbers: number[], historicalDist: number[]) => {
  const leadingDigits = numbers.map(n => parseInt(n.toString()[0]));
  const counts = new Array(10).fill(0);
  leadingDigits.forEach(d => counts[d]++);
  let totalDeviation = 0;
  for (let i = 1; i <= 9; i++) {
    const actualFreq = counts[i] / numbers.length;
    const expectedFreq = historicalDist[i];
    totalDeviation += Math.pow(actualFreq - expectedFreq, 2);
  }
  const rawScore = 100 - (Math.sqrt(totalDeviation) * 120);
  return {
    score: Math.round(Math.max(0, Math.min(100, rawScore))),
    distribution: counts.slice(1)
  };
};

// 정규분포 Z-Score: 로또 6/45 이론 합계 평균=138, 표준편차≈24
const calculateZScore = (sum: number): number => {
  return Number(((sum - 138) / 24).toFixed(2));
};

// 카이제곱 적합도: 5개 구간 균일도 → 구간 크기 비례 기대빈도 사용
const calculateChiSquared = (numbers: number[]): number => {
  const zones = [0, 0, 0, 0, 0]; // 1-9, 10-19, 20-29, 30-39, 40-45
  numbers.forEach(n => {
    if (n <= 9) zones[0]++;
    else if (n <= 19) zones[1]++;
    else if (n <= 29) zones[2]++;
    else if (n <= 39) zones[3]++;
    else zones[4]++;
  });
  // 구간 크기 비례 기대빈도: 총 45개 번호 중 6개 추출 기준
  const expected = [
    6 * (9 / 45),   // 1-9  (9개) → 1.200
    6 * (10 / 45),  // 10-19 (10개) → 1.333
    6 * (10 / 45),  // 20-29 (10개) → 1.333
    6 * (10 / 45),  // 30-39 (10개) → 1.333
    6 * (6 / 45),   // 40-45 (6개)  → 0.800
  ];
  let chiSum = 0;
  zones.forEach((obs, i) => {
    chiSum += Math.pow(obs - expected[i], 2) / expected[i];
  });
  // chiSum=0(완벽 균일)→100점, chiSum≥20(극단적 쏠림)→0점
  return Math.max(0, Math.round(100 - chiSum * 5));
};

const calculateFullMetrics = (numbers: number[], lastRound: number[], historicalDist: number[]) => {
  const sorted = [...numbers].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const sum123 = sorted[0] + sorted[1] + sorted[2];
  const sum456 = sorted[3] + sorted[4] + sorted[5];
  const odds = sorted.filter(n => n % 2 !== 0).length;
  const highs = sorted.filter(n => n >= 23).length;
  const acValue = calculateAC(sorted);
  const primeCount = sorted.filter(n => PRIMES.includes(n)).length;
  const { score: benfordScore, distribution: leadDigitsDistribution } = calculateBenfordMetrics(sorted, historicalDist);
  const sumZScore = calculateZScore(sum);
  const chiSquaredScore = calculateChiSquared(sorted);

  let consecutiveCount = 0;
  let minGap = 45;
  let totalGap = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = sorted[i + 1] - sorted[i];
    if (gap === 1) consecutiveCount++;
    if (gap < minGap) minGap = gap;
    totalGap += gap;
  }

  const endings = sorted.map(n => n % 10);
  const sameEndingCount = endings.length - new Set(endings).size;
  const carryOverCount = sorted.filter(n => lastRound.includes(n)).length;
  const neighbors = lastRound.flatMap(n => [n - 1, n + 1]).filter(n => n > 0 && n <= 45);
  const neighborCount = sorted.filter(n => neighbors.includes(n)).length;

  return {
    sum, sum123, sum456, acValue,
    oddEven: `${odds}:${6 - odds}`,
    highLow: `${highs}:${6 - highs}`,
    consecutiveCount, sameEndingCount, primeCount, carryOverCount, neighborCount,
    averageGap: Number((totalGap / 5).toFixed(1)),
    minGap, benfordScore, leadDigitsDistribution,
    sumZScore, chiSquaredScore
  };
};

const generateBradfordFullSet = (excluded: number[]): number[][] => {
  let pool = Array.from({ length: 45 }, (_, i) => i + 1).filter(n => !excluded.includes(n));
  const shuffle = (arr: number[]) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  const shuffledPool = shuffle([...pool]);
  const sets: number[][] = [];
  for (let i = 0; i < 7; i++) {
    sets.push(shuffledPool.slice(i * 6, (i + 1) * 6).sort((a, b) => a - b));
  }
  const remaining = shuffledPool.slice(42);
  const extra = shuffle([...shuffledPool.slice(0, 42)]).slice(0, 3);
  sets.push([...remaining, ...extra].sort((a, b) => a - b));
  return sets;
};

const fisherYates = (array: number[]): void => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
};

const runStandardSimulation = (fixed: number[], excluded: number[]): number[] => {
  let box = Array.from({ length: 45 }, (_, i) => i + 1).filter(n => !excluded.includes(n));
  let candidates = box.filter(n => !fixed.includes(n));
  fisherYates(candidates);
  return [...fixed, ...candidates.slice(0, 6 - fixed.length)].sort((a, b) => a - b);
};

const runBalancedCoverageSimulation = (fixed: number[], excluded: number[]): number[] => {
  const ZONES = [
    [1,2,3,4,5,6,7,8,9],
    [10,11,12,13,14,15,16,17,18,19],
    [20,21,22,23,24,25,26,27,28,29],
    [30,31,32,33,34,35,36,37,38,39],
    [40,41,42,43,44,45],
  ];
  const result = [...fixed];
  const usedNumbers = new Set(result);
  if (result.length >= 6) return result.sort((a, b) => a - b);

  const availableZones = ZONES
    .map(zone => zone.filter(n => !excluded.includes(n) && !usedNumbers.has(n)))
    .filter(zone => zone.length > 0);

  if (availableZones.length === 0) return runStandardSimulation(fixed, excluded);

  const shuffledZones = [...availableZones].sort(() => Math.random() - 0.5);
  for (const zone of shuffledZones) {
    if (result.length >= 6) break;
    const available = zone.filter(n => !usedNumbers.has(n));
    if (available.length === 0) continue;
    const pick = available[Math.floor(Math.random() * available.length)];
    result.push(pick);
    usedNumbers.add(pick);
  }

  if (result.length < 6) {
    const allAvailable = Array.from({ length: 45 }, (_, i) => i + 1)
      .filter(n => !excluded.includes(n) && !usedNumbers.has(n));
    while (result.length < 6 && allAvailable.length > 0) {
      const idx = Math.floor(Math.random() * allAvailable.length);
      result.push(allAvailable[idx]);
      usedNumbers.add(allAvailable[idx]);
      allAvailable.splice(idx, 1);
    }
  }
  return result.sort((a, b) => a - b);
};

const runEntropyMaxSimulation = (fixed: number[], excluded: number[]): number[] => {
  let best = runStandardSimulation(fixed, excluded);
  let bestAC = calculateAC(best);
  for (let i = 1; i < 50; i++) {
    const candidate = runStandardSimulation(fixed, excluded);
    const ac = calculateAC(candidate);
    if (ac > bestAC) { bestAC = ac; best = candidate; }
  }
  return best;
};

const runColdNumberSimulation = (fixed: number[], excluded: number[], history: LottoRound[]): number[] => {
  const LOOKBACK = Math.min(50, history.length);
  const freq: Record<number, number> = {};
  for (let n = 1; n <= 45; n++) freq[n] = 0;
  for (let i = 0; i < LOOKBACK; i++) {
    for (const n of history[i].numbers) freq[n]++;
  }
  const result = [...fixed];
  const usedNumbers = new Set(result);
  const remaining = Array.from({ length: 45 }, (_, i) => i + 1)
    .filter(n => !excluded.includes(n) && !usedNumbers.has(n));

  while (result.length < 6 && remaining.length > 0) {
    const maxFreq = Math.max(...remaining.map(n => freq[n]));
    const weights = remaining.map(n => maxFreq + 1 - freq[n]);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const r = Math.random() * totalWeight;
    let cumulative = 0;
    let selected = 0;
    for (let i = 0; i < remaining.length; i++) {
      cumulative += weights[i];
      if (r <= cumulative) { selected = i; break; }
    }
    result.push(remaining[selected]);
    remaining.splice(selected, 1);
  }
  return result.sort((a, b) => a - b);
};

// ─── Wheeling System: 페어 커버리지 극대화 조합 생성 ────────────────────────
const generateAllCombinations = (pool: number[], r: number): number[][] => {
  const result: number[][] = [];
  const combo: number[] = [];
  const recurse = (start: number) => {
    if (combo.length === r) { result.push([...combo]); return; }
    for (let i = start; i < pool.length; i++) {
      combo.push(pool[i]); recurse(i + 1); combo.pop();
    }
  };
  recurse(0);
  return result;
};

const runWheelSimulation = (pool: number[]): number[][] => {
  if (pool.length < 6) return [];
  if (pool.length === 6) return [[...pool].sort((a, b) => a - b)];

  const allCombos = generateAllCombinations(pool, 6);
  const targetCount = pool.length; // N개 풀 → N장 티켓

  if (allCombos.length <= targetCount) {
    return allCombos.map(c => [...c].sort((a, b) => a - b));
  }

  // 그리디 페어 커버리지: 미커버 페어를 가장 많이 포함하는 조합 우선 선택
  const uncoveredPairs = new Set<string>();
  for (let i = 0; i < pool.length; i++)
    for (let j = i + 1; j < pool.length; j++)
      uncoveredPairs.add(`${pool[i]},${pool[j]}`);

  const selected: number[][] = [];
  const remaining = allCombos.map(c => [...c].sort((a, b) => a - b));

  while (selected.length < targetCount && remaining.length > 0) {
    let bestIdx = 0, bestCoverage = -1;
    for (let i = 0; i < remaining.length; i++) {
      const combo = remaining[i];
      let coverage = 0;
      for (let a = 0; a < combo.length; a++)
        for (let b = a + 1; b < combo.length; b++)
          if (uncoveredPairs.has(`${combo[a]},${combo[b]}`)) coverage++;
      if (coverage > bestCoverage) { bestCoverage = coverage; bestIdx = i; }
    }
    const best = remaining[bestIdx];
    selected.push(best);
    remaining.splice(bestIdx, 1);
    for (let a = 0; a < best.length; a++)
      for (let b = a + 1; b < best.length; b++)
        uncoveredPairs.delete(`${best[a]},${best[b]}`);
  }
  return selected;
};

// ─── Co-occurrence 테이블 빌더 & 스코어러 ────────────────────────────────────
const buildCoOccurrenceTable = (history: LottoRound[]): { table: Map<string, number>; avg: number } => {
  const table = new Map<string, number>();
  for (const round of history) {
    const sorted = [...round.numbers].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const key = `${sorted[i]},${sorted[j]}`;
        table.set(key, (table.get(key) ?? 0) + 1);
      }
    }
  }
  const vals = [...table.values()];
  const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  return { table, avg };
};

const countHotPairs = (numbers: number[], table: Map<string, number>, avg: number): number => {
  const sorted = [...numbers].sort((a, b) => a - b);
  let hot = 0;
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const freq = table.get(`${sorted[i]},${sorted[j]}`) ?? 0;
      if (freq >= avg) hot++;
    }
  }
  return hot; // C(6,2) = 15쌍 중 평균 이상인 쌍 수
};

// ─── 메인 루프 ───────────────────────────────────────────────────────────────
self.onmessage = (e: MessageEvent) => {
  const { config, liveHistory, historicalDist, lastRoundNumbers } = e.data as {
    config: ScientificFilterConfig;
    liveHistory: LottoRound[];
    historicalDist: number[];
    lastRoundNumbers: number[];
  };

  const { table: coOccTable, avg: coOccAvg } = buildCoOccurrenceTable(liveHistory);

  let candidate: number[] = [];
  let metrics: ReturnType<typeof calculateFullMetrics> | null = null;
  let bradfordSets: number[][] = [];

  if (config.algorithmMode === 'Wheeling') {
    const wheelSets = runWheelSimulation(config.wheelingPool);
    candidate = wheelSets[0] ?? [];
    bradfordSets = wheelSets;
    metrics = calculateFullMetrics(candidate, lastRoundNumbers, historicalDist);
  } else if (config.algorithmMode === 'BradfordLegacy') {
    bradfordSets = generateBradfordFullSet(config.excludedNumbers);
    candidate = bradfordSets[0];
    metrics = calculateFullMetrics(candidate, lastRoundNumbers, historicalDist);
  } else {
    let attempts = 0;
    let bestEntropyCandidate: number[] = [];
    let bestEntropyMetrics: ReturnType<typeof calculateFullMetrics> | null = null;
    let entropyValidCount = 0;

    while (attempts < 20000) {
      attempts++;

      if (config.algorithmMode === 'Bradford') {
        candidate = runBalancedCoverageSimulation(config.fixedNumbers, config.excludedNumbers);
      } else if (config.algorithmMode === 'EntropyMax') {
        candidate = runEntropyMaxSimulation(config.fixedNumbers, config.excludedNumbers);
      } else if (config.algorithmMode === 'LowFrequency') {
        candidate = runColdNumberSimulation(config.fixedNumbers, config.excludedNumbers, liveHistory);
      } else {
        candidate = runStandardSimulation(config.fixedNumbers, config.excludedNumbers);
      }

      metrics = calculateFullMetrics(candidate, lastRoundNumbers, historicalDist);

      const checkSum       = metrics.sum >= config.totalSumRange[0] && metrics.sum <= config.totalSumRange[1];
      const checkSum123    = metrics.sum123 >= config.sum123Range[0] && metrics.sum123 <= config.sum123Range[1];
      const checkSum456    = metrics.sum456 >= config.sum456Range[0] && metrics.sum456 <= config.sum456Range[1];
      const checkAC        = metrics.acValue >= config.acMin;
      const checkBenford   = !config.applyBenfordLaw || metrics.benfordScore >= 70;
      const checkOdd       = !config.oddRatio || metrics.oddEven === config.oddRatio;
      const checkHighLow   = !config.highLowRatio || metrics.highLow === config.highLowRatio;
      const checkPrime     = metrics.primeCount >= config.primeCountRange[0] && metrics.primeCount <= config.primeCountRange[1];
      const checkConsec    = metrics.consecutiveCount <= config.maxConsecutive;
      const checkEnding    = metrics.sameEndingCount <= config.maxSameEnding;
      const checkGap       = metrics.minGap >= config.gapMin;
      const checkCarryOver = metrics.carryOverCount >= config.carryOverRange[0] && metrics.carryOverCount <= config.carryOverRange[1];
      const checkNeighbor  = metrics.neighborCount >= config.neighborRange[0] && metrics.neighborCount <= config.neighborRange[1];
      let   checkCoOcc     = true;
      if (config.coOccurrenceMode !== 'off') {
        const hotPairs = countHotPairs(candidate, coOccTable, coOccAvg);
        if (config.coOccurrenceMode === 'favor') checkCoOcc = hotPairs >= 8;
        else                                     checkCoOcc = hotPairs <= 7;
      }

      const allPass = checkSum && checkSum123 && checkSum456 && checkAC && checkBenford &&
        checkOdd && checkHighLow && checkPrime && checkConsec &&
        checkEnding && checkGap && checkCarryOver && checkNeighbor && checkCoOcc;

      if (allPass) {
        if (config.algorithmMode !== 'EntropyMax') break;
        entropyValidCount++;
        if (!bestEntropyMetrics || metrics.acValue > bestEntropyMetrics.acValue) {
          bestEntropyCandidate = [...candidate];
          bestEntropyMetrics = { ...metrics };
        }
        if (entropyValidCount >= 10) break;
      }
    }

    if (config.algorithmMode === 'EntropyMax' && bestEntropyMetrics) {
      candidate = bestEntropyCandidate;
      metrics = bestEntropyMetrics;
    }
  }

  self.postMessage({ candidate, metrics, bradfordSets });
};

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ScientificAnalysisResult, ScientificFilterConfig } from '../types';
import { LottoRound } from '../types';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc, deleteField } from 'firebase/firestore';

interface ScientificAnalysisProps {
  loading: boolean;
  result: ScientificAnalysisResult | null;
  onGenerate: (config: ScientificFilterConfig) => void;
  lottoHistory: LottoRound[];
  uid?: string;
}

const INITIAL_CONFIG: ScientificFilterConfig = {
  totalSumRange: [121, 180],
  sum123Range: [30, 80],
  sum456Range: [80, 130],
  acMin: 7,
  oddRatio: "3:3",
  highLowRatio: "3:3",
  primeCountRange: [1, 3],
  maxConsecutive: 1,
  maxSameEnding: 1,
  gapMin: 1,
  carryOverRange: [0, 2],
  neighborRange: [0, 2],
  algorithmMode: 'Standard',
  applyBenfordLaw: false,
  gameCount: 1,
  fixedNumbers: [],
  excludedNumbers: [],
  wheelingPool: [],
  coOccurrenceMode: 'off',
};

const INFO_CONTENT: Record<string, { title: string; body: string }> = {
  benford: {
    title: '벤포드 적합도',
    body: '벤포드의 법칙은 자연 발생 수에서 첫 자리 숫자가 1일 확률이 가장 높고(30.1%), 9일 확률이 가장 낮다(4.6%)는 통계 법칙입니다.\n\n⚠️ 로또는 1~45 사이의 균등 분포로 추출되는 인위적 데이터이므로, 벤포드 법칙이 본질적으로 적용되지 않습니다. 이 지표의 활성화는 권장하지 않습니다.\n\n실제 역대 당첨 번호(1~1211회)의 앞자리 출현 빈도:\n• 앞자리 1 — 약 25%\n• 앞자리 2 — 약 24%\n• 앞자리 3 — 약 25%\n• 앞자리 4 — 약 13%\n• 앞자리 5~9 — 각 약 2%\n\n이는 벤포드 이론값(1→30%, 2→18%...)과 크게 다르며, 1~45 구조에서 오는 자연스러운 결과입니다.',
  },
  ac: {
    title: '산술 복잡도 (AC)',
    body: '산술 복잡도(Arithmetic Complexity)는 6개 번호 사이의 차이값이 얼마나 다양한지를 측정합니다.\n\n값이 클수록 번호 간 간격이 다양해 연속 번호·등차수열 같은 인위적 패턴이 없음을 의미합니다.\n\n역대 당첨 번호의 AC 값은 평균 7~10 구간에 집중되어 있습니다.',
  },
  match: {
    title: '패턴 일치 확률',
    body: '역대 당첨 번호들과의 통계적 유사도를 종합 산출한 수치입니다.\n\n현재 번호 조합이 역대 당첨 패턴(홀짝 비율, 구간 분포, 합계 등)과 얼마나 비슷한지를 퍼센트로 나타냅니다.\n\n높을수록 역대 당첨 번호와 유사한 통계적 특성을 가진 조합입니다.',
  },
  rank: {
    title: '역대 유사 순위',
    body: '현재 번호 조합과 통계적으로 가장 유사한 역대 당첨 회차의 순위입니다.\n\n1위에 가까울수록 지금까지의 모든 당첨 번호 중 패턴이 가장 유사하다는 의미입니다.\n\n순위 자체가 당첨 가능성을 보증하지는 않으며, 통계적 유사성의 참고 지표입니다.',
  },
  zscore: {
    title: '정규분포 Z-Score',
    body: '번호 합계가 통계적 평균(138)에서 얼마나 떨어져 있는지를 표준편차(σ) 단위로 나타냅니다.\n\n• ±1σ 이내 — 역대 당첨 합계의 약 68%가 분포하는 중심 안정권\n• ±2σ 이내 — 역대 당첨 합계의 약 95%가 분포\n• ±3σ 초과 — 극히 드문 극단값\n\n0에 가까울수록 통계적으로 가장 안정적인 합계 범위에 속합니다.',
  },
  chi: {
    title: '분포 균일도 (χ²)',
    body: '카이제곱 검정을 이용해 6개 번호가 1~45 전체 구간에 얼마나 고르게 퍼져 있는지를 측정합니다.\n\n구간: 1-9 / 10-19 / 20-29 / 30-39 / 40-45\n\n100점에 가까울수록 5개 구간에 균형 있게 분포된 이상적인 조합입니다. 특정 구간에 번호가 몰리면 점수가 낮아집니다.',
  },
  zscore_panel: {
    title: 'Normal Distribution Z-Score',
    body: '번호 합계의 정규분포상 위치를 시각화합니다.\n\n로또 역대 당첨 번호 합계의 평균은 약 138, 표준편차는 약 24입니다. 현재 조합의 합계가 이 분포에서 어디에 위치하는지를 σ 단위로 표시합니다.\n\n• 중심(0σ)에 가까울수록 역대 당첨 번호와 유사한 합계 범위\n• ±2σ 초과 시 통계적으로 드문 극단적 합계',
  },
  chi_panel: {
    title: 'Chi-Squared Zone Distribution',
    body: '카이제곱(χ²) 검정은 관측값이 기대값에서 얼마나 벗어나는지를 측정하는 통계 기법입니다.\n\n6개 번호가 5개 구간에 분포할 때의 실제 개수(초록 막대)와 이상적 기대 개수(점선)를 비교합니다.\n\n두 값이 가까울수록 균일도 점수가 높아지며, 어느 한 구간에 몰리지 않은 균형 잡힌 조합임을 의미합니다.',
  },
  benford_chart: {
    title: "Benford's Law Comparison Chart",
    body: "벤포드의 법칙은 자연계의 수들이 따르는 첫 번째 자리 숫자의 분포 법칙입니다.\n\n이론적 분포:\n• 1 → 30.1%   • 2 → 17.6%   • 3 → 12.5%\n• 4 → 9.7%    • 5 → 7.9%    • 6 → 6.7%\n• 7 → 5.8%    • 8 → 5.1%    • 9 → 4.6%\n\n파란 막대(실제)가 회색 막대(이상)에 가까울수록 벤포드 법칙을 잘 따르는 자연스러운 번호 세트입니다.",
  },
  preset: {
    title: '설정 프리셋 1 · 2',
    body: '현재 필터 설정값 전체를 슬롯에 저장해두고 언제든 불러올 수 있습니다.\n합계 범위, 패턴 조건, 회귀 분석, 엔진 선택, 고정수/제외수가 모두 포함됩니다.\n\n저장: 빈 슬롯을 탭 → 확인\n저장해제: 길게 누름 → 확인\n\n※ 빈 슬롯은 점선, 설정값이 저장된 슬롯은 실선으로 표시됩니다.',
  },
};

const ScientificAnalysis: React.FC<ScientificAnalysisProps> = ({ loading, result, onGenerate, lottoHistory, uid }) => {
  const [config, setConfig] = useState<ScientificFilterConfig>(() => {
    try {
      const raw = localStorage.getItem('scienceLastSettings');
      if (raw) return { ...INITIAL_CONFIG, ...JSON.parse(raw).config };
    } catch {}
    return { ...INITIAL_CONFIG };
  });
  const [infoModal, setInfoModal] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Firestore 마운트 동기화: 로컬보다 Firestore가 최신이면 덮어씌움
  useEffect(() => {
    if (!uid) return;
    const docRef = doc(db, 'users', uid, 'scienceSettings', 'data');
    getDoc(docRef).then(snap => {
      if (!snap.exists()) return;
      const remote = snap.data();
      const localRaw = localStorage.getItem('scienceLastSettings');
      const localUpdatedAt = localRaw ? (JSON.parse(localRaw).updatedAt ?? 0) : 0;
      if ((remote.updatedAt ?? 0) > localUpdatedAt) {
        if (remote.lastSettings) {
          const d = remote.lastSettings;
          setConfig({ ...INITIAL_CONFIG, ...(d.config ?? {}) });
          setUseAdvanced(d.useAdvanced ?? false);
          setFix1(d.fix1 ?? ''); setFix2(d.fix2 ?? '');
          setExcl1(d.excl1 ?? ''); setExcl2(d.excl2 ?? '');
          localStorage.setItem('scienceLastSettings', JSON.stringify({ ...d, updatedAt: remote.updatedAt }));
        }
        if (remote.preset1) {
          localStorage.setItem('sciencePreset1', JSON.stringify(remote.preset1));
          setHasPreset(prev => ({ ...prev, 1: true }));
        }
        if (remote.preset2) {
          localStorage.setItem('sciencePreset2', JSON.stringify(remote.preset2));
          setHasPreset(prev => ({ ...prev, 2: true }));
        }
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // 역대 당첨 번호 앞자리 실제 분포 (벤포드 설명용 — 번대 구분과 다름)
  // 앞자리 1 = 1, 10~19 / 앞자리 2 = 2, 20~29 / ... / 앞자리 5~9 = 해당 번호 1개씩
  const leadingDigitStats = useMemo(() => {
    const counts = new Array(10).fill(0); // index 0 미사용
    let total = 0;
    lottoHistory.forEach((round: LottoRound) => {
      round.numbers.forEach((n: number) => {
        counts[parseInt(n.toString()[0])]++;
        total++;
      });
    });
    return { counts, total, rounds: lottoHistory.length };
  }, [lottoHistory]);

  const benfordInfoBody = useMemo(() => {
    if (leadingDigitStats.total === 0) return INFO_CONTENT.benford.body;
    const pct = (n: number) => (n / leadingDigitStats.total * 100).toFixed(1);
    const c = leadingDigitStats.counts;
    return `벤포드의 법칙은 자연 발생 수에서 첫 자리 숫자가 1일 확률이 가장 높고(30.1%), 9일 확률이 가장 낮다(4.6%)는 통계 법칙입니다.\n\n⚠️ 로또는 1~45 균등 구조의 인위적 데이터로, 벤포드 법칙이 본질적으로 적용되지 않습니다. 이 지표의 활성화는 권장하지 않습니다.\n\n역대 당첨 번호(${leadingDigitStats.rounds}회차) 앞자리 실제 출현 비율:\n• 앞자리 1 (번호 1, 10~19) — ${pct(c[1])}%\n• 앞자리 2 (번호 2, 20~29) — ${pct(c[2])}%\n• 앞자리 3 (번호 3, 30~39) — ${pct(c[3])}%\n• 앞자리 4 (번호 4, 40~45) — ${pct(c[4])}%\n• 앞자리 5~9 (각 번호 1개) — 각 약 ${pct(c[5])}%\n\n앞자리 1·2·3은 11개 번호, 4는 7개, 5~9는 각 1개를 커버하므로 벤포드 이론값(1→30.1%)과 크게 다릅니다.`;
  }, [leadingDigitStats]);

  const [activeSection, setActiveSection] = useState<'sum' | 'pattern' | 'regression' | 'algo'>('sum');
  const [showDocs, setShowDocs] = useState(false);
  const [showSumGuide, setShowSumGuide] = useState(false);
  const [showPatternGuide, setShowPatternGuide] = useState(false);
  const [showRegressionGuide, setShowRegressionGuide] = useState(false);
  const [showEngineGuide, setShowEngineGuide] = useState(false);
  const [showAdvancedWarning, setShowAdvancedWarning] = useState(false);
  const [showWheelModal, setShowWheelModal] = useState(false);
  const [showWheelingNotice, setShowWheelingNotice] = useState(false);
  const [tempWheelPool, setTempWheelPool] = useState<number[]>([]);
  const [scanIndex, setScanIndex] = useState(0);

  // 고정수/제외수 UI 상태 (마지막 설정값 복원)
  const _last = (() => { try { const r = localStorage.getItem('scienceLastSettings'); return r ? JSON.parse(r) : null; } catch { return null; } })();
  const [useAdvanced, setUseAdvanced] = useState<boolean>(_last?.useAdvanced ?? false);
  const [fix1, setFix1] = useState<string>(_last?.fix1 ?? '');
  const [fix2, setFix2] = useState<string>(_last?.fix2 ?? '');
  const [excl1, setExcl1] = useState<string>(_last?.excl1 ?? '');
  const [excl2, setExcl2] = useState<string>(_last?.excl2 ?? '');

  // 프리셋 상태
  const [confirmSavePreset, setConfirmSavePreset] = useState<1 | 2 | null>(null);
  const [confirmClearPreset, setConfirmClearPreset] = useState<1 | 2 | null>(null);
  const [activePreset, setActivePreset] = useState<1 | 2 | null>(() => {
    try {
      const lastRaw = localStorage.getItem('scienceLastSettings');
      if (!lastRaw) return null;
      const last = JSON.parse(lastRaw);
      for (const slot of [1, 2] as const) {
        const pRaw = localStorage.getItem(`sciencePreset${slot}`);
        if (!pRaw) continue;
        const p = JSON.parse(pRaw);
        const configMatch = JSON.stringify({ ...INITIAL_CONFIG, ...p.config }) === JSON.stringify({ ...INITIAL_CONFIG, ...last.config });
        const advMatch = (last.useAdvanced ?? false) === (p.useAdvanced ?? false);
        const fixMatch = (last.fix1 ?? '') === (p.fix1 ?? '') && (last.fix2 ?? '') === (p.fix2 ?? '');
        const exclMatch = (last.excl1 ?? '') === (p.excl1 ?? '') && (last.excl2 ?? '') === (p.excl2 ?? '');
        if (configMatch && advMatch && fixMatch && exclMatch) return slot;
      }
    } catch {}
    return null;
  });
  const [hasPreset, setHasPreset] = useState({ 1: !!localStorage.getItem('sciencePreset1'), 2: !!localStorage.getItem('sciencePreset2') });
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);

  // 역대 당첨율 실시간 계산
  const winningRate = useMemo(() => {
    if (!lottoHistory || lottoHistory.length === 0) return "0.0";
    const [min, max] = config.totalSumRange;
    const matchCount = lottoHistory.filter(round => {
      const sum = round.numbers.reduce((a, b) => a + b, 0);
      return sum >= min && sum <= max;
    }).length;
    return ((matchCount / lottoHistory.length) * 100).toFixed(1);
  }, [lottoHistory, config.totalSumRange]);

  useEffect(() => {
    let interval: any;
    if (loading) {
      interval = setInterval(() => {
        setScanIndex(prev => (prev + 1) % 45);
      }, 20);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // 마지막 설정값 자동 저장 (로컬 즉시 + Firestore 디바운스 3초)
  useEffect(() => {
    const updatedAt = Date.now();
    const payload = { config, useAdvanced, fix1, fix2, excl1, excl2, updatedAt };
    try { localStorage.setItem('scienceLastSettings', JSON.stringify(payload)); } catch {}
    if (!uid) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const docRef = doc(db, 'users', uid, 'scienceSettings', 'data');
      setDoc(docRef, { lastSettings: payload, updatedAt }, { merge: true }).catch(() => {});
    }, 3000);
  }, [config, useAdvanced, fix1, fix2, excl1, excl2, uid]);

  // 현재 설정이 활성 프리셋과 달라지면 자동 해제
  useEffect(() => {
    if (activePreset === null) return;
    try {
      const raw = localStorage.getItem(`sciencePreset${activePreset}`);
      if (!raw) return;
      const saved = JSON.parse(raw);
      const configMatch = JSON.stringify(config) === JSON.stringify({ ...INITIAL_CONFIG, ...saved.config });
      const advMatch = useAdvanced === (saved.useAdvanced ?? false);
      const fixMatch = fix1 === (saved.fix1 ?? '') && fix2 === (saved.fix2 ?? '');
      const exclMatch = excl1 === (saved.excl1 ?? '') && excl2 === (saved.excl2 ?? '');
      if (!configMatch || !advMatch || !fixMatch || !exclMatch) setActivePreset(null);
    } catch {}
  }, [config, useAdvanced, fix1, fix2, excl1, excl2, activePreset]);

  const updateConfig = (key: keyof ScientificFilterConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  // 프리셋 저장
  const savePreset = (slot: 1 | 2) => {
    const data = { config, useAdvanced, fix1, fix2, excl1, excl2 };
    try { localStorage.setItem(`sciencePreset${slot}`, JSON.stringify(data)); } catch {}
    if (uid) {
      const docRef = doc(db, 'users', uid, 'scienceSettings', 'data');
      setDoc(docRef, { [`preset${slot}`]: data }, { merge: true }).catch(() => {});
    }
    setHasPreset(prev => ({ ...prev, [slot]: true }));
    setActivePreset(slot);
    setConfirmSavePreset(null);
  };

  // 프리셋 불러오기
  const loadPreset = (slot: 1 | 2) => {
    try {
      const raw = localStorage.getItem(`sciencePreset${slot}`);
      if (!raw) return;
      const d = JSON.parse(raw);
      setConfig({ ...INITIAL_CONFIG, ...d.config });
      setUseAdvanced(d.useAdvanced ?? false);
      setFix1(d.fix1 ?? ''); setFix2(d.fix2 ?? '');
      setExcl1(d.excl1 ?? ''); setExcl2(d.excl2 ?? '');
      setActivePreset(slot);
    } catch {}
  };

  // 프리셋 삭제
  const clearPreset = (slot: 1 | 2) => {
    localStorage.removeItem(`sciencePreset${slot}`);
    if (uid) {
      const docRef = doc(db, 'users', uid, 'scienceSettings', 'data');
      setDoc(docRef, { [`preset${slot}`]: deleteField() }, { merge: true }).catch(() => {});
    }
    setHasPreset(prev => ({ ...prev, [slot]: false }));
    if (activePreset === slot) setActivePreset(null);
    setConfirmClearPreset(null);
  };

  // 롱프레스 핸들러
  const handlePointerDown = (slot: 1 | 2, e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    touchStartXRef.current = e.clientX;
    touchStartYRef.current = e.clientY;
    longPressTriggeredRef.current = false;
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    pressTimerRef.current = setTimeout(() => {
      const stored = localStorage.getItem(`sciencePreset${slot}`);
      longPressTriggeredRef.current = true;
      if (stored) setConfirmClearPreset(slot);
    }, 600);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    const dx = Math.abs(e.clientX - touchStartXRef.current);
    const dy = Math.abs(e.clientY - touchStartYRef.current);
    if (dx > 8 || dy > 8) {
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    }
  };
  const handlePointerUp = () => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
  };

  const handleResetAll = () => {
    setConfig({
      ...INITIAL_CONFIG,
      totalSumRange: [121, 180],
      sum123Range: [30, 80],
      sum456Range: [80, 130],
      primeCountRange: [1, 3],
      carryOverRange: [0, 2],
      neighborRange: [0, 2]
    });
    setUseAdvanced(false);
    setFix1(''); setFix2(''); setExcl1(''); setExcl2('');
    setActivePreset(null);
  };

  const handleResetCurrentTab = () => {
    setConfig(prev => {
      const newConfig = { ...prev };
      switch (activeSection) {
        case 'sum':
          newConfig.totalSumRange = [121, 180];
          newConfig.sum123Range = [30, 80];
          newConfig.sum456Range = [80, 130];
          break;
        case 'pattern':
          newConfig.acMin = INITIAL_CONFIG.acMin;
          newConfig.applyBenfordLaw = INITIAL_CONFIG.applyBenfordLaw;
          newConfig.maxConsecutive = INITIAL_CONFIG.maxConsecutive;
          newConfig.maxSameEnding = INITIAL_CONFIG.maxSameEnding;
          newConfig.oddRatio = INITIAL_CONFIG.oddRatio;
          newConfig.highLowRatio = INITIAL_CONFIG.highLowRatio;
          break;
        case 'regression':
          newConfig.carryOverRange = [0, 2];
          newConfig.neighborRange = [0, 2];
          newConfig.coOccurrenceMode = 'off';
          break;
        case 'algo':
          newConfig.algorithmMode = INITIAL_CONFIG.algorithmMode;
          newConfig.wheelingPool = [];
          break;
      }
      return newConfig;
    });
  };

  const handleGenerateClick = () => {
    if (config.algorithmMode === 'Wheeling' && config.wheelingPool.length < 7) {
      setShowWheelModal(true);
      return;
    }
    if (useAdvanced) {
      const f1 = parseInt(fix1);
      const f2 = parseInt(fix2);
      const e1 = parseInt(excl1);
      const e2 = parseInt(excl2);
      
      const fixed = [f1, f2].filter(n => !isNaN(n) && n >= 1 && n <= 45);
      const excluded = [e1, e2].filter(n => !isNaN(n) && n >= 1 && n <= 45);

      if (fixed.length === 0 && excluded.length === 0) {
        setShowAdvancedWarning(true);
        return;
      }

      onGenerate({
        ...config,
        fixedNumbers: fixed,
        excludedNumbers: excluded
      });
    } else {
      onGenerate({
        ...config,
        fixedNumbers: [],
        excludedNumbers: []
      });
    }
  };

  const BENFORD_IDEAL = [30.1, 17.6, 12.5, 9.7, 7.9, 6.7, 5.8, 5.1, 4.6];

  return (
    <div className="w-full max-w-[640px] mx-auto space-y-12 animate-in fade-in duration-1000 pb-24 px-[1px] sm:px-4">
      {/* 입력 누락 모달 */}
      {showAdvancedWarning && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="glass p-10 rounded-[3rem] border border-rose-500/30 w-full max-w-sm text-center space-y-8 shadow-[0_0_50px_rgba(244,63,94,0.2)]">
              <div className="text-4xl text-rose-500">⚠️</div>
              <p className="text-slate-200 text-sm font-black leading-relaxed">
                "1개 이상의 고정수 or 제외수를 입력하거나<br/>체크를 해제하세요"
              </p>
              <button onClick={() => setShowAdvancedWarning(false)} className="w-full py-4 bg-rose-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-rose-500 transition-all shadow-xl">확인 (Return)</button>
           </div>
        </div>
      )}

      {showDocs && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4 sm:p-6 bg-black/95 backdrop-blur-3xl animate-in fade-in duration-500">
           <div className="glass p-8 sm:p-12 rounded-[3.5rem] border border-cyan-500/30 w-full max-w-4xl shadow-[0_0_150px_rgba(6,182,212,0.3)] space-y-10 relative max-h-[90vh] overflow-y-auto custom-scroll">
              <button onClick={() => setShowDocs(false)} className="absolute top-7 sm:top-10 right-10 text-slate-500 hover:text-white transition-colors text-3xl">✕</button>
              
              <div className="text-center space-y-3 mt-6 sm:mt-0">
                <h3 className="text-2xl sm:text-4xl font-mystic font-black text-white tracking-tight sm:tracking-widest uppercase whitespace-nowrap">지성 분석 아키텍처 가이드</h3>
                <p className="text-[11px] text-cyan-400 font-black tracking-[0.15em] sm:tracking-[0.5em] uppercase whitespace-nowrap">Holistic Synthesis Protocol v6.0</p>
              </div>

              <div className="p-8 bg-cyan-500/5 rounded-[2.5rem] border border-cyan-500/20 text-center">
                 <p className="text-base text-slate-200 leading-loose italic font-medium">
                   "미스틱 연구실의 번호 추출은 단편적인 확률에 의존하지 않습니다.<br/>
                   당신이 설정한 네 가지 파라미터는 하나의 유기적 프로세스로 통합되어 최종 조합을 도출합니다."
                 </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-8 bg-black/40 rounded-[2.5rem] border border-white/5 space-y-4">
                   <div className="flex items-center space-x-3 text-cyan-400">
                      <span className="text-2xl">Σ</span>
                      <h4 className="font-black text-lg uppercase tracking-wider">합계: 운명의 경계 설정</h4>
                   </div>
                   <p className="text-sm text-slate-400 leading-relaxed">
                     번호 조합의 전체 에너지량을 정의합니다. 이는 추출된 숫자들이 용지의 어느 지점에 밀집될지를 결정하는 첫 번째 관문이며, 수만 번의 시뮬레이션 중 이 범위를 벗어나는 조합은 즉시 소멸됩니다.
                   </p>
                </div>

                <div className="p-8 bg-black/40 rounded-[2.5rem] border border-white/5 space-y-4">
                   <div className="flex items-center space-x-3 text-cyan-400">
                      <span className="text-2xl">◈</span>
                      <h4 className="font-black text-lg uppercase tracking-wider">패턴: 무작위성 검증</h4>
                   </div>
                   <p className="text-sm text-slate-400 leading-relaxed">
                     산술 복잡도(AC)와 홀짝·고저 비율을 통해 조합의 구조적 균형을 검증합니다. 연속 번호나 등차수열처럼 인위적 규칙성이 강한 조합을 배제하고, 역대 당첨 번호에서 공통적으로 나타나는 복잡한 분산 패턴에 부합하는 조합만을 선별합니다.
                   </p>
                </div>

                <div className="p-8 bg-black/40 rounded-[2.5rem] border border-white/5 space-y-4">
                   <div className="flex items-center space-x-3 text-cyan-400">
                      <span className="text-2xl">↺</span>
                      <h4 className="font-black text-lg uppercase tracking-wider">회귀: 시간적 연결성</h4>
                   </div>
                   <p className="text-sm text-slate-400 leading-relaxed">
                     과거의 당첨 기록(전회차)과 현재 조합 사이의 회귀적 밸런스를 조절합니다. 이월수와 이웃수 설정을 통해 숫자의 흐름이 정체되어 있는지, 혹은 새로운 방향으로 전이되고 있는지를 수학적으로 분석합니다.
                   </p>
                </div>

                <div className="p-8 bg-black/40 rounded-[2.5rem] border border-white/5 space-y-4">
                   <div className="flex items-center space-x-3 text-cyan-400">
                      <span className="text-2xl">⚙</span>
                      <h4 className="font-black text-lg uppercase tracking-wider">엔진: 최종 논리 합산</h4>
                   </div>
                   <p className="text-sm text-slate-400 leading-relaxed">
                     앞선 세 가지 제약 조건을 바탕으로, 선택된 알고리즘 엔진이 최종적인 연산을 수행합니다. 이는 수십만 개의 후보군 중 당신의 설정과 가장 완벽하게 공명하는 단 하나의 '최적해'를 찾아내는 지성 분석의 정점입니다.
                   </p>
                </div>
              </div>

              <div className="p-10 bg-gradient-to-br from-cyan-600/10 to-transparent rounded-[3rem] border border-cyan-500/30 text-center space-y-4">
                 <h5 className="text-cyan-400 font-black text-sm sm:text-lg uppercase tracking-tight sm:tracking-widest text-center">유기적 동기화 완료<br /> (Synthesis Complete)</h5>
                 <p className="text-sm text-slate-300 leading-relaxed">
                   이 모든 과정은 버튼을 누르는 찰나의 순간에 이루어지며, <br/>
                   "합계-패턴-회귀-엔진"이 모두 동의하는 단 하나의 숫자 세트가 당신의 화면에 계시됩니다.
                 </p>
              </div>

              <button onClick={() => setShowDocs(false)} className="w-full py-6 bg-cyan-600 text-slate-950 font-black rounded-3xl text-sm uppercase tracking-[0.4em] hover:bg-cyan-500 transition-all shadow-2xl">아키텍처 가이드 숙지 완료</button>
           </div>
        </div>
      )}

      {showSumGuide && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4 sm:p-6 bg-black/95 backdrop-blur-3xl animate-in fade-in duration-500">
           <div className="glass p-8 sm:p-12 rounded-[3.5rem] border border-yellow-500/30 w-full max-w-3xl shadow-[0_0_100px_rgba(234,179,8,0.2)] space-y-8 relative max-h-[90vh] overflow-y-auto custom-scroll">
              <button onClick={() => setShowSumGuide(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors text-2xl">✕</button>
              <div className="text-center space-y-2">
                <h3 className="text-2xl sm:text-3xl font-mystic font-black text-yellow-500 tracking-tight sm:tracking-widest uppercase whitespace-nowrap">합계 제어 시스템 가이드</h3>
                <p className="text-[10px] text-slate-500 font-black tracking-[0.15em] sm:tracking-[0.4em] uppercase whitespace-nowrap">Laboratory Summation Logic Guide</p>
              </div>
              <div className="space-y-8">
                <div className="p-8 bg-amber-500/10 rounded-[2rem] border border-amber-500/20 space-y-4">
                  <h4 className="text-yellow-500 font-black text-lg">1. 왜 121~180인가요?</h4>
                  <div className="text-slate-300 text-sm leading-relaxed space-y-2">
                    <p>로또 번호 1~45 중 6개를 선택할 때, 합계는 이론적으로 21에서 255까지 존재합니다. 통계학적으로 <strong className="text-white">역대 당첨 번호의 약 72%는 110~180 사이의 '정규분포 중심부'에 집중</strong>되어 있습니다.</p>
                    <p>다만 이 구간은 범위가 다소 넓기에, 저희 미스틱 연구소에서는 <strong className="text-white underline underline-offset-4 decoration-yellow-500/50">데이터 밀도가 가장 높고 효율적인 '필승 권장 구간'인 121~180 범위를 최종 추천</strong>합니다.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="p-3 bg-black/20 rounded-xl border border-yellow-500/10">
                        <p className="text-xs font-black text-yellow-500 mb-1">상한선(180)을 낮추면</p>
                        <p className="text-[11px] text-slate-400">번호들이 낮은 쪽(1~20번대)에 많이 포진하게 됩니다.</p>
                      </div>
                      <div className="p-3 bg-black/20 rounded-xl border border-yellow-500/10">
                        <p className="text-xs font-black text-yellow-500 mb-1">상한선(180)을 높이면</p>
                        <p className="text-[11px] text-slate-400">30~40번대의 큰 숫자들이 섞일 확률이 높아집니다.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-amber-500/10 rounded-[2rem] border border-amber-500/20 space-y-4">
                  <h4 className="text-yellow-500 font-black text-lg">2. 첫수합 제어 (1, 2, 3번 공의 합)</h4>
                  <div className="text-slate-300 text-sm leading-relaxed space-y-2">
                    <p><strong className="text-white">"가장 작은 번호 3개를 더한 최대치"</strong>를 결정합니다. 로또 용지 앞부분의 번호들이 얼마나 무겁게(크게) 나올지를 정합니다.</p>
                    <ul className="list-disc pl-5 space-y-1 text-[13px]">
                      <li><strong className="text-white">수치를 낮추면:</strong> 앞부분에 숫자들이 바짝 붙어서 나옵니다.</li>
                      <li><strong className="text-white">수치를 높이면:</strong> 첫 번째 숫자가 20번대부터 시작하는 '높은 시작' 조합이 나올 수 있습니다.</li>
                    </ul>
                  </div>
                </div>

                <div className="p-8 bg-amber-500/10 rounded-[2rem] border border-amber-500/20 space-y-4">
                  <h4 className="text-yellow-500 font-black text-lg">3. 끝수합 제어 (4, 5, 6번 공의 합)</h4>
                  <div className="text-slate-300 text-sm leading-relaxed space-y-2">
                    <p><strong className="text-white">"가장 큰 번호 3개를 더한 최대치"</strong>를 결정합니다. 로또 용지 뒷부분의 번호들이 얼마나 40번대 쪽으로 쏠릴지를 정합니다.</p>
                    <ul className="list-disc pl-5 space-y-1 text-[13px]">
                      <li><strong className="text-white">수치를 낮추면:</strong> 마지막 번호가 30번대에서 끝나는 '중간 종료' 확률이 커집니다.</li>
                      <li><strong className="text-white">수치를 높이면:</strong> 40, 42, 45처럼 강력한 뒷심의 조합이 나올 가능성이 열립니다.</li>
                    </ul>
                  </div>
                </div>

                <div className="p-6 bg-yellow-500/5 rounded-2xl border border-yellow-500/20">
                   <p className="text-sm text-yellow-500 font-black text-center mb-2">💡 요약 및 전략</p>
                   <p className="text-xs text-slate-300 leading-relaxed text-left">
                     이 수치들은 <strong className="text-white">"번호들이 로또 용지 어디쯤에 모여 있게 할 것인가?"</strong>를 결정하는 필터입니다.<br/>
                     <span className="text-white">초보자:</span> 기본값(121~180, 80, 130) 유지를 권장합니다.<br/>
                     <span className="text-white">전략가:</span> 최근 큰 번호가 안 나왔다면 수치를 줄이고, 큰 번호가 나올 때가 되었다면 수치를 높여 공격적으로 조합하십시오.
                   </p>
                </div>
              </div>
              <button onClick={() => setShowSumGuide(false)} className="w-full py-5 bg-yellow-600 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-yellow-500 transition-all">시스템 가이드 숙지 완료</button>
           </div>
        </div>
      )}

      {showPatternGuide && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4 sm:p-6 bg-black/95 backdrop-blur-3xl animate-in fade-in duration-500">
           <div className="glass p-8 sm:p-12 rounded-[3.5rem] border border-cyan-500/30 w-full max-w-3xl shadow-[0_0_100px_rgba(6,182,212,0.2)] space-y-8 relative max-h-[90vh] overflow-y-auto custom-scroll">
              <button onClick={() => setShowPatternGuide(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors text-2xl">✕</button>
              <div className="text-center space-y-2">
                <h3 className="text-2xl sm:text-3xl font-mystic font-black text-cyan-400 tracking-tight sm:tracking-widest uppercase whitespace-nowrap">패턴 정합 시스템 가이드</h3>
                <p className="text-[10px] text-slate-500 font-black tracking-[0.15em] sm:tracking-[0.4em] uppercase whitespace-nowrap">Pattern Conformity Logic Guide</p>
              </div>
              <div className="space-y-8">
                <div className="p-8 bg-cyan-500/5 rounded-[2rem] border border-cyan-500/20 space-y-4">
                  <h4 className="text-cyan-400 font-black text-lg">1. 벤포드 법칙 엔진 (Benford's Law)</h4>
                  <div className="text-slate-300 text-sm leading-relaxed space-y-3">
                    <p><strong className="text-rose-400 underline underline-offset-4 decoration-rose-500">⚠️ 이 옵션은 권장하지 않습니다</strong></p>
                    <p>벤포드의 법칙은 자연 발생 수치(인구, 주가, 강 길이 등)의 첫째 자리가 로그 확률(1→30.1%, 9→4.6%)을 따르는 통계 법칙입니다. 회계 부정 탐지 등에 쓰입니다.</p>
                    <p>그러나 로또는 <strong className="text-white">1~45 사이에서 균등하게 추출되는 인위적 데이터</strong>로, 벤포드 법칙이 본질적으로 적용되지 않습니다. 실제 역대 당첨 번호의 앞자리 분포도 이론값(1→30%)과 크게 다르며, 이는 1~45 구조에서 오는 자연스러운 결과입니다.</p>
                    <p>이 엔진을 ON으로 설정하면 <strong className="text-rose-400">로또에 맞지 않는 기준으로 번호를 필터링</strong>하게 되어 오히려 추출 품질이 저하될 수 있습니다. 참고용 지표로만 활용하세요.</p>
                  </div>
                </div>

                <div className="p-8 bg-cyan-500/5 rounded-[2rem] border border-cyan-500/20 space-y-4">
                  <h4 className="text-cyan-400 font-black text-lg">2. 산술 복잡도 (AC 지수)</h4>
                  <div className="text-slate-300 text-sm leading-relaxed space-y-3">
                    <p><strong className="text-white underline underline-offset-4 decoration-cyan-500">왜 AC 7 이상을 권장하나요?</strong></p>
                    <p>AC(Arithmetic Complexity)는 번호들 사이의 차이값의 종류를 측정합니다. </p>
                    <ul className="list-disc pl-5 space-y-2">
                      <li><strong className="text-white">AC 0~6:</strong> 숫자들이 너무 규칙적입니다. (예: 2, 4, 6, 8... 또는 1, 2, 3...)</li>
                      <li><strong className="text-white">AC 7~10:</strong> 복잡도가 높고 불규칙합니다. <span className="text-cyan-400">역대 당첨 번호의 AC 분포를 분석하면 7~10 구간에 집중되는 경향이 관측됩니다.</span></li>
                    </ul>
                    <p>AC 7 이상으로 설정하면 지나치게 규칙적인 번호 패턴을 필터링할 수 있습니다. 다만 AC 값이 높다고 당첨 확률이 높아지는 것은 아니며, 로또는 각 추첨이 독립적인 무작위 사건입니다.</p>
                  </div>
                </div>

                <div className="p-8 bg-cyan-500/5 rounded-[2rem] border border-cyan-500/20 space-y-4">
                  <h4 className="text-cyan-400 font-black text-lg">3. 연속 번호 & 동끝수 제어</h4>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    로또 당첨 결과에서 3개 이상의 연번이나 3개 이상의 동끝수가 나올 확률은 매우 낮습니다. 이를 <strong className="text-white">1개 이하</strong>로 제한함으로써, 번호가 용지 전체에 골고루 분포되도록 유도하여 밸런스 있는 최적의 조합을 생성합니다.
                  </p>
                </div>

                <div className="p-8 bg-cyan-500/5 rounded-[2rem] border border-cyan-500/20 space-y-4">
                  <h4 className="text-cyan-400 font-black text-lg">4. 홀짝 비율 (Odd/Even Ratio)</h4>
                  <div className="text-slate-300 text-sm leading-relaxed space-y-3">
                    <p>6개 번호 중 홀수와 짝수의 비율을 제어합니다. 역대 당첨 통계에서 <strong className="text-white">3:3 조합이 약 33%</strong>로 가장 자주 등장하며, 이어서 4:2와 2:4가 각각 약 23%로 높은 빈도를 보입니다.</p>
                    <ul className="list-disc pl-5 space-y-2">
                      <li><strong className="text-white">3:3</strong> — 역대 최다 출현. 균형 전략의 기본값으로 가장 안정적입니다.</li>
                      <li><strong className="text-white">4:2 / 2:4</strong> — 홀수 혹은 짝수가 약간 우세한 구간. 실전에서 자주 쓰이는 준균형 전략입니다.</li>
                      <li><strong className="text-white">5:1 / 1:5</strong> — 한쪽이 극단적으로 많은 구간. 출현 빈도가 낮아 변칙 도박 전략으로 분류됩니다.</li>
                      <li><strong className="text-white">비활성화 (공란)</strong> — 비율 제한 없이 다른 필터만 적용합니다.</li>
                    </ul>
                    <p className="italic text-[11px] text-cyan-500">"가장 무난한 선택은 3:3입니다. 확률에 기반한 기본 전략을 원한다면 이 값을 유지하세요."</p>
                  </div>
                </div>

                <div className="p-8 bg-cyan-500/5 rounded-[2rem] border border-cyan-500/20 space-y-4">
                  <h4 className="text-cyan-400 font-black text-lg">5. 고저 비율 (High/Low Ratio)</h4>
                  <div className="text-slate-300 text-sm leading-relaxed space-y-3">
                    <p>6개 번호를 <strong className="text-white">고번호(23~45)</strong>와 <strong className="text-white">저번호(1~22)</strong>로 나눈 비율을 제어합니다. 역대 통계에서 <strong className="text-white">3:3이 약 30%</strong>로 선두이며, 4:2와 2:4가 뒤를 잇습니다.</p>
                    <ul className="list-disc pl-5 space-y-2">
                      <li><strong className="text-white">3:3</strong> — 고른 숫자 대역. 번호가 용지 위아래에 균형 있게 배치됩니다.</li>
                      <li><strong className="text-white">4:2</strong> — 고번호 우세. 최근 큰 번호가 많이 나오는 흐름일 때 유효합니다.</li>
                      <li><strong className="text-white">2:4</strong> — 저번호 우세. 최근 작은 번호가 주로 나올 때 유효합니다.</li>
                      <li><strong className="text-white">5:1 / 1:5</strong> — 극단적 편향. 변칙 전략으로, 빈도가 낮은 만큼 적중 시 희소가치가 있습니다.</li>
                      <li><strong className="text-white">비활성화 (공란)</strong> — 비율 제한 없이 다른 필터만 적용합니다.</li>
                    </ul>
                    <p className="italic text-[11px] text-cyan-500">"홀짝과 마찬가지로 3:3이 기본 권장값입니다. 최근 당첨 번호의 고저 흐름을 참고해 전략적으로 조정해 보세요."</p>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowPatternGuide(false)} className="w-full py-5 bg-cyan-600 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-cyan-500 transition-all">패턴 가이드 숙지 완료</button>
           </div>
        </div>
      )}

      {showRegressionGuide && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4 sm:p-6 bg-black/95 backdrop-blur-3xl animate-in fade-in duration-500">
           <div className="glass p-8 sm:p-12 rounded-[3.5rem] border border-emerald-500/30 w-full max-w-3xl shadow-[0_0_100px_rgba(16,185,129,0.2)] space-y-8 relative max-h-[90vh] overflow-y-auto custom-scroll">
              <button onClick={() => setShowRegressionGuide(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors text-2xl">✕</button>
              <div className="text-center space-y-2">
                <h3 className="text-2xl sm:text-3xl font-mystic font-black text-emerald-400 tracking-tight sm:tracking-widest uppercase whitespace-nowrap">회귀 분석 시스템 가이드</h3>
                <p className="text-[10px] text-slate-500 font-black tracking-[0.15em] sm:tracking-[0.4em] uppercase whitespace-nowrap">Regression Analysis Logic Guide</p>
              </div>
              <div className="space-y-8">
                <div className="p-8 bg-emerald-500/5 rounded-[2rem] border border-emerald-500/20 space-y-4">
                  <h4 className="text-emerald-400 font-black text-lg">1. 이월수 (Carry Over) 전략</h4>
                  <div className="text-slate-300 text-sm leading-relaxed space-y-2">
                    <p>전회차 당첨 번호가 다시 등장하는 것을 의미합니다. 통계적으로 <strong className="text-white">0개~2개</strong>가 이월될 확률이 가장 높습니다.</p>
                    <p className="italic text-[11px] text-emerald-500">"지난 회차에 나온 숫자가 이번 회차에 또 나올 것 같은 예감이 든다면 1~2개로 조절하십시오."</p>
                  </div>
                </div>
                <div className="p-8 bg-emerald-500/5 rounded-[2rem] border border-emerald-500/20 space-y-4">
                  <h4 className="text-emerald-400 font-black text-lg">2. 이웃수 (Neighbors) 전략</h4>
                  <div className="text-slate-300 text-sm leading-relaxed space-y-2">
                    <p>전회차 당첨 번호의 바로 옆 숫자(±1)를 포함합니다. 숫자의 흐름이 한 곳에 머물거나 근처로 이동하는 경향을 포착합니다.</p>
                    <p className="italic text-[11px] text-emerald-500">"번호가 옆으로 살짝 비껴가는 흐름을 잡고 싶다면 1~2개를 설정하십시오."</p>
                  </div>
                </div>

                <div className="p-8 bg-emerald-500/5 rounded-[2rem] border border-emerald-500/20 space-y-4">
                  <h4 className="text-emerald-400 font-black text-lg">3. 동반 출현 필터 (Co-occurrence)</h4>
                  <div className="text-slate-300 text-sm leading-relaxed space-y-3">
                    <p>역대 모든 당첨 회차 데이터를 분석해 <strong className="text-white">어떤 번호 쌍이 얼마나 자주 함께 출현했는지</strong>를 계산합니다. 6개 번호에는 총 15개의 쌍(Pair)이 존재하며, 이 필터는 그 쌍들의 역대 평균 동반 빈도를 기준으로 조합을 평가합니다.</p>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>
                        <strong className="text-white">동반 선호 (Favor)</strong> — 역대 기록에서 자주 함께 나온 번호 쌍이 많은 조합을 선호합니다. <span className="text-emerald-400">흐름을 따라가는 순응 전략</span>으로, 역사적으로 검증된 번호 쌍들을 집중적으로 공략합니다.
                      </li>
                      <li>
                        <strong className="text-white">동반 기피 (Avoid)</strong> — 지금까지 함께 나온 적이 드문 번호 쌍 위주의 조합을 선호합니다. <span className="text-rose-400">반전을 노리는 역발상 전략</span>으로, 아직 실현되지 않은 조합에서 잭팟을 기대합니다.
                      </li>
                      <li>
                        <strong className="text-white">비활성 (Off)</strong> — 동반 출현 빈도를 분석하지 않고 다른 필터만 적용합니다.
                      </li>
                    </ul>
                    <p className="italic text-[11px] text-emerald-500">"기본값은 비활성입니다. 특정 전략적 관점이 있을 때만 켜는 것을 권장합니다."</p>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowRegressionGuide(false)} className="w-full py-5 bg-emerald-600 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-emerald-500 transition-all">회귀 가이드 숙지 완료</button>
           </div>
        </div>
      )}

      {showEngineGuide && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4 sm:p-6 bg-black/95 backdrop-blur-3xl animate-in fade-in duration-500">
           <div className="glass p-8 sm:p-12 rounded-[3.5rem] border border-indigo-500/30 w-full max-w-3xl shadow-[0_0_100px_rgba(99,102,241,0.2)] space-y-8 relative max-h-[90vh] overflow-y-auto custom-scroll">
              <button onClick={() => setShowEngineGuide(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors text-2xl">✕</button>
              <div className="text-center space-y-2">
                <h3 className="text-2xl sm:text-3xl font-mystic font-black text-indigo-400 tracking-tight sm:tracking-widest uppercase whitespace-nowrap">연산 엔진 시스템 가이드</h3>
                <p className="text-[10px] text-slate-500 font-black tracking-[0.15em] sm:tracking-[0.4em] uppercase whitespace-nowrap">Inference Engine Logic Guide</p>
              </div>
              <div className="space-y-6">
                <div className="p-6 bg-indigo-500/5 border border-indigo-500/20 rounded-[2rem] space-y-3">
                  <p className="text-indigo-400 font-black text-sm uppercase">Statistical Basic Filter (표준형)</p>
                  <p className="text-slate-400 text-sm leading-relaxed">역대 {lottoHistory[0]?.round ?? 0}회의 데이터를 바탕으로 가장 무난하고 안정적인 당첨 빈도 구간을 공략합니다.</p>
                </div>
                <div className="p-6 bg-indigo-500/5 border border-indigo-500/20 rounded-[2rem] space-y-3">
                  <p className="text-indigo-400 font-black text-sm uppercase">Bradford Legacy Engine (브래드포드 대학 실화 모델)</p>
                  <p className="text-slate-400 text-sm leading-relaxed">2006년 영국 브래드포드 대학 수학 교수팀이 실제 1등 당첨에 사용한 '그물망 전략'을 재현합니다. 1~45번 전체 숫자를 8개의 게임에 누락 없이 분산 배치하여, 어떤 숫자가 나오더라도 확률의 그물망에 걸리게 만드는 수학적 커버리지 모델입니다.</p>
                </div>
                <div className="p-6 bg-indigo-500/5 border border-indigo-500/20 rounded-[2rem] space-y-3">
                  <p className="text-indigo-400 font-black text-sm uppercase">Balanced Coverage Engine (균형형)</p>
                  <p className="text-slate-400 text-sm leading-relaxed">1~45번을 5개 구역으로 나눴을 때, 번호가 특정 구역에 쏠리지 않도록 균등하게 배치하는 데 집중합니다.</p>
                </div>
                <div className="p-6 bg-indigo-500/5 border border-indigo-500/20 rounded-[2rem] space-y-3">
                  <p className="text-indigo-400 font-black text-sm uppercase">Entropy Maximizer v2 (혼돈형)</p>
                  <p className="text-slate-400 text-sm leading-relaxed">통계적으로 설명하기 힘든 완전한 무질서 상태의 번호를 도출하여, 예상치 못한 당첨 조합을 노립니다.</p>
                </div>
                <div className="p-6 bg-indigo-500/5 border border-indigo-500/20 rounded-[2rem] space-y-3">
                  <p className="text-indigo-400 font-black text-sm uppercase">Cold Number Recall (저빈도형)</p>
                  <p className="text-slate-400 text-sm leading-relaxed">최근 10주 이상 나오지 않은 '가장 차가운 숫자'들 중에서 반등 가능성이 높은 번호를 추려냅니다.</p>
                </div>
                <div className="p-6 bg-indigo-500/5 border border-indigo-500/20 rounded-[2rem] space-y-3">
                  <p className="text-indigo-400 font-black text-sm uppercase">Wheeling System (휠링 시스템)</p>
                  <p className="text-slate-400 text-sm leading-relaxed">Wheeling은 <strong className="text-indigo-300">「사실상 번호 예측 능력에 베팅하는 구조」</strong>입니다. 번호를 랜덤으로 넣으면 의미가 없고, 최근 통계나 개인적 확신이 있는 번호들을 풀로 구성해야 의도대로 작동합니다. 7~12개의 풀 번호를 직접 선택하면, 해당 풀에서 가능한 모든 6번호 조합을 분석하여 <strong className="text-indigo-300">서로 겹치는 숫자 쌍(페어)을 최소한으로 남기면서 커버리지를 극대화하는 조합들</strong>을 그리디 알고리즘으로 추려냅니다. N개의 풀을 선택하면 최대 N장의 티켓이 생성됩니다. 특정 번호에 강한 확신이 있을 때 그 번호들을 풀에 포함시켜 '집중 전략'으로 활용하는 것이 가장 효과적입니다.</p>
                </div>
              </div>
              <button onClick={() => setShowEngineGuide(false)} className="w-full py-5 bg-indigo-600 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all">엔진 가이드 숙지 완료</button>
           </div>
        </div>
      )}

      {/* Wheeling 모드 안내 모달 */}
      {showWheelingNotice && (
        <div className="fixed inset-0 z-[9600] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl animate-in fade-in duration-300">
          <div className="glass p-10 rounded-[3rem] border border-amber-500/30 w-full max-w-md shadow-[0_0_80px_rgba(245,158,11,0.15)] space-y-8 text-center">
            <div className="space-y-3">
              <div className="text-4xl">⚠</div>
              <h3 className="text-xl font-black text-amber-400 uppercase tracking-widest">Wheeling 모드 안내</h3>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              Wheeling 모드를 적용하면 <strong className="text-white">합계 · 패턴 · 회귀 섹션에서의 설정값은 모두 적용되지 않습니다.</strong><br/><br/>
              번호 풀을 직접 선택해 페어 커버리지를 극대화하는 방식으로만 동작합니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowWheelingNotice(false)}
                className="flex-1 py-4 rounded-2xl border border-slate-700 text-slate-400 text-xs font-black hover:border-slate-600 transition-all"
              >취소</button>
              <button
                onClick={() => { updateConfig('algorithmMode', 'Wheeling'); setShowWheelingNotice(false); }}
                className="flex-1 py-4 rounded-2xl bg-amber-500 text-slate-950 text-xs font-black hover:bg-amber-400 transition-all"
              >Wheeling 모드 적용</button>
            </div>
          </div>
        </div>
      )}

      {/* Wheeling 풀 번호 선택 모달 */}
      {showWheelModal && (
        <div className="fixed inset-0 z-[9500] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl animate-in fade-in duration-300">
          <div className="flex flex-col items-center space-y-5 w-full max-w-sm">
            {/* 헤더 */}
            <div className="flex items-center justify-between w-full">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-widest">풀 번호 선택</h3>
                <p className="text-[10px] text-slate-500 font-bold mt-0.5">7~12개 선택 후 확인</p>
              </div>
              <div className={`px-3 py-1.5 rounded-full text-[11px] font-black border ${tempWheelPool.length >= 7 && tempWheelPool.length <= 12 ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400' : 'border-slate-700 text-slate-500'}`}>
                {tempWheelPool.length}개 선택
              </div>
            </div>

            {/* 복권 용지 그리드 */}
            <div className="w-full border-2 border-red-900/60 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(220,38,38,0.15)]">
              {/* 복권 용지 헤더 */}
              <div className="bg-red-900/70 py-2 text-center border-b border-red-800/60">
                <p className="text-[10px] font-black text-red-200/80 tracking-[0.3em] uppercase">Wheeling Pool</p>
              </div>
              {/* 격자 */}
              <div className="grid grid-cols-7 gap-px bg-red-900/40">
                {Array.from({ length: 45 }, (_, i) => i + 1).map(n => {
                  const isSelected = tempWheelPool.includes(n);
                  const isDisabled = !isSelected && tempWheelPool.length >= 12;
                  return (
                    <button
                      key={n}
                      disabled={isDisabled}
                      onClick={() => setTempWheelPool(prev =>
                        prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n].sort((a, b) => a - b)
                      )}
                      className={`aspect-[3/4] flex items-center justify-center bg-slate-950 transition-colors
                        ${isDisabled ? 'cursor-not-allowed' : 'hover:bg-slate-900'}
                      `}
                    >
                      <div className={`w-[78%] h-[72%] rounded-full flex items-center justify-center text-[11px] font-black transition-all
                        ${isSelected
                          ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                          : isDisabled
                          ? 'bg-slate-800/30 text-slate-700'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'}
                      `}>
                        {n}
                      </div>
                    </button>
                  );
                })}
                {/* 마지막 행 빈 셀 4개 */}
                {[0,1,2,3].map(k => (
                  <div key={`e${k}`} className="aspect-[3/4] bg-slate-950" />
                ))}
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowWheelModal(false)}
                className="flex-1 py-4 rounded-2xl border border-slate-700 text-slate-400 text-xs font-black hover:border-slate-600 transition-all"
              >취소</button>
              <button
                disabled={tempWheelPool.length < 7 || tempWheelPool.length > 12}
                onClick={() => { updateConfig('wheelingPool', tempWheelPool); setShowWheelModal(false); }}
                className="flex-1 py-4 rounded-2xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 text-xs font-black transition-all"
              >확인 ({tempWheelPool.length}개)</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center space-y-4">
        <div className="inline-flex items-center space-x-3 px-3 sm:px-5 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
           <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_10px_#22d3ee] shrink-0"></span>
           <span className="text-[9px] sm:text-[10px] font-black text-cyan-400 tracking-[0.2em] sm:tracking-[0.5em] uppercase whitespace-nowrap">Mystic Lotto Intellect Lab v6.0</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-mystic font-black text-white tracking-widest uppercase text-center drop-shadow-2xl">지성 분석 연구실</h2>
        <div className="flex space-x-6">
           <button onClick={() => setShowDocs(true)} className="flex items-center space-x-2 text-[10px] font-black text-cyan-500/80 hover:text-cyan-400 transition-colors uppercase tracking-[0.3em] group">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
             <span>수학적 분석 가이드</span>
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10 items-start">
        <div className="space-y-8">
          <div className="glass px-[8px] py-10 sm:p-10 rounded-[4rem] border border-cyan-500/20 shadow-2xl space-y-10 relative overflow-hidden group -mx-[3px] sm:mx-0">
            <div className="flex bg-slate-950/80 p-1.5 rounded-[2rem] border border-white/5">
              {[
                { id: 'sum', label: '합계', icon: 'Σ' },
                { id: 'pattern', label: '패턴', icon: '◈' },
                { id: 'regression', label: '회귀', icon: '↺' },
                { id: 'algo', label: '엔진', icon: '⚙' }
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id as any)}
                  className={`flex-1 py-2 sm:py-4 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-2 ${activeSection === tab.id ? 'bg-cyan-600 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.3)]' : 'text-slate-500 hover:text-cyan-400'} ${config.algorithmMode === 'Wheeling' && tab.id !== 'algo' ? 'opacity-30' : ''}`}
                >
                  <span className="text-sm">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="min-h-[260px] sm:min-h-[420px] flex flex-col justify-center">
              <div className="flex justify-between items-center mb-6 px-1">
                <div className="flex flex-col space-y-1.5">
                  <button 
                    onClick={handleResetAll}
                    className="text-[8px] font-black text-slate-500 hover:text-white transition-all uppercase tracking-widest flex items-center space-x-1.5 group/reset px-2 py-1 rounded-lg hover:bg-white/5"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover/reset:rotate-180 transition-transform duration-500"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
                    <span>전체 설정 초기화</span>
                  </button>
                  <button 
                    onClick={handleResetCurrentTab}
                    className="text-[8px] font-black text-cyan-600/70 hover:text-cyan-400 transition-all uppercase tracking-widest flex items-center space-x-1.5 group/reset px-2 py-1 rounded-lg hover:bg-cyan-500/5"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover/reset:rotate-90 transition-transform duration-300"><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9V3"/></svg>
                    <span>현재 탭 설정 초기화</span>
                  </button>
                </div>

                {activeSection === 'sum' && (
                  <button onClick={() => setShowSumGuide(true)} className="text-[9px] font-black text-yellow-500/90 hover:text-yellow-400 transition-all uppercase tracking-widest flex items-center space-x-1.5 group/link px-2 py-1 rounded-lg hover:bg-yellow-500/5">
                    <span className="w-3.5 h-3.5 rounded-full border border-yellow-500/50 flex items-center justify-center text-[8px] group-hover/link:bg-yellow-500 group-hover/link:text-slate-950 transition-all font-bold">?</span>
                    <span className="border-b border-yellow-500/20 group-hover/link:border-yellow-500">합계 제어 시스템이란?</span>
                  </button>
                )}
                {activeSection === 'pattern' && (
                  <button onClick={() => setShowPatternGuide(true)} className="text-[9px] font-black text-cyan-400/90 hover:text-cyan-400 transition-all uppercase tracking-widest flex items-center space-x-1.5 group/link px-2 py-1 rounded-lg hover:bg-cyan-500/5">
                    <span className="w-3.5 h-3.5 rounded-full border border-cyan-500/50 flex items-center justify-center text-[8px] group-hover/link:bg-cyan-500 group-hover/link:text-slate-950 transition-all font-bold">?</span>
                    <span className="border-b border-cyan-500/20 group-hover/link:border-yellow-500">패턴 정합 시스템이란?</span>
                  </button>
                )}
                {activeSection === 'regression' && (
                  <button onClick={() => setShowRegressionGuide(true)} className="text-[9px] font-black text-emerald-400/90 hover:text-emerald-400 transition-all uppercase tracking-widest flex items-center space-x-1.5 group/link px-2 py-1 rounded-lg hover:bg-emerald-500/5">
                    <span className="w-3.5 h-3.5 rounded-full border border-emerald-500/50 flex items-center justify-center text-[8px] group-hover/link:bg-emerald-500 group-hover/link:text-slate-950 transition-all font-bold">?</span>
                    <span className="border-b border-emerald-500/20 group-hover/link:border-emerald-500">회귀 분석 시스템이란?</span>
                  </button>
                )}
                {activeSection === 'algo' && (
                  <button onClick={() => setShowEngineGuide(true)} className="text-[9px] font-black text-indigo-400/90 hover:text-indigo-400 transition-all uppercase tracking-widest flex items-center space-x-1.5 group/link px-2 py-1 rounded-lg hover:bg-indigo-500/5">
                    <span className="w-3.5 h-3.5 rounded-full border border-indigo-500/50 flex items-center justify-center text-[8px] group-hover/link:bg-indigo-500 group-hover/link:text-slate-950 transition-all font-bold">?</span>
                    <span className="border-b border-indigo-500/20 group-hover/link:border-indigo-500">연산 엔진 시스템이란?</span>
                  </button>
                )}
              </div>

              {activeSection === 'sum' && (
                <div className="space-y-10 animate-in slide-in-from-right-8 duration-500 relative">
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">총합 하한 (Min Sum)</label>
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight italic">범위: 80 ~ 140 (기본: 121)</p>
                        </div>
                        <span className="text-2xl font-black text-white tabular-nums">{config.totalSumRange[0]}</span>
                      </div>
                      <input 
                        type="range" min="80" max="140" step="1" 
                        value={config.totalSumRange[0]} 
                        onChange={e => {
                          const lower = parseInt(e.target.value);
                          const upper = Math.max(config.totalSumRange[1], lower);
                          updateConfig('totalSumRange', [lower, upper]);
                        }} 
                        className="w-full accent-cyan-500 bg-slate-800 rounded-lg appearance-none h-2 cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.1)]" 
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">총합 상한 (Max Sum)</label>
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight italic">기본: 180 (당첨 빈도 극대화 구간)</p>
                        </div>
                        <span className="text-2xl font-black text-white tabular-nums">{config.totalSumRange[1]}</span>
                      </div>
                      <input 
                        type="range" min={config.totalSumRange[0]} max="240" step="1" 
                        value={config.totalSumRange[1]} 
                        onChange={e => updateConfig('totalSumRange', [config.totalSumRange[0], parseInt(e.target.value)])} 
                        className="w-full accent-cyan-500 bg-slate-800 rounded-lg appearance-none h-2 cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.1)]" 
                      />
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <p className="text-[10px] text-slate-400 text-center italic font-medium px-4">
                        "통계적으로 가장 당첨 확률이 높은 최적의 범위는 <strong className="text-cyan-400">121 ~ 180</strong>입니다."
                      </p>
                      <div className="mt-4 px-6 py-3 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl animate-in fade-in zoom-in duration-300">
                        <p className="text-xs font-black text-cyan-400 uppercase tracking-widest">현재 총합 구간의 역대 당첨율: <span className="text-white text-lg tabular-nums ml-2">{winningRate}%</span></p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6 pt-6 border-t border-white/5">
                    <div className="space-y-4">
                      <div className="flex justify-between">
                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">첫수합 상한 (1,2,3번)</label>
                      </div>
                      <div className="relative group/input">
                        <input 
                          type="number" 
                          min="6"
                          max="123"
                          value={config.sum123Range[1]} 
                          onChange={e => {
                            let val = parseInt(e.target.value);
                            if (isNaN(val)) val = 6;
                            if (val < 6) val = 6;
                            if (val > 123) val = 123;
                            updateConfig('sum123Range', [config.sum123Range[0], val]);
                          }} 
                          className="w-full bg-slate-900/50 border border-white/10 rounded-2xl p-4 text-white text-lg font-black focus:border-cyan-500 outline-none transition-all shadow-inner" 
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-cyan-500/70 uppercase">제한치</span>
                      </div>
                      <p className="text-[9px] text-slate-500 leading-relaxed font-bold italic">
                         낮을수록 앞번호 위주로 번호가 생성됩니다.
                      </p>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">끝수합 상한 (4,5,6번)</label>
                      </div>
                      <div className="relative group/input">
                        <input 
                          type="number" 
                          min="15"
                          max="132"
                          value={config.sum456Range[1]} 
                          onChange={e => {
                            let val = parseInt(e.target.value);
                            if (isNaN(val)) val = 15;
                            if (val < 15) val = 15;
                            if (val > 132) val = 132;
                            updateConfig('sum456Range', [config.sum456Range[0], val]);
                          }} 
                          className="w-full bg-slate-900/50 border border-white/10 rounded-2xl p-4 text-white text-lg font-black focus:border-cyan-500 outline-none transition-all shadow-inner" 
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-cyan-500/70 uppercase">제한치</span>
                      </div>
                      <p className="text-[9px] text-slate-500 leading-relaxed font-bold italic">
                         낮을수록 뒷번호 쏠림을 방지합니다.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'pattern' && (
                <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Benford's Law 엔진</label>
                      <button onClick={() => updateConfig('applyBenfordLaw', !config.applyBenfordLaw)} className={`w-full py-4 rounded-2xl border-2 text-[10px] font-black transition-all shadow-lg ${config.applyBenfordLaw ? 'border-cyan-500 bg-cyan-500/20 text-white' : 'border-slate-800 text-slate-600'}`}>{config.applyBenfordLaw ? '● BENFORD ON' : '○ BYPASS'}</button>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">AC Complexity (산술 복잡도)</label>
                      <select value={config.acMin} onChange={e => updateConfig('acMin', parseInt(e.target.value))} className="w-full bg-slate-950/50 border border-white/10 rounded-2xl p-4 text-white text-xs font-black outline-none focus:border-cyan-500">
                        {[7, 8, 9, 10].map(v => <option key={v} value={v}>AC {v} 이상 (추천)</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Consecutive Nos. (연속 번호)</label>
                      <select value={config.maxConsecutive} onChange={e => updateConfig('maxConsecutive', parseInt(e.target.value))} className="w-full bg-slate-950/50 border border-white/10 rounded-2xl p-4 text-white text-xs font-black outline-none focus:border-cyan-500">
                        {[0, 1, 2, 3].map(v => <option key={v} value={v}>{v === 0 ? '없음' : `${v}개 이하`}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Same Ending Nos. (동끝수)</label>
                      <select value={config.maxSameEnding} onChange={e => updateConfig('maxSameEnding', parseInt(e.target.value))} className="w-full bg-slate-950/50 border border-white/10 rounded-2xl p-4 text-white text-xs font-black outline-none focus:border-cyan-500">
                        {[0, 1, 2, 3].map(v => <option key={v} value={v}>{v === 0 ? '없음' : `${v}개 이하`}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Odd/Even Ratio (홀짝비)</label>
                      <select value={config.oddRatio} onChange={e => updateConfig('oddRatio', e.target.value)} className="w-full bg-slate-950/50 border border-white/10 rounded-2xl p-4 text-white text-xs font-black outline-none focus:border-cyan-500">
                        <option value="">제한 없음</option>
                        <option value="3:3">3:3 (권장)</option>
                        <option value="4:2">4:2</option>
                        <option value="2:4">2:4</option>
                        <option value="5:1">5:1</option>
                        <option value="1:5">1:5</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">High/Low Ratio (고저비)</label>
                      <select value={config.highLowRatio} onChange={e => updateConfig('highLowRatio', e.target.value)} className="w-full bg-slate-950/50 border border-white/10 rounded-2xl p-4 text-white text-xs font-black outline-none focus:border-cyan-500">
                        <option value="">제한 없음</option>
                        <option value="3:3">3:3 (권장)</option>
                        <option value="4:2">4:2</option>
                        <option value="2:4">2:4</option>
                        <option value="5:1">5:1</option>
                        <option value="1:5">1:5</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'regression' && (
                <div className="space-y-10 animate-in slide-in-from-right-8 duration-500">
                   <div className="p-6 bg-cyan-500/5 rounded-3xl border border-cyan-500/10 shadow-inner">
                      <p className="text-xs text-cyan-400 font-bold leading-relaxed italic text-center">"회귀 분석은 전회차 당첨 번호를 기준으로 한<br/>이월수와 이웃수를 정밀 제어합니다."</p>
                   </div>
                   <div className="space-y-8">
                      <div className="space-y-4">
                         <div className="flex justify-between text-[11px] font-black text-slate-500 uppercase tracking-widest">
                            <span>이월수 (Carry Over)</span>
                            <span className="text-white text-base">{config.carryOverRange[1]}개 추천</span>
                         </div>
                         <input type="range" min="0" max="3" value={config.carryOverRange[1]} onChange={e => updateConfig('carryOverRange', [0, parseInt(e.target.value)])} className="w-full accent-cyan-500 bg-slate-800 rounded-lg appearance-none h-2" />
                      </div>
                      <div className="space-y-4">
                         <div className="flex justify-between text-[11px] font-black text-slate-500 uppercase tracking-widest">
                            <span>이웃수 (Neighbors ±1)</span>
                            <span className="text-white text-base">{config.neighborRange[1]}개 추천</span>
                         </div>
                         <input type="range" min="0" max="3" value={config.neighborRange[1]} onChange={e => updateConfig('neighborRange', [0, parseInt(e.target.value)])} className="w-full accent-cyan-500 bg-slate-800 rounded-lg appearance-none h-2" />
                      </div>
                      <div className="space-y-4 pt-2">
                        <div className="flex justify-between text-[11px] font-black text-slate-500 uppercase tracking-widest">
                          <span>동반 출현 필터 (Co-occurrence)</span>
                          <span className={`text-base font-black ${config.coOccurrenceMode === 'off' ? 'text-slate-600' : config.coOccurrenceMode === 'favor' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {config.coOccurrenceMode === 'off' ? '비활성' : config.coOccurrenceMode === 'favor' ? '동반 선호' : '동반 기피'}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {([['off', '비활성'], ['favor', '동반 선호'], ['avoid', '동반 기피']] as const).map(([mode, label]) => (
                            <button
                              key={mode}
                              onClick={() => updateConfig('coOccurrenceMode', mode)}
                              className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                config.coOccurrenceMode === mode
                                  ? mode === 'off' ? 'bg-slate-700 text-white border border-slate-600'
                                    : mode === 'favor' ? 'bg-emerald-600 text-slate-950'
                                    : 'bg-rose-600 text-white'
                                  : 'bg-slate-900 text-slate-500 border border-slate-800 hover:border-slate-700'
                              }`}
                            >{label}</button>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-600 leading-relaxed">
                          {config.coOccurrenceMode === 'off' && '역대 데이터에서 함께 출현한 번호 쌍 빈도를 분석하지 않습니다.'}
                          {config.coOccurrenceMode === 'favor' && '역대 당첨 기록에서 자주 함께 나온 번호 쌍이 많은 조합을 선호합니다.'}
                          {config.coOccurrenceMode === 'avoid' && '역대 당첨 기록에서 함께 나온 적 없거나 드문 번호 쌍 위주의 조합을 선호합니다.'}
                        </p>
                      </div>
                   </div>
                </div>
              )}

              {activeSection === 'algo' && (
                <div className="space-y-3 sm:space-y-8 animate-in slide-in-from-right-8 duration-500 overflow-y-auto max-h-[300px] sm:max-h-[400px] pr-2 custom-scroll">
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {[
                      { id: 'Standard', name: 'Statistical Basic Filter', desc: '전통적 통계 확률에 기반한 기본 모델' },
                      { id: 'BradfordLegacy', name: 'Bradford Legacy Engine', desc: '영국 브래드포드 대학의 그물망 전략', isRecommended: true },
                      { id: 'Bradford', name: 'Balanced Coverage Engine', desc: '균형 잡힌 데이터 커버리지 모델' },
                      { id: 'EntropyMax', name: 'Entropy Maximizer v2', desc: '무작위성 분포를 극대화하는 모델' },
                      { id: 'LowFrequency', name: 'Cold Number Recall', desc: '미출현 저빈도수 분석 모델' },
                      { id: 'Wheeling', name: 'Wheeling System', desc: '선택한 풀에서 페어 커버리지 극대화' }
                    ].map(algo => (
                      <button key={algo.id} onClick={() => algo.id === 'Wheeling' && config.algorithmMode !== 'Wheeling' ? setShowWheelingNotice(true) : updateConfig('algorithmMode', algo.id as any)} className={`px-3 py-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 text-left transition-all relative overflow-hidden ${config.algorithmMode === algo.id ? 'border-cyan-500 bg-cyan-500/10 shadow-lg' : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'}`}>
                        {algo.isRecommended && (
                          <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 text-[8px] font-black px-2.5 py-0.5 rounded-bl-lg uppercase tracking-tighter z-10 animate-pulse border-b border-l border-amber-400/50">추천</div>
                        )}
                        <p className={`text-[10px] font-black uppercase tracking-normal sm:tracking-widest whitespace-nowrap ${config.algorithmMode === algo.id ? 'text-white' : 'text-slate-400'}`}>{algo.name}</p>
                        <p className="text-[9px] text-slate-500 font-medium leading-none mt-2">{algo.desc}</p>
                      </button>
                    ))}
                  </div>

                  {/* Wheeling 풀 설정 버튼 */}
                  {config.algorithmMode === 'Wheeling' && (
                    <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl space-y-3">
                      <p className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">풀 번호 설정 (7~12개 선택)</p>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => { setTempWheelPool([...config.wheelingPool]); setShowWheelModal(true); }}
                          className="flex-1 py-3 rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-cyan-400 text-[10px] font-black hover:bg-cyan-500/20 transition-all"
                        >
                          {config.wheelingPool.length >= 7 ? `${config.wheelingPool.length}개 선택됨 — 수정` : '번호 선택하기'}
                        </button>
                        {config.wheelingPool.length >= 7 && (
                          <div className="flex gap-1 flex-wrap">
                            {config.wheelingPool.map(n => (
                              <span key={n} className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-[9px] font-black text-cyan-300">{n}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      {config.wheelingPool.length >= 7 && (
                        <p className="text-[9px] text-slate-500 font-bold">{config.wheelingPool.length}개 풀 → {config.wheelingPool.length}장 티켓 생성 예정</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 고정수 및 제외수 선택 + 프리셋 버튼 */}
            <div className="pt-6 border-t border-white/10 space-y-4">
              <div className="flex items-center justify-between px-1">
                {/* 고정수/제외수 토글 — 엔진 모드에 따라 비활성 */}
                <div className={`flex items-center space-x-3 transition-opacity ${(config.algorithmMode === 'Wheeling' || config.algorithmMode === 'BradfordLegacy') ? 'opacity-30 pointer-events-none' : ''}`}>
                  <input
                    type="checkbox"
                    id="advanced-mode"
                    checked={useAdvanced}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUseAdvanced(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 accent-cyan-500 cursor-pointer"
                  />
                  <label htmlFor="advanced-mode" className="text-xs font-black text-cyan-400 uppercase tracking-widest cursor-pointer select-none">고정수 or 제외수 선택</label>
                  {(config.algorithmMode === 'Wheeling' || config.algorithmMode === 'BradfordLegacy') && (
                    <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest">— 현재 모드에서 미적용</span>
                  )}
                </div>
                {/* 프리셋 버튼 — PC에서만 우측 배치 */}
                <div className="relative hidden sm:flex items-center space-x-3 mr-8">
                  {([1, 2] as const).map(slot => (
                    <button
                      key={slot}
                      onClick={() => {
                        if (longPressTriggeredRef.current) return;
                        hasPreset[slot] ? loadPreset(slot) : setConfirmSavePreset(slot);
                      }}
                      onContextMenu={e => { e.preventDefault(); if (!longPressTriggeredRef.current) setConfirmSavePreset(slot); }}
                      onPointerDown={e => handlePointerDown(slot, e)}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerLeave={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      title={hasPreset[slot] ? `${slot}번 불러오기 / 길게 누르면 삭제` : `${slot}번 슬롯에 저장`}
                      className={`w-10 h-10 rounded-xl text-sm font-black transition-all flex items-center justify-center
                        ${activePreset === slot
                          ? 'border border-cyan-400 bg-cyan-500 text-slate-950 shadow-[0_0_8px_rgba(6,182,212,0.6)]'
                          : hasPreset[slot]
                            ? 'border border-slate-500 bg-white/5 text-slate-400 hover:border-slate-300 hover:text-slate-200'
                            : 'border border-dashed border-slate-500 bg-white/5 text-slate-400 hover:border-slate-300 hover:text-slate-200'}`}
                    >
                      {slot}
                    </button>
                  ))}
                  <button
                    onClick={() => setInfoModal('preset')}
                    className="absolute -top-1.5 -right-6 w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-600 flex items-center justify-center text-[7px] font-black text-slate-400 hover:text-white hover:border-slate-400 transition-all"
                  >?</button>
                </div>
              </div>

              {/* 고정수/제외수 입력 — 엔진 모드에 따라 비활성 */}
              {useAdvanced && (
                <div className={`grid grid-cols-2 gap-4 animate-in slide-in-from-top-4 duration-300 transition-opacity ${(config.algorithmMode === 'Wheeling' || config.algorithmMode === 'BradfordLegacy') ? 'opacity-30 pointer-events-none' : ''}`}>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">고정수 (Include Max 2)</label>
                    <div className="flex space-x-2">
                      <input type="number" min="1" max="45" value={fix1} onChange={e => setFix1(e.target.value)} placeholder="--" className="w-full bg-slate-900/80 border border-cyan-500/30 rounded-xl p-3 text-white text-center font-bold outline-none focus:border-cyan-500 transition-all" />
                      <input type="number" min="1" max="45" value={fix2} onChange={e => setFix2(e.target.value)} placeholder="--" className="w-full bg-slate-900/80 border border-cyan-500/30 rounded-xl p-3 text-white text-center font-bold outline-none focus:border-cyan-500 transition-all" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">제외수 (Exclude Max 2)</label>
                    <div className="flex space-x-2">
                      <input type="number" min="1" max="45" value={excl1} onChange={e => setExcl1(e.target.value)} placeholder="--" className="w-full bg-slate-900/80 border border-rose-500/30 rounded-xl p-3 text-white text-center font-bold outline-none focus:border-rose-500 transition-all" />
                      <input type="number" min="1" max="45" value={excl2} onChange={e => setExcl2(e.target.value)} placeholder="--" className="w-full bg-slate-900/80 border border-rose-500/30 rounded-xl p-3 text-white text-center font-bold outline-none focus:border-rose-500 transition-all" />
                    </div>
                  </div>
                </div>
              )}

              {/* 프리셋 버튼 — 폰에서만 입력칸 아래 중앙 배치 */}
              <div className="flex sm:hidden justify-center !mt-10">
                <div className="relative flex items-center space-x-3">
                  {([1, 2] as const).map(slot => (
                    <button
                      key={slot}
                      onClick={() => {
                        if (longPressTriggeredRef.current) return;
                        hasPreset[slot] ? loadPreset(slot) : setConfirmSavePreset(slot);
                      }}
                      onContextMenu={e => { e.preventDefault(); if (!longPressTriggeredRef.current) setConfirmSavePreset(slot); }}
                      onPointerDown={e => handlePointerDown(slot, e)}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerLeave={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      title={hasPreset[slot] ? `${slot}번 불러오기 / 길게 누르면 삭제` : `${slot}번 슬롯에 저장`}
                      className={`w-10 h-10 rounded-xl text-sm font-black transition-all flex items-center justify-center
                        ${activePreset === slot
                          ? 'border border-cyan-400 bg-cyan-500 text-slate-950 shadow-[0_0_8px_rgba(6,182,212,0.6)]'
                          : hasPreset[slot]
                            ? 'border border-slate-500 bg-white/5 text-slate-400 hover:border-slate-300 hover:text-slate-200'
                            : 'border border-dashed border-slate-500 bg-white/5 text-slate-400 hover:border-slate-300 hover:text-slate-200'}`}
                    >
                      {slot}
                    </button>
                  ))}
                  <button
                    onClick={() => setInfoModal('preset')}
                    className="absolute -top-1.5 -right-6 w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-600 flex items-center justify-center text-[7px] font-black text-slate-400 hover:text-white hover:border-slate-400 transition-all"
                  >?</button>
                </div>
              </div>
            </div>

            <div className="flex justify-center sm:block">
            <button
              onClick={handleGenerateClick}
              disabled={loading || (config.algorithmMode === 'Wheeling' && config.wheelingPool.length < 7)}
              className="w-auto px-8 sm:w-full sm:px-0 py-4 sm:py-7 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:cursor-not-allowed text-slate-950 disabled:text-slate-500 font-black rounded-[2rem] transition-all shadow-xl uppercase tracking-[0.4em] active:scale-95"
            >
              {loading ? (
                <span className="text-sm sm:text-xl">연산 중...</span>
              ) : config.algorithmMode === 'Wheeling' && config.wheelingPool.length < 7 ? (
                <div className="flex flex-col items-center">
                  <span className="text-xl">풀 번호 미설정</span>
                  <span className="text-xs mt-1 font-bold tracking-widest">엔진 탭에서 Wheeling 풀 번호를 먼저 선택하세요</span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <span className="text-base sm:text-xl">정밀 분석 및 번호 추출</span>
                  <span className="text-xs opacity-60 mt-1 font-bold tracking-widest">(+1,000 루멘)</span>
                </div>
              )}
            </button>
            </div>
          </div>
        </div>

        <div className="space-y-10">
          {loading ? (
            <div className="glass p-20 rounded-[5rem] border border-cyan-500/20 min-h-[680px] flex flex-col items-center justify-center space-y-14">
              <div className="w-40 h-40 border-8 border-cyan-500/10 rounded-full animate-spin border-t-cyan-400 shadow-[0_0_50px_rgba(6,182,212,0.2)]"></div>
              <h3 className="text-3xl font-mystic font-black text-white tracking-widest animate-pulse">Running Logic...</h3>
              <div className="grid grid-cols-9 gap-3 opacity-30">{[...Array(45)].map((_, i) => (
                <div key={i} className={`w-9 h-9 rounded-lg border flex items-center justify-center text-[10px] font-black transition-all ${scanIndex === i ? 'bg-cyan-500 text-slate-950 border-cyan-400' : 'text-cyan-500 border-cyan-500/20'}`}>{i+1}</div>
              ))}</div>
            </div>
          ) : result ? (
            <div className="space-y-10 animate-in zoom-in-95 duration-1000">
              {/* 메인 세트 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    {result.additionalSets ? `Game #1 (대표 번호)` : '추출 번호'}
                  </p>
                  {result.savedAt && (
                    <p className="text-[9px] font-bold text-slate-600">
                      추출시간: {(() => {
                        const d = new Date(result.savedAt);
                        return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}. ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
                      })()}
                    </p>
                  )}
                </div>
                <div className="glass p-8 rounded-[3rem] border border-cyan-500/10 shadow-xl flex items-center justify-center gap-4 group hover:border-cyan-500/30 transition-all">
                  {result.numbers.map((num, i) => (
                    <div key={i} className="w-10 h-10 sm:w-14 sm:h-14 rounded-full sm:rounded-2xl bg-slate-800 border border-white/5 flex items-center justify-center text-base sm:text-2xl font-black text-white shadow-lg group-hover:scale-105 transition-transform">
                      {num}
                    </div>
                  ))}
                </div>
              </div>

              {/* 추가 게임 세트 (Bradford Legacy / Wheeling) */}
              {result.additionalSets && result.additionalSets.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">
                    Additional Games ({result.additionalSets.length}개)
                  </p>
                  <div className="space-y-2">
                    {result.additionalSets.map((set, si) => (
                      <div key={si} className="glass px-6 py-4 rounded-2xl border border-white/5 flex items-center gap-4">
                        <span className="text-[9px] font-black text-slate-600 w-10 shrink-0">#{si + 2}</span>
                        <div className="flex gap-2 flex-wrap">
                          {set.map((num, ni) => (
                            <div key={ni} className="w-9 h-9 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center text-sm font-black text-white">
                              {num}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 면책 고지 */}
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-white/3 border border-white/5">
                <span className="text-slate-500 text-xs shrink-0 mt-0.5">⚠</span>
                <p className="text-[10px] text-slate-500 leading-relaxed font-medium">본 분석은 통계적 참고 정보이며 로또 당첨 확률에 대한 과학적 근거가 없습니다. 번호 추천은 오락·참고 목적으로만 제공됩니다.</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* 벤포드 적합도 카드 — 항상 표시, 적용 여부 배지 포함 */}
                <div className="relative glass p-7 rounded-[2rem] border border-white/5 space-y-2 shadow-xl">
                  <button
                    onClick={() => setInfoModal('benford')}
                    className="absolute top-3 right-3 w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[9px] font-black text-slate-500 hover:bg-white/10 hover:text-slate-300 transition-colors"
                  >?</button>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">벤포드 적합도</p>
                  {result.benfordApplied ? (
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-black text-amber-400">{result.metrics.benfordScore}점</p>
                      <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400">적용됨</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-black text-slate-600">—</p>
                      <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-slate-700/60 border border-slate-600/30 text-slate-500">적용 안됨</span>
                    </div>
                  )}
                </div>

                {[
                  { label: "산술 복잡도", val: `AC ${result.metrics.acValue}`, color: "text-cyan-400", key: "ac" },
                  { label: "패턴 일치 확률", val: `${result.matchProbability.toFixed(1)}%`, color: "text-emerald-400", key: "match" },
                  { label: "역대 유사 순위", val: `${result.historicalRank}위`, color: "text-slate-400", key: "rank" },
                  {
                    label: "정규분포 Z-Score",
                    val: `${result.metrics.sumZScore > 0 ? '+' : ''}${result.metrics.sumZScore}σ`,
                    color: Math.abs(result.metrics.sumZScore) <= 1 ? "text-indigo-400" : Math.abs(result.metrics.sumZScore) <= 2 ? "text-yellow-400" : "text-rose-400",
                    key: "zscore"
                  },
                  {
                    label: "분포 균일도",
                    val: `${result.metrics.chiSquaredScore}점`,
                    color: result.metrics.chiSquaredScore >= 75 ? "text-emerald-400" : result.metrics.chiSquaredScore >= 50 ? "text-yellow-400" : "text-rose-400",
                    key: "chi"
                  },
                ].map((stat, i) => (
                  <div key={i} className="relative glass p-7 rounded-[2rem] border border-white/5 space-y-2 shadow-xl">
                    <button
                      onClick={() => setInfoModal(stat.key)}
                      className="absolute top-3 right-3 w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[9px] font-black text-slate-500 hover:bg-white/10 hover:text-slate-300 transition-colors"
                    >?</button>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
                    <p className={`text-2xl font-black ${stat.color}`}>{stat.val}</p>
                  </div>
                ))}
              </div>

              {/* Z-Score 시각 패널 */}
              <div className="glass p-8 rounded-[2.5rem] border border-indigo-500/20 shadow-xl space-y-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 font-black text-sm">σ</div>
                    <div>
                      <h3 className="text-xs font-black text-indigo-300 uppercase tracking-tight sm:tracking-widest whitespace-nowrap">Normal Distribution Z-Score</h3>
                      <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">합계의 통계적 위치 — 평균 138, 표준편차 24</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setInfoModal('zscore_panel')}
                    className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-slate-500 hover:bg-white/10 hover:text-slate-300 transition-colors flex-shrink-0"
                  >?</button>
                </div>
                {/* 수직 눈금 바 */}
                <div className="relative h-8 mx-4">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-rose-900/60 via-indigo-900/40 via-emerald-900/40 via-indigo-900/40 to-rose-900/60"></div>
                  <div className="absolute inset-0 flex items-center justify-between px-4 text-[8px] font-black text-slate-500 pointer-events-none">
                    <span>-3σ</span><span>-2σ</span><span>-1σ</span><span>0</span><span>+1σ</span><span>+2σ</span><span>+3σ</span>
                  </div>
                  {/* 현재 Z-Score 위치 마커 */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-6 rounded-sm bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]"
                    style={{ left: `${Math.min(100, Math.max(0, ((result.metrics.sumZScore + 3) / 6) * 100))}%` }}
                  ></div>
                </div>
                <div className="p-4 bg-slate-900/50 rounded-2xl border border-white/5 space-y-1">
                  <p className="text-[11px] text-indigo-200 font-bold text-center">
                    이 조합의 합계 <span className="text-white font-black">{result.metrics.sum}</span>은 통계 평균(138)에서{' '}
                    <span className={`font-black ${Math.abs(result.metrics.sumZScore) <= 1 ? 'text-indigo-300' : Math.abs(result.metrics.sumZScore) <= 2 ? 'text-yellow-300' : 'text-rose-300'}`}>
                      {result.metrics.sumZScore > 0 ? '+' : ''}{result.metrics.sumZScore}σ
                    </span>{' '}위치입니다.
                  </p>
                  <p className="text-[10px] text-slate-400 text-center italic">
                    {Math.abs(result.metrics.sumZScore) <= 1
                      ? '★ 중심부 안정권 — 역대 당첨 합계의 약 68%가 이 구간에 분포합니다.'
                      : Math.abs(result.metrics.sumZScore) <= 2
                      ? '▲ 외곽 변동권 — 역대 당첨 합계의 약 27%가 이 구간에 분포합니다.'
                      : '◆ 극단 희귀권 — 역대 당첨 합계의 약 5% 미만이 이 구간에 분포합니다.'}
                  </p>
                </div>
                {(result.historyCount ?? 0) < 50 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                    <span className="text-yellow-400 text-xs shrink-0">⚠</span>
                    <p className="text-[9px] text-yellow-400/80 font-bold leading-relaxed">
                      로또 역대 데이터가 {result.historyCount ?? 0}회분으로 적습니다. 데이터가 충분히 쌓이기 전까지 Z-Score 및 패턴 지표의 신뢰도가 낮을 수 있습니다.
                    </p>
                  </div>
                )}
              </div>

              {/* 카이제곱 분포 균일도 패널 */}
              <div className="glass p-8 rounded-[2.5rem] border border-emerald-500/20 shadow-xl space-y-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 font-black text-sm">χ²</div>
                    <div>
                      <h3 className="text-xs font-black text-emerald-300 uppercase tracking-tight sm:tracking-widest whitespace-nowrap">Chi-Squared Zone Distribution</h3>
                      <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">5개 구간 번호 분포 균일도 — 높을수록 고르게 퍼짐</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setInfoModal('chi_panel')}
                    className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-slate-500 hover:bg-white/10 hover:text-slate-300 transition-colors flex-shrink-0"
                  >?</button>
                </div>
                {/* 구간별 실제 분포 바차트 */}
                <div className="flex gap-2 items-end h-16">
                  {(() => {
                    const zones = [
                      { label: '1-9', size: 9 },
                      { label: '10-19', size: 10 },
                      { label: '20-29', size: 10 },
                      { label: '30-39', size: 10 },
                      { label: '40-45', size: 6 },
                    ];
                    const counts = [0, 0, 0, 0, 0];
                    result.numbers.forEach((n: number) => {
                      if (n <= 9) counts[0]++;
                      else if (n <= 19) counts[1]++;
                      else if (n <= 29) counts[2]++;
                      else if (n <= 39) counts[3]++;
                      else counts[4]++;
                    });
                    return zones.map((z, i) => {
                      const expected = (6 * z.size / 45);
                      const barH = Math.min(100, counts[i] * 25); // 최대 3개 이상이면 꽉참
                      const isOver = counts[i] > expected + 0.5;
                      const isUnder = counts[i] < expected - 0.5;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <span className={`text-[9px] font-black ${isOver ? 'text-emerald-400' : isUnder ? 'text-slate-600' : 'text-slate-400'}`}>{counts[i]}</span>
                          <div className="w-full rounded-t-lg relative" style={{ height: '48px', background: 'rgba(255,255,255,0.04)' }}>
                            <div
                              className={`absolute bottom-0 w-full rounded-t-lg transition-all ${isOver ? 'bg-emerald-500/60' : isUnder ? 'bg-slate-700/60' : 'bg-emerald-700/40'}`}
                              style={{ height: `${barH}%` }}
                            ></div>
                            {/* 기대빈도 점선 */}
                            <div className="absolute w-full border-t border-dashed border-cyan-500/40" style={{ bottom: `${Math.min(100, expected * 25)}%` }}></div>
                          </div>
                          <span className="text-[8px] text-slate-600 font-bold">{z.label}</span>
                        </div>
                      );
                    });
                  })()}
                </div>
                <div className="flex items-center gap-4 text-[8px] text-slate-500 font-bold px-1">
                  <span className="flex items-center gap-1.5"><span className="w-3 border-t border-dashed border-cyan-500/60 inline-block"></span>기대빈도</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-emerald-500/60 inline-block"></span>실제 분포</span>
                </div>
                <div className="p-4 bg-slate-900/50 rounded-2xl border border-white/5">
                  <p className="text-[10px] text-slate-400 leading-relaxed text-center italic">
                    {result.metrics.chiSquaredScore >= 75
                      ? `균일도 ${result.metrics.chiSquaredScore}점 — 번호가 5개 구간에 고르게 분산된 이상적인 조합입니다.`
                      : result.metrics.chiSquaredScore >= 50
                      ? `균일도 ${result.metrics.chiSquaredScore}점 — 일부 구간에 편중이 있으나 허용 범위 내입니다.`
                      : `균일도 ${result.metrics.chiSquaredScore}점 — 특정 구간에 집중된 성향의 조합입니다.`}
                  </p>
                </div>
              </div>

              {config.applyBenfordLaw && (<div className="glass p-10 rounded-[4rem] border border-cyan-500/20 shadow-2xl space-y-6">
                 <div className="flex justify-between items-center">
                    <div>
                       <h3 className="text-xs font-black text-white uppercase tracking-widest">Benford's Law Comparison Chart</h3>
                       <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">이론적 분포(로그 곡선) vs 추출 조합 분포</p>
                    </div>
                    <div className="flex items-center space-x-3">
                       <div className="flex space-x-4">
                         <div className="flex items-center space-x-2"><div className="w-2 h-2 bg-cyan-500 rounded-full"></div><span className="text-[8px] font-bold text-slate-400 uppercase">Actual</span></div>
                         <div className="flex items-center space-x-2"><div className="w-2 h-2 bg-white/10 rounded-full"></div><span className="text-[8px] font-bold text-slate-400 uppercase">Ideal</span></div>
                       </div>
                       <button
                         onClick={() => setInfoModal('benford_chart')}
                         className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-slate-500 hover:bg-white/10 hover:text-slate-300 transition-colors flex-shrink-0"
                       >?</button>
                    </div>
                 </div>
                 <div className="flex justify-between items-end h-32 px-4 gap-2">
                    {BENFORD_IDEAL.map((ideal, i) => {
                      const actual = (result.metrics.leadDigitsDistribution[i] / 6) * 100;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                           <div className="absolute w-full bg-white/5 rounded-t-lg" style={{height: `${ideal * 1.2}px`}}></div>
                           <div className="relative w-full bg-cyan-500/40 border-t border-cyan-400 rounded-t-lg group-hover:bg-cyan-500 transition-all" style={{height: `${actual * 1.2}px`}}></div>
                           <span className="mt-4 text-[9px] font-black text-slate-500">{i+1}</span>
                        </div>
                      );
                    })}
                 </div>
                 <div className="pt-4 border-t border-white/5 space-y-4">
                    <p className="text-[11px] text-cyan-400 font-bold leading-relaxed text-center italic">
                       "추출된 조합의 통계적 정합성이 벤포드 로그 곡선과 {result.metrics.benfordScore}% 일치합니다."
                    </p>
                    <div className="p-5 bg-slate-900/50 rounded-2xl border border-amber-500/10 space-y-3">
                      <p className="text-[12px] text-amber-400/80 font-black text-center uppercase tracking-widest">⚠️ 이 지표에 대하여</p>
                      <p className="text-[11px] text-slate-400 leading-relaxed text-center px-2">
                        벤포드의 법칙은 <span className="text-slate-300 font-bold">자연 발생 데이터</span>에 적용되는 통계 법칙입니다.<br/>
                        로또는 1~45 사이의 <span className="text-slate-300 font-bold">균등 추출</span>이므로 이 법칙이 본질적으로 적용되지 않습니다.
                      </p>
                      <p className="text-[10px] text-slate-500 leading-relaxed text-center px-2 border-t border-white/5 pt-3">
                        실제 역대 앞자리 출현 빈도 (1~1211회 기준)<br/>
                        앞자리 1 · 2 · 3 → 각 약 24~25% &nbsp;|&nbsp; 앞자리 4 → 약 13% &nbsp;|&nbsp; 앞자리 5~9 → 각 약 2%
                      </p>
                    </div>
                 </div>
              </div>)}

              <div className="glass p-10 rounded-[5rem] border border-cyan-500/20 relative overflow-hidden shadow-2xl">
                <div className="flex items-center space-x-5 mb-8">
                   <div className="w-14 h-14 bg-cyan-600/20 rounded-2xl flex items-center justify-center text-cyan-400 shadow-xl">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M2 12h20"/></svg>
                   </div>
                   <div>
                      <h3 className="text-xs font-black text-cyan-400 tracking-[0.2em] sm:tracking-[0.5em] uppercase whitespace-nowrap">Mystic Lotto Lab Report</h3>
                      <p className="text-[9px] text-slate-500 font-bold uppercase mt-1 italic tracking-tight sm:tracking-normal whitespace-nowrap">Protocol Compliance: AI Inference Engine</p>
                   </div>
                </div>
                <p className="text-[15px] text-cyan-50/70 leading-[2] italic font-medium whitespace-pre-wrap px-2 mb-12">
                  {result.scientificReport}
                </p>

                <div className="flex justify-between items-end border-t border-cyan-500/10 pt-10">
                   <div className="space-y-4">
                      <p className="text-[9px] text-slate-600 font-bold tracking-widest uppercase">Algorithm Verified: Mystic Intellect Lab</p>
                   </div>
                   <div className="flex flex-col items-center">
                      <div className="relative w-20 h-20 mb-2 opacity-40">
                         <svg viewBox="0 0 100 100" className="w-full h-full text-cyan-500">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" />
                            <text x="50" y="55" textAnchor="middle" fontSize="10" fontWeight="900" fill="currentColor">MYSTIC LAB</text>
                         </svg>
                      </div>
                      <span className="text-[9px] font-black text-cyan-400 tracking-widest uppercase italic">Chief Analyst of Mystic Lab</span>
                   </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass p-20 rounded-[5rem] border border-dashed border-cyan-500/10 min-h-[680px] flex flex-col items-center justify-center text-center space-y-6">
               <div className="w-24 h-24 rounded-full bg-cyan-500/5 flex items-center justify-center animate-pulse">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-cyan-500/20"><path d="M14.7 6.3l3.77-3.77a6 6 0 117.94 7.94l-6.91 6.91"/></svg>
               </div>
               <p className="text-slate-500 font-black uppercase tracking-[0.6em] text-sm">Laboratory Protocol Offline</p>
               <p className="text-slate-600 text-xs max-w-xs mx-auto">상단의 엔진을 가동하여 수학적 검증이 완료된 번호 세트를 도출하십시오.</p>
            </div>
          )}
        </div>
      </div>
      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(6, 182, 212, 0.3); border-radius: 10px; }
      `}</style>

      {/* 프리셋 저장 확인 모달 */}
      {confirmSavePreset && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center px-6" onClick={() => setConfirmSavePreset(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative glass rounded-[2.5rem] border border-white/10 p-8 max-w-xs w-full shadow-2xl animate-in zoom-in-95 fade-in duration-200 space-y-5" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-black text-white text-center leading-relaxed">
              현재 설정값을<br/>
              <span className="text-cyan-400">{confirmSavePreset}번 슬롯</span>에 저장할까요?
            </p>
            <p className="text-[10px] text-slate-500 text-center">필터 설정 · 고정수 · 제외수 포함</p>
            <div className="flex space-x-3">
              <button onClick={() => setConfirmSavePreset(null)} className="flex-1 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-slate-400 hover:text-white transition-all uppercase tracking-widest">취소</button>
              <button onClick={() => savePreset(confirmSavePreset)} className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-2xl text-[10px] font-black text-slate-950 transition-all uppercase tracking-widest">저장</button>
            </div>
          </div>
        </div>
      )}

      {/* 프리셋 삭제 확인 모달 */}
      {confirmClearPreset && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center px-6" onClick={() => setConfirmClearPreset(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative glass rounded-[2.5rem] border border-rose-500/20 p-8 max-w-xs w-full shadow-2xl animate-in zoom-in-95 fade-in duration-200 space-y-5" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <p className="text-sm font-black text-white text-center leading-relaxed">
              <span className="text-rose-400">{confirmClearPreset}번 슬롯</span>의<br/>저장된 설정을 삭제할까요?
            </p>
            <p className="text-[10px] text-slate-500 text-center">삭제 후 복구할 수 없습니다</p>
            <div className="flex space-x-3">
              <button onClick={() => setConfirmClearPreset(null)} className="flex-1 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-slate-400 hover:text-white transition-all uppercase tracking-widest">취소</button>
              <button onClick={() => clearPreset(confirmClearPreset)} className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 rounded-2xl text-[10px] font-black text-white transition-all uppercase tracking-widest">삭제</button>
            </div>
          </div>
        </div>
      )}

      {/* 지표 설명 모달 */}
      {infoModal && INFO_CONTENT[infoModal] && (
        <div
          className="fixed inset-0 z-[8000] flex items-center justify-center px-6"
          onClick={() => setInfoModal(null)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative glass rounded-[2.5rem] border border-cyan-500/20 p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 fade-in duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* 닫기 버튼 */}
            <button
              onClick={() => setInfoModal(null)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-sm"
            >✕</button>

            {/* 아이콘 + 제목 */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-black text-sm flex-shrink-0">?</div>
              <h3 className="text-sm font-black text-white tracking-wide">{INFO_CONTENT[infoModal].title}</h3>
            </div>

            {/* 본문 */}
            <p className="text-[12px] text-slate-300 leading-relaxed whitespace-pre-line">
              {infoModal === 'benford' ? benfordInfoBody : INFO_CONTENT[infoModal].body}
            </p>

            <button
              onClick={() => setInfoModal(null)}
              className="mt-6 w-full py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-black hover:bg-cyan-500/20 transition-colors"
            >확인</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScientificAnalysis;
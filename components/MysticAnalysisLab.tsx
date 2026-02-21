import React, { useState, useMemo } from 'react';
import { LottoRound } from '../types';

interface MysticAnalysisLabProps {
  lottoHistory: LottoRound[];
  onBack: () => void;
}

const MysticAnalysisLab: React.FC<MysticAnalysisLabProps> = ({ lottoHistory, onBack }) => {
  const [timeFilter, setTimeFilter] = useState<'all' | '5' | '10' | '15'>('5');
  const [activeTab, setActiveTab] = useState<'summary' | 'frequency' | 'patterns' | 'advanced'>('summary');
  const [sortBy, setSortBy] = useState<'number' | 'count'>('number');
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [infoModal, setInfoModal] = useState<string | null>(null);

  const LAB_INFO: Record<string, { title: string; body: string }> = {
    odd_even: {
      title: '음양의 파동 (홀짝 분포)',
      body: '6개 번호 중 홀수와 짝수의 비율을 분석합니다.\n\n역대 당첨 번호 기준으로 홀3:짝3 또는 홀4:짝2 비율이 가장 빈번하게 출현합니다. 6개 모두 홀수이거나 모두 짝수인 조합은 통계적으로 매우 드뭅니다.\n\n균형 잡힌 홀짝 비율(2:4 ~ 4:2)이 역사적으로 가장 자연스러운 패턴입니다.',
    },
    high_low: {
      title: '높낮이 기류 (고저 분포)',
      body: '1~22를 저(Low), 23~45를 고(High)로 분류해 비율을 분석합니다.\n\n역대 당첨 번호는 고(High) 쪽이 약간 우세하거나 균등한 경향이 있습니다. 저3:고3 또는 저2:고4 조합이 통계적으로 자주 출현합니다.\n\n한쪽으로 극단적으로 몰린 조합(저0:고6 등)은 출현 빈도가 낮습니다.',
    },
    ending_digits: {
      title: '끝자리 조화 (일의 자리 분포)',
      body: '6개 번호 각각의 일의 자리(0~9) 출현 횟수를 집계합니다.\n\n특정 끝자리에 번호가 집중되지 않고 고르게 분포된 조합이 통계적으로 더 자연스럽습니다.\n\n예를 들어 3, 13, 23, 33과 같이 끝자리가 모두 같은 조합은 당첨 확률이 낮다는 통계적 경향이 있습니다.',
    },
    ritual_marking: {
      title: '운명 마킹 패턴 (실물 슬립 분포)',
      body: '실제 로또 용지 규격(가로 7칸 × 세로 7행)에 맞춰 최근 회차별 당첨 번호의 위치 패턴을 시각화합니다.\n\n밝게 표시된 칸일수록 해당 번호가 지정 기간 내 자주 당첨된 번호입니다.\n\n특정 구역(상단·하단·중앙 등)에 편중되는 경향이 있는지 직관적으로 확인할 수 있습니다.',
    },
    ac_index: {
      title: '구조 복잡성 지수 (AC Index)',
      body: 'AC(Arithmetic Complexity)는 6개 번호 간 차이값의 종류 수를 측정합니다.\n\n• AC 0~6 — 번호들이 규칙적으로 배열된 단순한 조합 (연속 번호, 등차수열 등)\n• AC 7~10 — 불규칙하고 복잡한 조합\n\n역대 당첨 번호의 95% 이상이 AC 7~10 구간에 집중되어 있습니다. 따라서 AC 7 이상을 설정하는 것이 통계적으로 유리합니다.',
    },
    sum_orbit: {
      title: '총합 에너지 궤적 (Sum Orbit)',
      body: '6개 번호의 합계가 어느 구간에 얼마나 몰려 있는지 보여줍니다.\n\n1~45에서 6개를 뽑을 때 이론적 평균 합계는 138입니다. 역대 당첨 번호의 약 70% 이상이 101~180 구간에 분포하며, 141~180 구간이 역사적으로 가장 빈도가 높습니다.\n\n합계가 21~100 또는 181~255처럼 극단적인 조합은 당첨 확률이 통계적으로 낮습니다.',
    },
    prime_resonance: {
      title: '소수 공명 분석 (Prime Resonance)',
      body: '당첨 번호 중 소수(2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43)의 출현 빈도를 집계합니다.\n\n1~45 중 소수는 14개(약 31%)이므로, 6개 번호 중 평균 약 2개의 소수가 포함되는 것이 통계적으로 자연스럽습니다.\n\n소수가 0개이거나 5개 이상인 조합은 출현 빈도가 낮은 편입니다.',
    },
    color_resonance: {
      title: '색채 에너지 분포 (Color Resonance)',
      body: '한국 로또는 번호대별로 볼 색깔이 다릅니다.\n\n• 1~10  — 노란 볼 🟡\n• 11~20 — 파란 볼 🔵\n• 21~30 — 빨간 볼 🔴\n• 31~40 — 회색 볼 ⚫\n• 41~45 — 초록 볼 🟢\n\n각 구간에서 당첨 번호가 출현한 총 횟수 비율을 보여줍니다. 지정 기간 동안 특정 색(번호대)이 얼마나 자주 뽑혔는지 파악하는 데 활용할 수 있습니다.\n\n이론적으로는 구간별 번호 수(10·10·10·10·5개)에 비례한 출현이 자연스럽습니다.',
    },
    silent_numbers: {
      title: '침묵의 수 (Silent Cold Numbers)',
      body: '지정된 분석 기간 동안 단 한 번도 당첨 번호에 포함되지 않은 숫자들입니다.\n\n기간을 짧게 설정할수록(최근 5회차 등) 침묵의 수가 많이 나타나고, 전체 회차로 넓히면 대부분 사라집니다.\n\n침묵의 수가 반드시 다음에 나올 가능성이 높다는 의미는 아닙니다. 로또는 매 회차 독립 시행이므로 이전 출현 여부가 다음 결과에 영향을 주지 않습니다. 참고 지표로만 활용하세요.',
    },
  };

  const statsData = useMemo(() => {
    if (timeFilter === 'all') return lottoHistory;
    const count = parseInt(timeFilter);
    return lottoHistory.slice(0, count);
  }, [lottoHistory, timeFilter]);

  const listData = useMemo(() => {
    let base = lottoHistory;
    if (searchQuery.trim()) {
      base = lottoHistory.filter(round => round.round.toString().includes(searchQuery.trim()));
    }
    return base.slice(0, pageSize);
  }, [lottoHistory, searchQuery, pageSize]);

  const hasMore = useMemo(() => {
    const total = searchQuery.trim() 
      ? lottoHistory.filter(r => r.round.toString().includes(searchQuery.trim())).length 
      : lottoHistory.length;
    return pageSize < total;
  }, [lottoHistory, searchQuery, pageSize]);

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

  const stats = useMemo(() => {
    const counts = new Array(46).fill(0);
    const oddCounts = [0, 0]; 
    const highLowCounts = [0, 0]; 
    const endDigitCounts = new Array(10).fill(0);
    const sumRanges: { [key: string]: number } = { '21-100': 0, '101-140': 0, '141-180': 0, '181-220': 0, '221-255': 0 };
    const acCounts = new Array(11).fill(0);
    const colorCounts = { yellow: 0, blue: 0, red: 0, gray: 0, green: 0 };
    const primeNumbers = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43];
    let primeAppearanceCount = 0;

    statsData.forEach(round => {
      let sum = 0;
      round.numbers.forEach(n => {
        counts[n]++;
        sum += n;
        n % 2 !== 0 ? oddCounts[0]++ : oddCounts[1]++;
        n < 23 ? highLowCounts[0]++ : highLowCounts[1]++;
        endDigitCounts[n % 10]++;
        if (primeNumbers.includes(n)) primeAppearanceCount++;

        if (n >= 1 && n <= 10) colorCounts.yellow++;
        else if (n <= 20) colorCounts.blue++;
        else if (n <= 30) colorCounts.red++;
        else if (n <= 40) colorCounts.gray++;
        else colorCounts.green++;
      });

      if (sum <= 100) sumRanges['21-100']++;
      else if (sum <= 140) sumRanges['101-140']++;
      else if (sum <= 180) sumRanges['141-180']++;
      else if (sum <= 220) sumRanges['181-220']++;
      else sumRanges['221-255']++;

      const ac = calculateAC(round.numbers);
      if (ac >= 0 && ac <= 10) acCounts[ac]++;
    });

    const silentNumbers = [];
    for (let i = 1; i <= 45; i++) {
      if (counts[i] === 0) silentNumbers.push(i);
    }

    return { counts, oddCounts, highLowCounts, endDigitCounts, sumRanges, acCounts, colorCounts, primeAppearanceCount, silentNumbers };
  }, [statsData]);

  const sortedNumbers = useMemo(() => {
    const list = Array.from({ length: 45 }, (_, i) => ({
      num: i + 1,
      count: stats.counts[i + 1]
    }));
    if (sortBy === 'count') return list.sort((a, b) => b.count - a.count || a.num - b.num);
    return list;
  }, [stats.counts, sortBy]);

  const getBallColor = (n: number) => {
    if (n >= 1 && n <= 10) return 'bg-[#facc15]'; 
    if (n <= 20) return 'bg-[#3b82f6]'; 
    if (n <= 30) return 'bg-[#ef4444]'; 
    if (n <= 40) return 'bg-[#94a3b8]'; 
    return 'bg-[#10b981]'; 
  };

  return (
    <div className="fixed inset-0 z-[5000] bg-[#020617] text-slate-200 flex flex-col animate-in fade-in duration-700">
      <header className="relative z-10 glass border-b border-white/5 px-8 py-6 flex justify-between items-center backdrop-blur-3xl shrink-0">
        <div className="flex items-center space-x-6">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors translate-x-[-15px] sm:translate-x-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div className="translate-x-[-25px] sm:translate-x-0">
            <h2 className="text-[13px] sm:text-xl font-mystic font-black text-white tracking-[0.08em] sm:tracking-widest leading-none uppercase sm:whitespace-normal whitespace-nowrap">Mystic Analysis Lab</h2>
            <p className="text-[9px] text-cyan-400 font-black uppercase tracking-[0.05em] sm:tracking-[0.4em] mt-1.5 sm:whitespace-normal whitespace-nowrap">미스틱 분석 제단: 운명의 통계학</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
           <div className="flex flex-col items-end translate-x-[15px] sm:translate-x-0">
              <span className="text-[8px] text-slate-500 font-black uppercase mb-1 tracking-wider sm:tracking-widest text-right">Analysis Threshold</span>
              <select
                value={timeFilter}
                onChange={(e) => { setTimeFilter(e.target.value as any); setPageSize(10); }}
                className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black text-cyan-100 outline-none focus:border-cyan-500 transition-all uppercase tracking-widest cursor-pointer"
              >
                <option value="all">전체 기운</option>
                <option value="5">최근 5주</option>
                <option value="10">최근 10주</option>
                <option value="15">최근 15주</option>
              </select>
           </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex flex-col">
        <nav className="border-b border-white/5 bg-slate-950/50 py-1 sm:p-2 flex justify-around sm:justify-center sm:space-x-2 shrink-0">
           {[
             { id: 'summary', label: '과거 계시록', icon: '📜' },
             { id: 'frequency', label: '공명 빈도', icon: '🔥' },
             { id: 'patterns', label: '파동 평형', icon: '☯' },
             { id: 'advanced', label: '심층 구조', icon: '💎' },
           ].map(tab => (
             <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 sm:px-6 py-2 sm:py-3 flex items-center sm:space-x-3 rounded-xl transition-all ${activeTab === tab.id ? 'bg-cyan-600 text-slate-950 shadow-lg' : 'hover:bg-white/5 text-slate-500'}`}
             >
               <span className="text-lg sm:text-sm">{tab.icon}</span>
               <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
             </button>
           ))}
        </nav>

        <main className="flex-1 overflow-y-auto p-6 md:p-10 custom-scroll bg-[radial-gradient(circle_at_50%_0%,_rgba(6,182,212,0.05),_transparent_70%)]">
           <div className="max-w-6xl mx-auto space-y-12 pb-24">
              
              {activeTab === 'summary' && (
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                   <h3 className="text-base sm:text-xl font-mystic font-black text-cyan-400 uppercase tracking-[0.1em] sm:tracking-widest whitespace-nowrap">📜 과거 계시록 (Past Draw Archive)</h3>
                   <div className="flex justify-center">
                      <div className="relative w-full max-w-md sm:max-w-none group">
                         <div className="absolute inset-0 bg-cyan-500/10 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity rounded-full"></div>
                         <div className="relative flex items-center bg-slate-950/50 border border-white/5 rounded-2xl px-6 py-4 focus-within:border-cyan-500/50 transition-all shadow-inner">
                            <span className="text-lg mr-4 opacity-40">🔍</span>
                            <input 
                              type="text" 
                              value={searchQuery}
                              onChange={(e) => { setSearchQuery(e.target.value); setPageSize(10); }}
                              placeholder="검색할 회차를 입력하세요 (예: 1211)"
                              className="bg-transparent border-none outline-none text-sm text-white font-bold w-full placeholder:text-slate-600 placeholder:font-normal"
                            />
                         </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 gap-4">
                      {listData.length > 0 ? (
                        listData.map((round) => {
                          const sum = round.numbers.reduce((a, b) => a + b, 0);
                          const odds = round.numbers.filter(n => n % 2 !== 0).length;
                          const highs = round.numbers.filter(n => n >= 23).length;
                          return (
                            <div key={round.round} className="glass p-6 rounded-[2rem] border border-white/5 space-y-3 sm:space-y-4 group hover:border-cyan-500/30 transition-all">
                               {/* PC: ROUND 왼쪽 + 볼 오른쪽 / 모바일: ROUND 한줄 → 볼 → 통계 */}
                               <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-3">
                                  {/* ROUND 표시 */}
                                  <div className="flex items-center gap-2 sm:flex-col sm:text-center sm:w-14 sm:shrink-0 sm:gap-0">
                                     <p className="text-[10px] font-black text-slate-500 uppercase">Round</p>
                                     <p className="text-lg font-mystic font-black text-white">{round.round}</p>
                                  </div>
                                  {/* 볼 */}
                                  <div className="flex sm:flex-wrap gap-1.5 sm:gap-2">
                                     {round.numbers.map(n => (
                                       <div key={n} className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[10px] sm:text-[11px] font-black text-white shadow-lg border-t border-white/20 ${getBallColor(n)}`}>
                                         {n}
                                       </div>
                                     ))}
                                     <div className="w-[1px] h-8 sm:h-9 bg-white/10 sm:bg-white/5 mx-0.5 sm:mx-1 shrink-0"></div>
                                     <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[10px] sm:text-[11px] font-black text-white shadow-lg border-t border-white/20 ${getBallColor(round.bonus)} ring-2 ring-white/10 ring-offset-1 sm:ring-offset-2 ring-offset-slate-950`}>
                                        {round.bonus}
                                     </div>
                                  </div>
                               </div>
                               {/* 통계 */}
                               <div className="flex items-center gap-3 flex-wrap text-[10px] font-black uppercase tracking-widest sm:pl-[4.5rem]">
                                  <div className="text-center px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                                     <p className="text-slate-500 mb-1">홀 : 짝</p>
                                     <p className="text-cyan-400">{odds} : {6 - odds}</p>
                                  </div>
                                  <div className="text-center px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                                     <p className="text-slate-500 mb-1">저 : 고</p>
                                     <p className="text-pink-400">{6 - highs} : {highs}</p>
                                  </div>
                                  <div className="text-center px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                                     <p className="text-slate-500 mb-1">총합</p>
                                     <p className="text-amber-400">{sum}</p>
                                  </div>
                               </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-24 text-center glass rounded-[3rem] border border-dashed border-white/5">
                           <p className="text-slate-600 font-black uppercase tracking-[0.4em] text-xs">해당하는 계시 기록이 없습니다</p>
                        </div>
                      )}
                   </div>

                   {hasMore && (
                     <div className="flex justify-center pt-8">
                        <button 
                          onClick={() => setPageSize(prev => prev + 10)}
                          className="px-12 py-5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:bg-white/10 hover:text-white transition-all shadow-xl"
                        >
                          계시 더 불러오기 (Next 10 Rounds)
                        </button>
                     </div>
                   )}
                </div>
              )}

              {activeTab === 'frequency' && (
                <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-500">
                   <section className="space-y-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                        <div className="space-y-1">
                          <h3 className="text-base sm:text-xl font-mystic font-black text-cyan-400 uppercase tracking-[0.1em] sm:tracking-widest whitespace-nowrap">🔥 공명 빈도 성운 (Number Heatmap)</h3>
                          <p className="text-[10px] text-slate-500 font-bold uppercase italic">붉을수록 지정된 기간 내 더 강하게 공명하고 있는 숫자입니다.</p>
                        </div>
                        <div className="flex bg-slate-950/60 p-1 rounded-xl border border-white/5">
                          <button onClick={() => setSortBy('number')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${sortBy === 'number' ? 'bg-cyan-600 text-slate-950' : 'text-slate-500'}`}>숫자순</button>
                          <button onClick={() => setSortBy('count')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${sortBy === 'count' ? 'bg-cyan-600 text-slate-950' : 'text-slate-500'}`}>출현순</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-7 gap-3">
                         {sortedNumbers.map(({ num, count }) => {
                           const max = Math.max(...stats.counts);
                           const intensity = max === 0 ? 0 : count / max;
                           return (
                             <div key={num} className="glass px-4 py-1 sm:py-6 rounded-2xl border border-white/5 flex flex-col items-center justify-center space-y-1 sm:space-y-2 group relative overflow-hidden transition-all duration-500 hover:scale-105 hover:border-cyan-500/30 sm:aspect-[3/5]">
                                <div className="absolute inset-0 bg-red-600 transition-opacity duration-1000" style={{ opacity: intensity * 0.5 }}></div>
                                <span className="relative z-10 text-lg font-black text-white">{num}</span>
                                <div className="relative z-10 flex flex-col items-center text-[9px] font-black text-slate-500 tracking-tighter leading-tight sm:hidden">
                                   <span className="whitespace-nowrap">{count}</span>
                                   <span>회</span>
                                   <span>출</span>
                                   <span>현</span>
                                </div>
                                <span className="relative z-10 text-[9px] font-black text-slate-500 uppercase tracking-tighter whitespace-nowrap hidden sm:inline">{count}회 출현</span>
                             </div>
                           );
                         })}
                      </div>
                   </section>

                   <section className="space-y-8">
                      <div className="glass p-8 rounded-[3rem] border border-white/5 space-y-6 relative">
                         <button onClick={() => setInfoModal('color_resonance')} className="absolute top-4 right-4 w-5 h-5 rounded-full border border-cyan-400/30 text-[9px] font-black text-cyan-400/60 hover:text-cyan-300 hover:border-cyan-300 flex items-center justify-center transition-all z-10">?</button>
                         <h4 className="text-xs font-black text-cyan-400 uppercase tracking-widest">색채 에너지 분포 (Color Resonance)</h4>
                         <div className="space-y-4">
                            {[
                              { label: '노랑 (1-10)', count: stats.colorCounts.yellow, color: 'bg-[#facc15]' },
                              { label: '파랑 (11-20)', count: stats.colorCounts.blue, color: 'bg-[#3b82f6]' },
                              { label: '빨강 (21-30)', count: stats.colorCounts.red, color: 'bg-[#ef4444]' },
                              { label: '회색 (31-40)', count: stats.colorCounts.gray, color: 'bg-[#94a3b8]' },
                              { label: '초록 (41-45)', count: stats.colorCounts.green, color: 'bg-[#10b981]' },
                            ].map(band => {
                              const total = (Object.values(stats.colorCounts) as number[]).reduce((a, b) => a + b, 0);
                              const percent = total === 0 ? 0 : ((band.count as number) / total) * 100;
                              return (
                                <div key={band.label} className="space-y-1.5">
                                   <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                                      <span className="text-slate-400">{band.label}</span>
                                      <span className="text-white">{band.count}개 ({percent.toFixed(1)}%)</span>
                                   </div>
                                   <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                      <div className={`h-full ${band.color} transition-all duration-1000`} style={{ width: `${percent}%` }}></div>
                                   </div>
                                </div>
                              );
                            })}
                         </div>
                      </div>
                      <div className="glass p-8 rounded-[3rem] border border-white/5 space-y-6 relative">
                         <button onClick={() => setInfoModal('silent_numbers')} className="absolute top-4 right-4 w-5 h-5 rounded-full border border-pink-400/30 text-[9px] font-black text-pink-400/60 hover:text-pink-300 hover:border-pink-300 flex items-center justify-center transition-all z-10">?</button>
                         <h4 className="text-xs font-black text-pink-400 uppercase tracking-widest">침묵의 수 (Silent Cold Numbers)</h4>
                         <div className="flex flex-wrap gap-3">
                            {stats.silentNumbers.length === 0 ? (
                              <p className="text-[10px] text-slate-500 font-bold uppercase italic">모든 숫자가 최소 1회 이상 공명했습니다.</p>
                            ) : (
                              stats.silentNumbers.map(n => (
                                <div key={n} className="w-10 h-10 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-xs font-black text-slate-500">
                                   {n}
                                </div>
                              ))
                            )}
                         </div>
                         <p className="text-[9px] text-slate-600 font-medium leading-relaxed italic">※ 지정된 기간 동안 단 한 번도 나타나지 않은 '차가운' 기운의 숫자들입니다. 이들은 언제든 폭발적인 공명을 시작할 수 있습니다.</p>
                      </div>
                   </section>
                </div>
              )}

              {activeTab === 'patterns' && (
                <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-500">
                   <h3 className="text-base sm:text-xl font-mystic font-black text-cyan-400 uppercase tracking-[0.1em] sm:tracking-widest whitespace-nowrap">☯ 파동 평형 (Wave Pattern)</h3>
                   <div className="space-y-8">
                      {/* 홀짝 통계 */}
                      <div className="glass p-8 rounded-[3rem] border border-white/5 relative flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-12">
                         <button onClick={() => setInfoModal('odd_even')} className="absolute top-4 right-4 w-5 h-5 rounded-full border border-indigo-400/30 text-[9px] font-black text-indigo-400/60 hover:text-indigo-300 hover:border-indigo-300 flex items-center justify-center transition-all z-10">?</button>
                         <div className="relative w-40 h-40 sm:w-52 sm:h-52 flex-shrink-0 mx-auto sm:mx-0">
                            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                               <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#1e293b" strokeWidth="3.5" />
                               <circle
                                cx="18" cy="18" r="15.9" fill="transparent" stroke="#6366f1" strokeWidth="3.5"
                                strokeDasharray={`${(stats.oddCounts[0] / (stats.oddCounts[0] + stats.oddCounts[1])) * 100} 100`}
                               />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                               <span className="text-2xl font-black text-white">{stats.oddCounts[0]} : {stats.oddCounts[1]}</span>
                               <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Odd : Even</span>
                            </div>
                         </div>
                         <div className="flex-1 space-y-4">
                            <div className="space-y-1">
                               <h4 className="text-sm font-black text-indigo-400 uppercase tracking-widest">음양의 파동 (Odd vs Even)</h4>
                               <p className="text-[9px] text-slate-500 font-bold uppercase">홀수와 짝수의 균형적 분포 분석</p>
                            </div>
                            <div className="flex space-x-6 sm:flex-col sm:space-x-0 sm:space-y-2 text-[10px] font-black uppercase tracking-widest">
                               <div className="flex items-center space-x-2"><div className="w-2 h-2 bg-indigo-500 rounded-full shrink-0"></div><span className="text-slate-400 whitespace-nowrap">Odd — {stats.oddCounts[0]}회</span></div>
                               <div className="flex items-center space-x-2"><div className="w-2 h-2 bg-slate-700 rounded-full shrink-0"></div><span className="text-slate-400 whitespace-nowrap">Even — {stats.oddCounts[1]}회</span></div>
                            </div>
                         </div>
                      </div>

                      {/* 고저 통계 */}
                      <div className="glass p-8 rounded-[3rem] border border-white/5 relative flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-12">
                         <button onClick={() => setInfoModal('high_low')} className="absolute top-4 right-4 w-5 h-5 rounded-full border border-pink-400/30 text-[9px] font-black text-pink-400/60 hover:text-pink-300 hover:border-pink-300 flex items-center justify-center transition-all z-10">?</button>
                         <div className="relative w-40 h-40 sm:w-52 sm:h-52 flex-shrink-0 mx-auto sm:mx-0">
                            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                               <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#1e293b" strokeWidth="3.5" />
                               <circle
                                cx="18" cy="18" r="15.9" fill="transparent" stroke="#f43f5e" strokeWidth="3.5"
                                strokeDasharray={`${(stats.highLowCounts[1] / (stats.highLowCounts[0] + stats.highLowCounts[1])) * 100} 100`}
                               />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                               <span className="text-2xl font-black text-white">{stats.highLowCounts[0]} : {stats.highLowCounts[1]}</span>
                               <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Low : High</span>
                            </div>
                         </div>
                         <div className="flex-1 space-y-4">
                            <div className="space-y-1">
                               <h4 className="text-sm font-black text-pink-400 uppercase tracking-widest">높낮이 기류 (Low vs High)</h4>
                               <p className="text-[9px] text-slate-500 font-bold uppercase">23 미만(저)과 23 이상(고)의 비율 분석</p>
                            </div>
                            <div className="flex space-x-6 sm:flex-col sm:space-x-0 sm:space-y-2 text-[10px] font-black uppercase tracking-wide sm:tracking-wider">
                               <div className="flex items-center space-x-2"><div className="w-2 h-2 bg-slate-700 rounded-full shrink-0"></div><span className="text-slate-400 whitespace-nowrap">Low (&lt;23) — {stats.highLowCounts[0]}회</span></div>
                               <div className="flex items-center space-x-2"><div className="w-2 h-2 bg-rose-500 rounded-full shrink-0"></div><span className="text-slate-400 whitespace-nowrap">High (&ge;23) — {stats.highLowCounts[1]}회</span></div>
                            </div>
                         </div>
                      </div>

                      {/* 끝수 통계 */}
                      <div className="glass p-8 rounded-[3rem] border border-white/5 space-y-6 relative">
                         <button onClick={() => setInfoModal('ending_digits')} className="absolute top-4 right-4 w-5 h-5 rounded-full border border-cyan-400/30 text-[9px] font-black text-cyan-400/60 hover:text-cyan-300 hover:border-cyan-300 flex items-center justify-center transition-all z-10">?</button>
                         <div className="space-y-1">
                            <h4 className="text-sm font-black text-cyan-400 uppercase tracking-widest">끝자리 조화 (Ending Digits)</h4>
                            <p className="text-[9px] text-slate-500 font-bold uppercase">번호의 일의 자리가 출현한 총 횟수</p>
                         </div>
                         <div className="flex items-end justify-around h-52 gap-2 px-4">
                            {stats.endDigitCounts.map((count, i) => {
                              const max = Math.max(...stats.endDigitCounts);
                              const barH = max === 0 ? 0 : Math.round((count / max) * 168);
                              return (
                                <div key={i} className="flex-1 flex flex-col items-center justify-end group">
                                   <div className="w-full bg-cyan-600/30 border-t border-cyan-400 rounded-t-lg transition-all relative" style={{ height: `${barH}px` }}>
                                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-black text-white whitespace-nowrap">{count}</span>
                                   </div>
                                   <span className="mt-2 text-[10px] font-black text-slate-500">{i}</span>
                                </div>
                              );
                            })}
                         </div>
                      </div>
                   </div>

                   {/* 마킹 패턴 시각화 (세로형 로또 슬립 디자인) */}
                   <section className="space-y-12">
                      <div className="text-center relative">
                         <button onClick={() => setInfoModal('ritual_marking')} className="absolute top-0 right-0 w-5 h-5 rounded-full border border-white/20 text-[9px] font-black text-slate-400 hover:text-white hover:border-white/50 flex items-center justify-center transition-all z-10">?</button>
                         <h4 className="text-3xl font-mystic font-black text-white uppercase tracking-widest">
                           운명 마킹 패턴<br />
                           <span className="text-xl sm:text-3xl">(Ritual Marking)</span>
                         </h4>
                         <p className="text-[10px] text-slate-500 font-bold uppercase mt-2 italic">실제 복권 규격에 맞춘 회차별 번호 분포 (최근 10회차 단위)</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-10 justify-items-center">
                        {listData.map((round) => (
                          <div key={round.round} className="w-[180px] bg-[#1e293b]/40 rounded-[1rem] border-2 border-slate-800 shadow-[0_30px_60px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-500">
                             {/* 슬립 헤더 */}
                             <div className="bg-indigo-600/80 px-4 py-3 text-center border-b border-white/10">
                                <span className="text-lg font-mystic font-black text-white">{round.round}회차</span>
                             </div>
                             
                             {/* 마킹 바디 */}
                             <div className="p-4 bg-slate-950/40 space-y-4">
                                <div className="grid grid-cols-7 gap-1">
                                   {Array.from({ length: 45 }, (_, i) => i + 1).map(n => {
                                     const isWin = round.numbers.includes(n);
                                     return (
                                       <div 
                                         key={n} 
                                         className={`aspect-[3/4] flex items-center justify-center text-[10px] font-black transition-all border
                                           ${isWin 
                                             ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.6)]' 
                                             : 'text-slate-600 border-white/5 opacity-50 hover:opacity-100 hover:text-slate-400'}`}
                                       >
                                          {n}
                                       </div>
                                     );
                                   })}
                                </div>
                                <div className="h-[1px] bg-white/5"></div>
                                <div className="flex justify-between items-center px-1">
                                   <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Bonus Resonance</span>
                                   <div className="w-6 h-6 bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[10px] font-black text-amber-500 rounded">
                                      {round.bonus}
                                   </div>
                                </div>
                             </div>
                             {/* 하단 푸터 (영수증 절취선 느낌) */}
                             <div className="h-4 bg-slate-900 border-t border-white/5 border-dashed relative">
                                <div className="absolute inset-0 flex items-center justify-around">
                                   {[...Array(12)].map((_, i) => <div key={i} className="w-1 h-1 rounded-full bg-slate-800"></div>)}
                                </div>
                             </div>
                          </div>
                        ))}
                      </div>

                      {hasMore && (
                        <div className="flex justify-center pt-10">
                           <button 
                             onClick={() => setPageSize(prev => prev + 10)}
                             className="px-12 py-5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:bg-white/10 hover:text-white transition-all shadow-xl"
                           >
                             패턴 더 불러오기 (Next 10 Slips)
                           </button>
                        </div>
                      )}
                   </section>
                </div>
              )}

              {activeTab === 'advanced' && (
                <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-500">
                   <h3 className="text-base sm:text-xl font-mystic font-black text-cyan-400 uppercase tracking-[0.1em] sm:tracking-widest whitespace-nowrap">💎 심층 구조 (Deep Structure)</h3>
                   <div className="space-y-10">
                      <div className="glass p-10 rounded-[4rem] border border-white/5 space-y-8 relative">
                         <button onClick={() => setInfoModal('ac_index')} className="absolute top-5 right-5 w-5 h-5 rounded-full border border-amber-500/30 text-[9px] font-black text-amber-500/60 hover:text-amber-400 hover:border-amber-400 flex items-center justify-center transition-all z-10">?</button>
                         <div className="space-y-1 text-center">
                            <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest">구조 복잡성 지수 (AC Index)</h4>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight italic">수치가 높을수록 당첨 빈도가 통계적으로 높습니다.</p>
                         </div>
                         <div className="flex items-end justify-between h-48 gap-1 px-4">
                            {stats.acCounts.map((count, i) => {
                              const max = Math.max(...stats.acCounts);
                              const barH = max === 0 ? 0 : Math.round((count / max) * 160);
                              const isRare = i < 7;
                              return (
                                <div key={i} className="flex-1 flex flex-col items-center justify-end group">
                                   <div className={`w-full rounded-t-lg transition-all duration-700 ${isRare ? 'bg-slate-800' : 'bg-amber-600/60 border-t border-amber-400 group-hover:bg-amber-500'}`} style={{ height: `${barH}px` }}></div>
                                   <span className="mt-2 text-[9px] font-black text-slate-500">{i}</span>
                                </div>
                              );
                            })}
                         </div>
                         <div className="p-5 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                            <p className="text-[10px] text-slate-400 leading-relaxed italic text-center">"AC 7~10 지대는 천운이 집중적으로 투하되는 성지입니다. 복잡한 불규칙성이 실질적인 당첨 기운을 품고 있습니다."</p>
                         </div>
                      </div>

                      <div className="glass p-10 rounded-[4rem] border border-white/5 space-y-8 relative">
                         <button onClick={() => setInfoModal('sum_orbit')} className="absolute top-5 right-5 w-5 h-5 rounded-full border border-emerald-400/30 text-[9px] font-black text-emerald-400/60 hover:text-emerald-300 hover:border-emerald-300 flex items-center justify-center transition-all z-10">?</button>
                         <div className="space-y-1 text-center">
                            <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest">총합 에너지 궤적 (Sum Orbit)</h4>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight italic">기운이 가장 많이 뭉쳐있는 합계 구간을 확인하십시오.</p>
                         </div>
                         <div className="space-y-5 pt-4">
                            {Object.entries(stats.sumRanges).map(([range, count]) => {
                              const total = statsData.length;
                              const percent = total === 0 ? 0 : ((count as number) / total) * 100;
                              const isCommon = range === '141-180' || range === '101-140';
                              return (
                                <div key={range} className="space-y-1.5">
                                   <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                                      <span className={isCommon ? 'text-emerald-400' : 'text-slate-500'}>{range}</span>
                                      <span className="text-white">{count}회 ({percent.toFixed(1)}%)</span>
                                   </div>
                                   <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                      <div className={`h-full transition-all duration-1000 ${isCommon ? 'bg-emerald-500' : 'bg-slate-700'}`} style={{ width: `${percent}%` }}></div>
                                   </div>
                                </div>
                              );
                            })}
                         </div>
                      </div>
                   </div>

                   <section className="glass p-10 rounded-[4rem] border border-white/5 text-center space-y-8 relative">
                      <button onClick={() => setInfoModal('prime_resonance')} className="absolute top-5 right-5 w-5 h-5 rounded-full border border-cyan-400/30 text-[9px] font-black text-cyan-400/60 hover:text-cyan-300 hover:border-cyan-300 flex items-center justify-center transition-all z-10">?</button>
                      <div className="space-y-2">
                         <h4 className="text-xl font-mystic font-black text-cyan-400 uppercase tracking-widest">소수 공명 분석 (Prime Resonance)</h4>
                         <p className="text-[10px] text-slate-500 font-bold uppercase italic">수학적 근본을 지닌 소수(2, 3, 5, 7, 11...)의 출현 빈도입니다.</p>
                      </div>
                      <div className="flex flex-col md:flex-row justify-center items-center space-y-8 md:space-y-0 md:space-x-12">
                         <div className="relative w-32 h-32">
                            <div className="absolute inset-0 border-8 border-white/5 rounded-full"></div>
                            <div className="absolute inset-0 border-8 border-cyan-500 rounded-full animate-pulse" style={{ clipPath: `inset(0 0 0 0 round 50%)`, opacity: 0.2 }}></div>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                               <p className="text-3xl font-black text-white">{stats.primeAppearanceCount}</p>
                               <p className="text-[8px] text-slate-500 font-black uppercase">Total Primes</p>
                            </div>
                         </div>
                         <div className="text-left max-w-sm space-y-3">
                            <p className="text-sm text-slate-300 leading-relaxed italic">"지정된 기간 동안 총 {stats.primeAppearanceCount}개의 소수 기운이 당첨 번호에 공명했습니다. 평균적으로 회차당 약 {(stats.primeAppearanceCount / statsData.length).toFixed(1)}개의 소수가 포함되는 경향을 보입니다."</p>
                            <p className="text-[9px] text-cyan-500/70 font-black uppercase tracking-widest">Prime Numbers: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43</p>
                         </div>
                      </div>
                   </section>
                </div>
              )}

           </div>
        </main>
      </div>

      {infoModal && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-6" onClick={() => setInfoModal(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
          <div className="relative glass rounded-[3rem] border border-white/10 p-10 max-w-sm w-full space-y-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-black text-cyan-400 uppercase tracking-widest leading-relaxed">
              {LAB_INFO[infoModal]?.title}
            </h3>
            <div className="space-y-3">
              {LAB_INFO[infoModal]?.body.split('\n\n').map((para, i) => (
                <p key={i} className="text-[11px] text-slate-300 leading-relaxed">
                  {para.split('\n').map((line, j, arr) => (
                    <React.Fragment key={j}>{line}{j < arr.length - 1 && <br />}</React.Fragment>
                  ))}
                </p>
              ))}
            </div>
            <button
              onClick={() => setInfoModal(null)}
              className="w-full py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(6, 182, 212, 0.3); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default MysticAnalysisLab;
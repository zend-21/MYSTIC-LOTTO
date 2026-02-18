
import React, { useState, useEffect, useRef } from 'react';
import { FortuneResult } from '../types';

interface LottoGeneratorProps {
  result: FortuneResult | null;
  loading: boolean;
  onGenerate: () => void;
  onSlotGenerate: (numbers: number[]) => void;
  onSave?: (result: FortuneResult) => void;
  onReset?: () => void;
  hasExtractedToday: boolean;
}

const SacredMandala = () => (
  <svg viewBox="0 0 100 100" className="w-24 h-24 text-amber-500/50 drop-shadow-[0_0_15px_rgba(251,191,36,0.3)] animate-pulse-slow">
    <defs>
      <linearGradient id="mandalaGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fde68a" />
        <stop offset="50%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#92400e" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="48" fill="none" stroke="url(#mandalaGold)" strokeWidth="0.5" strokeDasharray="2 2" />
    <circle cx="50" cy="50" r="45" fill="none" stroke="url(#mandalaGold)" strokeWidth="0.2" />
    <g className="origin-center animate-spin-extremely-slow">
      {[...Array(12)].map((_, i) => (
        <path 
          key={i}
          d="M50 50 Q60 20 50 10 Q40 20 50 50" 
          fill="url(#mandalaGold)" 
          fillOpacity="0.1" 
          stroke="url(#mandalaGold)" 
          strokeWidth="0.3"
          transform={`rotate(${i * 30} 50 50)`}
        />
      ))}
    </g>
    <path d="M50 20L58 42L80 50L58 58L50 80L42 58L20 50L42 42Z" fill="url(#mandalaGold)" fillOpacity="0.2" stroke="url(#mandalaGold)" strokeWidth="0.5" />
    <circle cx="50" cy="50" r="6" fill="url(#mandalaGold)" className="animate-pulse" />
    <circle cx="50" cy="50" r="2" fill="white" />
  </svg>
);

const LottoGenerator: React.FC<LottoGeneratorProps> = ({ result, loading, onGenerate, onSlotGenerate, onSave, onReset, hasExtractedToday }) => {
  const [genMode, setGenMode] = useState<'divine' | 'slots'>('divine');
  const [stopOrderMode, setStopOrderMode] = useState<'sequential' | 'random'>('sequential');
  const [gameCount, setGameCount] = useState<number>(1);
  const [currentGameIdx, setCurrentGameIdx] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [reels, setReels] = useState<(number | null)[]>([null, null, null, null, null, null]);
  const [stoppedIndices, setStoppedIndices] = useState<number[]>([]);
  const [ritualStep, setRitualStep] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showFullReason, setShowFullReason] = useState(false);
  const [slotResults, setSlotResults] = useState<number[][]>([]);
  const [allGamesFinished, setAllGamesFinished] = useState(false);

  const ritualMessages = [
    "근본 사주의 강물을 살피는 중...",
    "찰나의 타로가 운명의 문을 두드리는 중...",
    "지금 이 순간, 당신과 공명하는 숫자를 고정합니다..."
  ];

  const spinInterval = useRef<any>(null);

  useEffect(() => {
    let interval: any;
    if (loading) {
      setLoadingProgress(0);
      interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 95) return prev;
          return prev + Math.random() * 8;
        });
      }, 400);
    } else {
      setLoadingProgress(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (isSpinning) {
      spinInterval.current = setInterval(() => {
        setReels(prev => {
          const next = [...prev];
          for (let i = 0; i < 6; i++) {
            if (!stoppedIndices.includes(i)) {
              next[i] = Math.floor(Math.random() * 45) + 1;
            }
          }
          return next;
        });
      }, 60);
    } else {
      clearInterval(spinInterval.current);
    }
    return () => clearInterval(spinInterval.current);
  }, [isSpinning, stoppedIndices]);

  const generateOneSet = () => {
    const gameNums: number[] = [];
    while(gameNums.length < 6) {
      const r = Math.floor(Math.random() * 45) + 1;
      if(!gameNums.includes(r)) gameNums.push(r);
    }
    return gameNums.sort((a,b) => a - b);
  };

  const performStop = (gameNums: number[], gameIndex: number) => {
    let revealSequence = [0, 1, 2, 3, 4, 5];
    if (stopOrderMode === 'random') revealSequence = [...revealSequence].sort(() => Math.random() - 0.5);
    
    let sequenceStep = 0;
    const interval = setInterval(() => {
      if (sequenceStep >= 6) { 
        clearInterval(interval); 
        return; 
      }
      const targetIndex = revealSequence[sequenceStep];
      setReels(prev => {
        const next = [...prev];
        next[targetIndex] = gameNums[targetIndex];
        return next;
      });
      setStoppedIndices(prev => [...prev, targetIndex]);
      sequenceStep++;

      if (sequenceStep === 6) { 
        clearInterval(interval);
        setSlotResults(prev => [...prev, gameNums]);
        onSlotGenerate(gameNums);
        
        const nextIdx = gameIndex + 1;
        if (nextIdx < gameCount) {
          setTimeout(() => {
            setCurrentGameIdx(nextIdx);
            setStoppedIndices([]);
            setReels([1, 1, 1, 1, 1, 1]);
            setIsSpinning(true);
            
            setTimeout(() => {
              setIsSpinning(false);
              const nextGameNums = generateOneSet();
              performStop(nextGameNums, nextIdx);
            }, 1000);
          }, 1000);
        } else {
          setIsSpinning(false);
          setAllGamesFinished(true);
        }
      }
    }, 150);
  };

  const handleStartSpin = () => {
    onReset?.();
    setSlotResults([]);
    setCurrentGameIdx(0);
    setAllGamesFinished(false);
    setIsSaved(false);
    setStoppedIndices([]);
    setReels([1, 1, 1, 1, 1, 1]);
    setIsSpinning(true);
  };

  const handleStopSpin = () => {
    if (!isSpinning || stoppedIndices.length > 0) return;
    setIsSpinning(false);
    const firstGameNums = generateOneSet();
    performStop(firstGameNums, 0);
  };

  const handleShuffle = () => {
    setIsShuffling(true); 
    setIsSaved(false); 
    setStoppedIndices([]); 
    setSlotResults([]);
    setCurrentGameIdx(0);
    setAllGamesFinished(false);
    onReset?.(); 
    setTimeout(() => { setIsShuffling(false); setReels([null, null, null, null, null, null]); }, 800);
  };

  const copyToClipboard = () => {
    if (!result) return;
    const text = result.luckyNumbers.join(', ');
    navigator.clipboard.writeText(text);
    alert('천기가 복사되었습니다: ' + text);
  };

  useEffect(() => {
    let interval: any;
    if (loading) {
      setRitualStep(0);
      interval = setInterval(() => { setRitualStep(prev => (prev + 1) % ritualMessages.length); }, 1500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  return (
    <div className="space-y-12">
      {showFullReason && result && genMode === 'divine' && (
        <div className="fixed inset-0 z-[8000] flex items-center justify-center p-6 backdrop-blur-md bg-black/80 animate-in fade-in duration-300">
           <div className="glass p-10 rounded-[3rem] border border-indigo-500/30 w-full max-w-4xl shadow-[0_50px_100px_rgba(0,0,0,1)] space-y-8 relative overflow-hidden flex flex-col h-[90vh]">
              <button onClick={() => setShowFullReason(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors text-2xl z-10">✕</button>
              <div className="text-center space-y-2 shrink-0">
                 <h3 className="text-2xl font-mystic font-black text-indigo-400 tracking-widest uppercase leading-none">오늘의 심층 운명 보고서</h3>
                 <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.5em]">Premium Cosmic Synthesis Report</p>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-4 custom-scroll space-y-12 pb-10">
                 <div className="p-8 bg-indigo-500/5 rounded-3xl border border-indigo-500/20 text-center">
                    <p className="text-sm text-indigo-200 leading-relaxed font-bold italic">"사주, 타로, 점성술의 에너지가 당신의 탄생 기운과 결합되어 도출된 궁극의 계시입니다."</p>
                 </div>

                 {/* 행운의 수 상세 설명 섹션 - 핵심 숫자 2개만 표시 */}
                 <section className="space-y-6">
                    <div className="flex items-center space-x-4">
                       <h4 className="text-amber-500 font-black text-xl uppercase tracking-widest">💎 핵심 행운의 수(Core) 풀이</h4>
                       <div className="h-[1px] flex-1 bg-amber-500/20"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       {result.numberExplanations?.filter(ex => result.coreNumbers.includes(ex.number)).map((item, idx) => (
                          <div key={idx} className="p-8 bg-white/5 rounded-3xl border-2 border-amber-500/30 space-y-4 relative overflow-hidden shadow-2xl">
                             <div className="absolute -top-4 -right-4 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl"></div>
                             <div className="flex items-center space-x-4">
                                <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-200 to-amber-600 text-slate-950 flex items-center justify-center font-black text-2xl shadow-xl">{item.number}</span>
                                <div>
                                   <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Resonance frequency</p>
                                   <p className="text-[10px] font-bold text-slate-500 uppercase">Universal Identifier</p>
                                </div>
                             </div>
                             <p className="text-[15px] text-slate-200 leading-[1.8] italic font-medium">"{item.explanation}"</p>
                          </div>
                       ))}
                    </div>
                 </section>

                 {/* 심층 분석 섹션들 */}
                 <div className="grid grid-cols-1 gap-8">
                    <section className="p-8 bg-black/40 rounded-[2.5rem] border border-white/5 space-y-4">
                       <div className="flex items-center space-x-3 text-indigo-400">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19"/></svg>
                          <h4 className="font-black text-lg uppercase tracking-wider">☯️ 명리학(사주) 심층 분석</h4>
                       </div>
                       <p className="text-sm text-slate-300 leading-loose whitespace-pre-wrap italic">{result.sajuDeepDive}</p>
                    </section>

                    <section className="p-8 bg-black/40 rounded-[2.5rem] border border-white/5 space-y-4">
                       <div className="flex items-center space-x-3 text-pink-400">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="3" width="16" height="18" rx="2"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="16" y2="15"/></svg>
                          <h4 className="font-black text-lg uppercase tracking-wider">🃏 타로 아르카나 심층 분석</h4>
                       </div>
                       <p className="text-sm text-slate-300 leading-loose whitespace-pre-wrap italic">{result.tarotDeepDive}</p>
                    </section>

                    <section className="p-8 bg-black/40 rounded-[2.5rem] border border-white/5 space-y-4">
                       <div className="flex items-center space-x-3 text-cyan-400">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/><path d="M2 12h20"/></svg>
                          <h4 className="font-black text-lg uppercase tracking-wider">🪐 우주 점성술 심층 분석</h4>
                       </div>
                       <p className="text-sm text-slate-300 leading-loose whitespace-pre-wrap italic">{result.astrologyDeepDive}</p>
                    </section>
                 </div>

                 {/* 기존 운세 섹션들 */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <section className="space-y-3 p-8 bg-slate-900 rounded-3xl border border-white/5">
                       <h4 className="text-amber-400 font-black text-sm uppercase tracking-wider flex items-center space-x-2"><span>🌟</span><span>종합운 해설</span></h4>
                       <p className="text-[13px] text-indigo-50/90 leading-relaxed italic">{result.overallFortune}</p>
                    </section>
                    <section className="space-y-3 p-8 bg-slate-900 rounded-3xl border border-white/5">
                       <h4 className="text-yellow-500 font-black text-sm uppercase tracking-wider flex items-center space-x-2"><span>💰</span><span>재물운 해설</span></h4>
                       <p className="text-[13px] text-indigo-50/90 leading-relaxed italic">{result.wealthFortune}</p>
                    </section>
                    <section className="space-y-3 p-8 bg-slate-900 rounded-3xl border border-white/5">
                       <h4 className="text-pink-500 font-black text-sm uppercase tracking-wider flex items-center space-x-2"><span>❤️</span><span>애정운 해설</span></h4>
                       <p className="text-[13px] text-indigo-50/90 leading-relaxed italic">{result.loveFortune}</p>
                    </section>
                    <section className="space-y-3 p-8 bg-slate-900 rounded-3xl border border-white/5">
                       <h4 className="text-emerald-500 font-black text-sm uppercase tracking-wider flex items-center space-x-2"><span>🌿</span><span>건강운 해설</span></h4>
                       <p className="text-[13px] text-indigo-50/90 leading-relaxed italic">{result.healthFortune}</p>
                    </section>
                 </div>
                 
                 <section className="p-8 bg-indigo-600/10 rounded-[2.5rem] border border-indigo-500/30">
                    <h4 className="text-indigo-400 font-black text-sm uppercase tracking-wider mb-3">📜 천상의 핵심 전언</h4>
                    <p className="text-lg text-white leading-loose italic font-bold text-center">"{result.recommendationReason}"</p>
                 </section>
              </div>
              <button onClick={() => setShowFullReason(false)} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl text-sm uppercase tracking-widest hover:bg-indigo-500 transition-all shrink-0">계시 기록 완료</button>
           </div>
        </div>
      )}

      <div className="flex flex-col items-center space-y-6">
        {/* 알고리즘 신뢰도 향상을 위한 구체적 설명 텍스트 추가 */}
        <div className="h-6 flex items-center">
          {genMode === 'divine' ? (
            <p className="text-[10px] font-bold text-indigo-400 animate-in fade-in slide-in-from-bottom-2 uppercase tracking-[0.2em] text-center max-w-sm">
              AI 통합 분석: 사주·타로·점성술 기운을 천상의 고차원 추론 엔진이 연산하여 도출
            </p>
          ) : (
            <p className="text-[10px] font-bold text-yellow-500 animate-in fade-in slide-in-from-bottom-2 uppercase tracking-[0.2em] text-center max-w-sm">
              순수 확률 추출: 인위적 필터링 없이 당신이 멈춘 찰나의 물리 난수를 그대로 고정
            </p>
          )}
        </div>

        <div className="bg-slate-950/60 p-1 rounded-2xl border border-white/5 flex">
          <button onClick={() => { setGenMode('divine'); onReset?.(); setSlotResults([]); }} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${genMode === 'divine' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>Divine Resonance (오늘의 천기)</button>
          <button onClick={() => { setGenMode('slots'); onReset?.(); }} className={`relative px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${genMode === 'slots' ? 'bg-yellow-600 text-slate-950 shadow-lg' : 'text-slate-500'}`}>
            Celestial Reels (행운 카드)
            <span className="absolute -top-2 -right-5 bg-gradient-to-br from-[#FFD700] via-[#FDB931] to-[#9E7E38] text-slate-950 text-[8px] font-black px-3 py-0.5 rounded-sm shadow-[0_8px_16px_rgba(0,0,0,0.6)] rotate-[20deg] border border-white/20 tracking-widest overflow-hidden z-30 uppercase">
              <span className="relative z-10 drop-shadow-sm">FREE</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent -translate-x-full animate-ribbon-shine"></div>
            </span>
          </button>
        </div>
        
        {genMode === 'slots' && (
          <div className="flex flex-col items-center space-y-4 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center space-x-3 bg-white/5 px-4 py-2 rounded-full border border-white/5">
              {[1, 2, 3, 4, 5].map(g => (
                <button 
                  key={g} 
                  onClick={() => setGameCount(g)} 
                  disabled={isSpinning || (stoppedIndices.length > 0 && !allGamesFinished)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${gameCount === g ? 'bg-yellow-500 text-slate-950 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {g}G
                </button>
              ))}
            </div>
            <div className="flex items-center space-x-3 bg-white/5 px-4 py-2 rounded-full border border-white/5">
              <span className={`text-[9px] font-black tracking-widest uppercase transition-colors ${stopOrderMode === 'sequential' ? 'text-yellow-500' : 'text-slate-500'}`}>Sequential Stop</span>
              <button onClick={() => setStopOrderMode(prev => prev === 'sequential' ? 'random' : 'sequential')} className="relative w-10 h-5 rounded-full bg-slate-800 transition-colors focus:outline-none overflow-hidden">
                <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform duration-300 ${stopOrderMode === 'random' ? 'translate-x-5 bg-yellow-400' : 'translate-x-0'}`}></div>
              </button>
              <span className={`text-[9px] font-black tracking-widest uppercase transition-colors ${stopOrderMode === 'random' ? 'text-yellow-500' : 'text-slate-500'}`}>Chaotic Reveal</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center">
        {genMode === 'divine' ? (
          <div className="flex flex-col items-center w-full max-w-md">
            {!loading && (
              <button 
                disabled={hasExtractedToday}
                onClick={() => { if(!hasExtractedToday) { onGenerate(); setIsSaved(false); } }} 
                className={`relative px-12 py-6 bg-gradient-to-b from-slate-800 to-slate-950 border-2 rounded-[2rem] font-black text-xl transition-all shadow-2xl group overflow-hidden ${hasExtractedToday ? 'border-slate-700 opacity-60 cursor-not-allowed' : 'border-indigo-500/50 hover:border-indigo-400 hover:text-white text-indigo-100'}`}
              >
                <span className="relative z-10 tracking-[0.1em]">
                  {hasExtractedToday ? (
                    <div className="flex flex-col items-center">
                      <span className="text-lg">금일 기운 받음</span>
                      <span className="text-[10px] opacity-40 mt-1 font-bold tracking-widest">(자정 이후 가능)</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <span className="text-lg">천기누설: 번호 추출</span>
                      <span className="text-xs opacity-60 mt-1 font-bold tracking-widest">(+1,000 L)</span>
                    </div>
                  )}
                </span>
                {!hasExtractedToday && (
                  <div className="absolute inset-0 bg-indigo-600/20 transform scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom duration-500"></div>
                )}
              </button>
            )}
            {loading && (
              <div className="relative flex flex-col items-center py-16 w-full space-y-8 animate-in fade-in duration-500">
                <div className="relative">
                  <div className="w-24 h-24 border-4 border-indigo-500/20 rounded-full shadow-[0_0_30px_rgba(99,102,241,0.2)]"></div>
                  <div className="absolute inset-0 border-t-4 border-indigo-500 rounded-full animate-spin"></div>
                </div>
                <div className="w-full space-y-6">
                  <p className="text-xl font-black text-white tracking-[0.2em] animate-pulse text-center">{ritualMessages[ritualStep]}</p>
                  <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-white/5 p-[1px] shadow-inner">
                     <div className="h-full bg-gradient-to-r from-indigo-900 via-indigo-500 to-indigo-900 transition-all duration-300 ease-out shadow-[0_0_15px_rgba(99,102,241,0.8)]" style={{ width: `${loadingProgress}%` }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full flex flex-col items-center space-y-12 animate-in zoom-in-95 duration-700">
            <div className="relative flex flex-col items-center">
               <div className="absolute -top-[43px] px-6 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-full text-[10px] font-black text-yellow-500 uppercase tracking-widest animate-pulse z-10">
                  {isSpinning || (stoppedIndices.length > 0 && !allGamesFinished) ? `GAME ${currentGameIdx + 1} RESONATING...` : `READY FOR FATE`}
               </div>
               <div className="grid grid-cols-6 gap-3 sm:gap-4 md:gap-5 w-full max-w-4xl px-4 min-h-[160px]">
                {reels.map((val, idx) => {
                  const showBack = val === null || isShuffling;
                  const isStopped = stoppedIndices.includes(idx);
                  return (
                    <div key={`reel-card-${idx}`} className="perspective-1000 aspect-[2/3.3]">
                      <div className={`relative w-full h-full transition-all duration-700 preserve-3d ${!showBack ? 'rotate-y-0' : 'rotate-y-180'}`}>
                        <div className="absolute inset-0 backface-hidden rounded-2xl border-2 border-amber-300 bg-[#FFFCE6] flex items-center justify-center shadow-[0_0_25px_rgba(251,191,36,0.3)] z-20 overflow-hidden">
                           <div className={`text-3xl sm:text-4xl md:text-5xl font-black transition-all select-none ${isStopped ? 'text-yellow-600 animate-bounce-short' : 'text-[#1A0F05]'}`}>{val}</div>
                        </div>
                        <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-2xl border-2 border-slate-800 bg-slate-950 flex items-center justify-center overflow-hidden">
                           <SacredMandala />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-6">
              {!allGamesFinished ? (
                <>
                  <button 
                    disabled={isSpinning || isShuffling || (stoppedIndices.length > 0)} 
                    onClick={handleStartSpin} 
                    className={`px-14 py-6 rounded-[2.5rem] font-black tracking-widest text-xl transition-all shadow-2xl border-b-4 ${(isSpinning || isShuffling || stoppedIndices.length > 0) ? 'bg-slate-800 text-slate-500 border-slate-900 cursor-not-allowed opacity-50' : 'bg-yellow-600 text-slate-950 border-yellow-800 hover:scale-105 active:scale-95'}`}
                  >
                    {isShuffling ? '운명 정렬 중...' : '천운 돌리기'}
                  </button>
                  <button 
                    disabled={!isSpinning || stoppedIndices.length > 0} 
                    onClick={handleStopSpin} 
                    className={`px-14 py-6 rounded-[2.5rem] font-black tracking-widest text-xl border-2 transition-all ${(!isSpinning || stoppedIndices.length > 0) ? 'border-slate-800 text-slate-700 pointer-events-none opacity-50' : 'border-red-500 bg-red-500/10 text-red-500 animate-pulse hover:bg-red-500/20'}`}
                  >
                    멈춤! (STOP)
                  </button>
                </>
              ) : (
                <button onClick={handleShuffle} className="px-20 py-6 rounded-[2.5rem] font-black tracking-widest text-xl bg-indigo-600 text-white shadow-2xl hover:scale-105 active:scale-95 transition-all border-b-4 border-indigo-900">새로고침 (SHUFFLE)</button>
              )}
            </div>
          </div>
        )}
      </div>

      {((result && genMode === 'divine') || (slotResults.length > 0 && genMode === 'slots')) && !loading && !isShuffling && (
        <div className="space-y-12 animate-in fade-in zoom-in duration-1000">
          {genMode === 'divine' ? (
            <div className="relative glass p-10 rounded-[3rem] border border-yellow-500/30 max-w-5xl mx-auto shadow-2xl space-y-12">
                 <h4 className="text-center text-[10px] font-black text-yellow-500 tracking-[0.5em] uppercase mb-8">Fate Consolidated</h4>
                 
                 {/* 번호 시각화 섹션 */}
                 <div className="flex justify-center flex-wrap gap-4">
                   {result?.luckyNumbers.map((num, i) => (
                     <div key={`final-ball-${i}`} className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-white font-black text-xl sm:text-2xl border-t-2 border-white/20 shadow-lg ${result.coreNumbers.includes(num) ? 'bg-gradient-to-br from-yellow-300 to-amber-600 ring-4 ring-yellow-400 ring-offset-4 ring-offset-[#020617]' : 'bg-slate-800'}`}>
                       {num}
                     </div>
                   ))}
                 </div>

                 {/* 행운의 수 섹션 별도 추가 - 핵심 숫자 2개만 */}
                 <div className="space-y-6 pt-10 border-t border-white/5">
                    <div className="flex flex-col items-center">
                       <h5 className="text-lg font-black text-amber-500 uppercase tracking-widest mb-6">💎 오늘의 핵심 행운의 수 개별 풀이</h5>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                          {result.numberExplanations?.filter(item => result.coreNumbers.includes(item.number)).map((item, idx) => (
                             <div key={idx} className="p-7 bg-white/5 rounded-[2rem] border-2 border-amber-500/20 hover:border-amber-500/50 transition-all shadow-xl space-y-3">
                                <p className="text-3xl font-black text-amber-400 mb-2">#{item.number}</p>
                                <p className="text-[13px] text-slate-300 leading-relaxed italic font-medium">"{item.explanation}"</p>
                             </div>
                          ))}
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                       <div className="flex items-center space-x-2"><span className="text-amber-400">🌟</span><span className="text-[10px] font-black text-amber-400 tracking-widest uppercase">Deep Overall Fortune</span></div>
                       <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 italic">"{result?.overallFortune}"</p>
                    </div>
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                       <div className="flex items-center space-x-2"><span className="text-yellow-500">💰</span><span className="text-[10px] font-black text-yellow-500 tracking-widest uppercase">Deep Wealth Insight</span></div>
                       <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 italic">"{result?.wealthFortune}"</p>
                    </div>
                 </div>

                 <div className="flex justify-center flex-col items-center space-y-6">
                    <button onClick={() => setShowFullReason(true)} className="px-10 py-5 bg-indigo-600/20 border border-indigo-500/50 rounded-2xl text-[12px] font-black text-indigo-200 hover:bg-indigo-600 hover:text-white transition-all uppercase tracking-[0.2em] flex items-center space-x-3 group shadow-xl">
                      <span>심층 운명 계시 리포트 전체 보기</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </button>
                    <button onClick={copyToClipboard} className="flex items-center space-x-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-xs font-black uppercase tracking-widest text-slate-300">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                        <span>천기 복사</span>
                    </button>
                 </div>
              </div>
          ) : (
            <div className="flex flex-col items-center w-full max-w-4xl mx-auto space-y-8 pb-12">
               <div className="text-center space-y-2 mb-4">
                  <h3 className="text-2xl font-mystic font-black text-yellow-500 uppercase tracking-widest">추출된 찰나적 운명의 수</h3>
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.4em]">Celestial Reels Results History</p>
               </div>
               <div className="w-full space-y-4">
                  {slotResults.map((game, gIdx) => (
                    <div key={`slot-game-${gIdx}`} className="glass p-5 rounded-[2rem] border border-yellow-500/20 flex items-center justify-between animate-in fade-in slide-in-from-bottom-4" style={{animationDelay: `${gIdx * 100}ms`}}>
                       <div className="flex items-center space-x-6">
                          <span className="text-[10px] font-black text-yellow-500 uppercase px-4 py-2 bg-yellow-500/10 rounded-full border border-yellow-500/20 min-w-[80px] text-center">GAME {gIdx + 1}</span>
                          <div className="flex gap-2 sm:gap-3">
                             {game.map((num, nIdx) => (
                               <div key={nIdx} className="w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center bg-slate-800 border-t border-white/10 text-white font-black text-sm sm:text-base shadow-lg">
                                 {num}
                               </div>
                             ))}
                          </div>
                       </div>
                       <button 
                         onClick={() => { 
                           navigator.clipboard.writeText(game.join(', ')); 
                           alert(`${gIdx + 1}번째 게임 번호가 복사되었습니다.`); 
                         }} 
                         className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 hover:text-yellow-500 hover:bg-white/10 transition-all border border-white/5"
                        >
                         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                       </button>
                    </div>
                  ))}
               </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .rotate-y-0 { transform: rotateY(0deg); }
        @keyframes spin-extremely-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-extremely-slow { animation: spin-extremely-slow 60s linear infinite; }
        @keyframes pulse-slow { 0%, 100% { opacity: 0.3; transform: scale(0.95); } 50% { opacity: 0.6; transform: scale(1.05); } }
        .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
        @keyframes bounce-short { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
        .animate-bounce-short { animation: bounce-short 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        @keyframes ribbon-shine {
          0% { transform: translateX(-150%) skewX(-30deg); }
          20% { transform: translateX(150%) skewX(-30deg); }
          100% { transform: translateX(150%) skewX(-30deg); }
        }
        .animate-ribbon-shine { animation: ribbon-shine 4s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
      `}</style>
    </div>
  );
};

export default LottoGenerator;

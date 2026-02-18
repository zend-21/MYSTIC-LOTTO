
import React, { useState, useEffect, useRef } from 'react';
import { COST_ANNUAL } from '../types';

interface EternalRitualProps {
  onComplete: () => void;
  onUnlockRequest: () => void;
  isUnlocked: boolean;
  points: number;
  loading: boolean;
}

const EternalRitual: React.FC<EternalRitualProps> = ({ onComplete, onUnlockRequest, isUnlocked, points, loading }) => {
  const [pressProgress, setPressProgress] = useState(0);
  const [isPressing, setIsPressing] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    let interval: any;
    if (loading) {
      setLoadingProgress(0);
      interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 98) return prev;
          const jump = Math.random() * 5;
          return Math.min(prev + jump, 98);
        });
      }, 300);
    } else {
      setLoadingProgress(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (loading || hasCompletedRef.current || !isUnlocked) return;

    const interval = setInterval(() => {
      setPressProgress(prev => {
        if (isPressing) {
          const next = prev + 1;
          if (next >= 100) {
            if (!hasCompletedRef.current) {
              hasCompletedRef.current = true;
              onComplete();
            }
            return 100;
          }
          return next;
        } else {
          return Math.max(prev - 2, 0);
        }
      });
    }, 40);

    return () => clearInterval(interval);
  }, [isPressing, loading, onComplete, isUnlocked]);

  const startRitual = () => {
    if (loading || hasCompletedRef.current || !isUnlocked) return;
    setIsPressing(true);
  };

  const stopRitual = () => {
    setIsPressing(false);
  };

  const handleUnlockClick = () => {
    setShowConfirmModal(true);
  };

  const confirmUnlock = () => {
    setShowConfirmModal(false);
    onUnlockRequest();
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="flex flex-col items-center justify-center py-6 px-4 space-y-12 animate-in fade-in zoom-in duration-1000 w-full max-w-2xl mx-auto">
      {/* 결제 확인 모달 */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowConfirmModal(false)}></div>
          <div className="relative glass p-10 rounded-[3rem] border border-amber-500/30 w-full max-w-sm text-center animate-in zoom-in-95 duration-300">
             <div className="text-4xl mb-6">🕯️</div>
             <h3 className="text-2xl font-mystic font-black text-amber-500 mb-2 uppercase tracking-widest">Ritual Permission</h3>
             <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-8 italic leading-relaxed">
               {COST_ANNUAL.toLocaleString()} 루멘(L)을 소모하여<br/>"{currentYear}년 올해의 운명"을 각인하시겠습니까?<br/>
               <span className="text-[10px] text-amber-600/70 mt-2 block">※ 연간 단 1회만 거행 가능한 신성한 의식입니다.</span>
             </p>
             <div className="space-y-3">
                <button onClick={confirmUnlock} className="w-full py-5 bg-amber-600 text-slate-950 font-black rounded-2xl shadow-xl uppercase tracking-widest text-sm hover:bg-amber-500 transition-all">의식 시작 (Unlock)</button>
                <button onClick={() => setShowConfirmModal(false)} className="w-full py-4 bg-white/5 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-[10px] hover:bg-white/10">돌아가기</button>
             </div>
          </div>
        </div>
      )}

      <div className="text-center space-y-2">
        <h3 className="text-xl md:text-2xl font-black text-amber-400 tracking-tight animate-pulse">{currentYear}년 올해의 운명을 받으십시오</h3>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">Essential Instructions for Annual Destiny Imprinting</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        <div className="glass p-5 rounded-2xl border-amber-500/10">
          <h4 className="text-[10px] font-black text-amber-500 tracking-widest uppercase mb-2">01. 연도별 천명수</h4>
          <p className="text-[11px] text-slate-400 leading-relaxed italic">사주의 원국과 해당 연도의 세운을 분석하여 추출되는 한 해 동안의 수호수입니다.</p>
        </div>
        <div className="glass p-5 rounded-2xl border-amber-500/10">
          <h4 className="text-[10px] font-black text-amber-500 tracking-widest uppercase mb-2">02. 인터랙티브 동기화</h4>
          <p className="text-[11px] text-slate-400 leading-relaxed italic">인장을 길게 누르는 동안 당신의 영적 파동이 현재 연도의 우주 에너지와 동조됩니다.</p>
        </div>
        <div className="glass p-5 rounded-2xl border-amber-500/10">
          <h4 className="text-[10px] font-black text-amber-500 tracking-widest uppercase mb-2">03. 매년 1회 갱신</h4>
          <p className="text-[11px] text-slate-400 leading-relaxed italic">이 번호는 매년 1월 1일이 지나면 새로운 기운을 담은 번호로 갱신하여 발급받을 수 있습니다.</p>
        </div>
        <div className="glass p-5 rounded-2xl border-amber-500/10">
          <h4 className="text-[10px] font-black text-amber-500 tracking-widest uppercase mb-2">04. 고정밀 AI 분석</h4>
          <p className="text-[11px] text-slate-400 leading-relaxed italic">Gemini Pro 모델이 올해의 간지와 당신의 사주를 대조하여 가장 정교한 분석을 수행합니다.</p>
        </div>
      </div>

      <div className="relative group select-none touch-none w-full max-w-[320px] aspect-square flex items-center justify-center">
        <svg viewBox="-20 -20 296 296" className="w-full h-full -rotate-90 overflow-visible">
          <circle cx="128" cy="128" r="120" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
          <circle 
            cx="128" cy="128" r="120" stroke="currentColor" strokeWidth="6" fill="transparent" 
            strokeDasharray={2 * Math.PI * 120}
            strokeDashoffset={2 * Math.PI * 120 * (1 - pressProgress / 100)}
            className={`${isUnlocked ? 'text-amber-500' : 'text-slate-800'} transition-all duration-150 ease-linear filter ${isUnlocked ? 'drop-shadow-[0_0_25px_rgba(251,191,36,0.9)]' : ''}`} 
          />
        </svg>

        <div 
          onMouseDown={startRitual} 
          onMouseUp={stopRitual} 
          onMouseLeave={stopRitual}
          onTouchStart={(e) => { e.preventDefault(); startRitual(); }} 
          onTouchEnd={stopRitual}
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[75%] h-[75%] rounded-full flex items-center justify-center transition-all duration-500
            ${isPressing ? 'scale-95 bg-amber-600/20 shadow-[0_0_80px_rgba(251,191,36,0.5)]' : isUnlocked ? 'bg-slate-900 shadow-2xl hover:bg-slate-800' : 'bg-slate-950 opacity-40 grayscale cursor-not-allowed'}`}
        >
          <div className={`relative w-[85%] h-[85%] rounded-full border-2 ${isUnlocked ? 'border-amber-500/30' : 'border-slate-800'} flex items-center justify-center overflow-hidden ${isPressing ? 'animate-pulse' : ''}`}>
             {loading ? (
               <div className="relative w-full h-full flex items-center justify-center">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.1),transparent)] animate-pulse"></div>
                  <div className="w-24 h-24 border-2 border-amber-500/20 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(251,191,36,0.2)]">
                     <div className="w-16 h-16 border-t-2 border-amber-500 rounded-full animate-spin"></div>
                  </div>
               </div>
             ) : (
               <svg viewBox="0 0 100 100" className={`w-[60%] h-[60%] transition-all duration-1000 ${isPressing ? 'text-amber-200 scale-110' : isUnlocked ? 'text-amber-500/40' : 'text-slate-800'}`}>
                 <path d="M50 5 L60 40 L95 50 L60 60 L50 95 L40 60 L5 50 L40 40 Z" fill="currentColor" />
               </svg>
             )}
          </div>
        </div>
      </div>

      <div className="w-full max-w-xs flex flex-col items-center justify-center space-y-6">
        {loading ? (
          <div className="w-full space-y-6 animate-in fade-in duration-500">
            <p className="text-amber-400 font-mystic text-sm font-black tracking-[0.4em] animate-pulse text-center">MANIFESTING {currentYear} DESTINY...</p>
            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-white/5 shadow-inner">
               <div 
                 className="h-full bg-gradient-to-r from-amber-900 via-amber-400 to-amber-900 transition-all duration-500 ease-out shadow-[0_0_20px_rgba(251,191,36,0.8)]"
                 style={{ width: `${loadingProgress}%` }}
               ></div>
            </div>
          </div>
        ) : isUnlocked ? (
          <div className="flex flex-col items-center space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <p className="text-amber-400 font-mystic text-sm font-black tracking-[0.4em] animate-pulse">
              {isPressing ? `RESONATING: ${pressProgress}%` : "READY FOR IMPRINTING"}
            </p>
            {!isPressing && <p className="text-slate-200 text-xs font-black uppercase tracking-widest animate-bounce">인장을 길게 눌러 각인을 시작하십시오</p>}
          </div>
        ) : (
          <>
            <button 
              onClick={handleUnlockClick}
              className="w-full py-5 bg-gradient-to-r from-amber-600 to-yellow-700 text-slate-950 font-black rounded-2xl shadow-2xl uppercase tracking-widest text-sm hover:scale-105 active:scale-95 transition-all border-t border-white/40"
            >
              올해의 운명 봉인 해제 ({COST_ANNUAL.toLocaleString()} L)
            </button>
            <p className="text-amber-500/70 text-[10px] font-black tracking-widest uppercase">※ 1년에 단 한 번만 각인할 수 있는 귀한 번호입니다</p>
          </>
        )}
      </div>
    </div>
  );
};

export default EternalRitual;

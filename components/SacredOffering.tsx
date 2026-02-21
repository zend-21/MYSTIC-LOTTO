
import React, { useState } from 'react';

interface SacredOfferingProps {
  onOffer: (amount: number) => void;
  level: number;
}

const NadirSign: React.FC<{ className?: string }> = ({ className = 'bg-amber-500' }) => (
  <span className="relative inline-block leading-none mr-[1px]">
    N
    <span className={`absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] ${className} pointer-events-none`} />
  </span>
);

const ODDS_TIERS = [
  {
    label: '태동의 씨앗', range: '1 ~ 9', min: 1, max: 9,
    color: 'text-blue-400', activeBorder: 'border-blue-500/60', activeBg: 'bg-blue-500/10',
    odds: [
      { mult: '1배', prob: 50, color: 'text-slate-400' },
      { mult: '2배', prob: 30, color: 'text-sky-400' },
      { mult: '5배', prob: 15, color: 'text-violet-400' },
      { mult: '10배', prob: 5,  color: 'text-amber-400' },
    ]
  },
  {
    label: '각성의 구슬', range: '10 ~ 49', min: 10, max: 49,
    color: 'text-indigo-400', activeBorder: 'border-indigo-500/60', activeBg: 'bg-indigo-500/10',
    odds: [
      { mult: '1배', prob: 40, color: 'text-slate-400' },
      { mult: '2배', prob: 33, color: 'text-sky-400' },
      { mult: '5배', prob: 20, color: 'text-violet-400' },
      { mult: '10배', prob: 7,  color: 'text-amber-400' },
    ]
  },
  {
    label: '성운의 정수', range: '50 ~ 79', min: 50, max: 79,
    color: 'text-purple-400', activeBorder: 'border-purple-500/60', activeBg: 'bg-purple-500/10',
    odds: [
      { mult: '1배', prob: 30, color: 'text-slate-400' },
      { mult: '2배', prob: 35, color: 'text-sky-400' },
      { mult: '5배', prob: 25, color: 'text-violet-400' },
      { mult: '10배', prob: 10, color: 'text-amber-400' },
    ]
  },
  {
    label: '초월 황금태양', range: '80 ~ 99', min: 80, max: 99,
    color: 'text-amber-400', activeBorder: 'border-amber-500/60', activeBg: 'bg-amber-500/10',
    odds: [
      { mult: '1배', prob: 15, color: 'text-slate-400' },
      { mult: '2배', prob: 40, color: 'text-sky-400' },
      { mult: '5배', prob: 30, color: 'text-violet-400' },
      { mult: '10배', prob: 15, color: 'text-amber-400' },
    ]
  },
  {
    label: '우주의 크리스탈', range: '100+', min: 100, max: Infinity,
    color: 'text-indigo-300', activeBorder: 'border-indigo-400/60', activeBg: 'bg-indigo-500/20',
    odds: [
      { mult: '1배', prob: 0,  color: 'text-slate-600' },
      { mult: '2배', prob: 45, color: 'text-sky-400' },
      { mult: '5배', prob: 35, color: 'text-violet-400' },
      { mult: '10배', prob: 20, color: 'text-amber-400' },
    ]
  },
];

const SacredOffering: React.FC<SacredOfferingProps> = ({ onOffer, level }) => {
  const [customAmount, setCustomAmount] = useState('');
  const [showOddsModal, setShowOddsModal] = useState(false);
  const [confirmAmount, setConfirmAmount] = useState<number | null>(null);
  const presets = [100, 500, 1000, 5000];

  const currentTierIdx = ODDS_TIERS.findIndex(t => level >= t.min && level <= t.max);

  const requestOffer = (amount: number) => {
    if (amount <= 0 || isNaN(amount)) return;
    setConfirmAmount(amount);
  };

  const confirmOffer = () => {
    if (confirmAmount === null) return;
    onOffer(confirmAmount);
    setConfirmAmount(null);
    setCustomAmount('');
  };

  return (
    <div className="flex flex-col items-center space-y-20 animate-in fade-in slide-in-from-bottom-10 duration-1000 w-full max-w-4xl px-4">

      {/* 봉헌 확인 모달 */}
      {confirmAmount !== null && (
        <div className="fixed inset-0 z-[9500] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setConfirmAmount(null)} />
          <div className="relative glass p-8 rounded-[2rem] border border-amber-500/30 w-full max-w-xs text-center animate-in zoom-in-95 duration-300">
            <div className="text-4xl mb-4">🕯️</div>
            <h3 className="text-lg font-black text-amber-400 mb-2 uppercase tracking-widest">봉헌 확인</h3>
            <p className="text-white font-black text-2xl mb-1">
              <NadirSign className="bg-white" />{confirmAmount.toLocaleString()}
              <span className="text-sm text-slate-400 font-bold ml-1">나디르</span>
            </p>
            <p className="text-xs text-slate-400 leading-relaxed mt-3 mb-6">
              위 금액을 사용하여 봉헌하겠습니까?<br />
              <span className="text-white/60 font-bold">봉헌 이후에는 이용약관 및 관련 법령에<br />따라 취소 및 환불이 불가합니다.</span>
            </p>
            <div className="space-y-2">
              <button
                onClick={confirmOffer}
                className="w-full py-4 bg-gradient-to-r from-amber-600 to-yellow-700 text-slate-950 font-black rounded-2xl uppercase tracking-widest text-sm hover:from-amber-500 hover:to-yellow-600 transition-all"
              >
                봉헌하기
              </button>
              <button
                onClick={() => setConfirmAmount(null)}
                className="w-full py-3 bg-white/5 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all"
              >
                돌아가기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 확률 정보 모달 */}
      {showOddsModal && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowOddsModal(false)} />
          <div className="relative glass p-8 rounded-[2rem] border border-amber-500/30 w-full max-w-sm animate-in zoom-in-95 duration-300">
            <div className="text-center mb-6">
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em] mb-1">Offering Probability</p>
              <h3 className="text-xl font-black text-white">봉헌 보상 확률표</h3>
              <p className="text-[10px] text-slate-500 mt-1">※ 콘텐츠산업 진흥법에 의거 공시</p>
            </div>

            <div className="space-y-2">
              {ODDS_TIERS.map((tier, idx) => {
                const isActive = idx === currentTierIdx;
                return (
                  <div key={tier.label} className="rounded-2xl border border-white/5 bg-white/2 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${tier.color}`}>
                        {tier.label} · Lv.{tier.range}
                      </span>
                      {isActive && (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40">
                          적용
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {tier.odds.map(o => (
                        <div key={o.mult} className="flex flex-col items-center">
                          <span className={`text-base font-black ${o.color}`}>
                            {o.prob === 0 ? '-' : `${o.prob}%`}
                          </span>
                          <span className="text-[9px] font-bold text-slate-500">{o.mult}</span>
                          <div className="w-full h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                            <div className="h-full rounded-full bg-white/20"
                              style={{ width: `${o.prob}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="mt-5 text-[10px] text-slate-400 leading-relaxed text-center border-t border-white/10 pt-4">
              봉헌이 완료된 이후에는 디지털 재화(나디르)가 소비된 것으로 처리되며,<br />
              이용약관 및 관련 법령에 따라 <span className="text-white/70 font-bold">취소·환불이 불가</span>합니다.
            </p>

            <button
              onClick={() => setShowOddsModal(false)}
              className="w-full mt-4 py-4 bg-white/5 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      <div className="text-center space-y-6 w-full">
        <div className="inline-flex items-center space-x-3 px-6 py-2 bg-amber-500/5 border border-amber-500/20 rounded-full mb-2">
           <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shadow-[0_0_10px_#f59e0b]"></span>
           <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.5em]">Cosmic Offering Ritual</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-mystic font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-amber-200 to-amber-600 tracking-[0.2em] uppercase drop-shadow-2xl pt-[15px]">천상의 봉헌 제단</h2>
        <p className="text-slate-400 text-sm italic font-medium max-w-xl mx-auto leading-relaxed">
          "당신의 작은 행운을 하늘에 봉헌하여, 더 큰 천운의 씨앗을 심으십시오."
        </p>
        <button
          onClick={() => setShowOddsModal(true)}
          className="text-blue-400 text-xs font-bold underline underline-offset-4 decoration-blue-400/50 hover:text-blue-300 hover:decoration-blue-300 transition-colors"
        >
          봉헌 보상 확률 정보
        </button>
      </div>

      <div className="relative group cursor-pointer perspective-2000 -mt-5">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300%] h-[300%] pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(251,191,36,0.15)_0%,_transparent_65%)] animate-pulse-slow"></div>
          <div className="absolute inset-0 bg-[conic-gradient(from_0deg,_transparent,_rgba(251,191,36,0.03),_transparent)] animate-spin-slow"></div>
        </div>

        <div className="absolute inset-0 pointer-events-none z-10">
           {[...Array(20)].map((_, i) => (
             <div key={i} className="absolute w-[2px] h-[2px] bg-amber-200 rounded-full blur-[0.5px] animate-float-stardust" style={{
               left: `${Math.random() * 100}%`,
               top: `${Math.random() * 100}%`,
               animationDelay: `${i * 0.4}s`,
               opacity: 0.4
             }}></div>
           ))}
        </div>

        <div className="relative w-80 h-96 transition-all duration-1000 transform group-hover:scale-105 group-hover:rotate-x-3 group-hover:rotate-y-12">
           <div className="absolute inset-0 bg-gradient-to-br from-[#1c140a] via-[#0d0905] to-[#050302] rounded-[4rem] border border-amber-500/30 shadow-[0_60px_120px_rgba(0,0,0,1)] overflow-hidden ring-1 ring-white/5">
              <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]"></div>
              <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent"></div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-16">
                 <div className="w-full h-full relative">
                    <div className="absolute inset-0 border-2 border-amber-500/10 rounded-full animate-spin-slow border-dashed"></div>
                    <svg viewBox="0 0 100 100" className="w-full h-full text-amber-500/40 fill-current animate-pulse-slow">
                       <path d="M50 0L54 46L100 50L54 54L50 100L46 54L0 50L46 46Z" />
                    </svg>
                 </div>
              </div>
              <div className="absolute top-[22%] left-1/2 -translate-x-1/2 w-48 flex flex-col items-center">
                 <div className="w-full h-4 bg-[#020100] rounded-full shadow-[inset_0_4px_12px_rgba(0,0,0,1)] border border-amber-600/30 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent animate-mega-sweep"></div>
                 </div>
                 <div className="w-[1px] h-12 bg-gradient-to-b from-amber-500/40 to-transparent mt-1 shadow-[0_0_10px_#f59e0b]"></div>
              </div>
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center">
                 <div className="w-14 h-14 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-center mb-4 group-hover:border-amber-500/50 transition-colors">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-500/80 group-hover:text-amber-400">
                       <path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19" />
                    </svg>
                 </div>
                 <p className="font-mystic text-[10px] font-black tracking-[0.8em] text-amber-500/40 uppercase group-hover:text-amber-500/80 transition-colors whitespace-nowrap">Ark of Luck</p>
              </div>
              <div className="absolute inset-0 rounded-[4rem] border-[0.5px] border-white/5 pointer-events-none"></div>
           </div>
           <div className="absolute inset-0 rounded-[4rem] bg-gradient-to-tr from-white/5 via-transparent to-transparent opacity-40 pointer-events-none"></div>
           <div className="absolute inset-6 border border-white/5 rounded-[3.5rem] pointer-events-none"></div>
        </div>
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-56 h-10 bg-amber-600/20 blur-3xl rounded-full animate-pulse"></div>
      </div>

      <div className="w-full max-w-2xl space-y-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {presets.map(amount => (
            <button
              key={amount}
              onClick={() => requestOffer(amount)}
              className="group relative py-4 bg-slate-950/60 border border-white/10 rounded-2xl transition-all overflow-hidden hover:border-amber-500/50 hover:bg-amber-600/10 active:scale-95 shadow-2xl"
            >
              <div className="relative z-10 flex flex-col items-center">
                <span className="text-[9px] font-black text-slate-600 group-hover:text-amber-500/60 transition-colors uppercase tracking-[0.15em] mb-1">Sacred Tier</span>
                <span className="text-xl font-black text-amber-500 drop-shadow-md"><NadirSign />{amount.toLocaleString()}</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-amber-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
          ))}
        </div>

        <div className="relative group max-w-md mx-auto">
          <div className="absolute -inset-1.5 bg-gradient-to-r from-amber-600/30 to-yellow-600/30 rounded-[3rem] blur-lg opacity-20 group-hover:opacity-50 transition duration-1000"></div>
          <div className="relative bg-[#020100] rounded-[3rem] border border-white/10 overflow-hidden shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]">
            <input
              type="number"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="직접입력 (나디르)"
              className="w-full bg-transparent py-5 sm:py-9 px-12 text-white text-center font-black text-xl sm:text-3xl focus:outline-none placeholder:text-slate-800 placeholder:text-base sm:placeholder:text-lg placeholder:font-black transition-all tabular-nums"
            />
            <button
              onClick={() => requestOffer(parseInt(customAmount))}
              className="absolute right-5 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-16 sm:h-16 bg-gradient-to-br from-amber-400 via-amber-600 to-amber-800 text-slate-950 rounded-xl sm:rounded-2xl flex items-center justify-center font-black shadow-2xl hover:scale-105 active:scale-90 transition-all border-t border-white/40"
            >
              <svg className="w-4 h-4 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center space-y-2">
           <div className="inline-flex items-center space-x-2 px-4 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
              <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest">Potential Luck: Up to 10X Lumens</span>
           </div>
           <p className="text-[11px] font-bold italic leading-relaxed text-center text-amber-500/80">
             "하늘에 바친 기운은 사라지지 않습니다.<br />루멘이 되어 당신 곁으로 돌아옵니다."
           </p>
        </div>
      </div>

      <style>{`
        .perspective-2000 { perspective: 2000px; }
        .rotate-y-12 { transform: perspective(2000px) rotateY(12deg); }
        .rotate-x-3 { transform: perspective(2000px) rotateX(3deg); }

        @keyframes pulse-slow {
          0%, 100% { opacity: 0.2; transform: scale(0.95); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }
        .animate-pulse-slow { animation: pulse-slow 5s ease-in-out infinite; }

        @keyframes float-stardust {
          0%, 100% { transform: translate(0, 0); opacity: 0; }
          50% { transform: translate(${Math.random() * 60 - 30}px, ${Math.random() * -100}px); opacity: 0.6; }
        }
        .animate-float-stardust { animation: float-stardust 6s ease-in-out infinite; }

        @keyframes mega-sweep {
          0% { transform: translateX(-200%); }
          100% { transform: translateX(200%); }
        }
        .animate-mega-sweep { animation: mega-sweep 4s cubic-bezier(0.4, 0, 0.2, 1) infinite; }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 25s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default SacredOffering;

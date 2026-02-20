
import React, { useState, useMemo } from 'react';
import { OrbState, ORB_DECORATIONS } from '../types';

interface FortuneOrbProps {
  orb: OrbState;
  onGrow: () => void;
}

// 구슬의 순수 시각적 표현을 담당하는 컴포넌트 (중앙 및 푸터 공용)
export const OrbVisual: React.FC<{ level: number; isLarge?: boolean; className?: string }> = ({ level, isLarge = false, className = "" }) => {
  const scale = isLarge ? 1.8 : 1;
  let opacity = 1;

  // 레벨별 투명도 계산
  if (level >= 100) {
    opacity = 0;
  } else if (level >= 80) {
    opacity = 0.39 - ((level - 80) / 19) * 0.19;
  } else if (level >= 50) {
    opacity = 0.69 - ((level - 50) / 29) * 0.29;
  } else if (level >= 10) {
    opacity = 1.0 - ((level - 10) / 39) * 0.3;
  }

  const getStyle = () => {
    if (level >= 100) {
      return {
        background: `rgba(0, 0, 0, ${opacity})`,
        border: '1.5px solid rgba(255, 255, 255, 0.25)',
        boxShadow: `
          0 0 ${30 * scale}px ${5 * scale}px rgba(148, 163, 184, 0.3),
          inset 0 0 ${10 * scale}px rgba(255, 255, 255, 0.05)
        `,
      };
    }
    if (level >= 80) {
      return {
        background: `radial-gradient(circle at 30% 30%, rgba(251, 191, 36, ${opacity}), rgba(146, 64, 14, ${opacity}))`,
        boxShadow: `
          0 0 ${70 * scale}px ${15 * scale}px rgba(251, 191, 36, 0.6),
          inset 0 0 ${20 * scale}px rgba(255, 255, 255, 0.4)
        `,
      };
    }
    if (level >= 50) {
      return {
        background: `radial-gradient(circle at 30% 30%, rgba(168, 85, 247, ${opacity}), rgba(76, 29, 149, ${opacity}))`,
        boxShadow: `
          0 0 ${50 * scale}px ${10 * scale}px rgba(168, 85, 247, 0.5),
          inset 0 0 ${15 * scale}px rgba(255, 255, 255, 0.2)
        `,
      };
    }
    if (level >= 10) {
      return {
        background: `radial-gradient(circle at 30% 30%, rgba(99, 102, 241, ${opacity}), rgba(0, 0, 0, ${opacity}))`,
        boxShadow: `
          0 0 ${40 * scale}px ${8 * scale}px rgba(99, 102, 241, 0.4),
          inset 0 0 ${10 * scale}px rgba(255, 255, 255, 0.1)
        `,
      };
    }
    return {
      background: `radial-gradient(circle at 30% 30%, #3b82f6, #1e3a8a)`,
      boxShadow: `0 0 ${30 * scale}px ${6 * scale}px rgba(59, 130, 246, 0.5)`,
    };
  };

  const starCount = level >= 100 ? (isLarge ? 150 : 80) : (isLarge ? 40 : 15);

  const starData = useMemo(() =>
    [...Array(starCount)].map((_, i) => ({
      width: level >= 100 ? `${Math.random() * 1.5 + 0.5}px` : '1.5px',
      height: level >= 100 ? `${Math.random() * 1.5 + 0.5}px` : '1.5px',
      backgroundColor: level >= 100 && i % 8 === 0 ? '#cbd5e1' : 'white',
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDelay: `${i * 0.05}s`,
      animationDuration: `${12 + Math.random() * 18}s`,
    })),
  [level, starCount]);

  return (
    <div className={`rounded-full relative overflow-hidden flex items-center justify-center transition-all duration-1000 ${className}`} style={getStyle()}>
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-full">
        {level >= 10 && (
          <div 
            className="absolute inset-0 opacity-30 animate-milkyway-pan scale-110"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1464802686167-b939a67a06a1?q=80&w=2069&auto=format&fit=crop')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'brightness(0.8) contrast(1.2)'
            }}
          ></div>
        )}
        {level >= 50 && (
          <div className={`absolute inset-0 transition-opacity duration-1000 ${level >= 100 ? 'opacity-40 scale-150' : 'opacity-40'}`}>
            <div className={`absolute inset-0 bg-[conic-gradient(from_0deg,#000000,#020617,#111827,#000000)] blur-[45px] animate-spin-extremely-slow`}></div>
          </div>
        )}
        {level >= 100 && (
          <>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-5 animate-milkyway-flow brightness-[0.3] contrast-150"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50%] h-[50%] bg-indigo-500/[0.04] rounded-full blur-[35px] animate-pulse-slow"></div>
          </>
        )}
        {level >= 80 && level < 100 && (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.3),transparent)] animate-pulse"></div>
        )}
        {level >= 50 && starData.map((s, i) => (
          <div key={i} className={`absolute rounded-full opacity-0 animate-star-drift`} style={s}></div>
        ))}
        {level >= 100 && (
          <>
            <div className="absolute top-[6%] left-[10%] w-[40%] h-[18%] bg-white/[0.18] blur-[10px] rounded-full rotate-[-25deg] pointer-events-none"></div>
            <div className="absolute bottom-[15%] right-[10%] w-[12%] h-[12%] bg-white/[0.05] blur-[12px] rounded-full pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent -translate-x-full animate-crystal-sweep skew-x-[-30deg]"></div>
          </>
        )}
      </div>
    </div>
  );
};

const FortuneOrb: React.FC<FortuneOrbProps> = ({ orb, onGrow }) => {
  const [showDocs, setShowDocs] = useState(false);
  const [previewLevel, setPreviewLevel] = useState<number | null>(null);
  const activeDecoration = ORB_DECORATIONS.find(d => d.id === orb.activeDecorationId) || ORB_DECORATIONS[0];

  const isSeed = orb.level < 10;
  const isAwakening = orb.level >= 10 && orb.level < 50;
  const isNebula = orb.level >= 50 && orb.level < 80;
  const isGoldenSun = orb.level >= 80 && orb.level < 100;
  const isUniversalCrystal = orb.level >= 100;

  const MiniOrbPreview = ({ level, label, active }: { level: number, label: string, active: boolean }) => (
    <div 
      className={`flex flex-col items-center space-y-3 cursor-zoom-in transition-all duration-300 hover:scale-110 active:scale-95 ${active ? 'opacity-100' : 'opacity-40 filter grayscale'}`}
      onClick={() => setPreviewLevel(level)}
    >
      <OrbVisual level={level} className="w-16 h-16 border border-white/10 shadow-lg" />
      <div className="text-center">
        <p className="text-[9px] font-black text-white uppercase tracking-tighter">{label}</p>
        <p className={`text-[7px] font-bold ${active ? 'text-indigo-400' : 'text-slate-600'} uppercase`}>LV.{level === 100 ? '100+' : level}</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-10 relative">
      {/* 대형 구슬 프리뷰 모달 */}
      {previewLevel !== null && (
        <div 
          className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300 cursor-pointer p-10"
          onClick={() => setPreviewLevel(null)}
        >
          <div className="relative flex flex-col items-center space-y-10 max-w-lg w-full">
            <div className="text-center space-y-2">
              <h4 className="text-4xl font-mystic font-black text-white tracking-widest uppercase drop-shadow-glow">
                {previewLevel >= 100 ? 'Universal Crystal' : previewLevel >= 80 ? 'Golden Sun' : previewLevel >= 50 ? 'Nebula Essence' : previewLevel >= 10 ? 'Awakening' : 'Origin Seed'}
              </h4>
              <p className="text-xs text-indigo-400 font-black tracking-[0.5em] uppercase">Stage Evolution Preview</p>
            </div>
            
            <div className="relative flex items-center justify-center shadow-[0_0_100px_rgba(255,255,255,0.1)]">
              <OrbVisual level={previewLevel} isLarge={true} className="w-72 h-72 sm:w-96 sm:h-96" />
              {previewLevel < 100 && (
                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none select-none">
                  <p className="text-6xl font-mystic font-black text-white drop-shadow-lg opacity-80">LV.{previewLevel}</p>
                </div>
              )}
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl text-center space-y-2 backdrop-blur-md">
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
                {previewLevel >= 100 ? '사용자가 직접 선택한 우주의 기운이 구슬 내부에서 휘몰아칩니다. 깊은 블랙 배경 위에서 은하수가 부드럽게 흐르며 궁극의 영험함을 발휘합니다.' :
                 previewLevel >= 80 ? '황금빛 광휘가 주변을 압도하는 태양의 구슬입니다. 강력한 횡재수가 당신의 주변을 감싸고 있음을 의미합니다.' :
                 previewLevel >= 50 ? '신비로운 보랏빛 성운이 휘몰아치는 구슬입니다. 운의 파동이 구체화되어 우주적 동조를 시작한 단계입니다.' :
                 previewLevel >= 10 ? '심오한 인디고 빛이 감도는 각성의 단계입니다. 잠재되어 있던 행운의 씨앗이 우주적 기운과 동조하기 시작합니다.' :
                 '모든 운명의 시작점인 태동의 씨앗입니다. 맑은 푸른 기운을 통해 점진적으로 진화하게 됩니다.'}
              </p>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest pt-2">Click anywhere to return</p>
            </div>
          </div>
        </div>
      )}

      {/* 구슬 진화 안내 모달 */}
      {showDocs && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center p-6 backdrop-blur-md bg-black/85 animate-in fade-in duration-300">
          <div className="glass p-8 sm:p-12 rounded-[4rem] border border-indigo-500/30 w-full max-w-3xl shadow-[0_50px_100px_rgba(0,0,0,1)] space-y-10 relative overflow-hidden">
            <button onClick={() => setShowDocs(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors text-2xl">✕</button>
            <div className="text-center space-y-2">
              <h3 className="text-3xl font-mystic font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 tracking-widest uppercase">구슬의 진화와 천상 전수</h3>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.5em]">Evolutionary Path of the Sacred Orb</p>
            </div>
            
            <div className="grid grid-cols-5 gap-4 py-6 border-y border-white/5 bg-black/20 rounded-[2.5rem] px-6">
              <MiniOrbPreview level={1} label="Seed" active={isSeed} />
              <MiniOrbPreview level={10} label="Awaken" active={isAwakening} />
              <MiniOrbPreview level={50} label="Nebula" active={isNebula} />
              <MiniOrbPreview level={80} label="Sun" active={isGoldenSun} />
              <MiniOrbPreview level={100} label="Crystal" active={isUniversalCrystal} />
            </div>

            <div className="max-h-[40vh] overflow-y-auto pr-4 custom-scroll space-y-6">
              <div className="space-y-4">
                <section className={`p-5 rounded-2xl border transition-all ${isSeed ? 'bg-blue-500/10 border-blue-500/20 shadow-lg' : 'bg-white/5 border-white/5 opacity-40'}`}>
                  <h4 className="text-blue-400 font-black text-sm uppercase tracking-wider">Level 1-9: 태동의 씨앗</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1">맑은 푸른 빛을 머금은 초기 상태입니다. <span className="text-blue-300 font-bold">(봉헌 10배 확률: 5%)</span></p>
                </section>
                <section className={`p-5 rounded-2xl border transition-all ${isAwakening ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-indigo-500/5 border-indigo-500/10 opacity-40'}`}>
                  <h4 className="text-indigo-400 font-black text-sm uppercase tracking-wider">Level 10-49: 각성의 구슬</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1">심오한 인디고 빛과 블랙이 공존하며 영험함이 깨어납니다. 레벨에 따라 속이 비치기 시작합니다.</p>
                </section>
                <section className={`p-5 rounded-2xl border transition-all ${isNebula ? 'bg-purple-500/10 border-purple-500/30' : 'bg-purple-500/5 border-purple-500/10 opacity-40'}`}>
                  <h4 className="text-purple-400 font-black text-sm uppercase tracking-wider">Level 50-79: 성운의 정수</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1">신비로운 보랏빛 성운 속으로 은하수가 더 선명히 투영됩니다.</p>
                </section>
                <section className={`p-5 rounded-2xl border transition-all ${isGoldenSun ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-500/5 border-amber-500/10 opacity-40'}`}>
                  <h4 className="text-amber-400 font-black text-sm uppercase tracking-wider">Level 80-99: 초월: 황금 태양</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1">금빛 광휘가 거의 투명해지며 우주의 본질을 드러냅니다.</p>
                </section>
                <section className={`p-5 rounded-[2rem] border border-dashed transition-all ${isUniversalCrystal ? 'bg-indigo-500/20 border-indigo-400/40 shadow-xl' : 'bg-indigo-500/5 border-indigo-500/10 opacity-40'}`}>
                  <h4 className="text-indigo-300 font-black text-sm uppercase tracking-wider">Level 100+: 우주의 크리스탈 (Ultimate)</h4>
                  <p className="text-xs text-slate-300 leading-relaxed mt-1 font-bold italic">"당신의 선택으로 빚어진 은하수를 품은 결정체."</p>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1">완전 투명한 크리스탈 속에서 우주의 기운이 폭발합니다.</p>
                </section>
              </div>
            </div>
            <button onClick={() => setShowDocs(false)} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl text-xs uppercase tracking-[0.3em] hover:bg-indigo-500 transition-all shadow-xl">수련으로 돌아가기</button>
          </div>
        </div>
      )}

      <div className="relative group cursor-pointer" onClick={onGrow}>
        <div className={`absolute inset-0 rounded-full scale-125 opacity-30 ${activeDecoration.effectClass}`} style={{ backgroundColor: orb.color }}></div>
        <div className="relative transform group-hover:scale-105 transition-transform duration-1000 animate-pulse-gold">
          <OrbVisual level={orb.level} className="w-56 h-56" />
          <div className="absolute inset-0 bg-white/5 mix-blend-overlay animate-pulse rounded-full"></div>
          {!isUniversalCrystal && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-4 select-none">
              <p className={`text-[9px] font-black tracking-[0.3em] uppercase opacity-40 mb-1 text-white`}>
                {isGoldenSun ? 'Golden Sun' : isNebula ? 'Nebula Essence' : isAwakening ? 'Awakening' : 'Origin Seed'}
              </p>
              <div className={`text-2xl font-black font-mystic transition-all duration-700 ${isGoldenSun ? 'text-amber-100' : 'text-white/60'}`}>
                LV.{orb.level}
              </div>
            </div>
          )}
        </div>
        {isUniversalCrystal && (
          <div className="absolute inset-0 -m-6 border border-white/10 rounded-full animate-spin-slow pointer-events-none opacity-30"></div>
        )}
      </div>

      <div className="w-full max-w-xs space-y-10 text-center">
        <div className="flex justify-between items-end">
          <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-400 font-mystic">Fortune Orb</h3>
          <span className="text-xs text-slate-500 font-bold">Lvl {orb.level}</span>
        </div>
        <div className="bg-slate-900 h-4 w-full rounded-full overflow-hidden border border-slate-700/50 p-[2px] shadow-inner">
          <div 
            className={`h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-1000 ease-out`}
            style={{ width: `${(orb.exp % 100)}%` }}
          ></div>
        </div>
        <div className="flex justify-between items-center mt-1">
          <p className="text-[10px] text-slate-500 tracking-widest uppercase font-black">Energy resonance: {orb.exp % 100}%</p>
          <button onClick={() => setShowDocs(true)} className="text-[9px] font-black text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest border-b border-indigo-400/30">구슬의 진화란?</button>
        </div>
      </div>

      <div className="flex flex-col items-center space-y-3">
        {/* 일일 탭 게이지 (10칸) */}
        <div className="flex flex-col items-center space-y-1.5">
          <div className="flex items-center space-x-1.5">
            {Array.from({ length: 10 }).map((_, i) => {
              const usedTaps = Math.min(10, Math.floor((orb.dailyOrbTapExp ?? 0) / 5));
              return (
                <div
                  key={i}
                  className={`w-4 h-1.5 rounded-full transition-all duration-300 ${i < usedTaps ? 'bg-indigo-400' : 'bg-white/10'}`}
                />
              );
            })}
          </div>
          <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
            Daily Training {Math.min(10, Math.floor((orb.dailyOrbTapExp ?? 0) / 5))}/10
          </p>
        </div>
        <button
          onClick={onGrow}
          className={`px-10 py-4 rounded-2xl font-black backdrop-blur-md transition-all active:scale-95 shadow-2xl border ${isUniversalCrystal ? 'bg-indigo-600/20 border-indigo-400/50 text-white' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}
        >
          기운 정화하기 (+5 EXP)
        </button>
        <p className="text-xs text-slate-600 italic font-medium">화면을 탭하여 구슬을 정화하십시오</p>
      </div>

      <style>{`
        .drop-shadow-glow { filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.6)); }
        
        @keyframes spin-extremely-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-extremely-slow { animation: spin-extremely-slow 80s linear infinite; }
        
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 15s linear infinite; }

        @keyframes star-drift {
          0% { transform: translate(0, 0) scale(0); opacity: 0; }
          15% { opacity: 1; transform: scale(1); }
          85% { opacity: 0.6; transform: translate(${Math.random() * 50 - 25}px, ${Math.random() * 50 - 25}px) scale(0.8); }
          100% { transform: translate(${Math.random() * 70 - 35}px, ${Math.random() * 70 - 35}px) scale(0); opacity: 0; }
        }
        .animate-star-drift { animation: star-drift linear infinite; }

        @keyframes milkyway-flow {
          from { background-position: 0 0; }
          to { background-position: 600px 600px; }
        }
        .animate-milkyway-flow { animation: milkyway-flow 45s linear infinite; }

        @keyframes milkyway-pan {
          0% { transform: scale(1.1) translate(0, 0); }
          50% { transform: scale(1.3) translate(-10px, -10px); }
          100% { transform: scale(1.1) translate(0, 0); }
        }
        .animate-milkyway-pan { animation: milkyway-pan 60s ease-in-out infinite; }

        @keyframes crystal-sweep {
          0% { transform: translateX(-250%) skewX(-30deg); }
          25% { transform: translateX(250%) skewX(-30deg); }
          100% { transform: translateX(250%) skewX(-30deg); }
        }
        .animate-crystal-sweep { animation: crystal-sweep 18s cubic-bezier(0.4, 0, 0.2, 1) infinite; }

        @keyframes pulse-slow {
          0%, 100% { opacity: 0.04; transform: scale(1) translate(-50%, -50%); }
          50% { opacity: 0.12; transform: scale(1.1) translate(-50%, -50%); }
        }
        .animate-pulse-slow { 
          position: absolute; left: 50%; top: 50%;
          animation: pulse-slow 10s ease-in-out infinite; 
        }
      `}</style>
    </div>
  );
};

export default FortuneOrb;

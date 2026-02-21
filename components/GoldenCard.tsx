
import React, { useState, useRef, useEffect } from 'react';

const NATURAL_W = 520;
const NATURAL_H = Math.round(NATURAL_W / 1.58); // ≈ 329

interface GoldenCardProps {
  ownerName: string;
  isVisible: boolean;
  cardId?: string;
  hasCard?: boolean;
  onInfoClick?: () => void;
}

const GoldenCard: React.FC<GoldenCardProps> = ({ ownerName, isVisible, cardId, hasCard = true, onInfoClick }) => {
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cardScale, setCardScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width ?? el.offsetWidth;
      setCardScale(Math.min(w / NATURAL_W, 1));
    });
    ro.observe(el);
    setCardScale(Math.min(el.offsetWidth / NATURAL_W, 1));
    return () => ro.disconnect();
  }, []);

  if (!isVisible) return null;

  const handleMove = (clientX: number, clientY: number) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // 입체감 회전 (반응성 강화)
    const rotateX = (centerY - y) / 12; 
    const rotateY = (x - centerX) / 12;
    
    setRotate({ x: rotateX, y: rotateY });
    setGlare({ 
      x: (x / rect.width) * 100, 
      y: (y / rect.height) * 100,
      opacity: 0.9 
    });
  };

  const onMouseDown = (e: React.MouseEvent) => { setIsDragging(true); handleMove(e.clientX, e.clientY); };
  const onMouseMove = (e: React.MouseEvent) => { if (isDragging) handleMove(e.clientX, e.clientY); };
  const onMouseUpOrLeave = () => { setIsDragging(false); setRotate({ x: 0, y: 0 }); setGlare(prev => ({ ...prev, opacity: 0 })); };
  const onTouchStart = (e: React.TouchEvent) => { setIsDragging(true); handleMove(e.touches[0].clientX, e.touches[0].clientY); };
  const onTouchMove = (e: React.TouchEvent) => { if (isDragging) { if (e.cancelable) e.preventDefault(); handleMove(e.touches[0].clientX, e.touches[0].clientY); } };
  const onTouchEnd = () => { setIsDragging(false); setRotate({ x: 0, y: 0 }); setGlare(prev => ({ ...prev, opacity: 0 })); };

  const displayId = hasCard ? (cardId || "7823-4591-24K-8047") : "7823-4591-24K-8047";
  const displayName = hasCard ? ownerName : null;

  return (
    <div ref={containerRef} className="relative group select-none py-16 touch-none w-full flex justify-center items-center">
      {/* 초거대 후광 (Hyper Glow) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180%] h-[180%] pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,215,0,0.15),_transparent_65%)] animate-pulse-slow"></div>
        <div className="absolute inset-0 bg-[conic-gradient(from_0deg,_transparent,_rgba(255,223,0,0.05),_transparent)] animate-spin-slow"></div>
      </div>

      <div style={{ width: NATURAL_W * cardScale, height: NATURAL_H * cardScale, position: 'relative', flexShrink: 0 }}>
        {onInfoClick && (
          <button
            onClick={onInfoClick}
            style={{ position: 'absolute', top: -30, right: 0, zIndex: 100 }}
            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-yellow-500/50 bg-yellow-500/15 text-yellow-400/70 text-[9px] sm:text-[10px] font-black flex items-center justify-center hover:bg-yellow-500/30 hover:text-yellow-300 transition-all shadow-lg translate-x-[-5px] sm:translate-x-0"
          >?</button>
        )}
        {/* scale + perspective 분리 wrapper: scale만 담당하고 perspective를 cardRef에 직접 전달 */}
        <div style={{
          width: NATURAL_W,
          height: NATURAL_H,
          position: 'absolute',
          top: 0,
          left: 0,
          transform: `scale(${cardScale})`,
          transformOrigin: 'top left',
          perspective: '2500px',
        }}>
      <div
        ref={cardRef}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUpOrLeave} onMouseLeave={onMouseUpOrLeave}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        style={{
          width: '100%',
          height: '100%',
          transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
          transition: isDragging ? 'none' : 'transform 1s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.5s',
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        className="rounded-[3rem] preserve-3d shadow-[0_50px_100px_-20px_rgba(0,0,0,1)] border border-yellow-400/30 overflow-hidden ring-1 ring-white/10"
      >
        {/* 카드 본체 레이어 */}
        <div className="absolute inset-0 rounded-[3rem] overflow-hidden backface-hidden bg-[#0d0a00]">
          {/* 베이스 골드 그라데이션 */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#fff6ad] via-[#eab308] via-[#a16207] to-[#451a03]"></div>
          
          {/* 금속 헤어라인 질감 */}
          <div className="absolute inset-0 opacity-30 mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')] scale-150"></div>

          {/* 프리즘/홀로그래픽 오버레이 */}
          <div className="absolute inset-0 opacity-20 mix-blend-color-dodge bg-[linear-gradient(135deg,#ff0000,#ffff00,#00ff00,#00ffff,#0000ff,#ff00ff,#ff0000)] animate-hologram"></div>

          {/* 중앙 신비 문양 */}
          <div className="absolute inset-0 opacity-15 pointer-events-none flex items-center justify-center mix-blend-overlay scale-150">
             <svg viewBox="0 0 100 100" className="w-full h-full text-amber-900 fill-current">
                <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.05" />
                <path d="M50 2L54 46L98 50L54 54L50 98L46 54L2 50L46 46Z" fill="none" stroke="currentColor" strokeWidth="0.1" />
                <path d="M50 15 L53 47 L85 50 L53 53 L50 85 L47 53 L15 50 L47 47 Z" fill="currentColor" opacity="0.5" />
             </svg>
          </div>

          {/* 인터랙티브 광원 효과 (Interactive Glare) */}
          <div 
            style={{ 
              background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.2) 30%, transparent 60%)`, 
              opacity: glare.opacity 
            }}
            className="absolute inset-0 pointer-events-none mix-blend-overlay z-30 transition-opacity duration-500"
          ></div>

          {/* 실시간 빛 반사 스윕 애니메이션 */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-mega-sweep skew-x-[-30deg]"></div>
          </div>

          {/* 디테일 테두리 라인 */}
          <div className="absolute inset-4 border-[0.5px] border-white/40 rounded-[2.6rem] pointer-events-none z-40"></div>
          <div className="absolute inset-8 border-[5px] border-amber-950/20 rounded-[2.3rem] pointer-events-none shadow-[inset_0_8px_15px_rgba(0,0,0,0.6)] z-40"></div>

          {/* 카드 텍스트 정보 레이어 */}
          <div className="absolute inset-0 p-12 md:p-14 flex flex-col justify-between z-40">
            <div className="flex justify-between items-start translate-z-100">
              <div className="max-w-[80%] space-y-4">
                <div className="flex items-center space-x-3 opacity-90">
                  <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_15px_white] animate-pulse"></span>
                  <span className="text-[9px] font-black uppercase tracking-[0.5em] text-amber-950 drop-shadow-sm">Sacred Artifact: Eternal Grade</span>
                </div>
                <h4 className="text-4xl md:text-5xl font-mystic font-black tracking-tighter engraved-deep flex items-baseline select-none">
                  天符印 <span className="text-[12px] md:text-sm opacity-60 ml-3 font-sans font-bold tracking-widest">SOUL CORE EMBLEM</span>
                </h4>
                <p className="text-[11px] text-amber-950/80 font-bold leading-relaxed italic max-w-sm drop-shadow-sm">
                  "이 황금 인장은 소유자의 영혼과 우주의 파동이 동기화되었음을 증명하는 유일무이한 천상의 정수입니다."
                </p>
              </div>

              {/* 홀로그램 엠블럼 */}
              <div className="translate-z-150 rotate-y-20 group-hover:rotate-0 transition-transform duration-1000" style={{ marginRight: '7px', marginTop: '13px' }}>
                <div className="w-16 h-16 rounded-[1.5rem] border-2 border-yellow-100/60 bg-gradient-to-br from-white via-amber-400 to-amber-950 flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.8)] border-b-[8px] border-r-[8px] border-amber-950/70 overflow-hidden">
                   <div className="absolute inset-0 bg-[conic-gradient(from_0deg,#fff,#fbbf24,#fff)] opacity-20 animate-spin-slow"></div>
                   <svg viewBox="0 0 24 24" className="w-8 h-8 md:w-11 md:h-11 text-[#3d2700] drop-shadow-[2px_2px_0px_rgba(255,255,255,0.5)] z-10" fill="currentColor">
                      <path d="M12,2L14.5,9L22,10L14.5,11L12,18L9.5,11L2,10L9.5,9L12,2" />
                   </svg>
                </div>
              </div>
            </div>

            {/* 카드 하단 정보 */}
            <div className="flex justify-between items-end translate-z-120">
              <div className="flex flex-col space-y-2" style={{ paddingLeft: '5px' }}>
                <span className="text-[9px] font-black text-amber-950/70 uppercase tracking-[0.4em] drop-shadow-sm">Authorized Bearer</span>
                {displayName ? (
                  <span className="text-[26px] md:text-[32px] font-bold font-mystic tracking-tight engraved-deep leading-tight whitespace-nowrap max-w-[300px] block" style={{ marginBottom: '-5px' }}>
                    {displayName}<span className="text-xs ml-3 opacity-60 font-sans tracking-normal font-bold">Resonance Certified</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-bold font-mystic tracking-[0.2em] leading-none border-b border-dashed border-amber-950/25 pb-1.5 max-w-[200px] animate-engrave-hint">
                    여기에 당신의 이름을 각인하세요
                  </span>
                )}
                <div className="w-full h-1 bg-amber-950/10 rounded-full mt-2"></div>
                <p className={`text-[10px] font-black tabular-nums tracking-widest uppercase ${hasCard ? 'text-amber-950/60' : 'text-amber-950/25'}`}>ID: {displayId}</p>
              </div>
              <div className="translate-z-100 shrink-0 mb-2">
                <div className="px-6 py-4 bg-black/20 rounded-2xl border border-white/20 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] backdrop-blur-3xl">
                   <p className="text-[10px] font-black text-white tracking-[0.3em] italic uppercase drop-shadow-lg">Mystic Legacy</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 상단 레이어 광택 효과 */}
        <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-tr from-white/10 to-transparent opacity-40 pointer-events-none z-50"></div>
      </div>
        </div>
      </div>

      <style>{`
        .perspective-2500 { perspective: 2500px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .translate-z-100 { transform: translateZ(100px); }
        .translate-z-120 { transform: translateZ(120px); }
        .translate-z-150 { transform: translateZ(150px); }
        .rotate-y-20 { transform: rotateY(20deg); }
        
        .engraved-deep {
          color: #3d2700;
          text-shadow: 
            -1px -1px 2px rgba(0,0,0,0.6),
             1px 1px 1px rgba(255,255,255,0.5);
        }

        @keyframes hologram {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-hologram {
          background-size: 400% 400%;
          animation: hologram 10s ease infinite;
        }

        @keyframes mega-sweep {
          0% { transform: translateX(-400%) skewX(-30deg); }
          15% { transform: translateX(400%) skewX(-30deg); }
          100% { transform: translateX(400%) skewX(-30deg); }
        }
        .animate-mega-sweep {
          animation: mega-sweep 10s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 0.1; transform: scale(0.9) translate(-50%, -50%); }
          50% { opacity: 0.2; transform: scale(1.1) translate(-50%, -50%); }
        }
        .animate-pulse-slow {
          position: absolute; left: 50%; top: 50%;
          animation: pulse-slow 6s ease-in-out infinite;
        }

        @keyframes engrave-hint {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 0.85; }
        }
        .animate-engrave-hint {
          color: rgba(61,39,0,0.9);
          animation: engrave-hint 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default GoldenCard;

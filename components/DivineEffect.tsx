
import React, { useEffect, useState, useRef } from 'react';
import lottie from 'lottie-web';
import { OFFERING_CONVERSION_RATE } from '../types';

interface DivineEffectProps {
  amount: number;
  multiplier: number;
  onComplete: () => void;
}

const DivineEffect: React.FC<DivineEffectProps> = ({ amount, multiplier, onComplete }) => {
  const [phase, setPhase] = useState<'singularity' | 'flash' | 'revelation' | 'fade'>('singularity');
  const [showContent, setShowContent] = useState(false);
  const lottieContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tFlash = setTimeout(() => setPhase('flash'), 1800);
    const tRevelation = setTimeout(() => {
      setPhase('revelation');
      setShowContent(true);
    }, 2100);
    const tFade = setTimeout(() => setPhase('fade'), 6500);
    const tEnd = setTimeout(onComplete, 8000);

    return () => {
      [tFlash, tRevelation, tFade, tEnd].forEach(clearTimeout);
    };
  }, [onComplete]);

  useEffect(() => {
    if (phase === 'revelation' && lottieContainer.current) {
      const anim = lottie.loadAnimation({
        container: lottieContainer.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: "https://lottie.host/99709581-2947-4934-862d-80685717f938/o7uVvU6WJp.json"
      });
      return () => anim.destroy();
    }
  }, [phase]);

  return (
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden transition-all duration-[1500ms] ease-in-out
      ${phase === 'fade' ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100'}`}>
      
      <div className="absolute inset-0 bg-[#02040a]">
        <div className={`absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(251,191,36,0.08)_0%,_transparent_70%)] transition-opacity duration-[2000ms] ${phase === 'revelation' ? 'opacity-100' : 'opacity-0'}`}></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-screen"></div>
      </div>

      {phase === 'singularity' && (
        <div className="relative">
          <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_60px_30px_rgba(255,255,255,0.8)] animate-singularity-vortex"></div>
          <div className="absolute inset-0 w-[400px] h-[400px] -translate-x-1/2 -translate-y-1/2 border border-white/5 rounded-full animate-ping opacity-20"></div>
          <div className="absolute inset-0 w-[200px] h-[200px] -translate-x-1/2 -translate-y-1/2 border border-amber-500/10 rounded-full animate-pulse-slow"></div>
        </div>
      )}

      <div className={`absolute inset-0 bg-white z-[100] transition-opacity duration-300 pointer-events-none
        ${phase === 'flash' ? 'opacity-100' : 'opacity-0'}`}></div>

      {phase === 'revelation' && (
        <div className="relative flex flex-col items-center z-10 w-full h-full justify-center">
          
          <div className="absolute w-[900px] h-[900px] border-[0.5px] border-amber-500/10 rounded-full animate-slow-rotate"></div>
          <div className="absolute w-[600px] h-[600px] border-[0.5px] border-amber-200/5 rounded-full animate-reverse-slow-rotate"></div>
          
          <div ref={lottieContainer} className="absolute inset-0 opacity-50 scale-125 pointer-events-none"></div>

          <div className="relative flex flex-col items-center animate-revelation-entry">
            <div className="mb-14">
               <span className="px-10 py-2 border border-white/10 rounded-full bg-white/5 backdrop-blur-3xl text-[9px] font-black text-amber-200/40 tracking-[2em] uppercase ml-[2em]">Celestial Resonance</span>
            </div>

            <div className="relative mb-14">
              <div className="absolute inset-0 blur-[150px] bg-amber-600/20 scale-[1.8] animate-pulse"></div>
              
              <h2 className={`text-[16rem] md:text-[22rem] font-black font-mystic italic leading-none tracking-tighter select-none
                ${multiplier >= 10 
                  ? 'text-transparent bg-clip-text bg-gradient-to-b from-amber-50 via-yellow-400 to-amber-900 drop-shadow-[0_0_80px_rgba(251,191,36,0.4)]' 
                  : 'text-white/90 drop-shadow-[0_0_50px_rgba(255,255,255,0.2)]'}`}>
                {multiplier}x
              </h2>
            </div>

            <div className="flex flex-col items-center space-y-8">
              <div className="h-[1px] w-64 bg-gradient-to-r from-transparent via-amber-200/20 to-transparent"></div>
              <div className="text-center">
                <p className="text-white/80 font-black text-4xl tracking-[0.8em] uppercase mb-6">천운의 공명</p>
                <div className="bg-black/40 backdrop-blur-3xl px-12 py-5 rounded-2xl border border-white/5 shadow-2xl">
                  <p className="text-amber-100/40 font-bold text-[10px] tracking-[0.3em] uppercase mb-2">Sacred Energy Manifested</p>
                  <p className="text-4xl font-mystic font-black text-white tabular-nums">
                    {(amount * OFFERING_CONVERSION_RATE * multiplier).toLocaleString()} <span className="text-sm font-medium opacity-40">LUMENS</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showContent && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(50)].map((_, i) => (
            <div key={i} className="absolute w-[2px] h-[2px] bg-amber-200 rounded-full animate-float-stardust" style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              opacity: Math.random() * 0.4
            }}></div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes singularity-vortex {
          0% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.5); filter: brightness(2); }
          100% { transform: scale(0); filter: brightness(10); }
        }
        .animate-singularity-vortex { animation: singularity-vortex 1.8s cubic-bezier(0.95, 0.05, 0.795, 0.035) forwards; }

        @keyframes revelation-entry {
          0% { opacity: 0; filter: blur(40px) brightness(0.5); transform: translateY(30px) scale(1.05); }
          100% { opacity: 1; filter: blur(0) brightness(1); transform: translateY(0) scale(1); }
        }
        .animate-revelation-entry { animation: revelation-entry 2.5s cubic-bezier(0.19, 1, 0.22, 1) forwards; }

        @keyframes slow-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-slow-rotate { animation: slow-rotate 40s linear infinite; }

        @keyframes reverse-slow-rotate {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        .animate-reverse-slow-rotate { animation: reverse-slow-rotate 60s linear infinite; }

        @keyframes pulse-slow {
          0%, 100% { opacity: 0.1; transform: scale(0.8) translate(-50%, -50%); }
          50% { opacity: 0.2; transform: scale(1.1) translate(-50%, -50%); }
        }
        .animate-pulse-slow { 
          position: absolute; left: 50%; top: 50%;
          animation: pulse-slow 4s ease-in-out infinite; 
        }

        @keyframes float-stardust {
          0%, 100% { transform: translate(0, 0); opacity: 0; }
          50% { transform: translate(${Math.random() * 120 - 60}px, ${Math.random() * -150}px); opacity: 0.6; }
        }
        .animate-float-stardust { animation: float-stardust 7s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default DivineEffect;

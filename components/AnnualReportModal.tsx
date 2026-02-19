import React from 'react';
import { AnnualDestiny } from '../types';

interface AnnualReportModalProps {
  destiny: AnnualDestiny;
  displayName: string;
  onClose: () => void;
}

const AnnualReportModal: React.FC<AnnualReportModalProps> = ({ destiny, displayName, onClose }) => {
  return (
    <div className="fixed inset-0 z-[9000] flex items-start justify-center p-4 sm:p-8 bg-black/95 backdrop-blur-3xl animate-in fade-in duration-500 overflow-y-auto custom-scroll">
      <div className="glass p-8 sm:p-20 rounded-[4rem] border border-amber-500/40 w-full max-w-6xl shadow-[0_0_200px_rgba(251,191,36,0.3)] space-y-20 relative my-10 bg-slate-950/40">
        <button onClick={onClose} className="absolute top-10 right-10 text-slate-500 hover:text-white transition-colors text-4xl z-[9001]">✕</button>
        <div className="text-center space-y-8 pb-10 border-b border-white/5">
          <div className="inline-flex items-center space-x-4 px-10 py-3 bg-amber-500/10 border border-amber-500/30 rounded-full">
            <span className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></span>
            <span className="text-sm font-black text-amber-500 uppercase tracking-[0.8em] ml-2">Premium Eternal Revelation</span>
          </div>
          <h2 className="text-6xl md:text-8xl font-mystic font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-amber-200 to-amber-600 tracking-tight uppercase leading-tight pt-6 drop-shadow-glow">천명 대운 정밀 리포트</h2>
          <p className="text-slate-400 text-xl font-black tracking-[0.6em] uppercase">{displayName} 님의 {destiny.year}년 영적 동기화 완료</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="p-12 bg-gradient-to-br from-amber-500/10 via-slate-900/50 to-transparent rounded-[4rem] border border-amber-500/30 shadow-2xl space-y-10 flex flex-col items-center justify-center">
            <h3 className="text-amber-500 font-black text-sm uppercase tracking-widest mb-4">올해의 수호 천명수</h3>
            <div className="flex wrap justify-center gap-8">
              {destiny.numbers.map((num, i) => (
                <div key={i} className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-100 via-amber-500 to-amber-900 flex items-center justify-center text-slate-950 font-black text-4xl shadow-[0_15px_40px_rgba(251,191,36,0.5)] border-t-4 border-white/40">{num}</div>
              ))}
            </div>
          </div>
          <div className="p-12 bg-black/50 rounded-[4rem] border border-white/5 flex flex-col items-center justify-center space-y-8">
            <h3 className="text-slate-500 font-black text-xs uppercase tracking-widest">올해의 기운 보강 색상</h3>
            <div className="flex flex-col items-center space-y-6">
              <div className="w-24 h-24 rounded-3xl shadow-2xl border-4 border-white/10" style={{ backgroundColor: destiny.luckyColor || '#fff' }}></div>
              <p className="text-2xl font-black text-white">{destiny.luckyColor}</p>
            </div>
          </div>
        </div>
        <div className="p-14 bg-slate-900/80 rounded-[5rem] border border-white/10 shadow-2xl relative overflow-hidden group">
          <h3 className="text-amber-400 font-mystic font-black text-3xl mb-12 uppercase tracking-widest">ANNUAL DESTINY SYNOPSIS</h3>
          <p className="text-xl text-indigo-50/90 leading-[2.6] italic whitespace-pre-wrap first-letter:text-9xl first-letter:font-mystic first-letter:mr-8 first-letter:float-left first-letter:text-amber-500 first-letter:leading-none">{destiny.reason}</p>
        </div>
        <div className="flex justify-center pt-10">
          <button onClick={onClose} className="px-32 py-10 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 text-slate-950 font-black rounded-[3rem] shadow-2xl uppercase tracking-[0.5em] text-2xl border-t-4 border-white/40 hover:scale-105 transition-all">천상 계시 기록 보존</button>
        </div>
      </div>
    </div>
  );
};

export default AnnualReportModal;

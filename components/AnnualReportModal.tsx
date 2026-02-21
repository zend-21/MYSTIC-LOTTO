import React from 'react';
import { AnnualDestiny } from '../types';

interface AnnualReportModalProps {
  destiny: AnnualDestiny;
  displayName: string;
  onClose: () => void;
}

const Section: React.FC<{ title: string; sub?: string; children: React.ReactNode; accent?: string; titleClass?: string }> = ({ title, sub, children, accent = 'amber', titleClass = '' }) => (
  <div className={`p-5 md:p-10 bg-slate-900/70 rounded-[3rem] border border-white/5 space-y-6 flex flex-col items-center`}>
    <div className="flex flex-col items-center gap-2 md:gap-3 w-full">
      {sub && <p className={`text-[10px] font-black uppercase tracking-[0.6em] text-${accent}-500/60`}>{sub}</p>}
      <h3 className={`text-xl md:text-2xl font-mystic font-black text-${accent}-400 tracking-widest ${titleClass}`}>{title}</h3>
    </div>
    {children}
  </div>
);

const BodyText: React.FC<{ text: string }> = ({ text }) => (
  <p className="text-sm md:text-base text-slate-300/80 leading-[2.2] whitespace-pre-wrap">{text}</p>
);

const AnnualReportModal: React.FC<AnnualReportModalProps> = ({ destiny, displayName, onClose }) => {
  return (
    <div className="fixed inset-0 z-[9000] flex items-start justify-center p-3 sm:p-8 bg-black/95 backdrop-blur-3xl animate-in fade-in duration-500 overflow-y-auto custom-scroll">
      <div className="glass rounded-[3rem] border border-amber-500/30 w-full max-w-3xl shadow-[0_0_200px_rgba(251,191,36,0.2)] space-y-8 relative my-6 bg-slate-950/60 overflow-hidden">

        {/* 닫기 버튼 */}
        <button onClick={onClose} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center text-lg z-10">✕</button>

        {/* 헤더 */}
        <div className="text-center space-y-5 px-3 sm:px-8 pt-14 pb-10 border-b border-white/5">
          <div className="inline-flex items-center space-x-3 px-6 sm:px-6 py-2 bg-amber-500/10 border border-amber-500/30 rounded-full w-full sm:w-auto justify-center sm:justify-start">
            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse shrink-0"></span>
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em] sm:tracking-[0.6em] whitespace-nowrap">Premium Eternal Revelation</span>
          </div>
          <h2 className="text-[2rem] sm:text-4xl md:text-5xl font-mystic font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-amber-200 to-amber-600 leading-tight pt-2">천명 대운 정밀 리포트</h2>
          <p className="text-slate-400 text-sm font-black tracking-[0.12em] sm:tracking-[0.25em] uppercase whitespace-nowrap">{displayName} 님의 {destiny.year}년 영적 동기화 완료</p>
        </div>

        <div className="px-3 md:px-6 space-y-6 pb-14">

          {/* 수호 천명수 */}
          <Section title="수호 천명수" sub="Sacred Lucky Numbers" titleClass="translate-y-[10px] md:translate-y-[15px] inline-block">
            <div className="flex flex-wrap justify-center gap-3 sm:gap-5 py-2">
              {destiny.numbers.map((num, i) => (
                <div key={i} className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-amber-100 via-amber-500 to-amber-900 flex items-center justify-center text-slate-950 font-black text-2xl sm:text-3xl shadow-[0_10px_30px_rgba(251,191,36,0.5)] border-t-4 border-white/40">{num}</div>
              ))}
            </div>
            {destiny.numberExplanations && destiny.numberExplanations.length > 0 && (
              <div className="space-y-5 mt-4">
                {destiny.numberExplanations.map((ne, i) => (
                  <div key={i} className="flex flex-col gap-3 p-5 bg-black/30 rounded-2xl border border-amber-500/10">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-sm">{ne.number}</div>
                    <p className="text-sm text-slate-300/75 leading-relaxed">{ne.explanation}</p>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* 행운 색상 */}
          <Section title="올해의 기운 보강 색상" sub="Lucky Color">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl shadow-xl border-2 border-white/15 shrink-0" style={{ backgroundColor: destiny.luckyColor || '#888' }}></div>
              <p className="text-base font-bold text-white">{destiny.luckyColor}</p>
            </div>
            {destiny.luckyColorDescription && (
              <BodyText text={destiny.luckyColorDescription} />
            )}
          </Section>

          {/* 대운 흐름 */}
          <Section title="올해 대운의 흐름" sub="Annual Destiny Synopsis">
            <BodyText text={destiny.reason} />
          </Section>

          {/* 전반기/후반기 전략 */}
          {destiny.planningStrategy && (
            <Section title="운을 극대화하는 올해의 전략" sub="Planning Strategy">
              <BodyText text={destiny.planningStrategy} />
            </Section>
          )}

          {/* 길월 / 흉월 */}
          {(destiny.bestMonths || destiny.worstMonths) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {destiny.bestMonths && (
                <div className="p-8 bg-emerald-950/40 rounded-[2.5rem] border border-emerald-500/20 space-y-3">
                  <p className="text-[10px] font-black text-emerald-400/70 uppercase tracking-[0.5em]">Best Months</p>
                  <h4 className="text-base font-mystic font-black text-emerald-300">최길월 ✦</h4>
                  <p className="text-sm text-slate-300/75 leading-relaxed">{destiny.bestMonths}</p>
                </div>
              )}
              {destiny.worstMonths && (
                <div className="p-8 bg-rose-950/40 rounded-[2.5rem] border border-rose-500/20 space-y-3">
                  <p className="text-[10px] font-black text-rose-400/70 uppercase tracking-[0.5em]">Caution Months</p>
                  <h4 className="text-base font-mystic font-black text-rose-300">신중월 ⚠</h4>
                  <p className="text-sm text-slate-300/75 leading-relaxed">{destiny.worstMonths}</p>
                </div>
              )}
            </div>
          )}

          {/* 재물운 */}
          {destiny.wealthDetailed && (
            <Section title="재물 & 사업운" sub="Wealth Fortune" accent="yellow">
              <BodyText text={destiny.wealthDetailed} />
            </Section>
          )}

          {/* 애정운 */}
          {destiny.loveDetailed && (
            <Section title="애정 & 인연운" sub="Love Fortune" accent="rose">
              <BodyText text={destiny.loveDetailed} />
            </Section>
          )}

          {/* 건강운 */}
          {destiny.healthDetailed && (
            <Section title="건강 & 신체운" sub="Health Fortune" accent="emerald">
              <BodyText text={destiny.healthDetailed} />
            </Section>
          )}

          {/* 타로 */}
          {destiny.tarotDetailed && (
            <Section title={destiny.tarotCardName ? `타로 — ${destiny.tarotCardName}` : '타로 대운 계시'} sub="Tarot Revelation">
              <BodyText text={destiny.tarotDetailed} />
            </Section>
          )}

          {/* 점성술 */}
          {destiny.astrologyDetailed && (
            <Section title="점성술 연간 트랜짓" sub="Astrology Annual Transit">
              <BodyText text={destiny.astrologyDetailed} />
            </Section>
          )}

          {/* 사주 심층 분석 */}
          {destiny.sajuDeepDive && (
            <Section title="사주 심층 분석" sub="Saju Deep Dive">
              <BodyText text={destiny.sajuDeepDive} />
            </Section>
          )}

          {/* 닫기 버튼 */}
          <div className="flex justify-center pt-6">
            <button onClick={onClose} className="px-16 py-5 bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 font-black rounded-[2rem] uppercase tracking-[0.3em] text-sm transition-all">닫기</button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AnnualReportModal;

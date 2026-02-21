
import React, { useState } from 'react';
import { SavedFortune, OrbState, FortuneResult, ScientificAnalysisResult, ORB_DECORATIONS } from '../types';

interface ArchivesProps {
  items: SavedFortune[];
  orb: OrbState;
  onDelete: (id: string) => void;
}

const Archives: React.FC<ArchivesProps> = ({ items, orb, onDelete }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'divine' | 'scientific'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalItem, setModalItem] = useState<SavedFortune | null>(null);
  const [showAnnualModal, setShowAnnualModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredItems = items.filter(item => {
    if (activeTab === 'all') return true;
    return item.type === activeTab;
  });

  const currentYear = new Date().getFullYear();
  const annualDestiny = orb.annualDestinies?.[currentYear];

  const renderJewelryBox = () => {
    if (!annualDestiny) return null;
    return (
      <div className="w-full space-y-6 animate-in slide-in-from-bottom-10 duration-1000">
         <div className="flex flex-col items-center">
            <div className="px-6 py-2 bg-amber-500/10 border border-amber-500/30 rounded-full mb-6">
               <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.5em]">Eternal Jewelry Box</span>
            </div>
            <div className="relative w-full max-w-2xl aspect-[3/1] rounded-[3rem] p-1 shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden group">
               <div className="absolute inset-0 bg-gradient-to-br from-[#0a0c10] via-[#1a1c25] to-[#0a0c10] rounded-[3rem]"></div>
               <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')]"></div>
               <div className="absolute inset-4 border-2 border-amber-600/30 rounded-[2.5rem] pointer-events-none"></div>
               <div className="absolute inset-6 border-[0.5px] border-white/5 rounded-[2.2rem] pointer-events-none"></div>
               <div className="relative h-full flex items-center justify-around px-10">
                  {annualDestiny.numbers.map((num, i) => (
                    <div key={i} className="relative group/gem flex flex-col items-center">
                       <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-amber-200 via-amber-500 to-amber-900 flex items-center justify-center text-slate-950 font-black text-xl md:text-2xl shadow-[0_15px_30px_rgba(251,191,36,0.4)] border-t-2 border-white/40">
                          {num}
                       </div>
                    </div>
                  ))}
               </div>
            </div>
         </div>
         <button
           onClick={() => setShowAnnualModal(true)}
           className="px-10 py-4 border border-amber-500/30 text-amber-400 font-black text-[10px] uppercase tracking-[0.4em] rounded-2xl hover:bg-amber-500 hover:text-slate-950 transition-all shadow-xl"
         >
           연간 대운 전체 보고서 열기
         </button>
      </div>
    );
  };

  const renderInventory = () => {
    return (
      <div className="w-full space-y-8 animate-in fade-in duration-1000">
         <div className="flex items-center space-x-4 mb-2">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.5em]">Spiritual Inventory</h3>
            <div className="h-[1px] flex-1 bg-white/5"></div>
         </div>
         <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className={`relative aspect-[1.58/1] rounded-2xl border transition-all flex flex-col items-center justify-center space-y-3 overflow-hidden ${orb.hasGoldenCard ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-white/5 bg-slate-950/50'}`}>
               {!orb.hasGoldenCard && <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>}
               <div className={`text-3xl ${orb.hasGoldenCard ? '' : 'grayscale opacity-20'}`}>💳</div>
               <div className="text-center px-4">
                  <p className={`text-[10px] font-black uppercase tracking-widest ${orb.hasGoldenCard ? 'text-yellow-500' : 'text-slate-700'}`}>Golden Card</p>
                  <p className="text-[8px] text-slate-800 font-bold mt-1">{orb.hasGoldenCard ? orb.goldenCardId : 'LOCKED'}</p>
               </div>
            </div>
            {ORB_DECORATIONS.slice(1).map(deco => {
              const isOwned = orb.purchasedDecorationIds?.includes(deco.id);
              return (
                <div key={deco.id} className={`relative aspect-[1.58/1] rounded-2xl border transition-all flex flex-col items-center justify-center space-y-3 overflow-hidden ${isOwned ? 'border-indigo-500/40 bg-indigo-500/5' : 'border-white/5 bg-slate-950/50'}`}>
                  {!isOwned && <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>}
                  <div className={`w-10 h-10 rounded-full border border-white/10 ${deco.effectClass} ${isOwned ? '' : 'grayscale opacity-20'}`} style={{backgroundColor: orb.color}}></div>
                  <div className="text-center px-4">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${isOwned ? 'text-indigo-400' : 'text-slate-700'}`}>{deco.name}</p>
                  </div>
                </div>
              );
            })}
         </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-32">
      {showAnnualModal && annualDestiny && (
        <div className="fixed inset-0 z-[8500] flex items-center justify-center p-6 backdrop-blur-md bg-black/90 animate-in fade-in duration-300">
          <div className="glass p-10 rounded-[3rem] border border-amber-500/30 w-full max-w-5xl shadow-2xl space-y-8 relative overflow-hidden flex flex-col h-[90vh]">
            <button onClick={() => setShowAnnualModal(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors text-2xl z-10">✕</button>
            <div className="text-center shrink-0">
              <h3 className="text-2xl font-mystic font-black text-amber-400 tracking-widest uppercase">{annualDestiny.year}년 천명 대운 전체 보고서</h3>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.5em] mt-1">{annualDestiny.tarotCardName} · 행운색: {annualDestiny.luckyColor}</p>
            </div>
            <div className="flex-1 overflow-y-auto pr-4 custom-scroll pb-10 space-y-10">
              <section className="p-8 bg-black/40 rounded-[2.5rem] border border-amber-500/20 space-y-3">
                <h4 className="text-amber-400 font-black text-sm uppercase tracking-widest">종합 운세 (Overall)</h4>
                <p className="text-sm text-slate-300 leading-loose italic whitespace-pre-wrap">{annualDestiny.reason}</p>
              </section>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="p-8 bg-black/40 rounded-[2.5rem] border border-yellow-500/20 space-y-3">
                  <h4 className="text-yellow-400 font-black text-sm uppercase tracking-widest">재물운</h4>
                  <p className="text-sm text-slate-300 leading-loose italic whitespace-pre-wrap">{annualDestiny.wealthDetailed}</p>
                </section>
                <section className="p-8 bg-black/40 rounded-[2.5rem] border border-pink-500/20 space-y-3">
                  <h4 className="text-pink-400 font-black text-sm uppercase tracking-widest">애정운</h4>
                  <p className="text-sm text-slate-300 leading-loose italic whitespace-pre-wrap">{annualDestiny.loveDetailed}</p>
                </section>
                <section className="p-8 bg-black/40 rounded-[2.5rem] border border-emerald-500/20 space-y-3">
                  <h4 className="text-emerald-400 font-black text-sm uppercase tracking-widest">건강운</h4>
                  <p className="text-sm text-slate-300 leading-loose italic whitespace-pre-wrap">{annualDestiny.healthDetailed}</p>
                </section>
                <section className="p-8 bg-black/40 rounded-[2.5rem] border border-violet-500/20 space-y-3">
                  <h4 className="text-violet-400 font-black text-sm uppercase tracking-widest">타로 심층 풀이 ({annualDestiny.tarotCardName})</h4>
                  <p className="text-sm text-slate-300 leading-loose italic whitespace-pre-wrap">{annualDestiny.tarotDetailed}</p>
                </section>
              </div>
              <section className="p-8 bg-black/40 rounded-[2.5rem] border border-cyan-500/20 space-y-3">
                <h4 className="text-cyan-400 font-black text-sm uppercase tracking-widest">점성술 연간 트랜짓</h4>
                <p className="text-sm text-slate-300 leading-loose italic whitespace-pre-wrap">{annualDestiny.astrologyDetailed}</p>
              </section>
              <section className="p-8 bg-black/40 rounded-[2.5rem] border border-indigo-500/20 space-y-3">
                <h4 className="text-indigo-400 font-black text-sm uppercase tracking-widest">사주 심층 분석 (음력 설 기준)</h4>
                <p className="text-sm text-slate-300 leading-loose italic whitespace-pre-wrap">{annualDestiny.sajuDeepDive}</p>
              </section>
              <section className="p-8 bg-black/40 rounded-[2.5rem] border border-white/10 space-y-3">
                <h4 className="text-white font-black text-sm uppercase tracking-widest">인생 계획 전략</h4>
                <p className="text-sm text-slate-300 leading-loose italic whitespace-pre-wrap">{annualDestiny.planningStrategy}</p>
              </section>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-emerald-900/20 rounded-2xl border border-emerald-500/20 space-y-2">
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">최고의 달</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{annualDestiny.bestMonths}</p>
                </div>
                <div className="p-6 bg-rose-900/20 rounded-2xl border border-rose-500/20 space-y-2">
                  <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">주의의 달</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{annualDestiny.worstMonths}</p>
                </div>
              </div>
              {annualDestiny.numberExplanations?.length > 0 && (
                <section className="space-y-4">
                  <h4 className="text-amber-400 font-black text-sm uppercase tracking-widest">천명수 풀이</h4>
                  {annualDestiny.numberExplanations.map((ex, i) => (
                    <div key={i} className="p-8 bg-white/5 rounded-[2rem] border border-amber-500/20 space-y-3">
                      <p className="text-3xl font-black text-amber-400">#{ex.number}</p>
                      <p className="text-sm text-slate-300 leading-loose italic">"{ex.explanation}"</p>
                    </div>
                  ))}
                </section>
              )}
            </div>
            <button onClick={() => setShowAnnualModal(false)} className="w-full py-5 bg-slate-800 text-white font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-slate-700 transition-all shrink-0">보고서 닫기</button>
          </div>
        </div>
      )}
      {modalItem && (
        <div className="fixed inset-0 z-[8500] flex items-center justify-center p-6 backdrop-blur-md bg-black/90 animate-in fade-in duration-300">
           <div className="glass p-10 rounded-[3rem] border border-indigo-500/30 w-full max-w-5xl shadow-2xl space-y-8 relative overflow-hidden flex flex-col h-[90vh]">
              <button onClick={() => setModalItem(null)} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors text-2xl z-10">✕</button>
              <div className="text-center shrink-0">
                 <h3 className="text-2xl font-mystic font-black text-indigo-400 tracking-widest uppercase">운명 계시 전문 회람</h3>
                 <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.5em] mt-1">{new Date(modalItem.timestamp).toLocaleString()}</p>
              </div>
              <div className="flex-1 overflow-y-auto pr-4 custom-scroll pb-10 space-y-12">
                 {modalItem.type === 'divine' ? (
                    (() => {
                       const d = modalItem.data as FortuneResult;
                       return (
                          <div className="space-y-12">
                             <div className="flex justify-center gap-3">
                                {d.luckyNumbers.map(n => (
                                   <div key={n} className={`w-14 h-14 rounded-full flex items-center justify-center font-black text-xl shadow-xl transition-all ${d.coreNumbers.includes(n) ? 'bg-gradient-to-br from-amber-300 to-amber-600 text-slate-950 ring-4 ring-amber-500/30' : 'bg-slate-800 text-white border border-white/10'}`}>{n}</div>
                                ))}
                             </div>
                             <section className="space-y-6">
                                <h4 className="text-amber-500 font-black tracking-widest uppercase text-center text-xl">💎 핵심 행운의 수 심층 풀이</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                   {d.numberExplanations?.filter(ex => d.coreNumbers.includes(ex.number)).map((ex, i) => (
                                      <div key={i} className="p-8 bg-white/5 rounded-[2.5rem] border-2 border-amber-500/20 shadow-xl space-y-3">
                                        <div className="flex items-center space-x-4">
                                          <p className="text-4xl font-black text-amber-400">#{ex.number}</p>
                                          <div className="h-[1px] flex-1 bg-amber-500/10"></div>
                                        </div>
                                        <p className="text-sm text-slate-300 leading-loose italic font-medium">"{ex.explanation}"</p>
                                      </div>
                                   ))}
                                </div>
                             </section>
                             <div className="grid grid-cols-1 gap-8">
                                <section className="p-10 bg-black/40 rounded-[3rem] border border-indigo-500/20 space-y-4 shadow-inner">
                                   <h4 className="text-indigo-400 font-black text-lg tracking-wider uppercase flex items-center space-x-3">
                                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19"/></svg>
                                      <span>사주(명리학) 심층 분석 보고</span>
                                   </h4>
                                   <p className="text-[15px] text-slate-300 leading-[1.8] italic whitespace-pre-wrap">{d.sajuDeepDive}</p>
                                </section>
                                <section className="p-10 bg-black/40 rounded-[3rem] border border-pink-500/20 space-y-4 shadow-inner">
                                   <h4 className="text-pink-400 font-black text-lg tracking-wider uppercase flex items-center space-x-3">
                                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="4" y="3" width="16" height="18" rx="2"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="16" y2="15"/></svg>
                                      <span>타로 아르카나 심층 분석 보고</span>
                                   </h4>
                                   <p className="text-[15px] text-slate-300 leading-[1.8] italic whitespace-pre-wrap">{d.tarotDeepDive}</p>
                                </section>
                                <section className="p-10 bg-black/40 rounded-[3rem] border border-cyan-500/20 space-y-4 shadow-inner">
                                   <h4 className="text-cyan-400 font-black text-lg tracking-wider uppercase flex items-center space-x-3">
                                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/><path d="M2 12h20"/></svg>
                                      <span>우주 점성술 심층 분석 보고</span>
                                   </h4>
                                   <p className="text-[15px] text-slate-300 leading-[1.8] italic whitespace-pre-wrap">{d.astrologyDeepDive}</p>
                                </section>
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-10">
                                <div className="p-8 bg-slate-900 rounded-[2.5rem] border border-white/5 space-y-3">
                                   <p className="text-amber-400 font-black text-xs uppercase tracking-widest">종합운 해설</p>
                                   <p className="text-xs text-slate-400 leading-relaxed italic">{d.overallFortune}</p>
                                </div>
                                <div className="p-8 bg-slate-900 rounded-[2.5rem] border border-white/5 space-y-3">
                                   <p className="text-yellow-500 font-black text-xs uppercase tracking-widest">재물운 해설</p>
                                   <p className="text-xs text-slate-400 leading-relaxed italic">{d.wealthFortune}</p>
                                </div>
                             </div>
                          </div>
                       );
                    })()
                 ) : (
                    (() => {
                       const s = modalItem.data as ScientificAnalysisResult;
                       return (
                          <div className="space-y-10">
                             <div className="flex justify-center gap-3">
                                {s.numbers.map(n => (
                                   <div key={n} className="w-12 h-12 bg-cyan-600/20 border border-cyan-500/50 rounded-xl flex items-center justify-center font-black text-white text-lg">{n}</div>
                                ))}
                             </div>
                             <div className="p-10 bg-cyan-950/20 rounded-[3rem] border border-cyan-500/30 space-y-4">
                                <h4 className="text-cyan-400 font-black uppercase tracking-widest text-center">Inference Engine Analysis Report</h4>
                                <p className="text-sm text-slate-300 leading-loose italic whitespace-pre-wrap">{s.scientificReport}</p>
                             </div>
                          </div>
                       );
                    })()
                 )}
              </div>
              <button onClick={() => setModalItem(null)} className="w-full py-5 bg-slate-800 text-white font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-slate-700 transition-all shrink-0">보고서 닫기</button>
           </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[9500] flex items-center justify-center px-6" onClick={() => setConfirmDeleteId(null)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
          <div className="relative glass p-10 rounded-[3rem] border border-rose-500/30 w-full max-w-sm space-y-8 shadow-[0_0_80px_rgba(239,68,68,0.15)]" onClick={e => e.stopPropagation()}>
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgb(239,68,68)" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </div>
              <h3 className="text-lg font-black text-white tracking-wider">기록 삭제</h3>
              <p className="text-sm text-slate-400 leading-relaxed">이 운명 기록을 서고에서 영구 삭제합니다.<br/><span className="text-rose-400 font-bold">삭제된 기록은 복구할 수 없습니다.</span></p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl text-slate-300 font-black text-sm hover:bg-white/10 transition-all">취소</button>
              <button onClick={() => { onDelete(confirmDeleteId); setConfirmDeleteId(null); }} className="flex-1 py-4 bg-rose-600/80 border border-rose-500/50 rounded-2xl text-white font-black text-sm hover:bg-rose-500 transition-all">삭제</button>
            </div>
          </div>
        </div>
      )}

      {renderInventory()}
      {renderJewelryBox()}

      <div className="space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-white/5 pb-8">
           <div className="space-y-1">
              <h3 className="text-xl font-mystic font-black text-white tracking-widest uppercase">Resonance Records</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">서고에 보존된 운명의 기록들입니다.</p>
           </div>
           <div className="flex bg-slate-950/80 p-1 rounded-xl border border-white/10">
              {(['all', 'divine', 'scientific'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>
                  {tab === 'all' ? '전체' : tab === 'divine' ? '천기 누설' : '지성 분석'}
                </button>
              ))}
           </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="py-24 text-center glass rounded-[3rem] border border-dashed border-white/5"><p className="text-slate-600 font-black uppercase tracking-[0.4em] text-xs">No Records Found</p></div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => {
              const isExpanded = expandedId === item.id;
              const isDivine = item.type === 'divine';
              const data = item.data as any;

              return (
                <div key={item.id} className={`glass rounded-[2rem] border transition-all duration-500 overflow-hidden ${isExpanded ? 'border-indigo-500/40' : 'border-white/5 hover:border-white/10'}`}>
                  <div onClick={() => setExpandedId(isExpanded ? null : item.id)} className="p-6 flex items-center justify-between cursor-pointer group">
                    <div className="flex items-center space-x-6">
                       <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDivine ? 'bg-indigo-500/10 text-indigo-400' : 'bg-cyan-500/10 text-cyan-400'}`}>
                          {isDivine ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19"/></svg>}
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{new Date(item.timestamp).toLocaleString()}</p>
                          <h4 className="text-sm font-black text-white group-hover:text-indigo-300 transition-colors">{isDivine ? `[천기] ${data.tarotCard}` : `[지성] ${data.numbers.join(', ')}`}</h4>
                       </div>
                    </div>
                    <div className="flex items-center space-x-4">
                       <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(item.id); }} className="w-10 h-10 rounded-xl bg-red-500/5 text-red-500/20 hover:text-red-500 transition-all flex items-center justify-center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-8 pb-10 pt-4 border-t border-white/5 animate-in slide-in-from-top-4 duration-300 space-y-6">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                             <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2">Summary Insight</p>
                                <p className="text-xs text-slate-400 leading-relaxed line-clamp-4 italic">"{isDivine ? data.overallFortune : data.scientificReport}"</p>
                             </div>
                             <div className="flex flex-wrap gap-2">
                                {(isDivine ? data.luckyNumbers : data.numbers).map((n: any, idx: number) => {
                                   const isCore = isDivine && data.coreNumbers?.includes(n);
                                   return (
                                      <div key={idx} className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black shadow-lg transition-all ${isCore ? 'bg-gradient-to-br from-amber-300 to-amber-600 text-slate-950 ring-2 ring-amber-500/30' : 'bg-slate-900 border border-white/10 text-white'}`}>{n}</div>
                                   );
                                })}
                             </div>
                          </div>
                          <div className="flex items-center justify-center">
                             <button onClick={() => setModalItem(item)} className="w-full py-6 border-2 border-indigo-500/30 rounded-[2.5rem] text-[11px] font-black text-indigo-300 uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-xl">상세 운명 보고서 전체 회람하기</button>
                          </div>
                       </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.3); border-radius: 10px; }
        .line-clamp-4 { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  );
};

export default Archives;

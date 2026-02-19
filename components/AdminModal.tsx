import React, { useState, useEffect } from 'react';
import { LottoRound } from '../types';
import { db } from '../services/firebase';
import { doc, setDoc, updateDoc, deleteField } from 'firebase/firestore';

const ADMIN_UIDS = ['o5XegbLlnPVJhZtn31HXyddBGKW2'];
const SUB_ADMIN_LEVEL = 200;

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  lottoHistory: LottoRound[];
  subAdminConfig: Record<string, number>;
  onSubAdminConfigChange: (cfg: Record<string, number>) => void;
  onToast: (msg: string) => void;
}

const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  lottoHistory,
  subAdminConfig,
  onSubAdminConfigChange,
  onToast,
}) => {
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [adminRound, setAdminRound] = useState('');
  const [adminNumbers, setAdminNumbers] = useState(['', '', '', '', '', '']);
  const [adminBonus, setAdminBonus] = useState('');
  const [singleInputStr, setSingleInputStr] = useState('');
  const [deleteConfirmRound, setDeleteConfirmRound] = useState<number | null>(null);
  const [newSubAdminUid, setNewSubAdminUid] = useState('');
  const [newSubAdminPoints, setNewSubAdminPoints] = useState('');
  const [subAdminActionLoading, setSubAdminActionLoading] = useState(false);

  // 모달이 열릴 때 회차 자동 설정
  useEffect(() => {
    if (isOpen) {
      const next = lottoHistory.length > 0 ? lottoHistory[0].round + 1 : 1;
      setAdminRound(next.toString());
    }
  }, [isOpen]);

  const resetForm = () => {
    const next = lottoHistory.length > 0 ? lottoHistory[0].round + 1 : 1;
    setAdminRound(next.toString());
    setAdminNumbers(['', '', '', '', '', '']);
    setAdminBonus('');
    setSingleInputStr('');
    setIsEditingExisting(false);
  };

  const handleClose = () => { resetForm(); onClose(); };

  const handleAppointSubAdmin = async () => {
    const uid = newSubAdminUid.trim();
    const pts = parseInt(newSubAdminPoints);
    if (!uid || isNaN(pts) || pts < 0) { onToast("UID와 루멘 수치를 올바르게 입력해주세요."); return; }
    if (ADMIN_UIDS.includes(uid)) { onToast("최고관리자는 부관리자로 임명할 수 없습니다."); return; }
    setSubAdminActionLoading(true);
    try {
      const configRef = doc(db, "config", "subAdmins");
      await setDoc(configRef, { [uid]: pts }, { merge: true });
      onSubAdminConfigChange({ ...subAdminConfig, [uid]: pts });
      setNewSubAdminUid('');
      setNewSubAdminPoints('');
      onToast(`부관리자 임명 완료: ${uid}`);
    } catch { onToast("임명 실패: 권한을 확인해주세요."); }
    finally { setSubAdminActionLoading(false); }
  };

  const handleDismissSubAdmin = async (uid: string) => {
    setSubAdminActionLoading(true);
    try {
      const configRef = doc(db, "config", "subAdmins");
      await updateDoc(configRef, { [uid]: deleteField() });
      const next = { ...subAdminConfig };
      delete next[uid];
      onSubAdminConfigChange(next);
      onToast(`부관리자 해임 완료: ${uid}`);
    } catch { onToast("해임 실패: 권한을 확인해주세요."); }
    finally { setSubAdminActionLoading(false); }
  };

  const handleRegisterLotto = async () => {
    const roundNum = parseInt(adminRound);
    const nums = adminNumbers.map(n => parseInt(n)).filter(n => !isNaN(n));
    const bonusNum = parseInt(adminBonus);
    if (isNaN(roundNum) || nums.length < 6 || isNaN(bonusNum)) { onToast("모든 번호를 올바르게 입력해주세요."); return; }
    const newRound: LottoRound = { round: roundNum, numbers: nums, bonus: bonusNum };
    const updatedHistory = [newRound, ...lottoHistory.filter(r => r.round !== roundNum)].sort((a, b) => b.round - a.round);
    await setDoc(doc(db, "global", "lotto_history"), { history: updatedHistory });
    onToast(`${roundNum}회차 정보가 기록되었습니다.`);
    setIsEditingExisting(false); setSingleInputStr(''); setAdminNumbers(['', '', '', '', '', '']); setAdminBonus('');
  };

  const handleEditRound = (round: LottoRound) => {
    setIsEditingExisting(true);
    setAdminRound(round.round.toString());
    setAdminNumbers(round.numbers.map(n => n.toString()));
    setAdminBonus(round.bonus.toString());
  };

  const handleDeleteRoundAction = async (roundNum: number) => {
    const updatedHistory = lottoHistory.filter(r => r.round !== roundNum);
    await setDoc(doc(db, "global", "lotto_history"), { history: updatedHistory });
    setDeleteConfirmRound(null);
    onToast(`${roundNum}회차 정보가 소멸되었습니다.`);
  };

  const handleSingleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSingleInputStr(val);
    if (val.endsWith('.')) {
      const num = parseInt(val.slice(0, -1).trim());
      if (!isNaN(num) && num >= 1 && num <= 45) {
        const currentEmptyIdx = adminNumbers.findIndex(n => n === '');
        if (currentEmptyIdx !== -1) {
          const next = [...adminNumbers]; next[currentEmptyIdx] = num.toString(); setAdminNumbers(next);
        } else if (adminBonus === '') { setAdminBonus(num.toString()); }
        setSingleInputStr('');
      }
    }
  };

  const removeNumber = (idx: number, type: 'main' | 'bonus') => {
    if (type === 'main') { const next = [...adminNumbers]; next[idx] = ''; setAdminNumbers(next); }
    else setAdminBonus('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="glass p-10 rounded-[3rem] border border-indigo-500/30 w-full max-w-2xl shadow-2xl space-y-10 relative overflow-hidden flex flex-col max-h-[90vh]">
        <button onClick={handleClose} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors text-2xl">✕</button>
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-mystic font-black text-indigo-400 tracking-widest uppercase">{isEditingExisting ? 'Admin: 번호 수정' : 'Admin: 당첨번호 등록'}</h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Lotto History Management</p>
        </div>
        <div className="flex-1 overflow-y-auto pr-2 custom-scroll space-y-12">
          {/* 당첨번호 등록/수정 */}
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                회차 {isEditingExisting ? '(수정 가능)' : '(자동 설정)'}
              </label>
              <input
                type="number"
                value={adminRound}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { if (isEditingExisting) setAdminRound(e.target.value.replace(/\D/g, '')); }}
                readOnly={!isEditingExisting}
                className={`w-full bg-slate-950/50 border rounded-xl p-4 text-white font-bold outline-none transition-all ${isEditingExisting ? 'border-indigo-500/60 focus:border-indigo-400' : 'border-slate-800 opacity-60 cursor-not-allowed select-none'}`}
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isEditingExisting ? '번호별 수정' : '당첨번호 & 보너스 통합 입력 (예: 10. 20. ...)'}</label>
              <div className="space-y-4">
                <div className="flex wrap gap-2 p-3 bg-slate-950/50 border border-slate-800 rounded-2xl min-h-[64px] items-center">
                  {adminNumbers.map((n, i) => n !== '' && (<span key={i} onClick={() => removeNumber(i, 'main')} className="px-4 py-2 bg-indigo-600 rounded-xl text-xs font-black text-white cursor-pointer hover:bg-indigo-500 transition-colors">{n} <span className="opacity-40 ml-1 text-[8px]">✕</span></span>))}
                  {adminBonus !== '' && (<span onClick={() => removeNumber(0, 'bonus')} className="px-4 py-2 bg-amber-600 rounded-xl text-xs font-black text-slate-950 cursor-pointer hover:bg-amber-500 transition-colors">{adminBonus} <span className="opacity-40 ml-1 text-[8px]">B ✕</span></span>)}
                  {(adminNumbers.some(n => n === '') || adminBonus === '') && (
                    <input type="text" value={singleInputStr} onChange={handleSingleInputChange} className="flex-1 bg-transparent border-none outline-none text-white font-bold p-2 text-sm min-w-[80px]" placeholder="숫자 뒤 마침표(.) 입력" />
                  )}
                </div>
                <p className="text-[9px] text-slate-600 font-bold italic uppercase px-1">※ 숫자를 치고 마침표(.)를 입력하면 자동으로 칸이 나뉩니다.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleRegisterLotto} className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-xl uppercase tracking-[0.2em] text-xs shadow-xl hover:bg-indigo-500 transition-all">{isEditingExisting ? '수정 사항 반영' : '번호 등록 및 갱신'}</button>
              {isEditingExisting && (
                <button onClick={resetForm} className="px-6 py-4 bg-slate-700 text-slate-300 font-black rounded-xl text-xs hover:bg-slate-600 transition-all">취소</button>
              )}
            </div>
          </div>
          {/* 최근 관리 */}
          <div className="space-y-6">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">최근 관리</h4>
            <div className="space-y-3">
              {lottoHistory.slice(0, 5).map((round: LottoRound) => {
                const lastRound = lottoHistory.length > 0 ? lottoHistory[0].round : null;
                return (
                  <div key={round.round} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-indigo-500/20 transition-all">
                    <span className="text-[11px] font-black text-indigo-400 uppercase w-12">{round.round}회</span>
                    <div className="flex space-x-2">
                      {round.numbers.map(n => <span key={n} className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold">{n}</span>)}
                      <span className="w-7 h-7 rounded-full bg-indigo-900/50 flex items-center justify-center text-[10px] font-bold text-indigo-200">{round.bonus}</span>
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={() => handleEditRound(round)} className="px-4 py-2 bg-white/5 rounded-lg text-[10px] font-black text-slate-400 hover:text-white transition-all">수정</button>
                      {round.round === lastRound && (
                        <button onClick={() => setDeleteConfirmRound(round.round)} className="px-4 py-2 bg-rose-900/20 rounded-lg text-[10px] font-black text-rose-400 hover:text-white transition-all">삭제</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* 부관리자 관리 */}
          <div className="space-y-6">
            <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-widest border-b border-purple-500/20 pb-2">부관리자 관리</h4>
            <div className="space-y-3">
              <input
                type="text"
                value={newSubAdminUid}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSubAdminUid(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-700 rounded-xl p-3 text-white font-mono text-xs outline-none focus:border-purple-500 transition-all"
                placeholder="Firebase UID 입력"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={newSubAdminPoints}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSubAdminPoints(e.target.value)}
                  className="flex-1 bg-slate-950/50 border border-slate-700 rounded-xl p-3 text-white font-bold text-xs outline-none focus:border-purple-500 transition-all"
                  placeholder="부여할 루멘 수치"
                  min="0"
                />
                <button
                  onClick={handleAppointSubAdmin}
                  disabled={subAdminActionLoading || !newSubAdminUid.trim() || !newSubAdminPoints}
                  className="px-5 py-3 bg-purple-600 text-white font-black rounded-xl text-xs hover:bg-purple-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >임명</button>
              </div>
            </div>
            {Object.keys(subAdminConfig).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(subAdminConfig).map(([uid, pts]) => (
                  <div key={uid} className="flex items-center justify-between p-3 bg-purple-900/10 rounded-xl border border-purple-500/10">
                    <div className="space-y-0.5">
                      <p className="font-mono text-[10px] text-purple-300 break-all">{uid}</p>
                      <p className="text-[9px] text-slate-500">루멘 {pts.toLocaleString()} · Lv.{SUB_ADMIN_LEVEL}</p>
                    </div>
                    <button
                      onClick={() => handleDismissSubAdmin(uid)}
                      disabled={subAdminActionLoading}
                      className="ml-3 px-3 py-2 bg-rose-900/30 rounded-lg text-[10px] font-black text-rose-400 hover:text-white hover:bg-rose-700/40 transition-all shrink-0 disabled:opacity-40"
                    >해임</button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-slate-600 italic text-center">임명된 부관리자가 없습니다.</p>
            )}
          </div>
        </div>
        <button onClick={handleClose} className="w-full py-5 bg-slate-800 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all shrink-0">관리 종료</button>

        {/* 삭제 확인 서브모달 */}
        {deleteConfirmRound && (
          <div className="absolute inset-0 z-[11000] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
            <div className="glass p-10 rounded-[3rem] border border-rose-500/30 max-sm w-full text-center space-y-8 shadow-[0_0_50px_rgba(244,63,94,0.2)]">
              <div className="text-4xl">⚠️</div>
              <p className="text-sm text-slate-400 leading-relaxed italic">"{deleteConfirmRound}회차 정보를 영구히 소멸시키시겠습니까?"</p>
              <div className="flex flex-col gap-3">
                <button onClick={() => handleDeleteRoundAction(deleteConfirmRound)} className="w-full py-4 bg-rose-600 text-white font-black rounded-xl uppercase tracking-widest text-xs">확인</button>
                <button onClick={() => setDeleteConfirmRound(null)} className="w-full py-4 bg-white/5 text-slate-500 font-black rounded-xl uppercase tracking-widest text-xs">취소</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminModal;

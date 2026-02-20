import React, { useState } from 'react';
import { doc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../../services/firebase';

const ADMIN_UIDS = ['o5XegbLlnPVJhZtn31HXyddBGKW2'];

interface SubAdminManagerProps {
  subAdminConfig: Record<string, number>;
  onSubAdminConfigChange: (cfg: Record<string, number>) => void;
  onToast: (msg: string) => void;
}

const SubAdminManager: React.FC<SubAdminManagerProps> = ({
  subAdminConfig,
  onSubAdminConfigChange,
  onToast,
}) => {
  const [newUid, setNewUid] = useState('');
  const [newPoints, setNewPoints] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAppoint = async () => {
    const uid = newUid.trim();
    const pts = parseInt(newPoints);
    if (!uid || isNaN(pts) || pts < 0) {
      onToast('UID와 루멘 수치를 올바르게 입력해주세요.');
      return;
    }
    if (ADMIN_UIDS.includes(uid)) {
      onToast('최고관리자는 부관리자로 임명할 수 없습니다.');
      return;
    }
    setLoading(true);
    try {
      await setDoc(doc(db, 'config', 'subAdmins'), { [uid]: pts }, { merge: true });
      onSubAdminConfigChange({ ...subAdminConfig, [uid]: pts });
      setNewUid('');
      setNewPoints('');
      onToast(`부관리자 임명 완료: ${uid}`);
    } catch {
      onToast('임명 실패: 권한을 확인해주세요.');
    }
    setLoading(false);
  };

  const handleDismiss = async (uid: string) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'config', 'subAdmins'), { [uid]: deleteField() });
      const next = { ...subAdminConfig };
      delete next[uid];
      onSubAdminConfigChange(next);
      onToast(`부관리자 해임 완료: ${uid}`);
    } catch {
      onToast('해임 실패: 권한을 확인해주세요.');
    }
    setLoading(false);
  };

  return (
    <div className="glass rounded-3xl p-6 border border-white/10 space-y-6">
      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">부관리자 관리</h3>

      {/* 현재 부관리자 목록 */}
      <div className="space-y-2">
        {Object.keys(subAdminConfig).length === 0 ? (
          <p className="text-slate-500 text-sm italic">지정된 부관리자 없음</p>
        ) : (
          Object.entries(subAdminConfig).map(([uid, pts]) => (
            <div key={uid} className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-2xl px-4 py-3 gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black text-indigo-300 truncate">{uid}</p>
                <p className="text-[10px] text-slate-500 font-bold mt-0.5">루멘 지급: {pts.toLocaleString()} L</p>
              </div>
              <button
                onClick={() => handleDismiss(uid)}
                disabled={loading}
                className="shrink-0 text-[10px] font-black text-rose-400 hover:text-rose-300 border border-rose-400/30 hover:border-rose-400/60 px-3 py-1.5 rounded-xl transition-all disabled:opacity-40"
              >
                해임
              </button>
            </div>
          ))
        )}
      </div>

      {/* 신규 부관리자 임명 */}
      <div className="space-y-3 border-t border-white/5 pt-4">
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">신규 임명</p>
        <input
          type="text"
          placeholder="Firebase UID"
          value={newUid}
          onChange={(e) => setNewUid(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
        />
        <input
          type="number"
          placeholder="지급할 루멘 (L)"
          value={newPoints}
          onChange={(e) => setNewPoints(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
        />
        <button
          onClick={handleAppoint}
          disabled={loading || !newUid.trim() || !newPoints}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl text-xs uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? '처리 중…' : '부관리자 임명'}
        </button>
      </div>
    </div>
  );
};

export default SubAdminManager;

import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface Report {
  id: string;
  authorName: string;
  authorId: string;
  type: 'report' | 'support';
  subject: string;
  content: string;
  createdAt: number;
  isRead: boolean;
}

const ReportInbox: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'reports'),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        const snap = await getDocs(q);
        setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Report)));
      } catch {
        // reports 컬렉션 없으면 빈 목록
        setReports([]);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const markRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'reports', id), { isRead: true });
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, isRead: true } : r)));
    } catch { /* silent */ }
  };

  const unreadCount = reports.filter((r) => !r.isRead).length;

  return (
    <div className="glass rounded-3xl p-6 border border-white/10 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">리포트 수신함</h3>
        {unreadCount > 0 && (
          <span className="text-[10px] font-black text-amber-400 bg-amber-400/20 px-2 py-1 rounded-lg">
            미열람 {unreadCount}건
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <p className="text-slate-500 text-sm italic">수신된 리포트 없음</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto custom-scroll pr-1">
          {reports.map((r) => (
            <div
              key={r.id}
              className={`rounded-2xl border p-4 cursor-pointer transition-all ${
                r.isRead ? 'border-white/5 bg-white/[0.02]' : 'border-amber-400/30 bg-amber-400/5'
              }`}
              onClick={() => {
                setExpanded(expanded === r.id ? null : r.id);
                if (!r.isRead) markRead(r.id);
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                      r.type === 'report' ? 'bg-rose-500/20 text-rose-400' : 'bg-sky-500/20 text-sky-400'
                    }`}>
                      {r.type === 'report' ? '신고' : '문의'}
                    </span>
                    {!r.isRead && <span className="w-1.5 h-1.5 bg-amber-400 rounded-full shrink-0" />}
                  </div>
                  <p className="text-sm font-bold text-white truncate">{r.subject}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {r.authorName} · {new Date(r.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <span className="text-slate-600 text-xs shrink-0">{expanded === r.id ? '▲' : '▼'}</span>
              </div>
              {expanded === r.id && (
                <p className="mt-3 text-sm text-slate-300 leading-relaxed border-t border-white/5 pt-3 whitespace-pre-wrap">
                  {r.content}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReportInbox;

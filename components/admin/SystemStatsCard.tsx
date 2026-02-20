import React, { useEffect, useState, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface Stats {
  userCount: number;
  roomCount: number;
  postCount: number;
}

const SystemStatsCard: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const [users, rooms, posts] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'square', 'rooms', 'list')),
        getDocs(collection(db, 'square', 'board', 'posts')),
      ]);
      setStats({
        userCount: users.size,
        roomCount: rooms.size,
        postCount: posts.size,
      });
    } catch (e) {
      console.error('SystemStatsCard fetch error:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const StatBox: React.FC<{ label: string; value: number | string; icon: string }> = ({ label, value, icon }) => (
    <div className="glass rounded-2xl p-4 border border-white/5 text-center space-y-1">
      <div className="text-2xl">{icon}</div>
      <p className="text-2xl font-mystic font-black text-white tabular-nums">{value}</p>
      <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">{label}</p>
    </div>
  );

  return (
    <div className="glass rounded-3xl p-6 border border-white/10 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">시스템 현황</h3>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-40 uppercase tracking-widest"
        >
          {loading ? '로딩 중…' : '새로고침'}
        </button>
      </div>

      {loading && !stats ? (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin" />
        </div>
      ) : stats ? (
        <div className="grid grid-cols-3 gap-3">
          <StatBox icon="👥" label="총 가입자" value={stats.userCount.toLocaleString()} />
          <StatBox icon="🪐" label="활성 행성" value={stats.roomCount.toLocaleString()} />
          <StatBox icon="📋" label="회람판 게시물" value={stats.postCount.toLocaleString()} />
        </div>
      ) : (
        <p className="text-slate-500 text-sm italic">데이터를 불러올 수 없습니다.</p>
      )}
    </div>
  );
};

export default SystemStatsCard;

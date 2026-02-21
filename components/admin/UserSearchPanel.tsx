import React, { useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface FoundUser {
  uid: string;
  nickname: string;
  uniqueTag: string;
}

interface UserSearchPanelProps {
  onToast: (msg: string) => void;
}

const UserSearchPanel: React.FC<UserSearchPanelProps> = ({ onToast }) => {
  const [searchInput, setSearchInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleSearch = async () => {
    const tag = searchInput.trim().replace(/^@/, '');
    if (!tag) {
      onToast('@태그를 입력해주세요.');
      return;
    }
    setIsSearching(true);
    setFoundUser(null);
    setNotFound(false);
    try {
      const q = query(
        collection(db, 'users'),
        where('orb.uniqueTag', '==', tag)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setNotFound(true);
      } else {
        const d = snap.docs[0];
        const data = d.data();
        setFoundUser({
          uid: d.id,
          nickname: data?.orb?.nickname || '(닉네임 없음)',
          uniqueTag: data?.orb?.uniqueTag || tag,
        });
      }
    } catch {
      onToast('검색 중 오류가 발생했습니다.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="w-full glass rounded-[2rem] border border-white/5 overflow-hidden">
      {/* 헤더 */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center space-x-3">
        <span className="text-lg">🔍</span>
        <div>
          <p className="text-sm font-black text-white">유저 검색</p>
          <p className="text-[10px] text-slate-500">@태그로 유저를 검색하고 제재·보상을 적용합니다</p>
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* 검색 입력 */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-black">@</span>
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="고유태그 입력 (@ 제외 가능)"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-7 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/40 transition-colors"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-5 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-black hover:bg-amber-500/30 transition-colors disabled:opacity-40"
          >
            {isSearching ? '…' : '검색'}
          </button>
        </div>

        {/* 결과 없음 */}
        {notFound && (
          <div className="text-center py-4 text-slate-600 text-xs font-bold">
            해당 태그의 유저를 찾을 수 없습니다.
          </div>
        )}

        {/* 검색 결과 */}
        {foundUser && (
          <div className="space-y-4">
            {/* 유저 정보 카드 */}
            <div className="rounded-2xl bg-white/[0.04] border border-white/10 px-5 py-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-base font-black text-white">{foundUser.nickname}</p>
                <p className="text-[11px] text-amber-400 font-bold">@{foundUser.uniqueTag}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-slate-600 uppercase tracking-widest font-black mb-0.5">UID</p>
                <p className="text-[10px] text-slate-400 font-mono break-all max-w-[160px]">{foundUser.uid}</p>
              </div>
            </div>

            {/* 제재 / 보상 버튼 영역 */}
            <div className="space-y-2">
              <p className="text-[10px] text-slate-600 uppercase tracking-widest font-black px-1">관리 액션</p>

              {/* 제재 */}
              <div className="rounded-2xl bg-rose-500/5 border border-rose-500/15 px-4 py-3 space-y-2">
                <p className="text-[9px] text-rose-400/60 uppercase tracking-widest font-black">제재</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled
                    title="추후 구현 예정"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400/50 text-[11px] font-black cursor-not-allowed"
                  >
                    <span>🚫</span> 게시글 작성 금지
                    <span className="text-[8px] text-rose-400/30 ml-0.5">준비중</span>
                  </button>
                  <button
                    disabled
                    title="추후 구현 예정"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400/50 text-[11px] font-black cursor-not-allowed"
                  >
                    <span>🔇</span> 대화방 참여 금지
                    <span className="text-[8px] text-rose-400/30 ml-0.5">준비중</span>
                  </button>
                  <button
                    disabled
                    title="추후 구현 예정"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400/50 text-[11px] font-black cursor-not-allowed"
                  >
                    <span>⛔</span> 계정 정지
                    <span className="text-[8px] text-rose-400/30 ml-0.5">준비중</span>
                  </button>
                </div>
              </div>

              {/* 보상 */}
              <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/15 px-4 py-3 space-y-2">
                <p className="text-[9px] text-emerald-400/60 uppercase tracking-widest font-black">보상</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled
                    title="추후 구현 예정"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400/50 text-[11px] font-black cursor-not-allowed"
                  >
                    <span>💎</span> 루멘 지급
                    <span className="text-[8px] text-emerald-400/30 ml-0.5">준비중</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserSearchPanel;

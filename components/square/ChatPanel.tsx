import React, { useState, useEffect, useRef } from 'react';
import { OrbState, ChatRoom, ChatMessage } from '../../types';
import { OrbVisual } from '../FortuneOrb';
import { db, auth } from '../../services/firebase';
import {
  collection, query, onSnapshot, addDoc,
  orderBy, limit, getDocs, startAfter, QueryDocumentSnapshot
} from 'firebase/firestore';
import { spendPoints } from '../../services/geminiService';

const MSG_PAGE_SIZE = 50;

interface ChatPanelProps {
  activeRoom: ChatRoom;
  orb: OrbState;
  onToast: (msg: string) => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ activeRoom, orb, onToast }) => {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [realtimeMsgs, setRealtimeMsgs] = useState<ChatMessage[]>([]);
  const [historicalMsgs, setHistoricalMsgs] = useState<ChatMessage[]>([]);
  const [msgCursor, setMsgCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMoreMsgs, setIsLoadingMoreMsgs] = useState(false);
  const [inputMsg, setInputMsg] = useState('');
  const [showGiftModal, setShowGiftModal] = useState<ChatMessage | null>(null);
  const [giftAmount, setGiftAmount] = useState('100');

  const scrollRef = useRef<HTMLDivElement>(null);
  const currentDisplayName = orb.nickname || orb.uniqueTag || '익명';
  const allMessages = [...historicalMsgs, ...realtimeMsgs];

  // 1초마다 현재 시간 업데이트 (행성 소멸 카운트다운용)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 방이 바뀌면 이전 메시지 초기화
  useEffect(() => {
    setHistoricalMsgs([]);
    setMsgCursor(null);
    const q = query(
      collection(db, "square", "rooms", "list", activeRoom.id, "messages"),
      orderBy("timestamp", "desc"),
      limit(MSG_PAGE_SIZE)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)).reverse();
      setRealtimeMsgs(msgs);
      const oldestDoc = snapshot.docs[snapshot.docs.length - 1] || null;
      setMsgCursor(oldestDoc);
      setHasMoreMessages(snapshot.docs.length === MSG_PAGE_SIZE);
    });
    return () => unsubscribe();
  }, [activeRoom.id]);

  // 새 실시간 메시지 도착 시 하단 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [realtimeMsgs, activeRoom]);

  const loadMoreMessages = async () => {
    if (!msgCursor || isLoadingMoreMsgs) return;
    setIsLoadingMoreMsgs(true);
    try {
      const q = query(
        collection(db, "square", "rooms", "list", activeRoom.id, "messages"),
        orderBy("timestamp", "desc"),
        startAfter(msgCursor),
        limit(MSG_PAGE_SIZE)
      );
      const snap = await getDocs(q);
      const older = snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)).reverse();
      setHistoricalMsgs(prev => [...older, ...prev]);
      setMsgCursor(snap.docs[snap.docs.length - 1] || null);
      setHasMoreMessages(snap.docs.length === MSG_PAGE_SIZE);
    } finally {
      setIsLoadingMoreMsgs(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMsg.trim() || !auth.currentUser) return;
    try {
      await addDoc(collection(db, "square", "rooms", "list", activeRoom.id, "messages"), {
        userId: auth.currentUser.uid,
        userName: currentDisplayName,
        userLevel: orb.level,
        message: inputMsg,
        timestamp: Date.now()
      });
      setInputMsg('');
    } catch {
      onToast("메시지 전송에 실패했습니다.");
    }
  };

  const handleGiftLumen = async () => {
    const amount = parseInt(giftAmount);
    if (isNaN(amount) || amount <= 0) { onToast("전수할 기운의 양이 올바르지 않습니다."); return; }
    if (orb.points < amount) { onToast("보유하신 기운이 부족합니다."); return; }
    if (!showGiftModal || showGiftModal.userId === 'system' || !auth.currentUser) return;
    try {
      await spendPoints(amount, 'gift_lumen');
      await addDoc(collection(db, "users", showGiftModal.userId, "inbox"), {
        amount,
        fromName: currentDisplayName,
        fromUid: auth.currentUser.uid,
        timestamp: Date.now()
      });
      await addDoc(collection(db, "square", "rooms", "list", activeRoom.id, "messages"), {
        userId: "system",
        userName: "SYSTEM",
        userLevel: 0,
        message: `${currentDisplayName}님이 ${showGiftModal.userName}님에게 ${amount.toLocaleString()} 루멘을 선물했습니다! ✨`,
        timestamp: Date.now()
      });
      onToast(`${showGiftModal.userName}님에게 ${amount.toLocaleString()} 루멘을 전수했습니다.`);
    } catch {
      onToast("선물 전송에 실패했습니다.");
    }
    setShowGiftModal(null);
    setGiftAmount('100');
  };

  const formatRemainingTime = (target: number) => {
    const diff = target - currentTime;
    if (diff <= 0) return "소멸 진행 중...";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours}시간 ${mins}분 ${secs}초`;
  };

  const formatDate = (target: number) => {
    const date = new Date(target);
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${date.getHours()}시 ${date.getMinutes()}분`;
  };

  return (
    <>
      <div className="flex-1 flex flex-col h-full max-w-4xl mx-auto w-full glass rounded-t-[3rem] border-x border-t border-white/5 overflow-hidden shadow-2xl relative">
        {/* 행성 소멸 안내 배너 */}
        {activeRoom.deleteAt && (
          <div className="bg-rose-900/80 backdrop-blur-xl border-b border-rose-500/40 px-6 py-4 flex flex-col items-center animate-in slide-in-from-top-full duration-700 z-[80] shadow-lg">
            <div className="flex items-center space-x-3 mb-1">
              <span className="text-xl animate-bounce">🌋</span>
              <p className="text-[10px] font-black text-rose-100 uppercase tracking-[0.4em]">Planet Destruction Protocol Active</p>
            </div>
            <div className="flex flex-col items-center">
              <p className="text-[13px] font-bold text-white text-center italic">"이 행성은 <span className="text-yellow-400 font-black">{formatDate(activeRoom.deleteAt)}</span> 에 소멸됩니다."</p>
              <div className="mt-2 flex items-center space-x-3">
                <div className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></div>
                <p className="text-sm font-mystic font-black text-rose-300 uppercase tracking-widest">REMAINING: {formatRemainingTime(activeRoom.deleteAt)}</p>
              </div>
            </div>
          </div>
        )}

        {/* 메시지 목록 */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scroll">
          {hasMoreMessages && (
            <div className="flex justify-center pt-2 pb-4">
              <button
                onClick={loadMoreMessages}
                disabled={isLoadingMoreMsgs}
                className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-50"
              >
                {isLoadingMoreMsgs ? '불러오는 중...' : '이전 메시지 보기'}
              </button>
            </div>
          )}
          {allMessages.map(msg => {
            const isMe = auth.currentUser && msg.userId === auth.currentUser.uid;
            const isSystem = msg.userId === 'system';
            if (isSystem) return (
              <div key={msg.id} className="flex justify-center">
                <p className="text-[9px] font-black text-indigo-400/60 uppercase tracking-widest px-4 py-1.5 bg-indigo-500/5 rounded-full border border-indigo-500/10">{msg.message}</p>
              </div>
            );
            return (
              <div key={msg.id} className={`flex items-start space-x-4 ${isMe ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <div className="relative group cursor-pointer" onClick={() => !isMe && setShowGiftModal(msg)}>
                  <OrbVisual level={msg.userLevel} className="w-10 h-10 border border-white/10" />
                  <div className="absolute -top-1 -right-1 bg-indigo-600 text-[8px] font-black px-1.5 py-0.5 rounded shadow-lg">LV.{msg.userLevel}</div>
                  {!isMe && <div className="absolute inset-0 bg-yellow-500/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-slate-950 font-black text-[8px]">GIFT</div>}
                </div>
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">{msg.userName}</span>
                  <div className={`px-5 py-3 rounded-2xl text-sm font-medium ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white/5 border border-white/5 text-slate-200 rounded-tl-none'}`}>{msg.message}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 메시지 입력창 */}
        <div className="p-6 bg-slate-950/80 border-t border-white/10 flex items-center space-x-4">
          <input
            type="text"
            value={inputMsg}
            onChange={e => setInputMsg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="운명의 메시지를 입력하세요..."
            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-indigo-500 transition-all text-white"
          />
          <button onClick={sendMessage} className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg hover:bg-indigo-500 transition-all active:scale-95">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
          </button>
        </div>
      </div>

      {/* 선물 모달 */}
      {showGiftModal && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowGiftModal(null)}></div>
          <div className="relative glass p-10 rounded-[3rem] border border-yellow-500/20 w-full max-sm text-center animate-in zoom-in-95 duration-300">
            <div className="text-4xl mb-6">🎁</div>
            <h3 className="text-2xl font-mystic font-black text-yellow-500 mb-2 uppercase tracking-widest">Transmit Essence</h3>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-8 italic">{showGiftModal.userName}님에게 기운을 전수합니다.</p>
            <div className="space-y-6">
              <div className="flex items-center bg-slate-950/50 border border-slate-800 rounded-2xl p-2">
                <button onClick={() => setGiftAmount(Math.max(100, parseInt(giftAmount) - 100).toString())} className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-slate-400 hover:text-white">-</button>
                <input type="number" value={giftAmount} onChange={e => setGiftAmount(e.target.value)} className="flex-1 bg-transparent text-center font-black text-2xl text-white outline-none tabular-nums" />
                <button onClick={() => setGiftAmount((parseInt(giftAmount) + 100).toString())} className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-slate-400 hover:text-white">+</button>
              </div>
              <button onClick={handleGiftLumen} className="w-full py-5 bg-yellow-600 text-slate-950 font-black rounded-2xl shadow-xl uppercase tracking-widest text-sm">루멘 전수하기</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatPanel;

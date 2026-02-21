import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import { OrbState, ChatRoom, ChatMessage } from '../../types';
import { OrbVisual } from '../FortuneOrb';
import { db, auth } from '../../services/firebase';
import {
  collection, query, onSnapshot, addDoc,
  orderBy, limit, getDocs, startAfter, QueryDocumentSnapshot,
  doc, updateDoc, arrayUnion
} from 'firebase/firestore';
import { spendPoints } from '../../services/geminiService';

const MSG_PAGE_SIZE = 50;

// ── 이모지 목록 ──────────────────────────────────────────────────────────────
const EMOJI_LIST = [
  '😀','😂','🥰','😍','😎','🤣','😊','😄','😁','🥳',
  '😤','😅','🤔','💪','🙏','👍','❤️','🔥','✨','💫',
  '⭐','🌟','🎉','💯','👀','🎁','🌙','☀️','🌈','🎯',
  '😇','🥺','😋','😛','🤩','😜','🤗','😮','😱','🤯',
  '🌸','🌺','🍀','🦋','🐉','💎','🔮','🪄','🌊','⚡',
];

// ── 매크로 타입 ──────────────────────────────────────────────────────────────
type AutoTrigger = '' | 'i_enter' | 'someone_enters' | 'someone_leaves' | 'idle_3min' | 'received_lumen';

interface AutoMacro {
  text: string;
  trigger: AutoTrigger;
}

const AUTO_TRIGGER_LABELS: Record<AutoTrigger, string> = {
  '': '없음',
  i_enter: '내가 입장할 때',
  someone_enters: '누군가 입장할 때',
  someone_leaves: '누군가 퇴장할 때',
  idle_3min: '3분간 채팅 없을 때',
  received_lumen: '루멘 선물받을 때',
};

const ALL_TRIGGERS: AutoTrigger[] = ['', 'i_enter', 'someone_enters', 'someone_leaves', 'idle_3min', 'received_lumen'];

const MACRO_KEY = 'mystic_macros';

function loadMacros(): { manual: string[]; auto: AutoMacro[] } {
  try {
    const raw = localStorage.getItem(MACRO_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      const manual: string[] = Array.isArray(p.manual) ? p.manual : [];
      const auto: AutoMacro[] = Array.isArray(p.auto) ? p.auto : [];
      while (manual.length < 10) manual.push('');
      while (auto.length < 10) auto.push({ text: '', trigger: '' });
      return { manual: manual.slice(0, 10), auto: (auto.slice(0, 10) as AutoMacro[]) };
    }
  } catch {}
  return {
    manual: Array(10).fill('') as string[],
    auto: Array.from({ length: 10 }, () => ({ text: '', trigger: '' as AutoTrigger })),
  };
}

// ── 인터페이스 ────────────────────────────────────────────────────────────────
export interface ChatPanelHandle {
  getMessages: () => ChatMessage[];
}

interface ChatPanelProps {
  activeRoom: ChatRoom;
  orb: OrbState;
  onToast: (msg: string) => void;
  participants?: string[];
  lumenReceivedAt?: number;
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────
const ChatPanel = forwardRef<ChatPanelHandle, ChatPanelProps>(
  ({ activeRoom, orb, onToast, participants = [], lumenReceivedAt = 0 }, ref) => {

  // ── 기존 state ───────────────────────────────────────────────────────────
  const [currentTime, setCurrentTime]             = useState(Date.now());
  const [realtimeMsgs, setRealtimeMsgs]           = useState<ChatMessage[]>([]);
  const [historicalMsgs, setHistoricalMsgs]       = useState<ChatMessage[]>([]);
  const [msgCursor, setMsgCursor]                 = useState<QueryDocumentSnapshot | null>(null);
  const [hasMoreMessages, setHasMoreMessages]     = useState(false);
  const [isLoadingMoreMsgs, setIsLoadingMoreMsgs] = useState(false);
  const [inputMsg, setInputMsg]                   = useState('');
  const [showGiftModal, setShowGiftModal]         = useState<ChatMessage | null>(null);
  const [giftAmount, setGiftAmount]               = useState('100');
  const [isSending, setIsSending]                 = useState(false);

  // 스팸 방지
  const [mutedUntil, setMutedUntil]   = useState(0);
  const [spamWarnings, setSpamWarnings] = useState(0);
  const recentSentRef = useRef<{ text: string; time: number }[]>([]);

  // ── 이모지 / 매크로 state ─────────────────────────────────────────────────
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMacroModal, setShowMacroModal]   = useState(false);
  const [macroTab, setMacroTab]               = useState<'manual' | 'auto'>('manual');
  const [isMacroEditMode, setIsMacroEditMode] = useState(false);
  const [editingSlot, setEditingSlot]         = useState<number | null>(null);
  const [editText, setEditText]               = useState('');
  const [editTrigger, setEditTrigger]         = useState<AutoTrigger>('');
  const [manualMacros, setManualMacros]       = useState<string[]>(() => loadMacros().manual);
  const [autoMacros, setAutoMacros]           = useState<AutoMacro[]>(() => loadMacros().auto);

  // ── refs ─────────────────────────────────────────────────────────────────
  const scrollRef              = useRef<HTMLDivElement>(null);
  const sessionStartRef        = useRef<number>(Date.now());
  // auto trigger refs (latest value via sync effects)
  const autoMacrosRef          = useRef(autoMacros);
  const mutedUntilRef          = useRef(mutedUntil);
  const activeRoomIdRef        = useRef(activeRoom.id);
  const currentDisplayNameRef  = useRef('');
  const orbLevelRef            = useRef(orb.level);
  const prevParticipantsRef    = useRef<string[]>([]);
  const isInitialPartRef       = useRef(true);
  const lastMyMsgTimeRef       = useRef<number>(Date.now());
  const prevLumenRef           = useRef<number>(lumenReceivedAt);
  const idleTimerRef           = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentDisplayName = orb.nickname || orb.uniqueTag || '익명';

  // 나에게만 보이는 로컬 입장 메시지 (Firestore 미기록)
  const [localEntryMsg, setLocalEntryMsg] = useState<ChatMessage | null>(null);

  // 날짜·시간 포맷 헬퍼
  const formatDateTime = (ts: number) => {
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}.${pad(d.getMonth()+1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const myUid = auth.currentUser?.uid;
  const sessionMsgs = realtimeMsgs
    .filter(m => m.timestamp >= sessionStartRef.current)
    .filter(m => !(m.excludeUserId && m.excludeUserId === myUid));

  const allMessages: ChatMessage[] = [
    ...(localEntryMsg ? [localEntryMsg] : []),
    ...sessionMsgs,
  ].sort((a, b) => a.timestamp - b.timestamp);

  useImperativeHandle(ref, () => ({ getMessages: () => allMessages }));

  // refs 동기화
  useEffect(() => { autoMacrosRef.current         = autoMacros; },         [autoMacros]);
  useEffect(() => { mutedUntilRef.current          = mutedUntil; },         [mutedUntil]);
  useEffect(() => { activeRoomIdRef.current        = activeRoom.id; },      [activeRoom.id]);
  useEffect(() => { currentDisplayNameRef.current  = currentDisplayName; }, [currentDisplayName]);
  useEffect(() => { orbLevelRef.current            = orb.level; },          [orb.level]);

  // ── 자동 매크로 전송 (stable — 모든 변경값을 refs로 접근) ────────────────
  const sendAutoMacro = useCallback(async (trigger: AutoTrigger) => {
    if (!auth.currentUser) return;
    const macro = autoMacrosRef.current.find(m => m.trigger === trigger && m.text.trim());
    if (!macro) return;
    if (mutedUntilRef.current > Date.now()) return;
    const now  = Date.now();
    const text = macro.text.trim();
    try {
      await addDoc(
        collection(db, 'square', 'rooms', 'list', activeRoomIdRef.current, 'messages'),
        {
          userId:    auth.currentUser.uid,
          userName:  currentDisplayNameRef.current,
          userLevel: orbLevelRef.current,
          message:   text,
          timestamp: now,
        }
      );
      lastMyMsgTimeRef.current = now;
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── idle 타이머 (stable) ──────────────────────────────────────────────────
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      sendAutoMacro('idle_3min');
    }, 3 * 60 * 1000);
  }, [sendAutoMacro]);

  // ── 1초 타이머 ───────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── 방 변경: 초기화 + 메시지 구독 + i_enter 트리거 ──────────────────────
  useEffect(() => {
    const entryTs = Date.now();
    sessionStartRef.current = entryTs;
    setHistoricalMsgs([]);
    setMsgCursor(null);
    setShowEmojiPicker(false);
    isInitialPartRef.current = true;
    prevParticipantsRef.current = [];

    // ① 나에게만 보이는 로컬 입장 메시지 (Firestore 미기록)
    const roomLabel = `${activeRoom.icon ? activeRoom.icon + ' ' : ''}${activeRoom.title}`;
    const titleSuffix = activeRoom.title.endsWith('방') ? '' : '방';
    setLocalEntryMsg({
      id: '__local_entry__',
      userId: 'local_entry',
      userName: 'system',
      userLevel: 0,
      message: `${roomLabel}${titleSuffix}에 입장하였습니다.`,
      timestamp: entryTs,
    });

    // ② 다른 사용자에게 보이는 Firestore 시스템 입장 메시지
    if (auth.currentUser) {
      const displayName = currentDisplayNameRef.current || '익명';
      addDoc(
        collection(db, 'square', 'rooms', 'list', activeRoom.id, 'messages'),
        {
          userId: 'system',
          userName: 'system',
          userLevel: 0,
          message: `${displayName}님이 입장하였습니다.`,
          timestamp: entryTs + 1, // localEntryMsg보다 1ms 뒤
          excludeUserId: auth.currentUser.uid, // 입장한 본인에게는 표시 안 함
        }
      ).catch(() => {});
    }

    // i_enter 자동 매크로 (1.5초 후 — 메시지 구독 안정 후)
    const enterTimer = setTimeout(() => sendAutoMacro('i_enter'), 1500);

    // idle 타이머 시작
    resetIdleTimer();

    // 메시지 실시간 구독
    const q = query(
      collection(db, 'square', 'rooms', 'list', activeRoom.id, 'messages'),
      orderBy('timestamp', 'desc'),
      limit(MSG_PAGE_SIZE)
    );
    const unsub = onSnapshot(q, snap => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)).reverse();
      setRealtimeMsgs(msgs);
      setMsgCursor(snap.docs[snap.docs.length - 1] || null);
      setHasMoreMessages(snap.docs.length === MSG_PAGE_SIZE);
    });

    return () => {
      clearTimeout(enterTimer);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      unsub();
    };
  }, [activeRoom.id, sendAutoMacro, resetIdleTimer]);

  // ── 새 메시지 → 하단 스크롤 ─────────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [realtimeMsgs, activeRoom]);

  // ── participants 변화 감지 ────────────────────────────────────────────────
  useEffect(() => {
    if (isInitialPartRef.current) {
      prevParticipantsRef.current = [...participants];
      isInitialPartRef.current = false;
      return;
    }
    const prev  = prevParticipantsRef.current;
    const myUid = auth.currentUser?.uid;
    const entered = participants.filter(uid => !prev.includes(uid) && uid !== myUid);
    const left    = prev.filter(uid => !participants.includes(uid));
    if (entered.length > 0) sendAutoMacro('someone_enters');
    if (left.length > 0)    sendAutoMacro('someone_leaves');
    prevParticipantsRef.current = [...participants];
  }, [participants, sendAutoMacro]);

  // ── 루멘 선물 수신 감지 ──────────────────────────────────────────────────
  useEffect(() => {
    if (lumenReceivedAt > 0 && lumenReceivedAt !== prevLumenRef.current) {
      prevLumenRef.current = lumenReceivedAt;
      sendAutoMacro('received_lumen');
    }
  }, [lumenReceivedAt, sendAutoMacro]);

  // ── 매크로 localStorage 저장 ─────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem(MACRO_KEY, JSON.stringify({ manual: manualMacros, auto: autoMacros }));
  }, [manualMacros, autoMacros]);

  // ── 더 불러오기 ──────────────────────────────────────────────────────────
  const loadMoreMessages = async () => {
    if (!msgCursor || isLoadingMoreMsgs) return;
    setIsLoadingMoreMsgs(true);
    try {
      const q = query(
        collection(db, 'square', 'rooms', 'list', activeRoom.id, 'messages'),
        orderBy('timestamp', 'desc'),
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

  // ── 스팸 감지 ────────────────────────────────────────────────────────────
  const detectSpam = (text: string): boolean => {
    const now = Date.now();
    const buf = recentSentRef.current.filter(m => now - m.time < 30000);
    const flood = buf.filter(m => now - m.time < 8000);
    if (flood.length >= 4) {
      const allUnique = new Set(flood.map(m => m.text)).size === flood.length;
      const allLong   = flood.every(m => m.text.length > 10) && text.length > 10;
      if (!(allUnique && allLong)) return true;
    }
    const repeatCount = buf.filter(m => now - m.time < 25000 && m.text === text).length;
    if (repeatCount >= 2) return true;
    if (text.length <= 3) {
      const shortCount = buf.filter(m => now - m.time < 15000 && m.text.length <= 3).length;
      if (shortCount >= 4) return true;
    }
    return false;
  };

  // ── 메시지 전송 ──────────────────────────────────────────────────────────
  const sendMessage = async () => {
    const text = inputMsg.trim();
    if (!text || !auth.currentUser) return;
    const now = Date.now();
    if (mutedUntil > now) {
      onToast(`채팅 금지 중입니다. (${Math.ceil((mutedUntil - now) / 1000)}초 후 해제)`);
      return;
    }
    if (detectSpam(text)) {
      const next = spamWarnings + 1;
      if (next >= 3) {
        setMutedUntil(now + 60000);
        setSpamWarnings(0);
        setInputMsg('');
        onToast('⛔ 반복적인 메시지로 1분간 채팅이 금지되었습니다.');
      } else {
        setSpamWarnings(next);
        setInputMsg('');
        onToast(
          next === 2
            ? `⚠️ 최종 경고 — 한 번 더 반복되면 1분간 채팅이 금지됩니다. (${next}/3)`
            : `⚠️ 반복·도배성 메시지가 감지되었습니다. 주의해주세요. (${next}/3)`
        );
      }
      return;
    }
    recentSentRef.current = [
      ...recentSentRef.current.filter(m => now - m.time < 30000),
      { text, time: now },
    ];
    try {
      await addDoc(collection(db, 'square', 'rooms', 'list', activeRoom.id, 'messages'), {
        userId: auth.currentUser.uid,
        userName: currentDisplayName,
        userLevel: orb.level,
        message: text,
        timestamp: now,
      });
      setInputMsg('');
      lastMyMsgTimeRef.current = now;
      resetIdleTimer();
    } catch {
      onToast('메시지 전송에 실패했습니다.');
    }
  };

  // ── 루멘 선물 전송 ───────────────────────────────────────────────────────
  const handleGiftLumen = async () => {
    if (isSending) return;
    const amount = parseInt(giftAmount);
    if (isNaN(amount) || amount <= 0) { onToast('전수할 기운의 양이 올바르지 않습니다.'); return; }
    if (orb.points < amount)           { onToast('보유하신 기운이 부족합니다.'); return; }
    if (!showGiftModal || showGiftModal.userId === 'system' || !auth.currentUser) return;
    const target = showGiftModal;
    setIsSending(true);
    setShowGiftModal(null);
    setGiftAmount('100');
    try {
      await spendPoints(amount, 'gift_lumen');
      await addDoc(collection(db, 'users', target.userId, 'inbox'), {
        amount, fromName: currentDisplayName, fromUid: auth.currentUser.uid, timestamp: Date.now()
      });
      await addDoc(collection(db, 'square', 'rooms', 'list', activeRoom.id, 'messages'), {
        userId: 'system', userName: 'SYSTEM', userLevel: 0,
        message: `${currentDisplayName}님이 ${target.userName}님에게 ${amount.toLocaleString()} 루멘을 선물했습니다! ✨`,
        timestamp: Date.now()
      });
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        'orb.giftHistory': arrayUnion({
          id: `sent_${Date.now()}`, type: 'sent',
          targetName: target.userName, amount, timestamp: Date.now(),
        })
      });
      onToast(`${target.userName}님에게 ${amount.toLocaleString()} 루멘을 전수했습니다.`);
    } catch {
      onToast('선물 전송에 실패했습니다.');
    } finally {
      setIsSending(false);
    }
  };

  const formatRemainingTime = (target: number) => {
    const diff = target - currentTime;
    if (diff <= 0) return '소멸 진행 중...';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${h}시간 ${m}분 ${s}초`;
  };

  const formatDate = (target: number) => {
    const d = new Date(target);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${d.getHours()}시 ${d.getMinutes()}분`;
  };

  // ── 매크로 슬롯 편집 저장 ────────────────────────────────────────────────
  const saveEditingSlot = () => {
    if (editingSlot === null) return;
    if (macroTab === 'manual') {
      setManualMacros(prev => { const n = [...prev]; n[editingSlot] = editText; return n; });
    } else {
      setAutoMacros(prev => {
        const n = [...prev];
        n[editingSlot] = { text: editText, trigger: editTrigger };
        return n;
      });
    }
    setEditingSlot(null);
  };

  // ── 수동 매크로 클릭 → 입력창에 삽입 ────────────────────────────────────
  const applyManualMacro = (text: string) => {
    if (!text) return;
    setInputMsg(prev => prev + text);
    setShowMacroModal(false);
  };

  // ── JSX ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── 채팅 메인 컨테이너 ── */}
      <div className="flex-1 min-h-0 flex flex-col max-w-4xl mx-auto w-full glass rounded-t-[3rem] border-x border-t border-white/5 overflow-hidden shadow-2xl relative">

        {/* 행성 소멸 배너 */}
        {activeRoom.deleteAt && (
          <div className="bg-rose-900/80 backdrop-blur-xl border-b border-rose-500/40 px-6 py-4 flex flex-col items-center animate-in slide-in-from-top-full duration-700 z-[80] shadow-lg shrink-0">
            <div className="flex items-center space-x-3 mb-1">
              <span className="text-xl animate-bounce">🌋</span>
              <p className="text-[10px] font-black text-rose-100 uppercase tracking-[0.4em]">Planet Destruction Protocol Active</p>
            </div>
            <p className="text-[13px] font-bold text-white text-center italic">
              "이 행성은 <span className="text-yellow-400 font-black">{formatDate(activeRoom.deleteAt)}</span> 에 소멸됩니다."
            </p>
            <div className="mt-2 flex items-center space-x-3">
              <div className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></div>
              <p className="text-sm font-black text-rose-300 uppercase tracking-widest">REMAINING: {formatRemainingTime(activeRoom.deleteAt)}</p>
            </div>
          </div>
        )}

        {/* 메시지 목록 */}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-8 space-y-6 custom-scroll">
          {/* 입장 메시지 (공지 위) */}
          {localEntryMsg && (
            <div className="flex flex-col items-center space-y-1">
              <p className="text-[9px] text-slate-600 font-bold tracking-widest">
                {formatDateTime(localEntryMsg.timestamp)}
              </p>
              <div className="flex items-center w-full gap-2">
                <div className="flex-1 h-px bg-amber-500/20" />
                <p className="text-[10px] font-black text-amber-400/80 tracking-widest whitespace-nowrap">
                  {localEntryMsg.message}
                </p>
                <div className="flex-1 h-px bg-amber-500/20" />
              </div>
            </div>
          )}

          {/* 공지 메시지 */}
          <div className="flex items-start space-x-4 pt-2 pb-4">
            <div className="w-10 h-10 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-400">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div className="flex flex-col items-start max-w-[80%]">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1.5">Mystic Lotto 공지</span>
              <div className="px-5 py-3 rounded-2xl rounded-tl-none bg-white/5 border border-white/5 text-slate-200 text-sm font-medium leading-relaxed space-y-2">
                <p className="flex"><span className="shrink-0 mr-1.5">•</span><span>전화번호·계좌번호 등 개인정보를 요구받더라도 절대 응하지 마세요. 운영진은 어떠한 경우에도 개인정보를 요청하지 않습니다.</span></p>
                <p className="flex"><span className="shrink-0 mr-1.5">•</span><span>욕설·비방·도배·음란성 발언은 서비스 이용 제한으로 이어질 수 있습니다.</span></p>
                <p className="flex"><span className="shrink-0 mr-1.5">•</span><span>타인의 명예 훼손, 사기·거래 유도 행위는 관계 법령에 따라 처리됩니다.</span></p>
                <p className="flex text-slate-300 font-semibold"><span className="shrink-0 mr-1.5">•</span><span>서로를 존중하는 품격 있는 대화 문화를 함께 만들어 주세요.</span></p>
              </div>
            </div>
          </div>

          {/* 메시지 렌더링 */}
          {allMessages.map(msg => {
            const isMe        = auth.currentUser && msg.userId === auth.currentUser.uid;
            const isSystem    = msg.userId === 'system';
            const isLocalEntry = msg.userId === 'local_entry';

            // 공지 위에서 이미 렌더링 — 루프에서는 건너뜀 (getMessages()에는 포함됨)
            if (isLocalEntry) return null;

            // 시스템 메시지 (입퇴장 공지 등)
            if (isSystem) return (
              <div key={msg.id} className="flex justify-center">
                <p className="text-[9px] font-black text-indigo-400/60 uppercase tracking-widest px-4 py-1.5 bg-indigo-500/5 rounded-full border border-indigo-500/10">
                  {msg.message}
                </p>
              </div>
            );
            return (
              <div key={msg.id} className={`flex items-start space-x-4 ${isMe ? 'flex-row-reverse space-x-reverse' : ''}`}>
                {!isMe && (
                  <div className="relative group cursor-pointer" onClick={() => setShowGiftModal(msg)}>
                    <OrbVisual level={msg.userLevel} className="w-10 h-10 border border-white/10" />
                    <div className="absolute -top-1 -right-1 bg-indigo-600 text-[8px] font-black px-1.5 py-0.5 rounded shadow-lg">LV.{msg.userLevel}</div>
                    <div className="absolute inset-0 bg-yellow-500/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-slate-950 font-black text-[8px]">GIFT</div>
                  </div>
                )}
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">{msg.userName}</span>
                  <div className={`px-5 py-3 rounded-2xl text-sm font-medium ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white/5 border border-white/5 text-slate-200 rounded-tl-none'}`}>
                    {msg.message}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 이모지 피커 (인라인 — 입력창 위에 슬라이드) */}
        {showEmojiPicker && (
          <div className="shrink-0 bg-slate-900/95 border-t border-white/10 px-3 py-2">
            <div className="grid grid-cols-10 gap-0.5">
              {EMOJI_LIST.map(emoji => (
                <button
                  key={emoji}
                  className="text-xl leading-none p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  onClick={() => setInputMsg(prev => prev + emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 입력 영역 */}
        {mutedUntil > currentTime ? (
          <div className="shrink-0 p-5 bg-slate-950/80 border-t border-rose-500/20 flex items-center justify-center space-x-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-rose-400 shrink-0">
              <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
            </svg>
            <p className="text-sm font-black text-rose-400 uppercase tracking-widest">
              채팅 금지 중 — {Math.ceil((mutedUntil - currentTime) / 1000)}초 후 해제
            </p>
          </div>
        ) : (
          <div className={`shrink-0 px-3 py-3 bg-slate-950/80 border-t flex items-center gap-2 transition-colors ${spamWarnings > 0 ? 'border-yellow-500/30' : 'border-white/10'}`}>
            {/* 이모지 버튼 */}
            <button
              className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-colors ${showEmojiPicker ? 'bg-indigo-600/40 text-indigo-200' : 'bg-white/5 hover:bg-white/10 text-slate-300'}`}
              onClick={() => setShowEmojiPicker(p => !p)}
              title="이모지"
            >
              😊
            </button>

            {/* 텍스트 입력 */}
            <input
              type="text"
              value={inputMsg}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputMsg(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && sendMessage()}
              placeholder={spamWarnings > 0 ? `⚠️ 경고 ${spamWarnings}/3 — 반복 시 채팅 금지` : '운명의 메시지를 입력하세요...'}
              className={`flex-1 bg-white/5 border rounded-xl px-4 py-3 text-sm focus:outline-none transition-all text-white ${spamWarnings > 0 ? 'border-yellow-500/40 placeholder-yellow-600' : 'border-white/10 focus:border-indigo-500'}`}
            />

            {/* 전송 버튼 */}
            <button
              onClick={sendMessage}
              className="shrink-0 w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg hover:bg-indigo-500 transition-all active:scale-95"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </button>

            {/* 매크로 버튼 */}
            <button
              className="shrink-0 w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              onClick={() => { setShowMacroModal(true); setIsMacroEditMode(false); setEditingSlot(null); }}
              title="매크로"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* ── 매크로 모달 (fixed overlay) ── */}
      {showMacroModal && (
        <div className="fixed inset-0 z-[5000] flex items-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => { setShowMacroModal(false); setIsMacroEditMode(false); setEditingSlot(null); }}
          />
          <div className="relative w-full max-w-[640px] mx-auto bg-slate-900 border border-white/10 border-b-0 rounded-t-3xl shadow-2xl overflow-hidden">

            {/* 헤더 */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <h3 className="text-sm font-black text-white uppercase tracking-widest">매크로</h3>
              <div className="flex items-center gap-3">
                <button
                  className={`text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-colors ${isMacroEditMode ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                  onClick={() => { setIsMacroEditMode(p => !p); setEditingSlot(null); }}
                >
                  {isMacroEditMode ? '완료' : '편집'}
                </button>
                <button
                  className="text-slate-400 hover:text-white transition-colors"
                  onClick={() => { setShowMacroModal(false); setIsMacroEditMode(false); setEditingSlot(null); }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* 탭 */}
            <div className="flex px-6 gap-2 mb-3">
              {(['manual', 'auto'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => { setMacroTab(tab); setEditingSlot(null); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${macroTab === tab ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                >
                  {tab === 'manual' ? '수동 매크로' : '자동 매크로'}
                </button>
              ))}
            </div>

            {/* 매크로 그리드 */}
            <div className="px-6 grid grid-cols-2 gap-2 mb-3">
              {macroTab === 'manual'
                ? manualMacros.map((text, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (isMacroEditMode) { setEditingSlot(i); setEditText(text); }
                        else applyManualMacro(text);
                      }}
                      className={`min-h-[52px] px-3 py-2 rounded-xl border text-left transition-colors ${
                        editingSlot === i
                          ? 'border-indigo-500 bg-indigo-600/20'
                          : text
                            ? 'border-white/10 bg-white/5 hover:bg-white/10'
                            : isMacroEditMode
                              ? 'border-dashed border-white/10 hover:border-white/30'
                              : 'border-dashed border-white/8 cursor-default'
                      }`}
                    >
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">
                        #{i + 1}{isMacroEditMode ? ' · 편집' : ''}
                      </p>
                      <p className={`text-xs leading-snug truncate ${text ? 'text-slate-200' : 'text-slate-600 italic'}`}>
                        {text || '빈 슬롯'}
                      </p>
                    </button>
                  ))
                : autoMacros.map((macro, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (isMacroEditMode) { setEditingSlot(i); setEditText(macro.text); setEditTrigger(macro.trigger); }
                      }}
                      className={`min-h-[52px] px-3 py-2 rounded-xl border text-left transition-colors ${
                        editingSlot === i
                          ? 'border-indigo-500 bg-indigo-600/20'
                          : macro.text
                            ? 'border-white/10 bg-white/5'
                            : 'border-dashed border-white/10'
                      } ${!isMacroEditMode ? 'cursor-default' : 'hover:bg-white/10'}`}
                    >
                      <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">#{i + 1}</p>
                        {macro.trigger && (
                          <span className="text-[9px] bg-purple-600/30 text-purple-300 px-1.5 py-0.5 rounded font-bold leading-tight">
                            {AUTO_TRIGGER_LABELS[macro.trigger]}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs leading-snug truncate ${macro.text ? 'text-slate-200' : 'text-slate-600 italic'}`}>
                        {macro.text || '빈 슬롯'}
                      </p>
                    </button>
                  ))
              }
            </div>

            {/* 편집 패널 (슬롯 선택 시) */}
            {isMacroEditMode && editingSlot !== null && (
              <div className="px-6 pb-5 border-t border-white/10 pt-4 space-y-3">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                  슬롯 #{editingSlot + 1} 편집
                </p>
                <textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  placeholder="매크로 텍스트 입력..."
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
                {macroTab === 'auto' && (
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">자동 발동 조건</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {ALL_TRIGGERS.map(t => (
                        <button
                          key={t}
                          onClick={() => setEditTrigger(t)}
                          className={`py-2 px-3 rounded-lg text-[11px] font-bold transition-colors text-left ${editTrigger === t ? 'bg-purple-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                        >
                          {AUTO_TRIGGER_LABELS[t]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => setEditingSlot(null)} className="flex-1 py-2.5 bg-white/5 text-slate-300 rounded-xl text-sm font-bold">취소</button>
                  <button onClick={saveEditingSlot} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold">저장</button>
                </div>
              </div>
            )}

            {/* 자동 매크로 안내 (편집 모드 아닐 때) */}
            {macroTab === 'auto' && !isMacroEditMode && editingSlot === null && (
              <p className="px-6 pb-5 text-[11px] text-slate-500 font-medium text-center">
                자동 매크로는 설정된 조건에서 자동으로 전송됩니다. 편집 버튼을 눌러 설정하세요.
              </p>
            )}

            <div className="h-5"></div>
          </div>
        </div>
      )}

      {/* ── 선물 모달 ── */}
      {showGiftModal && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowGiftModal(null)}></div>
          <div className="relative glass p-10 rounded-[3rem] border border-yellow-500/20 w-full text-center animate-in zoom-in-95 duration-300">
            <div className="text-4xl mb-6">🎁</div>
            <h3 className="text-2xl font-mystic font-black text-yellow-500 mb-2 uppercase tracking-widest">Transmit Essence</h3>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-8 italic">{showGiftModal.userName}님에게 기운을 전수합니다.</p>
            <div className="space-y-6">
              <div className="flex items-center bg-slate-950/50 border border-slate-800 rounded-2xl p-2">
                <button onClick={() => setGiftAmount(Math.max(100, parseInt(giftAmount) - 100).toString())} className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-slate-400 hover:text-white">-</button>
                <input type="number" value={giftAmount} onChange={e => setGiftAmount(e.target.value)} className="flex-1 bg-transparent text-center font-black text-2xl text-white outline-none tabular-nums"/>
                <button onClick={() => setGiftAmount((parseInt(giftAmount) + 100).toString())} className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-slate-400 hover:text-white">+</button>
              </div>
              <button onClick={handleGiftLumen} className="w-full py-5 bg-yellow-600 text-slate-950 font-black rounded-2xl shadow-xl uppercase tracking-widest text-sm">루멘 전수하기</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

ChatPanel.displayName = 'ChatPanel';
export default ChatPanel;

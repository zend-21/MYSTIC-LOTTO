
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, OrbState, ChatRoom, COST_ROOM_CREATE } from '../types';
import { OrbVisual } from './FortuneOrb';
import { spendPoints } from '../services/geminiService';
import BoardPanel from './square/BoardPanel';
import ChatPanel, { ChatPanelHandle } from './square/ChatPanel';

const SUPER_ADMIN_UID = import.meta.env.VITE_SUPER_ADMIN_UID as string;

const ROOM_ICONS = [
  // 우주/천체
  '🌌','🪐','⭐','🌟','💫','✨','🌠','🌙','☀️','🌞','🌛','🌜','🌝','🌑','🌕','☄️','🔭','🛸','🚀','🌍','🌎','🌏','🌒','🌓','🌔','🌖','🌗','🌘',
  // 자연/날씨
  '🌊','🌋','🏔️','🌸','🌺','🌻','🌹','🌷','🌿','🍀','🌱','🌲','🌳','🌴','🍁','🍂','🍃','🌾','🌈','⛰️','🗻','🏝️','🏕️','🌬️','❄️','⛄','🌪️','🌫️','🌧️','⛈️','🌤️','🌊','🌙','🍄','🪸','🪨','🌵','🌾',
  // 동물
  '🦁','🐯','🐺','🦊','🐻','🐼','🐨','🦋','🦅','🦉','🐉','🦄','🐬','🦭','🐋','🦈','🦜','🦚','🦩','🦢','🕊️','🦤','🦝','🐸','🦎','🐊','🦕','🦖','🐙','🦑','🦞','🦀','🐡','🐠','🐟','🐧','🦭','🐘','🦏','🦛','🦒','🦓','🦌','🐃','🦬','🐂','🐄','🐎','🦙','🐑','🐐','🦘','🦥','🦦','🦡','🐿️','🦔',
  // 마법/판타지
  '🔮','🪄','💎','👑','🗡️','🛡️','🧿','🪬','⚗️','🔯','♾️','🌀','🪩','🧲','⚜️','🔱','🏺','🗿','📿','🧬','🪤','🧪','⚙️','🔩','🪙','💰','💍','🪞','🪟','🗝️','🔑',
  // 불/에너지/원소
  '🔥','⚡','💥','💠','💧','🫧','💨','🌪️','☁️','🌊','🧊','🌫️','🌬️','☀️','🌙','⭐',
  // 음식/음료
  '🍎','🍊','🍋','🍇','🍓','🍒','🍑','🥭','🍍','🥥','🌮','🍕','🍜','🍣','🍦','🧁','🎂','🍫','🍬','🍭','🍵','☕','🧋','🍺','🍷','🥂','🍾','🫖','🍯','🥐','🍩','🍪','🌰','🥜',
  // 음악/예술
  '🎸','🎺','🎻','🎹','🥁','🎧','🎵','🎶','🎤','🎨','🖌️','🎭','🎬','🎯','🎲','🎮','🕹️','🃏','🎴','♟️','🧩','🪀','🪁','🎠','🎡','🎢','🎪',
  // 스포츠/활동
  '⚽','🏀','🎾','🏐','🏈','🎱','🏓','🏸','🥊','🤺','⛷️','🏄','🧗','🏇','🚴','🤸','🏊','🤽','🚣','🧘','🎽','🥋','🛹','🛷','⛸️',
  // 탈것/이동
  '✈️','🚀','🛸','🚂','🚢','🛳️','⛵','🏎️','🚁','🛩️','🚃','🚄','🚅','🚇','🚊','🛺','🏍️','🛵','🚲','🛴','🚡','🚠','🚟',
  // 건물/장소
  '🏰','🗼','🗽','⛩️','🕌','🛕','🏯','🎠','🕍','⛪','🏛️','🏟️','🎭','🗺️','🗾','🏔️','🌁','🌃','🌆','🌇','🌉',
  // 얼굴/캐릭터
  '😊','😎','🤩','😇','🥳','😈','👾','🤖','👻','💀','🎃','👽','🥸','🤠','🥷','🧙','🧝','🧜','🧚','🧛','🧟','🤡','👹','👺','💩','🙈','🙉','🙊',
  // 하트/감정
  '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','❤️‍🔥','💝','💖','💗','💓','💞','💕','💟','❣️','💔','🫀','💋',
  // 기호/문양
  '☮️','☯️','♾️','⚛️','🕉️','✡️','☦️','🌐','🔆','🔅','♻️','⚜️','🔱','📛','🔰','⭕','✅','❎','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤',
];

// Firebase imports
import { db, auth, rtdb } from '../services/firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, deleteDoc, orderBy, limit, getDocs, getDoc, startAfter, QueryDocumentSnapshot, arrayUnion } from "firebase/firestore";
import { ref as rtdbRef, set as rtdbSet, remove as rtdbRemove, onDisconnect, onValue, get as rtdbGet } from 'firebase/database';

interface CelestialSquareProps {
  profile: UserProfile;
  orb: OrbState;
  onUpdatePoints: (amount: number) => void;
  onUpdateFavorites: (roomIds: string[]) => void;
  onBack: () => void;
  onToast: (msg: string) => void;
  onGrowFromPost?: () => void;
  isAdmin?: boolean;
}

const LIST_PAGE_SIZE = 30;

const CelestialSquare: React.FC<CelestialSquareProps> = ({ profile, orb, onUpdatePoints, onUpdateFavorites, onBack, onToast, onGrowFromPost, isAdmin }) => {
  const [view, setView] = useState<'lounge' | 'chat' | 'board' | 'post-detail' | 'post-edit'>('lounge');
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);

  // 참여자 목록 (RTDB presence 기반)
  const [participants, setParticipants] = useState<{ uid: string; name: string; uniqueTag: string; level: number }[]>([]);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const chatPanelRef = useRef<ChatPanelHandle>(null);

  // 선물 수신 불가 UID (최고관리자 + 부관리자)
  const [privilegedUids, setPrivilegedUids] = useState<Set<string>>(new Set([SUPER_ADMIN_UID]));

  // 방 목록 (실시간 최신 + 이전 페이지)
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [lastRoomDoc, setLastRoomDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [olderRooms, setOlderRooms] = useState<ChatRoom[]>([]);
  const [hasMoreRooms, setHasMoreRooms] = useState(false);
  const [isLoadingMoreRooms, setIsLoadingMoreRooms] = useState(false);

  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState('');

  // 행성 관리 메뉴 상태
  const [showRoomMenu, setShowRoomMenu] = useState(false);
  const [showDestroyConfirm, setShowDestroyConfirm] = useState(false);
  const [showInstantDestroyConfirm, setShowInstantDestroyConfirm] = useState(false);

  // 행성명 수정 모달 상태
  const [showEditRoomModal, setShowEditRoomModal] = useState(false);
  const [editRoomTitle, setEditRoomTitle] = useState('');
  const [editRoomIcon, setEditRoomIcon] = useState('🪐');

  // 참여자 목록 선물 모달 상태
  const [giftTarget, setGiftTarget] = useState<{ uid: string; name: string; uniqueTag: string; level: number } | null>(null);
  const [giftAmount, setGiftAmount] = useState('100');
  const [isGiftSending, setIsGiftSending] = useState(false);

  // 아이콘 선택 상태
  const [newRoomIcon, setNewRoomIcon] = useState('🪐');
  const [showIconPicker, setShowIconPicker] = useState<'create' | string | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentDisplayName = orb.nickname || orb.uniqueTag || '익명';

  const loadMoreRooms = async () => {
    if (!lastRoomDoc || isLoadingMoreRooms) return;
    setIsLoadingMoreRooms(true);
    try {
      const q = query(
        collection(db, "square", "rooms", "list"),
        orderBy("createdAt", "desc"),
        startAfter(lastRoomDoc),
        limit(LIST_PAGE_SIZE)
      );
      const snap = await getDocs(q);
      const more = snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatRoom));
      setOlderRooms(prev => [...prev, ...more]);
      setLastRoomDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMoreRooms(snap.docs.length === LIST_PAGE_SIZE);
    } finally {
      setIsLoadingMoreRooms(false);
    }
  };

  // 부관리자 UID 목록 로드 (마운트 시 1회)
  useEffect(() => {
    getDoc(doc(db, "config", "subAdmins")).then(snap => {
      if (snap.exists()) {
        const uids = new Set([SUPER_ADMIN_UID, ...Object.keys(snap.data())]);
        setPrivilegedUids(uids);
      }
    }).catch(() => {});
  }, []);

  // Real-time listener for Rooms (라운지 화면일 때만 구독)
  useEffect(() => {
    if (view !== 'lounge') return;
    setOlderRooms([]);
    setLastRoomDoc(null);
    const q = query(collection(db, "square", "rooms", "list"), orderBy("createdAt", "desc"), limit(LIST_PAGE_SIZE));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = Date.now();
      const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
      const allRooms = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChatRoom));

      allRooms.forEach(room => {
        if (room.deleteAt && room.deleteAt <= now) {
          deleteDoc(doc(db, "square", "rooms", "list", room.id)).catch(() => {});
          return;
        }
        const lastActivity = room.lastEnteredAt ?? room.createdAt;
        if (!room.deleteAt && (room.participantCount ?? 0) === 0 && lastActivity < now - THREE_DAYS) {
          deleteDoc(doc(db, "square", "rooms", "list", room.id)).catch(() => {});
        }
      });

      const filtered = allRooms.filter(r => {
        if (r.deleteAt && r.deleteAt <= now) return false;
        const lastActivity = r.lastEnteredAt ?? r.createdAt;
        if (!r.deleteAt && (r.participantCount ?? 0) === 0 && lastActivity < now - THREE_DAYS) return false;
        return true;
      });
      setRooms(filtered);
      const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
      setLastRoomDoc(lastDoc);
      setHasMoreRooms(snapshot.docs.length === LIST_PAGE_SIZE);
    });
    return () => unsubscribe();
  }, [view]);

  // 입퇴장 실시간 카운트 — RTDB onDisconnect 방식
  useEffect(() => {
    if (view !== 'chat' || !activeRoom || !auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const roomRef = doc(db, "square", "rooms", "list", activeRoom.id);
    const presenceRef = rtdbRef(rtdb, `presence/${activeRoom.id}/${uid}`);
    const roomPresenceRef = rtdbRef(rtdb, `presence/${activeRoom.id}`);

    rtdbSet(presenceRef, { name: currentDisplayName, uniqueTag: orb.uniqueTag || '', level: orb.level }).catch(() => {});
    onDisconnect(presenceRef).remove();
    updateDoc(roomRef, { lastEnteredAt: Date.now() }).catch(() => {});

    const unsubPresence = onValue(roomPresenceRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val() as Record<string, { name: string; uniqueTag: string; level: number }>;
        const list = Object.entries(data).map(([uid, info]) => ({
          uid,
          name: info.name || '익명',
          uniqueTag: info.uniqueTag || '',
          level: info.level || 1,
        }));
        setParticipants(list);
        updateDoc(roomRef, { participantCount: list.length }).catch(() => {});
      } else {
        setParticipants([]);
        updateDoc(roomRef, { participantCount: 0 }).catch(() => {});
      }
    });

    return () => {
      unsubPresence();
      setParticipants([]);
      rtdbRemove(presenceRef)
        .then(() => rtdbGet(roomPresenceRef))
        .then((snap) => {
          const count = snap.exists() ? Object.keys(snap.val() || {}).length : 0;
          updateDoc(roomRef, { participantCount: count }).catch(() => {});
        })
        .catch(() => {});
    };
  }, [view, activeRoom?.id]);

  // 대화방 정보 실시간 동기화 (소멸 배너 표시용)
  useEffect(() => {
    if (!activeRoom) return;
    const roomRef = doc(db, "square", "rooms", "list", activeRoom.id);
    const unsubscribe = onSnapshot(roomRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as ChatRoom;
        setActiveRoom(prev => prev ? { ...prev, ...data } : null);
      }
    });
    return () => unsubscribe();
  }, [activeRoom?.id]);

  const toggleFavorite = (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    const favorites = orb.favoriteRoomIds || [];
    if (favorites.includes(roomId)) {
      onUpdateFavorites(favorites.filter(id => id !== roomId));
      onToast("즐겨찾기가 해제되었습니다.");
    } else {
      if (favorites.length >= 5) {
        onToast("즐겨찾기는 최대 5개까지만 가능합니다.");
        return;
      }
      onUpdateFavorites([...favorites, roomId]);
      onToast("천상의 즐겨찾기에 등록되었습니다.");
    }
  };

  const handleCreateRoom = async () => {
    if (!newRoomTitle.trim() || !auth.currentUser) return;
    if (orb.points < COST_ROOM_CREATE) {
      onToast("방을 개설할 기운(루멘)이 부족합니다.");
      return;
    }

    try {
      const roomData = {
        title: newRoomTitle,
        creatorName: currentDisplayName,
        creatorId: auth.currentUser.uid,
        participantCount: 0,
        createdAt: Date.now(),
        isPermanent: true,
        icon: newRoomIcon,
      };
      const docRef = await addDoc(collection(db, "square", "rooms", "list"), roomData);
      await spendPoints(COST_ROOM_CREATE, 'room_create');
      setActiveRoom({ id: docRef.id, ...roomData });
      setView('chat');
      setIsCreatingRoom(false);
      setNewRoomTitle('');
      setNewRoomIcon('🪐');
      onToast(`'${newRoomTitle}' 행성이 탄생했습니다. 영구히 보존됩니다.`);
    } catch {
      onToast("행성 창조에 실패했습니다.");
    }
  };

  const handleSelectIcon = async (icon: string) => {
    if (showIconPicker === 'create') {
      setNewRoomIcon(icon);
      setShowIconPicker(null);
    } else if (showIconPicker === 'edit') {
      setEditRoomIcon(icon);
      setShowIconPicker(null);
    } else if (showIconPicker) {
      try {
        const roomRef = doc(db, "square", "rooms", "list", showIconPicker);
        await updateDoc(roomRef, { icon });
        setShowIconPicker(null);
        onToast("행성 아이콘이 변경되었습니다.");
      } catch {
        onToast("아이콘 변경에 실패했습니다.");
      }
    }
  };

  const handleIconPressStart = (e: React.MouseEvent | React.TouchEvent, roomId: string) => {
    e.preventDefault();
    e.stopPropagation();
    longPressTimerRef.current = setTimeout(() => {
      setShowIconPicker(roomId);
    }, 600);
  };

  const handleIconPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTriggerDeletion = async () => {
    if (!activeRoom || !auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const isCreator = activeRoom.creatorId === uid;
    const isAdmin = uid === SUPER_ADMIN_UID;
    if (!isCreator && !isAdmin) return;
    try {
      const deleteAt = Date.now() + (24 * 60 * 60 * 1000);
      const roomRef = doc(db, "square", "rooms", "list", activeRoom.id);
      await updateDoc(roomRef, { deleteAt });
      await addDoc(collection(db, "square", "rooms", "list", activeRoom.id, "messages"), {
        userId: "system",
        userName: "SYSTEM",
        userLevel: 0,
        message: "행성의 성주에 의해 행성 소멸 의식이 시작되었습니다. 24시간 후 이 행성은 소멸됩니다.",
        timestamp: Date.now()
      });
      setShowDestroyConfirm(false);
      setShowRoomMenu(false);
      onToast("행성 소멸 의식이 거행되었습니다.");
    } catch {
      onToast("의식 집행에 실패했습니다.");
    }
  };

  const handleInstantDeletion = async () => {
    if (!activeRoom || !auth.currentUser) return;
    if (activeRoom.creatorId !== auth.currentUser.uid) return;
    if (orb.points < 1000) {
      onToast("루멘이 부족합니다. 즉시 소멸에는 1,000루멘이 필요합니다.");
      setShowInstantDestroyConfirm(false);
      return;
    }
    try {
      const roomRef = doc(db, "square", "rooms", "list", activeRoom.id);
      await deleteDoc(roomRef);
      await spendPoints(1000, 'instant_destroy');
      setShowInstantDestroyConfirm(false);
      setActiveRoom(null);
      setView('lounge');
      onToast("행성이 즉시 소멸되었습니다.");
    } catch {
      onToast("소멸 의식에 실패했습니다.");
    }
  };

  // 대화내용 갈무리 저장
  const handleSaveCapture = async () => {
    if (!auth.currentUser || !activeRoom) return;
    setShowRoomMenu(false);
    const messages = chatPanelRef.current?.getMessages() || [];
    try {
      await addDoc(collection(db, "users", auth.currentUser.uid, "chatCaptures"), {
        savedAt: Date.now(),
        roomId: activeRoom.id,
        roomName: activeRoom.title,
        creatorName: activeRoom.creatorName,
        participants: participants.map(p => ({ uid: p.uid, name: p.name, uniqueTag: p.uniqueTag })),
        messages: messages.map(m => ({
          userId: m.userId,
          userName: m.userName,
          message: m.message,
          timestamp: m.timestamp,
        })),
      });
      onToast("대화내용이 갈무리되었습니다.");
    } catch {
      onToast("갈무리 저장에 실패했습니다.");
    }
  };

  // 행성명/아이콘 수정
  const handleEditRoom = async () => {
    if (!activeRoom || !auth.currentUser) return;
    if (!editRoomTitle.trim()) { onToast("행성명을 입력해주세요."); return; }
    const renameCount = activeRoom.renameCount ?? 0;
    const cost = renameCount >= 1 ? 500 : 0;
    if (cost > 0 && orb.points < cost) {
      onToast("루멘이 부족합니다. 행성명 수정에는 500루멘이 필요합니다.");
      return;
    }
    try {
      const roomRef = doc(db, "square", "rooms", "list", activeRoom.id);
      await updateDoc(roomRef, {
        title: editRoomTitle,
        icon: editRoomIcon,
        renameCount: renameCount + 1,
      });
      if (cost > 0) await spendPoints(cost, 'room_rename');
      setShowEditRoomModal(false);
      onToast(cost > 0 ? `행성명이 변경되었습니다. (500루멘 소모)` : "행성명이 변경되었습니다.");
    } catch {
      onToast("행성명 변경에 실패했습니다.");
    }
  };

  // 참여자 목록 → 루멘 선물
  const handleGiftToParticipant = async () => {
    if (isGiftSending || !giftTarget || !auth.currentUser) return;
    if (privilegedUids.has(giftTarget.uid)) { onToast("관리자에게는 루멘을 선물할 수 없습니다."); setGiftTarget(null); return; }
    const amount = parseInt(giftAmount);
    if (isNaN(amount) || amount <= 0) { onToast("전수할 기운의 양이 올바르지 않습니다."); return; }
    if (orb.points < amount) { onToast("보유하신 기운이 부족합니다."); return; }
    setIsGiftSending(true);
    const target = giftTarget;
    setGiftTarget(null);
    setGiftAmount('100');
    try {
      await spendPoints(amount, 'gift_lumen');
      await addDoc(collection(db, "users", target.uid, "inbox"), {
        amount,
        fromName: currentDisplayName,
        fromUid: auth.currentUser.uid,
        timestamp: Date.now(),
      });
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        "orb.giftHistory": arrayUnion({
          id: `sent_${Date.now()}`,
          type: 'sent',
          targetName: target.name,
          amount,
          timestamp: Date.now(),
        }),
      });
      if (activeRoom) {
        await addDoc(collection(db, "square", "rooms", "list", activeRoom.id, "messages"), {
          userId: "system",
          userName: "SYSTEM",
          userLevel: 0,
          message: `${currentDisplayName}님이 ${target.name}님에게 ${amount.toLocaleString()} 루멘을 선물했습니다! ✨`,
          timestamp: Date.now(),
        });
      }
      onToast(`${target.name}님에게 ${amount.toLocaleString()} 루멘을 전수했습니다.`);
    } catch {
      onToast("선물 전송에 실패했습니다.");
    } finally {
      setIsGiftSending(false);
    }
  };

  // 즐겨찾기 우선 정렬
  const sortedRooms = [...rooms].sort((a, b) => {
    const aFav = (orb.favoriteRoomIds || []).includes(a.id);
    const bFav = (orb.favoriteRoomIds || []).includes(b.id);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    return b.createdAt - a.createdAt;
  });
  const allRoomsDisplay = [...sortedRooms, ...olderRooms];

  const isBoardView = view === 'board' || view === 'post-detail' || view === 'post-edit';

  return (
    <div className="fixed inset-0 z-[5000] bg-[#020617] text-slate-200 flex flex-col animate-dimension-shift">
      <header className="relative z-[100] border-b border-white/5 px-8 py-6 flex justify-between items-center shrink-0 shadow-2xl">
        <div className="absolute inset-0 bg-white/[0.02] backdrop-blur-3xl -z-10 pointer-events-none" />
        <div className="flex items-center space-x-6">
          <button
            onClick={() => {
              if (view === 'lounge') onBack();
              else if (view === 'post-detail' || view === 'post-edit') setView('board');
              else setView('lounge');
            }}
            className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div className="flex flex-col">
            <h2 className="text-xl font-mystic font-black text-white tracking-widest leading-none uppercase">
              {view === 'lounge' ? 'Celestial Square' : view === 'chat' ? `${activeRoom?.icon ? activeRoom.icon + ' ' : ''}${activeRoom?.title} (${participants.length})` : 'Resonance Board'}
            </h2>
            <div className="flex items-center space-x-3 mt-1.5">
               <button onClick={() => setView('lounge')} className={`text-[9px] font-black uppercase tracking-widest ${view === 'lounge' || view === 'chat' ? 'text-indigo-400' : 'text-slate-500'}`}>Lounge</button>
               <span className="text-slate-800 text-[8px]">/</span>
               <button onClick={() => setView('board')} className={`text-[9px] font-black uppercase tracking-widest ${isBoardView ? 'text-emerald-400' : 'text-slate-500'}`}>회람판</button>
               {(view === 'post-detail' || view === 'post-edit') && (
                 <>
                   <span className="text-slate-800 text-[8px]">/</span>
                   <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">
                     {view === 'post-edit' ? '편집' : '게시글'}
                   </span>
                 </>
               )}
            </div>
          </div>
        </div>
        <div className="text-right flex items-center space-x-6">
           <div className="hidden sm:block">
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">My Resonance</p>
              <p className="text-lg font-mystic font-black text-yellow-500">{orb.points.toLocaleString()} L</p>
           </div>

           {view === 'chat' && (
             <div className="relative">
                <button onClick={() => setShowRoomMenu(!showRoomMenu)} className="w-10 h-10 rounded-xl bg-white/10 flex flex-col items-center justify-center space-y-1 hover:bg-white/20 transition-all border border-white/10">
                   <div className="w-1 h-1 bg-white rounded-full"></div>
                   <div className="w-1 h-1 bg-white rounded-full"></div>
                   <div className="w-1 h-1 bg-white rounded-full"></div>
                </button>
                {showRoomMenu && (
                  <>
                    <div className="fixed inset-0 bg-transparent z-[150]" onClick={() => setShowRoomMenu(false)}></div>
                    <div className="absolute top-full right-0 mt-3 w-52 bg-slate-900 border border-indigo-500/30 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[200] p-2 animate-in fade-in zoom-in-95 duration-200">
                       <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-4 py-2 border-b border-white/5 mb-1">Planet Control</p>
                       <button onClick={() => { onToast("알림 설정이 변경되었습니다."); setShowRoomMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-white/5 text-[10px] font-bold text-slate-300 transition-colors flex items-center space-x-2"><span>🛎️</span><span>알림 끄기</span></button>
                       <button onClick={() => { setShowParticipantsModal(true); setShowRoomMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-white/5 text-[10px] font-bold text-slate-300 transition-colors flex items-center space-x-2"><span>👥</span><span>참여자 목록</span></button>
                       <button onClick={handleSaveCapture} className="w-full text-left p-3 rounded-xl hover:bg-white/5 text-[10px] font-bold text-slate-300 transition-colors flex items-center space-x-2"><span>🗂️</span><span>대화내용 저장</span></button>
                       {activeRoom && auth.currentUser && activeRoom.creatorId === auth.currentUser.uid && (
                         <button onClick={() => { setEditRoomTitle(activeRoom.title); setEditRoomIcon(activeRoom.icon || '🪐'); setShowEditRoomModal(true); setShowRoomMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-white/5 text-[10px] font-bold text-slate-300 transition-colors flex items-center space-x-2">
                           <span>✏️</span>
                           <span>행성명 수정 {(activeRoom.renameCount ?? 0) >= 1 ? '(500L)' : '(무료)'}</span>
                         </button>
                       )}
                       {activeRoom && auth.currentUser && (() => {
                         const uid = auth.currentUser!.uid;
                         const isAdmin = uid === SUPER_ADMIN_UID;
                         const isCreator = activeRoom.creatorId === uid;
                         return (isCreator || isAdmin) ? (
                           <>
                             {!activeRoom.deleteAt && (
                               <button onClick={() => { setShowDestroyConfirm(true); setShowRoomMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-rose-900/40 text-[10px] font-black text-rose-400 transition-colors flex items-center space-x-2 border border-rose-500/10 mt-1"><span>🌋</span><span>행성 소멸(24H)</span></button>
                             )}
                             {isCreator && (
                               <button onClick={() => { setShowInstantDestroyConfirm(true); setShowRoomMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-orange-900/40 text-[10px] font-black text-orange-400 transition-colors flex items-center space-x-2 border border-orange-500/10 mt-1"><span>⚡</span><span>행성 소멸(즉시) (+1000L)</span></button>
                             )}
                           </>
                         ) : null;
                       })()}
                    </div>
                  </>
                )}
             </div>
           )}
           <OrbVisual level={orb.level} className="w-10 h-10 border border-white/10" />
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative z-10 flex flex-col">
        {/* 라운지 (방 목록) */}
        {view === 'lounge' && (
          <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 custom-scroll">
            <div className="max-w-5xl mx-auto space-y-8">
              <div className="flex justify-between items-end border-b border-white/5 pb-6">
                <div className="space-y-1">
                   <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.4em]">Permanent Cosmic Hubs</h3>
                   <p className="text-[10px] text-indigo-400 italic font-medium">개설된 행성은 소멸 전까지는 유지됩니다.</p>
                </div>
                <button onClick={() => setIsCreatingRoom(true)} className="px-8 py-3.5 bg-indigo-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all active:scale-95">행성 창조하기 (1,000 L)</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allRoomsDisplay.map(room => {
                  const isFav = (orb.favoriteRoomIds || []).includes(room.id);
                  const isDying = !!room.deleteAt;
                  return (
                    <div
                      key={room.id}
                      onClick={() => { setActiveRoom(room); setView('chat'); }}
                      className={`glass p-8 rounded-[2.5rem] text-left group transition-all duration-500 relative overflow-hidden flex flex-col justify-between h-56 border cursor-pointer ${isFav ? 'border-yellow-500/40 bg-yellow-500/5' : isDying ? 'border-rose-500/40 bg-rose-500/5' : 'border-white/5 hover:border-indigo-500/40'}`}
                    >
                      {isFav && !isDying && <div className="absolute -top-1 -right-1 w-20 h-20 bg-yellow-500/10 blur-2xl rounded-full"></div>}
                      {isDying && <div className="absolute inset-0 bg-gradient-to-t from-rose-950/20 to-transparent animate-pulse"></div>}

                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                           {(() => {
                             const isCreator = auth.currentUser?.uid === room.creatorId;
                             return (
                               <div
                                 className={`w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform select-none ${isCreator && !isDying ? 'cursor-pointer active:scale-95' : ''}`}
                                 onMouseDown={isCreator && !isDying ? (e) => handleIconPressStart(e, room.id) : undefined}
                                 onMouseUp={isCreator && !isDying ? handleIconPressEnd : undefined}
                                 onMouseLeave={isCreator && !isDying ? handleIconPressEnd : undefined}
                                 onTouchStart={isCreator && !isDying ? (e) => handleIconPressStart(e, room.id) : undefined}
                                 onTouchEnd={isCreator && !isDying ? handleIconPressEnd : undefined}
                                 title={isCreator && !isDying ? "길게 누르면 아이콘 변경" : undefined}
                               >
                                 <span className="text-xl">{isDying ? '🌋' : (room.icon || '⭐')}</span>
                               </div>
                             );
                           })()}
                           {!isDying && (
                             <button onClick={(e) => toggleFavorite(e, room.id)} className={`p-2 rounded-lg transition-colors ${isFav ? 'text-yellow-500' : 'text-slate-600 hover:text-white'}`}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                             </button>
                           )}
                        </div>
                        <h4 className={`text-xl font-black mb-1 group-hover:text-white transition-colors truncate ${isDying ? 'text-rose-200' : isFav ? 'text-yellow-100' : 'text-slate-300'}`}>{room.title}</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">by {room.creatorName}</p>
                        {isDying && <p className="text-[9px] text-rose-500 font-black uppercase mt-2 animate-pulse">Destruction Imminent</p>}
                      </div>
                      <div className="relative z-10 flex justify-between items-center mt-6">
                        <span className={`text-[10px] font-black ${isDying ? 'text-rose-400' : 'text-emerald-500'} bg-white/5 px-3 py-1 rounded-full uppercase tracking-widest`}>{Math.max(0, room.participantCount ?? 0)}명 공명 중</span>
                        <span className="text-[9px] text-slate-600 font-bold">EST. {new Date(room.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {hasMoreRooms && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={loadMoreRooms}
                    disabled={isLoadingMoreRooms}
                    className="px-10 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-50"
                  >
                    {isLoadingMoreRooms ? '탐색 중...' : '더 많은 행성 탐색하기'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 회람판 (BoardPanel이 board/post-detail/post-edit 서브뷰 모두 처리) */}
        {isBoardView && (
          <BoardPanel
            profile={profile}
            orb={orb}
            currentView={view as 'board' | 'post-detail' | 'post-edit'}
            onSetView={(v) => setView(v)}
            onToast={onToast}
            onPostCreated={onGrowFromPost}
            isAdmin={isAdmin}
          />
        )}

        {/* 채팅창 */}
        {view === 'chat' && activeRoom && (
          <ChatPanel
            ref={chatPanelRef}
            activeRoom={activeRoom}
            orb={orb}
            onToast={onToast}
          />
        )}
      </main>

      {/* 행성 소멸 확인 모달 */}
      {showDestroyConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center px-6">
           <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setShowDestroyConfirm(false)}></div>
           <div className="relative glass p-10 rounded-[3rem] border border-rose-500/30 w-full max-w-sm text-center animate-in zoom-in-95 duration-300">
              <div className="text-4xl mb-6">💥</div>
              <h3 className="text-2xl font-black text-rose-400 mb-2 uppercase tracking-widest">Erase Planet</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-8 italic leading-relaxed">
                "확인을 누르면 <span className="text-rose-500 font-black">24시간 후</span>에 이 행성은 소멸됩니다.<br/>계속하시겠습니까?"
              </p>
              <div className="space-y-3">
                 <button onClick={handleTriggerDeletion} className="w-full py-5 bg-rose-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-sm hover:bg-rose-500 transition-all">의식 거행 (Execute)</button>
                 <button onClick={() => setShowDestroyConfirm(false)} className="w-full py-4 bg-white/5 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-[10px] hover:bg-white/10">보존하기</button>
              </div>
           </div>
        </div>
      )}

      {/* 행성 즉시 소멸 확인 모달 */}
      {showInstantDestroyConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center px-6">
           <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setShowInstantDestroyConfirm(false)}></div>
           <div className="relative glass p-10 rounded-[3rem] border border-orange-500/30 w-full max-w-sm text-center animate-in zoom-in-95 duration-300">
              <div className="text-4xl mb-6">⚡</div>
              <h3 className="text-2xl font-black text-orange-400 mb-2 uppercase tracking-widest">Instant Erase</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-8 italic leading-relaxed">
                "확인을 누르면 이 행성은 <span className="text-orange-400 font-black">즉시 소멸</span>됩니다.<br/>
                <span className="text-yellow-400 font-black">1,000 루멘</span>이 소모되며 되돌릴 수 없습니다."
              </p>
              <div className="space-y-3">
                 <button onClick={handleInstantDeletion} className="w-full py-5 bg-orange-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-sm hover:bg-orange-500 transition-all">즉시 소멸 (1,000 L)</button>
                 <button onClick={() => setShowInstantDestroyConfirm(false)} className="w-full py-4 bg-white/5 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-[10px] hover:bg-white/10">보존하기</button>
              </div>
           </div>
        </div>
      )}

      {/* 방 개설 모달 */}
      {isCreatingRoom && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsCreatingRoom(false)}></div>
          <div className="relative glass p-10 rounded-[3rem] border border-white/10 w-full max-w-sm text-center animate-in zoom-in-95 duration-300">
             <h3 className="text-2xl font-mystic font-black text-white mb-2 uppercase tracking-widest">Create Planet</h3>
             <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-6 italic">새로운 영구 대화의 장을 탄생시킵니다.</p>
             <div className="space-y-4">
                <div className="flex items-center justify-center space-x-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-4xl">{newRoomIcon}</div>
                  <button
                    onClick={() => setShowIconPicker('create')}
                    className="px-5 py-2.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-indigo-500/30 transition-all"
                  >아이콘 선택</button>
                </div>
                <input
                  type="text"
                  value={newRoomTitle}
                  onChange={e => setNewRoomTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateRoom()}
                  placeholder="행성의 이름을 지어주세요"
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-white text-center font-bold focus:border-indigo-500 outline-none"
                />
                <button onClick={handleCreateRoom} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-sm hover:bg-indigo-500 transition-all">탄생시키기 (1,000 L)</button>
             </div>
          </div>
        </div>
      )}

      {/* 참여자 목록 모달 */}
      {showParticipantsModal && activeRoom && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowParticipantsModal(false)}></div>
          <div className="relative glass p-8 rounded-[3rem] border border-indigo-500/20 w-full max-w-sm animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-mystic font-black text-white uppercase tracking-widest">참여자 목록</h3>
                <p className="text-[10px] text-slate-500 font-bold mt-0.5">{participants.length}명 공명 중</p>
              </div>
              <button onClick={() => setShowParticipantsModal(false)} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors text-slate-400">✕</button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto custom-scroll">
              {(() => {
                const creator = participants.find(p => p.uid === activeRoom.creatorId);
                const others = participants.filter(p => p.uid !== activeRoom.creatorId);
                const sorted = creator ? [creator, ...others] : others;
                return sorted.length > 0 ? sorted.map(p => {
                  const isMe = auth.currentUser?.uid === p.uid;
                  const isPrivileged = privilegedUids.has(p.uid);
                  const canGift = !isMe && !isPrivileged;
                  return (
                    <div
                      key={p.uid}
                      onClick={() => { if (canGift) { setGiftTarget(p); setGiftAmount('100'); } }}
                      className={`flex items-center space-x-3 p-3 rounded-2xl bg-white/5 transition-colors ${canGift ? 'cursor-pointer hover:bg-indigo-500/10 active:scale-[0.98]' : 'opacity-60'}`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${p.uid === activeRoom.creatorId ? 'bg-yellow-500/20 text-yellow-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                        {p.uid === activeRoom.creatorId ? '👑' : '🪐'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-white truncate">
                          <span className="text-[10px] text-indigo-400 font-black mr-1.5">LV.{p.level}</span>
                          {p.name}
                        </p>
                        {p.uniqueTag && (
                          <p
                            className="text-[10px] text-slate-500 font-bold hover:text-indigo-400 transition-colors cursor-pointer"
                            onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(p.uniqueTag); onToast("아이디가 복사되었습니다."); }}
                          >{p.uniqueTag}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {p.uid === activeRoom.creatorId && (
                          <span className="text-[9px] font-black text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-lg uppercase tracking-widest">성주</span>
                        )}
                        {canGift && <span className="text-[9px] font-black text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded-lg">🎁</span>}
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-center text-[10px] text-slate-600 font-black uppercase py-6">참여자 없음</p>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* 참여자 선물 모달 */}
      {giftTarget && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setGiftTarget(null)}></div>
          <div className="relative glass p-10 rounded-[3rem] border border-yellow-500/20 w-full max-w-sm text-center animate-in zoom-in-95 duration-300">
            <div className="text-4xl mb-4">🎁</div>
            <h3 className="text-xl font-mystic font-black text-yellow-500 mb-1 uppercase tracking-widest">Transmit Essence</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-6 italic">
              <span className="text-indigo-400">LV.{giftTarget.level}</span> {giftTarget.name}님에게 기운을 전수합니다.
            </p>
            <div className="space-y-4">
              <div className="flex items-center bg-slate-950/50 border border-slate-800 rounded-2xl p-2">
                <button onClick={() => setGiftAmount(v => String(Math.max(100, parseInt(v) - 100)))} className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-slate-400 hover:text-white text-xl font-black">−</button>
                <input type="number" value={giftAmount} onChange={e => setGiftAmount(e.target.value)} className="flex-1 bg-transparent text-center font-black text-2xl text-white outline-none tabular-nums" />
                <button onClick={() => setGiftAmount(v => String(parseInt(v) + 100))} className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-slate-400 hover:text-white text-xl font-black">+</button>
              </div>
              <button onClick={handleGiftToParticipant} disabled={isGiftSending} className="w-full py-5 bg-yellow-600 text-slate-950 font-black rounded-2xl shadow-xl uppercase tracking-widest text-sm disabled:opacity-50">
                루멘 전수하기
              </button>
              <button onClick={() => setGiftTarget(null)} className="w-full py-3 bg-white/5 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-[10px] hover:bg-white/10">취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 행성명 수정 모달 */}
      {showEditRoomModal && activeRoom && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowEditRoomModal(false)}></div>
          <div className="relative glass p-10 rounded-[3rem] border border-indigo-500/20 w-full max-w-sm text-center animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-mystic font-black text-white mb-1 uppercase tracking-widest">Edit Planet</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-6 italic">
              {(activeRoom.renameCount ?? 0) >= 1 ? '2회차 이후 수정은 500루멘이 소모됩니다.' : '첫 번째 수정은 무료입니다.'}
            </p>
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-4">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-4xl">{editRoomIcon}</div>
                <button
                  onClick={() => setShowIconPicker('edit')}
                  className="px-5 py-2.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-indigo-500/30 transition-all"
                >아이콘 변경</button>
              </div>
              <input
                type="text"
                value={editRoomTitle}
                onChange={e => setEditRoomTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleEditRoom()}
                placeholder="새 행성명을 입력하세요"
                className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-white text-center font-bold focus:border-indigo-500 outline-none"
              />
              <button onClick={handleEditRoom} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-sm hover:bg-indigo-500 transition-all">
                변경하기 {(activeRoom.renameCount ?? 0) >= 1 ? '(500 L)' : '(무료)'}
              </button>
              <button onClick={() => setShowEditRoomModal(false)} className="w-full py-3 bg-white/5 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-[10px] hover:bg-white/10">취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 아이콘 피커 모달 */}
      {showIconPicker !== null && (
        <div className="fixed inset-0 z-[11000] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowIconPicker(null)}></div>
          <div className="relative w-full max-w-lg bg-slate-900 border border-indigo-500/20 rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300 flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">아이콘 선택</h3>
                <p className="text-[10px] text-slate-500 font-bold mt-0.5 uppercase tracking-widest">{ROOM_ICONS.length}개의 아이콘</p>
              </div>
              <button onClick={() => setShowIconPicker(null)} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all text-lg font-black">✕</button>
            </div>
            <div className="overflow-y-auto custom-scroll p-4">
              <div className="grid grid-cols-8 gap-2">
                {ROOM_ICONS.map((icon, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectIcon(icon)}
                    className="w-full aspect-square rounded-2xl bg-white/5 hover:bg-indigo-500/30 flex items-center justify-center text-2xl transition-all active:scale-90 hover:scale-110"
                  >{icon}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes dimension-shift {
          0% { transform: scale(0.9); filter: blur(20px) brightness(0); opacity: 0; }
          100% { transform: scale(1); filter: blur(0) brightness(1); opacity: 1; }
        }
        .animate-dimension-shift { animation: dimension-shift 1.5s cubic-bezier(0.19, 1, 0.22, 1) forwards; }
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.3); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default CelestialSquare;

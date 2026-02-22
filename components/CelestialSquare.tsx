
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, OrbState, ChatRoom, COST_ROOM_CREATE, ORB_DECORATIONS } from '../types';
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
import { collection, query, onSnapshot, addDoc, updateDoc, doc, deleteDoc, orderBy, limit, getDocs, getDoc, startAfter, QueryDocumentSnapshot, arrayUnion, serverTimestamp } from "firebase/firestore";
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
  lumenReceivedAt?: number;
  lumenSenderName?: string;
  onOpenSelfProfile?: () => void;
}

const LIST_PAGE_SIZE = 30;

const CelestialSquare: React.FC<CelestialSquareProps> = ({ profile, orb, onUpdatePoints, onUpdateFavorites, onBack, onToast, onGrowFromPost, isAdmin, lumenReceivedAt = 0, lumenSenderName = '', onOpenSelfProfile }) => {
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

  // 방 목록 정렬
  type RoomSortKey = 'fav' | 'date_asc' | 'date_desc' | 'participants_asc' | 'participants_desc' | 'level_asc' | 'level_desc';
  const [roomSort, setRoomSort] = useState<RoomSortKey>('fav');

  // 행성명 수정 모달 상태
  const [showEditRoomModal, setShowEditRoomModal] = useState(false);
  const [editRoomTitle, setEditRoomTitle] = useState('');
  const [editRoomIcon, setEditRoomIcon] = useState('🪐');

  // 안내 표지판 모달 상태
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [noticeText, setNoticeText] = useState('');
  const [isSavingNotice, setIsSavingNotice] = useState(false);

  // 참여자 목록 선물 모달 상태
  const [giftTarget, setGiftTarget] = useState<{ uid: string; name: string; uniqueTag: string; level: number } | null>(null);
  const [giftAmount, setGiftAmount] = useState('100');
  const [isGiftSending, setIsGiftSending] = useState(false);
  const [showGiftConfirm, setShowGiftConfirm] = useState(false);
  const [giftValidError, setGiftValidError] = useState<string | null>(null);

  // 아이콘 선택 상태
  const [newRoomIcon, setNewRoomIcon] = useState('🪐');
  const [showIconPicker, setShowIconPicker] = useState<'create' | string | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 신고 상태
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  const REPORT_REASONS = ['욕설·비방', '사기·거래 유도', '음란·성적 발언', '명예 훼손', '스팸·도배', '기타'];

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
      const THREE_DAYS = 5 * 24 * 60 * 60 * 1000;
      const allRooms = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChatRoom));

      allRooms.forEach(room => {
        if (room.isUnderReview) return; // 신고 검토 중 — 삭제 금지
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
        if (!r.isUnderReview && r.deleteAt && r.deleteAt <= now) return false;
        const lastActivity = r.lastEnteredAt ?? r.createdAt;
        if (!r.isUnderReview && !r.deleteAt && (r.participantCount ?? 0) === 0 && lastActivity < now - THREE_DAYS) return false;
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

      // 퇴장 시스템 메시지 Firestore 기록 (다른 사용자에게만 보임)
      const exitName = currentDisplayName;
      if (activeRoom && exitName) {
        addDoc(
          collection(db, 'square', 'rooms', 'list', activeRoom.id, 'messages'),
          {
            userId: 'system',
            userName: 'system',
            userLevel: 0,
            message: `${exitName}님이 퇴장하였습니다.`,
            timestamp: Date.now(),
          }
        ).catch(() => {});
      }

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
    // 자신이 만든 방은 즐겨찾기 해제 불가
    const room = [...rooms, ...olderRooms].find(r => r.id === roomId);
    if (room?.creatorId === auth.currentUser?.uid) {
      onToast("성주님의 행성입니다.");
      return;
    }
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
    if (newRoomTitle.trim().length > 10) { onToast("행성명은 10자 이내로 입력해주세요."); return; }
    if (orb.points < COST_ROOM_CREATE) {
      onToast("방을 개설할 기운(루멘)이 부족합니다.");
      return;
    }

    try {
      const roomData = {
        title: newRoomTitle,
        creatorName: currentDisplayName,
        creatorId: auth.currentUser.uid,
        creatorLevel: orb.level,
        participantCount: 0,
        createdAt: Date.now(),
        isPermanent: true,
        icon: newRoomIcon,
      };
      const docRef = await addDoc(collection(db, "square", "rooms", "list"), roomData);
      await spendPoints(COST_ROOM_CREATE, 'room_create');
      // 자신이 만든 방은 자동으로 즐겨찾기 (해제 불가)
      const currentFavs = orb.favoriteRoomIds || [];
      if (!currentFavs.includes(docRef.id)) {
        onUpdateFavorites([...currentFavs, docRef.id]);
      }
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
    if (activeRoom.isUnderReview) {
      onToast("신고 검토 중인 행성은 즉시 소멸할 수 없습니다.");
      setShowInstantDestroyConfirm(false);
      return;
    }
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
    // participants에 나 자신이 없으면 보완 (RTDB 응답 지연 대비)
    const myUid = auth.currentUser.uid;
    let captureParticipants = participants.map(p => ({ uid: p.uid, name: p.name, uniqueTag: p.uniqueTag }));
    if (!captureParticipants.some(p => p.uid === myUid)) {
      captureParticipants = [{ uid: myUid, name: currentDisplayName, uniqueTag: orb.uniqueTag || '' }, ...captureParticipants];
    }
    try {
      await addDoc(collection(db, "users", auth.currentUser.uid, "chatCaptures"), {
        savedAt: Date.now(),
        roomId: activeRoom.id,
        roomName: activeRoom.title,
        creatorName: activeRoom.creatorName,
        participants: captureParticipants,
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

  // 대화내용 신고
  const handleReport = async () => {
    if (!auth.currentUser || !activeRoom || !reportReason) return;
    setIsReporting(true);
    const messages = chatPanelRef.current?.getMessages() || [];
    const myUid = auth.currentUser.uid;
    let captureParticipants = participants.map(p => ({ uid: p.uid, name: p.name, uniqueTag: p.uniqueTag }));
    if (!captureParticipants.some(p => p.uid === myUid)) {
      captureParticipants = [{ uid: myUid, name: currentDisplayName, uniqueTag: orb.uniqueTag || '' }, ...captureParticipants];
    }
    const captureData = {
      roomId: activeRoom.id,
      roomName: activeRoom.title,
      creatorName: activeRoom.creatorName,
      participants: captureParticipants,
      messages: messages.map(m => ({ userId: m.userId, userName: m.userName, message: m.message, timestamp: m.timestamp })),
    };
    try {
      await addDoc(collection(db, 'reports'), {
        ...captureData,
        reportedAt: serverTimestamp(),
        reporterUid: myUid,
        reporterName: currentDisplayName,
        reporterTag: orb.uniqueTag || '',
        reason: reportReason,
        status: 'pending',
        isReadByAdmin: false,
      });
      await addDoc(collection(db, 'users', myUid, 'chatCaptures'), {
        ...captureData,
        savedAt: Date.now(),
        isReport: true,
        reportReason,
      });
      // 방 문서에 삭제 방지 플래그 설정 (소멸 로직이 건너뜀)
      try { await updateDoc(doc(db, 'square', 'rooms', 'list', activeRoom.id), { isUnderReview: true }); } catch {}
      setShowReportModal(false);
      setReportReason('');
      onToast('신고가 접수되었습니다. 검토 후 조치하겠습니다.');
    } catch {
      onToast('신고 접수에 실패했습니다.');
    } finally {
      setIsReporting(false);
    }
  };

  // 안내 표지판 저장
  const handleSaveNotice = async () => {
    if (!activeRoom || !auth.currentUser) return;
    if (noticeText.length > 50) { onToast("50자 이내로 입력해주세요."); return; }
    setIsSavingNotice(true);
    try {
      await updateDoc(doc(db, "square", "rooms", "list", activeRoom.id), { notice: noticeText.trim() });
      setShowNoticeModal(false);
      onToast("안내 표지판이 업데이트되었습니다.");
    } catch {
      onToast("저장에 실패했습니다.");
    } finally {
      setIsSavingNotice(false);
    }
  };

  // 행성명/아이콘 수정
  const handleEditRoom = async () => {
    if (!activeRoom || !auth.currentUser) return;
    if (!editRoomTitle.trim()) { onToast("행성명을 입력해주세요."); return; }
    if (editRoomTitle.trim().length > 10) { onToast("행성명은 10자 이내로 입력해주세요."); return; }
    const renameCount = activeRoom.renameCount ?? 0;
    const isAdminRoom = activeRoom.creatorId === SUPER_ADMIN_UID;
    const cost = isAdminRoom ? 0 : (renameCount >= 1 ? 500 : 0);
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

  // 참여자 목록 → 루멘 선물 사전 검사
  const handleGiftPrecheck = () => {
    if (!giftTarget) return;
    if (privilegedUids.has(giftTarget.uid)) { onToast("관리자에게는 루멘을 선물할 수 없습니다."); setGiftTarget(null); return; }
    const amount = parseInt(giftAmount);
    if (isNaN(amount) || amount < 100 || amount % 100 !== 0) {
      setGiftValidError('최소 100루멘 이상,\n100루멘 단위로만 입력할 수 있습니다.');
      return;
    }
    if (orb.points < amount) {
      setGiftValidError('보유하신 루멘이 부족합니다.');
      return;
    }
    setShowGiftConfirm(true);
  };

  // 참여자 목록 → 루멘 선물 전송 (확인 모달에서 호출)
  const handleGiftToParticipant = async () => {
    if (isGiftSending || !giftTarget || !auth.currentUser) return;
    const amount = parseInt(giftAmount);
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

  // 방 목록 정렬
  const allRoomsDisplay = [...rooms, ...olderRooms].sort((a, b) => {
    // 최고관리자 방은 어떤 정렬순이든 최상단 고정
    const aAdmin = a.creatorId === SUPER_ADMIN_UID;
    const bAdmin = b.creatorId === SUPER_ADMIN_UID;
    if (aAdmin && !bAdmin) return -1;
    if (!aAdmin && bAdmin) return 1;

    if (roomSort === 'fav') {
      const aFav = (orb.favoriteRoomIds || []).includes(a.id);
      const bFav = (orb.favoriteRoomIds || []).includes(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return (b.participantCount ?? 0) - (a.participantCount ?? 0);
    }
    switch (roomSort) {
      case 'date_desc': return b.createdAt - a.createdAt;
      case 'date_asc':  return a.createdAt - b.createdAt;
      case 'participants_desc': return (b.participantCount ?? 0) - (a.participantCount ?? 0);
      case 'participants_asc':  return (a.participantCount ?? 0) - (b.participantCount ?? 0);
      case 'level_desc': return (b.creatorLevel ?? 0) - (a.creatorLevel ?? 0);
      case 'level_asc':  return (a.creatorLevel ?? 0) - (b.creatorLevel ?? 0);
      default: return 0;
    }
  });

  const isBoardView = view === 'board' || view === 'post-detail' || view === 'post-edit';

  return (
    <div className="fixed inset-0 z-[5000] bg-[#020617] text-slate-200 flex flex-col animate-dimension-shift">
      <header className="relative z-[100] border-b border-white/5 pl-[12px] pr-[27px] sm:px-8 py-4 sm:py-4 flex justify-between items-center shrink-0 shadow-2xl">
        <div className="absolute inset-0 bg-white/[0.02] backdrop-blur-3xl -z-10 pointer-events-none" />
        <div className="flex items-center space-x-[14px] sm:space-x-6 min-w-0 flex-1">
          <button
            onClick={() => {
              if (view === 'lounge') onBack();
              else if (view === 'post-detail' || view === 'post-edit') setView('board');
              else setView('lounge');
            }}
            className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div className="flex flex-col min-w-0" style={{ marginTop: 5 }}>
            <h2 className="text-base sm:text-xl font-mystic font-black text-white tracking-tight sm:tracking-widest leading-tight uppercase truncate">
              {view === 'lounge' ? 'Celestial Square' : view === 'chat' ? `${activeRoom?.icon ? activeRoom.icon + ' ' : ''}${activeRoom?.title}` : 'Resonance Board'}
            </h2>
            {(view === 'post-detail' || view === 'post-edit') ? (
              <div className="flex items-center space-x-2 mt-1.5">
                <button onClick={() => setView('board')} className="text-[9px] font-black text-slate-500 hover:text-emerald-400 transition-colors uppercase tracking-widest">회람판</button>
                <span className="text-slate-700 text-[8px]">/</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">{view === 'post-edit' ? '편집' : '게시글'}</span>
              </div>
            ) : (
              <p className="text-[9px] font-bold text-slate-500 mt-1.5 whitespace-nowrap">
                {view === 'lounge' ? '행성을 탐색하고 여행자들과 공명하세요'
                 : view === 'chat' ? `${participants.length}명 공명 중`
                 : '이야기를 올리고 공명을 나누는 공간'}
              </p>
            )}
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
                       <button onClick={() => { setShowParticipantsModal(true); setShowRoomMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-white/5 text-[10px] font-bold text-slate-300 transition-colors flex items-center space-x-2"><span>👥</span><span>참여자 목록</span></button>
                       <button onClick={handleSaveCapture} className="w-full text-left p-3 rounded-xl hover:bg-white/5 text-[10px] font-bold text-slate-300 transition-colors flex items-center space-x-2"><span>🗂️</span><span>대화내용 저장</span></button>
                       <button onClick={() => { setShowRoomMenu(false); setShowReportModal(true); }} className="w-full text-left p-3 rounded-xl hover:bg-rose-900/30 text-[10px] font-bold text-rose-400/80 hover:text-rose-300 transition-colors flex items-center space-x-2"><span>🚨</span><span>대화내용 신고하기</span></button>
                       {activeRoom && auth.currentUser && activeRoom.creatorId === auth.currentUser.uid && (
                         <button onClick={() => { setEditRoomTitle(activeRoom.title); setEditRoomIcon(activeRoom.icon || '🪐'); setShowEditRoomModal(true); setShowRoomMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-white/5 text-[10px] font-bold text-slate-300 transition-colors flex items-center space-x-2">
                           <span>✏️</span>
                           <span>행성명 변경 {activeRoom.creatorId === SUPER_ADMIN_UID ? '(무료)' : (activeRoom.renameCount ?? 0) >= 1 ? '(500L)' : '(1회 무료)'}</span>
                         </button>
                       )}
                       {activeRoom && auth.currentUser && activeRoom.creatorId === auth.currentUser.uid && (
                         <button onClick={() => { setNoticeText(activeRoom.notice || ''); setShowNoticeModal(true); setShowRoomMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-white/5 text-[10px] font-bold text-slate-300 transition-colors flex items-center space-x-2">
                           <span>📋</span>
                           <span>안내 표지판 (무료)</span>
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
           <button onClick={() => onOpenSelfProfile?.()} className="flex items-center space-x-3 transition-all" style={{ marginRight: window.innerWidth < 640 ? -10 : 0 }}>
             {view !== 'chat' && (
               <div className="sm:hidden text-right self-end pb-0.5">
                 <p className="text-xs font-normal text-white/80">LV.{Math.floor(orb.level)}</p>
               </div>
             )}
             <OrbVisual level={orb.level} className="w-10 h-10 border border-white/10 shadow-lg shadow-indigo-500/10" overlayAnimation={(ORB_DECORATIONS.find(d => d.id === orb.activeDecorationId) || ORB_DECORATIONS[0]).overlayAnimation} />
           </button>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-hidden relative z-10 flex flex-col">
        {/* 라운지 ↔ 회람판 탭 (채팅방 진입 시 숨김) */}
        {view !== 'chat' && (
          <div className="flex shrink-0 border-b border-white/5">
            <button
              onClick={() => setView('lounge')}
              className={`flex-1 py-3 text-[11px] font-black tracking-widest transition-all border-b-2 ${
                view === 'lounge' ? 'text-indigo-300 border-indigo-500 bg-indigo-500/5' : 'text-slate-600 border-transparent hover:text-slate-400'
              }`}
            >
              라운지
            </button>
            <button
              onClick={() => setView('board')}
              className={`flex-1 py-3 text-[11px] font-black tracking-widest transition-all border-b-2 ${
                isBoardView ? 'text-emerald-300 border-emerald-500 bg-emerald-500/5' : 'text-slate-600 border-transparent hover:text-slate-400'
              }`}
            >
              회람판
            </button>
          </div>
        )}
        {/* 라운지 (방 목록) */}
        {view === 'lounge' && (
          <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 custom-scroll">
            <div className="max-w-5xl mx-auto space-y-8">
              <div className="flex justify-between items-end border-b border-white/5 pb-6">
                <div className="space-y-1">
                   <h3 className="text-[16px] sm:text-[17px] font-black text-slate-500 uppercase tracking-tight sm:tracking-[0.4em] whitespace-nowrap">Permanent Cosmic Hubs</h3>
                   <p className="text-[10px] text-indigo-400 italic font-medium">개설된 행성은 소멸 전까지는 유지됩니다.</p>
                </div>
                <button onClick={() => setIsCreatingRoom(true)} className="px-5 sm:px-8 py-2.5 sm:py-3.5 bg-indigo-600 text-white font-black rounded-xl sm:rounded-2xl text-[11px] sm:text-[10px] uppercase tracking-tight sm:tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all active:scale-95 shrink-0">
                  <span className="sm:hidden">행성 창조하기<br />(1,000 L)</span>
                  <span className="hidden sm:inline">행성 창조하기 (1,000 L)</span>
                </button>
              </div>

              {/* 정렬 바 */}
              {(() => {
                const sortBtn = (
                  key: RoomSortKey,
                  label: string,
                  ascKey: RoomSortKey,
                  descKey: RoomSortKey,
                  isSingle?: boolean
                ) => {
                  const isActive = isSingle ? roomSort === key : (roomSort === ascKey || roomSort === descKey);
                  const handleClick = () => {
                    if (isSingle) { setRoomSort(key); return; }
                    if (roomSort === descKey) setRoomSort(ascKey);
                    else setRoomSort(descKey);
                  };
                  const arrow = isSingle ? '' : roomSort === ascKey ? ' ↑' : roomSort === descKey ? ' ↓' : ' ↕';
                  return (
                    <button
                      key={key}
                      onClick={handleClick}
                      className={`flex-1 flex justify-center items-center py-2 sm:py-1.5 rounded-xl text-[10px] sm:text-[10px] font-black whitespace-nowrap transition-all border ${
                        isActive
                          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                          : 'bg-white/5 text-slate-500 border-white/10 hover:text-slate-300'
                      } ${isSingle && isActive ? '!bg-yellow-500/20 !text-yellow-400 !border-yellow-500/40' : ''}`}
                    >
                      {label}{arrow}
                    </button>
                  );
                };
                return (
                  <div className="flex items-center gap-3 sm:gap-6">
                    {sortBtn('fav', '★ 즐겨찾기', 'fav', 'fav', true)}
                    {sortBtn('participants_desc', '공명수', 'participants_asc', 'participants_desc')}
                    {sortBtn('date_desc', '생성일', 'date_asc', 'date_desc')}
                    {sortBtn('level_desc', '레벨', 'level_asc', 'level_desc')}
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-3">
                {allRoomsDisplay.map(room => {
                  const isFav = (orb.favoriteRoomIds || []).includes(room.id);
                  const isDying = !!room.deleteAt;
                  const isOfficial = room.creatorId === SUPER_ADMIN_UID;
                  return (
                    <div
                      key={room.id}
                      onClick={() => { setActiveRoom(room); setView('chat'); }}
                      className={`glass p-4 rounded-2xl text-left group transition-all duration-500 relative overflow-hidden flex flex-col justify-between h-44 border sm:border-[0.5px] cursor-pointer shadow-[0_0_28px_rgba(99,102,241,0.18)] ${
                        isOfficial ? 'border-white/10 hover:border-indigo-500/30'
                        : isFav ? 'border-yellow-500/25 bg-yellow-500/5'
                        : isDying ? 'border-rose-500/25 bg-rose-500/5'
                        : 'border-white/10 hover:border-indigo-500/30'
                      }`}
                    >
                      {isOfficial && <div className="absolute -top-2 -right-2 w-20 h-20 bg-amber-400/10 blur-2xl rounded-full pointer-events-none"></div>}
                      {isFav && !isDying && !isOfficial && <div className="absolute -top-1 -right-1 w-16 h-16 bg-yellow-500/10 blur-2xl rounded-full"></div>}
                      {isDying && <div className="absolute inset-0 bg-gradient-to-t from-rose-950/20 to-transparent animate-pulse"></div>}

                      {/* OFFICIAL 배지 */}
                      {isOfficial && (
                        <div className="absolute top-2.5 right-2.5 flex items-center gap-0.5 bg-amber-400/15 border border-amber-400/40 rounded-md px-1.5 py-0.5">
                          <svg width="8" height="8" viewBox="0 0 12 12" fill="none" className="text-amber-400 shrink-0">
                            <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
                            <path d="M3.5 6l1.8 1.8L8.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest">Official</span>
                        </div>
                      )}

                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-2">
                           {(() => {
                             const isCreator = auth.currentUser?.uid === room.creatorId;
                             return (
                               <div
                                 className={`w-9 h-9 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform select-none ${isCreator && !isDying ? 'cursor-pointer active:scale-95' : ''}`}
                                 onMouseDown={isCreator && !isDying ? (e) => handleIconPressStart(e, room.id) : undefined}
                                 onMouseUp={isCreator && !isDying ? handleIconPressEnd : undefined}
                                 onMouseLeave={isCreator && !isDying ? handleIconPressEnd : undefined}
                                 onTouchStart={isCreator && !isDying ? (e) => handleIconPressStart(e, room.id) : undefined}
                                 onTouchEnd={isCreator && !isDying ? handleIconPressEnd : undefined}
                                 title={isCreator && !isDying ? "길게 누르면 아이콘 변경" : undefined}
                               >
                                 <span className="text-lg">{isDying ? '🌋' : (room.icon || '⭐')}</span>
                               </div>
                             );
                           })()}
                           {!isDying && !isOfficial && (() => {
                            const isOwnRoom = room.creatorId === auth.currentUser?.uid;
                            if (isOwnRoom) {
                              return (
                                <div onClick={(e: React.MouseEvent) => { e.stopPropagation(); onToast("성주님의 행성입니다."); }} className="p-1.5 rounded-lg text-yellow-500 relative cursor-default">
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                  <span className="absolute -bottom-0.5 -right-0.5 text-[7px] leading-none">🔒</span>
                                </div>
                              );
                            }
                            return (
                              <button onClick={(e) => toggleFavorite(e, room.id)} className={`p-1.5 rounded-lg transition-colors ${isFav ? 'text-yellow-500' : 'text-slate-600 hover:text-white'}`}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                              </button>
                            );
                          })()}
                        </div>
                        <div className="flex items-center gap-1 mb-0.5">
                          <h4 className={`text-sm font-black group-hover:text-white transition-colors truncate ${isDying ? 'text-rose-200' : isOfficial ? 'text-amber-200' : isFav ? 'text-yellow-100' : 'text-slate-300'}`}>{room.title}</h4>
                          {isOfficial && (
                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="text-amber-400 shrink-0">
                              <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
                              <path d="M3.5 6l1.8 1.8L8.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <p className={`text-[9px] font-bold uppercase tracking-widest truncate ${isOfficial ? 'text-amber-500/70' : 'text-slate-500'}`}>by {room.creatorName}</p>
                        {room.notice && !isDying && (
                          <div className="mt-[12px] overflow-hidden px-1 py-0.5">
                            <span className="notice-marquee text-[9px] text-slate-400/90">{room.notice}</span>
                          </div>
                        )}
                        {isDying && <p className="text-[8px] text-rose-500 font-black uppercase mt-1 animate-pulse">Destruction Imminent</p>}
                      </div>
                      <div className="relative z-10 flex justify-between items-center mt-2">
                        <span className={`text-[9px] font-black ${isDying ? 'text-rose-400' : 'text-emerald-500'} bg-white/5 px-2 py-0.5 rounded-full uppercase tracking-widest`}>{Math.max(0, room.participantCount ?? 0)}명 공명</span>
                        <span className="text-[8px] text-slate-600 font-bold">{new Date(room.createdAt).toLocaleDateString()}</span>
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
            participants={participants.map(p => ({ uid: p.uid, name: p.name || p.uniqueTag || '익명', uniqueTag: p.uniqueTag || '' }))}
            lumenReceivedAt={lumenReceivedAt}
            lumenSenderName={lumenSenderName}
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

      {/* 신고 모달 */}
      {showReportModal && (
        <div className="fixed inset-0 z-[7000] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => { setShowReportModal(false); setReportReason(''); }}></div>
          <div className="relative glass p-10 rounded-[3rem] border border-rose-500/30 w-full max-w-sm animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-black text-white mb-1 tracking-widest text-center">🚨 대화내용 신고</h3>
            <p className="text-[10px] text-slate-500 font-bold text-center mb-6">신고 사유를 선택해주세요</p>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {REPORT_REASONS.map(reason => (
                <button
                  key={reason}
                  onClick={() => setReportReason(reason)}
                  className={`py-3 rounded-2xl text-[10px] font-black tracking-widest transition-all border ${
                    reportReason === reason
                      ? 'bg-rose-500/30 border-rose-400/60 text-rose-300'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                  }`}
                >{reason}</button>
              ))}
            </div>
            <div className="space-y-2">
              <button
                onClick={handleReport}
                disabled={!reportReason || isReporting}
                className="w-full py-4 bg-rose-600 text-white font-black rounded-2xl text-sm uppercase tracking-widest hover:bg-rose-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >{isReporting ? '신고 중...' : '신고하기'}</button>
              <button
                onClick={() => { setShowReportModal(false); setReportReason(''); }}
                className="w-full py-3 bg-white/5 text-slate-500 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-white/10"
              >취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 방 개설 모달 */}
      {isCreatingRoom && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsCreatingRoom(false)}></div>
          <div className="relative glass p-10 rounded-[3rem] border border-white/10 w-full max-w-sm text-center animate-in zoom-in-95 duration-300">
             <button onClick={() => setIsCreatingRoom(false)} className="absolute top-5 right-5 text-slate-500 hover:text-white transition-colors">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
             </button>
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
                  onChange={e => { if (e.target.value.length <= 10) setNewRoomTitle(e.target.value); }}
                  onKeyDown={e => e.key === 'Enter' && handleCreateRoom()}
                  placeholder="행성의 이름을 지어주세요 (10자 이내)"
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-white text-center font-bold focus:border-indigo-500 outline-none"
                />
                <button onClick={handleCreateRoom} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-sm hover:bg-indigo-500 transition-all">탄생시키기 (1,000 L)</button>
                <p className="text-[10px] text-slate-600 font-bold text-center leading-relaxed">5일 이상 아무도 행성 출입을 하지 않으면 자동 소멸됩니다.</p>
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
                  const isAdmin = p.uid === SUPER_ADMIN_UID;
                  const isPrivileged = privilegedUids.has(p.uid);
                  const canGift = !isMe && !isPrivileged;
                  return (
                    <div
                      key={p.uid}
                      onClick={() => { if (canGift) { setGiftTarget(p); setGiftAmount('100'); } }}
                      className={`flex items-center space-x-3 p-3 rounded-2xl bg-white/5 transition-colors ${canGift ? 'cursor-pointer hover:bg-indigo-500/10 active:scale-[0.98]' : 'cursor-default'}`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${isAdmin ? 'bg-amber-500/20 text-amber-400' : p.uid === activeRoom.creatorId ? 'bg-yellow-500/20 text-yellow-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                        {isAdmin ? '⚙️' : p.uid === activeRoom.creatorId ? '👑' : '🪐'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-white truncate">
                          <span className={`text-[10px] font-black mr-1.5 ${isAdmin ? 'text-amber-400' : 'text-indigo-400'}`}>LV.{p.level}</span>
                          {p.name}
                        </p>
                        {isAdmin ? (
                          <p className="text-[10px] text-amber-600 font-black uppercase tracking-widest">관리자</p>
                        ) : p.uniqueTag ? (
                          <p
                            className="text-[10px] text-slate-500 font-bold hover:text-indigo-400 transition-colors cursor-pointer"
                            onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(p.uniqueTag); onToast("아이디가 복사되었습니다."); }}
                          >{p.uniqueTag}</p>
                        ) : null}
                      </div>
                      <div className="flex items-center space-x-2">
                        {isAdmin && p.uid !== activeRoom.creatorId && (
                          <span className="text-[9px] font-black text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg uppercase tracking-widest">관리자</span>
                        )}
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
            <button onClick={() => setGiftTarget(null)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-all text-lg">✕</button>
            <div className="text-4xl mb-4">🎁</div>
            <h3 className="text-base sm:text-xl font-mystic font-black text-yellow-500 mb-1 uppercase tracking-tight sm:tracking-widest whitespace-nowrap">Transmit Essence</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3 italic">
              <span className="text-indigo-400">LV.{giftTarget.level}</span> {giftTarget.name}({giftTarget.uniqueTag})님에게 루멘을 선물합니다.
            </p>
            <p className="text-[11px] text-slate-400 font-bold mb-6">
              보유 루멘 <span className="text-yellow-400 font-black">{orb.points.toLocaleString()} L</span>
            </p>
            <div className="space-y-4">
              <div>
                <div className="flex items-center bg-slate-950/50 border border-slate-800 rounded-2xl p-2">
                  <button onClick={() => setGiftAmount(v => { const cur = parseInt(v); return isNaN(cur) ? v : String(Math.max(100, cur % 100 === 0 ? cur - 100 : Math.floor(cur / 100) * 100)); })} className="w-12 h-12 shrink-0 bg-white/5 rounded-xl flex items-center justify-center text-slate-400 hover:text-white text-xl font-black">−</button>
                  <input type="number" value={giftAmount} onChange={e => setGiftAmount(e.target.value)} className="flex-1 min-w-0 bg-transparent text-center font-black text-2xl text-white outline-none tabular-nums" />
                  <button onClick={() => setGiftAmount(v => { const cur = parseInt(v); return String(isNaN(cur) ? 100 : cur % 100 === 0 ? cur + 100 : Math.ceil(cur / 100) * 100); })} className="w-12 h-12 shrink-0 bg-white/5 rounded-xl flex items-center justify-center text-slate-400 hover:text-white text-xl font-black">+</button>
                </div>
                <p className="text-right text-[10px] text-slate-600 font-bold mt-1.5">(최소단위: 100루멘)</p>
              </div>
              <button onClick={handleGiftPrecheck} disabled={isGiftSending} className="w-full py-5 bg-yellow-600 text-slate-950 font-black rounded-2xl shadow-xl uppercase tracking-widest text-sm disabled:opacity-50">
                루멘 선물하기
              </button>
              <button onClick={() => setGiftTarget(null)} className="w-full py-3 bg-white/5 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-[10px] hover:bg-white/10">취소</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 루멘 선물 확인 모달 ── */}
      {showGiftConfirm && giftTarget && (
        <div className="fixed inset-0 z-[11500] flex items-center justify-center px-8">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowGiftConfirm(false)} />
          <div className="relative glass p-8 rounded-[2.5rem] border border-yellow-500/20 w-full max-w-xs text-center animate-in zoom-in-95 duration-200">
            <div className="text-3xl mb-4">🎁</div>
            <p className="text-sm font-black text-white leading-relaxed mb-2">
              {giftTarget.name}({giftTarget.uniqueTag})님에게
            </p>
            <p className="text-xl font-black text-yellow-400 mb-6">{parseInt(giftAmount).toLocaleString()} 루멘</p>
            <p className="text-xs text-slate-500 font-bold mb-8">을 선물하시겠습니까?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowGiftConfirm(false)} className="flex-1 py-3.5 bg-white/5 text-slate-400 font-black rounded-2xl text-sm hover:bg-white/10 transition-all">취소</button>
              <button onClick={() => { setShowGiftConfirm(false); handleGiftToParticipant(); }} className="flex-1 py-3.5 bg-yellow-600 text-slate-950 font-black rounded-2xl text-sm hover:brightness-110 transition-all">선물하기</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 루멘 선물 에러 모달 ── */}
      {giftValidError && (
        <div className="fixed inset-0 z-[11500] flex items-center justify-center px-8">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setGiftValidError(null)} />
          <div className="relative glass p-8 rounded-[2.5rem] border border-rose-500/20 w-full max-w-xs text-center animate-in zoom-in-95 duration-200">
            <div className="text-3xl mb-4">⚠️</div>
            <p className="text-sm font-black text-white leading-relaxed whitespace-pre-line mb-6">{giftValidError}</p>
            <button onClick={() => setGiftValidError(null)} className="w-full py-3.5 bg-rose-600/80 text-white font-black rounded-2xl text-sm uppercase tracking-widest hover:bg-rose-500 transition-all">확인</button>
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
              {activeRoom.creatorId === SUPER_ADMIN_UID ? '관리자 행성은 무제한 무료 수정입니다.' : (activeRoom.renameCount ?? 0) >= 1 ? '2회차 이후 수정은 500루멘이 소모됩니다.' : '첫 번째 수정은 무료입니다.'}
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
                onChange={e => { if (e.target.value.length <= 10) setEditRoomTitle(e.target.value); }}
                onKeyDown={e => e.key === 'Enter' && handleEditRoom()}
                placeholder="새 행성명 (10자 이내)"
                className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-white text-center font-bold focus:border-indigo-500 outline-none"
              />
              <button onClick={handleEditRoom} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-sm hover:bg-indigo-500 transition-all">
                변경하기 {activeRoom.creatorId === SUPER_ADMIN_UID ? '(무료)' : (activeRoom.renameCount ?? 0) >= 1 ? '(500 L)' : '(무료)'}
              </button>
              <button onClick={() => setShowEditRoomModal(false)} className="w-full py-3 bg-white/5 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-[10px] hover:bg-white/10">취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 안내 표지판 모달 */}
      {showNoticeModal && activeRoom && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowNoticeModal(false)}></div>
          <div className="relative glass p-10 rounded-[3rem] border border-indigo-500/20 w-full max-w-sm text-center animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-mystic font-black text-white mb-1 uppercase tracking-widest">📋 Notice Board</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-6 italic">방 목록에 표시될 안내 문구를 입력하세요</p>
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={noticeText}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.value.length <= 50) setNoticeText(e.target.value); }}
                  onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleSaveNotice()}
                  placeholder="예: 2월 27일 AM 10:00 부터 오픈"
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-white text-center text-sm font-bold focus:border-indigo-500 outline-none pr-20"
                />
                <span className={`absolute right-9 top-1/2 -translate-y-1/2 text-[10px] font-black ${noticeText.length >= 50 ? 'text-rose-400' : 'text-slate-600'}`}>{noticeText.length}/50</span>
                {noticeText && (
                  <button onClick={() => setNoticeText('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white text-[11px] font-black transition-colors">×</button>
                )}
              </div>
              <button onClick={handleSaveNotice} disabled={isSavingNotice} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-sm hover:bg-indigo-500 transition-all disabled:opacity-50">
                {isSavingNotice ? '저장 중...' : '저장하기 (무료)'}
              </button>
              {noticeText.trim() && (
                <button onClick={() => { setNoticeText(''); handleSaveNotice(); }} className="w-full py-3 bg-rose-500/10 text-rose-400 font-black rounded-2xl uppercase tracking-widest text-[10px] hover:bg-rose-500/20 transition-all">
                  표지판 제거
                </button>
              )}
              <button onClick={() => setShowNoticeModal(false)} className="w-full py-3 bg-white/5 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-[10px] hover:bg-white/10">취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 아이콘 피커 모달 */}
      {showIconPicker !== null && (
        <div className="fixed inset-0 z-[11000] flex items-start sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowIconPicker(null)}></div>
          <div className="relative w-full max-w-lg bg-slate-900 border border-indigo-500/20 rounded-b-[3rem] sm:rounded-[3rem] shadow-2xl animate-in slide-in-from-top-full sm:zoom-in-95 duration-300 flex flex-col max-h-[80vh]">
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

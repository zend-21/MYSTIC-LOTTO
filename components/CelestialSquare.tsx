
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, OrbState, ChatRoom, ChatMessage, COST_ROOM_CREATE, BoardPost, BoardComment } from '../types';
import { OrbVisual } from './FortuneOrb';

// Firebase Firestore imports
import { db, auth } from '../services/firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, setDoc, deleteDoc, orderBy, limit, serverTimestamp } from "firebase/firestore";

interface CelestialSquareProps {
  profile: UserProfile;
  orb: OrbState;
  onUpdatePoints: (amount: number) => void;
  onUpdateFavorites: (roomIds: string[]) => void;
  onBack: () => void;
  onToast: (msg: string) => void;
}

const CelestialSquare: React.FC<CelestialSquareProps> = ({ profile, orb, onUpdatePoints, onUpdateFavorites, onBack, onToast }) => {
  const [view, setView] = useState<'lounge' | 'chat' | 'board' | 'post-detail' | 'post-edit'>('lounge');
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [activePost, setActivePost] = useState<BoardPost | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [showGiftModal, setShowGiftModal] = useState<ChatMessage | null>(null);
  const [giftAmount, setGiftAmount] = useState('100');

  // 행성 관리 메뉴 상태
  const [showRoomMenu, setShowRoomMenu] = useState(false);
  const [showDestroyConfirm, setShowDestroyConfirm] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // 게시글 작성 폼 상태
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editMediaUrl, setEditMediaUrl] = useState('');
  const [editMediaType, setEditMediaType] = useState<'image' | 'video'>('image');

  const scrollRef = useRef<HTMLDivElement>(null);
  const currentDisplayName = orb.nickname || profile.name;

  // Real-time listener for Rooms (라운지 화면일 때만 구독)
  useEffect(() => {
    if (view !== 'lounge') return;
    const q = query(collection(db, "square", "rooms", "list"), orderBy("createdAt", "desc"), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = Date.now();
      const allRooms = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChatRoom));
      setRooms(allRooms.filter(r => !r.deleteAt || r.deleteAt > now));
    });
    return () => unsubscribe();
  }, [view]);

  // 1초마다 현재 시간 업데이트 (카운트다운용)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Real-time listener for Posts (게시판/게시글 상세 화면일 때만 구독)
  useEffect(() => {
    if (view !== 'board' && view !== 'post-detail') return;
    const q = query(collection(db, "square", "board", "posts"), orderBy("createdAt", "desc"), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BoardPost)));
    });
    return () => unsubscribe();
  }, [view]);

  // Real-time listener for Messages in Active Room
  useEffect(() => {
    if (!activeRoom) {
      setMessages([]);
      return;
    }
    const q = query(collection(db, "square", "rooms", "list", activeRoom.id, "messages"), orderBy("timestamp", "asc"), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
    });
    return () => unsubscribe();
  }, [activeRoom]);

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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeRoom]);

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
        creatorId: auth.currentUser.uid, // 보안 식별자
        participantCount: 1,
        createdAt: Date.now(),
        isPermanent: true
      };
      const docRef = await addDoc(collection(db, "square", "rooms", "list"), roomData);
      onUpdatePoints(-COST_ROOM_CREATE);
      setActiveRoom({ id: docRef.id, ...roomData });
      setView('chat');
      setIsCreatingRoom(false);
      setNewRoomTitle('');
      onToast(`'${newRoomTitle}' 행성이 탄생했습니다. 영구히 보존됩니다.`);
    } catch (err) {
      onToast("행성 창조에 실패했습니다.");
    }
  };

  const handleTriggerDeletion = async () => {
    if (!activeRoom || !auth.currentUser || activeRoom.creatorId !== auth.currentUser.uid) return;
    try {
      const deleteAt = Date.now() + (24 * 60 * 60 * 1000); // 24시간 후
      const roomRef = doc(db, "square", "rooms", "list", activeRoom.id);
      await updateDoc(roomRef, { deleteAt });
      
      // 시스템 메시지 자동 전송
      await addDoc(collection(db, "square", "rooms", "list", activeRoom.id, "messages"), {
        userId: "system",
        userName: "SYSTEM",
        userLevel: 0,
        message: "창조주에 의해 행성 소멸 의식이 시작되었습니다. 24시간 후 이 행성은 대폭발하여 사라집니다.",
        timestamp: Date.now()
      });

      setShowDestroyConfirm(false);
      setShowRoomMenu(false);
      onToast("행성 소멸 의식이 거행되었습니다.");
    } catch (err) {
      onToast("의식 집행에 실패했습니다.");
    }
  };

  const sendMessage = async () => {
    if (!inputMsg.trim() || !activeRoom || !auth.currentUser) return;
    try {
      await addDoc(collection(db, "square", "rooms", "list", activeRoom.id, "messages"), {
        userId: auth.currentUser.uid,
        userName: currentDisplayName,
        userLevel: orb.level,
        message: inputMsg,
        timestamp: Date.now()
      });
      setInputMsg('');
    } catch (err) {
      onToast("메시지 전송에 실패했습니다.");
    }
  };

  const handleCreatePost = async () => {
    if (!editTitle.trim() || !editContent.trim()) {
      onToast("제목과 내용을 입력해주세요.");
      return;
    }
    try {
      await addDoc(collection(db, "square", "board", "posts"), {
        title: editTitle,
        content: editContent,
        authorName: currentDisplayName,
        authorLevel: orb.level,
        views: 0,
        likes: 0,
        createdAt: Date.now(),
        isNotice: false,
        mediaUrl: editMediaUrl || null,
        mediaType: editMediaUrl ? editMediaType : null,
        comments: []
      });
      setEditTitle(''); setEditContent(''); setEditMediaUrl('');
      setView('board');
      onToast("회람판에 소식이 게시되었습니다.");
    } catch (err) {
      onToast("게시글 작성에 실패했습니다.");
    }
  };

  const handlePostLike = async (e: React.MouseEvent, post: BoardPost) => {
    e.stopPropagation();
    try {
      const postRef = doc(db, "square", "board", "posts", post.id);
      await updateDoc(postRef, { likes: post.likes + 1 });
      onToast("기운을 북돋아 주었습니다! (+1)");
    } catch (err) {
      onToast("공명에 실패했습니다.");
    }
  };

  const handleGiftLumen = async () => {
    const amount = parseInt(giftAmount);
    if (isNaN(amount) || amount <= 0) {
      onToast("전수할 기운의 양이 올바르지 않습니다.");
      return;
    }
    if (orb.points < amount) {
      onToast("보유하신 기운이 부족합니다.");
      return;
    }

    onUpdatePoints(-amount);
    if (activeRoom && showGiftModal) {
      await addDoc(collection(db, "square", "rooms", "list", activeRoom.id, "messages"), {
        userId: "system",
        userName: "SYSTEM",
        userLevel: 0,
        message: `${currentDisplayName}님이 ${showGiftModal.userName}님에게 ${amount.toLocaleString()} 루멘을 선물했습니다! ✨`,
        timestamp: Date.now()
      });
    }
    onToast(`${showGiftModal?.userName}님에게 ${amount.toLocaleString()} 루멘을 전수했습니다.`);
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

  const sortedRooms = [...rooms].sort((a, b) => {
    const aFav = (orb.favoriteRoomIds || []).includes(a.id);
    const bFav = (orb.favoriteRoomIds || []).includes(b.id);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    return b.createdAt - a.createdAt;
  });

  return (
    <div className="fixed inset-0 z-[5000] bg-[#020617] text-slate-200 overflow-hidden flex flex-col animate-dimension-shift">
      <header className="relative z-[100] glass border-b border-white/5 px-8 py-6 flex justify-between items-center backdrop-blur-3xl shrink-0 shadow-2xl">
        <div className="flex items-center space-x-6">
          <button onClick={view === 'lounge' ? onBack : () => setView('lounge')} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div className="flex flex-col">
            <h2 className="text-xl font-mystic font-black text-white tracking-widest leading-none uppercase">
              {view === 'lounge' ? 'Celestial Square' : view === 'chat' ? activeRoom?.title : 'Resonance Board'}
            </h2>
            <div className="flex items-center space-x-3 mt-1.5">
               <button onClick={() => setView('lounge')} className={`text-[9px] font-black uppercase tracking-widest ${view === 'lounge' || view === 'chat' ? 'text-indigo-400' : 'text-slate-500'}`}>Lounge</button>
               <span className="text-slate-800 text-[8px]">/</span>
               <button onClick={() => setView('board')} className={`text-[9px] font-black uppercase tracking-widest ${view.includes('board') || view.includes('post') ? 'text-emerald-400' : 'text-slate-500'}`}>천상의 회람판</button>
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
                       {activeRoom && auth.currentUser && activeRoom.creatorId === auth.currentUser.uid && !activeRoom.deleteAt && (
                         <button onClick={() => { setShowDestroyConfirm(true); setShowRoomMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-rose-900/40 text-[10px] font-black text-rose-400 transition-colors flex items-center space-x-2 border border-rose-500/10 mt-1"><span>🌋</span><span>행성 소멸 의식</span></button>
                       )}
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
                   <p className="text-[10px] text-indigo-400 italic font-medium">개설된 행성은 창조주가 멸망시키기 전까지 영원히 유지됩니다.</p>
                </div>
                <button onClick={() => setIsCreatingRoom(true)} className="px-8 py-3.5 bg-indigo-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all active:scale-95">행성 창조하기 (1,000 L)</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedRooms.map(room => {
                  const isFav = (orb.favoriteRoomIds || []).includes(room.id);
                  const isDying = !!room.deleteAt;
                  return (
                    <button 
                      key={room.id} 
                      onClick={() => { setActiveRoom(room); setView('chat'); }}
                      className={`glass p-8 rounded-[2.5rem] text-left group transition-all duration-500 relative overflow-hidden flex flex-col justify-between h-56 border ${isFav ? 'border-yellow-500/40 bg-yellow-500/5' : isDying ? 'border-rose-500/40 bg-rose-500/5' : 'border-white/5 hover:border-indigo-500/40'}`}
                    >
                      {isFav && !isDying && <div className="absolute -top-1 -right-1 w-20 h-20 bg-yellow-500/10 blur-2xl rounded-full"></div>}
                      {isDying && <div className="absolute inset-0 bg-gradient-to-t from-rose-950/20 to-transparent animate-pulse"></div>}
                      
                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                           <div className={`w-10 h-10 rounded-full bg-white/5 flex items-center justify-center ${isDying ? 'text-rose-500' : 'text-indigo-400'} group-hover:scale-110 transition-transform`}>
                              {isDying ? <span className="text-lg">🌋</span> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>}
                           </div>
                           {!isDying && (
                             <button onClick={(e) => toggleFavorite(e, room.id)} className={`p-2 rounded-lg transition-colors ${isFav ? 'text-yellow-500' : 'text-slate-600 hover:text-white'}`}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                             </button>
                           )}
                        </div>
                        <h4 className={`text-xl font-black mb-1 group-hover:text-white transition-colors truncate ${isDying ? 'text-rose-200' : isFav ? 'text-yellow-100' : 'text-slate-300'}`}>{room.title}</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Creator: {room.creatorName}</p>
                        {isDying && <p className="text-[9px] text-rose-500 font-black uppercase mt-2 animate-pulse">Destruction Imminent</p>}
                      </div>
                      <div className="relative z-10 flex justify-between items-center mt-6">
                        <span className={`text-[10px] font-black ${isDying ? 'text-rose-400' : 'text-emerald-500'} bg-white/5 px-3 py-1 rounded-full uppercase tracking-widest`}>{room.participantCount}명 공명 중</span>
                        <span className="text-[9px] text-slate-600 font-bold">EST. {new Date(room.createdAt).toLocaleDateString()}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 회람판 (게시판 목록) */}
        {view === 'board' && (
          <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scroll">
            <div className="max-w-4xl mx-auto space-y-10">
              <div className="flex justify-between items-center">
                 <h3 className="text-xl font-mystic font-black text-white tracking-widest uppercase">천상의 회람판</h3>
                 <button onClick={() => setView('post-edit')} className="px-8 py-3 bg-emerald-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:bg-emerald-500 transition-all">글쓰기</button>
              </div>

              <div className="space-y-4">
                {posts.map(post => (
                  <button 
                    key={post.id} 
                    onClick={() => { setActivePost(post); setView('post-detail'); }}
                    className={`w-full glass p-6 rounded-3xl border text-left flex items-center justify-between group transition-all ${post.isNotice ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-white/5 hover:border-emerald-500/40'}`}
                  >
                    <div className="flex-1 pr-6 space-y-2">
                       <div className="flex items-center space-x-3">
                          {post.isNotice && <span className="bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase">Notice</span>}
                          <h4 className={`text-sm font-black truncate group-hover:text-emerald-400 transition-colors ${post.isNotice ? 'text-indigo-200' : 'text-slate-200'}`}>{post.title}</h4>
                          {post.comments?.length > 0 && <span className="text-indigo-400 text-[10px] font-black">[{post.comments.length}]</span>}
                       </div>
                       <div className="flex items-center space-x-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          <span>{post.authorName}</span>
                          <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                          <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                          <span>공명 {post.likes}</span>
                       </div>
                    </div>
                    <div className="flex items-center space-x-3">
                       <div className="flex flex-col items-center">
                          <span className="text-[8px] text-slate-600 font-black uppercase">Resonance</span>
                          <span className="text-sm font-black text-emerald-500">{post.likes}</span>
                       </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 게시글 상세 */}
        {view === 'post-detail' && activePost && (
          <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scroll">
            <div className="max-w-4xl mx-auto space-y-10 pb-32">
               <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <OrbVisual level={activePost.authorLevel} className="w-12 h-12 border border-white/10" />
                    <div>
                       <h3 className="text-2xl font-black text-white">{activePost.title}</h3>
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                         {activePost.authorName} (Lv.{activePost.authorLevel}) · {new Date(activePost.createdAt).toLocaleString()} · 공명 {activePost.likes}
                       </p>
                    </div>
                  </div>
                  <div className="h-[1px] bg-white/5 w-full"></div>
                  <div className="space-y-8 py-6">
                     {activePost.mediaUrl && (
                        <div className="w-full rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl">
                           {activePost.mediaType === 'image' ? (
                             <img src={activePost.mediaUrl} alt="media" className="w-full h-auto object-cover" />
                           ) : (
                             <video src={activePost.mediaUrl} controls className="w-full h-auto" />
                           )}
                        </div>
                     )}
                     <p className="text-slate-300 leading-loose text-base whitespace-pre-wrap">{activePost.content}</p>
                  </div>
                  
                  <div className="flex justify-center space-x-6 py-10">
                     <button onClick={(e) => handlePostLike(e, activePost)} className="flex flex-col items-center space-y-2 group">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-xl">
                           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                        </div>
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">기운 전수 ({activePost.likes})</span>
                     </button>
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* 게시글 작성/수정 */}
        {view === 'post-edit' && (
          <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scroll">
             <div className="max-w-3xl mx-auto space-y-10 pb-32">
                <div className="space-y-4">
                   <h3 className="text-2xl font-mystic font-black text-white uppercase tracking-widest">소식 전하기</h3>
                   <p className="text-xs text-slate-500 font-bold uppercase tracking-widest italic">당신의 행운이나 소소한 공명을 기록으로 남기십시오.</p>
                </div>

                <div className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">제목 (Title)</label>
                      <input 
                        type="text" 
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        placeholder="전하고 싶은 메시지의 제목을 입력하세요" 
                        className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-white font-bold focus:border-emerald-500 outline-none" 
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">내용 (Content)</label>
                      <textarea 
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        placeholder="자유롭게 기운을 나누십시오..." 
                        className="w-full bg-slate-950/50 border border-slate-800 rounded-3xl p-6 text-white text-sm min-h-[300px] focus:border-emerald-500 outline-none"
                      ></textarea>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">미디어 첨부 (Media URL - Optional)</label>
                      <div className="flex space-x-4">
                        <select 
                          value={editMediaType}
                          onChange={e => setEditMediaType(e.target.value as any)}
                          className="bg-slate-900 border border-slate-800 rounded-xl px-4 text-xs text-white outline-none"
                        >
                          <option value="image">이미지</option>
                          <option value="video">동영상</option>
                        </select>
                        <input 
                          type="text" 
                          value={editMediaUrl}
                          onChange={e => setEditMediaUrl(e.target.value)}
                          placeholder="URL을 입력하세요 (예: https://...)" 
                          className="flex-1 bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-xs text-white focus:border-emerald-500 outline-none" 
                        />
                      </div>
                   </div>
                   <div className="pt-8 flex space-x-4">
                      <button onClick={handleCreatePost} className="flex-1 py-5 bg-emerald-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-sm hover:bg-emerald-500 transition-all">소식 올리기</button>
                      <button onClick={() => setView('board')} className="px-10 py-5 bg-white/5 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-sm hover:bg-white/10 transition-all">취소</button>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* 채팅창 */}
        {view === 'chat' && activeRoom && (
          <div className="flex-1 flex flex-col h-full max-w-4xl mx-auto w-full glass rounded-t-[3rem] border-x border-t border-white/5 overflow-hidden shadow-2xl relative">
            {/* 행성 소멸 안내 배너 - 최상단 고정 */}
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

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scroll">
               {messages.map(msg => {
                 const isMe = auth.currentUser && msg.userId === auth.currentUser.uid;
                 const isSystem = msg.userId === 'system';
                 if (isSystem) return <div key={msg.id} className="flex justify-center"><p className="text-[9px] font-black text-indigo-400/60 uppercase tracking-widest px-4 py-1.5 bg-indigo-500/5 rounded-full border border-indigo-500/10">{msg.message}</p></div>;
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

      {/* 방 개설 모달 */}
      {isCreatingRoom && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsCreatingRoom(false)}></div>
          <div className="relative glass p-10 rounded-[3rem] border border-white/10 w-full max-sm text-center animate-in zoom-in-95 duration-300">
             <div className="text-4xl mb-6">🪐</div>
             <h3 className="text-2xl font-mystic font-black text-white mb-2 uppercase tracking-widest">Create Planet</h3>
             <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-8 italic">새로운 영구 대화의 장을 탄생시킵니다.</p>
             <div className="space-y-6">
                <input 
                  type="text" 
                  value={newRoomTitle}
                  onChange={e => setNewRoomTitle(e.target.value)}
                  placeholder="행성의 이름을 지어주세요" 
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-white text-center font-bold focus:border-indigo-500 outline-none" 
                />
                <button onClick={handleCreateRoom} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-sm">탄생시키기 (1,000 L)</button>
             </div>
          </div>
        </div>
      )}

      {/* 선물 모달 (채팅방 내) */}
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

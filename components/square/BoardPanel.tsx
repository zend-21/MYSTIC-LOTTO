import React, { useState, useEffect } from 'react';
import { UserProfile, OrbState, BoardPost, BoardComment, ContentBlock } from '../../types';
import { OrbVisual } from '../FortuneOrb';
import { db, auth } from '../../services/firebase';
import {
  collection, query, onSnapshot, updateDoc, deleteDoc, doc,
  orderBy, limit, getDocs, startAfter, QueryDocumentSnapshot,
  runTransaction, arrayUnion, increment
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

const appFunctions = getFunctions(undefined, 'asia-northeast3');
const LIST_PAGE_SIZE = 30;

const MAX_TITLE_LENGTH = 100;
const MAX_TEXT_BLOCK_LENGTH = 2000;
const MAX_COMMENT_LENGTH = 500;
const MAX_IMAGE_BLOCKS = 10;
const MAX_IMAGE_TOTAL_MB = 50;
const MAX_IMAGE_TOTAL_BYTES = MAX_IMAGE_TOTAL_MB * 1024 * 1024;

function getYouTubeEmbedUrl(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

interface UIBlock {
  id: string;
  type: 'text' | 'image';
  text: string;
  file: File | null;
  previewUrl: string;
  uploadedUrl: string;
  isUploading: boolean;
}

function makeBlock(type: 'text' | 'image'): UIBlock {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type, text: '', file: null, previewUrl: '', uploadedUrl: '', isUploading: false,
  };
}

interface BoardPanelProps {
  profile: UserProfile;
  orb: OrbState;
  currentView: 'board' | 'post-detail' | 'post-edit';
  onSetView: (v: 'board' | 'post-detail' | 'post-edit') => void;
  onToast: (msg: string) => void;
  onPostCreated?: () => void;
  isAdmin?: boolean;
}

const BoardPanel: React.FC<BoardPanelProps> = ({ profile, orb, currentView, onSetView, onToast, onPostCreated, isAdmin }) => {
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [lastPostDoc, setLastPostDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [olderPosts, setOlderPosts] = useState<BoardPost[]>([]);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [isLoadingMorePosts, setIsLoadingMorePosts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [activePost, setActivePost] = useState<BoardPost | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);

  const [editingPost, setEditingPost] = useState<BoardPost | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editIsNotice, setEditIsNotice] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [uiBlocks, setUiBlocks] = useState<UIBlock[]>([makeBlock('text')]);

  const currentDisplayName = orb.nickname || orb.uniqueTag || '익명';
  const currentUid = auth.currentUser?.uid;

  useEffect(() => {
    if (currentView !== 'board' && currentView !== 'post-detail') return;
    if (currentView === 'board') { setOlderPosts([]); setLastPostDoc(null); }
    const q = query(collection(db, "square", "board", "posts"), orderBy("createdAt", "desc"), limit(LIST_PAGE_SIZE));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BoardPost)));
      setLastPostDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMorePosts(snapshot.docs.length === LIST_PAGE_SIZE);
    });
    return () => unsubscribe();
  }, [currentView]);

  useEffect(() => {
    if (!activePost) return;
    const updated = [...posts, ...olderPosts].find(p => p.id === activePost.id);
    if (updated) setActivePost(updated);
  }, [posts]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMorePosts = async () => {
    if (!lastPostDoc || isLoadingMorePosts) return;
    setIsLoadingMorePosts(true);
    try {
      const q = query(collection(db, "square", "board", "posts"), orderBy("createdAt", "desc"), startAfter(lastPostDoc), limit(LIST_PAGE_SIZE));
      const snap = await getDocs(q);
      setOlderPosts(prev => [...prev, ...snap.docs.map(d => ({ id: d.id, ...d.data() } as BoardPost))]);
      setLastPostDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMorePosts(snap.docs.length === LIST_PAGE_SIZE);
    } finally { setIsLoadingMorePosts(false); }
  };

  const handlePostClick = async (post: BoardPost) => {
    const uid = auth.currentUser?.uid;
    const isAuthor = uid && post.authorId === uid;
    const alreadyViewed = uid && (post.viewedBy || []).includes(uid);
    const shouldCount = uid && !isAuthor && !alreadyViewed;

    setActivePost({ ...post, views: shouldCount ? post.views + 1 : post.views });
    setDeleteConfirm(false);
    setCommentInput('');
    onSetView('post-detail');

    if (shouldCount) {
      updateDoc(doc(db, "square", "board", "posts", post.id), {
        views: increment(1),
        viewedBy: arrayUnion(uid),
      }).catch(() => {});
    }
  };

  // ── 블록 관리 ──────────────────────────────────────
  const addBlock = (type: 'text' | 'image', afterIndex: number) => {
    if (type === 'image' && uiBlocks.filter(b => b.type === 'image').length >= MAX_IMAGE_BLOCKS) {
      onToast(`이미지는 최대 ${MAX_IMAGE_BLOCKS}개까지 첨부할 수 있습니다.`);
      return;
    }
    setUiBlocks(prev => {
      const next = [...prev];
      next.splice(afterIndex + 1, 0, makeBlock(type));
      return next;
    });
  };

  const deleteBlock = (id: string) => {
    setUiBlocks(prev => {
      const block = prev.find(b => b.id === id);
      if (block?.type === 'image' && block.previewUrl && block.file) URL.revokeObjectURL(block.previewUrl);
      return prev.filter(b => b.id !== id);
    });
  };

  const updateBlockText = (id: string, text: string) => {
    setUiBlocks(prev => prev.map(b => b.id === id ? { ...b, text } : b));
  };

  const handleBlockImageSelect = (id: string, file: File) => {
    // 현재 블록 제외한 나머지 이미지 파일 총 크기
    const otherBytes = uiBlocks.reduce((sum, b) => {
      if (b.id === id) return sum;
      return sum + (b.type === 'image' && b.file ? b.file.size : 0);
    }, 0);
    if (otherBytes + file.size > MAX_IMAGE_TOTAL_BYTES) {
      onToast(`이미지 총 용량이 ${MAX_IMAGE_TOTAL_MB}MB를 초과합니다.`);
      return;
    }
    setUiBlocks(prev => prev.map(b => {
      if (b.id !== id) return b;
      if (b.previewUrl && b.file) URL.revokeObjectURL(b.previewUrl);
      return { ...b, file, previewUrl: URL.createObjectURL(file), uploadedUrl: '', isUploading: false };
    }));
  };

  const handleBlockImageUpload = async (id: string) => {
    const block = uiBlocks.find(b => b.id === id);
    if (!block?.file) return;
    setUiBlocks(prev => prev.map(b => b.id === id ? { ...b, isUploading: true } : b));
    try {
      const fn = httpsCallable(appFunctions, 'getR2UploadUrl');
      const result = await fn({ fileName: block.file!.name, contentType: block.file!.type });
      const { uploadUrl, publicUrl } = result.data as { uploadUrl: string; publicUrl: string };
      const res = await fetch(uploadUrl, { method: 'PUT', body: block.file, headers: { 'Content-Type': block.file!.type } });
      if (!res.ok) throw new Error('upload failed');
      setUiBlocks(prev => prev.map(b => b.id === id ? { ...b, uploadedUrl: publicUrl, isUploading: false } : b));
      onToast('이미지 업로드 완료!');
    } catch {
      setUiBlocks(prev => prev.map(b => b.id === id ? { ...b, isUploading: false } : b));
      onToast('이미지 업로드에 실패했습니다.');
    }
  };

  const resetForm = () => {
    setEditingPost(null); setEditTitle(''); setEditIsNotice(false); setVideoUrl('');
    uiBlocks.forEach(b => { if (b.type === 'image' && b.previewUrl && b.file) URL.revokeObjectURL(b.previewUrl); });
    setUiBlocks([makeBlock('text')]);
  };

  const enterEditMode = (post: BoardPost) => {
    setEditingPost(post); setEditTitle(post.title); setEditIsNotice(post.isNotice);
    if (post.blocks && post.blocks.length > 0) {
      setUiBlocks(post.blocks.map(b => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: b.type as 'text' | 'image',
        text: b.type === 'text' ? b.value : '',
        file: null,
        previewUrl: b.type === 'image' ? b.value : '',
        uploadedUrl: b.type === 'image' ? b.value : '',
        isUploading: false,
      })));
      setVideoUrl(post.mediaType === 'video' || post.mediaType === 'youtube' ? (post.mediaUrl ?? '') : '');
    } else {
      const blocks: UIBlock[] = [];
      if (post.content) blocks.push({ ...makeBlock('text'), text: post.content });
      if (post.mediaType === 'image' && post.mediaUrl) blocks.push({ ...makeBlock('image'), previewUrl: post.mediaUrl, uploadedUrl: post.mediaUrl });
      if (blocks.length === 0) blocks.push(makeBlock('text'));
      setUiBlocks(blocks);
      setVideoUrl(post.mediaType === 'video' || post.mediaType === 'youtube' ? (post.mediaUrl ?? '') : '');
    }
    onSetView('post-edit');
  };

  const handleSavePost = async () => {
    if (!editTitle.trim()) { onToast("제목을 입력해주세요."); return; }
    const unuploaded = uiBlocks.find(b => b.type === 'image' && b.file && !b.uploadedUrl);
    if (unuploaded) { onToast("이미지를 먼저 업로드해주세요."); return; }
    const savedBlocks: ContentBlock[] = uiBlocks
      .filter(b => (b.type === 'text' && b.text.trim()) || (b.type === 'image' && b.uploadedUrl))
      .map(b => ({ type: b.type as 'text' | 'image', value: b.type === 'text' ? b.text.trim() : b.uploadedUrl }));
    if (savedBlocks.length === 0) { onToast("내용을 입력해주세요."); return; }

    const embedUrl = getYouTubeEmbedUrl(videoUrl);
    const finalMediaUrl = videoUrl || null;
    const finalMediaType = videoUrl ? (embedUrl ? 'youtube' : 'video') : null;

    if (editingPost) {
      try {
        await updateDoc(doc(db, "square", "board", "posts", editingPost.id), {
          title: editTitle, blocks: savedBlocks, content: '',
          isNotice: isAdmin ? editIsNotice : editingPost.isNotice,
          mediaUrl: finalMediaUrl, mediaType: finalMediaType,
        });
        setActivePost({ ...editingPost, title: editTitle, blocks: savedBlocks, content: '', isNotice: isAdmin ? editIsNotice : editingPost.isNotice, mediaUrl: finalMediaUrl ?? undefined, mediaType: finalMediaType ?? undefined });
        resetForm(); onSetView('post-detail'); onToast("소식이 수정되었습니다.");
      } catch { onToast("수정에 실패했습니다."); }
    } else {
      const authorName = (isAdmin && editIsNotice) ? '회람판 관리자' : currentDisplayName;
      let postNumber = 0;
      if (!editIsNotice) {
        try {
          const metaRef = doc(db, "square", "board", "meta");
          await runTransaction(db, async (tx) => {
            const metaSnap = await tx.get(metaRef);
            postNumber = (metaSnap.data()?.nextPostNumber ?? 0) + 1;
            tx.set(metaRef, { nextPostNumber: postNumber }, { merge: true });
          });
        } catch { postNumber = 0; }
      }
      try {
        const newPostRef = doc(collection(db, "square", "board", "posts"));
        await runTransaction(db, async (tx) => {
          tx.set(newPostRef, {
            title: editTitle, blocks: savedBlocks, content: '', authorName,
            authorLevel: orb.level, authorId: currentUid || null,
            postNumber: editIsNotice ? null : postNumber,
            views: 0, likes: 0, likedBy: [],
            createdAt: Date.now(), isNotice: isAdmin ? editIsNotice : false,
            mediaUrl: finalMediaUrl, mediaType: finalMediaType, comments: []
          });
        });
        resetForm(); onSetView('board');
        onToast(editIsNotice ? "공지가 등록되었습니다." : "회람판에 소식이 게시되었습니다.");
        if (!editIsNotice) onPostCreated?.();
      } catch { onToast("게시글 작성에 실패했습니다."); }
    }
  };

  const handleDeletePost = async (post: BoardPost) => {
    try {
      await deleteDoc(doc(db, "square", "board", "posts", post.id));
      setDeleteConfirm(false); onSetView('board'); onToast("게시글이 삭제되었습니다.");
    } catch { onToast("삭제에 실패했습니다."); }
  };

  const handlePostLike = async (post: BoardPost) => {
    if (!currentUid) { onToast("로그인이 필요합니다."); return; }
    if (post.authorId === currentUid) { onToast("본인의 글에는 공명을 줄 수 없습니다."); return; }
    if (post.likedBy?.includes(currentUid)) { onToast("이미 공명을 보냈습니다."); return; }
    try {
      const postRef = doc(db, "square", "board", "posts", post.id);
      const newLikes = post.likes + 1;
      await updateDoc(postRef, { likes: increment(1), likedBy: arrayUnion(currentUid) });
      setActivePost(prev => prev ? { ...prev, likes: newLikes, likedBy: [...(prev.likedBy ?? []), currentUid] } : prev);
      onToast("공명을 보냈습니다! ✨");
      if (newLikes % 10 === 0 && post.authorId && post.authorId !== currentUid) {
        const { addDoc: firestoreAddDoc } = await import('firebase/firestore');
        await firestoreAddDoc(collection(db, "users", post.authorId, "inbox"), {
          type: 'exp', amount: 10, fromPostId: post.id, timestamp: Date.now(),
        }).catch(() => {});
      }
    } catch { onToast("공명에 실패했습니다."); }
  };

  const MAX_COMMENTS = 100;

  const handleAddComment = async () => {
    if (!commentInput.trim() || !activePost) return;
    if (!currentUid) { onToast("로그인이 필요합니다."); return; }
    if ((activePost.comments?.length ?? 0) >= MAX_COMMENTS) {
      onToast(`댓글은 최대 ${MAX_COMMENTS}개까지 작성할 수 있습니다.`);
      return;
    }
    setIsAddingComment(true);
    const newComment: BoardComment = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      authorName: currentDisplayName, authorLevel: orb.level,
      content: commentInput.trim(), createdAt: Date.now(),
    };
    try {
      const newComments = [...(activePost.comments ?? []), newComment];
      await updateDoc(doc(db, "square", "board", "posts", activePost.id), { comments: newComments });
      setActivePost({ ...activePost, comments: newComments });
      setCommentInput('');
    } catch { onToast("댓글 작성에 실패했습니다."); }
    finally { setIsAddingComment(false); }
  };

  const handleDeleteComment = async (comment: BoardComment) => {
    if (!activePost) return;
    try {
      const newComments = (activePost.comments ?? []).filter(c => c.id !== comment.id);
      await updateDoc(doc(db, "square", "board", "posts", activePost.id), { comments: newComments });
      setActivePost({ ...activePost, comments: newComments });
    } catch { onToast("댓글 삭제에 실패했습니다."); }
  };

  // 미디어 렌더 (구형 포스트 + 동영상)
  const renderMedia = (post: BoardPost) => {
    if (!post.mediaUrl) return null;
    const embedUrl = post.mediaType === 'youtube' ? getYouTubeEmbedUrl(post.mediaUrl) : null;
    return (
      <div className="w-full rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl">
        {post.mediaType === 'image' && <img src={post.mediaUrl} alt="media" className="w-full h-auto object-cover" />}
        {post.mediaType === 'video' && <video src={post.mediaUrl} controls className="w-full h-auto" />}
        {post.mediaType === 'youtube' && embedUrl && (
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <iframe src={embedUrl} className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
        )}
      </div>
    );
  };

  // 게시글 본문 렌더 (블록 형식 + 구형 호환)
  const renderPostContent = (post: BoardPost) => {
    if (post.blocks && post.blocks.length > 0) {
      return (
        <div className="space-y-4 py-2">
          {post.blocks.map((block, i) =>
            block.type === 'text'
              ? <p key={i} className="text-slate-300 leading-loose text-base whitespace-pre-wrap">{block.value}</p>
              : <img key={i} src={block.value} alt="" className="w-full h-auto rounded-[2rem] border border-white/10 shadow-xl" />
          )}
          {(post.mediaType === 'video' || post.mediaType === 'youtube') && renderMedia(post)}
        </div>
      );
    }
    return (
      <div className="space-y-6 py-2">
        {renderMedia(post)}
        <p className="text-slate-300 leading-loose text-base whitespace-pre-wrap">{post.content}</p>
      </div>
    );
  };

  const allPosts = [...posts, ...olderPosts];
  const filteredPosts = searchQuery.trim()
    ? allPosts.filter(p => {
        const q = searchQuery.toLowerCase();
        return p.title.toLowerCase().includes(q)
          || (p.content ?? '').toLowerCase().includes(q)
          || (p.blocks ?? []).some(b => b.type === 'text' && b.value.toLowerCase().includes(q));
      })
    : allPosts;

  // 공지 최상단 고정 (공지끼리는 날짜 내림차순, 일반 글은 그 아래)
  const sortedFilteredPosts = [...filteredPosts].sort((a, b) => {
    if (a.isNotice && !b.isNotice) return -1;
    if (!a.isNotice && b.isNotice) return 1;
    return b.createdAt - a.createdAt;
  });

  // ── 게시판 목록 ──────────────────────────────────────
  if (currentView === 'board') {
    return (
      <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scroll">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <h3 className="text-2xl font-mystic font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-indigo-300 tracking-tight">천상의 회람판</h3>
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">Celestial Bulletin</p>
            </div>
            <button onClick={() => { resetForm(); onSetView('post-edit'); }} className="px-8 py-3 bg-emerald-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:bg-emerald-500 transition-all">글쓰기</button>
          </div>

          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="제목 또는 내용 검색..."
              className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:border-emerald-500 outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {sortedFilteredPosts.length === 0 && (
              <div className="text-center py-16 text-slate-600 text-sm font-bold">
                {searchQuery ? '검색 결과가 없습니다.' : '아직 게시글이 없습니다.'}
              </div>
            )}
            {sortedFilteredPosts.map(post => (
              <button
                key={post.id}
                onClick={() => handlePostClick(post)}
                className={`w-full glass p-5 rounded-2xl border text-left flex items-center gap-4 group transition-all ${post.isNotice ? 'border-amber-500/30 bg-amber-500/5' : 'border-white/5 hover:border-emerald-500/40'}`}
              >
                <div className="w-7 shrink-0 text-center">
                  {post.isNotice
                    ? <span className="bg-amber-500 text-slate-950 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">공지</span>
                    : <span className="text-[11px] font-black text-slate-600">{post.postNumber || '-'}</span>
                  }
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h4 className={`text-xs font-black truncate group-hover:text-emerald-400 transition-colors ${post.isNotice ? 'text-amber-300' : 'text-slate-200'}`}>{post.title}</h4>
                    {(post.comments?.length ?? 0) > 0 && <span className="text-indigo-400 text-[10px] font-black shrink-0">[{post.comments.length}]</span>}
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <span className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                      {!post.isNotice && (
                        post.authorLevel >= 300
                          ? <span className="border border-emerald-500 text-emerald-400 text-[8px] font-black px-1.5 py-0.5 rounded shrink-0">M</span>
                          : post.authorLevel >= 200
                          ? <span className="border border-indigo-400 text-indigo-400 text-[8px] font-black px-1.5 py-0.5 rounded shrink-0">C</span>
                          : <span className="text-slate-600 shrink-0">Lv.{post.authorLevel}</span>
                      )}
                      <span className="truncate">{post.authorName}</span>
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        {post.views}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                        {post.likes}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {!searchQuery && hasMorePosts && (
            <div className="flex justify-center pt-2">
              <button onClick={loadMorePosts} disabled={isLoadingMorePosts}
                className="px-10 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-50">
                {isLoadingMorePosts ? '불러오는 중...' : '이전 소식 더 보기'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── 게시글 상세 ──────────────────────────────────────
  if (currentView === 'post-detail' && activePost) {
    const isAuthor = activePost.authorId === currentUid;
    const canDelete = isAuthor || isAdmin;
    const alreadyLiked = !!(currentUid && activePost.likedBy?.includes(currentUid));
    const canLike = !!(currentUid && !isAuthor && !alreadyLiked);

    return (
      <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scroll">
        <div className="max-w-4xl mx-auto space-y-8 pb-32">

          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <OrbVisual level={activePost.authorLevel} className="w-12 h-12 border border-white/10 shrink-0 mt-1" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {activePost.isNotice && <span className="bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase shrink-0">공지</span>}
                    {activePost.postNumber && !activePost.isNotice && <span className="text-slate-600 text-xs font-black">No.{activePost.postNumber}</span>}
                  </div>
                  <h3 className="text-xl font-black text-white leading-snug">{activePost.title}</h3>
                  <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1.5 flex-wrap">
                    <span>{activePost.authorName} (Lv.{activePost.authorLevel})</span>
                    <span>·</span>
                    <span>{new Date(activePost.createdAt).toLocaleString()}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      조회 {activePost.views}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isAuthor && (
                  <button onClick={() => enterEditMode(activePost)} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-sky-500/20 hover:border-sky-500/30 hover:text-sky-400 transition-all">수정</button>
                )}
                {canDelete && !deleteConfirm && (
                  <button onClick={() => setDeleteConfirm(true)} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400 transition-all">삭제</button>
                )}
                {deleteConfirm && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">삭제?</span>
                    <button onClick={() => handleDeletePost(activePost)} className="px-3 py-2 bg-red-600 rounded-xl text-[10px] font-black text-white uppercase hover:bg-red-500 transition-all">확인</button>
                    <button onClick={() => setDeleteConfirm(false)} className="px-3 py-2 bg-white/5 rounded-xl text-[10px] font-black text-slate-400 uppercase hover:bg-white/10 transition-all">취소</button>
                  </div>
                )}
              </div>
            </div>
            <div className="h-px bg-white/5 w-full"></div>
          </div>

          {renderPostContent(activePost)}

          <div className="flex justify-center py-6">
            <button
              onClick={() => handlePostLike(activePost)}
              disabled={!canLike}
              className={`flex flex-col items-center gap-2 group transition-all ${!canLike ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <div className={`w-16 h-16 rounded-full border flex items-center justify-center transition-all shadow-xl ${alreadyLiked ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-500'}`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill={alreadyLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                </svg>
              </div>
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                {isAuthor ? '내 글' : alreadyLiked ? '공명 완료' : '공명하기'} ({activePost.likes})
              </span>
            </button>
          </div>

          <div className="space-y-4">
            <div className="h-px bg-white/5 w-full"></div>
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              댓글 {(activePost.comments?.length ?? 0) > 0 ? `(${activePost.comments.length})` : ''}
            </h4>

            {(activePost.comments?.length ?? 0) > 0 && (
              <div className="space-y-3">
                {activePost.comments.map(comment => {
                  const isCommentAuthor = comment.authorName === currentDisplayName;
                  const canDeleteComment = isCommentAuthor || isAdmin;
                  return (
                    <div key={comment.id} className="flex gap-3 group">
                      <OrbVisual level={comment.authorLevel} className="w-8 h-8 border border-white/10 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0 bg-white/3 rounded-2xl px-4 py-3 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400">{comment.authorName}</span>
                            <span className="text-[9px] text-slate-600">Lv.{comment.authorLevel}</span>
                            <span className="text-[9px] text-slate-700">{new Date(comment.createdAt).toLocaleDateString()}</span>
                          </div>
                          {canDeleteComment && (
                            <button onClick={() => handleDeleteComment(comment)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-3">
              <OrbVisual level={orb.level} className="w-8 h-8 border border-white/10 shrink-0 mt-2" />
              <div className="flex-1 space-y-2">
                <textarea
                  value={commentInput}
                  onChange={e => setCommentInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddComment(); }}
                  placeholder="댓글을 남기십시오..."
                  rows={2}
                  maxLength={MAX_COMMENT_LENGTH}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-emerald-500 outline-none resize-none"
                />
                <div className="flex justify-between items-center">
                  <span className={`text-[9px] font-bold ${commentInput.length >= MAX_COMMENT_LENGTH ? 'text-rose-500' : 'text-slate-600'}`}>{commentInput.length}/{MAX_COMMENT_LENGTH}</span>
                  <button
                    onClick={handleAddComment}
                    disabled={!commentInput.trim() || isAddingComment}
                    className="px-6 py-2 bg-emerald-600 text-white text-xs font-black rounded-xl uppercase tracking-widest hover:bg-emerald-500 transition-all disabled:opacity-40"
                  >
                    {isAddingComment ? '작성 중...' : '댓글 달기'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 게시글 작성 / 수정 ──────────────────────────────────────
  if (currentView === 'post-edit') {
    const isEditMode = editingPost !== null;
    const youtubeEmbed = getYouTubeEmbedUrl(videoUrl);

    return (
      <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scroll">
        <div className="max-w-3xl mx-auto space-y-8 pb-32">
          <div className="space-y-2">
            <h3 className="text-2xl font-mystic font-black text-white uppercase tracking-widest">{isEditMode ? '소식 수정하기' : '소식 전하기'}</h3>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest italic">
              {isEditMode ? '내용을 수정한 뒤 저장하십시오.' : '당신의 행운이나 소소한 공명을 기록으로 남기십시오.'}
            </p>
          </div>

          <div className="space-y-6">
            {/* 제목 */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">제목</label>
              <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)}
                maxLength={MAX_TITLE_LENGTH}
                placeholder="전하고 싶은 메시지의 제목을 입력하세요"
                className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-white font-bold focus:border-emerald-500 outline-none" />
              <p className={`text-right text-[9px] font-bold pr-1 ${editTitle.length >= MAX_TITLE_LENGTH ? 'text-rose-500' : 'text-slate-600'}`}>{editTitle.length}/{MAX_TITLE_LENGTH}</p>
            </div>

            {/* 블록 에디터 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">내용</label>
                {uiBlocks.some(b => b.type === 'image' && b.file) && (() => {
                  const totalMB = uiBlocks.reduce((s, b) => s + (b.type === 'image' && b.file ? b.file.size : 0), 0) / 1024 / 1024;
                  return <span className={`text-[9px] font-bold ${totalMB >= MAX_IMAGE_TOTAL_MB ? 'text-rose-500' : 'text-slate-500'}`}>이미지 {totalMB.toFixed(1)}MB / {MAX_IMAGE_TOTAL_MB}MB</span>;
                })()}
              </div>
              <div className="space-y-2">
                {uiBlocks.map((block, index) => (
                  <div key={block.id}>
                    {/* 텍스트 블록 */}
                    {block.type === 'text' && (
                      <div className="relative group/block">
                        <textarea
                          value={block.text}
                          onChange={e => updateBlockText(block.id, e.target.value)}
                          placeholder="내용을 입력하세요..."
                          rows={5}
                          maxLength={MAX_TEXT_BLOCK_LENGTH}
                          className="w-full bg-slate-950/50 border border-slate-800 rounded-3xl p-6 text-white text-sm focus:border-emerald-500 outline-none resize-none"
                        />
                        <p className={`text-right text-[9px] font-bold pr-2 mt-1 ${block.text.length >= MAX_TEXT_BLOCK_LENGTH ? 'text-rose-500' : 'text-slate-600'}`}>{block.text.length}/{MAX_TEXT_BLOCK_LENGTH}</p>
                        {uiBlocks.length > 1 && (
                          <button type="button" onClick={() => deleteBlock(block.id)}
                            className="absolute top-3 right-3 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-slate-600 opacity-0 group-hover/block:opacity-100 hover:text-red-400 hover:bg-red-900/20 transition-all">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                          </button>
                        )}
                      </div>
                    )}

                    {/* 이미지 블록 */}
                    {block.type === 'image' && (
                      <div className="relative group/block">
                        <input type="file" accept="image/*" id={`img-${block.id}`} className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleBlockImageSelect(block.id, f); e.target.value = ''; }} />

                        {!block.previewUrl ? (
                          <button type="button" onClick={() => document.getElementById(`img-${block.id}`)?.click()}
                            className="w-full py-10 border-2 border-dashed border-slate-700 rounded-3xl text-slate-500 text-xs font-black uppercase tracking-widest hover:border-sky-500/50 hover:text-sky-400 transition-all flex flex-col items-center gap-2">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                            <span>이미지 선택</span>
                          </button>
                        ) : (
                          <div className="space-y-3">
                            <div className="relative w-full rounded-3xl overflow-hidden border border-white/10">
                              <img src={block.previewUrl} alt="preview" className="w-full h-auto max-h-72 object-cover" />
                            </div>
                            <div className="flex items-center gap-3">
                              {block.uploadedUrl ? (
                                <div className="flex items-center gap-2 text-emerald-400 text-xs font-black">
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                                  <span>업로드 완료</span>
                                </div>
                              ) : (
                                <button type="button" onClick={() => handleBlockImageUpload(block.id)} disabled={block.isUploading}
                                  className="px-6 py-2.5 bg-sky-600 text-white text-xs font-black rounded-xl uppercase tracking-widest hover:bg-sky-500 transition-all disabled:opacity-50">
                                  {block.isUploading ? '업로드 중...' : '업로드'}
                                </button>
                              )}
                              <button type="button" onClick={() => document.getElementById(`img-${block.id}`)?.click()}
                                className="px-6 py-2.5 bg-white/5 text-slate-400 text-xs font-black rounded-xl uppercase tracking-widest hover:bg-white/10 transition-all">변경</button>
                            </div>
                          </div>
                        )}

                        {uiBlocks.length > 1 && (
                          <button type="button" onClick={() => deleteBlock(block.id)}
                            className="absolute top-3 right-3 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-slate-600 opacity-0 group-hover/block:opacity-100 hover:text-red-400 hover:bg-red-900/20 transition-all">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                          </button>
                        )}
                      </div>
                    )}

                    {/* 블록 추가 버튼 */}
                    <div className="flex items-center gap-2 py-1.5">
                      <div className="flex-1 h-px bg-white/5"></div>
                      <button type="button" onClick={() => addBlock('text', index)}
                        className="px-3 py-1 text-[9px] font-black text-slate-600 bg-white/3 border border-white/5 rounded-lg uppercase tracking-widest hover:bg-white/10 hover:text-slate-300 transition-all flex items-center gap-1">
                        <span>+</span> 텍스트
                      </button>
                      <button type="button" onClick={() => addBlock('image', index)}
                        className="px-3 py-1 text-[9px] font-black text-slate-600 bg-white/3 border border-white/5 rounded-lg uppercase tracking-widest hover:bg-sky-500/20 hover:text-sky-400 hover:border-sky-500/20 transition-all flex items-center gap-1">
                        <span>+</span> 이미지
                      </button>
                      <div className="flex-1 h-px bg-white/5"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 동영상 URL */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">동영상 URL (선택) — YouTube 또는 직접 링크</label>
              <input type="text" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=... 또는 영상 직접 링크"
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-xs text-white focus:border-emerald-500 outline-none" />
              {videoUrl && (
                <div className="w-full rounded-3xl overflow-hidden border border-white/10">
                  {youtubeEmbed ? (
                    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                      <iframe src={youtubeEmbed} className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    </div>
                  ) : <video src={videoUrl} controls className="w-full h-auto max-h-64" />}
                </div>
              )}
            </div>

            {/* 관리자 공지 */}
            {isAdmin && (
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div onClick={() => setEditIsNotice(v => !v)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${editIsNotice ? 'bg-indigo-600 border-indigo-600' : 'border-slate-600'}`}>
                  {editIsNotice && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">공지로 등록 (작성자명: 회람판 관리자)</span>
              </label>
            )}

            <div className="pt-6 flex gap-4">
              <button onClick={handleSavePost}
                className={`flex-1 py-5 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-sm transition-all ${editIsNotice ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
                {isEditMode ? '수정 저장' : (editIsNotice ? '공지 올리기' : '소식 올리기')}
              </button>
              <button onClick={() => { resetForm(); isEditMode ? onSetView('post-detail') : onSetView('board'); }}
                className="px-10 py-5 bg-white/5 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-sm hover:bg-white/10 transition-all">취소</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default BoardPanel;


// 최고관리자 UID 목록
const ADMIN_UIDS = ['o5XegbLlnPVJhZtn31HXyddBGKW2'];
// 관리자 레벨/포인트 상수
const ADMIN_LEVEL = 300;
const SUB_ADMIN_LEVEL = 200;
const ADMIN_INFINITE_POINTS = 999999999; // ∞ 표시 기준값
// 포인트 표시 헬퍼
const displayPoints = (pts: number) => pts == null ? '0' : pts >= ADMIN_INFINITE_POINTS ? '∞' : pts.toLocaleString();
// 약관 버전 — 개정 시 이 값을 올리면 모든 유저에게 강제 재동의 요청
const CURRENT_TERMS_VERSION = '1.0';

// KST(UTC+9) 기준 날짜 문자열 반환 (YYYY-MM-DD)
// new Date().toISOString()은 UTC 기준이라 자정~오전9시 사이에 날짜가 안 바뀌는 버그 방지
const getKSTDateString = () =>
  new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];

// 활성 데코레이션 계산 헬퍼
const getActiveDecoration = (orb: { activeDecorationId?: string }) =>
  ORB_DECORATIONS.find(d => d.id === orb.activeDecorationId) || ORB_DECORATIONS[0];

import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, FortuneResult, SavedFortune, OrbState, LottoRound, ORB_DECORATIONS, GOLDEN_CARD_PRICE, AnnualDestiny, ScientificAnalysisResult, ScientificFilterConfig, DAILY_LIMIT, COST_ANNUAL, INITIAL_POINTS } from './types';
import { getFortuneAndNumbers, getFixedDestinyNumbers, spendPoints, performOffering } from './services/geminiService';
import { getScientificRecommendation } from './services/scientificService';
import FortuneOrb, { OrbVisual } from './components/FortuneOrb';
import LottoGenerator from './components/LottoGenerator';
import GoldenCard from './components/GoldenCard';
import SacredOffering from './components/SacredOffering';
import DivineEffect from './components/DivineEffect';
import EternalRitual from './components/EternalRitual';
import ScientificAnalysis from './components/ScientificAnalysis';
import CelestialSquare from './components/CelestialSquare';
import UserProfilePage from './components/UserProfilePage';
import MysticAnalysisLab from './components/MysticAnalysisLab';
import ProfileSetupForm from './components/ProfileSetupForm';
import AdminModal from './components/AdminModal';
import AnnualReportModal from './components/AnnualReportModal';
import { LegalModal, TermsContent, PrivacyContent } from './components/LegalDocs';

// Firebase imports
import { auth, db, app as firebaseApp, loginWithGoogle, logout } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, query, orderBy, deleteDoc, limit as fsLimit, runTransaction, updateDoc, where, getDocs, writeBatch } from "firebase/firestore";
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions(firebaseApp, 'asia-northeast3');

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const isAdmin = ADMIN_UIDS.includes(currentUser?.uid ?? '');
  const [subAdminConfig, setSubAdminConfig] = useState<{ [uid: string]: number }>({});
  const isSubAdmin = !isAdmin && (currentUser?.uid ? currentUser.uid in subAdminConfig : false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [scienceLoading, setScienceLoading] = useState(false);
  const [fixedRitualLoading, setFixedRitualLoading] = useState(false);
  const [result, setResult] = useState<FortuneResult | null>(null);
  const [divineSavedAt, setDivineSavedAt] = useState<number | null>(null);
  const [scienceResult, setScientificResult] = useState<ScientificAnalysisResult | null>(null);
  const [showShop, setShowShop] = useState(false);
  const [activeTab, setActiveTab] = useState<'orb' | 'treasury' | 'offering' | 'science' | 'shop'>('orb');
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  // 약관 모달
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showGoldenCardInfo, setShowGoldenCardInfo] = useState(false);
  const [showGoldenCardConfirm, setShowGoldenCardConfirm] = useState(false);
  // 기존 유저 약관 동의 오버레이 체크박스
  const [overlayAgreedTerms, setOverlayAgreedTerms] = useState(false);
  const [overlayAgreedPrivacy, setOverlayAgreedPrivacy] = useState(false);
  // 기존 유저 약관 동의 여부 (Firestore 기준)
  const [termsAccepted, setTermsAccepted] = useState<boolean | null>(null);
  const [view, setView] = useState<'main' | 'square' | 'profile' | 'analysis'>('main');
  const [showProfileOverlay, setShowProfileOverlay] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isRitualUnlocked, setIsRitualUnlocked] = useState(false);
  const [showFullAnnualReport, setShowFullAnnualReport] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'divine' | 'scientific' | null;
  }>({
    isOpen: false,
    type: null
  });

  const [pendingScienceConfig, setPendingScienceConfig] = useState<ScientificFilterConfig | null>(null);

  const onToast = (msg: string) => setToast(msg);

  const [lottoHistory, setLottoHistory] = useState<LottoRound[]>([]);

  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [showMiningModal, setShowMiningModal] = useState(false);
  const [hasNewReports, setHasNewReports] = useState(false);
  const [hasNewInquiries, setHasNewInquiries] = useState(false);
  const [hasRepReply, setHasRepReply] = useState(false);
  const [hasInqReply, setHasInqReply] = useState(false);

  const [archives, setArchives] = useState<SavedFortune[]>([]);
  const [offeringData, setOfferingData] = useState<{amount: number, multiplier: number} | null>(null);
  const [isOfferingLoading, setIsOfferingLoading] = useState(false);
  const [lumenReceivedAt, setLumenReceivedAt] = useState(0);
  const [lumenSenderName, setLumenSenderName] = useState('');

  const [orb, setOrb] = useState<OrbState>({
    level: 1,
    exp: 0,
    color: '#6366f1',
    aura: '#6366f1',
    points: INITIAL_POINTS,
    activeDecorationId: 'default',
    purchasedDecorationIds: ['default'],
    hasGoldenCard: false,
    giftHistory: [],
    mailbox: [],
    purchaseHistory: [],
    annualDestinies: {},
    dailyExtractCount: 0,
    lastExtractDate: getKSTDateString(),
    favoriteRoomIds: [],
    lastVisitDate: '',
    dailyOrbTapExp: 0,
    dailyPostCount: 0,
  });

  // --- Firebase Sync Logic ---

  // 유니크 태그 생성 (최초 1회, 충돌 방지 트랜잭션)
  const ensureUniqueTag = async (user: import('firebase/auth').User) => {
    const userDocRef = doc(db, "users", user.uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists() && snap.data()?.orb?.uniqueTag) return; // 이미 있으면 패스

    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const genCandidate = () => Array.from({ length: 7 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');

    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = genCandidate();
      const tagDocRef = doc(db, "userTags", candidate);
      try {
        await runTransaction(db, async (tx) => {
          const tagSnap = await tx.get(tagDocRef);
          if (tagSnap.exists()) throw new Error("taken");
          tx.set(tagDocRef, { uid: user.uid });
          tx.set(userDocRef, { orb: { uniqueTag: `@${candidate}` } }, { merge: true });
        });
        break; // 성공 시 루프 종료
      } catch {
        // 충돌 시 재시도
      }
    }
  };

  // 웰컴 모달: 최초 1회 (localStorage 기준)
  useEffect(() => {
    if (!localStorage.getItem('mlotto_welcome_v1')) {
      setShowWelcomeModal(true);
    }
  }, []);

  // 1. Auth & Data Stream
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        ensureUniqueTag(user);

        // 부관리자 설정 로드
        const subAdminSnap = await getDoc(doc(db, "config", "subAdmins"));
        const subAdminData: { [uid: string]: number } = subAdminSnap.exists()
          ? (subAdminSnap.data() as { [uid: string]: number })
          : {};
        setSubAdminConfig(subAdminData);

        const userDocRef = doc(db, "users", user.uid);
        const unsubscribeUser = onSnapshot(userDocRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data.profile) setProfile(data.profile);
            if (data.orb) {
              let orbData = { ...data.orb };
              if (ADMIN_UIDS.includes(user.uid)) {
                // 최고관리자: 레벨 300 고정, 무한 루멘
                orbData.level = ADMIN_LEVEL;
                orbData.points = ADMIN_INFINITE_POINTS;
              } else if (user.uid in subAdminData) {
                // 부관리자: 레벨 200 미만으로 떨어지지 않음
                orbData.level = Math.max(orbData.level ?? 1, SUB_ADMIN_LEVEL);
                // 최초 부관리자 임명 시 포인트 설정 (레벨이 200 미만이었던 경우)
                if ((data.orb.level ?? 1) < SUB_ADMIN_LEVEL) {
                  orbData.points = subAdminData[user.uid];
                  setDoc(userDocRef, { orb: orbData }, { merge: true });
                }
              }
              setOrb(orbData);

              // 매일 첫 방문 보너스 (100 루멘) — 서버사이드 1일 1회 보장
              if (!hasGrantedVisitBonusRef.current) {
                hasGrantedVisitBonusRef.current = true;
                const today = getKSTDateString();
                if ((orbData.lastVisitDate || '') !== today) {
                  httpsCallable(functions, 'claimDailyBonus')({})
                    .then((res: any) => { if (res.data?.granted) setToast("매일 첫 방문 보너스: +100 루멘! 🌟"); })
                    .catch(() => {});
                }
              }
            }
          } else {
            // New user initialization
            setDoc(userDocRef, { orb: { ...orb, points: INITIAL_POINTS } }, { merge: true });
          }
          // 약관 동의 여부 — 버전까지 일치해야 동의 완료로 인정
          if (snap.exists()) {
            setTermsAccepted(snap.data().termsVersion === CURRENT_TERMS_VERSION);
          } else {
            // 신규 유저: 로그인 후 약관 동의 오버레이에서 처리
            setTermsAccepted(false);
          }
        });
        const archivesQuery = query(collection(db, "users", user.uid, "archives"), orderBy("timestamp", "desc"));
        const unsubscribeArchives = onSnapshot(archivesQuery, (snapshot) => {
          setArchives(snapshot.docs.map(d => d.data() as SavedFortune));
        });

        // 선물 inbox 리스너 — 새 항목 감지 시 서버사이드 processInbox 호출
        const inboxRef = collection(db, "users", user.uid, "inbox");
        const unsubscribeInbox = onSnapshot(inboxRef, async (snap) => {
          if (snap.empty) return;
          try {
            const res = await httpsCallable<object, { totalGift: number; totalExp: number; senders: string[] }>(functions, 'processInbox')({});
            const { totalGift, totalExp, senders } = res.data;
            if (totalGift > 0) {
              setToast(`${totalGift.toLocaleString()} 루멘을 선물받았습니다! ✨`);
              setLumenSenderName(senders[senders.length - 1] || '');
              setLumenReceivedAt(Date.now());
            }
            if (totalExp > 0) {
              // exp/level은 클라이언트에서 계산 (레벨업 로직 포함)
              setOrb((prev: OrbState) => {
                const newExp = prev.exp + totalExp;
                let newLevel = Math.floor(newExp / 100) + 1;
                if (ADMIN_UIDS.includes(user.uid)) newLevel = ADMIN_LEVEL;
                else if (user.uid in subAdminData) newLevel = Math.max(newLevel, SUB_ADMIN_LEVEL);
                const colors = ['#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6'];
                const color = colors[newLevel % colors.length];
                return { ...prev, level: newLevel, exp: newExp, color, aura: color + '80' };
              });
              setToast(`게시글 공명 10회 달성! +${(totalExp / 10 * 0.1).toFixed(1)}레벨 🌟`);
            }
          } catch { /* 무시 */ }
        });

        // 세션 복구 체크 — 결과 수신 전 앱이 종료된 경우 복구
        getDoc(doc(db, "users", user.uid, "session", "data")).then(snap => {
          if (!snap.exists()) return;
          const session = snap.data();
          const RECOVERY_WINDOW = 24 * 60 * 60 * 1000;
          const now = Date.now();
          const updates: Record<string, boolean> = {};

          if (session.divine && !session.divine.viewed && (now - session.divine.savedAt) < RECOVERY_WINDOW) {
            setResult(session.divine.data as FortuneResult);
            setDivineSavedAt(session.divine.savedAt as number);
            setToast("이전에 발행된 천기를 복구했습니다. ✨");
            updates['divine.viewed'] = true;
          }

          if (session.science_full && !session.science_full.viewed && (now - session.science_full.savedAt) < RECOVERY_WINDOW) {
            setScientificResult(session.science_full.data as ScientificAnalysisResult);
            updates['science_full.viewed'] = true;
          }

          if (session.annual && !session.annual.viewed && (now - session.annual.savedAt) < RECOVERY_WINDOW) {
            const res = session.annual.data;
            const recoveredYear = new Date(session.annual.savedAt).getFullYear();
            const annual: AnnualDestiny = {
              year: recoveredYear,
              numbers: res.luckyNumbers,
              luckyColor: res.luckyColor,
              reason: res.destinyDescription,
              planningStrategy: res.planningStrategy,
              bestMonths: res.bestMonths,
              worstMonths: res.worstMonths,
              wealthDetailed: res.wealthDetailed,
              loveDetailed: res.loveDetailed,
              healthDetailed: res.healthDetailed,
              tarotDetailed: res.tarotDetailed,
              tarotCardName: res.tarotCardName,
              astrologyDetailed: res.astrologyDetailed,
              sajuDeepDive: res.sajuDeepDive,
              numberExplanations: res.numberExplanations,
              timestamp: session.annual.savedAt,
            };
            updateDoc(doc(db, "users", user.uid), {
              [`orb.annualDestinies.${recoveredYear}`]: annual
            }).catch(() => {});
            setToast("이전에 생성된 연간 대운 리포트를 복구했습니다. ✨");
            updates['annual.viewed'] = true;
          }

          if (Object.keys(updates).length > 0) {
            updateDoc(doc(db, "users", user.uid, "session", "data"), updates).catch(() => {});
          }
        }).catch(() => {});

        // 관리자 전용: 미열람 신고/문의 실시간 감지 / 일반 사용자: 답변 알림
        let unsubscribeReports = () => {};
        let unsubscribeInquiries = () => {};
        let unsubscribeRepReply = () => {};
        let unsubscribeInqReply = () => {};
        if (ADMIN_UIDS.includes(user.uid)) {
          const reportsQ = query(collection(db, 'reports'), where('isReadByAdmin', '==', false), fsLimit(1));
          unsubscribeReports = onSnapshot(reportsQ, snap => setHasNewReports(!snap.empty));
          const inquiriesQ = query(collection(db, 'inquiries'), where('isReadByAdmin', '==', false), fsLimit(1));
          unsubscribeInquiries = onSnapshot(inquiriesQ, snap => setHasNewInquiries(!snap.empty));
        } else {
          // 신고 답변 미읽음
          const repReplyQ = query(collection(db, 'reports'), where('reporterUid', '==', user.uid), where('isReplyRead', '==', false));
          unsubscribeRepReply = onSnapshot(repReplyQ, snap => setHasRepReply(snap.docs.some(d => !!d.data().adminReply)));
          // 문의 답변 미읽음
          const inqReplyQ = query(collection(db, 'inquiries'), where('uid', '==', user.uid), where('isReplyRead', '==', false));
          unsubscribeInqReply = onSnapshot(inqReplyQ, snap => setHasInqReply(snap.docs.some(d => !!d.data().adminReply)));
        }

        setAuthLoading(false);
        return () => { unsubscribeUser(); unsubscribeArchives(); unsubscribeInbox(); unsubscribeReports(); unsubscribeInquiries(); unsubscribeRepReply(); unsubscribeInqReply(); };
      } else {
        setCurrentUser(null);
        setProfile(null);
        setAuthLoading(false);
      }
    });

    const historyDocRef = doc(db, "global", "lotto_history");
    const unsubscribeHistory = onSnapshot(historyDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.history) setLottoHistory(data.history);
      }
    });

    return () => { unsubscribeAuth(); unsubscribeHistory(); };
  }, []);

  // 2. Automatic Cloud Sync for Profile and Orb
  // Replaces the need to call syncProfileAndOrb manually in every function
  const isInitialMount = useRef(true);
  const hasGrantedVisitBonusRef = useRef(false);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (currentUser && profile) {
      const timer = setTimeout(async () => {
        // points, giftHistory는 서버/arrayUnion으로 관리 — auto-sync에서 제외
        const { points: _points, giftHistory: _giftHistory, ...orbCore } = orb;
        // mergeFields로 orb 맵 전체 교체 방지 — orb.points가 Firestore에서 지워지지 않도록
        const mergeFields = ['profile', ...Object.keys(orbCore).map(k => `orb.${k}`)];
        await setDoc(doc(db, "users", currentUser.uid), { profile, orb: orbCore }, { mergeFields });
      }, 500); // Debounce sync
      return () => clearTimeout(timer);
    }
  }, [profile, orb, currentUser]);

  // 3. 닉네임 변경 시 내가 만든 대화방 creatorName 일괄 갱신
  const prevNicknameRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const newNick = orb.nickname;
    if (!currentUser || !newNick || newNick === prevNicknameRef.current) return;
    prevNicknameRef.current = newNick;
    (async () => {
      try {
        const q = query(collection(db, "square", "rooms", "list"), where("creatorId", "==", currentUser.uid));
        const snap = await getDocs(q);
        if (snap.empty) return;
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.update(d.ref, { creatorName: newNick }));
        await batch.commit();
      } catch { /* 권한 없거나 방이 없으면 무시 */ }
    })();
  }, [orb.nickname, currentUser]);

  const onUpdateProfile = (newProfile: UserProfile) => setProfile(newProfile);
  const onUpdateOrb = (newOrb: OrbState) => setOrb(newOrb);

  const saveToArchive = async (type: 'divine' | 'scientific' | 'annual', data: any) => {
    if (!currentUser) return;
    const recordId = Math.random().toString(36).substr(2, 9);
    // JSON 직렬화로 undefined 필드 제거 (Firestore는 undefined 값 불허 — 동기 throw 발생)
    const sanitized = JSON.parse(JSON.stringify(data));
    const newRecord: SavedFortune = { id: recordId, timestamp: Date.now(), type, data: sanitized };
    try {
      await setDoc(doc(db, "users", currentUser.uid, "archives", recordId), newRecord).catch(() => {});
    } catch {}
  };

  const deleteArchive = async (id: string) => {
    if (!currentUser) return;
    await deleteDoc(doc(db, "users", currentUser.uid, "archives", id));
    onToast("서고의 기록이 영구 소멸되었습니다.");
  };

  const handleGoogleLogin = async () => {
    const user = await loginWithGoogle();
    if (user) {
    }
  };
  const handleWithdrawAction = async () => { if (!currentUser) return; await logout(); setProfile(null); setView('main'); window.location.reload(); };

  // --- End Firebase Sync Logic ---

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const hasExtractedDivineToday = archives.some(item => 
    item.type === 'divine' && 
    new Date(item.timestamp).toDateString() === new Date().toDateString()
  );

  const checkDailyLimit = (): boolean => {
    const today = getKSTDateString();
    if (orb.lastExtractDate !== today) {
      setOrb({ ...orb, dailyExtractCount: 0, lastExtractDate: today });
      return true;
    }
    if (orb.dailyExtractCount >= DAILY_LIMIT) {
      setToast(`오늘의 천기 추출 횟수(${DAILY_LIMIT}회)를 모두 소진했습니다.\n행운 카드(슬롯)는 무제한 이용 가능합니다.`);
      return false;
    }
    return true;
  };

  const updatePoints = (amount: number) => setOrb({ ...orb, points: orb.points + amount });
  const updateFavorites = (roomIds: string[]) => setOrb({ ...orb, favoriteRoomIds: roomIds });



  const buyDecoration = (id: string) => {
    setOrb((prev: OrbState) => ({
      ...prev,
      activeDecorationId: id,
      purchasedDecorationIds: prev.purchasedDecorationIds.includes(id)
        ? prev.purchasedDecorationIds
        : [...prev.purchasedDecorationIds, id],
    }));
    onToast("기운의 형상을 변경하였습니다.");
  };

  const handleOfferAmount = async (amount: number) => {
    if (isOfferingLoading) return;
    setIsOfferingLoading(true);
    try {
      const { multiplier, totalLumen } = await performOffering(amount);
      setOfferingData({ amount, multiplier });
      // 루멘은 서버에서 이미 지급됨 — growOrb만 클라이언트에서 처리
      growOrb(Math.floor(totalLumen / 100));
      onToast(`${totalLumen.toLocaleString()} L 의 기운을 하사받았습니다.`);
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? '봉헌에 실패했습니다.';
      onToast(msg);
    } finally {
      setIsOfferingLoading(false);
    }
  };

  const handleOfferingComplete = () => {
    setOfferingData(null);
  };

  const handleSlotResult = (numbers: number[]) => growOrb(2);

  const onDivineGenerateClick = () => {
    if (hasExtractedDivineToday) { onToast("이미 오늘의 천기를 받으셨습니다."); return; }
    if (!checkDailyLimit()) return;
    setConfirmModal({ isOpen: true, type: 'divine' });
  };

  const onScienceGenerateClick = (config: ScientificFilterConfig) => {
    setPendingScienceConfig(config);
    setConfirmModal({ isOpen: true, type: 'scientific' });
  };

  const executeDivineGenerate = async () => {
    if (!profile) return;
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    setLoading(true);
    try {
      // 포인트 차감은 Cloud Function 내부에서 서버사이드 처리
      const res = await getFortuneAndNumbers(profile);
      const divineSavedAtNow = Date.now();
      setResult(res);
      setDivineSavedAt(divineSavedAtNow);
      // 결과 수신 성공 → 세션 viewed 처리 (복구 방지)
      if (currentUser) {
        updateDoc(doc(db, "users", currentUser.uid, "session", "data"), { "divine.viewed": true }).catch(() => {});
      }
      await saveToArchive('divine', res);
      // dailyExtractCount만 클라이언트 상태로 갱신 (UX 목적)
      setOrb(prev => ({ ...prev, dailyExtractCount: prev.dailyExtractCount + 1 }));
      growOrb(30);
      onToast("신성한 천기 리포트가 서고에 자동 저장되었습니다.");
    } catch (err: any) {
      const msg = err?.message?.includes("루멘이 부족")
        ? "루멘이 부족합니다."
        : "우주의 기운이 불안정합니다. 다시 시도해주세요.";
      onToast(msg);
    } finally {
      setLoading(false);
    }
  };

  const executeScienceGenerate = async () => {
    if (!pendingScienceConfig) return;
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    setScienceLoading(true);
    try {
      // 포인트 차감은 Cloud Function(getScientificReport) 내부에서 서버사이드 처리
      const resRaw = await getScientificRecommendation(pendingScienceConfig);
      const res: ScientificAnalysisResult = { ...resRaw, savedAt: Date.now(), benfordApplied: pendingScienceConfig.applyBenfordLaw };
      setScientificResult(res);
      if (currentUser) {
        try {
          // Firestore는 undefined 불허 → additionalSets 없을 때 키 자체를 제외
          const { additionalSets, ...resCore } = res;
          setDoc(doc(db, "users", currentUser.uid, "session", "data"), {
            science_full: {
              data: { ...resCore, ...(additionalSets !== undefined ? { additionalSets } : {}) },
              savedAt: res.savedAt,
              viewed: false,
            }
          }, { merge: true }).catch(() => {});
        } catch {}
      }
      await saveToArchive('scientific', res);
      growOrb(30);
      onToast("지성 분석 리포트가 서고에 자동 저장되었습니다.");
    } catch (err: any) {
      const msg = err?.message?.includes("루멘이 부족")
        ? "루멘이 부족합니다."
        : "분析 엔진 가동에 오류가 발생했습니다.";
      onToast(msg);
    } finally {
      setScienceLoading(false);
    }
  };

  const buyGoldenCard = async () => {
    if (orb.hasGoldenCard) { onToast("이미 천부인을 소유하고 계십니다."); return; }
    if (orb.points < GOLDEN_CARD_PRICE) { onToast("유물을 소유하기 위한 루멘이 부족합니다."); return; }
    try {
      await spendPoints(GOLDEN_CARD_PRICE, "golden_card");
      // 구매일(일월년) + 랜덤 4자리 → 중복 불가
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const ddmm = `${pad(now.getDate())}${pad(now.getMonth() + 1)}`;
      const yyyy = String(now.getFullYear());
      const rand4 = Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join('');
      const cardId = `${ddmm}-${yyyy}-24K-${rand4}`;
      setOrb(prev => ({ ...prev, hasGoldenCard: true, goldenCardId: cardId } as OrbState));
      onToast("천상의 유물 '천부인'의 주인이 되셨습니다!");
    } catch (err: any) {
      onToast(err?.message?.includes("루멘이 부족") ? "루멘이 부족합니다." : "유물 구매에 실패했습니다.");
    }
  };

  const currentYear = new Date().getFullYear();
  const currentDestiny = orb.annualDestinies ? orb.annualDestinies[currentYear] : undefined;

  const handleUnlockAnnualRitual = () => {
    // 포인트 차감은 startFixedRitual → getFixedDestinyNumbers Cloud Function에서 처리
    if (orb.points < COST_ANNUAL) { onToast("영원한 의식을 위한 루멘이 부족합니다."); return; }
    setIsRitualUnlocked(true);
    onToast("올해의 운명이 봉인 해제되었습니다. 이제 인장을 각인하십시오.");
  };

  const startFixedRitual = async () => {
    if (!profile) return;
    setFixedRitualLoading(true);
    try {
      const res = await getFixedDestinyNumbers(profile);
      const annual: AnnualDestiny = {
        year: currentYear,
        numbers: res.luckyNumbers,
        luckyColor: res.luckyColor,
        luckyColorDescription: res.luckyColorDescription,
        reason: res.destinyDescription,
        planningStrategy: res.planningStrategy,
        bestMonths: res.bestMonths,
        worstMonths: res.worstMonths,
        wealthDetailed: res.wealthDetailed,
        loveDetailed: res.loveDetailed,
        healthDetailed: res.healthDetailed,
        tarotDetailed: res.tarotDetailed,
        tarotCardName: res.tarotCardName,
        astrologyDetailed: res.astrologyDetailed,
        sajuDeepDive: res.sajuDeepDive,
        numberExplanations: res.numberExplanations,
        timestamp: Date.now()
      };
      setOrb({
        ...orb,
        annualDestinies: { ...(orb.annualDestinies || {}), [currentYear]: annual }
      });
      growOrb(2000);
      await saveToArchive('annual', annual);
      setIsRitualUnlocked(false);
      onToast(`${currentYear}년 천명 대운 리포트가 서고에 자동 저장되었습니다.`);
      // 결과 수신 성공 → 세션 viewed 처리 (복구 방지)
      if (currentUser) {
        updateDoc(doc(db, "users", currentUser.uid, "session", "data"), { "annual.viewed": true }).catch(() => {});
      }
      setShowFullAnnualReport(true);
    } catch (err) {
      onToast("의식 진행 중 기운이 소멸되었습니다.");
    } finally {
      setFixedRitualLoading(false);
    }
  };

  const growOrb = (amount: number) => {
    setOrb(prev => {
      const newExp = prev.exp + amount;
      let newLevel = Math.floor(newExp / 100) + 1;
      // 관리자 레벨은 growOrb로 변경하지 않음 (Flash 방지)
      if (isAdmin) newLevel = ADMIN_LEVEL;
      else if (isSubAdmin) newLevel = Math.max(newLevel, SUB_ADMIN_LEVEL);
      const colors = ['#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6'];
      const color = colors[newLevel % colors.length];
      return { ...prev, level: newLevel, exp: newExp, color, aura: color + '80' };
    });
  };

  // 구슬 탭: 하루 최대 0.5레벨(50 exp) 한도
  const handleOrbTap = () => {
    const today = getKSTDateString();
    const isNewDay = orb.lastExtractDate !== today;
    const tapExp = isNewDay ? 0 : (orb.dailyOrbTapExp ?? 0);
    if (tapExp >= 50) {
      onToast("오늘의 구슬 수련이 완료되었습니다. (10/10회, +0.5레벨)");

      return;
    }
    const gained = Math.min(5, 50 - tapExp);
    growOrb(gained);
    setOrb(prev => ({
      ...prev,
      dailyOrbTapExp: tapExp + gained,
      ...(isNewDay ? { lastExtractDate: today, dailyExtractCount: 0, dailyPostCount: 0 } : {}),
    }));
  };

  // 회람판 글 작성 경험치: 하루 최대 5회(0.5레벨) 한도
  const handlePostCreated = () => {
    const today = getKSTDateString();
    const isNewDay = orb.lastExtractDate !== today;
    const postCount = isNewDay ? 0 : (orb.dailyPostCount ?? 0);
    if (postCount >= 5) return;
    growOrb(10); // 0.1레벨 = 10 exp
    setOrb((prev: OrbState) => ({
      ...prev,
      dailyPostCount: postCount + 1,
      ...(isNewDay ? { lastExtractDate: today, dailyExtractCount: 0, dailyOrbTapExp: 0 } : {}),
    }));
  };

  if (authLoading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-10">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,_rgba(99,102,241,0.12),_transparent_70%)] pointer-events-none" />
      <div className="flex flex-col items-center gap-5 animate-in fade-in zoom-in-95 duration-700">
        <img src="/s_mlotto_logo.png" alt="Mystic Lotto" className="w-20 h-20 drop-shadow-[0_0_24px_rgba(99,102,241,0.6)]" style={{ animation: 'pulse 2.4s ease-in-out infinite' }} />
        <div className="text-center space-y-1.5">
          <h1 className="font-mystic text-[18px] font-black text-white tracking-[0.35em] uppercase">Mystic Lotto</h1>
          <p className="text-[11px] text-indigo-400 font-bold tracking-[0.25em]">운명의 숫자를 찾아라</p>
        </div>
      </div>
      <div className="w-40 h-[2px] bg-white/5 rounded-full overflow-hidden">
        <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-indigo-400 to-transparent rounded-full animate-splash-bar" />
      </div>
    </div>
  );

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#020617]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(30,58,138,0.2),_transparent)] pointer-events-none"></div>
        <div className="relative z-10 glass p-10 rounded-[3rem] w-full max-w-lg space-y-8 animate-in fade-in zoom-in duration-700 shadow-2xl border-white/5 text-center">
          <div className="space-y-3">
            <img src="/s_mlotto_logo.png" alt="logo" className="w-16 h-16 mx-auto drop-shadow-[0_0_20px_rgba(99,102,241,0.5)]" />
            <h1 className="text-5xl font-mystic font-bold text-transparent bg-clip-text bg-gradient-to-b from-indigo-200 via-indigo-400 to-indigo-600 tracking-tighter uppercase">Mystic Lotto</h1>
            <p className="text-slate-500 text-[10px] font-black tracking-[0.6em] uppercase">Fate & Resonance</p>
          </div>
          <button
            onClick={handleGoogleLogin}
            className="w-full py-4 font-black rounded-2xl shadow-xl flex items-center justify-center space-x-3 transition-all active:scale-95 bg-white text-slate-950 hover:bg-slate-100"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="google" />
            <span>Google 계정으로 시작</span>
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <ProfileSetupForm currentUser={currentUser} onComplete={setProfile} />;
  }


  // 약관 동의 저장 핸들러 (기존 유저 / 약관 개정 시 재동의)
  // 개정 약관에 동의하는 경우 firstTermsAcceptedAt도 갱신 (새 버전 기준 최초 동의)
  const handleAcceptTerms = () => {
    const userDocRef = doc(db, "users", currentUser.uid);
    const now = Date.now();
    updateDoc(userDocRef, { termsAcceptedAt: now, firstTermsAcceptedAt: now, termsVersion: CURRENT_TERMS_VERSION }).catch(() =>
      setDoc(userDocRef, { termsAcceptedAt: now, firstTermsAcceptedAt: now, termsVersion: CURRENT_TERMS_VERSION }, { merge: true })
    );
    setTermsAccepted(true);
  };

  return (
    <div className="h-screen flex flex-col bg-[#020617] text-slate-200 overflow-x-hidden">
      {/* 약관 모달 */}
      {showTermsModal && <LegalModal title="이용약관" subtitle="Terms of Service" onClose={() => setShowTermsModal(false)}><TermsContent /></LegalModal>}
      {showPrivacyModal && <LegalModal title="개인정보처리방침" subtitle="Privacy Policy" onClose={() => setShowPrivacyModal(false)}><PrivacyContent /></LegalModal>}

      {/* 천부인 구매 확인 모달 */}
      {showGoldenCardConfirm && (
        <div className="fixed inset-0 z-[5600] flex items-center justify-center px-6" onClick={() => setShowGoldenCardConfirm(false)}>
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
          <div className="relative glass p-10 rounded-[3rem] border border-yellow-500/30 w-full max-w-sm animate-in zoom-in-95 duration-300 shadow-[0_40px_80px_rgba(0,0,0,0.9)]" onClick={e => e.stopPropagation()}>
            <div className="text-4xl text-center mb-6">⚠️</div>
            <h3 className="text-center font-mystic font-black text-yellow-400 text-xl tracking-widest mb-3">천부인 소환</h3>
            <p className="text-center text-sm text-slate-300 leading-relaxed mb-2">
              <span className="text-yellow-400 font-black">50,000 루멘</span>을 사용하여<br/>천부인을 소환합니다.
            </p>
            <p className="text-center text-[11px] text-rose-400/80 leading-relaxed mb-8">
              이 거래는 완료 후 취소하거나<br/>환불할 수 없습니다.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowGoldenCardConfirm(false)}
                className="flex-1 py-4 rounded-2xl border border-white/10 text-slate-400 font-black text-sm tracking-widest hover:bg-white/5 transition-all"
              >취소</button>
              <button
                onClick={() => { setShowGoldenCardConfirm(false); buyGoldenCard(); }}
                className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-yellow-600 to-amber-700 text-slate-950 font-black text-sm tracking-widest border-t border-white/30 hover:brightness-110 transition-all"
              >소환하기</button>
            </div>
          </div>
        </div>
      )}

      {/* 천부인 서사 모달 */}
      {showGoldenCardInfo && (
        <div className="fixed inset-0 z-[5500] flex items-center justify-center px-6" onClick={() => setShowGoldenCardInfo(false)}>
          <div className="absolute inset-0 bg-black/85 backdrop-blur-xl" />
          <div className="relative glass p-10 rounded-[3rem] border border-yellow-500/30 w-full max-w-sm animate-in zoom-in-95 duration-300 shadow-[0_40px_80px_rgba(0,0,0,0.9)]" onClick={e => e.stopPropagation()}>
            <div className="text-4xl text-center mb-4">⚜️</div>
            <h3 className="text-2xl font-mystic font-black text-yellow-400 text-center mb-1 tracking-widest">天符印</h3>
            <p className="text-[9px] font-black text-amber-500/50 text-center uppercase tracking-[0.4em] mb-7">Soul Core Emblem · Eternal Grade</p>
            <div className="space-y-4 text-xs leading-relaxed">
              <p className="text-slate-300">
                천상의 기운이 응결되어 탄생한 황금 인장 <span className="text-yellow-400 font-black">천부인(天符印)</span>은, 우주의 파동과 소유자의 영혼이 완전히 동기화되었음을 증명하는 영원한 증표입니다.
              </p>
              <p className="text-slate-400">
                태초의 빛이 물질로 굳어진 이 인장에는 소유자의 본명이 각인되고, 이 세상 어디에도 존재하지 않는 단 하나의 고유 인식번호가 부여됩니다. 같은 번호의 인장은 결코 존재하지 않습니다.
              </p>
              <p className="text-slate-400">
                천부인을 소유한 자에게는 신령한 기운의 파동이 더욱 깊이 닿는다 전해집니다. 각인된 이름은 영원히 이 카드와 함께하며, 어떠한 이유로도 거래되거나 양도될 수 없습니다.
              </p>
            </div>
            <div className="mt-6 glass p-4 rounded-2xl border border-yellow-500/20 text-center">
              <p className="text-[10px] font-black text-yellow-500/60 uppercase tracking-widest">50,000 루멘 · 1인 1매 한정 · 영구 귀속</p>
            </div>
            <button
              onClick={() => setShowGoldenCardInfo(false)}
              className="mt-5 w-full py-3 bg-yellow-600/20 border border-yellow-500/30 text-yellow-400 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-yellow-600/30 transition-all"
            >확인</button>
          </div>
        </div>
      )}

      {/* 기존 유저 약관 동의 오버레이 (termsAcceptedAt 없는 경우) */}
      {termsAccepted === false && (
        <div className="fixed inset-0 z-[9500] flex items-center justify-center px-5 bg-[#020617]">
          <div className="w-full max-w-md glass rounded-[2.5rem] border border-white/10 shadow-[0_50px_120px_rgba(0,0,0,0.9)] overflow-hidden animate-in fade-in zoom-in-95 duration-400">
            <div className="bg-gradient-to-b from-indigo-900/60 to-transparent px-8 pt-8 pb-6 text-center">
              <div className="text-4xl mb-3">📜</div>
              <h2 className="text-xl font-mystic font-black text-white tracking-widest uppercase mb-1">약관 동의</h2>
              <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.4em]">서비스 이용을 위해 동의가 필요합니다</p>
            </div>
            <div className="px-8 pb-8 space-y-5">
              <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 space-y-4">
                <label className="flex items-start space-x-3 cursor-pointer group">
                  <div onClick={() => setOverlayAgreedTerms(!overlayAgreedTerms)} className={`w-5 h-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-all mt-0.5 ${overlayAgreedTerms ? 'bg-indigo-600 border-indigo-500' : 'border-slate-600 group-hover:border-slate-400'}`}>
                    {overlayAgreedTerms && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span className="text-xs text-slate-300 leading-relaxed" onClick={() => setOverlayAgreedTerms(!overlayAgreedTerms)}>
                    (필수) <button type="button" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setShowTermsModal(true); }} className="text-indigo-400 underline underline-offset-2">이용약관</button>에 동의합니다.
                  </span>
                </label>
                <label className="flex items-start space-x-3 cursor-pointer group">
                  <div onClick={() => setOverlayAgreedPrivacy(!overlayAgreedPrivacy)} className={`w-5 h-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-all mt-0.5 ${overlayAgreedPrivacy ? 'bg-indigo-600 border-indigo-500' : 'border-slate-600 group-hover:border-slate-400'}`}>
                    {overlayAgreedPrivacy && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span className="text-xs text-slate-300 leading-relaxed" onClick={() => setOverlayAgreedPrivacy(!overlayAgreedPrivacy)}>
                    (필수) <button type="button" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setShowPrivacyModal(true); }} className="text-indigo-400 underline underline-offset-2">개인정보처리방침</button>에 동의합니다.
                  </span>
                </label>
                <p className="text-[10px] text-slate-600 text-center">본 서비스는 만 19세 이상 성인만 이용할 수 있습니다.</p>
              </div>
              <button
                onClick={() => { if (overlayAgreedTerms && overlayAgreedPrivacy) handleAcceptTerms(); }}
                className={`w-full py-4 font-black rounded-2xl uppercase tracking-widest text-sm transition-all ${overlayAgreedTerms && overlayAgreedPrivacy ? 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95' : 'bg-white/10 text-slate-600 cursor-not-allowed'}`}
              >
                동의하고 시작하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 프리미엄 연간 리포트 모달 */}
      {showFullAnnualReport && currentDestiny && (
        <AnnualReportModal
          destiny={currentDestiny}
          displayName={orb.nickname || profile.name}
          onClose={() => setShowFullAnnualReport(false)}
        />
      )}

      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        lottoHistory={lottoHistory}
        subAdminConfig={subAdminConfig}
        onSubAdminConfigChange={setSubAdminConfig}
        onToast={onToast}
      />

      {/* 루멘 채굴 모달 (준비 중) */}
      {showMiningModal && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowMiningModal(false)}></div>
          <div className="relative glass p-10 rounded-[3rem] border border-yellow-500/20 w-full max-w-sm text-center animate-in zoom-in-95 duration-300">
            <div className="text-5xl mb-6">⛏️</div>
            <h3 className="text-2xl font-mystic font-black text-yellow-400 mb-2 uppercase tracking-widest">Lumen Mining</h3>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-6 italic">루멘 채굴소</p>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 space-y-3 text-left">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Coming Soon</p>
              <p className="text-xs text-slate-300 leading-relaxed">광고 시청 또는 이벤트 참여로 루멘을 채굴할 수 있는 기능이 준비 중입니다.</p>
              <div className="pt-2 border-t border-white/5 space-y-1.5">
                <p className="text-[10px] text-yellow-500/70 font-bold">📺 광고 시청 — 300루멘 (하루 5회)</p>
                <p className="text-[10px] text-slate-600 font-bold">🎯 이벤트 미션 — 추후 공개</p>
              </div>
            </div>
            <button onClick={() => setShowMiningModal(false)} className="w-full py-4 bg-white/5 text-slate-400 font-black rounded-2xl uppercase tracking-widest text-xs hover:bg-white/10 transition-all">닫기</button>
          </div>
        </div>
      )}

      {view === 'square' && <CelestialSquare profile={profile} orb={orb} onUpdatePoints={updatePoints} onUpdateFavorites={updateFavorites} onBack={() => setView('main')} onToast={onToast} onGrowFromPost={handlePostCreated} isAdmin={isAdmin} lumenReceivedAt={lumenReceivedAt} lumenSenderName={lumenSenderName} onOpenSelfProfile={() => setShowProfileOverlay(true)} />}
      {view === 'square' && showProfileOverlay && <div className="fixed inset-0 z-[9000]"><UserProfilePage profile={profile} orb={orb} archives={archives} onUpdateProfile={onUpdateProfile} onUpdateOrb={onUpdateOrb} onWithdraw={handleWithdrawAction} onBack={() => setShowProfileOverlay(false)} onToast={onToast} isAdmin={isAdmin} subAdminConfig={subAdminConfig} onSubAdminConfigChange={setSubAdminConfig} onDeleteArchive={deleteArchive} hasNewReports={hasNewReports} onClearReportsBadge={() => setHasNewReports(false)} hasNewInquiries={hasNewInquiries} onClearInquiriesBadge={() => setHasNewInquiries(false)} hasReplyNotif={hasRepReply || hasInqReply} onClearReplyNotif={() => { setHasRepReply(false); setHasInqReply(false); }} /></div>}
      {view === 'profile' && <UserProfilePage profile={profile} orb={orb} archives={archives} onUpdateProfile={onUpdateProfile} onUpdateOrb={onUpdateOrb} onWithdraw={handleWithdrawAction} onBack={() => setView('main')} onToast={onToast} isAdmin={isAdmin} subAdminConfig={subAdminConfig} onSubAdminConfigChange={setSubAdminConfig} onDeleteArchive={deleteArchive} hasNewReports={hasNewReports} onClearReportsBadge={() => setHasNewReports(false)} hasNewInquiries={hasNewInquiries} onClearInquiriesBadge={() => setHasNewInquiries(false)} hasReplyNotif={hasRepReply || hasInqReply} onClearReplyNotif={() => { setHasRepReply(false); setHasInqReply(false); }} />}
      {view === 'analysis' && <MysticAnalysisLab lottoHistory={lottoHistory} onBack={() => setView('main')} />}
      {offeringData && <DivineEffect amount={offeringData.amount} multiplier={offeringData.multiplier} onComplete={handleOfferingComplete} />}
      {toast && (<div className="fixed inset-0 flex items-center justify-center z-[6000] pointer-events-none px-6"><div className="bg-slate-900/40 backdrop-blur-3xl text-white px-12 py-7 rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.8)] border border-white/10 text-center animate-in zoom-in-95 duration-500 max-w-md"><p className="text-sm sm:text-xl font-bold leading-tight whitespace-pre-line">{toast}</p></div></div>)}

      {confirmModal.isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-[7000] px-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}></div>
          <div className="relative glass p-10 rounded-[3rem] border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.8)] text-center max-w-sm w-full animate-in zoom-in-95 fade-in duration-300">
            {orb.points >= 1000 ? (
              <>
                <div className="text-4xl mb-4">🏮</div>
                <h3 className="text-2xl font-black text-white mb-4 tracking-tight">천상의 결단</h3>
                <p className="text-slate-400 text-sm font-bold mb-8 italic">"1,000 루멘(L)이 소모됩니다.<br/>계속해서 천기를 읽으시겠습니까?"</p>
                <div className="flex flex-col gap-3">
                  <button onClick={confirmModal.type === 'divine' ? executeDivineGenerate : executeScienceGenerate} disabled={loading || scienceLoading} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl uppercase tracking-widest text-sm shadow-xl disabled:opacity-50 disabled:cursor-not-allowed">진행 (Resonate)</button>
                  <button onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} className="w-full py-4 bg-white/5 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-xs">취소</button>
                </div>
              </>
            ) : (
              <>
                <div className="text-4xl mb-4">🕯️</div>
                <h3 className="text-2xl font-black text-rose-400 mb-4 tracking-tight">기운 부족</h3>
                <div className="flex flex-col gap-3">
                  <button onClick={() => { setActiveTab('offering'); setConfirmModal({ ...confirmModal, isOpen: false }); }} className="w-full py-4 bg-amber-600 text-slate-950 font-black rounded-2xl uppercase tracking-widest text-sm">천운의 제단으로 향하기</button>
                  <button onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} className="w-full py-4 bg-white/5 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-xs">돌아가기</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {view === 'main' && (<>
      {showMenu && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setShowMenu(false)} />
          <div className="fixed top-[60px] right-4 w-56 bg-[#020617] p-2 rounded-2xl border border-white/10 shadow-2xl z-[9999] animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => { setView('square'); setShowMenu(false); }} className="w-full p-4 flex items-center space-x-3 rounded-xl hover:bg-indigo-600/20 text-indigo-100 text-xs font-black uppercase transition-all"><span>🌌</span><span>천상의 광장 가기</span></button>
            <button onClick={() => { setView('analysis'); setShowMenu(false); }} className="w-full p-4 flex items-center space-x-3 rounded-xl hover:bg-cyan-600/20 text-cyan-100 text-xs font-black uppercase transition-all"><span>📊</span><span>미스틱 분석 제단</span></button>
            <button onClick={() => { setActiveTab('shop'); setShowMenu(false); }} className="w-full p-4 flex items-center space-x-3 rounded-xl hover:bg-emerald-600/20 text-emerald-100 text-xs font-black uppercase transition-all"><span>💎</span><span>충전하기</span></button>
            <button onClick={() => { setShowMiningModal(true); setShowMenu(false); }} className="w-full p-4 flex items-center space-x-3 rounded-xl hover:bg-yellow-600/20 text-yellow-100 text-xs font-black uppercase transition-all"><span>⛏️</span><span>루멘 채굴</span></button>
            {isAdmin && (
              <button onClick={() => { setIsAdminModalOpen(true); setShowMenu(false); }} className="w-full p-4 flex items-center space-x-3 rounded-xl hover:bg-amber-600/20 text-amber-100 text-xs font-black uppercase transition-all"><span>🎫</span><span>당첨번호 등록 (Admin)</span></button>
            )}
            <div className="h-[1px] bg-white/5 my-1"></div>
            <button onClick={async () => { await logout(); setShowMenu(false); }} className="w-full p-4 flex items-center space-x-3 rounded-xl hover:bg-red-600/20 text-red-100 text-xs font-black uppercase transition-all"><span>🚪</span><span>로그아웃</span></button>
          </div>
        </>
      )}
      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
      <div className="border-b border-white/5 pl-[17px] pr-[22px] py-4 flex justify-between items-center">
        <div className="flex items-center gap-[11px] sm:gap-4">
          <img src="/s_mlotto_logo.png" alt="Mystic" className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
          <div className="flex flex-col mt-[3px] sm:mt-0"><h2 className="text-[17px] sm:text-2xl font-mystic font-black text-white tracking-wide sm:tracking-wider leading-none">MYSTIC LOTTO</h2><span className="text-[8px] text-indigo-400 uppercase font-bold tracking-[0.42em] sm:tracking-[0.5em] mt-1 whitespace-nowrap">Lotto Resonance</span></div>
        </div>
        <div className="flex items-center space-x-6 text-right relative translate-x-[10px] sm:translate-x-0">
          <button onClick={() => setView('profile')} className="hover:bg-white/5 p-2 rounded-xl group flex items-center space-x-4">
             <div className="hidden sm:block text-right relative">
               <p className="text-[10px] text-slate-500 uppercase font-black">Fortune Seeker</p>
               <p className="text-base font-black text-white group-hover:text-indigo-400 transition-colors">
                 {orb.nickname || profile.name}님
               </p>
             </div>
             <span className="translate-x-[10px] sm:translate-x-0 relative">
               <OrbVisual level={orb.level} className="w-8 h-8 border border-white/10 group-hover:border-indigo-500/50 transition-all" overlayAnimation={getActiveDecoration(orb).overlayAnimation} />
               {(orb.mailbox?.some(m => !m.isRead) || (isAdmin && (hasNewReports || hasNewInquiries)) || (!isAdmin && (hasRepReply || hasInqReply))) && (
                 <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
               )}
             </span>
          </button>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="w-10 h-10 rounded-xl border border-slate-800 flex flex-col items-center justify-center space-y-1 hover:bg-white/5 text-white">
              <span className="w-5 h-0.5 bg-white rounded-full"></span><span className="w-5 h-0.5 bg-white rounded-full"></span><span className="w-5 h-0.5 bg-white rounded-full"></span>
            </button>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-8 pt-4 sm:pt-16 pb-16 space-y-12 sm:space-y-24">
        <div className="flex justify-center mb-10 overflow-x-auto pb-4 no-scrollbar translate-y-5 sm:translate-y-0">
          <div className="bg-slate-950/50 border border-white/5 rounded-2xl p-1 sm:p-1.5 flex space-x-1 sm:space-x-2 shrink-0">
             <button onClick={() => setActiveTab('orb')} className={`px-[18px] sm:px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'orb' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>운세 & 구슬</button>
             <button onClick={() => setActiveTab('science')} className={`px-[18px] sm:px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'science' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>지성 분석</button>
             <button onClick={() => setActiveTab('treasury')} className={`px-[18px] sm:px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'treasury' ? 'bg-yellow-600 text-slate-950 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>보관소</button>
             <button onClick={() => setActiveTab('offering')} className={`px-[18px] sm:px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'offering' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>봉헌</button>
          </div>
        </div>
        
        {activeTab === 'orb' && (
          <div className="space-y-24">
            <section className="relative flex flex-col items-center animate-in fade-in duration-700">
              <FortuneOrb orb={orb} onGrow={handleOrbTap} />
              <button onClick={() => setShowShop(!showShop)} className="mt-10 px-10 py-4 bg-indigo-500/10 border-2 border-indigo-500/30 rounded-full text-sm font-black text-indigo-200 hover:bg-indigo-500/20 transition-all flex items-center space-x-3 shadow-2xl backdrop-blur-xl"><span>✦</span><span className="tracking-[0.2em] uppercase">기운 각인</span></button>
              {showShop && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowShop(false)} />
                  <div className="absolute top-28 right-0 md:right-1/2 md:translate-x-1/2 w-64 glass p-5 rounded-[2rem] z-40 border-indigo-500/40 shadow-2xl animate-in fade-in zoom-in duration-300 max-h-[55vh] overflow-y-auto">
                    <div className="space-y-2">
                      {ORB_DECORATIONS.map(item => (
                        <button key={item.id} onClick={() => buyDecoration(item.id)} className={`w-full px-4 py-3 rounded-xl border text-left flex items-center space-x-3 transition-all ${orb.activeDecorationId === item.id ? 'border-indigo-500 bg-indigo-500/20' : 'border-slate-800 bg-slate-900/40 hover:border-slate-600'}`}>
                          <div className="w-4 h-4 rounded-full shrink-0 ring-1 ring-white/20" style={{ background: item.color || '#6366f1' }} />
                          <p className="text-xs font-black text-white flex-1">{item.name}</p>
                          {orb.activeDecorationId === item.id && <span className="text-indigo-400 font-black text-sm">✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </section>
            <section className="space-y-16 border-t border-white/5 pt-20">
              <LottoGenerator result={result} savedAt={divineSavedAt} loading={loading} onGenerate={onDivineGenerateClick} onSlotGenerate={handleSlotResult} onReset={() => { setResult(null); setDivineSavedAt(null); }} hasExtractedToday={hasExtractedDivineToday} onToast={onToast} />
            </section>
          </div>
        )}

        {activeTab === 'science' && (<section className="animate-in fade-in duration-700"><ScientificAnalysis loading={scienceLoading} result={scienceResult} onGenerate={onScienceGenerateClick} lottoHistory={lottoHistory} uid={currentUser?.uid} /></section>)}
        {activeTab === 'treasury' && (
          <section className="flex flex-col items-center space-y-8 animate-in fade-in duration-700">
             <h2 className="text-2xl sm:text-4xl font-mystic font-black text-yellow-500 tracking-[0.3em] sm:tracking-[0.6em] uppercase text-center whitespace-nowrap">Sacred Vault</h2>
             <div className="sm:hidden h-0 overflow-visible relative w-full flex justify-center">
               <p className="absolute top-2 font-mystic font-bold text-amber-400/70 text-xs tracking-[0.1em] text-center px-4 leading-relaxed">
                 {orb.hasGoldenCard ? '당신은 이 영험하고 신령한 황금 카드의 주인이십니다' : '이 신령한 황금 카드의 주인이 되십시오'}
               </p>
             </div>
             <div className="w-full flex flex-col items-center space-y-24">
               <div className="w-full flex flex-col items-center">
                 <GoldenCard ownerName={orb.hasGoldenCard ? profile.name : ''} isVisible={true} cardId={orb.goldenCardId} hasCard={!!orb.hasGoldenCard} onInfoClick={() => setShowGoldenCardInfo(true)} />
                 {/* 면책 고지 — 카드 바로 아래 우측 정렬, py-16 여백 안에 위치 */}
                 <div className="w-full max-w-[520px] px-3 -mt-14">
                   <p className="text-right text-[9px] text-slate-300 tracking-wider">※ 실물 카드가 아닌 디지털 유물입니다</p>
                 </div>
                 {!orb.hasGoldenCard ? (
                   <div className="flex flex-col items-center space-y-4 mt-6 text-center">
                     <p className="hidden sm:block font-mystic font-bold text-amber-400/80 text-sm tracking-[0.18em] whitespace-nowrap">이 신령한 황금 카드의 주인이 되십시오</p>
                     <p className="text-[10px] text-amber-500/40 leading-relaxed tracking-widest">매일 당신의 이름이 새겨진 황금 카드로<br/>재물의 기운을 불러오세요</p>
                     <button onClick={() => setShowGoldenCardConfirm(true)} className="px-14 py-5 bg-gradient-to-r from-yellow-600 to-amber-700 text-slate-950 font-black rounded-full shadow-2xl uppercase tracking-[0.12em] text-base border-t-2 border-white/40">유물 소유하기 (50,000 L)</button>
                   </div>
                 ) : (
                   <div className="mt-6 flex flex-col items-center space-y-2 text-center">
                     <p className="hidden sm:block text-sm font-bold text-amber-500/60 italic tracking-wide leading-relaxed">당신은 이 영험하고 신령한 황금 카드의 주인이십니다.</p>
                     <p className="text-sm text-amber-500/50 leading-relaxed tracking-wide">매일 당신의 이름이 새겨진 황금 카드로<br/>재물의 기운을 불러오세요</p>
                   </div>
                 )}
               </div>
               <div className="w-full flex items-center gap-4 px-2 opacity-20">
                 <div className="flex-1 h-px bg-gradient-to-r from-transparent to-amber-500"></div>
                 <span className="text-amber-500 text-xs">✦</span>
                 <div className="flex-1 h-px bg-gradient-to-l from-transparent to-amber-500"></div>
               </div>
               <div className="w-full max-w-5xl">
                 {currentDestiny ? (
                   <div className="w-full glass p-4 sm:p-12 rounded-[2.5rem] sm:rounded-[4rem] border border-amber-500/30 shadow-2xl relative overflow-hidden bg-gradient-to-b from-amber-500/5 to-transparent">
                     <div className="flex flex-col items-center space-y-8">
                        <h3 className="text-center text-[10px] font-black text-amber-500 tracking-[0.8em] uppercase">Annual Eternal Scroll Activated</h3>
                        <div className="flex justify-center gap-2 sm:gap-4">{currentDestiny.numbers.map((num, i) => <div key={i} className="w-14 h-14 sm:w-20 sm:h-20 rounded-full flex items-center justify-center bg-gradient-to-br from-amber-400 to-amber-700 text-slate-950 font-black text-xl sm:text-3xl shadow-xl border-t-2 border-white/40">{num}</div>)}</div>
                        <div className="p-5 sm:p-10 bg-black/40 rounded-[2rem] sm:rounded-[3rem] border border-white/5 w-full">
                           <h4 className="text-amber-500 font-mystic font-black text-lg mb-6">올해 대운의 흐름</h4>
                           <p className="text-sm text-indigo-50/70 leading-relaxed italic line-clamp-3">{currentDestiny.reason}</p>
                           <button onClick={() => setShowFullAnnualReport(true)} className="mt-8 px-10 py-4 bg-amber-600/20 border border-amber-600/40 rounded-2xl text-amber-100 text-xs font-black uppercase tracking-widest hover:bg-amber-600 transition-all w-full">전체보기</button>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={startFixedRitual}
                            disabled={fixedRitualLoading}
                            className="px-8 py-3 bg-rose-900/40 border border-rose-500/30 rounded-2xl text-rose-300 text-[10px] font-black uppercase tracking-widest hover:bg-rose-700/50 transition-all disabled:opacity-50"
                          >
                            {fixedRitualLoading ? '생성 중...' : '⚙ 관리자: 천명수 재생성 (제한 없음)'}
                          </button>
                        )}
                     </div>
                   </div>
                 ) : (
                   <EternalRitual onComplete={startFixedRitual} onUnlockRequest={handleUnlockAnnualRitual} isUnlocked={isRitualUnlocked} points={orb.points} loading={fixedRitualLoading} />
                 )}
               </div>
             </div>
          </section>
        )}
        {activeTab === 'offering' && <section className="flex flex-col items-center animate-in fade-in duration-700"><SacredOffering onOffer={handleOfferAmount} level={orb.level} /></section>}

        {activeTab === 'shop' && (
          <section className="flex flex-col items-center animate-in fade-in duration-700 max-w-2xl mx-auto w-full space-y-8 pb-16">
            {/* 헤더 */}
            <div className="text-center space-y-3 pt-4">
              <div className="inline-flex items-center space-x-3 bg-emerald-500/10 border border-emerald-500/30 px-5 py-2 rounded-full">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Coming Soon</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-mystic font-black text-white tracking-[0.3em] sm:tracking-[0.4em] uppercase whitespace-nowrap">Nadir Shop</h2>
              <p className="text-slate-500 text-xs font-bold">나디르 충전 서비스가 준비 중입니다</p>
              <p className="text-rose-400/80 text-[10px] font-bold mt-1">표시된 가격은 부가세(VAT 10%)가 포함된 최종 결제금액입니다.</p>
            </div>

            {/* 단건 충전 플랜 */}
            <div className="w-full glass rounded-[2rem] border border-white/5 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center space-x-3">
                <span className="text-lg">💎</span>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">나디르 충전</h3>
                <span className="ml-auto text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full uppercase">준비 중</span>
              </div>
              <div className="px-2 py-4 sm:p-4 space-y-3">
                {[
                  { price: '1,000원',  base: '1,000',  bonus: null,      lidAngle: 5,  scale: 0.72, innerCoins: false, coins: [] as number[][],                                                                      border: 'border-white/10',       bg: 'bg-white/[0.02]',      glow: 'drop-shadow(0 0 4px rgba(255,255,255,0.12))' },
                  { price: '5,000원',  base: '5,000',  bonus: '500',     lidAngle: 22, scale: 0.86, innerCoins: false, coins: [[-15,-6],[13,-9]] as number[][],                                                       border: 'border-emerald-500/20', bg: 'bg-emerald-500/[0.03]', glow: 'drop-shadow(0 0 7px rgba(52,211,153,0.45))' },
                  { price: '10,000원', base: '10,000', bonus: '2,000',   lidAngle: 44, scale: 1.0,  innerCoins: true,  coins: [[-17,-4],[15,-8],[-9,-17],[11,-15]] as number[][],                                     border: 'border-amber-500/25',   bg: 'bg-amber-500/[0.04]',  glow: 'drop-shadow(0 0 10px rgba(245,158,11,0.5))' },
                  { price: '30,000원', base: '30,000', bonus: '10,000',  lidAngle: 70, scale: 1.18, innerCoins: true,  coins: [[-19,-2],[17,-5],[-13,-15],[15,-17],[-5,-21],[9,-11],[1,-19]] as number[][],            border: 'border-amber-400/40',   bg: 'bg-amber-500/[0.07]',  glow: 'drop-shadow(0 0 16px rgba(251,191,36,0.7))' },
                ].map((plan, i) => {
                  const bodyY = 22, lidH = 14, lidY = bodyY - lidH;
                  const sw = Math.round(44 * plan.scale), sh = Math.round(40 * plan.scale);
                  return (
                    <div key={i} className={`relative flex items-center justify-between px-3 sm:px-5 py-3 rounded-2xl border ${plan.border} ${plan.bg} overflow-visible`} style={{ minHeight: 80 }}>
                      {/* 가격 */}
                      <p className="text-sm font-black text-white whitespace-nowrap">{plan.price}</p>
                      {/* 보물함 + 나디르 */}
                      <div className="flex items-center gap-2">
                        {/* 보물함 SVG */}
                        <div className="relative flex-shrink-0" style={{ width: sw + 24, height: sh + 20 }}>
                          <svg viewBox="0 0 44 40" width={sw} height={sh} style={{ filter: plan.glow, position: 'absolute', left: 12, top: 10 }}>
                            {/* 함체 */}
                            <rect x="1" y={bodyY} width="42" height="17" rx="3" fill="#3d1f0a" stroke="#6b3818" strokeWidth="1.2"/>
                            <rect x="1" y={bodyY+7} width="42" height="2.5" fill="#5a2e10" opacity="0.8"/>
                            {/* 리벳 */}
                            <circle cx="5"  cy={bodyY+3}  r="1.5" fill="#6b3818"/>
                            <circle cx="39" cy={bodyY+3}  r="1.5" fill="#6b3818"/>
                            <circle cx="5"  cy={bodyY+14} r="1.5" fill="#6b3818"/>
                            <circle cx="39" cy={bodyY+14} r="1.5" fill="#6b3818"/>
                            {/* 자물쇠 */}
                            <rect x="19" y={bodyY+3} width="6" height="5.5" rx="1.5" fill="#d4af37" stroke="#b09020" strokeWidth="0.8"/>
                            <circle cx="22" cy={bodyY+5.8} r="1.2" fill="#8a6010"/>
                            {/* 내부 (뚜껑 열렸을 때) */}
                            {plan.innerCoins && (
                              <>
                                <rect x="3" y={bodyY+1} width="38" height="10" fill="#1e0801" opacity="0.9"/>
                                <circle cx="13" cy={bodyY+5.5} r="3.2" fill="#f59e0b"/>
                                <circle cx="22" cy={bodyY+5}   r="2.8" fill="#fbbf24"/>
                                <circle cx="31" cy={bodyY+5.5} r="2.4" fill="#f59e0b"/>
                                {i === 3 && (
                                  <>
                                    <polygon points="17,0 19.5,5 22,0 19.5,-5" fill="#a78bfa" transform={`translate(0,${bodyY+1})`}/>
                                    <polygon points="9,0 11.5,5 14,0 11.5,-5"  fill="#34d399" transform={`translate(0,${bodyY+2})`}/>
                                  </>
                                )}
                              </>
                            )}
                            {/* 뚜껑 (힌지 기준 회전) */}
                            <g transform={`rotate(-${plan.lidAngle}, 22, ${bodyY})`}>
                              <rect x="1" y={lidY} width="42" height={lidH} rx="3" fill="#5a2e10" stroke="#8a4a1a" strokeWidth="1.2"/>
                              <rect x="1" y={lidY+lidH-4} width="42" height="2.5" fill="#7a3c18" opacity="0.7"/>
                              <rect x="3" y={lidY+1.5}    width="38" height="3"   rx="1.5" fill="#7a3c18" opacity="0.35"/>
                              <circle cx="5"  cy={lidY+3} r="1.5" fill="#8a4a1a"/>
                              <circle cx="39" cy={lidY+3} r="1.5" fill="#8a4a1a"/>
                            </g>
                          </svg>
                          {/* 주변 코인/보석 */}
                          {plan.coins.map((pos, ci) => (
                            <span key={ci} className="absolute text-[10px] leading-none pointer-events-none animate-bounce" style={{ left: `calc(50% + ${pos[0]}px)`, top: `calc(50% + ${pos[1]}px)`, animationDelay: `${ci * 0.18}s`, animationDuration: `${1.1 + (ci % 3) * 0.25}s` }}>
                              {ci % 3 === 0 ? '🪙' : ci % 3 === 1 ? '💎' : '✨'}
                            </span>
                          ))}
                        </div>
                        {/* 나디르 텍스트 */}
                        <div className="text-right">
                          <p className="font-black text-amber-400" style={{ fontSize: 13 + i * 0.8 }}>
                            {plan.base}
                            {plan.bonus && <span className="text-emerald-400"> + {plan.bonus}</span>}
                            <span className="text-xs text-amber-400/80 ml-0.5">나디르</span>
                          </p>
                          {plan.bonus && <p className="text-[10px] text-emerald-400/70 font-bold">기본 {plan.base} + 추가혜택 {plan.bonus}</p>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 구독 플랜 */}
            <div className="w-full glass rounded-[2rem] border border-white/5 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center space-x-3">
                <span className="text-lg">⭐</span>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">구독 플랜</h3>
                <span className="ml-auto text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full uppercase">준비 중</span>
              </div>
              <div className="px-2 py-4 sm:p-4 space-y-3">
                {/* 월정액 */}
                {(() => {
                  const bodyY = 22, lidH = 14, lidY = bodyY - lidH, sc = 1.05, ang = 48;
                  const sw = Math.round(44 * sc), sh = Math.round(40 * sc);
                  const glow = 'drop-shadow(0 0 10px rgba(99,102,241,0.5))';
                  const coins = [[-16,-4],[14,-8],[-8,-18],[12,-16],[0,-22]] as number[][];
                  return (
                    <div className="flex items-center justify-between px-3 sm:px-5 py-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 overflow-visible">
                      <div>
                        <p className="text-sm font-black text-white">월정액</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">매월 자동 갱신</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-shrink-0" style={{ width: sw + 24, height: sh + 20 }}>
                          <svg viewBox="0 0 44 40" width={sw} height={sh} style={{ filter: glow, position: 'absolute', left: 12, top: 10 }}>
                            <rect x="1" y={bodyY} width="42" height="17" rx="3" fill="#3d1f0a" stroke="#6b3818" strokeWidth="1.2"/>
                            <rect x="1" y={bodyY+7} width="42" height="2.5" fill="#5a2e10" opacity="0.8"/>
                            <circle cx="5"  cy={bodyY+3}  r="1.5" fill="#6b3818"/><circle cx="39" cy={bodyY+3}  r="1.5" fill="#6b3818"/>
                            <circle cx="5"  cy={bodyY+14} r="1.5" fill="#6b3818"/><circle cx="39" cy={bodyY+14} r="1.5" fill="#6b3818"/>
                            <rect x="19" y={bodyY+3} width="6" height="5.5" rx="1.5" fill="#d4af37" stroke="#b09020" strokeWidth="0.8"/>
                            <circle cx="22" cy={bodyY+5.8} r="1.2" fill="#8a6010"/>
                            <rect x="3" y={bodyY+1} width="38" height="10" fill="#1e0801" opacity="0.9"/>
                            <circle cx="13" cy={bodyY+5.5} r="3.2" fill="#f59e0b"/><circle cx="22" cy={bodyY+5} r="2.8" fill="#fbbf24"/><circle cx="31" cy={bodyY+5.5} r="2.4" fill="#f59e0b"/>
                            <g transform={`rotate(-${ang}, 22, ${bodyY})`}>
                              <rect x="1" y={lidY} width="42" height={lidH} rx="3" fill="#5a2e10" stroke="#8a4a1a" strokeWidth="1.2"/>
                              <rect x="1" y={lidY+lidH-4} width="42" height="2.5" fill="#7a3c18" opacity="0.7"/>
                              <rect x="3" y={lidY+1.5} width="38" height="3" rx="1.5" fill="#7a3c18" opacity="0.35"/>
                              <circle cx="5" cy={lidY+3} r="1.5" fill="#8a4a1a"/><circle cx="39" cy={lidY+3} r="1.5" fill="#8a4a1a"/>
                            </g>
                          </svg>
                          {coins.map((pos, ci) => (
                            <span key={ci} className="absolute text-[10px] leading-none pointer-events-none animate-bounce" style={{ left: `calc(50% + ${pos[0]}px)`, top: `calc(50% + ${pos[1]}px)`, animationDelay: `${ci*0.18}s`, animationDuration: `${1.1+(ci%3)*0.25}s` }}>
                              {ci%3===0?'🪙':ci%3===1?'💎':'✨'}
                            </span>
                          ))}
                        </div>
                        <div className="text-right">
                          <p className="text-base font-black text-amber-400">30,000 나디르<span className="text-slate-500 text-[10px] font-bold">/월</span></p>
                          <p className="text-[11px] text-indigo-400 font-black">3,900원/월</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                {/* 연간 구독 */}
                {(() => {
                  const bodyY = 22, lidH = 14, lidY = bodyY - lidH, sc = 1.05, ang = 78;
                  const sw = Math.round(44 * sc), sh = Math.round(40 * sc);
                  const glow = 'drop-shadow(0 0 18px rgba(251,191,36,0.8))';
                  const coins = [[-16,-4],[14,-8],[-9,-18],[13,-20],[-4,-24],[10,-14],[2,-22],[-14,-11],[16,-2],[5,-27]] as number[][];
                  return (
                    <div className="relative flex items-center justify-between px-3 sm:px-5 py-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 overflow-visible">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-white">연간 구독</p>
                          <span className="text-[8px] font-black bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded-full uppercase tracking-wider leading-none">BEST</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[8px] font-black bg-rose-600/90 text-white px-1.5 py-0.5 rounded-sm leading-none">10%↓</span>
                          <p className="text-[10px] text-slate-400">월 3,500원 꼴</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-shrink-0" style={{ width: sw + 24, height: sh + 20 }}>
                          <svg viewBox="0 0 44 40" width={sw} height={sh} style={{ filter: glow, position: 'absolute', left: 12, top: 10 }}>
                            {/* 황금 테두리 함체 */}
                            <rect x="1" y={bodyY} width="42" height="17" rx="3" fill="#4a2505" stroke="#d4af37" strokeWidth="1.5"/>
                            <rect x="1" y={bodyY+7} width="42" height="2.5" fill="#d4af37" opacity="0.4"/>
                            <circle cx="5"  cy={bodyY+3}  r="1.8" fill="#d4af37"/><circle cx="39" cy={bodyY+3}  r="1.8" fill="#d4af37"/>
                            <circle cx="5"  cy={bodyY+14} r="1.8" fill="#d4af37"/><circle cx="39" cy={bodyY+14} r="1.8" fill="#d4af37"/>
                            <rect x="18" y={bodyY+2.5} width="8" height="6.5" rx="2" fill="#fbbf24" stroke="#d4af37" strokeWidth="1"/>
                            <circle cx="22" cy={bodyY+6} r="1.5" fill="#92400e"/>
                            {/* 가득 찬 내부 */}
                            <rect x="3" y={bodyY+1} width="38" height="10" fill="#1e0801" opacity="0.9"/>
                            <circle cx="10" cy={bodyY+5} r="3.5" fill="#f59e0b"/>
                            <circle cx="18" cy={bodyY+4} r="3.0" fill="#fbbf24"/>
                            <circle cx="26" cy={bodyY+5} r="3.2" fill="#f59e0b"/>
                            <circle cx="34" cy={bodyY+4.5} r="2.8" fill="#fbbf24"/>
                            <polygon points="22,0 24.5,5 27,0 24.5,-5" fill="#a78bfa" transform={`translate(-8,${bodyY+1})`}/>
                            <polygon points="22,0 24.5,5 27,0 24.5,-5" fill="#34d399" transform={`translate(2,${bodyY+0})`}/>
                            <polygon points="22,0 24.5,5 27,0 24.5,-5" fill="#f472b6" transform={`translate(12,${bodyY+1})`}/>
                            {/* 황금 뚜껑 */}
                            <g transform={`rotate(-${ang}, 22, ${bodyY})`}>
                              <rect x="1" y={lidY} width="42" height={lidH} rx="3" fill="#5a2e10" stroke="#d4af37" strokeWidth="1.5"/>
                              <rect x="1" y={lidY+lidH-4} width="42" height="2.5" fill="#d4af37" opacity="0.35"/>
                              <rect x="3" y={lidY+1.5} width="38" height="3" rx="1.5" fill="#d4af37" opacity="0.2"/>
                              <circle cx="5"  cy={lidY+3} r="1.8" fill="#d4af37"/><circle cx="39" cy={lidY+3} r="1.8" fill="#d4af37"/>
                            </g>
                          </svg>
                          {coins.map((pos, ci) => (
                            <span key={ci} className="absolute leading-none pointer-events-none animate-bounce" style={{ fontSize: ci%4===0?13:10, left: `calc(50% + ${pos[0]}px)`, top: `calc(50% + ${pos[1]}px)`, animationDelay: `${ci*0.14}s`, animationDuration: `${0.9+(ci%4)*0.2}s` }}>
                              {ci%4===0?'🪙':ci%4===1?'💎':ci%4===2?'✨':'👑'}
                            </span>
                          ))}
                        </div>
                        <div className="text-right">
                          <p className="text-base font-black text-amber-400">500,000 나디르<span className="text-slate-500 text-[10px] font-bold">/년</span></p>
                          <p className="text-[11px] text-amber-400/70 font-black">42,000원/년</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                <div className="mt-1 px-1 py-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5 text-center">
                  <p className="text-[11px] font-black text-slate-400">📋 구독 해지 안내</p>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    해지는 언제든 신청 가능합니다.<br />
                    <b className="text-slate-400">해지 신청 즉시 다음 갱신이 취소</b>되며,<br />
                    현재 구독 기간 <b className="text-slate-400">만료일까지는 정상 이용</b>됩니다.<br />
                    <span className="text-rose-400/80">이미 결제된 기간의 중도 환급은 제공되지 않습니다.</span>
                  </p>
                </div>
              </div>
            </div>

            {/* 나디르 설명 */}
            <div className="w-full glass rounded-[2rem] border border-white/5 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center space-x-3">
                <span className="text-lg">💎</span>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">나디르 (Nadir) — 충전 화폐</h3>
              </div>
              <div className="p-6 space-y-3 text-sm text-slate-300 leading-relaxed bullet-list">
                <p><span className="bullet">•</span><span>현금으로 직접 충전하는 기본 화폐입니다.</span></p>
                <p><span className="bullet">•</span><span>천상의 봉헌 제단에서 나디르를 봉헌하면 확률에 따라 <span className="text-amber-400 font-bold">최대 10배의 루멘</span>으로 돌아옵니다.</span></p>
                <p><span className="bullet">•</span><span>나디르는 디지털 재화로, <span className="text-rose-400 font-bold">사용함으로써 상품 가치가 훼손되므로 취소 및 환불이 불가</span>합니다.</span></p>
                <p><span className="bullet">•</span><span>회원 탈퇴 시 <span className="text-slate-400 font-bold">구매일로부터 7일 이내 미사용 나디르</span>는 고객센터를 통해 환불 신청이 가능합니다. 단, 7일이 초과되거나 7일 이내라도 사용된 잔여 나디르는 소멸됩니다.</span></p>
              </div>
            </div>

            {/* 루멘 설명 */}
            <div className="w-full glass rounded-[2rem] border border-white/5 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center space-x-3">
                <span className="text-lg">✨</span>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">루멘 (Lumen) — 활동 화폐</h3>
              </div>
              <div className="p-6 space-y-3 text-sm text-slate-300 leading-relaxed bullet-list">
                <p><span className="bullet">•</span><span>봉헌·출석·활동을 통해 획득하는 앱 내 화폐입니다.</span></p>
                <p><span className="bullet">•</span><span>천기누설, 천명수, 지성분석 등 <span className="text-indigo-400 font-bold">모든 콘텐츠를 루멘으로 이용</span>합니다.</span></p>
                <p><span className="bullet">•</span><span>루멘은 나디르나 현금으로 역환전되지 않으며, <span className="text-rose-400 font-bold">환불이 불가</span>합니다.</span></p>
                <p><span className="bullet">•</span><span>회원 탈퇴 시 잔여 루멘은 소멸됩니다.</span></p>
                <p><span className="bullet">•</span><span>앱 외부에서 취득한 루멘은 <span className="text-rose-400 font-bold">어떠한 경우에도 사용 불가</span>합니다.</span></p>
              </div>
            </div>

            {/* 루멘 획득 방법 */}
            <div className="w-full glass rounded-[2rem] border border-white/5 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center space-x-3">
                <span className="text-lg">💡</span>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">루멘 획득 방법</h3>
              </div>
              <div className="divide-y divide-white/5">
                {[
                  { icon: '🏛️', title: '봉헌 제단 봉헌', desc: '나디르 봉헌 시 확률에 따라 1배~10배 루멘 보상 (레벨이 높을수록 고배율 확률 상승)', badge: null },
                  { icon: '📅', title: '매일 방문 보너스', desc: '앱 방문 시 하루 1회 +100 루멘 지급 (자정 기준 갱신)', badge: null },
                  { icon: '📺', title: '광고 시청', desc: '편당 +300 루멘, 하루 최대 5회 (1,500 루멘/일)', badge: '준비 중' },
                  { icon: '📝', title: '회람판 글 작성', desc: '+0.1레벨/편, 하루 최대 5편 (+0.5레벨/일)', badge: null },
                  { icon: '👍', title: '공명(좋아요) 달성', desc: '내 글이 공명 10개 단위를 넘을 때마다 +0.1레벨 (무제한)', badge: null },
                  { icon: '🎁', title: '루멘 선물 받기', desc: '대화방에서 다른 유저로부터 루멘 선물받기', badge: null },
                ].map((item, i) => (
                  <div key={i} className="flex items-start space-x-4 px-6 py-4">
                    <span className="text-xl shrink-0 mt-0.5">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="text-sm font-black text-white">{item.title}</p>
                        {item.badge && <span className="text-[9px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">{item.badge}</span>}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
      </main>

      {/* 웰컴 모달 */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-[8000] flex items-center justify-center px-5">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => { setShowWelcomeModal(false); localStorage.setItem('mlotto_welcome_v1', '1'); }} />
          <div className="relative glass w-full max-w-md rounded-[2.5rem] border border-white/10 shadow-[0_50px_120px_rgba(0,0,0,0.9)] animate-in zoom-in-95 fade-in duration-400 overflow-hidden">
            {/* 헤더 그라디언트 */}
            <div className="bg-gradient-to-b from-indigo-900/60 to-transparent px-8 pt-8 pb-6 text-center">
              <div className="text-5xl mb-3">✨</div>
              <h2 className="text-2xl font-mystic font-black text-white tracking-widest uppercase mb-1">Mystic Lotto</h2>
              <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.5em]">화폐 시스템 안내</p>
            </div>
            <div className="px-8 pb-8 space-y-4">
              {/* 나디르 */}
              <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 space-y-2">
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-lg">💎</span>
                  <span className="text-xs font-black text-amber-400 uppercase tracking-widest">나디르 (Nadir) — 충전 화폐</span>
                </div>
                <p className="text-[12px] text-slate-300 leading-relaxed">현금으로 충전하는 기본 화폐입니다. 봉헌 제단에서 사용하면 <span className="text-amber-400 font-bold">확률에 따라 최대 10배의 루멘</span>으로 전환됩니다. 디지털 재화 특성상 사용함으로써 상품 가치가 훼손되므로 <span className="text-rose-400 font-bold">취소 및 환불이 불가</span>합니다.</p>
              </div>
              {/* 루멘 */}
              <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 space-y-2">
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-lg">✨</span>
                  <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">루멘 (Lumen) — 활동 화폐</span>
                </div>
                <p className="text-[12px] text-slate-300 leading-relaxed">봉헌·출석·활동으로 획득하는 앱 내 화폐입니다. 천기누설·천명수·지성분석 등 <span className="text-indigo-400 font-bold">모든 콘텐츠를 루멘으로 이용</span>합니다. 현금 역환전·환불은 불가합니다.</p>
              </div>
              {/* 획득 요약 */}
              <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">💡 루멘 획득 요약</p>
                <div className="space-y-1.5 text-[11px] text-slate-400">
                  <p>🏛️ 봉헌 → 확률 보상 (1배~10배)</p>
                  <p>📅 매일 방문 → +100 루멘</p>
                  <p>📺 광고 시청 → +300 루멘/편, 최대 5회 <span className="text-amber-500/70">(준비 중)</span></p>
                  <p>📝 글 작성·공명 → 레벨 성장</p>
                  <p>🎁 대화방 루멘 선물 받기</p>
                </div>
              </div>
              <p className="text-[10px] text-slate-600 text-center">상세 내용은 <span className="text-slate-500 underline underline-offset-2">메뉴 → 충전하기</span>에서 언제든지 확인할 수 있습니다.</p>
              <button
                onClick={() => { setShowWelcomeModal(false); localStorage.setItem('mlotto_welcome_v1', '1'); }}
                className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl uppercase tracking-widest text-sm hover:bg-indigo-500 transition-all active:scale-95"
              >
                확인했습니다
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="relative shrink-0 border-t border-white/10 px-5 sm:px-10 py-3 sm:py-8 flex items-center justify-between z-[200] shadow-2xl">
        <div className="absolute inset-0 bg-white/[0.02] backdrop-blur-3xl -z-10 pointer-events-none" />
         <div className="flex items-center space-x-4 sm:space-x-8 sm:cursor-default cursor-pointer active:opacity-70 transition-opacity" onClick={() => setView('profile')}>
            <div className="relative">
              <OrbVisual level={orb.level} className="w-12 h-12 sm:w-16 sm:h-16 border-2 border-white/10" overlayAnimation={getActiveDecoration(orb).overlayAnimation} />
              <div className="absolute -top-2 -right-2 bg-indigo-600 text-[9px] sm:text-[11px] font-black px-2 py-0.5 sm:px-3 sm:py-1 rounded-xl z-10">LV.{orb.level}</div>
            </div>
            {/* 모바일 전용 닉네임 */}
            <div className="sm:hidden flex flex-col justify-end mt-[20px]">
              <p className="text-[13px] text-indigo-400 font-bold">{orb.nickname || profile.name}님</p>
            </div>
            <div className="hidden sm:block">
               <p className="text-xl font-black text-white tracking-tight">{orb.level}단계 수련자</p>
               <div className="flex items-center space-x-2 mt-1">
                  <div className="w-24 h-1 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-indigo-500" style={{ width: `${orb.exp % 100}%` }}></div></div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{orb.exp % 100} / 100</span>
               </div>
            </div>
         </div>
         <div className="text-right">
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-black uppercase tracking-tight sm:tracking-widest mb-1">Divine Essence (루멘)</p>
            <p className="text-xl sm:text-3xl font-mystic font-black text-yellow-500 tabular-nums">{displayPoints(orb.points)} <span className="text-sm font-sans">L</span></p>
         </div>
      </footer>
      </>)}

      <style>{`
        .drop-shadow-glow { filter: drop-shadow(0 0 20px rgba(251, 191, 36, 0.4)); }
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(251, 191, 36, 0.2); border-radius: 10px; }

        @keyframes star-drift {
          0% { transform: translate(0, 0) scale(0); opacity: 0; }
          15% { opacity: 1; transform: scale(1); }
          85% { opacity: 0.6; transform: translate(30px, -20px) scale(0.8); }
          100% { transform: translate(50px, -35px) scale(0); opacity: 0; }
        }
        .animate-star-drift { animation: star-drift linear infinite; }

        @keyframes milkyway-flow {
          from { background-position: 0 0; }
          to { background-position: 600px 600px; }
        }
        .animate-milkyway-flow { animation: milkyway-flow 45s linear infinite; }

        @keyframes milkyway-pan {
          0% { transform: scale(1.1) translate(0, 0); }
          50% { transform: scale(1.3) translate(-10px, -10px); }
          100% { transform: scale(1.1) translate(0, 0); }
        }
        .animate-milkyway-pan { animation: milkyway-pan 60s ease-in-out infinite; }

        @keyframes crystal-sweep {
          0% { transform: translateX(-250%) skewX(-30deg); }
          25% { transform: translateX(250%) skewX(-30deg); }
          100% { transform: translateX(250%) skewX(-30deg); }
        }
        .animate-crystal-sweep { animation: crystal-sweep 18s cubic-bezier(0.4, 0, 0.2, 1) infinite; }

        @keyframes pulse-slow {
          0%, 100% { opacity: 0.04; transform: scale(1) translate(-50%, -50%); }
          50% { opacity: 0.12; transform: scale(1.1) translate(-50%, -50%); }
        }
        .animate-pulse-slow { position: absolute; left: 50%; top: 50%; animation: pulse-slow 10s ease-in-out infinite; }

        @keyframes spin-extremely-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-extremely-slow { animation: spin-extremely-slow 80s linear infinite; }

        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 15s linear infinite; }
      `}</style>
    </div>
  );
};

export default App;

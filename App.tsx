
// 최고관리자 UID 목록
const ADMIN_UIDS = ['o5XegbLlnPVJhZtn31HXyddBGKW2'];
// 관리자 레벨/포인트 상수
const ADMIN_LEVEL = 300;
const SUB_ADMIN_LEVEL = 200;
const ADMIN_INFINITE_POINTS = 999999999; // ∞ 표시 기준값
// 포인트 표시 헬퍼
const displayPoints = (pts: number) => pts >= ADMIN_INFINITE_POINTS ? '∞' : pts.toLocaleString();

import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, FortuneResult, SavedFortune, OrbState, LottoRound, ORB_DECORATIONS, GOLDEN_CARD_PRICE, OFFERING_CONVERSION_RATE, AnnualDestiny, ScientificAnalysisResult, ScientificFilterConfig, DAILY_LIMIT, COST_ANNUAL, INITIAL_POINTS } from './types';
import { getFortuneAndNumbers, getFixedDestinyNumbers, spendPoints } from './services/geminiService';
import { getScientificRecommendation } from './services/scientificService';
import FortuneOrb, { OrbVisual } from './components/FortuneOrb';
import LottoGenerator from './components/LottoGenerator';
import GoldenCard from './components/GoldenCard';
import SacredOffering from './components/SacredOffering';
import DivineEffect from './components/DivineEffect';
import Archives from './components/Archives';
import EternalRitual from './components/EternalRitual';
import ScientificAnalysis from './components/ScientificAnalysis';
import CelestialSquare from './components/CelestialSquare';
import UserProfilePage from './components/UserProfilePage';
import MysticAnalysisLab from './components/MysticAnalysisLab';
import ProfileSetupForm from './components/ProfileSetupForm';
import AdminModal from './components/AdminModal';
import AnnualReportModal from './components/AnnualReportModal';

// Firebase imports
import { auth, db, loginWithGoogle, logout } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, query, orderBy, deleteDoc, limit as fsLimit, runTransaction, updateDoc, where, getDocs, writeBatch, increment } from "firebase/firestore";

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const isAdmin = ADMIN_UIDS.includes(currentUser?.uid ?? '');
  const [subAdminConfig, setSubAdminConfig] = useState<{ [uid: string]: number }>({});
  const isSubAdmin = !isAdmin && (currentUser?.uid ? currentUser.uid in subAdminConfig : false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [scienceLoading, setScienceLoading] = useState(false);
  const [fixedRitualLoading, setFixedRitualLoading] = useState(false);
  const [result, setResult] = useState<FortuneResult | null>(null);
  const [scienceResult, setScientificResult] = useState<ScientificAnalysisResult | null>(null);
  const [showShop, setShowShop] = useState(false);
  const [activeTab, setActiveTab] = useState<'orb' | 'treasury' | 'offering' | 'archives' | 'science'>('orb');
  const [view, setView] = useState<'main' | 'square' | 'profile' | 'analysis'>('main');
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

  const [archives, setArchives] = useState<SavedFortune[]>([]);
  const [offeringData, setOfferingData] = useState<{amount: number, multiplier: number} | null>(null);

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
    lastExtractDate: new Date().toISOString().split('T')[0],
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

              // 매일 첫 방문 보너스 (100 루멘) — 세션당 1회만 처리
              if (!hasGrantedVisitBonusRef.current) {
                hasGrantedVisitBonusRef.current = true;
                const today = new Date().toISOString().split('T')[0];
                if ((orbData.lastVisitDate || '') !== today) {
                  updateDoc(userDocRef, {
                    'orb.points': increment(100),
                    'orb.lastVisitDate': today,
                  }).then(() => setToast("매일 첫 방문 보너스: +100 루멘! 🌟")).catch(() => {});
                }
              }
            }
          } else {
            // New user initialization
            setDoc(userDocRef, { orb: { ...orb, points: INITIAL_POINTS } }, { merge: true });
          }
        });
        const archivesQuery = query(collection(db, "users", user.uid, "archives"), orderBy("timestamp", "desc"));
        const unsubscribeArchives = onSnapshot(archivesQuery, (snapshot) => {
          setArchives(snapshot.docs.map(d => d.data() as SavedFortune));
        });

        // 선물 inbox 리스너 — 루멘 선물 및 공명 경험치 자동 반영
        const inboxRef = collection(db, "users", user.uid, "inbox");
        const unsubscribeInbox = onSnapshot(inboxRef, async (snap) => {
          if (snap.empty) return;
          let totalGift = 0;
          let totalExp = 0;
          const batch = writeBatch(db);
          snap.docs.forEach(d => {
            const data = d.data();
            if (data.type === 'exp') {
              totalExp += (data.amount || 0);
            } else {
              totalGift += (data.amount || 0);
            }
            batch.delete(d.ref);
          });
          if (totalGift > 0) {
            batch.update(userDocRef, { 'orb.points': increment(totalGift) });
          }
          await batch.commit().catch(() => {});
          if (totalGift > 0) setToast(`${totalGift.toLocaleString()} 루멘을 선물받았습니다! ✨`);
          if (totalExp > 0) {
            // exp는 클라이언트 growOrb로 처리 (레벨 계산 포함)
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
            setToast("이전에 발행된 천기를 복구했습니다. ✨");
            updates['divine.viewed'] = true;
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

        return () => { unsubscribeUser(); unsubscribeArchives(); unsubscribeInbox(); };
      } else {
        setCurrentUser(null);
        setProfile(null);
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
    if (currentUser) {
      const timer = setTimeout(async () => {
        // points는 서버(Cloud Functions)가 단독 관리 — 클라이언트 auto-sync에서 제외
        const { points: _points, ...orbWithoutPoints } = orb;
        await setDoc(doc(db, "users", currentUser.uid), { profile, orb: orbWithoutPoints }, { merge: true });
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
    const newRecord: SavedFortune = { id: recordId, timestamp: Date.now(), type, data };
    await setDoc(doc(db, "users", currentUser.uid, "archives", recordId), newRecord);
  };

  const deleteArchive = async (id: string) => {
    if (!currentUser) return;
    await deleteDoc(doc(db, "users", currentUser.uid, "archives", id));
    onToast("서고의 기록이 영구 소멸되었습니다.");
  };

  const handleGoogleLogin = async () => await loginWithGoogle();
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
    const today = new Date().toISOString().split('T')[0];
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

  const getDivineMessage = () => {
    const messages = ["오늘의 기운이 당신을 향해 굽이칩니다.", "우주의 파동이 당신의 탄생 기운과 공명합니다.", "행운의 별이 당신의 머리 위에서 빛나고 있습니다.", "찰나의 인연이 거대한 운명의 흐름을 바꿉니다.", "당신의 수련이 결실을 맺을 때가 다가옵니다."];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const addPoints = async (amount: number) => {
    if (!currentUser) return;
    await updateDoc(doc(db, "users", currentUser.uid), { "orb.points": increment(amount) });
    // onSnapshot이 최신 포인트를 자동으로 반영
  };

  const buyDecoration = async (id: string, price: number) => {
    if (orb.purchasedDecorationIds.includes(id)) {
      setOrb({ ...orb, activeDecorationId: id });
      onToast("기운의 형상을 변경하였습니다.");
      return;
    }
    if (orb.points < price) {
      onToast("장식을 획득하기 위한 루멘이 부족합니다.");
      return;
    }
    try {
      await spendPoints(price, `decoration_${id}`);
      setOrb((prev: OrbState) => ({
        ...prev,
        purchasedDecorationIds: [...prev.purchasedDecorationIds, id],
        activeDecorationId: id
      }));
      onToast("새로운 기운의 장식을 획득하였습니다!");
    } catch (err: any) {
      onToast(err?.message?.includes("루멘이 부족") ? "루멘이 부족합니다." : "장식 구매에 실패했습니다.");
    }
  };

  const handleOfferAmount = (amount: number) => {
    const rand = Math.random();
    let multiplier = 1;
    if (rand > 0.95) multiplier = 10;
    else if (rand > 0.8) multiplier = 5;
    else if (rand > 0.5) multiplier = 2;
    setOfferingData({ amount, multiplier });
  };

  const handleOfferingComplete = async () => {
    if (offeringData) {
      const totalLumen = offeringData.amount * OFFERING_CONVERSION_RATE * offeringData.multiplier;
      await addPoints(totalLumen);
      growOrb(Math.floor(totalLumen / 100));
      onToast(`${totalLumen.toLocaleString()} L 의 기운을 하사받았습니다.`);
      setOfferingData(null);
    }
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
      setResult(res);
      // 결과 수신 성공 → 세션 viewed 처리 (복구 방지)
      if (currentUser) {
        updateDoc(doc(db, "users", currentUser.uid, "session", "data"), { "divine.viewed": true }).catch(() => {});
      }
      await saveToArchive('divine', res);
      // dailyExtractCount만 클라이언트 상태로 갱신 (UX 목적)
      setOrb(prev => ({ ...prev, dailyExtractCount: prev.dailyExtractCount + 1 }));
      growOrb(30);
      onToast("오늘의 천기가 기록되었습니다.");
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
      const res = await getScientificRecommendation(pendingScienceConfig);
      setScientificResult(res);
      await saveToArchive('scientific', res);
      growOrb(30);
      onToast("지성 분석 리포트가 도출되었습니다.");
    } catch (err: any) {
      const msg = err?.message?.includes("루멘이 부족")
        ? "루멘이 부족합니다."
        : "분석 엔진 가동에 오류가 발생했습니다.";
      onToast(msg);
    } finally {
      setScienceLoading(false);
    }
  };

  const buyGoldenCard = async () => {
    if (orb.points < GOLDEN_CARD_PRICE) { onToast("유물을 소유하기 위한 루멘이 부족합니다."); return; }
    try {
      await spendPoints(GOLDEN_CARD_PRICE, "golden_card");
      const cardId = `MYSTIC-${Math.floor(1000 + Math.random() * 8999)}-GOLD`;
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
      onToast(`${currentYear}년 대운 분석이 완료되어 서고에 영구 보존되었습니다.`);
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
    const today = new Date().toISOString().split('T')[0];
    const isNewDay = orb.lastExtractDate !== today;
    const tapExp = isNewDay ? 0 : (orb.dailyOrbTapExp ?? 0);
    if (tapExp >= 50) {
      onToast("오늘의 구슬 수련 한도에 도달했습니다. (0.5레벨/일)");
      return;
    }
    const gained = Math.min(5, 50 - tapExp);
    growOrb(gained);
    addPoints(50);
    setOrb(prev => ({
      ...prev,
      dailyOrbTapExp: tapExp + gained,
      ...(isNewDay ? { lastExtractDate: today, dailyExtractCount: 0, dailyPostCount: 0 } : {}),
    }));
  };

  // 회람판 글 작성 경험치: 하루 최대 5회(0.5레벨) 한도
  const handlePostCreated = () => {
    const today = new Date().toISOString().split('T')[0];
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

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#020617]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(30,58,138,0.2),_transparent)] pointer-events-none"></div>
        <div className="relative z-10 glass p-10 rounded-[3rem] w-full max-w-lg space-y-10 animate-in fade-in zoom-in duration-700 shadow-2xl border-white/5 text-center">
          <div className="space-y-3">
            <h1 className="text-5xl font-mystic font-bold text-transparent bg-clip-text bg-gradient-to-b from-indigo-200 via-indigo-400 to-indigo-600 tracking-tighter uppercase">Mystic Lotto</h1>
            <p className="text-slate-500 text-[10px] font-black tracking-[0.6em] uppercase">Fate & Resonance</p>
          </div>
          <div className="p-8 bg-indigo-500/10 border border-indigo-500/20 rounded-3xl space-y-6">
             <p className="text-sm text-indigo-300 font-bold">당신의 운명을 클라우드에 영구히 동기화하기 위해<br/>접속 방법을 선택하십시오.</p>
             <div className="space-y-4">
                <button onClick={handleGoogleLogin} className="w-full py-4 bg-white text-slate-950 font-black rounded-2xl shadow-xl flex items-center justify-center space-x-3 hover:bg-slate-100 transition-all active:scale-95">
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="google" />
                  <span>Google 계정으로 시작</span>
                </button>
             </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <ProfileSetupForm currentUser={currentUser} onComplete={setProfile} />;
  }


  return (
    <div className="min-h-screen bg-[#020617] pb-48 text-slate-200 overflow-x-hidden">
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

      {view === 'square' && <CelestialSquare profile={profile} orb={orb} onUpdatePoints={updatePoints} onUpdateFavorites={updateFavorites} onBack={() => setView('main')} onToast={onToast} onGrowFromPost={handlePostCreated} isAdmin={isAdmin} />}
      {view === 'profile' && <UserProfilePage profile={profile} orb={orb} archives={archives} onUpdateProfile={onUpdateProfile} onUpdateOrb={onUpdateOrb} onWithdraw={handleWithdrawAction} onBack={() => setView('main')} onToast={onToast} isAdmin={isAdmin} />}
      {view === 'analysis' && <MysticAnalysisLab lottoHistory={lottoHistory} onBack={() => setView('main')} />}
      {offeringData && <DivineEffect amount={offeringData.amount} multiplier={offeringData.multiplier} onComplete={handleOfferingComplete} />}
      {toast && (<div className="fixed inset-0 flex items-center justify-center z-[6000] pointer-events-none px-6"><div className="bg-slate-900/40 backdrop-blur-3xl text-white px-12 py-7 rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.8)] border border-white/10 text-center animate-in zoom-in-95 duration-500 max-w-md"><p className="text-xl font-bold leading-tight whitespace-pre-line">{toast}</p></div></div>)}

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

      <header className="sticky top-0 z-[100] glass border-b border-white/5 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <img src="/s_mlotto_logo.png" alt="Mystic" className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
          <div className="flex flex-col"><h2 className="text-2xl font-mystic font-black text-white tracking-widest leading-none">MYSTIC</h2><span className="text-[8px] text-indigo-400 uppercase font-bold tracking-[0.5em] mt-1">Lotto Resonance</span></div>
          <div className="hidden md:flex flex-col ml-6"><p className="text-[10px] text-indigo-100 font-bold italic animate-pulse">"{getDivineMessage()}"</p></div>
        </div>
        <div className="flex items-center space-x-6 text-right relative">
          <button onClick={() => setView('profile')} className="hover:bg-white/5 p-2 rounded-xl group flex items-center space-x-4">
             <div className="text-right"><p className="text-[10px] text-slate-500 uppercase font-black">Fortune Seeker</p><p className="text-base font-black text-white group-hover:text-indigo-400 transition-colors">{orb.nickname || profile.name}님</p></div>
             <OrbVisual level={orb.level} className="w-8 h-8 border border-white/10 group-hover:border-indigo-500/50 transition-all" />
          </button>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="w-10 h-10 rounded-xl border border-slate-800 flex flex-col items-center justify-center space-y-1 hover:bg-white/5 text-white">
              <span className="w-5 h-0.5 bg-white rounded-full"></span><span className="w-5 h-0.5 bg-white rounded-full"></span><span className="w-5 h-0.5 bg-white rounded-full"></span>
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 bg-transparent z-40" onClick={() => setShowMenu(false)}></div>
                <div className="absolute top-full right-0 mt-2 w-56 bg-[#020617] p-2 rounded-2xl border border-white/10 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
                  <button onClick={() => { setView('square'); setShowMenu(false); }} className="w-full p-4 flex items-center space-x-3 rounded-xl hover:bg-indigo-600/20 text-indigo-100 text-xs font-black uppercase transition-all"><span>🌌</span><span>천상의 광장 가기</span></button>
                  <button onClick={() => { setView('analysis'); setShowMenu(false); }} className="w-full p-4 flex items-center space-x-3 rounded-xl hover:bg-cyan-600/20 text-cyan-100 text-xs font-black uppercase transition-all"><span>📊</span><span>미스틱 분석 제단</span></button>
                  {isAdmin && (
                    <button onClick={() => { setIsAdminModalOpen(true); setShowMenu(false); }} className="w-full p-4 flex items-center space-x-3 rounded-xl hover:bg-amber-600/20 text-amber-100 text-xs font-black uppercase transition-all"><span>🎫</span><span>당첨번호 등록 (Admin)</span></button>
                  )}
                  <div className="h-[1px] bg-white/5 my-1"></div>
                  <button onClick={async () => { await logout(); setShowMenu(false); }} className="w-full p-4 flex items-center space-x-3 rounded-xl hover:bg-red-600/20 text-red-100 text-xs font-black uppercase transition-all"><span>🚪</span><span>로그아웃</span></button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-16 space-y-24">
        <div className="flex justify-center mb-10 overflow-x-auto pb-4 no-scrollbar">
          <div className="bg-slate-950/50 border border-white/5 rounded-2xl p-1.5 flex space-x-2 shrink-0">
             <button onClick={() => setActiveTab('orb')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'orb' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>운세 & 구슬</button>
             <button onClick={() => setActiveTab('science')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'science' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>지성 분석</button>
             <button onClick={() => setActiveTab('treasury')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'treasury' ? 'bg-yellow-600 text-slate-950 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>보관소</button>
             <button onClick={() => setActiveTab('offering')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'offering' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>봉헌</button>
             <button onClick={() => setActiveTab('archives')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'archives' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>서고</button>
          </div>
        </div>
        
        {activeTab === 'orb' && (
          <div className="space-y-24">
            <section className="relative flex flex-col items-center animate-in fade-in duration-700">
              <FortuneOrb orb={orb} onGrow={handleOrbTap} />
              <button onClick={() => setShowShop(!showShop)} className="mt-10 px-10 py-4 bg-indigo-500/10 border-2 border-indigo-500/30 rounded-full text-sm font-black text-indigo-200 hover:bg-indigo-500/20 transition-all flex items-center space-x-3 shadow-2xl backdrop-blur-xl"><span>✨</span><span className="tracking-[0.2em] uppercase">신비의 상점</span><span className="bg-indigo-500 text-white px-3 py-1 rounded-full text-[10px] ml-4">{displayPoints(orb.points)} L</span></button>
              {showShop && (
                <div className="absolute top-28 right-0 md:right-1/2 md:translate-x-1/2 w-80 glass p-8 rounded-[3rem] z-40 border-indigo-500/40 shadow-2xl animate-in fade-in zoom-in duration-300 max-h-[60vh] overflow-y-auto">
                  <div className="space-y-3">
                    {ORB_DECORATIONS.map(item => (
                      <button key={item.id} onClick={() => buyDecoration(item.id, item.price)} className={`w-full p-4 rounded-2xl border-2 text-left flex justify-between items-center transition-all ${orb.activeDecorationId === item.id ? 'border-indigo-500 bg-indigo-500/20' : 'border-slate-800 bg-slate-900/40'}`}>
                        <div><p className="text-xs font-black text-white">{item.name}</p><p className="text-[10px] font-bold text-slate-500">{item.price === 0 ? 'DEFAULT' : `${item.price.toLocaleString()} L`}</p></div>
                        {orb.activeDecorationId === item.id && <span className="text-indigo-400 font-black">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
            <section className="space-y-16 border-t border-white/5 pt-20">
              <LottoGenerator result={result} loading={loading} onGenerate={onDivineGenerateClick} onSlotGenerate={handleSlotResult} onReset={() => setResult(null)} hasExtractedToday={hasExtractedDivineToday} />
            </section>
          </div>
        )}

        {activeTab === 'science' && (<section className="animate-in fade-in duration-700"><ScientificAnalysis loading={scienceLoading} result={scienceResult} onGenerate={onScienceGenerateClick} lottoHistory={lottoHistory} /></section>)}
        {activeTab === 'treasury' && (
          <section className="flex flex-col items-center space-y-16 animate-in fade-in duration-700">
             <div className="text-center relative"><h2 className="text-4xl font-mystic font-black text-yellow-500 tracking-[0.6em] mb-4 uppercase">Sacred Vault</h2></div>
             <div className="w-full flex flex-col items-center space-y-24">
               <div className="w-full flex flex-col items-center">
                 <GoldenCard ownerName={profile.name} isVisible={true} cardId={orb.goldenCardId} />
                 {!orb.hasGoldenCard && <button onClick={buyGoldenCard} className="mt-10 px-16 py-6 bg-gradient-to-r from-yellow-600 to-amber-700 text-slate-950 font-black rounded-full shadow-2xl uppercase tracking-[0.3em] text-lg border-t-2 border-white/40">유물 소유하기 (50,000 L)</button>}
               </div>
               <div className="w-full max-w-5xl">
                 {currentDestiny ? (
                   <div className="w-full glass p-12 rounded-[4rem] border border-amber-500/30 shadow-2xl relative overflow-hidden bg-gradient-to-b from-amber-500/5 to-transparent">
                     <div className="flex flex-col items-center space-y-8">
                        <h3 className="text-center text-[10px] font-black text-amber-500 tracking-[0.8em] uppercase">Annual Eternal Scroll Activated</h3>
                        <div className="flex justify-center flex wrap gap-4">{currentDestiny.numbers.map((num, i) => <div key={i} className="w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br from-amber-400 to-amber-700 text-slate-950 font-black text-3xl shadow-xl border-t-2 border-white/40">{num}</div>)}</div>
                        <div className="p-10 bg-black/40 rounded-[3rem] border border-white/5 w-full">
                           <h4 className="text-amber-500 font-mystic font-black text-lg mb-6">올해 대운의 흐름</h4>
                           <p className="text-sm text-indigo-50/70 leading-relaxed italic line-clamp-3">{currentDestiny.reason}</p>
                           <button onClick={() => setShowFullAnnualReport(true)} className="mt-8 px-10 py-4 bg-amber-600/20 border border-amber-600/40 rounded-2xl text-amber-100 text-xs font-black uppercase tracking-widest hover:bg-amber-600 transition-all w-full">전체 정밀 리포트 회람하기</button>
                        </div>
                     </div>
                   </div>
                 ) : (
                   <EternalRitual onComplete={startFixedRitual} onUnlockRequest={handleUnlockAnnualRitual} isUnlocked={isRitualUnlocked} points={orb.points} loading={fixedRitualLoading} />
                 )}
               </div>
             </div>
          </section>
        )}
        {activeTab === 'offering' && <section className="flex flex-col items-center animate-in fade-in duration-700"><SacredOffering onOffer={handleOfferAmount} /></section>}
        {activeTab === 'archives' && <section className="animate-in fade-in duration-700"><Archives items={archives} orb={orb} onDelete={deleteArchive} /></section>}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 glass border-t border-white/10 px-10 py-8 flex items-center justify-between z-[200] backdrop-blur-3xl shadow-2xl">
         <div className="flex items-center space-x-8">
            <div className="relative">
              <OrbVisual level={orb.level} className="w-16 h-16 border-2 border-white/10" />
              <div className="absolute -top-2 -right-2 bg-indigo-600 text-[11px] font-black px-3 py-1 rounded-xl z-10">LV.{orb.level}</div>
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
            <p className="text-[11px] text-slate-500 font-black uppercase tracking-widest mb-1.5">Divine Essence (루멘)</p>
            <p className="text-3xl font-mystic font-black text-yellow-500 tabular-nums">{displayPoints(orb.points)} <span className="text-sm font-sans">L</span></p>
         </div>
      </footer>

      <style>{`
        .drop-shadow-glow { filter: drop-shadow(0 0 20px rgba(251, 191, 36, 0.4)); }
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(251, 191, 36, 0.2); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;

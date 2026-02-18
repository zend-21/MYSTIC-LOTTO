
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, FortuneResult, SavedFortune, OrbState, CalendarType, ORB_DECORATIONS, GOLDEN_CARD_PRICE, OFFERING_CONVERSION_RATE, AnnualDestiny, ScientificAnalysisResult, ScientificFilterConfig, DAILY_LIMIT, COST_DIVINE, COST_SCIENCE, COST_ANNUAL, INITIAL_POINTS } from './types';
import { getFortuneAndNumbers, getFixedDestinyNumbers } from './services/geminiService';
import { getScientificRecommendation } from './services/scientificService';
import { LottoRound } from './types';
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

// Firebase imports
import { auth, db, loginWithGoogle, logout, loginAsGuest } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, query, orderBy, deleteDoc, limit as fsLimit } from "firebase/firestore";

interface CitySuggestion {
  display: string;
  lat: number;
  lon: number;
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
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
  const [isEditingExisting, setIsEditingExisting] = useState(false); 
  const [adminRound, setAdminRound] = useState('');
  const [adminNumbers, setAdminNumbers] = useState(['', '', '', '', '', '']);
  const [adminBonus, setAdminBonus] = useState('');
  const [singleInputStr, setSingleInputStr] = useState(''); 
  const [deleteConfirmRound, setDeleteConfirmRound] = useState<number | null>(null); 

  const [inputName, setInputName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  
  const [inputCity, setInputCity] = useState(''); 
  const [selectedCoords, setSelectedCoords] = useState<{lat: number, lon: number} | null>(null);
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([]); 
  const [showCityList, setShowCityList] = useState(false);
  const [isSearchingCity, setIsSearchingCity] = useState(false);
  const debounceRef = useRef<any>(null);
  
  const [selectedHour, setSelectedHour] = useState('09');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedAmPm, setSelectedAmPm] = useState<'오전' | '오후'>('오전');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerStep, setTimePickerStep] = useState<'ampm' | 'hour' | 'minute'>('ampm');

  const [inputGender, setInputGender] = useState<'M' | 'F'>('M');
  const [calendarType, setCalendarType] = useState<CalendarType>('solar');
  const [isIntercalary, setIsIntercalary] = useState(false);

  const yearRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  
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
    favoriteRoomIds: []
  });

  // --- Firebase Sync Logic ---
  
  // 1. Auth & Data Stream
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const userDocRef = doc(db, "users", user.uid);
        const unsubscribeUser = onSnapshot(userDocRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data.profile) setProfile(data.profile);
            if (data.orb) setOrb(data.orb);
          } else {
            // New user initialization
            setDoc(userDocRef, { orb: { ...orb, points: INITIAL_POINTS } }, { merge: true });
          }
        });
        const archivesQuery = query(collection(db, "users", user.uid, "archives"), orderBy("timestamp", "desc"));
        const unsubscribeArchives = onSnapshot(archivesQuery, (snapshot) => {
          setArchives(snapshot.docs.map(d => d.data() as SavedFortune));
        });
        return () => { unsubscribeUser(); unsubscribeArchives(); };
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
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (currentUser) {
      const timer = setTimeout(async () => {
        await setDoc(doc(db, "users", currentUser.uid), { profile, orb }, { merge: true });
      }, 500); // Debounce sync
      return () => clearTimeout(timer);
    }
  }, [profile, orb, currentUser]);

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
  const handleGuestLogin = async () => await loginAsGuest();
  const handleWithdrawAction = async () => { if (!currentUser) return; await logout(); setProfile(null); setView('main'); window.location.reload(); };

  // --- End Firebase Sync Logic ---

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleCityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputCity(val);
    setSelectedCoords(null); 

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const searchVal = val.trim();
    if (searchVal.length >= 2) {
      debounceRef.current = setTimeout(async () => {
        setIsSearchingCity(true);
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchVal)}&format=json&addressdetails=1&limit=6&accept-language=ko`, {
            headers: { 'User-Agent': 'MysticLottoApp/1.0' }
          });
          if (!response.ok) throw new Error("API Limit");
          const data = await response.json();
          const suggestions: CitySuggestion[] = data.map((item: any) => ({
            display: item.display_name,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon)
          }));
          setCitySuggestions(suggestions);
          setShowCityList(suggestions.length > 0);
        } catch (err) {
          console.error("City search failed", err);
        } finally {
          setIsSearchingCity(false);
        }
      }, 600);
    } else {
      setCitySuggestions([]);
      setShowCityList(false);
    }
  };

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

  const deductPoints = (amount: number): boolean => {
    if (orb.points < amount) return false;
    setOrb({ ...orb, points: orb.points - amount });
    return true;
  };

  const updatePoints = (amount: number) => setOrb({ ...orb, points: orb.points + amount });
  const updateFavorites = (roomIds: string[]) => setOrb({ ...orb, favoriteRoomIds: roomIds });

  const getDivineMessage = () => {
    const messages = ["오늘의 기운이 당신을 향해 굽이칩니다.", "우주의 파동이 당신의 탄생 기운과 공명합니다.", "행운의 별이 당신의 머리 위에서 빛나고 있습니다.", "찰나의 인연이 거대한 운명의 흐름을 바꿉니다.", "당신의 수련이 결실을 맺을 때가 다가옵니다."];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const addPoints = (amount: number) => setOrb(prev => ({ ...prev, points: prev.points + amount }));

  const buyDecoration = (id: string, price: number) => {
    if (orb.purchasedDecorationIds.includes(id)) {
      setOrb({ ...orb, activeDecorationId: id });
      onToast("기운의 형상을 변경하였습니다.");
      return;
    }
    if (orb.points < price) {
      onToast("장식을 획득하기 위한 루멘이 부족합니다.");
      return;
    }
    setOrb({
      ...orb,
      points: orb.points - price,
      purchasedDecorationIds: [...orb.purchasedDecorationIds, id],
      activeDecorationId: id
    });
    onToast("새로운 기운의 장식을 획득하였습니다!");
  };

  const handleOfferAmount = (amount: number) => {
    const rand = Math.random();
    let multiplier = 1;
    if (rand > 0.95) multiplier = 10;
    else if (rand > 0.8) multiplier = 5;
    else if (rand > 0.5) multiplier = 2;
    setOfferingData({ amount, multiplier });
  };

  const handleOfferingComplete = () => {
    if (offeringData) {
      const totalLumen = offeringData.amount * OFFERING_CONVERSION_RATE * offeringData.multiplier;
      addPoints(totalLumen);
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
      const res = await getFortuneAndNumbers(profile);
      setResult(res);
      await saveToArchive('divine', res);
      setOrb(prev => ({ ...prev, points: prev.points - COST_DIVINE, dailyExtractCount: prev.dailyExtractCount + 1 }));
      growOrb(30);
      onToast("오늘의 천기가 기록되었습니다.");
    } catch (err) {
      onToast("우주의 기운이 불안정합니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const executeScienceGenerate = async () => {
    if (!pendingScienceConfig) return;
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    setScienceLoading(true);
    try {
      const res = await getScientificRecommendation(pendingScienceConfig);
      setScientificResult(res);
      await saveToArchive('scientific', res);
      deductPoints(COST_SCIENCE);
      growOrb(30);
      onToast("지성 분석 리포트가 도출되었습니다.");
    } catch (err) {
      onToast("분석 엔진 가동에 오류가 발생했습니다.");
    } finally {
      setScienceLoading(false);
    }
  };

  const buyGoldenCard = () => {
    if (orb.points < GOLDEN_CARD_PRICE) { onToast("유물을 소유하기 위한 루멘이 부족합니다."); return; }
    const cardId = `MYSTIC-${Math.floor(1000 + Math.random() * 8999)}-GOLD`;
    setOrb({
      ...orb,
      points: orb.points - GOLDEN_CARD_PRICE,
      hasGoldenCard: true,
      goldenCardId: cardId
    });
    onToast("천상의 유물 '천부인'의 주인이 되셨습니다!");
  };

  const currentYear = new Date().getFullYear();
  const currentDestiny = orb.annualDestinies ? orb.annualDestinies[currentYear] : undefined;

  const handleUnlockAnnualRitual = () => {
    if (orb.points < COST_ANNUAL) { onToast("영원한 의식을 위한 루멘이 부족합니다."); return; }
    updatePoints(-COST_ANNUAL);
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
      setShowFullAnnualReport(true);
    } catch (err) {
      onToast("의식 진행 중 기운이 소멸되었습니다.");
    } finally {
      setFixedRitualLoading(false);
    }
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputName || !birthYear || !birthMonth || !birthDay || !inputCity) return;
    const formattedBirth = `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`;
    let h = parseInt(selectedHour);
    if (selectedAmPm === '오후' && h < 12) h += 12;
    if (selectedAmPm === '오전' && h === 12) h = 0;
    const formattedTime = `${h.toString().padStart(2, '0')}:${selectedMinute}`;
    setProfile({ 
      name: inputName, 
      birthDate: formattedBirth, 
      birthTime: formattedTime, 
      birthCity: inputCity, 
      lat: selectedCoords?.lat,
      lon: selectedCoords?.lon,
      gender: inputGender, 
      calendarType, 
      isIntercalary 
    });
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
    setBirthYear(val);
    if (val.length === 4) monthRef.current?.focus();
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
    setBirthMonth(val);
    if (val.length === 2) dayRef.current?.focus();
  };

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
    setBirthDay(val);
    if (val.length === 2) { setShowTimePicker(true); setTimePickerStep('ampm'); }
  };

  const handleSelectAmPm = (ampm: '오전' | '오후') => { setSelectedAmPm(ampm); setTimePickerStep('hour'); };
  const handleSelectHour = (h: string) => { setSelectedHour(h); setTimePickerStep('minute'); };
  const handleSelectMinute = (m: string) => { setSelectedMinute(m); setShowTimePicker(false); setTimePickerStep('ampm'); };

  const handleRegisterLotto = async () => {
    const roundNum = parseInt(adminRound);
    const nums = adminNumbers.map(n => parseInt(n)).filter(n => !isNaN(n));
    const bonusNum = parseInt(adminBonus);
    if (isNaN(roundNum) || nums.length < 6 || isNaN(bonusNum)) { onToast("모든 번호를 올바르게 입력해주세요."); return; }
    const newRound: LottoRound = { round: roundNum, numbers: nums, bonus: bonusNum };
    const updatedHistory = [newRound, ...lottoHistory.filter(r => r.round !== roundNum)].sort((a, b) => b.round - a.round);
    await setDoc(doc(db, "global", "lotto_history"), { history: updatedHistory });
    onToast(`${roundNum}회차 정보가 기록되었습니다.`);
    setIsEditingExisting(false); setSingleInputStr(''); setAdminNumbers(['', '', '', '', '', '']); setAdminBonus('');
  };

  const handleEditRound = (round: LottoRound) => {
    setIsEditingExisting(true);
    setAdminRound(round.round.toString());
    setAdminNumbers(round.numbers.map(n => n.toString()));
    setAdminBonus(round.bonus.toString());
  };

  const handleDeleteRoundAction = async (roundNum: number) => {
    const updatedHistory = lottoHistory.filter(r => r.round !== roundNum);
    await setDoc(doc(db, "global", "lotto_history"), { history: updatedHistory });
    setDeleteConfirmRound(null);
    onToast(`${roundNum}회차 정보가 소멸되었습니다.`);
  };

  const handleSingleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    setSingleInputStr(val);
    if (val.endsWith('.')) {
      const num = parseInt(val.slice(0, -1).trim());
      if (!isNaN(num) && num >= 1 && num <= 45) {
        const currentEmptyIdx = adminNumbers.findIndex(n => n === '');
        if (currentEmptyIdx !== -1) {
          const next = [...adminNumbers]; next[currentEmptyIdx] = num.toString(); setAdminNumbers(next);
        } else if (adminBonus === '') { setAdminBonus(num.toString()); }
        setSingleInputStr('');
      }
    }
  };

  const removeNumber = (idx: number, type: 'main' | 'bonus') => {
    if (type === 'main') { const next = [...adminNumbers]; next[idx] = ''; setAdminNumbers(next); }
    else setAdminBonus('');
  };

  const growOrb = (amount: number) => {
    setOrb(prev => {
      const newExp = prev.exp + amount;
      const newLevel = Math.floor(newExp / 100) + 1;
      const colors = ['#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6'];
      const color = colors[newLevel % colors.length];
      return { ...prev, level: newLevel, exp: newExp, color, aura: color + '80' };
    });
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
                <div className="flex items-center space-x-4">
                  <div className="flex-1 h-[1px] bg-white/5"></div>
                  <span className="text-[10px] font-black text-slate-600 uppercase">OR</span>
                  <div className="flex-1 h-[1px] bg-white/5"></div>
                </div>
                <button onClick={handleGuestLogin} className="w-full py-4 bg-slate-800 text-white font-black rounded-2xl shadow-xl flex items-center justify-center space-x-3 hover:bg-slate-700 transition-all active:scale-95 border border-white/5">
                  <span className="text-lg">👤</span>
                  <span>AI 스튜디오 프리뷰 모드 (익명)</span>
                </button>
             </div>
             <p className="text-[9px] text-slate-600 leading-relaxed">익명 로그인은 AI Studio 개발 환경에서 도메인 제약 없이 테스트하기 위한 용도입니다. 브라우저 쿠키를 삭제하면 데이터가 유실될 수 있습니다.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#020617]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(30,58,138,0.2),_transparent)] pointer-events-none"></div>
        <div className="relative z-10 glass p-10 rounded-[3rem] w-full max-w-lg space-y-10 animate-in fade-in zoom-in duration-700 shadow-2xl border-white/5 text-center">
          <div className="space-y-3">
            <h1 className="text-5xl font-mystic font-bold text-transparent bg-clip-text bg-gradient-to-b from-indigo-200 via-indigo-400 to-indigo-600 tracking-tighter uppercase">Mystic Lotto</h1>
            <p className="text-slate-500 text-[10px] font-black tracking-[0.6em] uppercase">Fate & Resonance</p>
          </div>
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
             <p className="text-xs text-indigo-300 font-bold">환영합니다, {currentUser.displayName || '운명 개척자'}님!<br/>정확한 운명 분석을 위해 생년월일시 정보를 입력하십시오.</p>
          </div>
          <form onSubmit={handleStart} className="space-y-6 text-left">
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest px-1">Fortune Seeker (성함)</label>
                <input type="text" required value={inputName} onChange={e => setInputName(e.target.value)} className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-white focus:outline-none focus:border-indigo-500 font-bold" placeholder="성함을 입력하세요" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest px-1">Divine Energy (성별)</label>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setInputGender('M')} className={`flex-1 py-4 rounded-2xl border-2 transition-all font-black text-sm ${inputGender === 'M' ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)]' : 'border-slate-800 text-slate-500'}`}>남성 (陽)</button>
                  <button type="button" onClick={() => setInputGender('F')} className={`flex-1 py-4 rounded-2xl border-2 transition-all font-black text-sm ${inputGender === 'F' ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)]' : 'border-slate-800 text-slate-500'}`}>여성 (음)</button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest px-1">Calendar System (력법)</label>
                <div className="p-1.5 bg-slate-950/50 rounded-2xl border border-slate-800 flex">
                  <button type="button" onClick={() => setCalendarType('solar')} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${calendarType === 'solar' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>양력</button>
                  <button type="button" onClick={() => setCalendarType('lunar')} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${calendarType === 'lunar' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>음력</button>
                </div>
              </div>
              
              <div className="space-y-2 relative">
                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest px-1">Birth City (출생 도시)</label>
                <div className="relative">
                  <input type="text" required value={inputCity} onChange={handleCityInputChange} className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-white focus:outline-none focus:border-indigo-500 font-bold pr-12" placeholder="도시 또는 국가명 입력" />
                  {isSearchingCity && <div className="absolute right-4 top-1/2 -translate-y-1/2"><div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>}
                </div>
                {showCityList && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-indigo-500/30 rounded-2xl shadow-2xl z-[100] max-h-56 overflow-y-auto custom-scroll">
                    {citySuggestions.map((city, idx) => (
                      <button key={idx} type="button" onClick={() => { setInputCity(city.display); setSelectedCoords({lat: city.lat, lon: city.lon}); setShowCityList(false); }} className="w-full text-left p-4 hover:bg-indigo-600/20 text-xs font-bold text-slate-300 border-b border-white/5 transition-colors">
                        <div className="flex flex-col"><span>{city.display}</span><span className="text-[8px] text-slate-500">LAT: {city.lat.toFixed(2)} / LON: {city.lon.toFixed(2)}</span></div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest px-1">Birth Manifestation (생년월일시)</label>
                <div className="flex space-x-1.5 relative items-center">
                  <input ref={yearRef} type="text" placeholder="YYYY" maxLength={4} value={birthYear} onChange={handleYearChange} className="w-[22%] bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-white text-center focus:border-indigo-500 outline-none font-bold" />
                  <input ref={monthRef} type="text" placeholder="MM" maxLength={2} value={birthMonth} onChange={handleMonthChange} className="w-[16%] bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-white text-center focus:border-indigo-500 outline-none font-bold" />
                  <input ref={dayRef} type="text" placeholder="DD" maxLength={2} value={birthDay} onChange={handleDayChange} className="w-[16%] bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-white text-center focus:border-indigo-500 outline-none font-bold" />
                  <button type="button" onClick={() => { setShowTimePicker(!showTimePicker); setTimePickerStep('ampm'); }} className={`flex-1 min-w-0 bg-slate-950/50 border rounded-2xl p-4 text-white text-center font-bold flex items-center justify-center transition-all ${showTimePicker ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800'}`}>
                    <span className="text-[12px] whitespace-nowrap">{selectedAmPm} {selectedHour}:{selectedMinute} 🕒</span>
                  </button>
                  {showTimePicker && (
                    <>
                      <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowTimePicker(false)}></div>
                      <div className="absolute bottom-[4.5rem] right-0 w-80 glass p-6 rounded-3xl z-50 border-indigo-500/30 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200 bg-slate-900/95">
                        {timePickerStep === 'ampm' && (
                          <div className="space-y-3">
                            <p className="text-[9px] font-black text-indigo-400 uppercase text-center mb-4 tracking-widest">Time Phase</p>
                            <button type="button" onClick={() => handleSelectAmPm('오전')} className="w-full py-4 bg-indigo-600/10 border border-indigo-500/30 rounded-2xl text-sm font-black text-white hover:bg-indigo-600 transition-colors">오전 (AM)</button>
                            <button type="button" onClick={() => handleSelectAmPm('오후')} className="w-full py-4 bg-pink-600/10 border border-pink-500/30 rounded-2xl text-sm font-black text-white hover:bg-pink-600 transition-colors">오후 (PM)</button>
                          </div>
                        )}
                        {timePickerStep === 'hour' && (
                          <div className="space-y-3">
                            <p className="text-[9px] font-black text-indigo-400 uppercase text-center mb-4 tracking-widest">Select Hour</p>
                            <div className="grid grid-cols-4 gap-2 h-56 overflow-y-auto pr-2 custom-scroll">
                              {Array.from({length: 12}).map((_, i) => {
                                const h = (i + 1).toString().padStart(2, '0');
                                return <button key={h} type="button" onClick={() => handleSelectHour(h)} className={`py-3 rounded-xl text-xs font-black transition-all ${selectedHour === h ? 'bg-indigo-600 text-white' : 'bg-slate-900/50 text-slate-400 hover:bg-white/5'}`}>{h}시</button>;
                              })}
                              <button type="button" onClick={() => handleSelectHour('12')} className={`py-3 rounded-xl text-xs font-black transition-all ${selectedHour === '12' ? 'bg-indigo-600 text-white' : 'bg-slate-900/50 text-slate-400 hover:bg-white/5'}`}>12시</button>
                            </div>
                          </div>
                        )}
                        {timePickerStep === 'minute' && (
                          <div className="space-y-3 text-center">
                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Select Precise Minute</p>
                            <div className="grid grid-cols-6 gap-1.5 h-64 overflow-y-auto pr-2 custom-scroll">
                              {Array.from({length: 60}).map((_, i) => {
                                const m = i.toString().padStart(2, '0');
                                return <button key={m} type="button" onClick={() => handleSelectMinute(m)} className={`py-2.5 rounded-lg text-[10px] font-black transition-all ${selectedMinute === m ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-900/50 text-slate-400 hover:bg-white/5'}`}>{m}</button>;
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button ref={submitRef} type="submit" className="w-full py-6 bg-gradient-to-r from-indigo-600 to-pink-600 text-white font-black rounded-2xl shadow-2xl transition-all uppercase tracking-widest text-lg active:scale-95">운명의 문 열기</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] pb-48 text-slate-200 overflow-x-hidden">
      {/* 프리미엄 연간 리포트 모달 */}
      {showFullAnnualReport && currentDestiny && (
        <div className="fixed inset-0 z-[9000] flex items-start justify-center p-4 sm:p-8 bg-black/95 backdrop-blur-3xl animate-in fade-in duration-500 overflow-y-auto custom-scroll">
          <div className="glass p-8 sm:p-20 rounded-[4rem] border border-amber-500/40 w-full max-w-6xl shadow-[0_0_200px_rgba(251,191,36,0.3)] space-y-20 relative my-10 bg-slate-950/40">
            <button onClick={() => setShowFullAnnualReport(false)} className="absolute top-10 right-10 text-slate-500 hover:text-white transition-colors text-4xl z-[9001]">✕</button>
            <div className="text-center space-y-8 pb-10 border-b border-white/5">
              <div className="inline-flex items-center space-x-4 px-10 py-3 bg-amber-500/10 border border-amber-500/30 rounded-full">
                <span className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></span>
                <span className="text-sm font-black text-amber-500 uppercase tracking-[0.8em] ml-2">Premium Eternal Revelation</span>
              </div>
              <h2 className="text-6xl md:text-8xl font-mystic font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-amber-200 to-amber-600 tracking-tight uppercase leading-tight pt-6 drop-shadow-glow">천명 대운 정밀 리포트</h2>
              <p className="text-slate-400 text-xl font-black tracking-[0.6em] uppercase">{orb.nickname || profile.name} 님의 {currentDestiny.year}년 영적 동기화 완료</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
               <div className="p-12 bg-gradient-to-br from-amber-500/10 via-slate-900/50 to-transparent rounded-[4rem] border border-amber-500/30 shadow-2xl space-y-10 flex flex-col items-center justify-center">
                  <h3 className="text-amber-500 font-black text-sm uppercase tracking-widest mb-4">올해의 수호 천명수</h3>
                  <div className="flex wrap justify-center gap-8">
                     {currentDestiny.numbers.map((num, i) => (
                       <div key={i} className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-100 via-amber-500 to-amber-900 flex items-center justify-center text-slate-950 font-black text-4xl shadow-[0_15px_40px_rgba(251,191,36,0.5)] border-t-4 border-white/40">{num}</div>
                     ))}
                  </div>
               </div>
               <div className="p-12 bg-black/50 rounded-[4rem] border border-white/5 flex flex-col items-center justify-center space-y-8">
                  <h3 className="text-slate-500 font-black text-xs uppercase tracking-widest">올해의 기운 보강 색상</h3>
                  <div className="flex flex-col items-center space-y-6">
                     <div className="w-24 h-24 rounded-3xl shadow-2xl border-4 border-white/10" style={{backgroundColor: currentDestiny.luckyColor || '#fff'}}></div>
                     <p className="text-2xl font-black text-white">{currentDestiny.luckyColor}</p>
                  </div>
               </div>
            </div>
            <div className="p-14 bg-slate-900/80 rounded-[5rem] border border-white/10 shadow-2xl relative overflow-hidden group">
               <h3 className="text-amber-400 font-mystic font-black text-3xl mb-12 uppercase tracking-widest">ANNUAL DESTINY SYNOPSIS</h3>
               <p className="text-xl text-indigo-50/90 leading-[2.6] italic whitespace-pre-wrap first-letter:text-9xl first-letter:font-mystic first-letter:mr-8 first-letter:float-left first-letter:text-amber-500 first-letter:leading-none">{currentDestiny.reason}</p>
            </div>
            <div className="flex justify-center pt-10"><button onClick={() => setShowFullAnnualReport(false)} className="px-32 py-10 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 text-slate-950 font-black rounded-[3rem] shadow-2xl uppercase tracking-[0.5em] text-2xl border-t-4 border-white/40 hover:scale-105 transition-all">천상 계시 기록 보존</button></div>
          </div>
        </div>
      )}

      {isAdminModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="glass p-10 rounded-[3rem] border border-indigo-500/30 w-full max-w-2xl shadow-2xl space-y-10 relative overflow-hidden flex flex-col max-h-[90vh]">
              <button onClick={() => { setIsAdminModalOpen(false); setIsEditingExisting(false); }} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors text-2xl">✕</button>
              <div className="text-center space-y-2">
                 <h3 className="text-2xl font-mystic font-black text-indigo-400 tracking-widest uppercase">{isEditingExisting ? 'Admin: 번호 수정' : 'Admin: 당첨번호 등록'}</h3>
                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Lotto History Management</p>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 custom-scroll space-y-12">
                 <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">회차 입력 (Round)</label>
                       <input type="number" value={adminRound} onChange={e => setAdminRound(e.target.value)} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-white font-bold focus:border-indigo-500 outline-none" />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isEditingExisting ? '번호별 수정' : '당첨번호 & 보너스 통합 입력 (예: 10. 20. ...)'}</label>
                       <div className="space-y-4">
                           <div className="flex wrap gap-2 p-3 bg-slate-950/50 border border-slate-800 rounded-2xl min-h-[64px] items-center">
                              {adminNumbers.map((n, i) => n !== '' && (<span key={i} onClick={() => removeNumber(i, 'main')} className="px-4 py-2 bg-indigo-600 rounded-xl text-xs font-black text-white cursor-pointer hover:bg-indigo-500 transition-colors">{n} <span className="opacity-40 ml-1 text-[8px]">✕</span></span>))}
                              {adminBonus !== '' && (<span onClick={() => removeNumber(0, 'bonus')} className="px-4 py-2 bg-amber-600 rounded-xl text-xs font-black text-slate-950 cursor-pointer hover:bg-amber-500 transition-colors">{adminBonus} <span className="opacity-40 ml-1 text-[8px]">B ✕</span></span>)}
                              {(adminNumbers.some(n => n === '') || adminBonus === '') && (
                                <input type="text" value={singleInputStr} onChange={handleSingleInputChange} className="flex-1 bg-transparent border-none outline-none text-white font-bold p-2 text-sm min-w-[80px]" placeholder="숫자 뒤 마침표(.) 입력" />
                              )}
                           </div>
                           <p className="text-[9px] text-slate-600 font-bold italic uppercase px-1">※ 숫자를 치고 마침표(.)를 입력하면 자동으로 칸이 나뉩니다.</p>
                       </div>
                    </div>
                    <button onClick={handleRegisterLotto} className="w-full py-4 bg-indigo-600 text-white font-black rounded-xl uppercase tracking-[0.2em] text-xs shadow-xl hover:bg-indigo-500 transition-all">{isEditingExisting ? '수정 사항 반영' : '번호 등록 및 갱신'}</button>
                 </div>
                 <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">최근 관리</h4>
                    <div className="space-y-3">
                       {lottoHistory.slice(0, 5).map((round) => (
                         <div key={round.round} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-indigo-500/20 transition-all">
                            <span className="text-[11px] font-black text-indigo-400 uppercase w-12">{round.round}회</span>
                            <div className="flex space-x-2">
                               {round.numbers.map(n => <span key={n} className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold">{n}</span>)}
                               <span className="w-7 h-7 rounded-full bg-indigo-900/50 flex items-center justify-center text-[10px] font-bold text-indigo-200">{round.bonus}</span>
                            </div>
                            <div className="flex space-x-2">
                              <button onClick={() => handleEditRound(round)} className="px-4 py-2 bg-white/5 rounded-lg text-[10px] font-black text-slate-400 hover:text-white transition-all">수정</button>
                              <button onClick={() => setDeleteConfirmRound(round.round)} className="px-4 py-2 bg-rose-900/20 rounded-lg text-[10px] font-black text-rose-400 hover:text-white transition-all">삭제</button>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
              <button onClick={() => { setIsAdminModalOpen(false); setIsEditingExisting(false); }} className="w-full py-5 bg-slate-800 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all shrink-0">관리 종료</button>
              {deleteConfirmRound && (
                <div className="absolute inset-0 z-[11000] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
                  <div className="glass p-10 rounded-[3rem] border border-rose-500/30 max-sm w-full text-center space-y-8 shadow-[0_0_50px_rgba(244,63,94,0.2)]">
                    <div className="text-4xl">⚠️</div>
                    <p className="text-sm text-slate-400 leading-relaxed italic">"{deleteConfirmRound}회차 정보를 영구히 소멸시키시겠습니까?"</p>
                    <div className="flex flex-col gap-3">
                      <button onClick={() => handleDeleteRoundAction(deleteConfirmRound)} className="w-full py-4 bg-rose-600 text-white font-black rounded-xl uppercase tracking-widest text-xs">확인</button>
                      <button onClick={() => setDeleteConfirmRound(null)} className="w-full py-4 bg-white/5 text-slate-500 font-black rounded-xl uppercase tracking-widest text-xs">취소</button>
                    </div>
                  </div>
                </div>
              )}
           </div>
        </div>
      )}

      {view === 'square' && <CelestialSquare profile={profile} orb={orb} onUpdatePoints={updatePoints} onUpdateFavorites={updateFavorites} onBack={() => setView('main')} onToast={onToast} />}
      {view === 'profile' && <UserProfilePage profile={profile} orb={orb} archives={archives} onUpdateProfile={onUpdateProfile} onUpdateOrb={onUpdateOrb} onWithdraw={handleWithdrawAction} onBack={() => setView('main')} onToast={onToast} />}
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
        <div className="flex items-center space-x-6">
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
                  <button onClick={() => { setIsAdminModalOpen(true); setShowMenu(false); }} className="w-full p-4 flex items-center space-x-3 rounded-xl hover:bg-amber-600/20 text-amber-100 text-xs font-black uppercase transition-all"><span>🎫</span><span>당첨번호 등록 (Admin)</span></button>
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
              <FortuneOrb orb={orb} onGrow={() => { growOrb(5); addPoints(50); }} />
              <button onClick={() => setShowShop(!showShop)} className="mt-10 px-10 py-4 bg-indigo-500/10 border-2 border-indigo-500/30 rounded-full text-sm font-black text-indigo-200 hover:bg-indigo-500/20 transition-all flex items-center space-x-3 shadow-2xl backdrop-blur-xl"><span>✨</span><span className="tracking-[0.2em] uppercase">신비의 상점</span><span className="bg-indigo-500 text-white px-3 py-1 rounded-full text-[10px] ml-4">{orb.points.toLocaleString()} L</span></button>
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
            <p className="text-3xl font-mystic font-black text-yellow-500 tabular-nums">{orb.points.toLocaleString()} <span className="text-sm font-sans">L</span></p>
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

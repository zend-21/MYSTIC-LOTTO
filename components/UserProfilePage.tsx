import React, { useState, useRef, useEffect, useMemo } from 'react';
import { UserProfile, OrbState, SavedFortune, FortuneResult, AnnualDestiny, ScientificAnalysisResult, ORB_DECORATIONS, CalendarType } from '../types';
import { LegalModal, TermsContent, PrivacyContent } from './LegalDocs';
import KoreanLunarCalendar from 'korean-lunar-calendar';
import { OrbVisual } from './FortuneOrb';
import ModelStatusCard from './admin/ModelStatusCard';
import AdminSanctum from './AdminSanctum';
import { db, auth } from '../services/firebase';
import { collection, query, orderBy, limit, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';

interface ChatCapture {
  id: string;
  savedAt: number;
  roomId?: string;
  roomName: string;
  creatorName: string;
  participants: { uid: string; name: string; uniqueTag: string }[];
  messages: { userId: string; userName: string; message: string; timestamp: number }[];
  isReport?: boolean;
  reportReason?: string;
}

interface Report {
  id: string;
  reportedAt: number;
  reporterName: string;
  reporterTag: string;
  roomName: string;
  roomId: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved';
  isReadByAdmin?: boolean;
  participants: { uid: string; name: string; uniqueTag: string }[];
  messages: { userId: string; userName: string; message: string; timestamp: number }[];
}

interface UserProfilePageProps {
  profile: UserProfile;
  orb: OrbState;
  archives: SavedFortune[];
  onUpdateProfile: (p: UserProfile) => void;
  onUpdateOrb: (o: OrbState) => void;
  onWithdraw: () => void;
  onBack: () => void;
  onToast: (m: string) => void;
  isAdmin?: boolean;
  subAdminConfig?: Record<string, number>;
  onSubAdminConfigChange?: (cfg: Record<string, number>) => void;
  onDeleteArchive: (id: string) => void;
  hasNewReports?: boolean;
  onClearReportsBadge?: () => void;
}

interface CitySuggestion {
  display: string;
  lat: number;
  lon: number;
}

const UserProfilePage: React.FC<UserProfilePageProps> = ({ profile, orb, archives, onUpdateProfile, onUpdateOrb, onWithdraw, onBack, onToast, isAdmin, subAdminConfig = {}, onSubAdminConfigChange = () => {}, onDeleteArchive, hasNewReports = false, onClearReportsBadge }) => {
  const [activeTab, setActiveTab] = useState<'identity' | 'treasury' | 'archives' | 'social' | 'sanctum' | 'admin'>('identity');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [archiveCategory, setArchiveCategory] = useState<'all' | 'divine' | 'annual' | 'scientific'>('all');
  const [selectedArchive, setSelectedArchive] = useState<SavedFortune | null>(null);
  const [confirmDeleteArchiveId, setConfirmDeleteArchiveId] = useState<string | null>(null);
  const [chatCaptures, setChatCaptures] = useState<ChatCapture[]>([]);
  const [expandedCapture, setExpandedCapture] = useState<string | null>(null);
  const [deletingCapture, setDeletingCapture] = useState<string | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressActivatedRef = useRef(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // 갈무리 목록 로드 + 읽음 처리 (Social 탭 진입 시)
  useEffect(() => {
    if (activeTab !== 'social' || !auth.currentUser) return;
    const uid = auth.currentUser.uid;

    // 갈무리 로드
    const q = query(collection(db, "users", uid, "chatCaptures"), orderBy("savedAt", "desc"), limit(30));
    getDocs(q).then(snap => {
      setChatCaptures(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatCapture)));
    }).catch(() => {});

    // 편지함 읽음 처리 (미읽은 항목이 있을 때만)
    if (orb.mailbox?.some(m => !m.isRead)) {
      const readMailbox = orb.mailbox.map(m => ({ ...m, isRead: true }));
      updateDoc(doc(db, 'users', uid), { 'orb.mailbox': readMailbox }).catch(() => {});
      onUpdateOrb({ ...orb, mailbox: readMailbox });
    }

    // 관리자: 신고 목록 로드 + 읽음 처리
    if (isAdmin) {
      getDocs(query(collection(db, 'reports'), orderBy('reportedAt', 'desc'), limit(50)))
        .then(snap => {
          const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() } as Report));
          setReports(loaded);
          // 미읽은 신고 일괄 읽음 처리
          const unread = snap.docs.filter(d => !d.data().isReadByAdmin);
          if (unread.length > 0) {
            const batch = unread.map(d => updateDoc(d.ref, { isReadByAdmin: true }));
            Promise.all(batch).then(() => {
              setReports(prev => prev.map(r => ({ ...r, isReadByAdmin: true })));
              onClearReportsBadge?.();
            }).catch(() => {});
          }
        }).catch(() => {});
    }
  }, [activeTab]);

  // 갈무리 복사 / 다운로드
  const formatCapture = (cap: ChatCapture): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const dt = new Date(cap.savedAt);
    const dateStr = `${dt.getFullYear()}.${pad(dt.getMonth()+1)}.${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    const participants = cap.participants.map(p => `${p.name}${p.uniqueTag ? ` @${p.uniqueTag}` : ''}`).join(', ');
    const sep = '─'.repeat(36);
    const lines = [
      `[나눔방 갈무리]`,
      `대화방 ID: ${cap.roomId || '(알 수 없음)'}`,
      `대화방명: ${cap.roomName}`,
      `저장일시: ${dateStr}`,
      `참여자: ${participants}`,
      sep,
      ...cap.messages.map(m => {
        if (m.userId === 'system' || m.userId === 'local_entry') return `  ∙ ${m.message}`;
        const t = new Date(m.timestamp);
        const time = `${pad(t.getHours())}:${pad(t.getMinutes())}`;
        return `[${time}] ${m.userName}: ${m.message}`;
      }),
      sep,
    ];
    return lines.join('\n');
  };

  const handleCopyCapture = async (cap: ChatCapture) => {
    try {
      await navigator.clipboard.writeText(formatCapture(cap));
      onToast('클립보드에 복사되었습니다.');
    } catch {
      onToast('복사에 실패했습니다.');
    }
  };

  const handleDownloadCapture = (cap: ChatCapture) => {
    const text = formatCapture(cap);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const pad = (n: number) => String(n).padStart(2, '0');
    const dt = new Date(cap.savedAt);
    a.href = url;
    a.download = `갈무리_${cap.roomName}_${dt.getFullYear()}${pad(dt.getMonth()+1)}${pad(dt.getDate())}_${pad(dt.getHours())}${pad(dt.getMinutes())}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const startLongPress = (capId: string) => {
    longPressActivatedRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressActivatedRef.current = true;
      setDeletingCapture(capId);
    }, 600);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleDeleteCapture = async (capId: string) => {
    if (!auth.currentUser) return;
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'chatCaptures', capId));
      setChatCaptures(prev => prev.filter(c => c.id !== capId));
      setDeletingCapture(null);
      onToast('갈무리가 삭제되었습니다.');
    } catch {
      onToast('삭제에 실패했습니다.');
    }
  };

  // 닉네임 수정 상태 (상시 노출)
  const [editNickname, setEditNickname] = useState(orb.nickname || '');
  const [isNickValid, setIsNickValid] = useState<boolean | null>(null);
  const [isCheckingNick, setIsCheckingNick] = useState(false);

  // 상세 정보 수정 모드 상태 (본명 포함)
  const [isEditingBasic, setIsEditingBasic] = useState(false);
  
  // 수정용 내부 상태
  const [editName, setEditName] = useState(profile.name);
  const [editBirthDate, setEditBirthDate] = useState(profile.birthDate);
  const [editGender, setEditGender] = useState(profile.gender);
  const [editCalendarType, setEditCalendarType] = useState(profile.calendarType);
  const [editCity, setEditCity] = useState(profile.birthCity);

  // 편집 폼용 음력 날짜 텍스트
  const editLunarText = useMemo(() => {
    if (!editBirthDate) return null;
    const parts = editBirthDate.split('-');
    if (parts.length !== 3) return null;
    const y = parseInt(parts[0]), m = parseInt(parts[1]), d = parseInt(parts[2]);
    if (!y || !m || !d) return null;
    try {
      const cal = new KoreanLunarCalendar();
      if (editCalendarType === 'solar') {
        if (!cal.setSolarDate(y, m, d)) return null;
        const lunar = cal.getLunarCalendar();
        const inter = lunar.intercalation ? ' (윤달)' : '';
        return `음력 ${lunar.year}.${String(lunar.month).padStart(2, '0')}.${String(lunar.day).padStart(2, '0')}${inter}`;
      } else {
        if (!cal.setLunarDate(y, m, d, profile.isIntercalary ?? false)) return null;
        const solar = cal.getSolarCalendar();
        return `≈ 양력 ${solar.year}.${String(solar.month).padStart(2, '0')}.${String(solar.day).padStart(2, '0')}`;
      }
    } catch { return null; }
  }, [editBirthDate, editCalendarType, profile.isIntercalary]);
  const [selectedCoords, setSelectedCoords] = useState<{lat: number, lon: number} | null>(
    profile.lat && profile.lon ? { lat: profile.lat, lon: profile.lon } : null
  );

  // 시간 상세 상태
  const getInitialTimeParts = () => {
    const [h, m] = profile.birthTime.split(':');
    let hourNum = parseInt(h);
    const ampm = hourNum >= 12 ? '오후' : '오전';
    if (hourNum > 12) hourNum -= 12;
    if (hourNum === 0) hourNum = 12;
    return { 
      h: hourNum.toString().padStart(2, '0'), 
      m, 
      ampm: ampm as '오전' | '오후' 
    };
  };
  const timeParts = getInitialTimeParts();
  const [editHour, setEditHour] = useState(timeParts.h);
  const [editMinute, setEditMinute] = useState(timeParts.m);
  const [editAmPm, setEditAmPm] = useState<'오전' | '오후'>(timeParts.ampm);

  // 도시 검색 관련
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [isSearchingCity, setIsSearchingCity] = useState(false);
  const [showCityList, setShowCityList] = useState(false);
  const debounceRef = useRef<any>(null);

  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);

  // 닉네임 중복 체크
  const checkNickname = () => {
    if (!editNickname.trim()) return;
    setIsCheckingNick(true);
    setTimeout(() => {
      const forbidden = [
        // 관리/운영
        'admin', 'system', '운영자', '관리자', '최고관리자', '부관리자', '운영팀', '개발자', '공식', '공식계정',
        // 신비/직함
        '점성술사', '미스틱가이드', '마스터', '그랜드마스터', '대현자', '연금술사', '방위술사', '행정술사',
        '타로상담사', '타로이스트', '타로마스터', '타로리더',
        '예언자', '신탁자', '점술사', '대사제', '신관', '현자', '마법사', '오라클', '미스틱', '포춘',
        // 신격/종교 사칭
        '신', '하느님', '부처', '붓다', '하나님',
        // AI 사칭
        'ai', 'chatgpt', '클로드', '제미나이', 'gemini', 'claude', '봇', 'bot',
      ];
      // 공백 제거 후 비교 (예: "타로 마스터" → "타로마스터")
      const normalized = editNickname.toLowerCase().replace(/\s/g, '');
      const isForbidden = forbidden.some(f => normalized.includes(f));
      const isValid = (isAdmin || !isForbidden) && editNickname.length >= 2 && editNickname.length < 10;
      setIsNickValid(isValid);
      setIsCheckingNick(false);
      if (isValid) onToast("사용 가능한 신성한 칭호입니다.");
      else onToast("사용할 수 없는 닉네임입니다.");
    }, 800);
  };

  // 도시 검색 API
  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEditCity(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length >= 2) {
      debounceRef.current = setTimeout(async () => {
        setIsSearchingCity(true);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=5&accept-language=ko`, {
            headers: { 'User-Agent': 'MysticLottoApp/1.0' }
          });
          const data = await res.json();
          const mapped = data.map((item: any) => ({
            display: item.display_name,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon)
          }));
          setSuggestions(mapped);
          setShowCityList(mapped.length > 0);
        } catch (err) { console.error(err); }
        finally { setIsSearchingCity(false); }
      }, 600);
    } else {
      setSuggestions([]);
      setShowCityList(false);
    }
  };

  const handleSaveIdentity = () => {
    // 닉네임이 변경되었을 때만 체크 확인
    if (editNickname !== (orb.nickname || '') && isNickValid !== true) {
      onToast("닉네임 중복 체크를 먼저 진행해주세요.");
      return;
    }
    // 출생지 수정 모드에서 좌표 미선택 시 저장 차단
    if (isEditingBasic && !selectedCoords) {
      onToast("출생 도시를 검색 후 목록에서 반드시 선택해 주세요. 좌표가 없으면 점성술 분석의 정확도가 크게 낮아집니다.");
      return;
    }

    let h = parseInt(editHour);
    if (editAmPm === '오후' && h < 12) h += 12;
    if (editAmPm === '오전' && h === 12) h = 0;
    const formattedTime = `${h.toString().padStart(2, '0')}:${editMinute}`;

    onUpdateOrb({ ...orb, nickname: editNickname });
    onUpdateProfile({ 
      ...profile, 
      name: editName, 
      birthCity: editCity, 
      birthDate: editBirthDate,
      birthTime: formattedTime,
      gender: editGender,
      calendarType: editCalendarType,
      lat: selectedCoords?.lat,
      lon: selectedCoords?.lon
    });

    setIsEditingBasic(false);
    onToast("운명 기록이 성공적으로 업데이트되었습니다.");
  };

  const handleWithdraw = () => {
    onWithdraw();
    onToast("당신의 모든 기록이 소멸되었습니다.");
  };

  return (
    <div className="fixed inset-0 z-[5000] bg-[#020617] text-slate-200 flex flex-col animate-in fade-in duration-700">
      {showTermsModal && <LegalModal title="이용약관" subtitle="Terms of Service" onClose={() => setShowTermsModal(false)}><TermsContent /></LegalModal>}
      {showPrivacyModal && <LegalModal title="개인정보처리방침" subtitle="Privacy Policy" onClose={() => setShowPrivacyModal(false)}><PrivacyContent /></LegalModal>}

      {/* 서고 기록 삭제 확인 모달 */}
      {confirmDeleteArchiveId && (
        <div className="fixed inset-0 z-[9500] flex items-center justify-center px-6" onClick={() => setConfirmDeleteArchiveId(null)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
          <div className="relative glass p-10 rounded-[3rem] border border-rose-500/30 w-full max-w-sm space-y-8 shadow-[0_0_80px_rgba(239,68,68,0.15)]" onClick={e => e.stopPropagation()}>
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgb(239,68,68)" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </div>
              <h3 className="text-lg font-black text-white tracking-wider">기록 삭제</h3>
              <p className="text-sm text-slate-400 leading-relaxed">이 운명 기록을 서고에서 영구 삭제합니다.<br/><span className="text-rose-400 font-bold">삭제된 기록은 복구할 수 없습니다.</span></p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteArchiveId(null)} className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl text-slate-300 font-black text-sm hover:bg-white/10 transition-all">취소</button>
              <button onClick={() => { onDeleteArchive(confirmDeleteArchiveId); setSelectedArchive(null); setConfirmDeleteArchiveId(null); }} className="flex-1 py-4 bg-rose-600/80 border border-rose-500/50 rounded-2xl text-white font-black text-sm hover:bg-rose-500 transition-all">삭제</button>
            </div>
          </div>
        </div>
      )}
      <header className="relative z-10 border-b border-white/5 px-8 py-6 flex justify-between items-center shrink-0">
        <div className="absolute inset-0 bg-white/[0.02] backdrop-blur-3xl -z-10 pointer-events-none" />
        <div className="flex items-center space-x-3 sm:space-x-6">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div>
            <h2 className="text-base sm:text-xl font-mystic font-black text-white tracking-widest leading-none uppercase">Private Sanctum</h2>
            <p className="text-[9px] text-indigo-400 font-black uppercase tracking-[0.4em] mt-0.5 sm:mt-1.5 inline-flex items-center gap-1.5">
              {orb.nickname || profile.name} 님의 전용 영역
              {(orb.mailbox?.some(m => !m.isRead) || (isAdmin && hasNewReports)) && (
                <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
           <div className="text-right sm:self-auto self-end pb-0.5">
              <p className="hidden sm:block text-[9px] text-slate-500 font-black uppercase">Resonance Level</p>
              <p className="text-xs font-normal sm:text-sm sm:font-mystic sm:font-black text-white/80 sm:text-white">LV.{orb.level}</p>
           </div>
           <OrbVisual level={orb.level} className="w-10 h-10 border border-white/10 shadow-lg shadow-indigo-500/10" overlayAnimation={(ORB_DECORATIONS.find(d => d.id === orb.activeDecorationId) || ORB_DECORATIONS[0]).overlayAnimation} />
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex relative">
        {/* 모바일 백드롭: 사이드바 열렸을 때만 */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />
        )}
        <aside className={`
          relative z-50
          ${sidebarOpen ? 'w-52 -mr-[152px]' : 'w-14'}
          transition-all duration-300 border-r border-white/5 glass flex flex-col pt-4 pb-6 space-y-1 shrink-0
        `}>
           {/* 토글 버튼 */}
           <button onClick={() => setSidebarOpen(!sidebarOpen)} className="self-end mr-3 mb-3 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all shrink-0">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
               {sidebarOpen ? <path d="M15 18l-6-6 6-6"/> : <path d="M9 18l6-6-6-6"/>}
             </svg>
           </button>

           {(() => {
             const hasSocialBadge = orb.mailbox?.some(m => !m.isRead) || (isAdmin && hasNewReports);
             return [
               { id: 'identity', label: 'Identity', sub: '정체성 및 기록', icon: '🆔' },
               { id: 'treasury', label: 'Inventory', sub: '개인 인벤토리', icon: '💎' },
               { id: 'archives', label: 'Archives', sub: '리포트 서고', icon: '📄' },
               { id: 'social', label: isAdmin ? '문의 및 신고' : 'Social', sub: isAdmin ? '신고·문의 관리' : '선물 및 편지함', icon: isAdmin ? '🚨' : '📧' },
               { id: 'sanctum', label: 'Sanctum', sub: '개인 성소 꾸미기', icon: '🏛️' },
             ].map(tab => (
               <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); if (window.innerWidth < 640) setSidebarOpen(false); }}
                className={`w-full py-4 flex items-center transition-all group ${sidebarOpen ? 'px-6 space-x-4' : 'justify-center'} ${activeTab === tab.id ? 'bg-indigo-600/10 border-r-2 border-indigo-500' : 'hover:bg-white/5 opacity-40 hover:opacity-100'}`}
               >
                 <span className="relative text-xl shrink-0">
                   {tab.icon}
                   {tab.id === 'social' && hasSocialBadge && (
                     <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                   )}
                 </span>
                 {sidebarOpen && (
                   <div className="flex flex-col text-left overflow-hidden">
                     <span className={`text-[11px] font-black uppercase tracking-widest truncate ${activeTab === tab.id ? 'text-indigo-400' : 'text-slate-400'}`}>{tab.label}</span>
                     <span className="text-[9px] text-slate-600 font-bold truncate">{tab.sub}</span>
                   </div>
                 )}
               </button>
             ));
           })()}
           {isAdmin && (
             <button
               onClick={() => { setActiveTab('admin'); if (window.innerWidth < 640) setSidebarOpen(false); }}
               className={`w-full py-4 flex items-center transition-all ${sidebarOpen ? 'px-6 space-x-4' : 'justify-center'} ${activeTab === 'admin' ? 'bg-amber-500/10 border-r-2 border-amber-400' : 'hover:bg-white/5 opacity-40 hover:opacity-100'}`}
             >
               <span className="text-xl shrink-0">👑</span>
               {sidebarOpen && (
                 <div className="flex flex-col text-left overflow-hidden">
                   <span className={`text-[11px] font-black uppercase tracking-widest truncate ${activeTab === 'admin' ? 'text-amber-400' : 'text-slate-400'}`}>Admin</span>
                   <span className="text-[9px] text-slate-600 font-bold truncate">최고관리자 구역</span>
                 </div>
               )}
             </button>
           )}
           <div className="flex-1"></div>
           <button onClick={() => setShowWithdrawConfirm(true)} className={`w-full py-5 flex items-center opacity-50 sm:opacity-20 hover:opacity-100 hover:bg-rose-900/20 transition-all text-rose-500 ${sidebarOpen ? 'px-6 space-x-3' : 'justify-center'}`}>
             <span className="text-sm shrink-0">🚪</span>
             {sidebarOpen && <span className="text-[10px] font-black uppercase tracking-widest">Withdrawal</span>}
           </button>
        </aside>

        <main className="flex-1 overflow-y-auto px-[14px] py-6 sm:p-6 md:p-12 custom-scroll bg-[radial-gradient(circle_at_50%_0%,_rgba(30,58,138,0.1),_transparent_70%)]">
           <div className="max-w-4xl mx-auto space-y-12 pb-24">
              
              {activeTab === 'identity' && (
                <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
                   {isAdmin && <ModelStatusCard />}
                   <div className="space-y-2">
                     <h3 className="text-2xl font-black text-white">Divine Identity</h3>
                     <p className="text-xs text-slate-500 italic">"앱 내 활동용 칭호와 당신의 운명 정보를 정의하십시오."</p>
                   </div>

                   <div className="glass p-10 rounded-[3rem] border border-white/5 space-y-12 shadow-2xl">
                      {/* 고유 아이디 (읽기 전용) */}
                      {orb.uniqueTag && (
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest px-1">Unique ID (고유 식별자)</label>
                          <div className="flex items-center justify-between bg-slate-950/70 border border-slate-800 rounded-2xl px-5 py-4">
                            <span className="font-mono text-lg font-black text-white tracking-widest">{orb.uniqueTag}</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(orb.uniqueTag || '');
                                onToast("고유 ID가 복사되었습니다.");
                              }}
                              className="text-[9px] font-black text-indigo-400 uppercase tracking-widest border border-indigo-500/30 rounded-lg px-2 py-1 hover:bg-indigo-500/10 transition-colors active:scale-95"
                            >복사</button>
                          </div>
                        </div>
                      )}

                      {/* 상시 노출 섹션: 닉네임 */}
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest px-1">Sacred Nickname (칭호/닉네임)</label>
                        <div className="flex space-x-4">
                           <div className="relative flex-1">
                              <input 
                                type="text" 
                                value={editNickname}
                                onChange={e => { if (e.target.value.length < 10) { setEditNickname(e.target.value); setIsNickValid(null); } }}
                                maxLength={9}
                                className={`w-full bg-slate-950/50 border rounded-2xl p-4 text-white font-bold outline-none transition-all ${isNickValid === true ? 'border-emerald-500/50' : isNickValid === false ? 'border-rose-500/50' : 'border-slate-800 focus:border-indigo-500'}`}
                                placeholder="닉네임 (2~9자)"
                              />
                              {isCheckingNick ? (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                              ) : (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                  <span className={`text-[9px] font-black ${editNickname.length >= 9 ? 'text-rose-400' : 'text-slate-600'}`}>{editNickname.length}/9</span>
                                </div>
                              )}
                           </div>
                           <button 
                            onClick={checkNickname}
                            disabled={!editNickname || editNickname === (orb.nickname || '')}
                            className="px-4 sm:px-8 py-2 sm:py-0 bg-slate-800 text-white text-[9px] sm:text-[10px] font-black rounded-xl sm:rounded-2xl uppercase tracking-tight sm:tracking-widest hover:bg-slate-700 disabled:opacity-30 transition-all shrink-0"
                           >
                            <span className="sm:hidden">중복체크</span>
                            <span className="hidden sm:inline">중복 체크</span>
                           </button>
                        </div>
                        {isNickValid === true && <p className="text-[9px] text-emerald-400 font-bold px-1 uppercase tracking-widest">사용 가능한 신성한 칭호입니다.</p>}
                        {isNickValid === false && <p className="text-[9px] text-rose-400 font-bold px-1 uppercase tracking-widest">이미 우주에 존재하는 칭호이거나 금지된 단어입니다.</p>}
                      </div>

                      {/* 수정 모드 진입 버튼 */}
                      <div className="flex justify-center">
                        <button 
                          onClick={() => setIsEditingBasic(!isEditingBasic)}
                          className={`px-10 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${isEditingBasic ? 'bg-rose-500/10 border-rose-500/40 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.1)]' : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500 hover:text-white'}`}
                        >
                          {isEditingBasic ? '취소 및 수정 닫기' : '본명 및 출생 정보 수정'}
                        </button>
                      </div>

                      {/* 조건부 수정 섹션: 본명, 도시, 날짜 등 */}
                      {isEditingBasic && (
                        <div className="space-y-10 pt-10 border-t border-white/5 animate-in slide-in-from-top-4 duration-500">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="space-y-4">
                                 <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest px-1">Full Name (본명 - 운세 분석 필수)</label>
                                 <input 
                                   type="text" 
                                   value={editName} 
                                   onChange={e => setEditName(e.target.value)} 
                                   className="w-full bg-slate-950/50 border border-slate-800 focus:border-indigo-500 rounded-2xl p-4 text-white font-bold outline-none transition-all shadow-inner" 
                                   placeholder="성함을 정확히 입력하세요"
                                 />
                              </div>
                              <div className="space-y-4">
                                 <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest px-1">Birth Date (생년월일)</label>
                                 <input
                                   type="date"
                                   value={editBirthDate}
                                   onChange={e => setEditBirthDate(e.target.value)}
                                   className="w-full bg-slate-950/50 border border-slate-800 focus:border-indigo-500 rounded-2xl p-4 text-white font-bold outline-none transition-all shadow-inner"
                                 />
                                 {editLunarText && (
                                   <p className="text-[10px] text-yellow-400 font-bold px-1">{editLunarText}</p>
                                 )}
                              </div>
                              <div className="space-y-4">
                                 <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest px-1">Birth Time (태어난 시간)</label>
                                 <div className="flex space-x-2">
                                    <select 
                                      value={editAmPm} 
                                      onChange={e => setEditAmPm(e.target.value as any)}
                                      className="flex-1 bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-indigo-500"
                                    >
                                      <option value="오전">오전</option>
                                      <option value="오후">오후</option>
                                    </select>
                                    <input 
                                      type="text" 
                                      value={editHour} 
                                      onChange={e => setEditHour(e.target.value.slice(0, 2))}
                                      className="w-16 bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-white font-bold text-center outline-none focus:border-indigo-500" 
                                      placeholder="HH" 
                                    />
                                    <input 
                                      type="text" 
                                      value={editMinute} 
                                      onChange={e => setEditMinute(e.target.value.slice(0, 2))}
                                      className="w-16 bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-white font-bold text-center outline-none focus:border-indigo-500" 
                                      placeholder="MM" 
                                    />
                                 </div>
                              </div>
                              <div className="space-y-4">
                                 <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest px-1">Energy Config (성별/력법)</label>
                                 <div className="flex space-x-2">
                                    <button 
                                      onClick={() => setEditGender(editGender === 'M' ? 'F' : 'M')}
                                      className="flex-1 p-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 transition-all text-xs font-black uppercase hover:bg-indigo-500 hover:text-white shadow-inner"
                                    >
                                      {editGender === 'M' ? '남성 (陽)' : '여성 (陰)'}
                                    </button>
                                    <button 
                                      onClick={() => setEditCalendarType(editCalendarType === 'solar' ? 'lunar' : 'solar')}
                                      className="flex-1 p-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 transition-all text-xs font-black uppercase hover:bg-indigo-500 hover:text-white shadow-inner"
                                    >
                                      {editCalendarType === 'solar' ? '양력' : '음력'}
                                    </button>
                                 </div>
                              </div>
                           </div>

                           <div className="space-y-4 relative">
                              <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest px-1">Birth Manifestation City (출생 도시 검색)</label>
                              <div className="relative">
                                <input 
                                  type="text" 
                                  value={editCity} 
                                  onChange={handleCityChange}
                                  className="w-full bg-slate-950/50 border border-slate-800 focus:border-indigo-500 rounded-2xl p-4 text-white font-bold outline-none transition-all shadow-inner" 
                                  placeholder="도시명을 입력하여 좌표를 갱신하세요..."
                                />
                                {isSearchingCity && (
                                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                  </div>
                                )}
                              </div>
                              {showCityList && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-indigo-500/30 rounded-2xl shadow-2xl z-[100] max-h-56 overflow-y-auto custom-scroll">
                                  {suggestions.map((city, idx) => (
                                    <button key={idx} type="button" onClick={() => { setEditCity(city.display); setSelectedCoords({lat: city.lat, lon: city.lon}); setShowCityList(false); }} className="w-full text-left p-4 hover:bg-indigo-600/20 text-xs font-bold text-slate-300 border-b border-white/5 last:border-0 transition-colors">
                                      <div className="flex flex-col">
                                        <span>{city.display}</span>
                                        <span className="text-[8px] text-slate-500 mt-0.5 uppercase">LAT: {city.lat.toFixed(2)} / LON: {city.lon.toFixed(2)}</span>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                              <div className="flex flex-col space-y-1">
                                <p className={`text-[9px] px-1 uppercase tracking-widest mt-1 font-bold ${selectedCoords ? 'text-emerald-500' : 'text-rose-500'}`}>
                                동기화 좌표: {selectedCoords ? `✓ LAT ${selectedCoords.lat.toFixed(4)}, LON ${selectedCoords.lon.toFixed(4)}` : '✗ 미선택 — 목록에서 도시를 선택해야 합니다'}
                              </p>
                                <p className="text-[9px] text-yellow-500 font-bold px-1">수정할 도시가 표시되지 않을 경우, 마지막 글자를 지우고 다시 입력해 보세요</p>
                              </div>
                           </div>
                        </div>
                      )}

                      <div className="pt-6">
                         <button 
                          onClick={handleSaveIdentity} 
                          className="w-full py-3 sm:py-6 bg-indigo-600 text-white font-black rounded-2xl shadow-2xl hover:bg-indigo-500 transition-all uppercase tracking-[0.2em] text-xs sm:text-sm border-t border-white/20"
                         >
                          <span className="sm:hidden">운명 기록 최종 갱신<br />(Save Records)</span>
                          <span className="hidden sm:inline">운명 기록 최종 갱신 (Save Records)</span>
                         </button>
                      </div>
                   </div>
                   {/* 약관 링크 */}
                   <div className="pt-4 border-t border-white/5 flex items-center justify-center space-x-6">
                     <button onClick={() => setShowTermsModal(true)} className="text-[11px] text-slate-500 hover:text-slate-300 underline underline-offset-2 transition-colors">이용약관</button>
                     <span className="text-slate-700 text-xs">|</span>
                     <button onClick={() => setShowPrivacyModal(true)} className="text-[11px] text-slate-500 hover:text-slate-300 underline underline-offset-2 transition-colors">개인정보처리방침</button>
                   </div>
                </div>
              )}

              {activeTab === 'treasury' && (
                <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
                   <section className="space-y-6">
                      <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center space-x-3"><span>💎</span><span>개인 인벤토리</span></h4>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="glass p-5 rounded-2xl border border-white/5 flex flex-col items-center justify-center space-y-2">
                            <span className="text-2xl">💳</span>
                            <p className="text-[9px] font-black text-slate-400 uppercase">Golden Card</p>
                            <span className={`text-[10px] font-bold ${orb.hasGoldenCard ? 'text-yellow-500' : 'text-slate-700'}`}>{orb.hasGoldenCard ? 'OWNED' : 'NOT OWNED'}</span>
                         </div>
                         <div className="glass p-5 rounded-2xl border border-white/5 flex flex-col items-center justify-center space-y-2">
                            <span className="text-2xl">✨</span>
                            <p className="text-[9px] font-black text-slate-400 uppercase">Auras</p>
                            <span className="text-[10px] font-bold text-indigo-400">{orb.purchasedDecorationIds.length} OWNED</span>
                         </div>
                      </div>
                   </section>
                   <section className="space-y-6">
                      <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center space-x-3"><span>💰</span><span>구매 내역 (History)</span></h4>
                      <div className="glass rounded-[2rem] border border-white/5 overflow-hidden">
                         {orb.purchaseHistory && orb.purchaseHistory.length > 0 ? (
                           <table className="w-full text-left text-[11px]">
                              <thead className="bg-white/5 text-slate-500 uppercase font-black">
                                 <tr>
                                    <th className="p-4">Item Name</th>
                                    <th className="p-4">Price</th>
                                    <th className="p-4">Date</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                 {orb.purchaseHistory.map(p => (
                                   <tr key={p.id} className="hover:bg-white/5 transition-colors">
                                      <td className="p-4 font-bold text-slate-300">{p.itemName}</td>
                                      <td className="p-4 font-black text-yellow-500">{p.price.toLocaleString()} L</td>
                                      <td className="p-4 text-slate-500">{new Date(p.timestamp).toLocaleDateString()}</td>
                                   </tr>
                                 ))}
                              </tbody>
                           </table>
                         ) : (
                           <div className="p-10 text-center text-slate-600 text-[10px] font-black uppercase tracking-widest">No Purchase History</div>
                         )}
                      </div>
                   </section>

                   {/* 화폐 안내 */}
                   <section className="space-y-4">
                      <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center space-x-3"><span>📖</span><span>화폐 안내</span></h4>
                      {/* 나디르 */}
                      <div className="glass rounded-2xl border border-white/5 overflow-hidden">
                        <div className="flex items-center space-x-2 px-5 py-3 border-b border-white/5 bg-white/[0.02]">
                          <span>💎</span>
                          <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">나디르 (Nadir) — 충전 화폐</p>
                        </div>
                        <div className="p-5 space-y-2 text-[12px] text-slate-300 leading-relaxed">
                          <p>• 현금으로 직접 충전하는 기본 화폐입니다.</p>
                          <p>• 봉헌 제단에서 사용 시 확률에 따라 <span className="text-amber-400 font-bold">최대 10배 루멘</span>으로 전환됩니다.</p>
                          <p>• 디지털 재화 특성상 사용함으로써 상품 가치가 훼손되므로 <span className="text-rose-400 font-bold">취소 및 환불이 불가</span>합니다.</p>
                        </div>
                      </div>
                      {/* 루멘 */}
                      <div className="glass rounded-2xl border border-white/5 overflow-hidden">
                        <div className="flex items-center space-x-2 px-5 py-3 border-b border-white/5 bg-white/[0.02]">
                          <span>✨</span>
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">루멘 (Lumen) — 활동 화폐</p>
                        </div>
                        <div className="p-5 space-y-2 text-[12px] text-slate-300 leading-relaxed">
                          <p>• 봉헌·출석·활동을 통해 획득하는 앱 내 화폐입니다.</p>
                          <p>• 천기누설·천명수·지성분석 등 <span className="text-indigo-400 font-bold">모든 콘텐츠를 루멘으로 이용</span>합니다.</p>
                          <p>• 나디르·현금으로 역환전 불가, <span className="text-rose-400 font-bold">환불 불가</span>합니다.</p>
                          <p>• 회원 탈퇴 시 잔여 루멘은 소멸됩니다.</p>
                        </div>
                      </div>
                      {/* 루멘 획득 방법 */}
                      <div className="glass rounded-2xl border border-white/5 overflow-hidden">
                        <div className="flex items-center space-x-2 px-5 py-3 border-b border-white/5 bg-white/[0.02]">
                          <span>💡</span>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">루멘 획득 방법</p>
                        </div>
                        <div className="divide-y divide-white/5">
                          {[
                            { icon: '🏛️', title: '봉헌 제단', desc: '나디르 봉헌 시 1배~10배 루멘 보상 (레벨↑ = 고배율 확률↑)', badge: null },
                            { icon: '📅', title: '매일 방문', desc: '앱 방문 1회 시 +100 루멘 (자정 기준 갱신)', badge: null },
                            { icon: '📺', title: '광고 시청', desc: '+300 루멘/편, 하루 최대 5회 (1,500 루멘/일)', badge: '준비 중' },
                            { icon: '🔮', title: '구슬 수련', desc: '탭 시 EXP 획득 → 레벨 성장, 하루 최대 +0.5레벨', badge: null },
                            { icon: '📝', title: '회람판 글 작성', desc: '+0.1레벨/편, 하루 최대 5편 (+0.5레벨/일)', badge: null },
                            { icon: '👍', title: '공명(좋아요) 달성', desc: '내 글이 공명 10개 단위 달성 시 +0.1레벨 (자기 공명 제외)', badge: null },
                          ].map((item, i) => (
                            <div key={i} className="flex items-start space-x-3 px-5 py-3">
                              <span className="text-base shrink-0 mt-0.5">{item.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center flex-wrap gap-2 mb-0.5">
                                  <p className="text-[11px] font-black text-white">{item.title}</p>
                                  {item.badge && <span className="text-[8px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">{item.badge}</span>}
                                </div>
                                <p className="text-[10px] text-slate-500 leading-relaxed">{item.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                   </section>
                </div>
              )}

              {activeTab === 'archives' && (() => {
                const filtered = archiveCategory === 'all' ? archives : archives.filter(a => a.type === archiveCategory);
                const typeLabel: Record<string, string> = { divine: '🔮 천기누설', annual: '⭐ 천명수', scientific: '🔬 지성분석' };
                const typeBg: Record<string, string> = { divine: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', annual: 'bg-amber-500/20 text-amber-300 border-amber-500/30', scientific: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' };
                const getMiniNums = (a: SavedFortune): number[] => {
                  const d = a.data as any;
                  return (d.luckyNumbers || d.numbers || []);
                };
                const getCoreNums = (a: SavedFortune): number[] => {
                  const d = a.data as any;
                  return d.coreNumbers || [];
                };
                return (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                    {/* 카테고리 필터 */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
                      {(['all', 'divine', 'annual', 'scientific'] as const).map(cat => (
                        <button key={cat} onClick={() => setArchiveCategory(cat)}
                          className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border shrink-0 ${archiveCategory === cat ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-white/5 text-slate-500 border-white/10 hover:text-slate-300'}`}>
                          {cat === 'all' ? '전체' : typeLabel[cat]}
                        </button>
                      ))}
                    </div>

                    {/* 기록 목록 */}
                    {filtered.length === 0 ? (
                      <div className="text-center py-20 text-slate-600 text-xs font-black uppercase tracking-widest">기록 없음</div>
                    ) : (
                      <div className="space-y-2">
                        {filtered.map(item => {
                          const miniNums = getMiniNums(item);
                          const coreNums = getCoreNums(item);
                          const dt = new Date(item.timestamp);
                          const dateStr = `${dt.getFullYear()}.${String(dt.getMonth()+1).padStart(2,'0')}.${String(dt.getDate()).padStart(2,'0')} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
                          return (
                            <div key={item.id} onClick={() => setSelectedArchive(item)}
                              className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer group">
                              {/* 왼쪽: 모바일 2줄 / PC 1줄 */}
                              <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 min-w-0">
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className={`text-[10px] font-black px-2 py-1 rounded-lg border shrink-0 ${typeBg[item.type]}`}>{typeLabel[item.type]}</span>
                                  <span className="text-[11px] text-slate-500 font-bold shrink-0">{dateStr}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {miniNums.map((n, i) => (
                                    <div key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shadow ${coreNums.includes(n) ? 'bg-gradient-to-br from-amber-300 to-amber-600 text-slate-950' : 'bg-slate-700 text-white'}`}>{n}</div>
                                  ))}
                                </div>
                              </div>
                              {/* 오른쪽: 삭제 버튼 — 항상 세로 중앙 */}
                              <button onClick={e => { e.stopPropagation(); setConfirmDeleteArchiveId(item.id); }}
                                className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-all text-base shrink-0">🗑️</button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {activeTab === 'social' && (
                <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
                   <section className="space-y-6">
                      <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center space-x-3"><span>📧</span><span>신비의 편지함</span></h4>
                      <div className="space-y-3">
                         {orb.mailbox && orb.mailbox.length > 0 ? (
                           orb.mailbox.map(mail => (
                             <div key={mail.id} className={`p-6 rounded-2xl border transition-all ${mail.isRead ? 'bg-white/5 border-white/5 opacity-50' : 'bg-indigo-500/10 border-indigo-500/30'}`}>
                                <div className="flex justify-between items-start mb-2">
                                   <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                                     {!mail.isRead && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />}
                                     From: {mail.sender}
                                   </p>
                                   <span className="text-[9px] text-slate-600">{new Date(mail.timestamp).toLocaleDateString()}</span>
                                </div>
                                <h5 className="text-sm font-black text-white mb-1">{mail.title}</h5>
                                <p className="text-xs text-slate-400 leading-relaxed">{mail.content}</p>
                             </div>
                           ))
                         ) : (
                           <div className="glass p-10 rounded-[2.5rem] border border-dashed border-white/10 text-center">
                              <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">평온합니다. 새로운 편지가 없습니다.</p>
                           </div>
                         )}
                      </div>
                   </section>
                   <section className="space-y-6">
                      <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center space-x-3"><span>🎁</span><span>루멘 전수 내역</span></h4>
                      <div className="glass rounded-[2rem] border border-white/5 overflow-hidden">
                         {orb.giftHistory && orb.giftHistory.length > 0 ? (
                            <div className="divide-y divide-white/5">
                               {orb.giftHistory.map(g => (
                                 <div key={g.id} className="p-5 flex justify-between items-center hover:bg-white/5 transition-all">
                                    <div className="flex items-center space-x-4">
                                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm ${g.type === 'received' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                          {g.type === 'received' ? '↓' : '↑'}
                                       </div>
                                       <div>
                                          <p className="text-[10px] font-black text-slate-500 uppercase">{g.type === 'received' ? 'From' : 'To'}: {g.targetName}</p>
                                          <p className="text-[9px] text-slate-600">{new Date(g.timestamp).toLocaleString()}</p>
                                       </div>
                                    </div>
                                    <p className={`text-sm font-black ${g.type === 'received' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                       {g.type === 'received' ? '+' : '-'}{g.amount.toLocaleString()} L
                                    </p>
                                 </div>
                               ))}
                            </div>
                         ) : (
                           <div className="p-10 text-center text-slate-600 text-[10px] font-black uppercase tracking-widest">No Gift History</div>
                         )}
                      </div>
                   </section>

                   <section className="space-y-6">
                      <div className="flex flex-col space-y-1">
                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center space-x-3"><span>🗂️</span><span>대화방 갈무리</span></h4>
                        <p className="text-[10px] text-slate-600 font-medium pl-7">목록을 길게 눌러 삭제할 수 있습니다.</p>
                      </div>
                      {chatCaptures.length > 0 ? (
                        <div className="space-y-3">
                          {chatCaptures.map(cap => {
                            const isDeleting = deletingCapture === cap.id;
                            return (
                            <div key={cap.id} className={`glass rounded-[2rem] border overflow-hidden transition-colors ${isDeleting ? 'border-rose-500/40 bg-rose-500/5' : 'border-white/5'}`}>
                              <div className="p-5 flex items-center gap-3">
                                <button
                                  className="flex-1 text-left select-none"
                                  onMouseDown={() => startLongPress(cap.id)}
                                  onMouseUp={cancelLongPress}
                                  onMouseLeave={cancelLongPress}
                                  onTouchStart={() => startLongPress(cap.id)}
                                  onTouchEnd={cancelLongPress}
                                  onClick={() => {
                                    if (longPressActivatedRef.current) { longPressActivatedRef.current = false; return; }
                                    if (isDeleting) { setDeletingCapture(null); return; }
                                    setExpandedCapture(expandedCapture === cap.id ? null : cap.id);
                                  }}
                                >
                                  <p className={`text-sm font-black transition-colors ${isDeleting ? 'text-rose-300' : 'text-white'}`}>
                                    {cap.roomName}{cap.roomId && <span className="text-[10px] font-mono text-slate-600 ml-1.5">[{cap.roomId}]</span>}
                                  </p>
                                  <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                                    {new Date(cap.savedAt).toLocaleString()} · {cap.participants.length}명 · {cap.messages.length}개 메시지
                                  </p>
                                </button>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {isDeleting ? (
                                    <>
                                      <button
                                        onClick={() => handleDeleteCapture(cap.id)}
                                        className="px-3 h-8 bg-rose-600 hover:bg-rose-500 rounded-xl flex items-center gap-1.5 text-white text-[11px] font-black transition-colors"
                                      >
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                                        </svg>
                                        삭제
                                      </button>
                                      <button
                                        onClick={() => setDeletingCapture(null)}
                                        className="px-3 h-8 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors text-[11px] font-black"
                                      >취소</button>
                                    </>
                                  ) : (
                                    <>
                                      {/* 복사 */}
                                      <button
                                        onClick={() => handleCopyCapture(cap)}
                                        className="w-8 h-8 bg-white/5 hover:bg-indigo-600/30 rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-300 transition-colors"
                                        title="클립보드에 복사"
                                      >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                        </svg>
                                      </button>
                                      {/* 다운로드 */}
                                      <button
                                        onClick={() => handleDownloadCapture(cap)}
                                        className="w-8 h-8 bg-white/5 hover:bg-emerald-600/30 rounded-xl flex items-center justify-center text-slate-400 hover:text-emerald-300 transition-colors"
                                        title="텍스트 파일로 저장"
                                      >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                                        </svg>
                                      </button>
                                      {/* 펼치기/접기 */}
                                      <button
                                        onClick={() => setExpandedCapture(expandedCapture === cap.id ? null : cap.id)}
                                        className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white transition-colors text-sm"
                                      >
                                        {expandedCapture === cap.id ? '▲' : '▼'}
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                              {expandedCapture === cap.id && (
                                <div className="border-t border-white/5">
                                  {/* 참여자 목록 */}
                                  <div className="px-5 py-3 bg-white/[0.02] border-b border-white/5">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">참여자</p>
                                    <div className="flex flex-wrap gap-2">
                                      {cap.participants.map(p => (
                                        <span key={p.uid} className="inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-1 rounded-lg">
                                          <span>{p.name}</span>
                                          {p.uid === cap.participants[0]?.uid && <span className="ml-0.5">👑</span>}
                                          {p.uniqueTag && (
                                            <button
                                              onClick={() => {
                                                navigator.clipboard.writeText(p.uniqueTag).then(() => onToast(`@${p.uniqueTag} 복사됨`)).catch(() => {});
                                              }}
                                              className="text-indigo-400/70 hover:text-indigo-300 transition-colors active:scale-95"
                                              title="탭하여 아이디 복사"
                                            >(@{p.uniqueTag})</button>
                                          )}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  {/* 메시지 목록 */}
                                  <div className="max-h-60 overflow-y-auto custom-scroll p-4 space-y-2">
                                    {cap.messages.map((m, i) => (
                                      <div key={i} className={`text-xs ${m.userId === 'system' ? 'text-center text-indigo-400/60 italic' : ''}`}>
                                        {m.userId !== 'system' && (
                                          <span className="font-black text-slate-500 mr-2">{m.userName}</span>
                                        )}
                                        <span className="text-slate-300">{m.message}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="glass p-10 rounded-[2.5rem] border border-dashed border-white/10 text-center">
                          <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">저장된 갈무리가 없습니다.</p>
                        </div>
                      )}
                   </section>

                   {/* 관리자 전용: 신고 접수 목록 */}
                   {isAdmin && (
                     <section className="space-y-4">
                       <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center space-x-3"><span>🚨</span><span>신고 접수 목록</span></h4>
                       {reports.length > 0 ? (
                         <div className="space-y-3">
                           {reports.map(rpt => {
                             const isExpanded = expandedReport === rpt.id;
                             const statusBadge = rpt.status === 'pending' ? { icon: '🔴', label: 'pending', cls: 'text-rose-400' }
                               : rpt.status === 'reviewed' ? { icon: '🟡', label: 'reviewed', cls: 'text-yellow-400' }
                               : { icon: '🟢', label: 'resolved', cls: 'text-emerald-400' };
                             return (
                               <div key={rpt.id} className={`glass rounded-[2rem] overflow-hidden border transition-colors ${!rpt.isReadByAdmin ? 'border-rose-500/20' : 'border-white/5'}`}>
                                 <button
                                   className="w-full p-5 text-left flex items-start gap-3"
                                   onClick={() => setExpandedReport(isExpanded ? null : rpt.id)}
                                 >
                                   <div className="flex-1 min-w-0">
                                     <p className="text-sm font-black text-white flex items-center gap-1.5 flex-wrap">
                                       {!rpt.isReadByAdmin && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />}
                                       {rpt.roomName}<span className="text-[10px] font-mono text-slate-600">[{rpt.roomId}]</span>
                                     </p>
                                     <p className="text-[10px] text-slate-500 font-bold mt-1">
                                       신고자: {rpt.reporterName}{rpt.reporterTag ? ` (@${rpt.reporterTag})` : ''} · 사유: <span className="text-rose-400">{rpt.reason}</span>
                                     </p>
                                     <p className="text-[9px] text-slate-600 mt-0.5">
                                       {rpt.reportedAt ? new Date(rpt.reportedAt).toLocaleString() : ''}
                                     </p>
                                   </div>
                                   <span className={`text-[10px] font-black shrink-0 ${statusBadge.cls}`}>{statusBadge.icon} {statusBadge.label}</span>
                                 </button>
                                 {isExpanded && (
                                   <div className="border-t border-white/5">
                                     <div className="px-5 py-3 bg-white/[0.02] border-b border-white/5">
                                       <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">참여자</p>
                                       <div className="flex flex-wrap gap-2">
                                         {rpt.participants.map(p => (
                                           <span key={p.uid} className="text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-1 rounded-lg">
                                             {p.name}{p.uniqueTag ? ` (@${p.uniqueTag})` : ''}
                                           </span>
                                         ))}
                                       </div>
                                     </div>
                                     <div className="max-h-60 overflow-y-auto custom-scroll p-4 space-y-2">
                                       {rpt.messages.map((m, i) => (
                                         <div key={i} className={`text-xs ${m.userId === 'system' ? 'text-center text-indigo-400/60 italic' : ''}`}>
                                           {m.userId !== 'system' && <span className="font-black text-slate-500 mr-2">{m.userName}</span>}
                                           <span className="text-slate-300">{m.message}</span>
                                         </div>
                                       ))}
                                     </div>
                                     <div className="px-5 py-3 flex flex-wrap gap-2 border-t border-white/5">
                                       <button
                                         onClick={() => updateDoc(doc(db, 'reports', rpt.id), { status: 'reviewed' }).then(() => setReports(prev => prev.map(r => r.id === rpt.id ? { ...r, status: 'reviewed' } : r))).catch(() => {})}
                                         className="px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-[10px] font-black rounded-xl hover:bg-yellow-500/30 transition-all"
                                       >🟡 검토중</button>
                                       <button
                                         onClick={() => updateDoc(doc(db, 'reports', rpt.id), { status: 'resolved' }).then(() => setReports(prev => prev.map(r => r.id === rpt.id ? { ...r, status: 'resolved' } : r))).catch(() => {})}
                                         className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-black rounded-xl hover:bg-emerald-500/30 transition-all"
                                       >🟢 처리완료</button>
                                       <button
                                         onClick={() => {
                                           const roomRef = doc(db, 'square', 'rooms', 'list', rpt.roomId);
                                           updateDoc(roomRef, { isUnderReview: false })
                                             .then(() => {
                                               // 소멸 예정 시각이 이미 지났으면 즉시 삭제
                                               return import('firebase/firestore').then(({ getDoc, deleteDoc }) =>
                                                 getDoc(roomRef).then(snap => {
                                                   if (snap.exists()) {
                                                     const data = snap.data();
                                                     if (data.deleteAt && data.deleteAt <= Date.now()) {
                                                       return deleteDoc(roomRef);
                                                     }
                                                   }
                                                 })
                                               );
                                             })
                                             .then(() => onToast('삭제 방지가 해제되었습니다.'))
                                             .catch(() => onToast('방이 이미 소멸되었거나 오류가 발생했습니다.'));
                                         }}
                                         className="px-4 py-2 bg-slate-500/20 border border-slate-500/30 text-slate-400 text-[10px] font-black rounded-xl hover:bg-rose-500/20 hover:border-rose-500/30 hover:text-rose-400 transition-all"
                                       >🔓 삭제방지 해제</button>
                                     </div>
                                   </div>
                                 )}
                               </div>
                             );
                           })}
                         </div>
                       ) : (
                         <div className="glass p-10 rounded-[2.5rem] border border-dashed border-white/10 text-center">
                           <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">접수된 신고가 없습니다.</p>
                         </div>
                       )}
                     </section>
                   )}

                   {/* 관리자 전용: 문의 접수 목록 */}
                   {isAdmin && (
                     <section className="space-y-4">
                       <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center space-x-3"><span>📩</span><span>문의 접수 목록</span></h4>
                       <div className="glass p-10 rounded-[2.5rem] border border-dashed border-white/10 text-center">
                         <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">문의 기능 준비 중</p>
                       </div>
                     </section>
                   )}
                </div>
              )}

              {activeTab === 'sanctum' && (
                <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 flex flex-col items-center">
                   <div className="text-center space-y-2">
                      <h3 className="text-2xl font-mystic font-black text-white uppercase tracking-widest">Divine Sanctum</h3>
                      <p className="text-xs text-slate-500 italic">"당신의 기운이 머무르는 전용 성소입니다."</p>
                   </div>
                   
                   <div className="relative w-full aspect-video rounded-[4rem] border-2 border-white/5 shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden flex items-center justify-center group">
                      <div className="absolute inset-0 bg-[#050810]">
                         <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_150%,_rgba(79,70,229,0.3),_transparent_70%)]"></div>
                         <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
                      </div>
                      
                      <div className="relative animate-float-slow flex flex-col items-center">
                         <div className="absolute -inset-10 bg-indigo-500/10 blur-3xl rounded-full animate-pulse opacity-50"></div>
                         <OrbVisual level={orb.level} isLarge={true} className="w-48 h-48 sm:w-64 sm:h-64 shadow-[0_0_80px_rgba(99,102,241,0.2)]" overlayAnimation={(ORB_DECORATIONS.find(d => d.id === orb.activeDecorationId) || ORB_DECORATIONS[0]).overlayAnimation} />
                         <div className="mt-8 text-center space-y-1">
                            <p className="text-xs font-black text-indigo-400 uppercase tracking-[0.4em]">Resonance Core</p>
                            <p className="text-[9px] text-slate-600 font-bold uppercase">Stability: 98.2%</p>
                         </div>
                      </div>

                      {orb.level >= 10 && (
                        <div className="absolute bottom-10 left-10 w-24 h-24 glass rounded-3xl border border-white/10 flex items-center justify-center animate-bounce-slow opacity-30">
                           <span className="text-3xl">🕯️</span>
                        </div>
                      )}
                      {orb.level >= 50 && (
                        <div className="absolute top-10 right-10 w-32 h-32 glass rounded-full border border-indigo-500/20 flex items-center justify-center animate-pulse opacity-30">
                           <span className="text-4xl">🪐</span>
                        </div>
                      )}

                      <div className="absolute inset-0 border-[0.5px] border-white/5 rounded-[4rem] pointer-events-none"></div>
                   </div>

                   <div className="w-full p-8 bg-white/5 rounded-3xl border border-dashed border-white/10 text-center">
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Room Customization (Upcoming)</p>
                      <p className="text-[9px] text-slate-600 mt-1 italic">추후 성소에 가구나 장식품을 루멘으로 구매하여 배치할 수 있는 기능이 업데이트될 예정입니다.</p>
                   </div>
                </div>
              )}

              {activeTab === 'admin' && isAdmin && (
                <AdminSanctum
                  subAdminConfig={subAdminConfig}
                  onSubAdminConfigChange={onSubAdminConfigChange}
                  onToast={onToast}
                />
              )}

           </div>
        </main>
      </div>

      {selectedArchive && (() => {
        const d = selectedArchive.data as any;
        const dt = new Date(selectedArchive.timestamp);
        const dateStr = `${dt.getFullYear()}년 ${dt.getMonth()+1}월 ${dt.getDate()}일 ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
        const typeLabel: Record<string, string> = { divine: '🔮 천기누설', annual: '⭐ 천명수', scientific: '🔬 지성분석' };
        const allNums: number[] = d.luckyNumbers || d.numbers || [];
        const coreNums: number[] = d.coreNumbers || [];
        return (
          <div className="fixed inset-0 z-[6000] flex items-start justify-center p-4 bg-black/90 backdrop-blur-xl overflow-y-auto">
            <div className="relative w-full max-w-lg my-8 glass rounded-[2.5rem] border border-white/10 p-8 space-y-8 animate-in zoom-in-95 duration-300">
              <button onClick={() => setSelectedArchive(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white text-2xl transition-colors">✕</button>

              {/* 헤더 */}
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{dateStr}</p>
                <h3 className="text-xl font-mystic font-black text-white">{typeLabel[selectedArchive.type]}</h3>
              </div>

              {/* 번호 공 */}
              {allNums.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">행운의 번호</p>
                  <div className="flex flex-wrap gap-3">
                    {allNums.map((n: number, i: number) => (
                      <div key={i} className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-base shadow-xl ${coreNums.includes(n) ? 'bg-gradient-to-br from-amber-300 to-amber-600 text-slate-950 ring-2 ring-amber-400 ring-offset-2 ring-offset-[#020617]' : 'bg-slate-800 text-white border border-white/10'}`}>{n}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* 천기누설 */}
              {selectedArchive.type === 'divine' && (
                <div className="space-y-4">
                  {[
                    { label: '🌟 종합운', val: d.overallFortune },
                    { label: '💰 재물운', val: d.wealthFortune },
                    { label: '❤️ 애정운', val: d.loveFortune },
                    { label: '🌿 건강운', val: d.healthFortune },
                    { label: '☯️ 사주 심층', val: d.sajuDeepDive },
                    { label: '🃏 타로 심층', val: d.tarotDeepDive },
                    { label: '🪐 점성술 심층', val: d.astrologyDeepDive },
                    { label: '📜 핵심 전언', val: d.recommendationReason },
                  ].filter(s => s.val).map(s => (
                    <div key={s.label} className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{s.label}</p>
                      <p className="text-sm text-slate-300 leading-relaxed">{s.val}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* 천명수 */}
              {selectedArchive.type === 'annual' && (
                <div className="space-y-4">
                  <div className="p-5 bg-amber-500/5 rounded-2xl border border-amber-500/20 text-center">
                    <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">{d.year}년 천명수</p>
                    {d.luckyColor && <p className="text-xs text-slate-400">행운의 색: <span className="font-black text-white">{d.luckyColor}</span></p>}
                  </div>
                  {[
                    { label: '📖 대운 종합', val: d.reason },
                    { label: '💰 재물운 상세', val: d.wealthDetailed },
                    { label: '❤️ 애정운 상세', val: d.loveDetailed },
                    { label: '🌿 건강운 상세', val: d.healthDetailed },
                    { label: '🃏 타로 상세', val: d.tarotDetailed },
                    { label: '🪐 점성술 상세', val: d.astrologyDetailed },
                    { label: '☯️ 사주 심층', val: d.sajuDeepDive },
                    { label: '📅 계획 전략', val: d.planningStrategy },
                    { label: '🟢 최고의 달', val: d.bestMonths },
                    { label: '🔴 주의의 달', val: d.worstMonths },
                  ].filter(s => s.val).map(s => (
                    <div key={s.label} className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                      <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">{s.label}</p>
                      <p className="text-sm text-slate-300 leading-relaxed">{s.val}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* 지성분석 */}
              {selectedArchive.type === 'scientific' && (
                <div className="space-y-4">
                  {d.scientificReport && (
                    <div className="p-5 bg-cyan-500/5 rounded-2xl border border-cyan-500/20 space-y-2">
                      <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">🔬 과학적 분석</p>
                      <p className="text-sm text-slate-300 leading-relaxed">{d.scientificReport}</p>
                    </div>
                  )}
                  {d.metrics && (
                    <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                      <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">📊 주요 메트릭</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <span className="text-slate-500">합계</span><span className="text-white font-bold">{d.metrics.sum}</span>
                        <span className="text-slate-500">홀짝</span><span className="text-white font-bold">{d.metrics.oddEven}</span>
                        <span className="text-slate-500">고저</span><span className="text-white font-bold">{d.metrics.highLow}</span>
                        <span className="text-slate-500">연속수</span><span className="text-white font-bold">{d.metrics.consecutiveCount}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 삭제 / 닫기 */}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setConfirmDeleteArchiveId(selectedArchive.id)}
                  className="flex-1 py-4 bg-rose-500/10 text-rose-400 border border-rose-500/20 font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-rose-500/20 transition-all">삭제</button>
                <button onClick={() => setSelectedArchive(null)}
                  className="flex-1 py-4 bg-white/5 text-slate-400 font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-white/10 transition-all">닫기</button>
              </div>
            </div>
          </div>
        );
      })()}

      {showWithdrawConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center px-6">
           <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowWithdrawConfirm(false)}></div>
           <div className="relative glass p-10 rounded-[3rem] border border-rose-500/30 w-full max-w-sm text-center animate-in zoom-in-95 duration-300">
              <div className="text-4xl mb-6">🌋</div>
              <h3 className="text-2xl font-black text-rose-400 mb-2 uppercase tracking-widest">Fate Erasure</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-8 italic leading-relaxed">
                "이 앱에서의 모든 수련 기록, 루멘, 서고,<br/>그리고 당신의 운명적 자취를 영구히 소멸시킵니까?"
              </p>
              <div className="space-y-3">
                 <button onClick={handleWithdraw} className="w-full py-5 bg-rose-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-sm hover:bg-rose-500 transition-all">영구 소멸 (Erasure)</button>
                 <button onClick={() => setShowWithdrawConfirm(false)} className="w-full py-4 bg-white/5 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-[10px] hover:bg-white/10">보존하기</button>
              </div>
           </div>
        </div>
      )}

      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-float-slow { animation: float-slow 6s ease-in-out infinite; }
        
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0) rotate(0); }
          50% { transform: translateY(-10px) rotate(5deg); }
        }
        .animate-bounce-slow { animation: bounce-slow 8s ease-in-out infinite; }

        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.3); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default UserProfilePage;
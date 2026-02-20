import React, { useState, useRef, useEffect, useMemo } from 'react';
import { UserProfile, OrbState, SavedFortune, ORB_DECORATIONS, CalendarType } from '../types';
import KoreanLunarCalendar from 'korean-lunar-calendar';
import { OrbVisual } from './FortuneOrb';
import ModelStatusCard from './admin/ModelStatusCard';
import AdminSanctum from './AdminSanctum';
import { db, auth } from '../services/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

interface ChatCapture {
  id: string;
  savedAt: number;
  roomName: string;
  creatorName: string;
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
}

interface CitySuggestion {
  display: string;
  lat: number;
  lon: number;
}

const UserProfilePage: React.FC<UserProfilePageProps> = ({ profile, orb, archives, onUpdateProfile, onUpdateOrb, onWithdraw, onBack, onToast, isAdmin, subAdminConfig = {}, onSubAdminConfigChange = () => {} }) => {
  const [activeTab, setActiveTab] = useState<'identity' | 'treasury' | 'social' | 'sanctum' | 'admin'>('identity');
  const [chatCaptures, setChatCaptures] = useState<ChatCapture[]>([]);
  const [expandedCapture, setExpandedCapture] = useState<string | null>(null);

  // 갈무리 목록 로드 (Social 탭 진입 시)
  useEffect(() => {
    if (activeTab !== 'social' || !auth.currentUser) return;
    const q = query(
      collection(db, "users", auth.currentUser.uid, "chatCaptures"),
      orderBy("savedAt", "desc"),
      limit(30)
    );
    getDocs(q).then(snap => {
      setChatCaptures(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatCapture)));
    }).catch(() => {});
  }, [activeTab]);

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
      <header className="relative z-10 border-b border-white/5 px-8 py-6 flex justify-between items-center shrink-0">
        <div className="absolute inset-0 bg-white/[0.02] backdrop-blur-3xl -z-10 pointer-events-none" />
        <div className="flex items-center space-x-6">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div>
            <h2 className="text-xl font-mystic font-black text-white tracking-widest leading-none uppercase">Private Sanctum</h2>
            <p className="text-[9px] text-indigo-400 font-black uppercase tracking-[0.4em] mt-1.5">{orb.nickname || profile.name} 님의 전용 영역</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
           <div className="text-right">
              <p className="text-[9px] text-slate-500 font-black uppercase">Resonance Level</p>
              <p className="text-sm font-mystic font-black text-white">LV.{orb.level}</p>
           </div>
           <OrbVisual level={orb.level} className="w-10 h-10 border border-white/10 shadow-lg shadow-indigo-500/10" />
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex">
        <aside className="w-20 md:w-64 border-r border-white/5 glass flex flex-col py-10 space-y-2 shrink-0">
           {[
             { id: 'identity', label: 'Identity', sub: '정체성 및 기록', icon: '🆔' },
             { id: 'treasury', label: 'Treasury', sub: '인벤토리 및 서고', icon: '💎' },
             { id: 'social', label: 'Social', sub: '선물 및 편지함', icon: '📧' },
             { id: 'sanctum', label: 'Sanctum', sub: '개인 성소 꾸미기', icon: '🏛️' },
           ].map(tab => (
             <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full px-4 md:px-8 py-4 flex items-center space-x-4 transition-all group ${activeTab === tab.id ? 'bg-indigo-600/10 border-r-2 border-indigo-500' : 'hover:bg-white/5 opacity-40 hover:opacity-100'}`}
             >
               <span className="text-xl">{tab.icon}</span>
               <div className="hidden md:flex flex-col text-left">
                  <span className={`text-[11px] font-black uppercase tracking-widest ${activeTab === tab.id ? 'text-indigo-400' : 'text-slate-400'}`}>{tab.label}</span>
                  <span className="text-[9px] text-slate-600 font-bold">{tab.sub}</span>
               </div>
             </button>
           ))}
           {isAdmin && (
             <button
               onClick={() => setActiveTab('admin')}
               className={`w-full px-4 md:px-8 py-4 flex items-center space-x-4 transition-all ${activeTab === 'admin' ? 'bg-amber-500/10 border-r-2 border-amber-400' : 'hover:bg-white/5 opacity-40 hover:opacity-100'}`}
             >
               <span className="text-xl">👑</span>
               <div className="hidden md:flex flex-col text-left">
                 <span className={`text-[11px] font-black uppercase tracking-widest ${activeTab === 'admin' ? 'text-amber-400' : 'text-slate-400'}`}>Admin</span>
                 <span className="text-[9px] text-slate-600 font-bold">최고관리자 구역</span>
               </div>
             </button>
           )}
           <div className="flex-1"></div>
           <button onClick={() => setShowWithdrawConfirm(true)} className="w-full px-8 py-6 text-left opacity-20 hover:opacity-100 hover:bg-rose-900/20 transition-all text-rose-500">
              <span className="text-[10px] font-black uppercase tracking-widest">Withdrawal</span>
           </button>
        </aside>

        <main className="flex-1 overflow-y-auto p-6 md:p-12 custom-scroll bg-[radial-gradient(circle_at_50%_0%,_rgba(30,58,138,0.1),_transparent_70%)]">
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
                            className="px-8 bg-slate-800 text-white text-[10px] font-black rounded-2xl uppercase tracking-widest hover:bg-slate-700 disabled:opacity-30 transition-all"
                           >
                            중복 체크
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
                          className="w-full py-6 bg-indigo-600 text-white font-black rounded-2xl shadow-2xl hover:bg-indigo-500 transition-all uppercase tracking-[0.2em] text-sm border-t border-white/20"
                         >
                          운명 기록 최종 갱신 (Save Records)
                         </button>
                      </div>
                   </div>
                </div>
              )}

              {activeTab === 'treasury' && (
                <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                         <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center space-x-3"><span>📜</span><span>운명 기록 (서고)</span></h4>
                         <div className="glass p-8 rounded-[2.5rem] border border-white/5 flex flex-col items-center justify-center space-y-2 h-full min-h-[160px]">
                            <p className="text-3xl font-mystic font-black text-white">{archives.length}</p>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Revelations</p>
                         </div>
                      </section>
                   </div>
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
                </div>
              )}

              {activeTab === 'social' && (
                <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
                   <section className="space-y-6">
                      <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center space-x-3"><span>📧</span><span>신비의 편지함</span></h4>
                      <div className="space-y-3">
                         {orb.mailbox && orb.mailbox.length > 0 ? (
                           orb.mailbox.map(mail => (
                             <div key={mail.id} className={`p-6 rounded-2xl border transition-all ${mail.isRead ? 'bg-white/5 border-white/5 opacity-50' : 'bg-indigo-500/10 border-indigo-500/30'}`}>
                                <div className="flex justify-between items-start mb-2">
                                   <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">From: {mail.sender}</p>
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
                      <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center space-x-3"><span>🗂️</span><span>대화방 갈무리</span></h4>
                      {chatCaptures.length > 0 ? (
                        <div className="space-y-3">
                          {chatCaptures.map(cap => (
                            <div key={cap.id} className="glass rounded-[2rem] border border-white/5 overflow-hidden">
                              <button
                                className="w-full p-5 flex justify-between items-center hover:bg-white/5 transition-all text-left"
                                onClick={() => setExpandedCapture(expandedCapture === cap.id ? null : cap.id)}
                              >
                                <div>
                                  <p className="text-sm font-black text-white">{cap.roomName}</p>
                                  <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                                    {new Date(cap.savedAt).toLocaleString()} · {cap.participants.length}명 · {cap.messages.length}개 메시지
                                  </p>
                                </div>
                                <span className="text-slate-500 text-sm">{expandedCapture === cap.id ? '▲' : '▼'}</span>
                              </button>
                              {expandedCapture === cap.id && (
                                <div className="border-t border-white/5">
                                  {/* 참여자 목록 */}
                                  <div className="px-5 py-3 bg-white/[0.02] border-b border-white/5">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">참여자</p>
                                    <div className="flex flex-wrap gap-2">
                                      {cap.participants.map(p => (
                                        <span key={p.uid} className="text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-1 rounded-lg">
                                          {p.name}{p.uniqueTag ? ` @${p.uniqueTag}` : ''}
                                          {p.uid === cap.participants[0]?.uid ? ' 👑' : ''}
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
                          ))}
                        </div>
                      ) : (
                        <div className="glass p-10 rounded-[2.5rem] border border-dashed border-white/10 text-center">
                          <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">저장된 갈무리가 없습니다.</p>
                        </div>
                      )}
                   </section>
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
                         <OrbVisual level={orb.level} isLarge={true} className="w-48 h-48 sm:w-64 sm:h-64 shadow-[0_0_80px_rgba(99,102,241,0.2)]" />
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
import React, { useState, useRef, useMemo } from 'react';
import KoreanLunarCalendar from 'korean-lunar-calendar';
import { User } from 'firebase/auth';
import { UserProfile, CalendarType } from '../types';

interface CitySuggestion {
  display: string;
  lat: number;
  lon: number;
}

interface ProfileSetupFormProps {
  currentUser: User;
  onComplete: (profile: UserProfile) => void;
}

const ProfileSetupForm: React.FC<ProfileSetupFormProps> = ({ currentUser, onComplete }) => {
  const [inputName, setInputName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');

  const [inputCity, setInputCity] = useState('');
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([]);
  const [showCityList, setShowCityList] = useState(false);
  const [isSearchingCity, setIsSearchingCity] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const setupLunarText = useMemo(() => {
    const y = parseInt(birthYear);
    const m = parseInt(birthMonth);
    const d = parseInt(birthDay);
    if (!y || !m || !d || birthYear.length < 4) return null;
    try {
      const cal = new KoreanLunarCalendar();
      if (calendarType === 'solar') {
        if (!cal.setSolarDate(y, m, d)) return null;
        const lunar = cal.getLunarCalendar();
        const inter = lunar.intercalation ? ' (윤달)' : '';
        return `음력 ${lunar.year}.${String(lunar.month).padStart(2, '0')}.${String(lunar.day).padStart(2, '0')}${inter}`;
      } else {
        if (!cal.setLunarDate(y, m, d, isIntercalary)) return null;
        const solar = cal.getSolarCalendar();
        return `≈ 양력 ${solar.year}.${String(solar.month).padStart(2, '0')}.${String(solar.day).padStart(2, '0')}`;
      }
    } catch { return null; }
  }, [birthYear, birthMonth, birthDay, calendarType, isIntercalary]);

  const handleCityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputCity(val);
    setSelectedCoords(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 2) { setShowCityList(false); return; }
    debounceRef.current = setTimeout(async () => {
      setIsSearchingCity(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=5&addressdetails=1`);
        const data = await res.json();
        const suggestions = data.map((item: any) => ({
          display: item.display_name,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
        }));
        setCitySuggestions(suggestions);
        setShowCityList(true);
      } catch { setShowCityList(false); }
      finally { setIsSearchingCity(false); }
    }, 600);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputName || !birthYear || !birthMonth || !birthDay || !inputCity) return;
    const formattedBirth = `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`;
    let h = parseInt(selectedHour);
    if (selectedAmPm === '오후' && h < 12) h += 12;
    if (selectedAmPm === '오전' && h === 12) h = 0;
    const formattedTime = `${h.toString().padStart(2, '0')}:${selectedMinute}`;
    onComplete({
      name: inputName,
      birthDate: formattedBirth,
      birthTime: formattedTime,
      birthCity: inputCity,
      lat: selectedCoords?.lat,
      lon: selectedCoords?.lon,
      gender: inputGender,
      calendarType,
      isIntercalary,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#020617]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(30,58,138,0.2),_transparent)] pointer-events-none"></div>
      <div className="relative z-10 glass p-10 rounded-[3rem] w-full max-w-lg space-y-10 animate-in fade-in zoom-in duration-700 shadow-2xl border-white/5 text-center">
        <div className="space-y-3 flex flex-col items-center">
          <img src="/s_mlotto_logo.png" alt="Mystic" className="w-24 h-24 object-contain drop-shadow-[0_0_24px_rgba(99,102,241,0.5)]" />
          <h1 className="text-5xl font-mystic font-bold text-transparent bg-clip-text bg-gradient-to-b from-indigo-200 via-indigo-400 to-indigo-600 tracking-tighter uppercase">Mystic Lotto</h1>
          <p className="text-slate-500 text-[10px] font-black tracking-[0.6em] uppercase">Fate & Resonance</p>
        </div>
        <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
          <p className="text-xs text-indigo-300 font-bold">환영합니다, {currentUser.displayName || '운명 개척자'}님!<br/>정확한 운명 분석을 위해 생년월일시 정보를 입력하십시오.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6 text-left">
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
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Birth City (출생 도시)</label>
                <span className="text-[9px] font-bold text-sky-400">출생 도시를 모를 경우, 국가명을 입력하세요</span>
              </div>
              <div className="relative">
                <input type="text" required value={inputCity} onChange={handleCityInputChange} className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-white focus:outline-none focus:border-indigo-500 font-bold pr-12" placeholder="도시 또는 국가명 입력" />
                {isSearchingCity && <div className="absolute right-4 top-1/2 -translate-y-1/2"><div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>}
              </div>
              {showCityList && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-indigo-500/30 rounded-2xl shadow-2xl z-[100] max-h-56 overflow-y-auto custom-scroll">
                  {citySuggestions.map((city, idx) => (
                    <button key={idx} type="button" onClick={() => { setInputCity(city.display); setSelectedCoords({ lat: city.lat, lon: city.lon }); setShowCityList(false); }} className="w-full text-left p-4 hover:bg-indigo-600/20 text-xs font-bold text-slate-300 border-b border-white/5 transition-colors">
                      <div className="flex flex-col"><span>{city.display}</span><span className="text-[8px] text-slate-500">LAT: {city.lat.toFixed(2)} / LON: {city.lon.toFixed(2)}</span></div>
                    </button>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-yellow-500 px-1 leading-relaxed">도시가 표시되지 않을 경우, 마지막 글자를 지우고 다시 입력하세요</p>
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
                    <div className="absolute bottom-[4.5rem] right-0 w-80 p-6 rounded-3xl z-50 border border-indigo-500/30 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200 bg-slate-900/90 backdrop-blur-sm">
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
                            {Array.from({ length: 12 }).map((_, i) => {
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
                            {Array.from({ length: 60 }).map((_, i) => {
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
              {setupLunarText && (
                <p className="text-[10px] text-yellow-400 font-bold px-1">{setupLunarText}</p>
              )}
            </div>
          </div>
          <button ref={submitRef} type="submit" className="w-full py-6 bg-gradient-to-r from-indigo-600 to-pink-600 text-white font-black rounded-2xl shadow-2xl transition-all uppercase tracking-widest text-lg active:scale-95">운명의 문 열기</button>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetupForm;

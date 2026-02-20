
export type CalendarType = 'solar' | 'lunar';

export interface UserProfile {
  name: string;
  birthDate: string;
  birthTime: string; 
  birthCity: string; 
  lat?: number; // 정밀 분석을 위한 위도
  lon?: number; // 정밀 분석을 위한 경도
  gender: 'M' | 'F';
  calendarType: CalendarType;
  isIntercalary: boolean;
}

export interface GiftRecord {
  id: string;
  type: 'sent' | 'received';
  targetName: string;
  amount: number;
  timestamp: number;
}

export interface MailMessage {
  id: string;
  sender: string;
  title: string;
  content: string;
  timestamp: number;
  isRead: boolean;
}

export interface PurchaseRecord {
  id: string;
  itemName: string;
  price: number;
  timestamp: number;
}

export interface LottoRound {
  round: number;
  numbers: number[];
  bonus: number;
}

export interface ScientificFilterConfig {
  totalSumRange: [number, number];
  sum123Range: [number, number];
  sum456Range: [number, number];
  acMin: number;
  oddRatio: string; 
  highLowRatio: string;
  primeCountRange: [number, number]; 
  maxConsecutive: number; 
  maxSameEnding: number; 
  gapMin: number; 
  carryOverRange: [number, number]; 
  neighborRange: [number, number]; 
  algorithmMode: 'Standard' | 'Bradford' | 'EntropyMax' | 'LowFrequency' | 'BradfordLegacy' | 'Wheeling';
  applyBenfordLaw: boolean;
  gameCount: number;
  fixedNumbers: number[];
  excludedNumbers: number[];
  wheelingPool: number[];
  coOccurrenceMode: 'off' | 'favor' | 'avoid';
}

export interface ScientificAnalysisResult {
  numbers: number[];
  metrics: {
    sum: number;
    sum123: number;
    sum456: number;
    acValue: number;
    oddEven: string;
    highLow: string;
    consecutiveCount: number;
    sameEndingCount: number;
    primeCount: number;
    carryOverCount: number;
    neighborCount: number;
    averageGap: number;
    benfordScore: number;
    leadDigitsDistribution: number[];
    sumZScore: number;       // 정규분포 Z-Score: 합계가 이론 평균(138)에서 몇 σ 떨어져 있는지
    chiSquaredScore: number; // 카이제곱 분포 균일도 점수 (0~100, 높을수록 균일)
  };
  scientificReport: string;
  matchProbability: number;
  historicalRank: number;
  additionalSets?: number[][];
}

export interface NumberExplanation {
  number: number;
  explanation: string;
}

export interface FortuneResult {
  sajuSummary: string;
  convertedDate: string; 
  tarotCard: string;
  astrologyReading: string;
  overallFortune: string;   
  wealthFortune: string;    
  loveFortune: string;      
  healthFortune: string;    
  luckyNumbers: number[];   
  coreNumbers: number[];    
  coreNumbersDescription: string; 
  recommendationReason: string; 
  sajuPillars: {
    year: string;
    month: string;
    day: string;
    hour: string;
  };
  numberExplanations: NumberExplanation[]; 
  sajuDeepDive: string;
  tarotDeepDive: string;
  astrologyDeepDive: string;
}

export interface MonthlyEnergy {
  month: number;
  summary: string;
}

export interface FixedFortuneResult extends FortuneResult {
  destinyDescription: string; 
  monthlyFlow: MonthlyEnergy[];
  luckyColor: string;
  planningStrategy: string;
  bestMonths: string;
  worstMonths: string;
  wealthDetailed: string;
  loveDetailed: string;
  healthDetailed: string;
  tarotDetailed: string;
  tarotCardName: string;
  astrologyDetailed: string;
}

export interface SavedFortune {
  id: string;
  timestamp: number;
  type: 'divine' | 'scientific' | 'annual';
  data: FortuneResult | ScientificAnalysisResult | AnnualDestiny;
}

export interface OrbDecoration {
  id: string;
  name: string;
  effectClass: string;
  price: number;
}

export interface AnnualDestiny {
  year: number;
  numbers: number[]; // 연간 수호 번호 (1-2개)
  reason: string; // 전체 종합 운세
  luckyColor: string;
  planningStrategy: string;
  bestMonths: string;
  worstMonths: string;
  wealthDetailed: string;
  loveDetailed: string;
  healthDetailed: string;
  tarotDetailed: string;
  tarotCardName: string;
  astrologyDetailed: string;
  sajuDeepDive: string; // 음력 설 기준 사주 풀이
  numberExplanations: NumberExplanation[]; 
  timestamp: number;
}

export interface OrbState {
  level: number;
  exp: number;
  color: string;
  aura: string;
  activeDecorationId?: string;
  points: number;
  uniqueTag?: string;
  nickname?: string;
  giftHistory: GiftRecord[];
  mailbox: MailMessage[];
  purchaseHistory: PurchaseRecord[];
  hasGoldenCard: boolean; 
  goldenCardId?: string; 
  annualDestinies?: { [year: number]: AnnualDestiny };
  dailyExtractCount: number;
  lastExtractDate: string;
  favoriteRoomIds: string[];
  purchasedDecorationIds: string[];
  lastVisitDate?: string;
  dailyOrbTapExp?: number;
  dailyPostCount?: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userLevel: number;
  message: string;
  timestamp: number;
}

export interface ChatRoom {
  id: string;
  title: string;
  creatorName: string;
  creatorId: string; // 소멸 권한 확인을 위한 추가
  participantCount: number;
  createdAt: number;
  isPermanent: boolean;
  deleteAt?: number; // 소멸 예정 타임스탬프
  icon?: string; // 방 대표 이모지 아이콘
  lastEnteredAt?: number; // 마지막 입장 타임스탬프 (3일 미방문 자동 소멸용)
  renameCount?: number; // 행성명/아이콘 변경 횟수 (0 또는 undefined = 무료, 1이상 = 500L)
}

export interface BoardComment {
  id: string;
  authorName: string;
  authorLevel: number;
  content: string;
  createdAt: number;
}

export interface ContentBlock {
  type: 'text' | 'image';
  value: string;
}

export interface BoardPost {
  id: string;
  title: string;
  content?: string;
  blocks?: ContentBlock[];
  authorName: string;
  authorLevel: number;
  authorId?: string;
  postNumber?: number;
  views: number;
  likes: number;
  likedBy?: string[];
  viewedBy?: string[]; // 조회한 유저 UID 목록 (중복 카운트 방지)
  createdAt: number;
  isNotice: boolean;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'youtube';
  comments: BoardComment[];
}

export interface ModelInfo {
  model: string;
  deprecationDate: string | null;
  daysLeft: number | null;
  warning: boolean;
}

export interface ModelStatus {
  flash: ModelInfo;
  pro: ModelInfo;
  hasWarning: boolean;
  checkedAt: number;
}

export const ORB_DECORATIONS: OrbDecoration[] = [
  { id: 'default', name: '기본 오라', effectClass: 'animate-pulse', price: 0 },
  { id: 'sparkle', name: '황금 별가루', effectClass: 'animate-bounce blur-[1px]', price: 1000 },
  { id: 'flame', name: '정열의 불꽃', effectClass: 'animate-ping opacity-20', price: 5000 },
  { id: 'galaxy', name: '은하수의 숨결', effectClass: 'animate-spin duration-[5000ms]', price: 10000 },
];

export const GOLDEN_CARD_PRICE = 50000; 
export const OFFERING_CONVERSION_RATE = 1;
export const DAILY_LIMIT = 5;
export const COST_DIVINE = 1000;
export const COST_SCIENCE = 1000;
export const COST_ANNUAL = 50000;
export const COST_ROOM_CREATE = 1000;
export const INITIAL_POINTS = 30000;

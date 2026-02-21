"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getR2UploadUrl = exports.checkModelDeprecation = exports.cleanupExpiredRooms = exports.performOffering = exports.spendPoints = exports.getFixedDestinyNumbers = exports.getScientificReport = exports.getFortuneAndNumbers = void 0;
const admin = require("firebase-admin");
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const params_1 = require("firebase-functions/params");
const genai_1 = require("@google/genai");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
admin.initializeApp();
const db = admin.firestore();
const GEMINI_API_KEY = (0, params_1.defineSecret)("GEMINI_API_KEY");
// ── R2 Secrets ──────────────────────────────────────────────────
const R2_ACCOUNT_ID = (0, params_1.defineSecret)("R2_ACCOUNT_ID");
const R2_ACCESS_KEY_ID = (0, params_1.defineSecret)("R2_ACCESS_KEY_ID");
const R2_SECRET_ACCESS_KEY = (0, params_1.defineSecret)("R2_SECRET_ACCESS_KEY");
const R2_BUCKET_NAME = (0, params_1.defineSecret)("R2_BUCKET_NAME");
const R2_PUBLIC_URL = (0, params_1.defineSecret)("R2_PUBLIC_URL");
// ── 포인트 비용 상수 ──────────────────────────────────────────
const COST_DIVINE = 1000;
const COST_SCIENCE = 1000;
const COST_ANNUAL = 50000;
const ADMIN_UID = "o5XegbLlnPVJhZtn31HXyddBGKW2";
// ── 모델 폴백 체인 ────────────────────────────────────────────
// Flash 계열: 1,000 루멘 서비스용
const FLASH_CHAIN = ["gemini-3-flash-preview", "gemini-2.5-flash"];
// Pro 계열: 50,000 루멘 프리미엄 서비스용
const PRO_CHAIN = ["gemini-3-pro-preview", "gemini-2.5-pro"];
// ── Firestore에서 현재 활성 모델명 조회 ──────────────────────
async function getActiveModel(tier) {
    var _a, _b;
    const defaults = {
        flash: FLASH_CHAIN[0],
        pro: PRO_CHAIN[0],
    };
    try {
        const snap = await db.collection("config").doc("models").get();
        return (_b = (_a = snap.data()) === null || _a === void 0 ? void 0 : _a[tier]) !== null && _b !== void 0 ? _b : defaults[tier];
    }
    catch (_c) {
        return defaults[tier];
    }
}
// ── 포인트 차감 헬퍼 (트랜잭션 내부에서 사용) ──────────────────
async function deductPoints(uid, amount, tx) {
    var _a, _b, _c;
    if (uid === ADMIN_UID)
        return; // 최고관리자는 무한 루멘
    const userRef = db.collection("users").doc(uid);
    const snap = await tx.get(userRef);
    if (!snap.exists)
        throw new https_1.HttpsError("not-found", "사용자 데이터를 찾을 수 없습니다.");
    const currentPoints = (_c = (_b = (_a = snap.data()) === null || _a === void 0 ? void 0 : _a.orb) === null || _b === void 0 ? void 0 : _b.points) !== null && _c !== void 0 ? _c : 0;
    if (currentPoints < amount) {
        throw new https_1.HttpsError("failed-precondition", "루멘이 부족합니다.");
    }
    tx.update(userRef, { "orb.points": admin.firestore.FieldValue.increment(-amount) });
}
// ── AI 호출 실패 시 1회 자동 재시도 ──────────────────────────
async function callWithRetry(fn) {
    try {
        return await fn();
    }
    catch (_a) {
        await new Promise(r => setTimeout(r, 2000));
        return await fn();
    }
}
// ── 루멘 잔액 사전 확인 (AI 호출 전 빠른 오류 반환) ───────────
async function checkBalance(uid, amount) {
    var _a, _b, _c;
    if (uid === ADMIN_UID)
        return;
    const snap = await db.collection("users").doc(uid).get();
    if (!snap.exists)
        throw new https_1.HttpsError("not-found", "사용자 데이터를 찾을 수 없습니다.");
    if (((_c = (_b = (_a = snap.data()) === null || _a === void 0 ? void 0 : _a.orb) === null || _b === void 0 ? void 0 : _b.points) !== null && _c !== void 0 ? _c : 0) < amount) {
        throw new https_1.HttpsError("failed-precondition", "루멘이 부족합니다.");
    }
}
// ──────────────────────────────────────────────
// 오늘의 운세 + 로또번호 (COST: 1,000 루멘)
// ──────────────────────────────────────────────
exports.getFortuneAndNumbers = (0, https_1.onCall)({ secrets: [GEMINI_API_KEY], region: "asia-northeast3", timeoutSeconds: 300 }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "로그인이 필요합니다.");
    const uid = request.auth.uid;
    // ① 잔액 사전 확인 (AI 호출 전 빠른 오류 반환)
    await checkBalance(uid, COST_DIVINE);
    // ② AI 호출 (실패 시 1회 자동 재시도)
    const profile = request.data;
    if (!profile || !profile.name) {
        throw new https_1.HttpsError("invalid-argument", "프로필 정보가 필요합니다.");
    }
    const ai = new genai_1.GoogleGenAI({ apiKey: GEMINI_API_KEY.value() });
    const calendarInfo = profile.calendarType === "lunar"
        ? `음력 (${profile.isIntercalary ? "윤달" : "평달"})`
        : "양력";
    const today = new Date().toLocaleDateString("ko-KR");
    const locationInfo = profile.lat && profile.lon
        ? `출생지 정밀 좌표: 위도 ${profile.lat}, 경도 ${profile.lon}`
        : `출생지(도시): ${profile.birthCity}`;
    const prompt = `
    사용자 정보:
    - 이름: ${profile.name}
    - 생년월일: ${profile.birthDate} (${calendarInfo})
    - 태어난 시간: ${profile.birthTime} (1분 단위 정밀도)
    - ${locationInfo}
    - 성별: ${profile.gender === "M" ? "남성" : "여성"}
    - 오늘 날짜: ${today}

    미션: 사용자의 사주팔자(명리학), 타로의 상징, 점성술의 행성 배치를 고차원적으로 통합 분석하여 '오늘의 심층 운세 리포트'와 '로또 추천수 6개'를 JSON으로 작성하세요.

    점성학적 정밀 지시사항:
    1. 제공된 '정밀 좌표(위도/경도)' 또는 '도시'를 바탕으로 출생 당시의 세계표준시(UTC)와의 시차(Timezone Offset)를 정확히 연산하세요.
    2. 특히 제공된 위도/경도를 근거로 네이탈 차트의 상승궁(Ascendant)과 12하우스(House) 배치를 오차 없이 정교하게 도출하세요. 좌표가 주어졌으므로 추측하지 말고 계산된 값을 사용하세요.

    ⚠️ 출력 언어 원칙 (절대 준수):
    - 전문 용어(하우스·트랜짓·네이탈·용신·격국·아르카나·역위 등)는 그대로 사용해도 좋습니다. 단, 처음 등장할 때 반드시 괄호로 짧은 뜻풀이를 붙이세요.
      예) 트랜짓(Transit, 현재 하늘의 행성이 내 출생 차트를 자극하는 움직임), 네이탈(Natal, 태어난 순간 고정된 운명의 좌표), 12하우스(내면의 무의식과 숨겨진 고민을 다스리는 영역), 용신(用神, 내 사주에서 가장 필요한 기운), 역위(카드가 거꾸로 놓인 상태로 에너지가 막히거나 내면으로 향함을 의미)
    - 같은 용어가 반복될 때는 처음 한 번만 괄호 설명을 붙이고 이후에는 그냥 사용하세요.
    - 분석의 초점은 항상 '오늘 이 사람의 실생활에 어떤 일이 펼쳐질 수 있는가', '어떤 선택을 해야 하는가'에 맞추세요.
    - 문체는 신비롭고 품격 있되, 전문 용어의 뜻을 알고 나면 내용이 더 깊이 이해되는 구조로 작성하세요.

    요구사항:
    1. 'overallFortune', 'wealthFortune', 'loveFortune', 'healthFortune': 각각 최소 500자 이상의 매우 상세하고 문학적인 설명을 포함하세요.
    2. 'luckyNumbers': 오늘 우주의 기운과 공명하는 6개의 숫자를 도출하세요.
    3. 'coreNumbers': 6개의 숫자 중 오늘 가장 강력한 기운을 가진 핵심 숫자(Lucky Core) 2개를 선정하세요.
    4. 'numberExplanations': **오직 coreNumbers로 선정된 2개의 숫자**에 대해서만, 왜 이 숫자가 오늘의 개인적 운명과 공명하는지 숫자별로 300자 이상의 매우 상세한 개별 풀이를 제공하세요.
    5. 'sajuDeepDive': 명리학적 관점에서 오늘 운세에 대한 심층 분석. 용신·격국·일간·천간·지지 등 전문 용어를 적극 활용하되, 처음 등장 시 괄호로 뜻풀이를 붙이세요.
    6. 'tarotDeepDive': 오늘 선택된 타로 카드의 아르카나(Arcana) 상징과 정위·역위 의미를 풀어 이 사람의 오늘 하루와 연결하세요. 전문 용어는 처음 등장 시 괄호 설명 필수.
    7. 'astrologyDeepDive': 출생 차트의 하우스 배치와 현재 트랜짓 행성이 이루는 조화·갈등을 심층 분석하세요. 하우스 번호나 각도 명칭 등 전문 용어는 처음 등장 시 괄호 설명 필수.
    8. 'coreNumbersDescription': 핵심 숫자 2개의 선정 이유를 사주/타로/점성술 관점에서 통합 설명.
    9. 'recommendationReason': 오늘 하루 전체를 관통하는 운명의 핵심 전언.
  `;
    const flashModel = await getActiveModel("flash");
    const response = await callWithRetry(() => ai.models.generateContent({
        model: flashModel,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: genai_1.Type.OBJECT,
                properties: {
                    sajuSummary: { type: genai_1.Type.STRING },
                    convertedDate: { type: genai_1.Type.STRING },
                    sajuPillars: {
                        type: genai_1.Type.OBJECT,
                        properties: {
                            year: { type: genai_1.Type.STRING },
                            month: { type: genai_1.Type.STRING },
                            day: { type: genai_1.Type.STRING },
                            hour: { type: genai_1.Type.STRING },
                        },
                        required: ["year", "month", "day", "hour"],
                    },
                    tarotCard: { type: genai_1.Type.STRING },
                    astrologyReading: { type: genai_1.Type.STRING },
                    overallFortune: { type: genai_1.Type.STRING },
                    wealthFortune: { type: genai_1.Type.STRING },
                    loveFortune: { type: genai_1.Type.STRING },
                    healthFortune: { type: genai_1.Type.STRING },
                    luckyNumbers: { type: genai_1.Type.ARRAY, items: { type: genai_1.Type.INTEGER } },
                    coreNumbers: { type: genai_1.Type.ARRAY, items: { type: genai_1.Type.INTEGER } },
                    coreNumbersDescription: { type: genai_1.Type.STRING },
                    recommendationReason: { type: genai_1.Type.STRING },
                    numberExplanations: {
                        type: genai_1.Type.ARRAY,
                        items: {
                            type: genai_1.Type.OBJECT,
                            properties: {
                                number: { type: genai_1.Type.INTEGER },
                                explanation: { type: genai_1.Type.STRING },
                            },
                            required: ["number", "explanation"],
                        },
                    },
                    sajuDeepDive: { type: genai_1.Type.STRING },
                    tarotDeepDive: { type: genai_1.Type.STRING },
                    astrologyDeepDive: { type: genai_1.Type.STRING },
                },
                required: [
                    "sajuSummary", "convertedDate", "sajuPillars", "tarotCard",
                    "astrologyReading", "overallFortune", "wealthFortune", "loveFortune",
                    "healthFortune", "luckyNumbers", "coreNumbers", "coreNumbersDescription",
                    "recommendationReason", "numberExplanations", "sajuDeepDive",
                    "tarotDeepDive", "astrologyDeepDive",
                ],
            },
        },
    }));
    const text = response.text;
    if (!text)
        throw new https_1.HttpsError("internal", "AI 응답이 비어있습니다.");
    const result = JSON.parse(text);
    // ③ AI 성공 후에만 루멘 차감 + 결과 Firestore 저장 (트랜잭션)
    const sessionRef = db.collection("users").doc(uid).collection("session").doc("data");
    await db.runTransaction(async (tx) => {
        await deductPoints(uid, COST_DIVINE, tx);
        tx.set(sessionRef, { divine: { data: result, savedAt: Date.now(), viewed: false } }, { merge: true });
    });
    return result;
});
// ──────────────────────────────────────────────
// 지성 분석 리포트 (COST: 1,000 루멘)
// ──────────────────────────────────────────────
exports.getScientificReport = (0, https_1.onCall)({ secrets: [GEMINI_API_KEY], region: "asia-northeast3", timeoutSeconds: 60 }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "로그인이 필요합니다.");
    const uid = request.auth.uid;
    // ① 잔액 사전 확인
    await checkBalance(uid, COST_SCIENCE);
    // ② AI 호출 (실패 시 1회 자동 재시도)
    const { candidate, metrics, engineLabel, algorithmMode, bradfordSets } = request.data;
    if (!candidate || !metrics) {
        throw new https_1.HttpsError("invalid-argument", "분석 데이터가 필요합니다.");
    }
    const ai = new genai_1.GoogleGenAI({ apiKey: GEMINI_API_KEY.value() });
    const engineContextMap = {
        BradfordLegacy: `2006년 10월 영국 브래드포드 대학의 수학 교수·조교를 포함한 교직원 17명이 모든 번호를 여러 조합에 분산 커버하는 전략으로 £530만(약 95억 원, 1인당 £31만)에 당첨된 실화를 구체적으로 언급하세요. 리더 Barry Waterhouse는 "모든 번호가 반드시 포함되는 방식"으로 전략을 바꿨고, 4년간의 개발 끝에 성공했다고 밝혔습니다. 이 기법은 '점'이 아닌 '그물'의 전략이며, 현재 추출된 번호가 그 전략의 핵심 조합임을 강조하세요.`,
        Bradford: `이 번호는 'Balanced Coverage (공간 균형 분산)' 엔진으로 생성되었습니다. 1~9, 10~19, 20~29, 30~39, 40~45 의 5개 구역에서 균형 있게 번호를 추출하는 공간 분산 전략을 적용했습니다. 각 구역에서 최소 1개 이상의 번호가 선택되어 번호 공간 전체를 균등하게 커버합니다. 이 공간적 분산 배치가 통계적으로 어떤 강점을 제공하는지 전문적으로 분석하세요. Bradford Legacy의 실화와는 별도로, 순수 수학적 공간 균형 이론을 중심으로 설명하세요.`,
        EntropyMax: `이 번호는 'Entropy Maximizer' 엔진으로 생성되었습니다. 50개의 후보 조합을 동시 생성하여 산술 복잡도(AC값)가 가장 높은 최적 조합을 선별했습니다. AC값이 높을수록 번호 간 간격 패턴의 다양성이 극대화되며, 인위적 편향이 배제된 진정한 엔트로피 상태를 의미합니다. 현재 AC값 ${metrics.acValue}가 달성한 엔트로피 수준을 심층 분석하고, 이 조합이 왜 50개 후보 중 최고 선택인지 설명하세요.`,
        LowFrequency: `이 번호는 'Cold Number Recall (냉수 번호 회수)' 엔진으로 생성되었습니다. 최근 50회 추첨 기록에서 출현 빈도가 낮은 번호(냉수 번호)에 높은 가중치를 부여하여 선별했습니다. 통계적 평균으로의 회귀 원리(Regression to the Mean)에 따라 장기 미출현 번호의 복귀 압력이 높아지는 현상을 전략적으로 활용했습니다. 선택된 번호들의 최근 출현 패턴과 통계적 복귀 가능성을 심층 분석하세요.`,
        Standard: `이 번호는 'Standard Random' 엔진으로 생성되었습니다. 편향 없는 무작위 추출 방식으로, 모든 통계 필터 조건을 통과한 가장 순수한 확률론적 조합입니다. 조합의 균형과 통계적 적합성을 중심으로 분석하세요.`,
    };
    const engineContext = engineContextMap[algorithmMode] || engineContextMap.Standard;
    const prompt = `
      당신은 '미스틱 로또 연구실(Mystic Lotto Lab)'의 AI 수석 분석가입니다.
      추출 번호: [${candidate.join(", ")}]
      지표 요약: ${JSON.stringify(metrics)}
      알고리즘: ${engineLabel}

      ⚠️ 출력 형식 원칙 (절대 준수):
      - #, ##, ###, #### 같은 마크다운 헤더를 절대 사용하지 마세요.
      - **텍스트** 또는 *텍스트* 같은 마크다운 볼드·이탤릭을 사용하지 마세요.
      - 섹션 구분이 필요할 때는 ▣ 기호로 시작하세요. 예) ▣ 엔진 분석
      - 소제목 강조는 ◈ 기호를 사용하세요. 예) ◈ 벤포드 적합도
      - 특별히 강조할 단어나 수치는 『텍스트』처럼 낫표로 묶으세요.
      - 불릿 리스트는 • 기호만 사용하세요. - 또는 * 리스트 기호 사용 금지.
      - 첫 문장은 반드시 "미스틱 로또 연구실의 AI 수석 분석가입니다." 로 시작하세요. (** 없이)

      분석 리포트 가이드라인:
      1. 엔진 설명 — ${engineContext}
      2. 벤포드 적합도(${metrics.benfordScore}점)가 주는 통계적 정합성과 산술 복잡도(AC) ${metrics.acValue}의 신뢰성을 전문적으로 설명하세요.
      3. 정규분포 Z-Score(${metrics.sumZScore}σ)를 언급하며, 이 조합의 합계(${metrics.sum})가 통계적 평균(138)에서 얼마나 벗어나 있는지(안정적인지 혹은 변동성이 큰지) 평가하세요. 분포 균일도(${metrics.chiSquaredScore}점)도 함께 서술하여 번호가 5개 구간에 얼마나 고르게 분포하는지 분석하세요.
      4. "미스틱 로또 연구실 AI 분석팀"으로 마무리하고 면책 조항을 포함하세요.
    `;
    const flashModel = await getActiveModel("flash");
    const response = await callWithRetry(() => ai.models.generateContent({
        model: flashModel,
        contents: prompt,
    }));
    let finalReport = response.text || "지성 분석 결과를 도출하지 못했습니다.";
    // 마크다운 잔재 강제 제거 (AI가 프롬프트를 무시할 경우 서버에서 후처리)
    finalReport = finalReport
        .replace(/#{1,6}\s*/g, '') // ###, ##, # 헤더 제거
        .replace(/\*\*(.+?)\*\*/g, '$1') // **볼드** → 텍스트만
        .replace(/\*(.+?)\*/g, '$1') // *이탤릭* → 텍스트만
        .replace(/^- /gm, '• ') // - 불릿 → • 로 교체
        .replace(/^\* /gm, '• ') // * 불릿 → • 로 교체
        .replace(/---+/g, '') // --- 구분선 제거
        .trim();
    if (algorithmMode === "BradfordLegacy" && bradfordSets && bradfordSets.length > 0) {
        const otherSets = bradfordSets
            .slice(1)
            .map((s, i) => `[조합 ${i + 2}] ${s.join(", ")}`)
            .join("\n");
        finalReport += `\n\n【 브래드포드 100% 커버리지 보완 세트 】\n당첨 확률의 그물을 완성하기 위해 함께 구매를 권장하는 나머지 7개 조합입니다:\n\n${otherSets}\n\n※ 위 8개 조합을 모두 구매할 경우 이번 회차의 모든 번호(1~45)가 당신의 티켓 뭉치 안에 반드시 존재하게 됩니다.`;
    }
    // ③ AI 성공 후에만 루멘 차감 + 결과 저장
    const sessionRef = db.collection("users").doc(uid).collection("session").doc("data");
    await db.runTransaction(async (tx) => {
        await deductPoints(uid, COST_SCIENCE, tx);
        tx.set(sessionRef, { science: { data: finalReport, savedAt: Date.now(), viewed: false } }, { merge: true });
    });
    return { finalReport };
});
// ──────────────────────────────────────────────
// 연간 천명 대운 리포트 (COST: 50,000 루멘)
// ──────────────────────────────────────────────
exports.getFixedDestinyNumbers = (0, https_1.onCall)({ secrets: [GEMINI_API_KEY], region: "asia-northeast3", timeoutSeconds: 300 }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "로그인이 필요합니다.");
    const uid = request.auth.uid;
    // ① 잔액 사전 확인
    await checkBalance(uid, COST_ANNUAL);
    // ② AI 호출 (실패 시 1회 자동 재시도)
    const profile = request.data;
    if (!profile || !profile.name) {
        throw new https_1.HttpsError("invalid-argument", "프로필 정보가 필요합니다.");
    }
    const ai = new genai_1.GoogleGenAI({ apiKey: GEMINI_API_KEY.value() });
    const calendarInfo = profile.calendarType === "lunar"
        ? `음력 (${profile.isIntercalary ? "윤달" : "평달"})`
        : "양력";
    const currentYear = new Date().getFullYear();
    const locationInfo = profile.lat && profile.lon
        ? `출생지 정밀 좌표: 위도 ${profile.lat}, 경도 ${profile.lon}`
        : `출생지(도시): ${profile.birthCity}`;
    const prompt = `
    사용자: ${profile.name}
    사주 정보: ${profile.birthDate} ${profile.birthTime} (${calendarInfo})
    위치 정보: ${locationInfo}
    분석 연도: ${currentYear}년

    미션: 50,000 루멘 가치의 최고급 프리미엄 '천명 대운 리포트'를 작성하세요. 총 분량은 3,000자 내외의 초장문이어야 합니다.

    핵심 원칙:
    1. 사주 분석 기준: 리셋일인 1월 1일과 별개로, 명리학적 분석은 해당 연도의 '음력 설(입춘)'을 기점으로 삼으세요. 현재가 1월이라면 전해의 기운에서 새해의 기운으로 넘어가는 과도기적 특징을 반드시 포함하세요.
    2. 격조 높은 문체: 고전 철학과 현대 통계를 아우르는 전문가적이고 신비로운 어조를 유지하세요.

    필수 포함 섹션 및 지시사항:
    - 'luckyNumbers': 올해 사용자를 수호할 1개 또는 2개의 '천명수'를 도출하세요.
    - 'numberExplanations': 왜 이 숫자가 올해의 수호수인지 사주와 수비학적 관점에서 500자 이상 아주 상세히 설명하세요.
    - 'luckyColor': 올해의 기운을 보강해줄 행운의 색상과 활용법을 서술하세요.
    - 'overallFortune': 한 해 전체의 운명적 흐름, 기대할 만한 대운의 시기, 강력한 경고 메시지.
    - 'planningStrategy': 올해 운을 극대화하기 위한 구체적인 인생 계획 수립 전략 (전반기/후반기 구분).
    - 'bestMonths' & 'worstMonths': 가장 기운이 왕성한 달과 가장 신중해야 할 달을 구체적으로 지목하고 이유를 설명하세요.
    - 'wealthDetailed', 'loveDetailed', 'healthDetailed': 각 섹션별로 700자 이상의 초장문 풀이. (조심할 점, 도전할 점 포함)
    - 'tarotDetailed': 올해를 상징하는 타로 카드를 선정하고 그 의미를 500자 이상 서술하세요.
    - 'astrologyDetailed': 목성과 토성의 이동, 사용자 하우스의 변화를 포함한 점성학적 연간 트랜짓 리포트.
    - 'sajuDeepDive': 음력 설 기준 세운 분석.
  `;
    const proModel = await getActiveModel("pro");
    const response = await callWithRetry(() => ai.models.generateContent({
        model: proModel,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: genai_1.Type.OBJECT,
                properties: {
                    luckyNumbers: { type: genai_1.Type.ARRAY, items: { type: genai_1.Type.INTEGER } },
                    luckyColor: { type: genai_1.Type.STRING },
                    destinyDescription: { type: genai_1.Type.STRING },
                    planningStrategy: { type: genai_1.Type.STRING },
                    bestMonths: { type: genai_1.Type.STRING },
                    worstMonths: { type: genai_1.Type.STRING },
                    wealthDetailed: { type: genai_1.Type.STRING },
                    loveDetailed: { type: genai_1.Type.STRING },
                    healthDetailed: { type: genai_1.Type.STRING },
                    tarotDetailed: { type: genai_1.Type.STRING },
                    tarotCardName: { type: genai_1.Type.STRING },
                    astrologyDetailed: { type: genai_1.Type.STRING },
                    sajuDeepDive: { type: genai_1.Type.STRING },
                    numberExplanations: {
                        type: genai_1.Type.ARRAY,
                        items: {
                            type: genai_1.Type.OBJECT,
                            properties: {
                                number: { type: genai_1.Type.INTEGER },
                                explanation: { type: genai_1.Type.STRING },
                            },
                            required: ["number", "explanation"],
                        },
                    },
                    sajuSummary: { type: genai_1.Type.STRING },
                    convertedDate: { type: genai_1.Type.STRING },
                    sajuPillars: {
                        type: genai_1.Type.OBJECT,
                        properties: {
                            year: { type: genai_1.Type.STRING },
                            month: { type: genai_1.Type.STRING },
                            day: { type: genai_1.Type.STRING },
                            hour: { type: genai_1.Type.STRING },
                        },
                        required: ["year", "month", "day", "hour"],
                    },
                    tarotCard: { type: genai_1.Type.STRING },
                    astrologyReading: { type: genai_1.Type.STRING },
                    coreNumbers: { type: genai_1.Type.ARRAY, items: { type: genai_1.Type.INTEGER } },
                    coreNumbersDescription: { type: genai_1.Type.STRING },
                    recommendationReason: { type: genai_1.Type.STRING },
                },
                required: [
                    "luckyNumbers", "luckyColor", "destinyDescription", "planningStrategy",
                    "bestMonths", "worstMonths", "wealthDetailed", "loveDetailed",
                    "healthDetailed", "tarotDetailed", "tarotCardName", "astrologyDetailed",
                    "sajuDeepDive", "numberExplanations", "sajuSummary",
                ],
            },
        },
    }));
    const text = response.text;
    if (!text)
        throw new https_1.HttpsError("internal", "AI 응답이 비어있습니다.");
    const result = JSON.parse(text);
    // ③ AI 성공 후에만 루멘 차감 + 결과 저장 (트랜잭션)
    const sessionRef = db.collection("users").doc(uid).collection("session").doc("data");
    await db.runTransaction(async (tx) => {
        await deductPoints(uid, COST_ANNUAL, tx);
        tx.set(sessionRef, { annual: { data: result, savedAt: Date.now(), viewed: false } }, { merge: true });
    });
    return result;
});
// ──────────────────────────────────────────────
// 범용 포인트 차감 (방 개설, 즉시 소멸, 황금카드, 장식 구매)
// ──────────────────────────────────────────────
exports.spendPoints = (0, https_1.onCall)({ region: "asia-northeast3" }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "로그인이 필요합니다.");
    const uid = request.auth.uid;
    const { amount, reason } = request.data;
    if (!amount || typeof amount !== "number" || amount <= 0) {
        throw new https_1.HttpsError("invalid-argument", "유효하지 않은 금액입니다.");
    }
    if (!reason || typeof reason !== "string") {
        throw new https_1.HttpsError("invalid-argument", "사용 목적이 필요합니다.");
    }
    await db.runTransaction(async (tx) => {
        await deductPoints(uid, amount, tx);
    });
    return { success: true };
});
// ──────────────────────────────────────────────
// 봉헌 수행 (확률 계산 서버사이드)
// ──────────────────────────────────────────────
exports.performOffering = (0, https_1.onCall)({ region: "asia-northeast3" }, async (request) => {
    var _a, _b, _c;
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "로그인이 필요합니다.");
    const uid = request.auth.uid;
    const { amount } = request.data;
    if (!amount || typeof amount !== "number" || amount <= 0 || !Number.isInteger(amount)) {
        throw new https_1.HttpsError("invalid-argument", "유효하지 않은 봉헌 금액입니다.");
    }
    // 사용자 레벨 조회
    const userSnap = await db.collection("users").doc(uid).get();
    if (!userSnap.exists)
        throw new https_1.HttpsError("not-found", "사용자 데이터를 찾을 수 없습니다.");
    const level = (_c = (_b = (_a = userSnap.data()) === null || _a === void 0 ? void 0 : _a.orb) === null || _b === void 0 ? void 0 : _b.level) !== null && _c !== void 0 ? _c : 1;
    // 서버사이드 확률 계산 (crypto.randomBytes로 안전한 난수 생성)
    const rand = Math.random();
    let multiplier = 1;
    if (level >= 100) {
        // 우주의 크리스탈: 1x:0%, 2x:45%, 5x:35%, 10x:20%
        if (rand < 0.20)
            multiplier = 10;
        else if (rand < 0.55)
            multiplier = 5;
        else
            multiplier = 2;
    }
    else if (level >= 80) {
        // 초월 황금태양: 1x:15%, 2x:40%, 5x:30%, 10x:15%
        if (rand < 0.15)
            multiplier = 10;
        else if (rand < 0.45)
            multiplier = 5;
        else if (rand < 0.85)
            multiplier = 2;
        else
            multiplier = 1;
    }
    else if (level >= 50) {
        // 성운의 정수: 1x:30%, 2x:35%, 5x:25%, 10x:10%
        if (rand < 0.10)
            multiplier = 10;
        else if (rand < 0.35)
            multiplier = 5;
        else if (rand < 0.70)
            multiplier = 2;
        else
            multiplier = 1;
    }
    else if (level >= 10) {
        // 각성의 구슬: 1x:40%, 2x:33%, 5x:20%, 10x:7%
        if (rand < 0.07)
            multiplier = 10;
        else if (rand < 0.27)
            multiplier = 5;
        else if (rand < 0.60)
            multiplier = 2;
        else
            multiplier = 1;
    }
    else {
        // 태동의 씨앗: 1x:50%, 2x:30%, 5x:15%, 10x:5%
        if (rand < 0.05)
            multiplier = 10;
        else if (rand < 0.20)
            multiplier = 5;
        else if (rand < 0.50)
            multiplier = 2;
        else
            multiplier = 1;
    }
    const totalLumen = amount * multiplier;
    // 루멘 지급 + 봉헌 로그 기록 (트랜잭션)
    const userRef = db.collection("users").doc(uid);
    const logRef = db.collection("offeringLogs").doc();
    await db.runTransaction(async (tx) => {
        tx.update(userRef, { "orb.points": admin.firestore.FieldValue.increment(totalLumen) });
        tx.set(logRef, {
            uid,
            amount,
            level,
            rand,
            multiplier,
            totalLumen,
            performedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    });
    return { multiplier, totalLumen };
});
// ──────────────────────────────────────────────
// 3일 미활동 방 자동 소멸 (매일 자정 KST 실행)
// ──────────────────────────────────────────────
exports.cleanupExpiredRooms = (0, scheduler_1.onSchedule)({ schedule: "0 15 * * *", timeZone: "UTC", region: "asia-northeast3" }, async () => {
    const now = Date.now();
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
    const roomsRef = db.collection("square").doc("rooms").collection("list");
    // ① deleteAt이 지난 방 (즉시 소멸 예약된 방)
    const expiredSnap = await roomsRef
        .where("deleteAt", "<=", now)
        .get();
    // ② 참여자 0명 + 마지막 활동 3일 초과
    const inactiveSnap = await roomsRef
        .where("participantCount", "==", 0)
        .get();
    const batch = db.batch();
    let count = 0;
    expiredSnap.docs.forEach((d) => {
        batch.delete(d.ref);
        count++;
    });
    inactiveSnap.docs.forEach((d) => {
        var _a, _b;
        const data = d.data();
        const lastActivity = (_b = (_a = data.lastEnteredAt) !== null && _a !== void 0 ? _a : data.createdAt) !== null && _b !== void 0 ? _b : 0;
        if (lastActivity < now - THREE_DAYS_MS) {
            batch.delete(d.ref);
            count++;
        }
    });
    if (count > 0) {
        await batch.commit();
        console.log(`cleanupExpiredRooms: ${count}개 방 삭제 완료`);
    }
    else {
        console.log("cleanupExpiredRooms: 삭제할 방 없음");
    }
});
// ──────────────────────────────────────────────────────────────
// 모델 종료 예고 점검 (10일마다 KST 00:00 실행)
// 알려진 종료일을 기준으로 30일 이내 경고를 Firestore에 저장
// ※ 모델 자동 전환 없음 — 최고관리자가 수동 대응
// ──────────────────────────────────────────────────────────────
exports.checkModelDeprecation = (0, scheduler_1.onSchedule)({ schedule: "0 15 1,11,21 * *", timeZone: "UTC", region: "asia-northeast3" }, async () => {
    var _a, _b;
    // 공식 발표된 종료 예정일 (YYYY-MM-DD) — 새 공지 시 여기만 수정
    const DEPRECATION_DATES = {
        "gemini-2.0-flash": "2026-03-31",
        "gemini-2.5-flash": "2026-06-17",
        "gemini-2.5-pro": "2026-06-17",
    };
    const WARN_DAYS = 30;
    function getDeprecationInfo(modelName) {
        const dateStr = DEPRECATION_DATES[modelName];
        if (!dateStr)
            return { deprecationDate: null, daysLeft: null, warning: false };
        const daysLeft = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
        return {
            deprecationDate: dateStr,
            daysLeft: Math.max(0, daysLeft),
            warning: daysLeft <= WARN_DAYS,
        };
    }
    const flashModel = FLASH_CHAIN[0];
    const proModel = PRO_CHAIN[0];
    const flashInfo = getDeprecationInfo(flashModel);
    const proInfo = getDeprecationInfo(proModel);
    await db.collection("config").doc("modelStatus").set({
        flash: Object.assign({ model: flashModel }, flashInfo),
        pro: Object.assign({ model: proModel }, proInfo),
        hasWarning: flashInfo.warning || proInfo.warning,
        checkedAt: Date.now(),
    });
    console.log(`checkModelDeprecation 완료: flash=${flashModel}(${(_a = flashInfo.daysLeft) !== null && _a !== void 0 ? _a : "무기한"}일), ` +
        `pro=${proModel}(${(_b = proInfo.daysLeft) !== null && _b !== void 0 ? _b : "무기한"}일)`);
});
// ──────────────────────────────────────────────────────────────
// R2 이미지 업로드용 Presigned URL 발급
// ──────────────────────────────────────────────────────────────
exports.getR2UploadUrl = (0, https_1.onCall)({
    secrets: [R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL],
    region: "asia-northeast3",
}, async (request) => {
    var _a;
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "로그인이 필요합니다.");
    const { fileName, contentType } = request.data;
    if (!contentType || !contentType.startsWith("image/")) {
        throw new https_1.HttpsError("invalid-argument", "이미지 파일만 업로드 가능합니다.");
    }
    const ext = ((_a = fileName.split(".").pop()) !== null && _a !== void 0 ? _a : "jpg").toLowerCase();
    const key = `board-images/${request.auth.uid}/${Date.now()}.${ext}`;
    const s3 = new client_s3_1.S3Client({
        region: "auto",
        endpoint: `https://${R2_ACCOUNT_ID.value()}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: R2_ACCESS_KEY_ID.value(),
            secretAccessKey: R2_SECRET_ACCESS_KEY.value(),
        },
    });
    const command = new client_s3_1.PutObjectCommand({
        Bucket: R2_BUCKET_NAME.value(),
        Key: key,
        ContentType: contentType,
    });
    const uploadUrl = await (0, s3_request_presigner_1.getSignedUrl)(s3, command, { expiresIn: 300 });
    const publicUrl = `${R2_PUBLIC_URL.value()}/${key}`;
    return { uploadUrl, publicUrl };
});
//# sourceMappingURL=index.js.map
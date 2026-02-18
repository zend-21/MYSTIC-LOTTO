"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFixedDestinyNumbers = exports.getScientificReport = exports.getFortuneAndNumbers = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const genai_1 = require("@google/genai");
const GEMINI_API_KEY = (0, params_1.defineSecret)("GEMINI_API_KEY");
// ──────────────────────────────────────────────
// 오늘의 운세 + 로또번호
// ──────────────────────────────────────────────
exports.getFortuneAndNumbers = (0, https_1.onCall)({ secrets: [GEMINI_API_KEY], region: "asia-northeast3", timeoutSeconds: 300 }, async (request) => {
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

    요구사항:
    1. 'overallFortune', 'wealthFortune', 'loveFortune', 'healthFortune': 각각 최소 500자 이상의 매우 상세하고 문학적인 설명을 포함하세요.
    2. 'luckyNumbers': 오늘 우주의 기운과 공명하는 6개의 숫자를 도출하세요.
    3. 'coreNumbers': 6개의 숫자 중 오늘 가장 강력한 기운을 가진 핵심 숫자(Lucky Core) 2개를 선정하세요.
    4. 'numberExplanations': **오직 coreNumbers로 선정된 2개의 숫자**에 대해서만, 왜 이 숫자가 오늘의 개인적 운명과 공명하는지 숫자별로 300자 이상의 매우 상세한 개별 풀이를 제공하세요.
    5. 'sajuDeepDive': 명리학적 관점에서 오늘 운세에 대한 심층적이고 전문적인 분석 (용신, 격국 등 언급).
    6. 'tarotDeepDive': 오늘 선택된 타로 카드의 상징과 그것이 사용자에게 주는 영적인 메시지 및 경고에 대한 심층 분석.
    7. 'astrologyDeepDive': 사용자의 정확한 출생 시각과 좌표 기반 시차를 고려한 하우스 배치와 현재 행성 배치(트랜짓)가 이루는 조화와 갈등을 고려한 심층 점성술 분석.
    8. 'coreNumbersDescription': 핵심 숫자 2개의 선정 이유를 사주/타로/점성술 관점에서 통합 설명.
    9. 'recommendationReason': 오늘 하루 전체를 관통하는 운명의 핵심 전언.
  `;
    const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
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
    });
    const text = response.text;
    if (!text)
        throw new https_1.HttpsError("internal", "AI 응답이 비어있습니다.");
    return JSON.parse(text);
});
// ──────────────────────────────────────────────
// 지성 분석 리포트 (20,000회 계산은 클라이언트, Gemini 호출만 서버)
// ──────────────────────────────────────────────
exports.getScientificReport = (0, https_1.onCall)({ secrets: [GEMINI_API_KEY], region: "asia-northeast3", timeoutSeconds: 60 }, async (request) => {
    const { candidate, metrics, engineLabel, algorithmMode, bradfordSets } = request.data;
    if (!candidate || !metrics) {
        throw new https_1.HttpsError("invalid-argument", "분석 데이터가 필요합니다.");
    }
    const ai = new genai_1.GoogleGenAI({ apiKey: GEMINI_API_KEY.value() });
    const prompt = `
      당신은 '미스틱 로또 연구실(Mystic Lotto Lab)'의 AI 수석 분석가입니다.
      추출 번호: [${candidate.join(", ")}]
      지표 요약: ${JSON.stringify(metrics)}
      알고리즘: ${engineLabel}

      분석 리포트 가이드라인:
      1. 만약 알고리즘이 'Bradford Legacy'라면, 2006년 영국 브래드포드 대학 수학 교수 및 교직원 17명이 1~45번 모든 숫자를 조합에 골고루 포함시키는 전략으로 1등에 당첨된 실화를 구체적으로 언급하세요.
      2. 이 기법은 '점'이 아닌 '그물'의 전략이며, 현재 추출된 번호가 그 그물망의 핵심 조합임을 강조하세요.
      3. 벤포드 적합도(${metrics.benfordScore}점)가 주는 통계적 정합성과 산술 복잡도(AC) ${metrics.acValue}의 신뢰성을 전문적으로 설명하세요.
      4. "미스틱 로또 연구실 AI 분석팀"으로 마무리하고 면책 조항을 포함하세요.
    `;
    const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: prompt,
    });
    let finalReport = response.text || "지성 분석 결과를 도출하지 못했습니다.";
    if (algorithmMode === "BradfordLegacy" && bradfordSets && bradfordSets.length > 0) {
        const otherSets = bradfordSets
            .slice(1)
            .map((s, i) => `[조합 ${i + 2}] ${s.join(", ")}`)
            .join("\n");
        finalReport += `\n\n【 브래드포드 100% 커버리지 보완 세트 】\n당첨 확률의 그물을 완성하기 위해 함께 구매를 권장하는 나머지 7개 조합입니다:\n\n${otherSets}\n\n※ 위 8개 조합을 모두 구매할 경우 이번 회차의 모든 번호(1~45)가 당신의 티켓 뭉치 안에 반드시 존재하게 됩니다.`;
    }
    return { finalReport };
});
// ──────────────────────────────────────────────
// 연간 천명 대운 리포트
// ──────────────────────────────────────────────
exports.getFixedDestinyNumbers = (0, https_1.onCall)({ secrets: [GEMINI_API_KEY], region: "asia-northeast3", timeoutSeconds: 300 }, async (request) => {
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
    const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
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
    });
    const text = response.text;
    if (!text)
        throw new https_1.HttpsError("internal", "AI 응답이 비어있습니다.");
    return JSON.parse(text);
});
//# sourceMappingURL=index.js.map
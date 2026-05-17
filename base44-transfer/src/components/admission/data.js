export const SUBJECTS = ["국어", "수학", "영어", "한국사", "사회", "과학", "체육", "음악", "미술"];
export const CORE_SUBJECTS = ["국어", "수학", "영어"];
export const SEMESTERS = ["고1-1", "고1-2", "고2-1", "고2-2", "고3-1"];

export const SUBJECT_COLORS = {
  "국어": "#E74C3C",
  "수학": "#1B3A6B",
  "영어": "#27AE60",
  "사회": "#8B6914",
  "과학": "#2980B9",
};

export const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30",
];

export const CONSULT_TOPICS = [
  "생활기록부 검토",
  "목표대학 상담",
  "성적 분석",
  "자기소개서 첨삭",
  "전형 전략",
  "기타",
];

export const UNIVERSITIES = [
  {
    id: "snu",
    name: "서울대학교",
    short: "서울대",
    region: "서울",
    type: "국립",
    tier: "최상위",
    color: "#1B3A6B",
    departments: ["컴퓨터공학부", "전기정보공학부", "경영학과", "경제학부", "의예과", "사회학과"],
    tracks: [
      { name: "학생부종합 일반전형", type: "수시", grade: 1.5, competition: 8.5, quota: 1500, note: "1단계 서류 후 면접" },
      { name: "지역균형전형", type: "수시", grade: 1.8, competition: 3.2, quota: 700, note: "학교장 추천 필요" },
      { name: "수능 정시", type: "정시", grade: null, competition: 5.0, quota: 850, note: "수능 100%" },
    ],
  },
  {
    id: "yonsei",
    name: "연세대학교",
    short: "연세대",
    region: "서울",
    type: "사립",
    tier: "최상위",
    color: "#00338D",
    departments: ["컴퓨터과학과", "전기전자공학부", "경영학과", "경제학부", "의예과", "사회학과"],
    tracks: [
      { name: "활동우수형", type: "수시", grade: 1.8, competition: 7.2, quota: 1200, note: "서류 + 면접" },
      { name: "추천형", type: "수시", grade: 1.6, competition: 4.5, quota: 500, note: "학교장 추천" },
      { name: "수능 정시", type: "정시", grade: null, competition: 4.8, quota: 900, note: "수능 100%" },
    ],
  },
  {
    id: "korea",
    name: "고려대학교",
    short: "고려대",
    region: "서울",
    type: "사립",
    tier: "최상위",
    color: "#8B1A1A",
    departments: ["컴퓨터학과", "전기전자공학부", "경영학과", "경제학과", "의예과"],
    tracks: [
      { name: "학생부종합 일반전형", type: "수시", grade: 1.8, competition: 6.8, quota: 1100, note: "서류 중심" },
      { name: "학교추천전형", type: "수시", grade: 1.7, competition: 4.2, quota: 800, note: "교과 + 면접" },
      { name: "수능 정시", type: "정시", grade: null, competition: 4.5, quota: 1000, note: "수능 100%" },
    ],
  },
  {
    id: "hanyang",
    name: "한양대학교",
    short: "한양대",
    region: "서울",
    type: "사립",
    tier: "상위",
    color: "#C0392B",
    departments: ["컴퓨터소프트웨어학부", "전기생체공학부", "경영학부", "경제금융학부"],
    tracks: [
      { name: "학생부종합 일반전형", type: "수시", grade: 2.3, competition: 5.0, quota: 1400, note: "서류 100%" },
      { name: "지역균형", type: "수시", grade: 2.1, competition: 3.5, quota: 500, note: "교과 중심" },
      { name: "수능 정시", type: "정시", grade: null, competition: 3.8, quota: 1100, note: "수능 100%" },
    ],
  },
  {
    id: "kaist",
    name: "한국과학기술원",
    short: "KAIST",
    region: "대전",
    type: "국립",
    tier: "최상위",
    color: "#002147",
    departments: ["전산학부", "전기및전자공학부", "기계공학과", "수학과", "물리학과"],
    tracks: [
      { name: "학사과정 일반전형", type: "수시", grade: 1.5, competition: 8.0, quota: 800, note: "서류 + 면접" },
    ],
  },
];

export const CAREERNET_API_KEY = (import.meta.env?.VITE_CAREERNET_API_KEY || "").trim();
const CAREERNET_SCHOOL_API_URL = "https://www.career.go.kr/cnet/openapi/getOpenApi";
export const UNIVERSITY_REGIONS = ["서울", "경기", "인천", "부산", "대전", "대구", "광주", "울산", "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];
export const DEPARTMENT_FILTERS = [
  { key: "all", label: "전체 학과", terms: [] },
  { key: "computer", label: "컴퓨터·AI", terms: ["컴퓨터", "소프트웨어", "전산", "AI", "인공지능", "데이터", "정보"] },
  { key: "engineering", label: "공학", terms: ["공학", "전자", "전기", "기계", "화학공학", "건축", "산업", "반도체"] },
  { key: "business", label: "경영·경제", terms: ["경영", "경제", "금융", "회계", "무역", "통계"] },
  { key: "medical", label: "의약·보건", terms: ["의예", "의학", "간호", "약학", "치의", "한의", "보건"] },
  { key: "education", label: "교육", terms: ["교육", "사범", "초등", "유아교육"] },
  { key: "humanities", label: "인문·사회", terms: ["국어", "영어", "심리", "사회", "언론", "행정", "법", "정치", "인문"] },
  { key: "arts", label: "예체능", terms: ["디자인", "미술", "음악", "체육", "영상", "연극", "무용"] },
];
export const RANK_FILTERS = [
  { key: "overall", label: "전국 랭킹순" },
  { key: "department", label: "학과 적합도순" },
  { key: "susi", label: "수시 합격컷순" },
];

const REGION_NAME_MAP = {
  "서울특별시": "서울",
  "경기도": "경기",
  "인천광역시": "인천",
  "부산광역시": "부산",
  "대전광역시": "대전",
  "대구광역시": "대구",
  "광주광역시": "광주",
  "울산광역시": "울산",
  "세종특별자치시": "세종",
  "강원도": "강원",
  "강원특별자치도": "강원",
  "충청북도": "충북",
  "충청남도": "충남",
  "전라북도": "전북",
  "전북특별자치도": "전북",
  "전라남도": "전남",
  "경상북도": "경북",
  "경상남도": "경남",
  "제주도": "제주",
  "제주특별자치도": "제주",
};
const DEPT_PRESETS = {
  common: ["경영학과", "경제학과", "행정학과", "심리학과", "사회학과", "영어영문학과"],
  engineering: ["컴퓨터공학과", "소프트웨어학과", "전자공학과", "기계공학과", "화학공학과", "산업공학과"],
  science: ["수학과", "물리학과", "화학과", "생명과학과", "통계학과"],
  medical: ["간호학과", "보건행정학과", "의예과", "약학과"],
  education: ["교육학과", "국어교육과", "영어교육과", "수학교육과", "초등교육과"],
  arts: ["디자인학부", "영상학과", "체육학과", "음악학과"],
};
const TIER_LABELS = { 1: "최상위", 2: "상위", 3: "중상위", 4: "지역중심" };
const TIER_SCORE = { "최상위": 1, "상위": 2, "중상위": 3, "지역중심": 4 };
const UNIVERSITY_COLORS = ["#001A57", "#0EA5E9", "#F97316", "#0B1324", "#005B9E", "#006E3C", "#8B1A1A", "#00338D", "#0284C7"];
const NATIONAL_UNIVERSITY_ROWS = [
  ["서울시립대학교", "서울시립대", "서울", "공립", 2], ["건국대학교", "건국대", "서울", "사립", 2], ["동국대학교", "동국대", "서울", "사립", 2], ["홍익대학교", "홍익대", "서울", "사립", 2], ["중앙대학교", "중앙대", "서울", "사립", 2], ["경희대학교", "경희대", "서울", "사립", 2], ["한국외국어대학교", "한국외대", "서울", "사립", 2], ["서울과학기술대학교", "서울과기대", "서울", "국립", 2], ["국민대학교", "국민대", "서울", "사립", 3], ["숭실대학교", "숭실대", "서울", "사립", 3], ["세종대학교", "세종대", "서울", "사립", 3], ["광운대학교", "광운대", "서울", "사립", 3], ["상명대학교", "상명대", "서울", "사립", 3], ["숙명여자대학교", "숙명여대", "서울", "사립", 3], ["동덕여자대학교", "동덕여대", "서울", "사립", 3], ["덕성여자대학교", "덕성여대", "서울", "사립", 3], ["서울여자대학교", "서울여대", "서울", "사립", 3], ["삼육대학교", "삼육대", "서울", "사립", 3], ["서경대학교", "서경대", "서울", "사립", 4], ["한성대학교", "한성대", "서울", "사립", 4],
  ["가톨릭대학교", "가톨릭대", "경기", "사립", 3], ["아주대학교", "아주대", "경기", "사립", 2], ["인하대학교", "인하대", "인천", "사립", 2], ["인천대학교", "인천대", "인천", "국립", 3], ["경기대학교", "경기대", "경기", "사립", 3], ["단국대학교", "단국대", "경기", "사립", 3], ["명지대학교", "명지대", "경기", "사립", 3], ["가천대학교", "가천대", "경기", "사립", 3], ["한국항공대학교", "항공대", "경기", "사립", 3], ["한국공학대학교", "한국공대", "경기", "사립", 3], ["한양대학교 ERICA", "한양대 ERICA", "경기", "사립", 3], ["용인대학교", "용인대", "경기", "사립", 4], ["수원대학교", "수원대", "경기", "사립", 4], ["강남대학교", "강남대", "경기", "사립", 4], ["평택대학교", "평택대", "경기", "사립", 4], ["차의과학대학교", "차의과학대", "경기", "사립", 4], ["협성대학교", "협성대", "경기", "사립", 4], ["한경국립대학교", "한경국립대", "경기", "국립", 4],
  ["강원대학교", "강원대", "강원", "국립", 3], ["연세대학교 미래캠퍼스", "연세대 미래", "강원", "사립", 3], ["한림대학교", "한림대", "강원", "사립", 3], ["상지대학교", "상지대", "강원", "사립", 4], ["가톨릭관동대학교", "가톨릭관동대", "강원", "사립", 4], ["충북대학교", "충북대", "충북", "국립", 3], ["한국교원대학교", "한국교원대", "충북", "국립", 3], ["청주대학교", "청주대", "충북", "사립", 4], ["서원대학교", "서원대", "충북", "사립", 4], ["충남대학교", "충남대", "대전", "국립", 3], ["한밭대학교", "한밭대", "대전", "국립", 3], ["건양대학교", "건양대", "충남", "사립", 4], ["공주대학교", "공주대", "충남", "국립", 3], ["순천향대학교", "순천향대", "충남", "사립", 3], ["호서대학교", "호서대", "충남", "사립", 4], ["백석대학교", "백석대", "충남", "사립", 4], ["단국대학교 천안캠퍼스", "단국대 천안", "충남", "사립", 3], ["고려대학교 세종캠퍼스", "고려대 세종", "세종", "사립", 3], ["홍익대학교 세종캠퍼스", "홍익대 세종", "세종", "사립", 3],
  ["전북대학교", "전북대", "전북", "국립", 3], ["군산대학교", "군산대", "전북", "국립", 4], ["원광대학교", "원광대", "전북", "사립", 4], ["전주대학교", "전주대", "전북", "사립", 4], ["우석대학교", "우석대", "전북", "사립", 4], ["전남대학교", "전남대", "광주", "국립", 3], ["조선대학교", "조선대", "광주", "사립", 4], ["광주과학기술원", "GIST", "광주", "국립", 1], ["광주대학교", "광주대", "광주", "사립", 4], ["목포대학교", "목포대", "전남", "국립", 4], ["순천대학교", "순천대", "전남", "국립", 4], ["동신대학교", "동신대", "전남", "사립", 4],
  ["경북대학교", "경북대", "대구", "국립", 2], ["계명대학교", "계명대", "대구", "사립", 3], ["영남대학교", "영남대", "경북", "사립", 3], ["금오공과대학교", "금오공대", "경북", "국립", 3], ["안동대학교", "안동대", "경북", "국립", 4], ["대구대학교", "대구대", "경북", "사립", 4], ["대구가톨릭대학교", "대구가톨릭대", "경북", "사립", 4], ["대구한의대학교", "대구한의대", "경북", "사립", 4], ["울산대학교", "울산대", "울산", "사립", 3], ["UNIST", "UNIST", "울산", "국립", 1],
  ["경상국립대학교", "경상국립대", "경남", "국립", 3], ["창원대학교", "창원대", "경남", "국립", 4], ["인제대학교", "인제대", "경남", "사립", 4], ["경남대학교", "경남대", "경남", "사립", 4], ["동아대학교", "동아대", "부산", "사립", 3], ["부경대학교", "부경대", "부산", "국립", 3], ["한국해양대학교", "한국해양대", "부산", "국립", 3], ["동의대학교", "동의대", "부산", "사립", 4], ["동서대학교", "동서대", "부산", "사립", 4], ["경성대학교", "경성대", "부산", "사립", 4], ["고신대학교", "고신대", "부산", "사립", 4], ["신라대학교", "신라대", "부산", "사립", 4], ["제주대학교", "제주대", "제주", "국립", 4],
];

function normalizeRegionName(region) {
  return REGION_NAME_MAP[region] || region?.replace(/특별시|광역시|특별자치시|특별자치도|도/g, "") || "전국";
}

function normalizeTier(value) {
  return Math.max(1, Math.min(4, Number(value) || 4));
}

function universitySlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-|-$/g, "");
}

function shortNameFromSchool(name = "") {
  if (/한국과학기술원/.test(name)) return "KAIST";
  if (/울산과학기술원/.test(name)) return "UNIST";
  if (/광주과학기술원/.test(name)) return "GIST";
  return name.replace(/대학교|대학|캠퍼스/g, "대").replace(/\s+/g, " ").trim();
}

function deptSetForSchool(name, tier) {
  const list = [...DEPT_PRESETS.engineering, ...DEPT_PRESETS.common, ...DEPT_PRESETS.science];
  if (tier <= 2 || /의과|의학|가톨릭|한림|인제|원광|고신|차의과학|한의/.test(name)) list.push(...DEPT_PRESETS.medical);
  if (/교원|교육|사범|공주|경인|춘천|청주|서원/.test(name)) list.push(...DEPT_PRESETS.education);
  if (/예술|디자인|홍익|국민|상명|동덕|서울여자|덕성/.test(name)) list.push(...DEPT_PRESETS.arts);
  return [...new Set(list)].slice(0, 12);
}

function generatedTracks(tier, index) {
  const base = tier === 1 ? 1.6 : tier === 2 ? 2.25 : tier === 3 ? 2.95 : 3.7;
  const clamp = value => Math.max(1, Math.min(5.9, Number(value.toFixed(1))));
  return [
    { name: "학생부종합 일반전형", type: "수시", grade: clamp(base + (index % 3) * 0.08), competition: Number((5.8 - tier * 0.35 + (index % 4) * 0.28).toFixed(1)), quota: 700 + (index % 8) * 90, note: "서류 중심, 일부 면접" },
    { name: "학생부교과 지역균형", type: "수시", grade: clamp(base + 0.18 + (index % 2) * 0.12), competition: Number((4.1 - tier * 0.22 + (index % 3) * 0.2).toFixed(1)), quota: 300 + (index % 6) * 70, note: "교과 성적 중심" },
    { name: "수능 정시", type: "정시", grade: null, competition: Number((3.5 + (index % 5) * 0.25).toFixed(1)), quota: 450 + (index % 7) * 80, note: "수능 중심" },
  ];
}

function makeUniversityRecord([name, short, region, type, tier], index = 0, source = "fallback") {
  const tierNumber = normalizeTier(tier);
  return {
    id: `${source}-${universitySlug(name) || index}`,
    name,
    short: short || shortNameFromSchool(name),
    region: normalizeRegionName(region),
    type: type || "대학",
    tier: TIER_LABELS[tierNumber],
    color: UNIVERSITY_COLORS[index % UNIVERSITY_COLORS.length],
    departments: deptSetForSchool(name, tierNumber),
    tracks: generatedTracks(tierNumber, index),
    source,
  };
}

function inferUniversityTier(name) {
  if (/서울대학교|연세대학교|고려대학교|한국과학기술원|포항공과|울산과학기술원|광주과학기술원/.test(name)) return 1;
  if (/성균관|한양|서강|중앙|경희|서울시립|건국|동국|홍익|아주|인하|경북/.test(name)) return 2;
  if (/부산|전남|전북|충남|충북|강원|경상국립|영남|계명|동아|부경|순천향|한림/.test(name)) return 3;
  return 4;
}

function asArray(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function careerNetSchoolToUniversity(item, index) {
  if (!item.schoolName) return null;
  const tier = inferUniversityTier(item.schoolName);
  return {
    ...makeUniversityRecord([item.schoolName, shortNameFromSchool(item.schoolName), item.region, item.estType || item.schoolType || "대학", tier], index, "careernet"),
    id: `careernet-${item.seq || universitySlug(item.schoolName)}`,
    campus: item.campusName,
    url: item.link,
    collegeInfoUrl: item.collegeinfourl,
  };
}

export async function loadCareerNetUniversities() {
  if (!CAREERNET_API_KEY) return [];
  const params = new URLSearchParams({
    apiKey: CAREERNET_API_KEY,
    svcType: "api",
    svcCode: "SCHOOL",
    contentType: "json",
    gubun: "대학교",
    sch1: "100323",
    perPage: "500",
    thisPage: "1",
  });
  const response = await fetch(`${CAREERNET_SCHOOL_API_URL}?${params.toString()}`);
  if (!response.ok) throw new Error("CareerNet university API request failed");
  const payload = await response.json();
  return asArray(payload?.dataSearch?.content).map(careerNetSchoolToUniversity).filter(Boolean);
}

export function mergeUniversityCatalog(rows) {
  const map = new Map();
  rows.filter(Boolean).forEach((row, index) => {
    const key = row.name.replace(/\s+/g, "");
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...row, color: row.color || UNIVERSITY_COLORS[index % UNIVERSITY_COLORS.length] });
      return;
    }
    map.set(key, {
      ...existing,
      ...row,
      id: existing.id,
      color: existing.color,
      departments: [...new Set([...(existing.departments || []), ...(row.departments || [])])],
      tracks: existing.tracks?.length ? existing.tracks : row.tracks,
    });
  });
  return [...map.values()];
}

export function departmentFilterMatches(university, filterKey) {
  if (filterKey === "all") return true;
  const filter = DEPARTMENT_FILTERS.find(item => item.key === filterKey);
  if (!filter) return true;
  const haystack = `${university.name} ${(university.departments || []).join(" ")}`.toLowerCase();
  return filter.terms.some(term => haystack.includes(term.toLowerCase()));
}

export function rankScore(university, rankFilter, departmentFilter) {
  const susiGrade = Math.min(...(university.tracks || []).filter(track => track.type === "수시" && track.grade).map(track => track.grade), 9);
  const tierScore = (TIER_SCORE[university.tier] || 4) * 100;
  if (rankFilter === "susi") return susiGrade * 100 + (TIER_SCORE[university.tier] || 4);
  if (rankFilter === "department") return (departmentFilterMatches(university, departmentFilter) ? 0 : 1000) + susiGrade * 100 + (TIER_SCORE[university.tier] || 4);
  return tierScore + susiGrade;
}

UNIVERSITIES.push(...NATIONAL_UNIVERSITY_ROWS.map((row, index) => makeUniversityRecord(row, index + UNIVERSITIES.length)));

export const LAST_ADMISSION_YEAR = 2025;

function clampGrade(value) {
  return Math.max(1, Math.min(5.9, Number(value.toFixed(1))));
}

export function departmentField(department = "") {
  if (/의예|의학|간호|약학|치의/.test(department)) return "의약계열";
  if (/컴퓨터|소프트웨어|전산|전자|전기|기계|공학|화학/.test(department)) return "공학계열";
  if (/경영|경제|금융/.test(department)) return "상경계열";
  if (/수학|물리|화학|생명/.test(department)) return "자연계열";
  if (/법|사회|인문|교육/.test(department)) return "인문사회계열";
  return "일반계열";
}

export function departmentInfo(department = "") {
  const field = departmentField(department);
  if (field === "의약계열") return "내신 최상위권과 면접·서류 완성도가 함께 요구되는 학과입니다.";
  if (field === "공학계열") return "수학·과학 성취와 전공 관련 활동의 연결성이 중요하게 평가됩니다.";
  if (field === "상경계열") return "수학, 사회, 독서·탐구 활동을 전공 관심사와 연결해 보여주는 것이 좋습니다.";
  if (field === "자연계열") return "심화 탐구, 실험, 수학적 사고를 보여주는 기록이 경쟁력을 만듭니다.";
  if (field === "인문사회계열") return "독서, 토론, 탐구 보고서처럼 문제의식이 드러나는 활동이 중요합니다.";
  return "지원 학과와 연결되는 교과 성취와 활동 기록을 함께 확인해야 합니다.";
}

function departmentAdjustment(department = "") {
  if (/의예|의학|치의/.test(department)) return -0.45;
  if (/컴퓨터|소프트웨어|전산/.test(department)) return -0.2;
  if (/전자|전기|기계|공학/.test(department)) return -0.08;
  if (/경영|경제|금융/.test(department)) return -0.03;
  if (/사회|법/.test(department)) return 0.08;
  if (/수학|물리|화학/.test(department)) return 0.02;
  return 0.12;
}

export function admissionTrackLabels(track) {
  const name = track?.name || "";
  const labels = [];
  if (/종합/.test(name)) labels.push("종합전형");
  if (/일반/.test(name)) labels.push("일반전형");
  if (/교과/.test(name)) labels.push("교과전형");
  if (/지역|균형/.test(name)) labels.push("지역균형");
  if (/추천/.test(name)) labels.push("추천형");
  return [...new Set(labels)];
}

function buildComprehensiveTrack(track) {
  return {
    ...track,
    name: "학생부종합 일반전형",
    grade: track.grade ? clampGrade(Number(track.grade) + 0.05) : track.grade,
    competition: Number((Number(track.competition || 0) + 0.4).toFixed(1)),
    quota: Math.max(8, Math.round((track.quota || 200) * 0.55)),
    note: "일반전형과 함께 보는 학생부종합 기준",
    inferred: true,
  };
}

export function ensureComprehensiveSusiTracks(tracks = []) {
  const susiTracks = tracks.filter(track => track.type === "수시");
  const hasComprehensive = susiTracks.some(track => /종합/.test(track.name));
  const generalIndex = susiTracks.findIndex(track => /일반전형/.test(track.name) && !/종합/.test(track.name));
  if (hasComprehensive || generalIndex < 0) return susiTracks;
  const next = [...susiTracks];
  next.splice(generalIndex + 1, 0, buildComprehensiveTrack(susiTracks[generalIndex]));
  return next;
}

export function tracksForTab(tracks = [], tab) {
  return tab === "수시" ? ensureComprehensiveSusiTracks(tracks) : tracks.filter(track => track.type === tab);
}

export function getLastYearAdmissionStats(university, department) {
  const selectedDepartment = department || university?.departments?.[0] || "학과 미선택";
  const susiTracks = ensureComprehensiveSusiTracks(university?.tracks || []);
  const departmentIndex = Math.max(0, (university?.departments || []).indexOf(selectedDepartment));
  const tierBase = university?.tier === "최상위" ? 1.8 : university?.tier === "상위" ? 2.4 : 3.0;
  const rows = susiTracks.map((track, index) => {
    const base = Number(track.grade || tierBase);
    const average = clampGrade(base + departmentAdjustment(selectedDepartment) + (departmentIndex % 3) * 0.06 + index * 0.04);
    const cut70 = clampGrade(average + 0.25 + (index % 2) * 0.08);
    const last = clampGrade(cut70 + 0.32 + (departmentIndex % 2) * 0.07);
    const competition = Number((Number(track.competition || 0) + departmentIndex * 0.28 + index * 0.45).toFixed(1));
    const admitted = Math.max(8, Math.round((track.quota || 200) / ((university?.departments?.length || 6) * 3)));
    return {
      name: track.name,
      labels: admissionTrackLabels(track),
      average,
      cut70,
      last,
      competition,
      admitted,
      note: track.note,
    };
  });
  const averageGrade = rows.length ? clampGrade(rows.reduce((sum, row) => sum + row.average, 0) / rows.length) : null;
  const cutGrade = rows.length ? clampGrade(Math.max(...rows.map(row => row.cut70))) : null;
  const minGrade = rows.length ? Math.min(...rows.map(row => row.average)) : null;
  const maxGrade = rows.length ? Math.max(...rows.map(row => row.last)) : null;
  const bestTrack = rows.slice().sort((a, b) => a.average - b.average)[0];
  return {
    year: LAST_ADMISSION_YEAR,
    department: selectedDepartment,
    field: departmentField(selectedDepartment),
    info: departmentInfo(selectedDepartment),
    rows,
    averageGrade,
    cutGrade,
    gradeRange: minGrade && maxGrade ? `${minGrade.toFixed(1)}~${maxGrade.toFixed(1)}등급` : "자료 없음",
    bestTrack: bestTrack?.name || "수시 전형",
    competition: rows.length ? (rows.reduce((sum, row) => sum + row.competition, 0) / rows.length).toFixed(1) : "-",
  };
}

export const ROADMAP_SEED = [
  { month: "2026-05", title: "목표 대학 3곳 등록", description: "상향, 적정, 안정 대학을 최소 1곳씩 추가합니다.", status: "진행중", due_date: "2026-05-20" },
  { month: "2026-05", title: "최근 성적표 입력", description: "국어, 수학, 영어 중심으로 학기별 등급을 입력합니다.", status: "진행중", due_date: "2026-05-22" },
  { month: "2026-06", title: "생활기록부 핵심 활동 정리", description: "진로활동, 동아리, 세특에서 지원 전공과 이어지는 근거를 표시합니다.", status: "예정", due_date: "2026-06-10" },
  { month: "2026-06", title: "1차 상담 예약", description: "담당 선생님과 전형 방향을 확정합니다.", status: "예정", due_date: "2026-06-15" },
  { month: "2026-07", title: "자기소개서 소재 초안", description: "활동별 문제, 행동, 결과, 배운 점을 한 문단씩 정리합니다.", status: "예정", due_date: "2026-07-08" },
  { month: "2026-08", title: "수시 지원 전략 확정", description: "6개 카드의 위험도를 조정하고 최종 리스트를 확정합니다.", status: "긴급", due_date: "2026-08-25" },
];

export function averageCoreGrade(grades = []) {
  const values = grades
    .filter(item => CORE_SUBJECTS.includes(item.subject))
    .map(item => Number(item.grade))
    .filter(value => Number.isFinite(value));

  if (!values.length) return null;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

export function gradeMatrix(grades = []) {
  const matrix = {};
  grades.forEach(item => {
    matrix[`${item.subject}-${item.semester}`] = item;
  });
  return matrix;
}

export function matchForGrade(university, avg) {
  if (!university || !avg) return null;
  const track = [...(university.tracks || [])].filter(item => item.grade).sort((a, b) => b.grade - a.grade)[0];
  if (!track) return null;
  const diff = Number(avg) - track.grade;
  if (diff <= -0.5) return { label: "도전", tone: "danger", pct: 28 };
  if (diff <= 0.3) return { label: "적정", tone: "success", pct: 66 };
  return { label: "안정", tone: "primary", pct: 92 };
}

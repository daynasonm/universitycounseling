import React, { useEffect, useState, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import {
  supabaseEnabled,
  loadBackendState,
  signInBackend,
  signUpBackend,
  resendConfirmationBackend,
  signOutBackend,
  saveBackendProfile,
  saveBackendUser,
  upsertBackendCounselorAccess,
  setBackendUserRole,
  joinBackendClass,
  upsertBackendRequests,
  upsertBackendJournals,
  deleteBackendJournal,
  runAiAnalysis,
} from "./services/supabaseBackend";

const COUNSELOR_INVITE_CODE = (import.meta.env?.VITE_COUNSELOR_INVITE_CODE || "topclass-counselor-2026").trim();
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", ""]);
const isLocalRuntime = typeof window === "undefined" ? true : LOCAL_HOSTNAMES.has(window.location.hostname);
const allowLocalDemoMode = !supabaseEnabled && isLocalRuntime;

const isUnconfirmedEmailError = message => `${message || ""}`.toLowerCase().includes("email not confirmed");

const getAuthErrorMessage = error => {
  const message = error?.message || `${error || ""}`;
  if (isUnconfirmedEmailError(message)) return "이메일 인증이 아직 완료되지 않았습니다. 메일함에서 인증 링크를 먼저 눌러주세요.";
  if (message.toLowerCase().includes("invalid login credentials")) return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (message === "Failed to fetch") return "Supabase 연결에 실패했습니다. URL/키 설정 또는 네트워크 상태를 확인해주세요.";
  if (message.includes("counselor_classes") || message.includes("class_memberships")) {
    return "관리자/상담사 테이블이 아직 Supabase에 만들어지지 않았습니다. 관리자 역할 SQL 패치를 먼저 실행해주세요.";
  }
  return message;
};

const UNIVS = [
  { id:"snu", name:"서울대학교", short:"서울대", region:"서울", type:"국립", tier:1, color:"#1B3A6B",
    depts:["컴퓨터공학부","전기정보공학부","기계공학부","경영학과","경제학부","의예과","법학부","사회학과","수학과","물리학과"],
    tracks:[
      {name:"학생부종합 일반전형",type:"수시",grade:1.5,comp:8.5,quota:1500,note:"1단계 서류 → 2단계 면접"},
      {name:"지역균형전형",type:"수시",grade:1.8,comp:3.2,quota:700,note:"학교장 추천 필요"},
      {name:"수능 정시 (가군)",type:"정시",grade:null,comp:5.0,quota:850,note:"수능 100%"},
    ]},
  { id:"yonsei", name:"연세대학교", short:"연세대", region:"서울", type:"사립", tier:1, color:"#00338D",
    depts:["컴퓨터과학과","전기전자공학부","기계공학부","경영학과","경제학부","의예과","법학부","사회학과"],
    tracks:[
      {name:"학생부종합 활동우수형",type:"수시",grade:1.8,comp:7.2,quota:1200,note:"서류 + 면접"},
      {name:"학생부교과 추천형",type:"수시",grade:1.6,comp:4.5,quota:500,note:"학교장 추천 필요"},
      {name:"수능 정시 (나군)",type:"정시",grade:null,comp:4.8,quota:900,note:"수능 100%"},
    ]},
  { id:"korea", name:"고려대학교", short:"고려대", region:"서울", type:"사립", tier:1, color:"#8B1A1A",
    depts:["컴퓨터학과","전기전자공학부","기계공학부","경영학과","경제학과","의예과","법학부"],
    tracks:[
      {name:"학생부종합 일반전형",type:"수시",grade:1.8,comp:6.8,quota:1100,note:"서류 100% (면접 없음)"},
      {name:"학교추천전형",type:"수시",grade:1.7,comp:4.2,quota:800,note:"교과 + 면접"},
      {name:"수능 정시 (가군)",type:"정시",grade:null,comp:4.5,quota:1000,note:"수능 100%"},
    ]},
  { id:"sungkyun", name:"성균관대학교", short:"성균관대", region:"서울", type:"사립", tier:2, color:"#1A3366",
    depts:["소프트웨어학과","전자전기공학부","기계공학부","경영학과","경제학과","의예과","법학과"],
    tracks:[
      {name:"학생부종합 계열모집",type:"수시",grade:2.2,comp:5.5,quota:1500,note:"서류 + 면접"},
      {name:"학생부교과 지역균형",type:"수시",grade:2.0,comp:3.8,quota:600,note:"교과 100%"},
      {name:"수능 정시 (나군)",type:"정시",grade:null,comp:4.0,quota:1200,note:"수능 100%"},
    ]},
  { id:"hanyang", name:"한양대학교", short:"한양대", region:"서울", type:"사립", tier:2, color:"#C0392B",
    depts:["컴퓨터소프트웨어학부","전기생체공학부","기계공학부","경영학부","경제금융학부","의예과"],
    tracks:[
      {name:"학생부종합 일반전형",type:"수시",grade:2.3,comp:5.0,quota:1400,note:"서류 100%"},
      {name:"학생부교과 지역균형",type:"수시",grade:2.1,comp:3.5,quota:500,note:"교과 + 면접"},
      {name:"수능 정시 (나군)",type:"정시",grade:null,comp:3.8,quota:1100,note:"수능 100%"},
    ]},
  { id:"sogang", name:"서강대학교", short:"서강대", region:"서울", type:"사립", tier:2, color:"#004B9E",
    depts:["컴퓨터공학과","전자공학과","경영학부","경제학과","사회학과","화학과"],
    tracks:[
      {name:"학생부종합 일반형",type:"수시",grade:2.5,comp:4.8,quota:800,note:"서류 + 면접"},
      {name:"학생부교과 지역균형",type:"수시",grade:2.3,comp:3.2,quota:300,note:"교과 + 면접"},
    ]},
  { id:"postech", name:"포항공과대학교", short:"포스텍", region:"경북", type:"사립", tier:1, color:"#003F8A",
    depts:["컴퓨터공학과","수학과","화학공학과","기계공학과","전자전기공학과","물리학과"],
    tracks:[{name:"학생부종합 일반전형",type:"수시",grade:1.5,comp:6.0,quota:280,note:"서류 + 면접"}]},
  { id:"kaist", name:"한국과학기술원", short:"KAIST", region:"대전", type:"국립", tier:1, color:"#002147",
    depts:["전산학부","전기및전자공학부","기계공학과","수학과","물리학과","화학과"],
    tracks:[{name:"학사과정 일반전형",type:"수시",grade:1.5,comp:8.0,quota:800,note:"서류 + 면접"}]},
  { id:"ewha", name:"이화여자대학교", short:"이화여대", region:"서울", type:"사립", tier:2, color:"#006E3C",
    depts:["컴퓨터공학과","전자전기공학과","경영학부","경제학과","의예과","법학부"],
    tracks:[
      {name:"학생부종합 미래인재",type:"수시",grade:2.3,comp:4.5,quota:1200,note:"서류 + 면접"},
      {name:"고교추천전형",type:"수시",grade:2.1,comp:3.0,quota:500,note:"교과 + 면접"},
    ]},
  { id:"busan", name:"부산대학교", short:"부산대", region:"부산", type:"국립", tier:3, color:"#005B9E",
    depts:["정보컴퓨터공학부","전자공학과","기계공학부","경영학부","경제학부","의예과"],
    tracks:[
      {name:"학생부종합 일반전형",type:"수시",grade:3.0,comp:4.0,quota:2000,note:"서류 + 면접"},
      {name:"학생부교과 지역인재",type:"수시",grade:2.8,comp:3.5,quota:1500,note:"교과 100%"},
      {name:"수능 정시 (가군)",type:"정시",grade:null,comp:3.0,quota:1200,note:"수능 100%"},
    ]},
];

const CAREERNET_API_KEY = (import.meta.env?.VITE_CAREERNET_API_KEY || "").trim();
const CAREERNET_SCHOOL_API_URL = "https://www.career.go.kr/cnet/openapi/getOpenApi";
const CAREERNET_TEST_API_URL = "https://www.career.go.kr/inspct/openapi/v2/tests";
const UNIVERSITY_REGIONS = ["서울","경기","인천","부산","대전","대구","광주","울산","세종","강원","충북","충남","전북","전남","경북","경남","제주"];
const REGION_NAME_MAP = {
  "서울특별시":"서울",
  "경기도":"경기",
  "인천광역시":"인천",
  "부산광역시":"부산",
  "대전광역시":"대전",
  "대구광역시":"대구",
  "광주광역시":"광주",
  "울산광역시":"울산",
  "세종특별자치시":"세종",
  "강원도":"강원",
  "강원특별자치도":"강원",
  "충청북도":"충북",
  "충청남도":"충남",
  "전라북도":"전북",
  "전북특별자치도":"전북",
  "전라남도":"전남",
  "경상북도":"경북",
  "경상남도":"경남",
  "제주도":"제주",
  "제주특별자치도":"제주",
};
const DEPARTMENT_FILTERS = [
  { key:"all", label:"전체 학과", terms:[] },
  { key:"computer", label:"컴퓨터·AI", terms:["컴퓨터","소프트웨어","전산","AI","인공지능","데이터","정보"] },
  { key:"engineering", label:"공학", terms:["공학","전자","전기","기계","화학공학","건축","산업","반도체"] },
  { key:"business", label:"경영·경제", terms:["경영","경제","금융","회계","무역","통계"] },
  { key:"medical", label:"의약·보건", terms:["의예","의학","간호","약학","치의","한의","보건"] },
  { key:"education", label:"교육", terms:["교육","사범","초등","유아교육"] },
  { key:"humanities", label:"인문·사회", terms:["국어","영어","심리","사회","언론","행정","법","정치","인문"] },
  { key:"arts", label:"예체능", terms:["디자인","미술","음악","체육","영상","연극","무용"] },
];
const RANK_FILTERS = [
  { key:"overall", label:"전국 랭킹순" },
  { key:"department", label:"학과 적합도순" },
  { key:"susi", label:"수시 합격컷순" },
];
const DEPT_PRESETS = {
  common: ["경영학과","경제학과","행정학과","심리학과","사회학과","영어영문학과"],
  engineering: ["컴퓨터공학과","소프트웨어학과","전자공학과","기계공학과","화학공학과","산업공학과"],
  science: ["수학과","물리학과","화학과","생명과학과","통계학과"],
  medical: ["간호학과","보건행정학과","의예과","약학과"],
  education: ["교육학과","국어교육과","영어교육과","수학교육과","초등교육과"],
  arts: ["디자인학부","영상학과","체육학과","음악학과"],
};
const UNIVERSITY_COLORS = ["#001A57","#0EA5E9","#F97316","#0B1324","#005B9E","#006E3C","#8B1A1A","#00338D","#0284C7"];
const NATIONAL_UNIVERSITY_ROWS = [
  ["서울시립대학교","서울시립대","서울","공립",2],["건국대학교","건국대","서울","사립",2],["동국대학교","동국대","서울","사립",2],["홍익대학교","홍익대","서울","사립",2],["중앙대학교","중앙대","서울","사립",2],["경희대학교","경희대","서울","사립",2],["한국외국어대학교","한국외대","서울","사립",2],["서울과학기술대학교","서울과기대","서울","국립",2],["국민대학교","국민대","서울","사립",3],["숭실대학교","숭실대","서울","사립",3],["세종대학교","세종대","서울","사립",3],["광운대학교","광운대","서울","사립",3],["상명대학교","상명대","서울","사립",3],["숙명여자대학교","숙명여대","서울","사립",3],["동덕여자대학교","동덕여대","서울","사립",3],["덕성여자대학교","덕성여대","서울","사립",3],["서울여자대학교","서울여대","서울","사립",3],["삼육대학교","삼육대","서울","사립",3],["서경대학교","서경대","서울","사립",4],["한성대학교","한성대","서울","사립",4],
  ["가톨릭대학교","가톨릭대","경기","사립",3],["아주대학교","아주대","경기","사립",2],["인하대학교","인하대","인천","사립",2],["인천대학교","인천대","인천","국립",3],["경기대학교","경기대","경기","사립",3],["단국대학교","단국대","경기","사립",3],["명지대학교","명지대","경기","사립",3],["가천대학교","가천대","경기","사립",3],["한국항공대학교","항공대","경기","사립",3],["한국공학대학교","한국공대","경기","사립",3],["한양대학교 ERICA","한양대 ERICA","경기","사립",3],["용인대학교","용인대","경기","사립",4],["수원대학교","수원대","경기","사립",4],["강남대학교","강남대","경기","사립",4],["평택대학교","평택대","경기","사립",4],["차의과학대학교","차의과학대","경기","사립",4],["협성대학교","협성대","경기","사립",4],["한경국립대학교","한경국립대","경기","국립",4],
  ["강원대학교","강원대","강원","국립",3],["연세대학교 미래캠퍼스","연세대 미래","강원","사립",3],["한림대학교","한림대","강원","사립",3],["상지대학교","상지대","강원","사립",4],["가톨릭관동대학교","가톨릭관동대","강원","사립",4],["충북대학교","충북대","충북","국립",3],["한국교원대학교","한국교원대","충북","국립",3],["청주대학교","청주대","충북","사립",4],["서원대학교","서원대","충북","사립",4],["충남대학교","충남대","대전","국립",3],["한밭대학교","한밭대","대전","국립",3],["건양대학교","건양대","충남","사립",4],["공주대학교","공주대","충남","국립",3],["순천향대학교","순천향대","충남","사립",3],["호서대학교","호서대","충남","사립",4],["백석대학교","백석대","충남","사립",4],["단국대학교 천안캠퍼스","단국대 천안","충남","사립",3],["고려대학교 세종캠퍼스","고려대 세종","세종","사립",3],["홍익대학교 세종캠퍼스","홍익대 세종","세종","사립",3],
  ["전북대학교","전북대","전북","국립",3],["군산대학교","군산대","전북","국립",4],["원광대학교","원광대","전북","사립",4],["전주대학교","전주대","전북","사립",4],["우석대학교","우석대","전북","사립",4],["전남대학교","전남대","광주","국립",3],["조선대학교","조선대","광주","사립",4],["광주과학기술원","GIST","광주","국립",1],["광주대학교","광주대","광주","사립",4],["목포대학교","목포대","전남","국립",4],["순천대학교","순천대","전남","국립",4],["동신대학교","동신대","전남","사립",4],
  ["경북대학교","경북대","대구","국립",2],["계명대학교","계명대","대구","사립",3],["영남대학교","영남대","경북","사립",3],["금오공과대학교","금오공대","경북","국립",3],["안동대학교","안동대","경북","국립",4],["대구대학교","대구대","경북","사립",4],["대구가톨릭대학교","대구가톨릭대","경북","사립",4],["대구한의대학교","대구한의대","경북","사립",4],["울산대학교","울산대","울산","사립",3],["UNIST","UNIST","울산","국립",1],
  ["경상국립대학교","경상국립대","경남","국립",3],["창원대학교","창원대","경남","국립",4],["인제대학교","인제대","경남","사립",4],["경남대학교","경남대","경남","사립",4],["동아대학교","동아대","부산","사립",3],["부경대학교","부경대","부산","국립",3],["한국해양대학교","한국해양대","부산","국립",3],["동의대학교","동의대","부산","사립",4],["동서대학교","동서대","부산","사립",4],["경성대학교","경성대","부산","사립",4],["고신대학교","고신대","부산","사립",4],["신라대학교","신라대","부산","사립",4],["제주대학교","제주대","제주","국립",4],
];

const normalizeRegionName = region => REGION_NAME_MAP[region] || region?.replace(/특별시|광역시|특별자치시|특별자치도|도/g, "") || "전국";
const normalizeTier = value => Math.max(1, Math.min(4, Number(value) || 4));
const universitySlug = name => name.toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-|-$/g, "");
const shortNameFromSchool = name => {
  if (!name) return "";
  if (/한국과학기술원/.test(name)) return "KAIST";
  if (/울산과학기술원/.test(name)) return "UNIST";
  if (/광주과학기술원/.test(name)) return "GIST";
  return name.replace(/대학교|대학|캠퍼스/g, "대").replace(/\s+/g, " ").trim();
};
const deptSetForSchool = (name, tier) => {
  const list = [...DEPT_PRESETS.engineering, ...DEPT_PRESETS.common, ...DEPT_PRESETS.science];
  if (tier <= 2 || /의과|의학|가톨릭|한림|인제|원광|고신|차의과학|한의/.test(name)) list.push(...DEPT_PRESETS.medical);
  if (/교원|교육|사범|공주|경인|춘천|청주|서원/.test(name)) list.push(...DEPT_PRESETS.education);
  if (/예술|디자인|홍익|국민|상명|동덕|서울여자|덕성/.test(name)) list.push(...DEPT_PRESETS.arts);
  return [...new Set(list)].slice(0, 12);
};
const generatedTracks = (tier, index) => {
  const base = tier === 1 ? 1.6 : tier === 2 ? 2.25 : tier === 3 ? 2.95 : 3.7;
  const clamp = value => Math.max(1, Math.min(5.9, Number(value.toFixed(1))));
  return [
    { name:"학생부종합 일반전형", type:"수시", grade:clamp(base + (index % 3) * 0.08), comp:Number((5.8 - tier * 0.35 + (index % 4) * 0.28).toFixed(1)), quota:700 + (index % 8) * 90, note:"서류 중심, 일부 면접" },
    { name:"학생부교과 지역균형", type:"수시", grade:clamp(base + 0.18 + (index % 2) * 0.12), comp:Number((4.1 - tier * 0.22 + (index % 3) * 0.2).toFixed(1)), quota:300 + (index % 6) * 70, note:"교과 성적 중심" },
    { name:"수능 정시", type:"정시", grade:null, comp:Number((3.5 + (index % 5) * 0.25).toFixed(1)), quota:450 + (index % 7) * 80, note:"수능 중심" },
  ];
};
const makeUniversityRecord = ([name, short, region, type, tier], index = 0, source = "fallback") => ({
  id: `${source}-${universitySlug(name) || index}`,
  name,
  short: short || shortNameFromSchool(name),
  region: normalizeRegionName(region),
  type: type || "대학",
  tier: normalizeTier(tier),
  color: UNIVERSITY_COLORS[index % UNIVERSITY_COLORS.length],
  depts: deptSetForSchool(name, normalizeTier(tier)),
  tracks: generatedTracks(normalizeTier(tier), index),
  source,
});
const inferUniversityTier = name => {
  if (/서울대학교|연세대학교|고려대학교|한국과학기술원|포항공과|울산과학기술원|광주과학기술원/.test(name)) return 1;
  if (/성균관|한양|서강|중앙|경희|서울시립|건국|동국|홍익|아주|인하|경북/.test(name)) return 2;
  if (/부산|전남|전북|충남|충북|강원|경상국립|영남|계명|동아|부경|순천향|한림/.test(name)) return 3;
  return 4;
};
const mergeUniversityCatalog = rows => {
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
      depts: [...new Set([...(existing.depts || []), ...(row.depts || [])])],
      tracks: existing.tracks?.length ? existing.tracks : row.tracks,
    });
  });
  return [...map.values()];
};
const asArray = value => Array.isArray(value) ? value : value ? [value] : [];
const stripHtml = value => String(value || "").replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const careerNetSchoolToUniversity = (item, index) => {
  const name = item.schoolName;
  if (!name) return null;
  const tier = inferUniversityTier(name);
  return {
    ...makeUniversityRecord([name, shortNameFromSchool(name), item.region, item.estType || item.schoolType || "대학", tier], index, "careernet"),
    id: `careernet-${item.seq || universitySlug(name)}`,
    campus: item.campusName,
    url: item.link,
    collegeInfoUrl: item.collegeinfourl,
  };
};
const careerNetMajorToOption = item => {
  const name = item.mClass || item.facilName?.split(",")?.[0];
  if (!name) return null;
  return {
    id: `careernet-major-${item.majorSeq || universitySlug(name)}`,
    name,
    field: item.lClass || "학과",
    aliases: String(item.facilName || "").split(",").map(value => value.trim()).filter(Boolean).slice(0, 12),
    source: "careernet",
  };
};
const mergeDepartmentOptions = (base = [], apiMajors = []) => {
  const apiNames = apiMajors.map(major => major.name).filter(Boolean);
  return [...new Set([...base, ...apiNames])].sort((a, b) => a.localeCompare(b, "ko"));
};
const departmentOptionsForUniversity = (univ, apiMajors = []) => mergeDepartmentOptions(univ?.depts || [], apiMajors);
async function fetchCareerNetPaged(baseParams, mapper, maxPages = 6) {
  if (!CAREERNET_API_KEY) return [];
  const all = [];
  let total = 0;
  for (let page = 1; page <= maxPages; page += 1) {
    const params = new URLSearchParams({
      apiKey: CAREERNET_API_KEY,
      svcType: "api",
      contentType: "json",
      perPage: "500",
      thisPage: String(page),
      ...baseParams,
    });
    const response = await fetch(`${CAREERNET_SCHOOL_API_URL}?${params.toString()}`);
    if (!response.ok) throw new Error("CareerNet API request failed");
    const payload = await response.json();
    const rows = asArray(payload?.dataSearch?.content);
    if (!rows.length) break;
    total = Number(rows[0]?.totalCount || total || rows.length);
    all.push(...rows.map((row, index) => mapper(row, all.length + index)).filter(Boolean));
    if (!total || all.length >= total) break;
  }
  return all;
}
const loadCareerNetUniversities = () => fetchCareerNetPaged(
  { svcCode:"SCHOOL", gubun:"univ_list" },
  careerNetSchoolToUniversity,
);
const loadCareerNetMajors = () => fetchCareerNetPaged(
  { svcCode:"MAJOR", gubun:"univ_list" },
  careerNetMajorToOption,
);
async function loadCareerNetTests() {
  if (!CAREERNET_API_KEY) return [];
  const params = new URLSearchParams({ apikey: CAREERNET_API_KEY });
  const response = await fetch(`${CAREERNET_TEST_API_URL}?${params.toString()}`);
  if (!response.ok) throw new Error("CareerNet test API request failed");
  const payload = await response.json();
  return asArray(payload?.result).map(item => ({
    name: item.name || "커리어넷 검사",
    type: "API 심리검사",
    status: `API 연결 · ${item.qcount || "-"}문항`,
    desc: stripHtml(item.description || item.summary || ""),
    qno: item.qno,
    exectime: item.exectime,
    source: "careernet",
  }));
}
async function loadCareerNetData() {
  if (!CAREERNET_API_KEY) return { universities:[], majors:[], tests:[] };
  const [universities, majors, tests] = await Promise.all([
    loadCareerNetUniversities(),
    loadCareerNetMajors(),
    loadCareerNetTests().catch(() => []),
  ]);
  return { universities, majors, tests };
}
const departmentFilterMatches = (univ, filterKey) => {
  if (filterKey === "all") return true;
  const filter = DEPARTMENT_FILTERS.find(item => item.key === filterKey);
  if (!filter) return true;
  const haystack = `${univ.name} ${(univ.depts || []).join(" ")}`.toLowerCase();
  return filter.terms.some(term => haystack.includes(term.toLowerCase()));
};
const rankScore = (univ, rankFilter, departmentFilter) => {
  const susiGrade = Math.min(...(univ.tracks || []).filter(track => track.type === "수시" && track.grade).map(track => track.grade), 9);
  const tierScore = (univ.tier || 4) * 100;
  if (rankFilter === "susi") return susiGrade * 100 + (univ.tier || 4);
  if (rankFilter === "department") return (departmentFilterMatches(univ, departmentFilter) ? 0 : 1000) + susiGrade * 100 + (univ.tier || 4);
  return tierScore + susiGrade;
};
UNIVS.push(...NATIONAL_UNIVERSITY_ROWS.map((row, index) => makeUniversityRecord(row, index + UNIVS.length)));

const SUBJECTS = ["국어","수학","영어","한국사","사회","과학","체육","음악","미술"];
const CORE = ["국어","수학","영어"];
const SEMS = ["고1-1","고1-2","고2-1","고2-2","고3-1"];
const LINE_COLORS = {"국어":"#E74C3C","수학":"#1B3A6B","영어":"#27AE60","사회":"#8B6914","과학":"#2980B9"};
const TIER_LABEL = {1:"최상위",2:"상위",3:"중상위",4:"지역중심"};
const LAST_ADMISSION_YEAR = 2025;
const USERS_KEY = "uc_users_v1";
const PROFILES_KEY = "uc_profiles_v1";
const REQUESTS_KEY = "uc_consultation_requests_v1";
const JOURNALS_KEY = "uc_counseling_journals_v1";
const CLASSES_KEY = "uc_counselor_classes_v1";
const MEMBERSHIPS_KEY = "uc_class_memberships_v1";
const SESSION_KEY = "uc_session_v1";
const RECORD_FILE_ACCEPT = ".pdf,image/*,.png,.jpg,.jpeg,.heic,.heif,.webp,.gif,.bmp,.tif,.tiff";

const cloneUniv = (id, dept = "") => {
  const univ = UNIVS.find(u => u.id === id);
  return univ ? { ...univ, dept } : null;
};

const isRecordFile = file => {
  if (!file) return false;
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  return type === "application/pdf" || type.startsWith("image/") || /\.(pdf|png|jpe?g|heic|heif|webp|gif|bmp|tiff?)$/.test(name);
};

const createRecordPreview = file => {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  const looksLikeImage = type.startsWith("image/") || /\.(png|jpe?g|heic|heif|webp|gif|bmp|tiff?)$/.test(name);
  return looksLikeImage ? { url: URL.createObjectURL(file), name: file.name } : null;
};

const createRecordUploadSummary = (file, preferredMajor = "") => {
  const type = file.type || file.name.split(".").pop()?.toUpperCase() || "파일";
  const sizeMb = file.size ? `${(file.size / 1024 / 1024).toFixed(1)}MB` : "크기 확인 필요";
  return {
    원문: "",
    AI분석: analyzeRecordText("", preferredMajor),
    학생정보: {
      "자료명": file.name,
      "파일 형식": type,
      "파일 크기": sizeMb,
    },
    교과발달: [
      {
        과목: "업로드 자료",
        성취도: "검토 대기",
        특기사항: "자료 업로드가 완료되었습니다. 상담 전 필요한 항목을 확인해 주세요.",
      },
    ],
    창의체험: {
      "업로드 상태": "완료",
      "확인 필요": "사진이나 PDF 속 생활기록부 내용을 상담사가 확인할 수 있습니다.",
    },
    행동특성종합의견: "자료가 정상 업로드되었습니다. 상담사가 확인할 수 있도록 보관됩니다.",
  };
};

const normalizeRecordText = text => String(text || "").replace(/\r/g, "").trim();
const splitRecordLines = text => normalizeRecordText(text).split("\n").map(line => line.trim()).filter(line => line.length > 1);
const recordSnippet = (text, limit = 260) => {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return clean.length > limit ? `${clean.slice(0, limit)}...` : clean;
};
const majorKeywordSet = major => {
  const base = String(major || "").replace(/학부|학과|전공/g, " ").split(/\s+/).filter(Boolean);
  if (/컴퓨터|소프트웨어|전산|AI|인공지능|데이터/.test(major)) return [...base, "컴퓨터", "소프트웨어", "정보", "코딩", "프로그래밍", "데이터", "알고리즘"];
  if (/의예|의학|간호|약학|보건/.test(major)) return [...base, "생명", "화학", "의학", "보건", "탐구", "봉사"];
  if (/경영|경제|금융|회계/.test(major)) return [...base, "경제", "경영", "통계", "사회", "시장", "창업"];
  if (/교육|사범/.test(major)) return [...base, "교육", "멘토링", "발표", "협업", "학습"];
  if (/디자인|미술|영상|음악|체육/.test(major)) return [...base, "디자인", "창작", "표현", "작품", "활동"];
  return [...base, "탐구", "진로", "보고서", "발표"];
};
const includesAny = (text, keywords) => keywords.some(keyword => keyword && text.includes(keyword));
const pickRecordLines = (lines, keywords, limit = 4) => lines.filter(line => includesAny(line, keywords)).slice(0, limit);
const inferSubject = line => {
  const match = line.match(/국어|수학|영어|한국사|사회|과학|물리|화학|생명|정보|컴퓨터|경제|경영|미술|음악|체육|진로|동아리/);
  return match?.[0] || "생활기록부";
};
const extractRecordSections = (text, preferredMajor = "") => {
  const lines = splitRecordLines(text);
  const majorKeywords = majorKeywordSet(preferredMajor);
  const subjectLines = pickRecordLines(lines, ["세특", "교과", "수업", "탐구", "보고서", "발표", "토론", "실험", ...majorKeywords], 7);
  const activityLines = pickRecordLines(lines, ["자율", "동아리", "진로", "봉사", "리더", "협업", "프로젝트", "캠프"], 6);
  const awardLines = pickRecordLines(lines, ["수상", "대회", "상장", "우수", "장려", "최우수"], 4);
  const readingLines = pickRecordLines(lines, ["독서", "도서", "책", "읽", "저자"], 5);
  const behaviorLine = pickRecordLines(lines, ["행동특성", "종합의견", "성실", "책임", "배려", "협력", "주도"], 1)[0];

  return {
    교과발달: subjectLines.map(line => ({ 과목: inferSubject(line), 성취도: "원문 확인", 특기사항: recordSnippet(line, 220) })),
    창의체험: activityLines.length ? {
      "핵심 활동": activityLines.map(line => recordSnippet(line, 180)).join(" / "),
      "전공 연결": pickRecordLines(lines, majorKeywords, 3).map(line => recordSnippet(line, 150)).join(" / "),
    } : {},
    수상경력: awardLines.map(line => ({ 대회명: recordSnippet(line, 120), 등위: "원문 확인", 날짜: "" })),
    독서: readingLines.map(line => ({ 책제목: recordSnippet(line, 100), 저자: "" })),
    행동특성종합의견: behaviorLine ? recordSnippet(behaviorLine, 360) : "",
  };
};
const analyzeRecordText = (text, preferredMajor = "") => {
  const clean = normalizeRecordText(text);
  const lines = splitRecordLines(clean);
  const joined = clean.replace(/\s+/g, " ");
  const majorKeywords = majorKeywordSet(preferredMajor);
  const checks = {
    enoughText: clean.length >= 500,
    majorFit: includesAny(joined, majorKeywords),
    inquiry: includesAny(joined, ["탐구", "보고서", "실험", "분석", "연구", "발표", "토론", "프로젝트"]),
    leadership: includesAny(joined, ["리더", "주도", "협업", "멘토", "팀", "기획", "운영"]),
    reading: includesAny(joined, ["독서", "도서", "책", "저자"]),
    awards: includesAny(joined, ["수상", "대회", "우수", "장려", "최우수"]),
    continuity: lines.filter(line => includesAny(line, ["진로", "탐구", "심화", "연계", "후속"])).length >= 2,
  };
  const score = Math.min(100, Math.max(20, 30 + Object.values(checks).filter(Boolean).length * 10));
  const strengths = [];
  const gaps = [];
  const actions = [];

  if (checks.majorFit) strengths.push(`${preferredMajor || "희망 학과"}와 연결되는 키워드가 생활기록부 안에 보입니다.`);
  else gaps.push("희망 학과와 직접 연결되는 키워드나 활동 근거가 아직 약합니다.");
  if (checks.inquiry) strengths.push("탐구, 보고서, 발표처럼 학생부종합에서 보는 학습 과정 근거가 있습니다.");
  else gaps.push("교과 세특에서 탐구 과정, 질문, 분석 결과가 더 드러나면 좋습니다.");
  if (checks.leadership) strengths.push("주도성, 협업, 기획 경험이 보여 상담 자료로 활용하기 좋습니다.");
  else gaps.push("협업 속 역할이나 본인이 주도한 행동이 더 구체적으로 필요합니다.");
  if (checks.reading) strengths.push("독서 또는 자료 탐색 흔적이 있어 전공 관심을 보강할 수 있습니다.");
  else gaps.push("전공 관련 독서와 읽은 뒤 확장한 활동이 부족합니다.");
  if (checks.awards) strengths.push("수상 또는 대회 기록이 있어 활동 성취를 보여줄 수 있습니다.");
  if (!checks.continuity) gaps.push("활동들이 다음 탐구나 진로 계획으로 이어지는 흐름이 약합니다.");
  if (!checks.enoughText) gaps.push("원문 입력량이 적어 분석 신뢰도가 낮습니다. 세특, 창체, 행동특성을 더 옮겨 적어주세요.");

  if (!checks.majorFit) actions.push(`세특/진로활동에서 ${preferredMajor || "희망 학과"}와 연결되는 탐구 주제를 1개 이상 보강하세요.`);
  if (!checks.inquiry) actions.push("보고서 제목, 탐구 질문, 조사 방법, 결론을 한 문장씩 원문에 남겨주세요.");
  if (!checks.leadership) actions.push("팀 활동에서는 맡은 역할, 결정한 내용, 결과를 분리해서 적어두세요.");
  if (!checks.reading) actions.push("전공 관련 책 2권과 읽은 뒤 바뀐 생각을 독서 기록에 연결하세요.");
  if (!actions.length) actions.push("현재 강점이 보입니다. 다음 상담에서는 대학별 전형에 맞춰 활동 우선순위를 정리하세요.");

  return {
    score,
    level: score >= 80 ? "충분" : score >= 60 ? "보완 필요" : "자료 부족",
    summary: clean ? `${lines.length}개 문장을 기준으로 전공 적합성, 탐구 깊이, 주도성, 독서/수상 근거를 점검했습니다.` : "생활기록부 원문을 입력하면 충분한 점과 부족한 점을 자동으로 분석합니다.",
    strengths: strengths.length ? strengths : ["아직 판단할 원문이 부족합니다."],
    gaps: gaps.length ? gaps : ["큰 결손은 보이지 않습니다. 상담 전 목표 대학 전형에 맞춰 세부 근거를 재정렬하면 좋습니다."],
    actions: actions.slice(0, 4),
  };
};
const buildRecordFromText = (base, text, preferredMajor = "") => {
  const source = base && !base.error ? base : createRecordUploadSummary({ name:"생활기록부 원문 입력", type:"text/plain", size:0 }, preferredMajor);
  const clean = normalizeRecordText(text);
  const extracted = extractRecordSections(clean, preferredMajor);
  return {
    ...source,
    원문: clean,
    AI분석: analyzeRecordText(clean, preferredMajor),
    교과발달: extracted.교과발달.length ? extracted.교과발달 : source.교과발달,
    창의체험: Object.keys(extracted.창의체험).length ? extracted.창의체험 : source.창의체험,
    수상경력: extracted.수상경력.length ? extracted.수상경력 : source.수상경력,
    독서: extracted.독서.length ? extracted.독서 : source.독서,
    행동특성종합의견: extracted.행동특성종합의견 || source.행동특성종합의견,
  };
};

const ESSAY_PROMPTS = [
  { id:"motivation", label:"지원 동기", title:"지원 동기와 진로 목표", guide:"왜 이 학과를 선택했는지, 앞으로 어떤 문제를 해결하고 싶은지 적어보세요." },
  { id:"academic", label:"학업 역량", title:"학업에서 성장한 경험", guide:"수업, 탐구, 보고서, 발표 중 배운 과정과 사고의 변화를 중심으로 적어보세요." },
  { id:"activity", label:"활동/리더십", title:"의미 있었던 활동과 역할", guide:"동아리, 진로활동, 프로젝트에서 맡은 역할과 결과를 구체적으로 적어보세요." },
  { id:"growth", label:"성장 과정", title:"어려움과 극복 경험", guide:"문제 상황, 내가 한 행동, 달라진 점이 드러나도록 정리해보세요." },
];
const createEmptyEssays = () => ESSAY_PROMPTS.reduce((map, prompt) => ({ ...map, [prompt.id]: "" }), {});
const buildEssayEvidence = (recordText = "", preferredMajor = "") => {
  const lines = splitRecordLines(recordText);
  const keywords = ["탐구", "보고서", "발표", "프로젝트", "동아리", "진로", "협업", "주도", ...majorKeywordSet(preferredMajor)];
  return pickRecordLines(lines, keywords, 5).map(line => recordSnippet(line, 150));
};
const analyzeEssayDraft = (text = "", prompt = ESSAY_PROMPTS[0], recordText = "", preferredMajor = "") => {
  const clean = String(text || "").trim();
  const joined = clean.replace(/\s+/g, " ");
  const evidence = buildEssayEvidence(recordText, preferredMajor);
  const checks = {
    length: clean.length >= 450,
    story: includesAny(joined, ["문제", "상황", "계기", "어려움", "해결", "결과", "배운"]),
    action: includesAny(joined, ["제가", "나는", "주도", "기획", "분석", "조사", "제안", "개선", "실행"]),
    majorFit: includesAny(joined, majorKeywordSet(preferredMajor)),
    recordFit: evidence.some(line => clean.includes(line.slice(0, Math.min(12, line.length)))),
    reflection: includesAny(joined, ["느꼈", "배웠", "깨달", "성장", "앞으로", "목표", "확신"]),
  };
  const score = Math.min(100, Math.max(25, 28 + Object.values(checks).filter(Boolean).length * 12));
  const strengths = [];
  const gaps = [];
  const actions = [];

  if (checks.story) strengths.push("문제 상황과 변화 과정이 보여 글의 흐름을 만들 수 있습니다.");
  else gaps.push("사건의 시작, 문제 상황, 결과가 한 흐름으로 아직 잘 보이지 않습니다.");
  if (checks.action) strengths.push("학생 본인이 한 행동이 들어가 있어 주체성이 보입니다.");
  else gaps.push("활동 설명보다 내가 직접 한 행동을 더 많이 써야 합니다.");
  if (checks.majorFit) strengths.push(`${preferredMajor || "희망 학과"}와 연결되는 표현이 들어가 있습니다.`);
  else gaps.push("희망 학과와 연결되는 관심, 역량, 진로 목표가 약합니다.");
  if (checks.recordFit) strengths.push("생활기록부 원문 근거와 연결되는 문장이 있습니다.");
  else gaps.push("생활기록부에 적힌 실제 활동 근거와 직접 연결되는 문장이 부족합니다.");
  if (checks.reflection) strengths.push("배운 점이나 다음 목표가 보여 마무리 방향이 좋습니다.");
  else gaps.push("활동 이후의 생각 변화와 다음 계획을 더 분명히 적어야 합니다.");
  if (!checks.length) gaps.push("초안 분량이 짧아 평가자가 맥락을 이해하기 어렵습니다.");

  if (!checks.recordFit && evidence[0]) actions.push(`생활기록부 근거로 "${evidence[0]}" 내용을 한 문단에 연결해보세요.`);
  if (!checks.action) actions.push("문장마다 '내가 한 선택/행동/결과'가 보이도록 고쳐보세요.");
  if (!checks.reflection) actions.push("마지막 문단에는 배운 점과 앞으로의 학업 계획을 넣으세요.");
  if (!checks.majorFit) actions.push(`${preferredMajor || "희망 학과"}에서 필요한 역량과 내 경험을 한 문장으로 연결하세요.`);
  if (!actions.length) actions.push("이제 대학별 문항 길이에 맞춰 문장 밀도를 다듬으면 됩니다.");

  return {
    score,
    level: score >= 80 ? "좋음" : score >= 60 ? "수정 필요" : "초안 단계",
    summary: clean ? `${prompt.title} 문항을 기준으로 구조, 주체성, 전공 연결, 생기부 근거를 점검했습니다.` : "초안을 작성하면 문항별로 충분한 점과 보완할 점을 분석합니다.",
    strengths: strengths.length ? strengths : ["아직 초안이 부족합니다."],
    gaps: gaps.length ? gaps : ["핵심 구조는 갖춰졌습니다. 문장 압축과 근거 보강을 진행하세요."],
    actions: actions.slice(0, 4),
    evidence,
  };
};

const clampGrade = value => Math.max(1, Math.min(5.9, Number(value.toFixed(1))));

const getDepartmentField = dept => {
  if (/의예|의학|간호|약학|치의/.test(dept)) return "의약계열";
  if (/컴퓨터|소프트웨어|전산|전자|전기|기계|공학|화학/.test(dept)) return "공학계열";
  if (/경영|경제|금융/.test(dept)) return "상경계열";
  if (/수학|물리|화학|생명/.test(dept)) return "자연계열";
  if (/법|사회|인문|교육/.test(dept)) return "인문사회계열";
  return "일반계열";
};

const getDepartmentInfo = dept => {
  const field = getDepartmentField(dept);
  if (field === "의약계열") return "내신 최상위권과 면접·서류 완성도가 함께 요구되는 학과입니다.";
  if (field === "공학계열") return "수학·과학 성취와 전공 관련 활동의 연결성이 중요하게 평가됩니다.";
  if (field === "상경계열") return "수학, 사회, 독서·탐구 활동을 전공 관심사와 연결해 보여주는 것이 좋습니다.";
  if (field === "자연계열") return "심화 탐구, 실험, 수학적 사고를 보여주는 기록이 경쟁력을 만듭니다.";
  if (field === "인문사회계열") return "독서, 토론, 탐구 보고서처럼 문제의식이 드러나는 활동이 중요합니다.";
  return "지원 학과와 연결되는 교과 성취와 활동 기록을 함께 확인해야 합니다.";
};

const getDeptAdjustment = dept => {
  if (/의예|의학|치의/.test(dept)) return -0.45;
  if (/컴퓨터|소프트웨어|전산/.test(dept)) return -0.2;
  if (/전자|전기|기계|공학/.test(dept)) return -0.08;
  if (/경영|경제|금융/.test(dept)) return -0.03;
  if (/사회|법/.test(dept)) return 0.08;
  if (/수학|물리|화학/.test(dept)) return 0.02;
  return 0.12;
};

const getAdmissionTrackLabels = track => {
  const name = track?.name || "";
  const labels = [];
  if (/종합/.test(name)) labels.push("종합전형");
  if (/일반/.test(name)) labels.push("일반전형");
  if (/교과/.test(name)) labels.push("교과전형");
  if (/지역|균형/.test(name)) labels.push("지역균형");
  if (/추천/.test(name)) labels.push("추천형");
  return [...new Set(labels)];
};

const buildComprehensiveTrack = track => ({
  ...track,
  name: "학생부종합 일반전형",
  grade: track.grade ? clampGrade(Number(track.grade) + 0.05) : track.grade,
  comp: Number((Number(track.comp || 0) + 0.4).toFixed(1)),
  quota: Math.max(8, Math.round((track.quota || 200) * 0.55)),
  note: "일반전형과 함께 보는 학생부종합 기준",
  inferred: true,
});

const ensureComprehensiveSusiTracks = tracks => {
  const susiTracks = (tracks || []).filter(track => track.type === "수시");
  const hasComprehensive = susiTracks.some(track => /종합/.test(track.name));
  const generalIndex = susiTracks.findIndex(track => /일반전형/.test(track.name) && !/종합/.test(track.name));
  if (hasComprehensive || generalIndex < 0) return susiTracks;
  const next = [...susiTracks];
  next.splice(generalIndex + 1, 0, buildComprehensiveTrack(susiTracks[generalIndex]));
  return next;
};

const tracksForTab = (tracks, tab) => tab === "수시"
  ? ensureComprehensiveSusiTracks(tracks)
  : (tracks || []).filter(track => track.type === tab);

const getLastYearAdmissionStats = (univ, dept) => {
  const selectedDept = dept || univ?.depts?.[0] || "학과 미선택";
  const susiTracks = ensureComprehensiveSusiTracks(univ?.tracks || []);
  const deptIndex = Math.max(0, (univ?.depts || []).indexOf(selectedDept));
  const rows = susiTracks.map((track, index) => {
    const base = Number(track.grade || (univ.tier === 1 ? 1.8 : univ.tier === 2 ? 2.4 : 3.0));
    const avg = clampGrade(base + getDeptAdjustment(selectedDept) + (deptIndex % 3) * 0.06 + index * 0.04);
    const cut70 = clampGrade(avg + 0.25 + (index % 2) * 0.08);
    const last = clampGrade(cut70 + 0.32 + (deptIndex % 2) * 0.07);
    const comp = Number((Number(track.comp || 0) + deptIndex * 0.28 + index * 0.45).toFixed(1));
    const admitted = Math.max(8, Math.round((track.quota || 200) / ((univ.depts?.length || 6) * 3)));
    return {
      name: track.name,
      labels: getAdmissionTrackLabels(track),
      avg,
      cut70,
      last,
      comp,
      admitted,
      note: track.note,
    };
  });
  const avgGrade = rows.length ? clampGrade(rows.reduce((sum, row) => sum + row.avg, 0) / rows.length) : null;
  const cutGrade = rows.length ? clampGrade(Math.max(...rows.map(row => row.cut70))) : null;
  const minGrade = rows.length ? Math.min(...rows.map(row => row.avg)) : null;
  const maxGrade = rows.length ? Math.max(...rows.map(row => row.last)) : null;
  const bestTrack = rows.slice().sort((a, b) => a.avg - b.avg)[0];
  return {
    year: LAST_ADMISSION_YEAR,
    dept: selectedDept,
    field: getDepartmentField(selectedDept),
    info: getDepartmentInfo(selectedDept),
    rows,
    avgGrade,
    cutGrade,
    gradeRange: minGrade && maxGrade ? `${minGrade.toFixed(1)}~${maxGrade.toFixed(1)}등급` : "자료 없음",
    bestTrack: bestTrack?.name || "수시 전형",
    competition: rows.length ? (rows.reduce((sum, row) => sum + row.comp, 0) / rows.length).toFixed(1) : "-",
  };
};

const SETECH_GUIDES = {
  "의약계열": {
    field: "의학·간호·약학",
    coreSubjects: ["생명과학II", "화학II", "확률과 통계"],
    topics: [
      "CRISPR-Cas9 유전자 편집의 의학적 적용과 한계",
      "mRNA 백신 작동 원리와 기존 백신 비교",
      "항생제 내성 슈퍼박테리아와 파지 치료 대안",
      "의학적 진단에서 통계의 위양성 문제 분석",
    ],
    subjectPlan: [
      ["생명과학", "개념 설명보다 질병 사례, 실험 설계, 윤리 쟁점까지 연결"],
      ["화학", "약물 작용, 반응 속도, 농도 계산을 보고서로 남기기"],
      ["수학", "의학 통계, 민감도/특이도, 확률 모델링으로 연결"],
    ],
  },
  "공학계열": {
    field: "컴퓨터·AI·공학",
    coreSubjects: ["미적분", "확률과 통계", "물리학II", "정보"],
    topics: [
      "머신러닝 알고리즘의 의료 영상 진단 정확도 분석",
      "자연어처리 모델의 언어 편향 문제와 개선 방향",
      "스마트시티 교통 최적화 알고리즘 설계",
      "양자컴퓨팅이 암호화 기술에 미치는 영향",
    ],
    subjectPlan: [
      ["수학", "현실 문제를 함수, 확률, 최적화 모델로 바꿔 탐구"],
      ["정보", "알고리즘 구현 과정, 오류 수정, 성능 비교를 기록"],
      ["물리", "공학적 원리와 실험 결과를 그래프·수식으로 설명"],
    ],
  },
  "상경계열": {
    field: "경영·경제·금융",
    coreSubjects: ["경제", "확률과 통계", "사회문화"],
    topics: [
      "기본소득 해외 실험 사례와 경제적 영향 분석",
      "행동경제학 관점으로 본 MZ세대 소비 패턴",
      "탄소세 국제 비교와 국내 도입 시나리오 모델링",
      "빅데이터 기반 주가 예측 모델의 한계",
    ],
    subjectPlan: [
      ["경제", "정책 사례를 수치와 그래프로 비교"],
      ["수학", "통계 자료 해석, 회귀, 예측 모델의 한계를 정리"],
      ["사회", "소비자 행동, 조직, 제도 변화를 토론·보고서로 연결"],
    ],
  },
  "인문사회계열": {
    field: "법학·정치·교육·사회",
    coreSubjects: ["정치와 법", "사회문화", "생활과 윤리", "심리학"],
    topics: [
      "헌법재판소 주요 결정문 논리 구조 분석",
      "청소년 참정권 확대 논쟁의 주요국 사례 비교",
      "AI 튜터의 교육 효과와 자기결정이론 적용",
      "통합교육 현황과 학습권 보장 방안 연구",
    ],
    subjectPlan: [
      ["국어", "텍스트 분석을 사회 문제와 논증 구조로 연결"],
      ["사회", "제도 비교, 사례 분석, 토론 후 입장 변화를 기록"],
      ["영어", "해외 자료나 원문 기사를 읽고 비교 발표"],
    ],
  },
  "자연계열": {
    field: "자연과학",
    coreSubjects: ["미적분", "물리학II", "화학II", "생명과학II"],
    topics: [
      "실험 오차를 줄이기 위한 통계적 검증 방법",
      "기후 데이터로 본 장기 추세와 예측 모델",
      "유전 현상과 확률 모델의 연결",
      "신소재 구조와 물성 변화의 원리",
    ],
    subjectPlan: [
      ["과학", "실험 설계, 결과, 한계, 후속 질문을 한 세트로 기록"],
      ["수학", "자료를 그래프와 모델로 설명"],
      ["영어", "논문 초록을 읽고 핵심 개념을 발표"],
    ],
  },
  "일반계열": {
    field: "진로 탐색",
    coreSubjects: ["국어", "영어", "수학", "진로와 직업"],
    topics: [
      "관심 직업의 핵심 역량과 고등학교 활동 연결",
      "전공별 필수 역량 비교와 나의 강점 매칭",
      "사회 문제 하나를 정해 교과별 관점으로 분석",
      "독서 후 진로 관심이 바뀐 지점 정리",
    ],
    subjectPlan: [
      ["국어", "관심 분야 글쓰기와 발표를 남기기"],
      ["영어", "관심 분야 해외 자료를 읽고 요약"],
      ["진로", "검사 결과를 바탕으로 학과 후보를 좁히기"],
    ],
  },
};

const CAREER_TESTS = [
  { name:"진로심리검사", type:"종합", status:"커리어넷 검사 열기", desc:"진로 방향이 아직 넓을 때 먼저 보는 기본 검사", url:"https://www.career.go.kr/inspct/web/psycho" },
  { name:"직업흥미검사(K)", type:"흥미", status:"커리어넷 검사 열기", desc:"좋아하는 활동 유형을 기준으로 직업군을 좁히는 검사", url:"https://www.career.go.kr/inspct/web/psycho/interest" },
  { name:"직업흥미검사(H)", type:"흥미", status:"커리어넷 API + 검사 열기", desc:"흥미 프로파일을 더 세분화해 학과 후보와 연결", url:"https://www.career.go.kr/inspct/web/psycho/holland" },
  { name:"직업적성검사", type:"적성", status:"커리어넷 검사 열기", desc:"잘하는 능력과 전공 요구 역량을 비교", url:"https://www.career.go.kr/cloud/w/inspect/student" },
];

const mergeCareerTests = apiTests => {
  const map = new Map(CAREER_TESTS.map(test => [test.name, test]));
  apiTests.forEach(test => {
    const base = map.get(test.name);
    map.set(test.name, base ? { ...base, ...test, url: base.url } : test);
  });
  return [...map.values()];
};

const getSetechGuide = major => SETECH_GUIDES[getDepartmentField(major)] || SETECH_GUIDES["일반계열"];

const gradeValuesForProfile = profile => Object.entries(profile?.grades || {})
  .map(([key, value]) => {
    const [subject, semester] = key.split("-");
    return { subject, semester, value:+value };
  })
  .filter(item => !Number.isNaN(item.value));

const getLatestSemester = profile => {
  const values = gradeValuesForProfile(profile);
  for (let i = SEMS.length - 1; i >= 0; i -= 1) {
    if (values.some(item => item.semester === SEMS[i])) return SEMS[i];
  }
  return SEMS[0];
};

const getWeakSubjects = profile => {
  const values = gradeValuesForProfile(profile);
  const grouped = SUBJECTS.map(subject => {
    const rows = values.filter(item => item.subject === subject);
    if (!rows.length) return null;
    const avg = rows.reduce((sum, item) => sum + item.value, 0) / rows.length;
    return { subject, avg };
  }).filter(Boolean);
  return grouped.sort((a, b) => b.avg - a.avg).slice(0, 3);
};

const countSetechEvidence = profile => {
  const record = profile?.gibpu;
  if (!record || record.error) return 0;
  const fromSections = record.교과발달?.length || 0;
  const fromText = splitRecordLines(record.원문 || "").filter(line => includesAny(line, ["세특", "탐구", "보고서", "발표", "실험", "토론"])).length;
  return Math.max(fromSections, fromText);
};

const buildMidtermDiagnosis = (profile, major) => {
  const avgValue = coreAvgForGrades(profile?.grades || {});
  const latestSemester = getLatestSemester(profile);
  const latestAvg = semAvgForGrades(profile?.grades || {}, latestSemester);
  const weakSubjects = getWeakSubjects(profile);
  const guide = getSetechGuide(major);
  const status = !avgValue
    ? "성적 입력 필요"
    : +avgValue <= 2
      ? "상위권 유지"
      : +avgValue <= 4
        ? "상승 전략 필요"
        : "집중 관리";
  const actions = [];
  if (!avgValue) actions.push("최근 중간고사 과목별 등급을 먼저 입력하세요.");
  if (weakSubjects[0]) actions.push(`${weakSubjects[0].subject} 등급을 가장 먼저 보완하고, 오답 원인을 유형별로 나누세요.`);
  actions.push(`${guide.coreSubjects[0]} 과목에서 희망 학과와 연결되는 수행평가/발표 소재를 1개 확보하세요.`);
  actions.push("중간고사 이후 2주 안에 수행평가 결과물과 탐구 질문을 생활기록부 원문에 정리하세요.");
  return {
    status,
    avgValue,
    latestSemester,
    latestAvg,
    weakSubjects,
    actions: actions.slice(0, 4),
  };
};

const buildSwot = (user, profile, score, diagnosis) => {
  const avgValue = diagnosis.avgValue ? +diagnosis.avgValue : null;
  const recordScore = profile?.gibpu?.AI분석?.score || analyzeRecordText(profile?.gibpu?.원문 || "", user?.preferredMajor || "").score;
  const setechCount = countSetechEvidence(profile);
  const targets = profile?.targets || [];
  const strengths = [];
  const weaknesses = [];
  const opportunities = [];
  const threats = [];

  if (avgValue && avgValue <= 2) strengths.push("국수영 평균이 상위권이라 상향 카드 검토가 가능합니다.");
  if (setechCount >= 5) strengths.push(`세특/탐구 근거가 ${setechCount}건 있어 학종 소재가 보입니다.`);
  if (targets.length >= 2) strengths.push("목표 대학이 정리되어 전형 비교가 가능합니다.");
  if (recordScore >= 70) strengths.push("생활기록부 AI 분석에서 활용 가능한 강점이 확인됩니다.");

  if (!avgValue) weaknesses.push("성적 데이터가 부족해 합격선 비교가 어렵습니다.");
  if (avgValue && avgValue > 4) weaknesses.push("핵심 과목 등급 보완이 최우선입니다.");
  if (setechCount < 5) weaknesses.push("세특 근거가 부족해 학생부종합 설득력이 약할 수 있습니다.");
  if (!targets.length) weaknesses.push("목표 대학/학과가 없어 수시 6장 설계가 흐립니다.");

  opportunities.push("중간고사 직후 수행평가와 발표 내용을 세특 소재로 전환할 수 있습니다.");
  opportunities.push(`${user?.preferredMajor || "희망 학과"}와 연결되는 과목 선택으로 진로 일관성을 만들 수 있습니다.`);
  if (CAREERNET_API_KEY) opportunities.push("커리어넷 API로 대학·학과 데이터를 실제 목록과 연결할 수 있습니다.");
  else opportunities.push("커리어넷 키가 들어오면 진로검사와 학과 정보 자동 연동이 가능합니다.");

  if (setechCount < 3) threats.push("세특 마감 전에 근거가 부족하면 학종 경쟁력이 크게 떨어질 수 있습니다.");
  if (avgValue && targets.some(target => getLastYearAdmissionStats(target, target.dept || user?.preferredMajor).avgGrade < avgValue - 0.1)) threats.push("일부 목표 대학은 현재 내신보다 합격선이 높아 상향 카드로 분류됩니다.");
  threats.push("수시 6장을 모두 비슷한 수준으로 쓰면 안정 카드가 부족해질 수 있습니다.");

  return {
    strengths: strengths.length ? strengths : ["강점 판단을 위해 성적, 생활기록부, 목표 대학 입력이 필요합니다."],
    weaknesses: weaknesses.length ? weaknesses : ["큰 약점은 보이지 않지만 전형별 증거 정리가 필요합니다."],
    opportunities,
    threats,
  };
};

const categorizeSusiCard = (avgValue, stat) => {
  if (!avgValue || !stat?.avgGrade) return { label:"검토", className:"neutral" };
  const diff = +avgValue - stat.avgGrade;
  if (diff <= -0.35) return { label:"안정", className:"safe" };
  if (diff <= 0.25) return { label:"적정", className:"target" };
  if (diff <= 0.85) return { label:"상향", className:"reach" };
  return { label:"도전", className:"high" };
};

const buildSusiCards = (user, profile, catalog, avgValue) => {
  const major = user?.preferredMajor || "";
  const seen = new Set();
  const preferred = [...(profile?.targets || [])];
  const fallback = (catalog || [])
    .filter(univ => departmentFilterMatches(univ, "all"))
    .filter(univ => !major || `${univ.name} ${(univ.depts || []).join(" ")}`.includes(major.replace(/학부|학과/g, "")) || departmentFilterMatches(univ, DEPARTMENT_FILTERS.find(f => f.terms.some(term => major.includes(term)))?.key || "all"))
    .sort((a, b) => rankScore(a, "susi", "all") - rankScore(b, "susi", "all"))
    .slice(0, 18);
  const candidates = [...preferred, ...fallback]
    .filter(univ => {
      if (!univ?.id || seen.has(univ.id)) return false;
      seen.add(univ.id);
      return true;
    });

  const cards = candidates.map(univ => {
    const dept = univ.dept || (major && (univ.depts || []).find(item => item.includes(major.replace(/학부|학과/g, "")))) || univ.depts?.[0] || major || "학과 미선택";
    const stat = getLastYearAdmissionStats(univ, dept);
    const fit = categorizeSusiCard(avgValue, stat);
    return {
      id: `${univ.id}-${dept}`,
      name: univ.name,
      dept,
      fit,
      gradeRange: stat.gradeRange,
      avgGrade: stat.avgGrade,
      bestTrack: stat.bestTrack,
      competition: stat.competition,
    };
  });

  const buckets = {
    reach: cards.filter(card => ["도전", "상향"].includes(card.fit.label)).slice(0, 2),
    target: cards.filter(card => card.fit.label === "적정").slice(0, 2),
    safe: cards.filter(card => card.fit.label === "안정").slice(0, 2),
    neutral: cards.filter(card => card.fit.label === "검토").slice(0, 2),
  };
  const ordered = [...buckets.reach, ...buckets.target, ...buckets.safe, ...buckets.neutral];
  return ordered.length >= 6 ? ordered.slice(0, 6) : [...ordered, ...cards.filter(card => !ordered.some(item => item.id === card.id))].slice(0, 6);
};

const buildStrategyReport = (user, profile, catalog = UNIVS, careerTests = CAREER_TESTS) => {
  const major = user?.preferredMajor || "학과 미입력";
  const guide = getSetechGuide(major);
  const diagnosis = buildMidtermDiagnosis(profile, major);
  const recordAnalysis = profile?.gibpu?.AI분석 || analyzeRecordText(profile?.gibpu?.원문 || "", major);
  const setechCount = countSetechEvidence(profile);
  const setechTarget = 10;
  const essayScores = ESSAY_PROMPTS.map(prompt => analyzeEssayDraft(profile?.essays?.[prompt.id] || "", prompt, profile?.gibpu?.원문 || "", major).score);
  const essayAvg = essayScores.length ? Math.round(essayScores.reduce((sum, value) => sum + value, 0) / essayScores.length) : 0;
  const gradeScore = diagnosis.avgValue ? Math.max(25, Math.round((6 - Math.min(6, +diagnosis.avgValue)) / 5 * 100)) : 35;
  const setechScore = Math.min(100, Math.round((setechCount / setechTarget) * 100));
  const targetScore = Math.min(100, (profile?.targets?.length || 0) * 30);
  const roadmapScore = buildRoadmapState(profile?.checklist || {}).progress;
  const total = Math.round(gradeScore * 0.28 + (recordAnalysis.score || 30) * 0.28 + setechScore * 0.2 + targetScore * 0.14 + roadmapScore * 0.1);
  const swot = buildSwot(user, profile, total, diagnosis);
  const susiCards = buildSusiCards(user, profile, catalog, diagnosis.avgValue);
  const targetStats = (profile?.targets || []).slice(0, 4).map(target => {
    const stat = getLastYearAdmissionStats(target, target.dept || major);
    return { ...stat, name:target.name, dept:target.dept || stat.dept, fit:categorizeSusiCard(diagnosis.avgValue, stat) };
  });

  return {
    major,
    field: guide.field,
    total,
    level: total >= 80 ? "상위권 전략" : total >= 60 ? "보완형 전략" : "기초 구축",
    diagnosis,
    recordAnalysis,
    setechCount,
    setechTarget,
    setechGap: Math.max(0, setechTarget - setechCount),
    guide,
    swot,
    susiCards,
    targetStats,
    careerTests,
    roadmap: buildRoadmapState(profile?.checklist || {}),
    actionPlan: [
      diagnosis.actions[0],
      setechCount < setechTarget ? `세특 근거 ${Math.max(1, Math.min(3, setechTarget - setechCount))}건을 이번 달 안에 추가하세요.` : "세특 근거는 충분합니다. 전형별로 강한 소재를 골라 정리하세요.",
      `수시 6장은 상향 1~2장, 적정 2~3장, 안정 1~2장으로 나누어 관리하세요.`,
      `${guide.coreSubjects[0]} 과목에서 "${guide.topics[0]}" 같은 주제를 학생 언어로 바꿔 시작하세요.`,
    ].filter(Boolean),
  };
};

const createProfile = (overrides = {}) => ({
  targets: [],
  grades: {},
  gibpu: null,
  fname: "",
  essays: createEmptyEssays(),
  checklist: {},
  assignments: [],
  ...overrides,
});

const createRequest = (overrides = {}) => ({
  id: `request-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  studentId: "",
  category: "입시 전략",
  preferredDate: "",
  preferredTime: "",
  message: "",
  status: "pending",
  createdAt: new Date().toISOString(),
  confirmedAt: null,
  emailSentAt: null,
  ...overrides,
});

const createCounselingJournal = (overrides = {}) => ({
  id: `journal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  studentId: "",
  studentName: "",
  counselorId: "",
  counselorName: "",
  date: new Date().toISOString().slice(0, 10),
  topic: "목표 대학 상담",
  summary: "",
  nextSteps: "",
  createdAt: new Date().toISOString(),
  updatedAt: null,
  ...overrides,
});

const oneLineSummary = (text = "") => {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "내용 요약 없음";
  return clean.length > 74 ? `${clean.slice(0, 74)}...` : clean;
};

const normalizeInviteCode = code => String(code || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
const createJoinCode = () => `TOP${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const DEMO_USERS = [
  { id:"student-minseo", name:"김민서", email:"minseo@student.test", password:"student123", role:"student", gradeLevel:"3학년", className:"3-1", highSchool:"서울고등학교", preferredMajor:"컴퓨터공학부" },
  { id:"student-jiho", name:"이지호", email:"jiho@student.test", password:"student123", role:"student", gradeLevel:"3학년", className:"3-1", highSchool:"서울고등학교", preferredMajor:"컴퓨터소프트웨어학부" },
  { id:"student-seoyeon", name:"한서연", email:"seoyeon@student.test", password:"student123", role:"student", gradeLevel:"2학년", className:"2-3", highSchool:"한빛고등학교", preferredMajor:"경영학과" },
  { id:"student-doyun", name:"최도윤", email:"doyun@student.test", password:"student123", role:"student", gradeLevel:"2학년", className:"2-4", highSchool:"한빛고등학교", preferredMajor:"경제학과" },
  { id:"student-yuna", name:"정유나", email:"yuna@student.test", password:"student123", role:"student", gradeLevel:"1학년", className:"1-2", highSchool:"대치고등학교", preferredMajor:"전산학부" },
  { id:"student-harin", name:"오하린", email:"harin@student.test", password:"student123", role:"student", gradeLevel:"1학년", className:"1-2", highSchool:"대치고등학교", preferredMajor:"의예과" },
  { id:"counselor-demo", name:"박상담", email:"counselor@test.com", password:"counselor123", role:"counselor" },
  { id:"admin-demo", name:"총관리자", email:"admin@test.com", password:"admin123", role:"admin" },
];

const DEMO_CLASSES = [
  { id:"class-demo-park", counselorId:"counselor-demo", name:"박상담 학생 코드", joinCode:"PARK2026", maxStudents:100, isActive:true, createdAt:"2026-05-01T00:00:00.000Z" },
];

const DEMO_MEMBERSHIPS = [
  { studentId:"student-minseo", classId:"class-demo-park", joinedAt:"2026-05-01T00:10:00.000Z" },
  { studentId:"student-jiho", classId:"class-demo-park", joinedAt:"2026-05-01T00:12:00.000Z" },
  { studentId:"student-seoyeon", classId:"class-demo-park", joinedAt:"2026-05-01T00:14:00.000Z" },
  { studentId:"student-doyun", classId:"class-demo-park", joinedAt:"2026-05-01T00:16:00.000Z" },
  { studentId:"student-yuna", classId:"class-demo-park", joinedAt:"2026-05-01T00:18:00.000Z" },
  { studentId:"student-harin", classId:"class-demo-park", joinedAt:"2026-05-01T00:20:00.000Z" },
];

const DEMO_PROFILES = {
  "student-minseo": createProfile({
    targets: [cloneUniv("snu", "컴퓨터공학부"), cloneUniv("yonsei", "컴퓨터과학과")].filter(Boolean),
    grades: {
      "국어-고1-1":1.6, "수학-고1-1":1.4, "영어-고1-1":1.7,
      "국어-고1-2":1.5, "수학-고1-2":1.3, "영어-고1-2":1.6,
      "국어-고2-1":1.4, "수학-고2-1":1.2, "영어-고2-1":1.5,
    },
  }),
  "student-jiho": createProfile({
    targets: [cloneUniv("hanyang", "컴퓨터소프트웨어학부"), cloneUniv("busan", "정보컴퓨터공학부")].filter(Boolean),
    grades: {
      "국어-고1-1":2.8, "수학-고1-1":2.4, "영어-고1-1":2.5,
      "국어-고1-2":2.7, "수학-고1-2":2.2, "영어-고1-2":2.4,
      "국어-고2-1":2.5, "수학-고2-1":2.1, "영어-고2-1":2.3,
    },
  }),
  "student-seoyeon": createProfile({
    targets: [cloneUniv("korea", "경영학과"), cloneUniv("sungkyun", "경영학과")].filter(Boolean),
    grades: {
      "국어-고1-1":2.0, "수학-고1-1":2.3, "영어-고1-1":1.8,
      "국어-고1-2":1.9, "수학-고1-2":2.1, "영어-고1-2":1.7,
      "국어-고2-1":1.8, "수학-고2-1":2.0, "영어-고2-1":1.6,
    },
  }),
  "student-doyun": createProfile({
    targets: [cloneUniv("sogang", "경제학과"), cloneUniv("ewha", "경제학과")].filter(Boolean),
    grades: {
      "국어-고1-1":3.6, "수학-고1-1":3.3, "영어-고1-1":3.1,
      "국어-고1-2":3.4, "수학-고1-2":3.2, "영어-고1-2":3.0,
      "국어-고2-1":3.2, "수학-고2-1":3.0, "영어-고2-1":2.8,
    },
  }),
  "student-yuna": createProfile({
    targets: [cloneUniv("kaist", "전산학부"), cloneUniv("postech", "컴퓨터공학과")].filter(Boolean),
    grades: {
      "국어-고1-1":1.3, "수학-고1-1":1.1, "영어-고1-1":1.4,
      "국어-고1-2":1.2, "수학-고1-2":1.0, "영어-고1-2":1.3,
    },
  }),
  "student-harin": createProfile({
    targets: [cloneUniv("busan", "의예과")].filter(Boolean),
    grades: {
      "국어-고1-1":4.8, "수학-고1-1":4.5, "영어-고1-1":4.2,
      "국어-고1-2":4.6, "수학-고1-2":4.3, "영어-고1-2":4.1,
    },
  }),
};

const DEMO_REQUESTS = [
  createRequest({
    id:"request-demo-minseo-1",
    studentId:"student-minseo",
    category:"목표 대학 상담",
    preferredDate:"2026-05-20",
    preferredTime:"15:00",
    message:"서울대 컴퓨터공학부 학생부종합 준비 방향을 상담받고 싶습니다.",
    createdAt:"2026-05-15T05:20:00.000Z",
  }),
  createRequest({
    id:"request-demo-jiho-1",
    studentId:"student-jiho",
    category:"성적 개선 계획",
    preferredDate:"2026-05-21",
    preferredTime:"16:30",
    message:"수학 등급을 올리기 위한 학기별 계획과 지원 가능 대학을 알고 싶습니다.",
    createdAt:"2026-05-15T07:40:00.000Z",
  }),
  createRequest({
    id:"request-demo-seoyeon-1",
    studentId:"student-seoyeon",
    category:"전형 선택",
    preferredDate:"2026-05-22",
    preferredTime:"14:00",
    message:"경영학과 지원에서 학생부종합과 교과 중 어떤 전형이 나을지 상담하고 싶습니다.",
    status:"confirmed",
    createdAt:"2026-05-14T08:10:00.000Z",
    confirmedAt:"2026-05-15T01:00:00.000Z",
    emailSentAt:"2026-05-15T01:02:00.000Z",
  }),
];

const DEMO_JOURNALS = [
  createCounselingJournal({
    id:"journal-demo-minseo-1",
    studentId:"student-minseo",
    studentName:"김민서",
    counselorId:"counselor-demo",
    counselorName:"박상담",
    date:"2026-05-10",
    topic:"목표 대학 상담",
    summary:"서울대 컴퓨터공학부는 학생부종합 중심으로 유지하되, 연세대 컴퓨터과학과를 적정 카드로 함께 관리하기로 했습니다. 수학 세특과 정보 동아리 활동을 더 구체적으로 연결할 필요가 있습니다.",
    nextSteps:"5월 말까지 정보 동아리 프로젝트 결과와 수학 탐구 보고서 초안을 정리해서 다음 상담 때 확인합니다.",
    createdAt:"2026-05-10T06:30:00.000Z",
  }),
  createCounselingJournal({
    id:"journal-demo-jiho-1",
    studentId:"student-jiho",
    studentName:"이지호",
    counselorId:"counselor-demo",
    counselorName:"박상담",
    date:"2026-05-12",
    topic:"성적 개선 계획",
    summary:"수학 등급 상승이 가장 큰 변수입니다. 한양대와 부산대 사이에 안정권 공대 카드를 추가로 탐색하기로 했습니다.",
    nextSteps:"미적분 오답 노트와 6월 모의고사 이후 성적표를 다시 입력합니다.",
    createdAt:"2026-05-12T08:00:00.000Z",
  }),
];

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const withStudentMeta = (user, index = 0) => {
  if (user.role !== "student") return user;
  const fallback = DEMO_USERS.filter(u => u.role === "student")[index % 6] || {};
  const demo = DEMO_USERS.find(u => u.id === user.id) || {};
  return {
    ...user,
    gradeLevel: user.gradeLevel || demo.gradeLevel || fallback.gradeLevel || "1학년",
    className: user.className || demo.className || fallback.className || "미배정",
    highSchool: user.highSchool || demo.highSchool || fallback.highSchool || "학교 미입력",
    preferredMajor: user.preferredMajor || user.targetDepartment || demo.preferredMajor || "학과 미입력",
  };
};

const loadUsers = () => {
  const stored = readJson(USERS_KEY, null);
  if (Array.isArray(stored) && stored.length) {
    const byId = new Map(stored.map(user => [user.id, user]));
    DEMO_USERS.forEach(demo => {
      const existing = byId.get(demo.id);
      byId.set(demo.id, existing ? { ...demo, ...existing } : demo);
    });
    const migrated = Array.from(byId.values()).map(withStudentMeta);
    writeJson(USERS_KEY, migrated);
    return migrated;
  }
  writeJson(USERS_KEY, DEMO_USERS);
  writeJson(PROFILES_KEY, DEMO_PROFILES);
  return DEMO_USERS;
};

const loadProfiles = () => {
  const stored = readJson(PROFILES_KEY, null);
  if (stored && typeof stored === "object") {
    const merged = { ...DEMO_PROFILES, ...stored };
    writeJson(PROFILES_KEY, merged);
    return merged;
  }
  writeJson(PROFILES_KEY, DEMO_PROFILES);
  return DEMO_PROFILES;
};

const loadRequests = () => {
  const stored = readJson(REQUESTS_KEY, null);
  if (Array.isArray(stored)) {
    const byId = new Map(DEMO_REQUESTS.map(request => [request.id, request]));
    stored.forEach(request => byId.set(request.id, request));
    const merged = Array.from(byId.values());
    writeJson(REQUESTS_KEY, merged);
    return merged;
  }
  writeJson(REQUESTS_KEY, DEMO_REQUESTS);
  return DEMO_REQUESTS;
};

const loadCounselingJournals = () => {
  const stored = readJson(JOURNALS_KEY, null);
  if (Array.isArray(stored)) {
    const byId = new Map(DEMO_JOURNALS.map(journal => [journal.id, journal]));
    stored.forEach(journal => byId.set(journal.id, journal));
    const merged = Array.from(byId.values());
    writeJson(JOURNALS_KEY, merged);
    return merged;
  }
  writeJson(JOURNALS_KEY, DEMO_JOURNALS);
  return DEMO_JOURNALS;
};

const loadCounselorClasses = () => {
  const stored = readJson(CLASSES_KEY, null);
  if (Array.isArray(stored)) {
    const byId = new Map(DEMO_CLASSES.map(item => [item.id, item]));
    stored.forEach(item => byId.set(item.id, item));
    const merged = Array.from(byId.values());
    writeJson(CLASSES_KEY, merged);
    return merged;
  }
  writeJson(CLASSES_KEY, DEMO_CLASSES);
  return DEMO_CLASSES;
};

const loadClassMemberships = () => {
  const stored = readJson(MEMBERSHIPS_KEY, null);
  if (Array.isArray(stored)) {
    const byStudentId = new Map(DEMO_MEMBERSHIPS.map(item => [item.studentId, item]));
    stored.forEach(item => byStudentId.set(item.studentId, item));
    const merged = Array.from(byStudentId.values());
    writeJson(MEMBERSHIPS_KEY, merged);
    return merged;
  }
  writeJson(MEMBERSHIPS_KEY, DEMO_MEMBERSHIPS);
  return DEMO_MEMBERSHIPS;
};

const createId = role => `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeEmail = email => email.trim().toLowerCase();
const CONSULT_TOPICS = ["입시 전략", "목표 대학 상담", "성적 개선 계획", "전형 선택", "생활기록부 상담"];
const TIME_SLOTS = ["09:00","09:30","10:00","10:30","11:00","11:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30"];
const WEEKDAY_KO = ["일","월","화","수","목","금","토"];
const WEEKDAY_EN = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const STUDENT_NAV = [["홈","⌂","홈"],["목표대학","🏛","목표대학"],["성적표","📊","성적표"],["전략센터","✨","전략센터"],["생활기록부","📄","생활기록부"],["자소서","✍","자소서"],["로드맵","🧭","로드맵"],["과제점검","📝","과제 점검"],["상담","🗓","상담"]];
const CHECKLIST_ITEMS = [
  { id:"career-major", month:"2026년 3월", title:"진로·학과 방향 정리", body:"관심 학과 2~3개와 연결되는 활동 키워드를 정리합니다.", urgent:false },
  { id:"subject-strategy", month:"2026년 3월", title:"과목 선택 전략 점검", body:"목표 학과와 연결되는 선택 과목, 심화 과목, 탐구 주제를 정리합니다.", urgent:false },
  { id:"midterm-plan", month:"2026년 4월", title:"중간고사 전략 수립", body:"국어, 수학, 영어 중 흔들리는 과목을 먼저 정하고 보완 계획을 세웁니다.", urgent:false },
  { id:"university-research", month:"2026년 4월", title:"전국 대학·학과 탐색", body:"지역, 학과, 입결 기준으로 후보 대학을 넓게 탐색합니다.", urgent:false },
  { id:"target-balance", month:"2026년 5월", title:"목표 대학 3곳 등록", body:"상향, 적정, 안정 대학을 각각 최소 1곳씩 정리합니다.", urgent:false },
  { id:"grades-current", month:"2026년 5월", title:"최근 성적표 입력", body:"국어, 수학, 영어 중심으로 학기별 등급을 입력합니다.", urgent:false },
  { id:"strategy-center", month:"2026년 5월", title:"전략센터 리포트 확인", body:"성적 진단, SWOT, 세특 갭, 수시 6장 배분을 한 번에 확인합니다.", urgent:false },
  { id:"record-upload", month:"2026년 6월", title:"생활기록부 자료 업로드", body:"PDF나 사진 파일로 세특, 진로활동, 동아리 활동을 상담 전 미리 정리합니다.", urgent:false },
  { id:"first-counseling", month:"2026년 6월", title:"1차 상담 예약", body:"목표 대학과 전형 방향을 상담사와 확정합니다.", urgent:false },
  { id:"setech-gap", month:"2026년 6월", title:"세특 갭 보완", body:"부족한 과목의 탐구 보고서, 발표, 질문 기록을 추가합니다.", urgent:false },
  { id:"essay-outline", month:"2026년 7월", title:"자기소개서 소재 초안", body:"활동별 문제, 행동, 결과, 배운 점을 한 문단씩 정리합니다.", urgent:false },
  { id:"susi-six-cards", month:"2026년 7월", title:"수시 6장 초안 배치", body:"상향, 적정, 안정 카드를 나누고 각 대학의 작년도 입결을 비교합니다.", urgent:false },
  { id:"final-strategy", month:"2026년 8월", title:"수시 지원 전략 확정", body:"6개 카드의 위험도를 조정하고 최종 리스트를 확정합니다.", urgent:true },
  { id:"submission-check", month:"2026년 9월", title:"원서 접수 전 최종 확인", body:"전형명, 학과명, 제출 서류, 마감 시간을 다시 확인합니다.", urgent:true },
  { id:"interview-plan", month:"2026년 10월", title:"면접·발표 대비", body:"생활기록부와 자소서에서 예상 질문을 뽑고 답변 구조를 준비합니다.", urgent:false },
  { id:"final-exam", month:"2026년 11월", title:"기말·수능 이후 전략 조정", body:"정시 가능성과 수시 면접 일정을 함께 보며 마지막 전략을 조정합니다.", urgent:false },
  { id:"result-followup", month:"2026년 12월", title:"합격 결과 정리", body:"합격, 예비, 추가 합격 흐름을 기록하고 다음 선택지를 정리합니다.", urgent:false },
];
const CHECKLIST_STAGE_BY_MONTH = {
  "2026년 3월": "진로 설계",
  "2026년 4월": "성적 준비",
  "2026년 5월": "기초 세팅",
  "2026년 6월": "자료 준비",
  "2026년 7월": "서류 초안",
  "2026년 8월": "지원 확정",
  "2026년 9월": "원서 접수",
  "2026년 10월": "면접 대비",
  "2026년 11월": "최종 조정",
  "2026년 12월": "결과 관리",
};
const buildRoadmapState = (roadmap = {}) => {
  const doneCount = CHECKLIST_ITEMS.filter(item => roadmap[item.id]).length;
  const progress = Math.round((doneCount / CHECKLIST_ITEMS.length) * 100);
  const urgent = CHECKLIST_ITEMS.filter(item => item.urgent && !roadmap[item.id]);
  const groups = Object.entries(CHECKLIST_ITEMS.reduce((map, item) => {
    if (!map[item.month]) map[item.month] = [];
    map[item.month].push(item);
    return map;
  }, {})).map(([month, items]) => ({
    month,
    items,
    done: items.filter(item => roadmap[item.id]).length,
    stage: CHECKLIST_STAGE_BY_MONTH[month] || "준비 단계",
  }));
  const activeIndex = Math.max(0, groups.findIndex(group => group.done < group.items.length));
  return {
    doneCount,
    progress,
    urgent,
    groups,
    activeIndex,
    nextItem: CHECKLIST_ITEMS.find(item => !roadmap[item.id]),
  };
};
const ASSIGNMENT_COLUMNS = [
  { key:"todo", label:"해야 할 것", hint:"선생님이 새로 준 과제" },
  { key:"doing", label:"하고 있는 것", hint:"진행 중인 과제" },
  { key:"review", label:"다 한 것", hint:"검사 맡고 있는 과제" },
];
const ASSIGNMENT_STATUS_ALIAS = {
  "해야할것": "todo",
  "해야 할 것": "todo",
  "하는중": "doing",
  "하고 있는 것": "doing",
  "검사중": "review",
  "다 한 것": "review",
};
const normalizeAssignmentStatus = status => ASSIGNMENT_STATUS_ALIAS[status] || status || "todo";
const assignmentColumnForStatus = status => ASSIGNMENT_COLUMNS.find(column => column.key === normalizeAssignmentStatus(status)) || ASSIGNMENT_COLUMNS[0];
const ASSIGNMENT_FORM_DEFAULT = { source:"상담사", subject:"", title:"", due:"", note:"" };
const DEFAULT_ASSIGNMENTS = [
  { id:"assign-school-literature", source:"학교", subject:"국어", title:"문학 수행평가 작품 해석 정리", due:"5월 20일", teacher:"김국어 선생님", note:"작품별 주제, 표현법, 느낀 점을 한 장으로 정리", status:"todo" },
  { id:"assign-academy-math", source:"학원", subject:"수학", title:"미적분 오답 25문항 재풀이", due:"5월 18일", teacher:"수학학원", note:"틀린 이유를 풀이 옆에 한 줄씩 적기", status:"doing" },
  { id:"assign-school-english", source:"학교", subject:"영어", title:"모의고사 지문 3개 요약", due:"5월 22일", teacher:"박영어 선생님", note:"각 지문 핵심 문장과 어휘 10개 표시", status:"todo" },
  { id:"assign-academy-record", source:"학원", subject:"생기부", title:"진로활동 보고서 초안 제출", due:"검사 중", teacher:"입시 컨설팅", note:"활동 동기와 배운 점 중심으로 피드백 대기", status:"review" },
];

const pad2 = value => String(value).padStart(2, "0");

const toDateValue = date => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const todayValue = () => toDateValue(new Date());

const parseDateValue = value => {
  const [year, month, day] = (value || todayValue()).split("-").map(Number);
  return new Date(year, month - 1, day);
};

const addDays = (value, days) => {
  const date = parseDateValue(value);
  date.setDate(date.getDate() + days);
  return toDateValue(date);
};

const formatWeekMonthLabel = startValue => {
  const start = parseDateValue(startValue);
  const end = parseDateValue(addDays(startValue, 6));
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  if (sameMonth) return `${start.getFullYear()}년 ${start.getMonth() + 1}월`;
  if (sameYear) return `${start.getFullYear()}년 ${start.getMonth() + 1}월 - ${end.getMonth() + 1}월`;
  return `${start.getFullYear()}년 ${start.getMonth() + 1}월 - ${end.getFullYear()}년 ${end.getMonth() + 1}월`;
};

const formatDateLabel = value => {
  const date = parseDateValue(value);
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAY_EN[date.getDay()]})`;
};

const coreAvgForGrades = gradeMap => {
  const vals = [];
  SEMS.forEach(m => CORE.forEach(s => {
    const g = gradeMap[`${s}-${m}`];
    if (g !== undefined) vals.push(+g);
  }));
  if (!vals.length) return null;
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
};

const semAvgForGrades = (gradeMap, semester) => {
  const vals = CORE.map(s => gradeMap[`${s}-${semester}`]).filter(v => v !== undefined);
  if (!vals.length) return null;
  return (vals.reduce((a, b) => a + +b, 0) / vals.length).toFixed(1);
};

const getMatchForAvg = (univ, avg) => {
  if (!avg || !univ) return null;
  const bt = [...univ.tracks].filter(t => t.grade).sort((a, b) => b.grade - a.grade)[0];
  if (!bt) return null;
  const d = +avg - bt.grade;
  if (d <= -0.5) return { label: "도달 어려움", color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", pct: 25 };
  if (d <= 0.3) return { label: "적정 수준", color: "#059669", bg: "#F0FDF4", border: "#BBF7D0", pct: 65 };
  return { label: "안정권", color: "#0EA5E9", bg: "#EAF2FF", border: "#BFDBFE", pct: 92 };
};

const css = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
:root{--brand-navy:#001A57;--brand-blue:#0EA5E9;--brand-blue-dark:#0284C7;--brand-blue-soft:#EAF7FF;--brand-orange:#F97316;--brand-orange-soft:#FFF3E8;--brand-gray:#0B1324;--brand-text:#333D4B;--brand-muted:#6B7684;--brand-subtle:#9AA6B2;--brand-bg:#F4F7FB;--brand-card:#FFFFFF;--brand-border:#E5E7EB;--brand-line:#EEF2F7;--brand-shadow:0 18px 40px rgba(11,19,36,0.08);--fs-page:24px;--fs-hero:26px;--fs-section:18px;--fs-card:15px;--fs-body:13.5px;--fs-small:12px;--fs-micro:11px;}
body{font-family:'Noto Sans KR',sans-serif;background:var(--brand-bg);color:var(--brand-text);font-size:14px;line-height:1.55;}
.root{display:flex;height:100vh;background:linear-gradient(135deg,#EEF8FF 0%,#F7FAFD 44%,#FFF7F0 100%);overflow:hidden;position:relative;}
.root::before{content:"";position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(rgba(14,165,233,0.08) 1px,transparent 1px),linear-gradient(90deg,rgba(14,165,233,0.08) 1px,transparent 1px),linear-gradient(120deg,rgba(0,26,87,0.08),transparent 42%,rgba(249,115,22,0.07));background-size:44px 44px,44px 44px,100% 100%;opacity:0.58;}
.sidebar,.main{position:relative;z-index:1;}
.sidebar{width:220px;min-width:220px;background:rgba(255,255,255,0.62);border-right:1px solid rgba(255,255,255,0.72);display:flex;flex-direction:column;overflow-y:auto;backdrop-filter:blur(22px) saturate(145%);box-shadow:12px 0 34px rgba(11,19,36,0.06);}
.logo{padding:22px 20px 14px;font-size:15px;font-weight:700;color:var(--brand-navy);letter-spacing:-0.3px;border-bottom:1px solid var(--brand-border);}
.logo span{color:#0EA5E9;}
.nav-section{padding:12px 12px 0;}
.nav-label{font-size:10px;font-weight:500;color:#9AA6B2;letter-spacing:0.08em;padding:0 8px;margin-bottom:6px;}
.nav-btn{display:flex;align-items:center;gap:9px;padding:9px 10px;border-radius:8px;cursor:pointer;font-size:13.5px;color:#4B5563;transition:all 0.12s;border:none;background:transparent;width:100%;text-align:left;font-family:'Noto Sans KR',sans-serif;}
.nav-btn:hover{background:#EEF2F7;color:#202632;}
.nav-btn.active{background:#EAF2FF;color:#0EA5E9;font-weight:500;}
.target-list{padding:8px 12px 16px;margin-top:12px;border-top:1px solid #E5EAF1;}
.t-chip{display:flex;align-items:center;gap:7px;padding:7px 10px;border-radius:8px;cursor:pointer;font-size:12.5px;color:#374151;transition:all 0.12s;border:none;background:transparent;width:100%;text-align:left;font-family:'Noto Sans KR',sans-serif;}
.t-chip:hover{background:#EEF2F7;}
.t-chip.active{background:#EAF2FF;color:#0EA5E9;}
.dot{border-radius:50%;flex-shrink:0;}
.main{flex:1;overflow-y:auto;padding:32px 36px;}
.ptitle{font-size:22px;font-weight:600;color:#202632;letter-spacing:-0.5px;margin-bottom:4px;}
.psub{font-size:14px;color:#6B7684;margin-bottom:24px;}
.sw{position:relative;margin-bottom:14px;}
.sw .ico{position:absolute;left:13px;top:50%;transform:translateY(-50%);font-size:15px;color:#9AA6B2;pointer-events:none;}
input[type=search]{width:100%;padding:10px 14px 10px 38px;border:1px solid #E1E7EF;border-radius:10px;font-size:14px;color:#202632;background:#fff;outline:none;font-family:'Noto Sans KR',sans-serif;transition:border 0.15s;}
input[type=search]:focus{border-color:#0EA5E9;box-shadow:0 0 0 3px rgba(14,165,233,0.08);}
input[type=number]{padding:5px 6px;border:1px solid #E1E7EF;border-radius:7px;font-size:13px;color:#202632;background:#fff;outline:none;font-family:'Noto Sans KR',sans-serif;text-align:center;transition:border 0.15s;width:62px;}
input[type=number]:focus{border-color:#0EA5E9;}
input[type=number]::placeholder{color:#C9D3DF;}
select{padding:8px 12px;border:1px solid #E1E7EF;border-radius:8px;font-size:13px;color:#202632;background:#fff;outline:none;font-family:'Noto Sans KR',sans-serif;cursor:pointer;}
select:focus{border-color:#0EA5E9;}
.card{background:#fff;border:1px solid #E5EAF1;border-radius:14px;padding:20px 22px;margin-bottom:12px;}
.rcard{background:#fff;border:1px solid #E5EAF1;border-radius:12px;overflow:hidden;margin-bottom:14px;}
.rrow{display:flex;align-items:center;gap:12px;padding:11px 16px;border-bottom:1px solid #EEF2F7;cursor:pointer;transition:background 0.1s;}
.rrow:last-child{border-bottom:none;}
.rrow:hover{background:#F7FAFD;}
.rname{font-size:14px;font-weight:500;color:#202632;}
.rmeta{font-size:12px;color:#9AA6B2;margin-top:1px;}
.abtn{font-size:12px;padding:5px 14px;border-radius:7px;cursor:pointer;border:none;font-family:'Noto Sans KR',sans-serif;font-weight:500;transition:all 0.12s;}
.abtn.add{background:#EAF2FF;color:#0EA5E9;}
.abtn.add:hover{background:#DBEAFE;}
.abtn.done{background:#EEF2F7;color:#9AA6B2;cursor:default;}
.univ-filter-bar{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0 0 14px;}
.univ-filter-field label{display:block;font-size:11px;font-weight:700;color:#9AA6B2;margin-bottom:6px;}
.univ-filter-field select{width:100%;height:38px;border:1px solid #E1E7EF;border-radius:10px;background:rgba(255,255,255,0.84);padding:0 11px;color:#202632;font-size:13px;font-family:'Noto Sans KR',sans-serif;}
.univ-result-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 2px 10px;color:#9AA6B2;font-size:12px;}
.uavatar{width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:13px;flex-shrink:0;}
.badge{display:inline-block;font-size:11px;padding:2px 9px;border-radius:20px;font-weight:500;margin:0 2px;}
.b수시{background:#EAF2FF;color:#0EA5E9;}
.b정시{background:#FFF7ED;color:#C2410C;}
.btag{background:#EEF2F7;color:#4B5563;}
.sgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px;}
.sbox{background:#F2F5F9;border-radius:10px;padding:14px;text-align:center;}
.slabel{font-size:11px;color:#9AA6B2;margin-bottom:6px;}
.sval{font-size:19px;font-weight:600;color:#202632;letter-spacing:-0.5px;}
.admission-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;margin-bottom:16px;}
.admission-title{font-size:19px;font-weight:800;color:#202632;letter-spacing:-0.4px;margin-bottom:5px;}
.admission-copy{font-size:13px;line-height:1.65;color:#6B7684;}
.admission-range{min-width:150px;border-radius:16px;background:linear-gradient(135deg,rgba(14,165,233,0.12),rgba(249,115,22,0.10));border:1px solid rgba(14,165,233,0.18);padding:14px;text-align:right;}
.admission-range span{display:block;font-size:11px;color:#6B7684;margin-bottom:5px;}
.admission-range strong{font-size:21px;color:#0B1324;letter-spacing:-0.5px;}
.admission-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;}
.admission-stat{border-radius:14px;background:#F8FAFC;border:1px solid #E5EAF1;padding:13px 14px;}
.admission-stat-label{font-size:11px;color:#9AA6B2;margin-bottom:7px;font-weight:700;}
.admission-stat-value{font-size:18px;font-weight:800;color:#202632;letter-spacing:-0.3px;}
.admission-table-wrap{overflow-x:auto;border:1px solid #E5EAF1;border-radius:14px;background:rgba(255,255,255,0.62);}
.admission-table{width:100%;border-collapse:collapse;min-width:680px;}
.admission-table th{padding:11px 12px;background:#F8FAFC;border-bottom:1px solid #E5EAF1;font-size:11px;color:#6B7684;font-weight:800;text-align:left;}
.admission-table td{padding:12px;border-bottom:1px solid #EEF2F7;font-size:13px;color:#374151;}
.admission-table tr:last-child td{border-bottom:none;}
.admission-table strong{color:#0B1324;font-weight:800;}
.track-type-row{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px;}
.track-type-pill{display:inline-flex;align-items:center;border-radius:999px;background:var(--brand-blue-soft);color:var(--brand-blue);font-size:10.5px;font-weight:900;line-height:1;padding:4px 8px;}
.track-type-pill.secondary{background:var(--brand-orange-soft);color:var(--brand-orange);}
.dept-stat-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px;}
.dept-stat-row{border:1px solid #E5EAF1;border-radius:14px;background:#fff;padding:13px;text-align:left;cursor:pointer;font-family:'Noto Sans KR',sans-serif;transition:all 0.14s;}
.dept-stat-row:hover,.dept-stat-row.active{border-color:#0EA5E9;background:#F5FBFF;box-shadow:0 10px 24px rgba(14,165,233,0.08);}
.dept-stat-name{font-size:13.5px;font-weight:800;color:#202632;margin-bottom:5px;}
.dept-stat-meta{font-size:12px;color:#6B7684;line-height:1.5;}
.dept-stat-grade{margin-top:9px;font-size:18px;font-weight:900;color:#0EA5E9;letter-spacing:-0.4px;}
.tcard{border:1px solid #E5EAF1;border-radius:12px;padding:16px 18px;margin-bottom:10px;}
.tabs{display:flex;gap:6px;margin-bottom:14px;}
.tab{padding:7px 18px;border-radius:8px;border:1px solid #E1E7EF;background:#fff;font-size:13px;cursor:pointer;font-family:'Noto Sans KR',sans-serif;color:#4B5563;transition:all 0.12s;}
.tab.active{background:#0EA5E9;color:#fff;border-color:#0EA5E9;font-weight:500;}
.mbar{height:6px;background:#EEF2F7;border-radius:3px;margin-top:6px;overflow:hidden;}
.dchip{display:inline-block;font-size:12.5px;padding:5px 12px;border-radius:20px;background:#F2F5F9;border:1px solid #E5EAF1;color:#374151;margin:3px;}
.gtable{width:100%;border-collapse:collapse;}
.gtable th{padding:9px 6px;font-size:12px;color:#9AA6B2;font-weight:500;border-bottom:1px solid #EEF2F7;text-align:center;}
.gtable th:first-child{text-align:left;}
.gtable td{padding:5px 6px;border-bottom:1px solid #F7FAFD;text-align:center;}
.gtable td:first-child{text-align:left;}
.gtable tr:last-child td{border-bottom:none;}
.gtable tr:nth-child(even){background:#FAFAFA;}
.sn{display:flex;align-items:center;gap:7px;font-size:13.5px;}
.avrow{display:flex;gap:10px;margin-bottom:20px;}
.avbox{flex:1;background:#fff;border:1px solid #E5EAF1;border-radius:10px;padding:12px 8px;text-align:center;}
.uzone{border:2px dashed #E1E7EF;border-radius:14px;padding:44px 20px;text-align:center;cursor:pointer;transition:all 0.15s;background:#fff;margin-bottom:20px;}
.uzone:hover,.uzone.drag{border-color:#0EA5E9;background:#F5F8FF;}
.record-preview-thumb{width:min(340px,100%);height:180px;margin:0 auto 16px;border:1px solid rgba(14,165,233,0.22);border-radius:18px;background:rgba(255,255,255,0.72);box-shadow:0 18px 40px rgba(15,23,42,0.10);padding:8px;cursor:zoom-in;overflow:hidden;display:block;}
.record-preview-thumb img{width:100%;height:100%;object-fit:contain;border-radius:12px;display:block;background:#F8FAFC;}
.record-preview-modal{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;padding:32px;background:rgba(11,19,36,0.74);backdrop-filter:blur(16px);}
.record-preview-shell{position:relative;max-width:min(1100px,96vw);max-height:90vh;display:flex;flex-direction:column;align-items:center;gap:12px;}
.record-preview-shell img{max-width:96vw;max-height:82vh;object-fit:contain;border-radius:20px;background:#fff;box-shadow:0 24px 90px rgba(0,0,0,0.42);}
.record-preview-close{position:fixed;top:22px;right:22px;border:1px solid rgba(255,255,255,0.28);border-radius:999px;background:rgba(255,255,255,0.14);color:#fff;padding:10px 16px;font-size:13px;font-weight:700;font-family:'Noto Sans KR',sans-serif;cursor:pointer;backdrop-filter:blur(12px);}
.record-preview-name{max-width:min(900px,90vw);color:#E5E7EB;font-size:13px;font-weight:600;text-align:center;word-break:break-all;}
.gsec{background:#fff;border:1px solid #E5EAF1;border-radius:14px;padding:20px 22px;margin-bottom:12px;}
.secl{font-size:11.5px;font-weight:600;color:#9AA6B2;letter-spacing:0.06em;margin-bottom:14px;}
.irow{padding:10px 0;border-bottom:1px solid #EEF2F7;}
.irow:last-child{border-bottom:none;}
.ititle{font-size:14px;font-weight:500;color:#202632;margin-bottom:3px;}
.ibody{font-size:13px;color:#6B7684;line-height:1.75;}
.chips{display:flex;flex-wrap:wrap;gap:8px;}
.chip{font-size:12.5px;padding:5px 12px;border-radius:20px;background:#F2F5F9;border:1px solid #E5EAF1;color:#374151;}
.ocards{display:flex;gap:12px;flex-wrap:wrap;}
.ostat{background:#F2F5F9;border-radius:10px;padding:12px 16px;text-align:center;flex:1;min-width:90px;}
.ostat.major-focus{flex-basis:100%;text-align:left;background:linear-gradient(135deg,#EAF7FF,#FFFFFF);border:1px solid rgba(14,165,233,0.14);}
.ostat-major-value{font-size:24px;line-height:1.18;font-weight:900;color:#0B1324;letter-spacing:-0.5px;}
.empty{text-align:center;padding:60px 20px;color:#9AA6B2;}
.ovgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;}
.ovc{background:#fff;border:1px solid #E5EAF1;border-radius:12px;padding:16px;cursor:pointer;transition:all 0.12s;}
.ovc:hover{border-color:#0EA5E9;box-shadow:0 2px 8px rgba(14,165,233,0.08);}
.minfo{border-radius:10px;padding:14px 16px;margin-bottom:14px;display:flex;align-items:center;gap:20px;flex-wrap:wrap;border:1px solid transparent;}
.auth-root{min-height:100vh;background:#F2F5F9;display:flex;align-items:center;justify-content:center;padding:28px;}
.auth-shell{width:min(920px,100%);display:grid;grid-template-columns:1fr 420px;gap:28px;align-items:stretch;}
.auth-brand{padding:28px 6px;display:flex;flex-direction:column;justify-content:center;}
.auth-mark{font-size:28px;font-weight:700;color:#202632;letter-spacing:-0.7px;margin-bottom:10px;}
.auth-mark span{color:#0EA5E9;}
.auth-copy{font-size:15px;color:#6B7684;line-height:1.7;max-width:360px;}
.auth-card{background:#fff;border:1px solid #E5EAF1;border-radius:14px;padding:24px;box-shadow:0 14px 30px rgba(17,24,39,0.06);}
.auth-title{font-size:20px;font-weight:700;color:#202632;letter-spacing:-0.4px;margin-bottom:4px;}
.auth-sub{font-size:13px;color:#6B7684;margin-bottom:18px;}
.field{margin-bottom:12px;}
.field label{display:block;font-size:12px;font-weight:500;color:#6B7684;margin-bottom:6px;}
.auth-input{width:100%;padding:10px 12px;border:1px solid #E1E7EF;border-radius:9px;font-size:14px;color:#202632;background:#fff;outline:none;font-family:'Noto Sans KR',sans-serif;}
.auth-input:focus{border-color:#0EA5E9;box-shadow:0 0 0 3px rgba(14,165,233,0.08);}
.seg{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:14px;}
.seg-btn{padding:9px 10px;border:1px solid #E1E7EF;background:#fff;border-radius:9px;font-size:13px;color:#4B5563;cursor:pointer;font-family:'Noto Sans KR',sans-serif;}
.seg-btn.active{background:#202632;color:#fff;border-color:#202632;font-weight:600;}
.primary-btn{width:100%;padding:11px 14px;border:none;border-radius:9px;background:#0EA5E9;color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:'Noto Sans KR',sans-serif;}
.primary-btn:hover{background:#1E40AF;}
.link-btn{border:none;background:transparent;color:#0EA5E9;font-size:13px;font-weight:600;cursor:pointer;font-family:'Noto Sans KR',sans-serif;}
.ghost-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-top:12px;}
.ghost-btn{padding:9px 10px;border:1px solid #E1E7EF;border-radius:9px;background:#fff;color:#374151;font-size:12.5px;cursor:pointer;font-family:'Noto Sans KR',sans-serif;}
.ghost-btn:hover{background:#F7FAFD;}
.auth-error{padding:10px 12px;border-radius:9px;background:#FEF2F2;border:1px solid #FECACA;color:#B91C1C;font-size:13px;margin-bottom:12px;}
.auth-notice{padding:10px 12px;border-radius:9px;background:#EAF2FF;border:1px solid rgba(14,165,233,0.22);color:#0EA5E9;font-size:13px;font-weight:700;margin-bottom:12px;}
.auth-resend-btn{width:100%;margin:-2px 0 12px;}
.sidebar-spacer{flex:1;}
.userbox{margin:12px;padding:12px;border-radius:12px;background:#F2F5F9;border:1px solid #E5EAF1;}
.user-name{font-size:13px;font-weight:600;color:#202632;margin-bottom:2px;}
.user-meta{font-size:11px;color:#9AA6B2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.logout-btn{width:100%;margin-top:10px;padding:7px 10px;border:1px solid #E1E7EF;border-radius:8px;background:#fff;color:#4B5563;font-size:12px;cursor:pointer;font-family:'Noto Sans KR',sans-serif;}
.cstats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px;}
.cstat{background:#fff;border:1px solid #E5EAF1;border-radius:12px;padding:14px;}
.cstat-label{font-size:11px;color:#9AA6B2;margin-bottom:5px;}
.cstat-value{font-size:22px;font-weight:700;color:#202632;letter-spacing:-0.5px;}
.student-layout{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:14px;align-items:start;}
.student-table{background:#fff;border:1px solid #E5EAF1;border-radius:12px;overflow:hidden;}
.student-row{display:grid;grid-template-columns:1.2fr 0.7fr 1.2fr 0.8fr;gap:12px;align-items:center;padding:13px 16px;border:0;border-bottom:1px solid #EEF2F7;background:#fff;cursor:pointer;text-align:left;width:100%;font-family:'Noto Sans KR',sans-serif;}
.student-row:last-child{border-bottom:none;}
.student-row:hover,.student-row.active{background:#F7FAFD;}
.student-head{background:#FAFAFA;color:#9AA6B2;font-size:11px;font-weight:600;cursor:default;}
.student-name{font-size:14px;font-weight:600;color:#202632;margin-bottom:2px;}
.student-email{font-size:12px;color:#9AA6B2;}
.target-stack{display:flex;flex-wrap:wrap;gap:5px;}
.detail-panel{background:#fff;border:1px solid #E5EAF1;border-radius:12px;padding:18px;position:sticky;top:0;}
.detail-title{font-size:16px;font-weight:700;color:#202632;margin-bottom:2px;}
.detail-sub{font-size:12px;color:#9AA6B2;margin-bottom:14px;}
.filter-grid{display:grid;grid-template-columns:1.2fr repeat(4,minmax(130px,1fr));gap:8px;margin-bottom:14px;align-items:end;}
.filter-field label{display:block;font-size:11px;font-weight:600;color:#9AA6B2;margin-bottom:6px;}
.filter-field select,.filter-field input{width:100%;padding:9px 11px;border:1px solid #E1E7EF;border-radius:9px;background:#fff;color:#202632;font-size:13px;font-family:'Noto Sans KR',sans-serif;outline:none;}
.roster-note{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;font-size:12px;color:#9AA6B2;}
.class-group{background:#fff;border:1px solid #E5EAF1;border-radius:12px;overflow:hidden;margin-bottom:12px;}
.class-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 16px;background:#FAFAFA;border-bottom:1px solid #EEF2F7;}
.class-title{font-size:14px;font-weight:700;color:#202632;}
.class-meta{font-size:12px;color:#9AA6B2;}
.class-admin-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;}
.class-admin-card{background:#fff;border:1px solid #E5EAF1;border-radius:18px;padding:16px;box-shadow:0 16px 40px rgba(11,19,36,0.08),inset 0 1px 0 rgba(255,255,255,0.72);}
.class-admin-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px;}
.class-code-box{border:1px dashed rgba(14,165,233,0.32);border-radius:14px;background:rgba(234,247,255,0.72);color:#0EA5E9;font-size:22px;font-weight:900;letter-spacing:0;padding:14px;text-align:center;}
.join-card{width:min(420px,100%);}
.admin-counselor-list{display:grid;gap:12px;margin-bottom:16px;}
.admin-counselor-card{background:#fff;border:1px solid #E5EAF1;border-radius:18px;padding:16px;box-shadow:0 16px 40px rgba(11,19,36,0.08),inset 0 1px 0 rgba(255,255,255,0.72);}
.admin-counselor-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px;}
.admin-form-grid{display:grid;grid-template-columns:1fr 1fr 150px 110px;gap:10px;align-items:end;}
.admin-form-grid input[type=number].auth-input{width:100%;text-align:left;}
.admin-toggle{height:41px;border:1px solid #E1E7EF;border-radius:9px;background:#fff;color:#374151;font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:7px;cursor:pointer;}
.admin-toggle input{accent-color:#0EA5E9;}
.admin-capacity{display:flex;align-items:center;gap:10px;margin-top:10px;color:#202632;font-size:13px;}
.admin-capacity strong{min-width:70px;text-align:right;}
.admin-student-list{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px;}
.admin-student-chip{border:1px solid #E5EAF1;border-radius:999px;background:#F8FAFC;color:#4B5563;font-size:12px;font-weight:700;padding:7px 10px;font-family:'Noto Sans KR',sans-serif;}
.admin-student-table{display:grid;gap:8px;}
.admin-student-row{display:grid;grid-template-columns:1.2fr 0.9fr 1fr 1fr 0.7fr;gap:10px;align-items:center;border:1px solid #EEF2F7;border-radius:12px;background:#F8FAFC;padding:12px;font-size:12.5px;color:#4B5563;}
.admin-user-row{grid-template-columns:1.3fr 0.7fr 1fr 1.1fr;}
.admin-role-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end;}
.role-pill{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:900;background:#EEF2F7;color:#4B5563;}
.role-pill.student{background:#EAF7FF;color:#0EA5E9;}
.role-pill.counselor{background:#FFF7ED;color:#C2410C;}
.student-card-row{display:grid;grid-template-columns:1.2fr 0.9fr 0.8fr 1.3fr 0.7fr;gap:12px;align-items:center;width:100%;border:0;border-bottom:1px solid #EEF2F7;background:#fff;padding:13px 16px;text-align:left;cursor:pointer;font-family:'Noto Sans KR',sans-serif;}
.student-card-row:last-child{border-bottom:none;}
.student-card-row:hover{background:#F7FAFD;}
.cell-label{display:none;font-size:10px;color:#9AA6B2;margin-bottom:2px;font-weight:600;}
.score-pill{display:inline-flex;align-items:center;padding:4px 9px;border-radius:20px;background:#EEF2F7;color:#374151;font-size:12px;font-weight:600;}
.score-pill.good{background:#EAF2FF;color:#0EA5E9;}
.score-pill.mid{background:#F0FDF4;color:#059669;}
.score-pill.warn{background:#FFF7ED;color:#C2410C;}
.back-btn{display:inline-flex;align-items:center;gap:6px;border:1px solid #E1E7EF;background:#fff;border-radius:9px;padding:8px 12px;color:#374151;font-size:13px;font-weight:600;cursor:pointer;font-family:'Noto Sans KR',sans-serif;margin-bottom:16px;}
.profile-head{background:#fff;border:1px solid #E5EAF1;border-radius:14px;padding:20px 22px;margin-bottom:12px;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;}
.profile-head-main{min-width:0;flex:1;}
.profile-name{font-size:24px;font-weight:700;color:#202632;letter-spacing:-0.5px;margin-bottom:6px;}
.profile-meta{font-size:13px;color:#6B7684;display:flex;gap:8px;flex-wrap:wrap;}
.profile-major-spotlight{display:inline-flex;align-items:center;gap:12px;border:1px solid rgba(14,165,233,0.18);background:linear-gradient(135deg,rgba(14,165,233,0.12),rgba(255,255,255,0.84));border-radius:18px;padding:10px 14px;margin:6px 0 10px;box-shadow:0 12px 28px rgba(14,165,233,0.10);}
.profile-major-label{font-size:11px;font-weight:900;color:#0EA5E9;letter-spacing:0.02em;white-space:nowrap;}
.profile-major-value{font-size:22px;line-height:1.16;font-weight:900;color:#0B1324;letter-spacing:-0.45px;}
.profile-grid{display:grid;grid-template-columns:1.1fr 0.9fr;gap:12px;align-items:start;}
.profile-section{background:#fff;border:1px solid #E5EAF1;border-radius:14px;padding:20px 22px;margin-bottom:12px;}
.counselor-edit-panel .field{margin-bottom:0;}
.profile-target-search{display:grid;gap:8px;margin:12px 0;}
.sw.compact{margin-bottom:0;}
.profile-target-results{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}
.profile-target-result{display:flex;align-items:center;gap:8px;border:1px solid #E5EAF1;border-radius:12px;background:rgba(255,255,255,0.82);padding:9px 11px;cursor:pointer;font-family:'Noto Sans KR',sans-serif;text-align:left;color:#202632;}
.profile-target-result span:nth-child(2){font-size:13px;font-weight:800;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;}
.profile-target-result small{font-size:11px;color:#9AA6B2;font-weight:700;white-space:nowrap;}
.profile-target-result:disabled{cursor:default;opacity:0.58;}
.target-edit-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end;}
.detail-target{border:1px solid #E5EAF1;border-radius:12px;padding:14px 16px;margin-bottom:10px;}
.detail-target:last-child{margin-bottom:0;}
.grade-matrix{width:100%;border-collapse:collapse;}
.grade-matrix th{font-size:11px;color:#9AA6B2;font-weight:600;border-bottom:1px solid #EEF2F7;padding:8px 6px;text-align:center;}
.grade-matrix th:first-child{text-align:left;}
.grade-matrix td{font-size:13px;color:#202632;border-bottom:1px solid #F7FAFD;padding:8px 6px;text-align:center;}
.grade-matrix td:first-child{text-align:left;font-weight:600;}
.grade-mini-input{width:62px;border:1px solid #E1E7EF;border-radius:10px;background:#fff;padding:7px 6px;text-align:center;font-size:12.5px;font-weight:800;color:#202632;font-family:'Noto Sans KR',sans-serif;outline:none;}
.grade-mini-input:focus{border-color:#0EA5E9;box-shadow:0 0 0 3px rgba(14,165,233,0.08);}
.record-block{padding:12px 0;border-bottom:1px solid #EEF2F7;}
.record-block:last-child{border-bottom:none;padding-bottom:0;}
.record-text-card{display:grid;gap:12px;}
.record-text-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}
.record-ai-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end;}
.ai-notice{margin:10px 0 12px;border:1px solid #FDE68A;border-radius:14px;background:#FFFBEB;color:#92400E;font-size:12.5px;line-height:1.55;font-weight:700;padding:10px 12px;}
.ai-notice.done{border-color:rgba(14,165,233,0.22);background:var(--brand-blue-soft);color:var(--brand-blue);}
.record-textarea{width:100%;min-height:220px;border:1px solid #E1E7EF;border-radius:16px;background:rgba(248,250,252,0.86);padding:15px 16px;color:#202632;font-size:14px;line-height:1.75;resize:vertical;outline:none;font-family:'Noto Sans KR',sans-serif;box-shadow:inset 0 1px 0 rgba(255,255,255,0.74);}
.record-textarea:focus{border-color:#0EA5E9;box-shadow:0 0 0 3px rgba(14,165,233,0.10),inset 0 1px 0 rgba(255,255,255,0.74);}
.profile-record-textarea{min-height:200px;}
.record-text-hint{font-size:12px;line-height:1.6;color:#9AA6B2;}
.record-analysis-card{display:grid;grid-template-columns:180px minmax(0,1fr);gap:18px;align-items:start;}
.record-ai-score{border:1px solid rgba(14,165,233,0.22);border-radius:20px;background:linear-gradient(135deg,rgba(14,165,233,0.13),rgba(255,255,255,0.82));padding:18px;text-align:center;}
.record-ai-score strong{display:block;font-size:34px;line-height:1;font-weight:900;color:#0EA5E9;letter-spacing:-0.8px;}
.record-ai-score span{display:block;margin-top:8px;font-size:12px;font-weight:900;color:#202632;}
.record-ai-summary{font-size:13px;line-height:1.65;color:#6B7684;margin-top:8px;}
.record-analysis-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.record-finding{border:1px solid #E5EAF1;border-radius:16px;background:rgba(248,250,252,0.72);padding:14px;}
.record-finding-title{font-size:12px;font-weight:900;color:#202632;margin-bottom:9px;}
.record-finding ul{margin:0;padding-left:18px;color:#4B5563;font-size:12.5px;line-height:1.75;}
.record-finding.strength{background:rgba(240,253,244,0.72);border-color:rgba(5,150,105,0.14);}
.record-finding.gap{background:rgba(255,247,237,0.72);border-color:rgba(249,115,22,0.18);}
.record-finding.action{grid-column:1/-1;background:rgba(234,247,255,0.72);border-color:rgba(14,165,233,0.16);}
.record-text-preview{margin-top:8px;border:1px solid #E5EAF1;border-radius:14px;background:#F8FAFC;padding:12px 14px;white-space:pre-wrap;color:#4B5563;font-size:12.5px;line-height:1.7;max-height:180px;overflow:auto;}
.essay-shell{display:grid;grid-template-columns:250px minmax(0,1fr);gap:14px;align-items:start;}
.essay-prompt-list{display:grid;gap:8px;}
.essay-prompt-btn{border:1px solid var(--brand-border);border-radius:18px;background:rgba(255,255,255,0.76);padding:13px;text-align:left;cursor:pointer;font-family:'Noto Sans KR',sans-serif;color:var(--brand-text);transition:all 0.14s;}
.essay-prompt-btn:hover{border-color:rgba(14,165,233,0.36);background:#fff;}
.essay-prompt-btn.active{border-color:rgba(14,165,233,0.48);background:linear-gradient(135deg,#fff,#F0FAFF);box-shadow:0 14px 32px rgba(14,165,233,0.12);}
.essay-prompt-label{font-size:12px;font-weight:900;color:var(--brand-blue);margin-bottom:4px;}
.essay-prompt-title{font-size:14px;line-height:1.35;font-weight:900;color:var(--brand-gray);}
.essay-prompt-meta{font-size:11.5px;color:var(--brand-muted);margin-top:7px;}
.essay-editor-card{display:grid;gap:12px;}
.essay-editor-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}
.essay-guide{font-size:12.5px;line-height:1.65;color:var(--brand-muted);margin-top:4px;}
.essay-textarea{width:100%;min-height:340px;border:1px solid #E1E7EF;border-radius:18px;background:rgba(248,250,252,0.86);padding:16px 17px;color:#202632;font-size:14px;line-height:1.8;resize:vertical;outline:none;font-family:'Noto Sans KR',sans-serif;box-shadow:inset 0 1px 0 rgba(255,255,255,0.74);}
.essay-textarea:focus{border-color:#0EA5E9;box-shadow:0 0 0 3px rgba(14,165,233,0.10),inset 0 1px 0 rgba(255,255,255,0.74);}
.essay-analysis-card{display:grid;grid-template-columns:180px minmax(0,1fr);gap:18px;align-items:start;}
.essay-evidence{display:grid;gap:8px;}
.essay-evidence-item{border:1px solid rgba(14,165,233,0.14);background:rgba(234,247,255,0.62);border-radius:14px;padding:10px 12px;font-size:12.5px;line-height:1.65;color:#4B5563;}
.profile-essay-textarea{margin-top:10px;min-height:150px;}
.essay-edit-feedback{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:8px;}
.essay-edit-feedback span{border-radius:999px;background:#EEF2F7;color:#6B7684;font-size:11px;font-weight:900;padding:5px 8px;}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.textarea-input{min-height:110px;resize:vertical;line-height:1.6;}
.journal-form{border:1px solid #E5EAF1;background:#F8FAFC;border-radius:16px;padding:14px;margin-bottom:14px;}
.journal-form .field{margin-bottom:0;}
.journal-form .field.wide{grid-column:1/-1;}
.journal-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;}
.journal-notice{font-size:12px;color:#0EA5E9;font-weight:700;}
.journal-list{display:flex;flex-direction:column;gap:10px;}
.journal-entry{border:1px solid #E5EAF1;background:rgba(255,255,255,0.86);border-radius:16px;padding:14px;cursor:pointer;transition:border-color 0.14s,background 0.14s;}
.journal-entry:hover,.journal-entry.expanded{border-color:rgba(14,165,233,0.34);background:#fff;}
.journal-entry-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;}
.journal-entry-title{font-size:13px;font-weight:800;color:#202632;letter-spacing:-0.18px;}
.journal-entry-meta{font-size:11.5px;color:#9AA6B2;margin-top:2px;}
.journal-entry-summary{font-size:13px;line-height:1.55;color:#4B5563;margin-top:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.journal-entry-body{font-size:13px;line-height:1.7;color:#4B5563;white-space:pre-wrap;}
.journal-entry-detail{margin-top:12px;padding-top:12px;border-top:1px solid #EEF2F7;}
.journal-next{margin-top:10px;border-radius:12px;background:#F5FBFF;border:1px solid rgba(14,165,233,0.16);padding:10px 12px;}
.journal-next-label{font-size:11px;font-weight:800;color:#0EA5E9;margin-bottom:4px;}
.journal-entry-actions{display:flex;align-items:center;gap:6px;flex-shrink:0;}
.journal-delete-btn{border:1px solid #FECACA;border-radius:999px;background:#FEF2F2;color:#DC2626;font-size:11.5px;font-weight:800;padding:5px 9px;cursor:pointer;font-family:'Noto Sans KR',sans-serif;}
.journal-open-label{border-radius:999px;background:#EEF2F7;color:#6B7684;font-size:11.5px;font-weight:800;padding:5px 9px;}
.booking-page{max-width:560px;margin:0 auto;}
.booking-hero{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px;}
.booking-title{font-size:22px;font-weight:800;color:#202632;letter-spacing:-0.5px;margin-bottom:2px;}
.booking-sub{font-size:14px;color:#6B7684;line-height:1.5;}
.booking-top-btn{display:inline-flex;align-items:center;gap:7px;border:none;border-radius:14px;background:#0EA5E9;color:#fff;font-size:13px;font-weight:800;padding:10px 14px;box-shadow:0 6px 14px rgba(14,165,233,0.22);cursor:pointer;font-family:'Noto Sans KR',sans-serif;white-space:nowrap;}
.booking-top-btn:disabled{background:#A9C8FF;box-shadow:none;cursor:not-allowed;}
.booking-plus{font-size:18px;line-height:1;font-weight:400;}
.booking-card{background:#fff;border:1px solid #E1E7EF;border-radius:18px;padding:16px 18px;box-shadow:0 14px 30px rgba(17,24,39,0.06);}
.calendar-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
.calendar-month{font-size:18px;font-weight:800;color:#202632;letter-spacing:-0.25px;}
.calendar-arrow{width:30px;height:30px;border:none;background:transparent;border-radius:50%;font-size:24px;line-height:1;color:#202632;cursor:pointer;}
.calendar-arrow:hover{background:#EEF2F7;}
.date-strip{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:14px;}
.date-pill{border:none;background:transparent;border-radius:14px;padding:7px 4px;color:#202632;font-family:'Noto Sans KR',sans-serif;cursor:pointer;min-height:52px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;}
.date-pill:hover{background:#F5F7FF;}
.date-pill.active{background:#0EA5E9;color:#fff;box-shadow:0 6px 14px rgba(14,165,233,0.22);}
.date-weekday{font-size:11px;font-weight:800;}
.date-number{font-size:17px;font-weight:800;letter-spacing:-0.25px;}
.booking-label{font-size:13px;font-weight:800;color:#6B7684;margin-bottom:8px;}
.time-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px;}
.time-slot{border:1px solid #E1E7EF;background:#F8FAFC;border-radius:12px;min-height:40px;font-size:14px;font-weight:800;color:#202632;cursor:pointer;font-family:'Noto Sans KR',sans-serif;transition:all 0.12s;}
.time-slot:hover{border-color:#0EA5E9;background:#F5F7FF;}
.time-slot.active{background:#0EA5E9;border-color:#0EA5E9;color:#fff;box-shadow:0 6px 14px rgba(14,165,233,0.18);}
.booking-select,.booking-note{width:100%;border:1px solid #E1E7EF;border-radius:12px;background:#fff;color:#202632;font-size:13.5px;font-weight:700;padding:10px 13px;font-family:'Noto Sans KR',sans-serif;outline:none;box-shadow:0 3px 10px rgba(17,24,39,0.035);}
.booking-select{appearance:auto;margin-bottom:10px;}
.booking-select.placeholder{color:#6B7684;}
.booking-note{min-height:86px;resize:vertical;line-height:1.55;margin-bottom:12px;}
.booking-note::placeholder{color:#6B7684;}
.booking-submit{width:100%;border:none;border-radius:14px;background:#0EA5E9;color:#fff;font-size:14px;font-weight:800;padding:12px 14px;cursor:pointer;font-family:'Noto Sans KR',sans-serif;box-shadow:0 8px 18px rgba(14,165,233,0.2);}
.booking-submit:disabled{background:#A9C8FF;color:#fff;box-shadow:none;cursor:not-allowed;}
.booking-notice{margin-bottom:12px;padding:10px 12px;border-radius:12px;background:#EAF2FF;color:#0EA5E9;font-size:13px;font-weight:700;}
.home-hero{background:#fff;border:1px solid #E5EAF1;border-radius:20px;padding:22px;margin-bottom:14px;box-shadow:0 18px 40px rgba(17,24,39,0.05);}
.home-kicker{font-size:12px;color:#6B7684;font-weight:700;margin-bottom:6px;}
.home-title{font-size:28px;font-weight:800;color:#202632;letter-spacing:-0.8px;margin-bottom:8px;}
.home-sub{font-size:14px;color:#6B7684;line-height:1.7;}
.quick-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:14px;}
.quick-card{background:#fff;border:1px solid #E5EAF1;border-radius:16px;padding:16px;text-align:left;cursor:pointer;font-family:'Noto Sans KR',sans-serif;transition:all 0.12s;}
.quick-card:hover{border-color:#0EA5E9;box-shadow:0 8px 20px rgba(14,165,233,0.08);}
.quick-icon{font-size:22px;margin-bottom:9px;}
.quick-title{font-size:14px;font-weight:800;color:#202632;margin-bottom:3px;}
.quick-body{font-size:12px;color:#6B7684;line-height:1.5;}
.progress-card{background:#fff;border:1px solid #E5EAF1;border-radius:16px;padding:16px;margin-bottom:14px;}
.checklist-groups{display:flex;flex-direction:column;gap:12px;}
.check-month{background:#fff;border:1px solid #E5EAF1;border-radius:16px;overflow:hidden;}
.check-month-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px;background:#FAFAFA;border-bottom:1px solid #EEF2F7;}
.check-month-title{font-size:14px;font-weight:800;color:#202632;}
.check-row{width:100%;border:0;border-bottom:1px solid #EEF2F7;background:#fff;padding:14px 16px;display:flex;align-items:flex-start;gap:12px;text-align:left;cursor:pointer;font-family:'Noto Sans KR',sans-serif;}
.check-row:last-child{border-bottom:0;}
.check-box{width:22px;height:22px;border-radius:50%;border:2px solid #C9D3DF;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;color:#fff;font-size:13px;font-weight:900;}
.check-row.done .check-box{border-color:#14B8A6;background:#14B8A6;}
.check-row.done .check-title{text-decoration:line-through;color:#9AA6B2;}
.check-title{display:block;font-size:14px;font-weight:800;color:#202632;margin-bottom:4px;}
.check-body{display:block;font-size:12.5px;color:#6B7684;line-height:1.6;}
.timeline-overview{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center;border:1px solid rgba(255,255,255,0.74);background:linear-gradient(135deg,rgba(255,255,255,0.76),rgba(234,247,255,0.72));backdrop-filter:blur(20px) saturate(155%);border-radius:24px;padding:22px 24px;margin-bottom:20px;box-shadow:0 16px 40px rgba(11,19,36,0.08),inset 0 1px 0 rgba(255,255,255,0.78);}
.timeline-eyebrow{display:inline-flex;align-items:center;gap:6px;border-radius:999px;background:var(--brand-blue-soft);color:var(--brand-blue);font-size:11px;font-weight:800;padding:5px 10px;margin-bottom:10px;}
.timeline-headline{font-size:20px;line-height:1.32;font-weight:800;color:var(--brand-gray);letter-spacing:-0.35px;}
.timeline-copy{font-size:13px;line-height:1.65;color:var(--brand-muted);margin-top:6px;}
.timeline-ring{position:relative;width:96px;height:96px;border-radius:50%;display:grid;place-items:center;box-shadow:0 12px 28px rgba(14,165,233,0.15);}
.timeline-ring::before{content:"";position:absolute;inset:8px;border-radius:50%;background:rgba(255,255,255,0.94);box-shadow:inset 0 1px 0 rgba(255,255,255,0.9);}
.timeline-ring strong{position:relative;display:block;font-size:22px;line-height:1;font-weight:900;color:var(--brand-blue);letter-spacing:-0.5px;text-align:center;}
.timeline-ring span{position:relative;display:block;margin-top:4px;font-size:11px;font-weight:700;color:var(--brand-muted);text-align:center;}
.timeline-road{position:relative;display:flex;flex-direction:column;gap:18px;margin:0 0 20px;padding-left:52px;}
.timeline-road::before{content:"";position:absolute;left:18px;top:24px;bottom:24px;width:3px;border-radius:999px;background:linear-gradient(180deg,var(--brand-blue),rgba(14,165,233,0.2),rgba(249,115,22,0.42));}
.timeline-step{position:relative;}
.timeline-rail{position:absolute;left:-52px;top:20px;width:40px;display:flex;justify-content:center;}
.timeline-dot{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid rgba(201,211,223,0.9);background:rgba(255,255,255,0.9);color:var(--brand-muted);font-size:13px;font-weight:900;box-shadow:0 8px 18px rgba(11,19,36,0.08);}
.timeline-step.done .timeline-dot{border-color:rgba(20,184,166,0.35);background:#14B8A6;color:#fff;}
.timeline-step.active .timeline-dot{border-color:rgba(14,165,233,0.32);background:var(--brand-blue);color:#fff;box-shadow:0 12px 28px rgba(14,165,233,0.28);}
.timeline-card{border:1px solid rgba(255,255,255,0.74);background:rgba(255,255,255,0.76);backdrop-filter:blur(20px) saturate(155%);border-radius:24px;padding:18px 20px;box-shadow:0 16px 40px rgba(11,19,36,0.08),inset 0 1px 0 rgba(255,255,255,0.78);}
.timeline-step.active .timeline-card{border-color:rgba(14,165,233,0.46);box-shadow:0 20px 46px rgba(14,165,233,0.14),inset 0 1px 0 rgba(255,255,255,0.8);}
.timeline-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px;}
.timeline-month{font-size:16px;line-height:1.3;font-weight:800;color:var(--brand-gray);letter-spacing:-0.25px;}
.timeline-stage{font-size:12px;line-height:1.45;color:var(--brand-muted);margin-top:2px;}
.timeline-count{display:inline-flex;align-items:center;justify-content:center;min-width:44px;border-radius:999px;background:#EEF2F7;color:var(--brand-muted);font-size:12px;font-weight:800;padding:5px 10px;}
.timeline-step.done .timeline-count{background:rgba(20,184,166,0.12);color:#0F766E;}
.timeline-step.active .timeline-count{background:var(--brand-blue-soft);color:var(--brand-blue);}
.timeline-tasks{display:grid;gap:10px;}
.timeline-task{width:100%;border:1px solid var(--brand-border);background:rgba(248,250,252,0.86);border-radius:18px;padding:12px 14px;display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:12px;align-items:center;text-align:left;cursor:pointer;font-family:'Noto Sans KR',sans-serif;transition:all 0.14s;}
.timeline-task:hover{border-color:rgba(14,165,233,0.45);background:#fff;transform:translateY(-1px);box-shadow:0 10px 24px rgba(14,165,233,0.10);}
.timeline-task.done{background:rgba(240,253,250,0.86);border-color:rgba(20,184,166,0.22);}
.timeline-task.urgent{background:#FFF7F0;border-color:rgba(249,115,22,0.28);}
.timeline-task.next{border-color:rgba(14,165,233,0.45);background:linear-gradient(135deg,#fff,#F0FAFF);}
.timeline-task-icon{width:34px;height:34px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:#fff;color:var(--brand-muted);font-size:13px;font-weight:900;box-shadow:inset 0 0 0 1px var(--brand-border);}
.timeline-task.done .timeline-task-icon{background:#14B8A6;color:#fff;box-shadow:none;}
.timeline-task.urgent .timeline-task-icon{background:var(--brand-orange);color:#fff;box-shadow:none;}
.timeline-task.next .timeline-task-icon{background:var(--brand-blue);color:#fff;box-shadow:none;}
.timeline-task-title{display:block;font-size:14px;line-height:1.35;font-weight:800;color:var(--brand-gray);letter-spacing:-0.18px;}
.timeline-task.done .timeline-task-title{text-decoration:line-through;color:var(--brand-muted);}
.timeline-task-body{display:block;font-size:12.5px;line-height:1.55;color:var(--brand-muted);margin-top:3px;}
.timeline-task-status{display:inline-flex;align-items:center;border-radius:999px;padding:5px 9px;background:#EEF2F7;color:var(--brand-muted);font-size:11px;font-weight:800;white-space:nowrap;}
.timeline-task.done .timeline-task-status{background:rgba(20,184,166,0.12);color:#0F766E;}
.timeline-task.urgent .timeline-task-status{background:var(--brand-orange-soft);color:var(--brand-orange);}
.timeline-task.next .timeline-task-status{background:var(--brand-blue-soft);color:var(--brand-blue);}
.timeline-task.readonly{cursor:default;}
.timeline-task.readonly:hover{transform:none;box-shadow:none;}
.counselor-roadmap .timeline-overview{margin-bottom:16px;padding:16px 18px;border-radius:20px;}
.counselor-roadmap .timeline-headline{font-size:17px;}
.counselor-roadmap .timeline-copy{font-size:12.5px;}
.counselor-roadmap .timeline-ring{width:82px;height:82px;}
.counselor-roadmap .timeline-ring strong{font-size:19px;}
.counselor-roadmap .timeline-road{gap:12px;margin-bottom:0;padding-left:42px;}
.counselor-roadmap .timeline-road::before{left:14px;}
.counselor-roadmap .timeline-rail{left:-42px;top:18px;width:30px;}
.counselor-roadmap .timeline-dot{width:30px;height:30px;font-size:12px;}
.counselor-roadmap .timeline-card{border-radius:18px;padding:14px 16px;}
.counselor-roadmap .timeline-card-head{margin-bottom:10px;}
.counselor-roadmap .timeline-month{font-size:14px;}
.counselor-roadmap .timeline-stage{font-size:11.5px;}
.counselor-roadmap .timeline-task{grid-template-columns:30px minmax(0,1fr) auto;border-radius:15px;padding:10px 12px;}
.counselor-roadmap .timeline-task-icon{width:30px;height:30px;border-radius:10px;font-size:12px;}
.counselor-roadmap .timeline-task-title{font-size:13px;}
.counselor-roadmap .timeline-task-body{font-size:12px;}
.assignment-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;}
.assignment-stat{border:1px solid rgba(255,255,255,0.74);background:rgba(255,255,255,0.72);backdrop-filter:blur(20px) saturate(155%);box-shadow:0 16px 40px rgba(11,19,36,0.08),inset 0 1px 0 rgba(255,255,255,0.72);border-radius:22px;padding:16px;}
.assignment-stat-label{font-size:12px;line-height:1.4;color:var(--brand-muted);font-weight:800;margin-bottom:6px;}
.assignment-stat-value{font-size:24px;line-height:1;font-weight:900;color:var(--brand-gray);letter-spacing:-0.5px;}
.assignment-board{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;align-items:start;}
.assignment-column{border:1px solid rgba(255,255,255,0.74);background:rgba(255,255,255,0.68);backdrop-filter:blur(20px) saturate(155%);box-shadow:0 16px 40px rgba(11,19,36,0.08),inset 0 1px 0 rgba(255,255,255,0.72);border-radius:24px;padding:14px;min-height:360px;}
.assignment-column.drop-active{border-color:rgba(14,165,233,0.58);background:rgba(234,247,255,0.72);box-shadow:0 20px 46px rgba(14,165,233,0.14),inset 0 1px 0 rgba(255,255,255,0.78);}
.assignment-column-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:12px;}
.assignment-column-title{font-size:15px;line-height:1.35;font-weight:900;color:var(--brand-gray);letter-spacing:-0.18px;}
.assignment-column-hint{font-size:12px;line-height:1.45;color:var(--brand-muted);margin-top:2px;}
.assignment-count{display:inline-flex;align-items:center;justify-content:center;min-width:30px;border-radius:999px;background:var(--brand-blue-soft);color:var(--brand-blue);font-size:12px;font-weight:900;padding:4px 8px;}
.assignment-stack{display:flex;flex-direction:column;gap:10px;}
.assignment-card{border:1px solid var(--brand-border);background:rgba(255,255,255,0.86);border-radius:18px;padding:13px;box-shadow:0 8px 22px rgba(11,19,36,0.05);cursor:grab;transition:transform 0.14s,box-shadow 0.14s,border-color 0.14s,opacity 0.14s;}
.assignment-card:active{cursor:grabbing;}
.assignment-card.dragging{opacity:0.46;transform:scale(0.98);box-shadow:0 4px 12px rgba(11,19,36,0.06);}
.assignment-card.doing{border-color:rgba(14,165,233,0.35);background:linear-gradient(135deg,#fff,#F0FAFF);}
.assignment-card.review{border-color:rgba(249,115,22,0.26);background:linear-gradient(135deg,#fff,#FFF7F0);}
.assignment-tags{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:8px;}
.assignment-tag{display:inline-flex;align-items:center;border-radius:999px;padding:4px 8px;font-size:11px;font-weight:900;line-height:1;background:#EEF2F7;color:var(--brand-muted);}
.assignment-tag.school{background:var(--brand-blue-soft);color:var(--brand-blue);}
.assignment-tag.academy{background:var(--brand-orange-soft);color:var(--brand-orange);}
.assignment-tag.counselor{background:rgba(20,184,166,0.12);color:#0F766E;}
.assignment-tag.status-todo{background:#EEF2F7;color:var(--brand-muted);}
.assignment-tag.status-doing{background:var(--brand-blue-soft);color:var(--brand-blue);}
.assignment-tag.status-review{background:var(--brand-orange-soft);color:var(--brand-orange);}
.assignment-title{font-size:14px;line-height:1.38;font-weight:900;color:var(--brand-gray);letter-spacing:-0.18px;}
.assignment-meta{font-size:12px;line-height:1.55;color:var(--brand-muted);margin-top:6px;}
.assignment-note{font-size:12.5px;line-height:1.55;color:#4B5563;margin-top:8px;}
.assignment-empty{border:1px dashed rgba(154,166,178,0.42);border-radius:16px;padding:18px 12px;text-align:center;color:var(--brand-subtle);font-size:13px;line-height:1.6;background:rgba(255,255,255,0.48);}
.assignment-form-card{border:1px solid var(--brand-border);background:#F8FAFC;border-radius:18px;padding:14px;margin-bottom:14px;}
.assignment-form-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;}
.assignment-notice{font-size:12px;color:#0EA5E9;font-weight:800;}
.assigned-preview{display:grid;gap:8px;margin-top:10px;}
.assigned-preview .assignment-card{cursor:default;}
.assigned-preview .assignment-card:hover{transform:none;}
.assignment-status-line{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:8px;}
.assignment-status-count{display:inline-flex;align-items:center;border-radius:999px;background:rgba(255,255,255,0.72);border:1px solid var(--brand-border);color:var(--brand-muted);font-size:11.5px;font-weight:900;padding:5px 9px;}
.assignment-preview-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;}
.assignment-preview-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:flex-end;}
.mini-select{border:1px solid #E1E7EF;border-radius:999px;background:#fff;color:#4B5563;font-size:11.5px;font-weight:900;padding:5px 8px;font-family:'Noto Sans KR',sans-serif;outline:none;}
.mini-select:focus{border-color:#0EA5E9;box-shadow:0 0 0 3px rgba(14,165,233,0.08);}
.assignment-delete-btn{border:1px solid #FECACA;border-radius:999px;background:#FEF2F2;color:#DC2626;font-size:11.5px;font-weight:800;padding:5px 9px;cursor:pointer;font-family:'Noto Sans KR',sans-serif;flex-shrink:0;}
.request-list{display:flex;flex-direction:column;gap:10px;}
.request-card{background:#fff;border:1px solid #E5EAF1;border-radius:12px;padding:16px;}
.request-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px;}
.request-title{font-size:15px;font-weight:700;color:#202632;margin-bottom:3px;}
.request-meta{font-size:12px;color:#9AA6B2;line-height:1.6;}
.request-body{font-size:13px;color:#4B5563;line-height:1.7;margin-top:8px;}
.status-pill{display:inline-flex;align-items:center;border-radius:20px;padding:4px 10px;font-size:12px;font-weight:700;background:#FFF7ED;color:#C2410C;}
.status-pill.confirmed{background:#F0FDF4;color:#059669;}
.status-pill.sent{background:#EAF2FF;color:#0EA5E9;}
.action-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;}
.small-primary{border:none;border-radius:8px;background:#0EA5E9;color:#fff;font-size:12.5px;font-weight:700;padding:8px 12px;cursor:pointer;font-family:'Noto Sans KR',sans-serif;}
.small-secondary{border:1px solid #E1E7EF;border-radius:8px;background:#fff;color:#374151;font-size:12.5px;font-weight:600;padding:8px 12px;cursor:pointer;font-family:'Noto Sans KR',sans-serif;}
.mini-list{display:flex;flex-direction:column;gap:8px;}
.mini-item{padding:10px;border-radius:10px;background:#F2F5F9;}
.mini-title{font-size:13px;font-weight:600;color:#202632;margin-bottom:2px;}
.mini-body{font-size:12px;color:#6B7684;}
.strategy-report{display:grid;gap:14px;}
.strategy-hero{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;border:1px solid rgba(255,255,255,0.76);background:linear-gradient(135deg,rgba(255,255,255,0.78),rgba(234,247,255,0.72));border-radius:26px;padding:24px 26px;box-shadow:0 18px 44px rgba(11,19,36,0.09),inset 0 1px 0 rgba(255,255,255,0.76);backdrop-filter:blur(22px) saturate(155%);}
.strategy-eyebrow{display:inline-flex;align-items:center;border-radius:999px;background:var(--brand-blue-soft);color:var(--brand-blue);font-size:11px;font-weight:900;padding:5px 10px;margin-bottom:10px;}
.strategy-title{font-size:24px;line-height:1.28;font-weight:900;color:var(--brand-gray);letter-spacing:-0.5px;}
.strategy-copy{font-size:13px;line-height:1.65;color:var(--brand-muted);margin-top:6px;}
.strategy-score{min-width:112px;border-radius:24px;background:linear-gradient(135deg,var(--brand-blue),#0068D9);color:#fff;text-align:center;padding:18px 16px;box-shadow:0 16px 34px rgba(14,165,233,0.24);}
.strategy-score strong{display:block;font-size:34px;line-height:1;font-weight:900;letter-spacing:-0.8px;}
.strategy-score span{display:block;margin-top:7px;font-size:12px;font-weight:900;}
.strategy-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;}
.strategy-kpi{border:1px solid rgba(255,255,255,0.74);background:rgba(255,255,255,0.72);backdrop-filter:blur(20px) saturate(155%);border-radius:20px;padding:15px 16px;box-shadow:0 12px 30px rgba(11,19,36,0.06),inset 0 1px 0 rgba(255,255,255,0.72);}
.strategy-kpi span{display:block;font-size:11px;font-weight:800;color:var(--brand-subtle);margin-bottom:6px;}
.strategy-kpi strong{display:block;font-size:18px;line-height:1.25;font-weight:900;color:var(--brand-gray);letter-spacing:-0.25px;}
.strategy-card{border:1px solid rgba(255,255,255,0.74);background:rgba(255,255,255,0.72);backdrop-filter:blur(20px) saturate(155%);border-radius:24px;padding:20px 22px;box-shadow:0 16px 40px rgba(11,19,36,0.08),inset 0 1px 0 rgba(255,255,255,0.72);}
.strategy-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px;}
.strategy-label{font-size:11px;font-weight:900;color:var(--brand-blue);margin-bottom:5px;}
.strategy-card h3{margin:0;font-size:18px;line-height:1.35;font-weight:900;color:var(--brand-gray);letter-spacing:-0.25px;}
.strategy-tag,.susi-label{display:inline-flex;align-items:center;border-radius:999px;background:var(--brand-blue-soft);color:var(--brand-blue);font-size:12px;font-weight:900;padding:5px 10px;white-space:nowrap;}
.strategy-split{display:grid;grid-template-columns:210px minmax(0,1fr);gap:14px;align-items:stretch;}
.strategy-diagnosis{border:1px solid var(--brand-border);border-radius:18px;background:#F8FAFC;padding:16px;}
.strategy-big-number{font-size:28px;line-height:1.1;font-weight:900;color:var(--brand-gray);letter-spacing:-0.5px;}
.strategy-list{display:grid;gap:8px;}
.strategy-action{border:1px solid rgba(14,165,233,0.14);background:rgba(234,247,255,0.62);border-radius:14px;padding:10px 12px;color:#4B5563;font-size:13px;line-height:1.6;}
.strategy-chip-row{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px;}
.strategy-chip{display:inline-flex;align-items:center;border-radius:999px;background:#EEF2F7;color:var(--brand-muted);font-size:12px;font-weight:900;padding:5px 10px;}
.swot-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;}
.swot-card{border:1px solid var(--brand-border);border-radius:18px;padding:14px;background:#F8FAFC;}
.swot-card h4{font-size:13px;font-weight:900;color:var(--brand-gray);margin:0 0 8px;}
.swot-card p{font-size:12.5px;line-height:1.6;color:#4B5563;margin:0 0 7px;}
.swot-card p:last-child{margin-bottom:0;}
.swot-card.strength{background:rgba(240,253,244,0.72);border-color:rgba(5,150,105,0.16);}
.swot-card.weakness{background:rgba(255,247,237,0.72);border-color:rgba(249,115,22,0.18);}
.swot-card.opportunity{background:rgba(234,247,255,0.72);border-color:rgba(14,165,233,0.16);}
.swot-card.threat{background:rgba(254,242,242,0.72);border-color:rgba(220,38,38,0.15);}
.gap-meter{height:12px;border-radius:999px;background:#EEF2F7;overflow:hidden;margin-bottom:10px;}
.gap-meter-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,var(--brand-blue),#14B8A6);}
.topic-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;}
.topic-card{display:grid;grid-template-columns:34px minmax(0,1fr);gap:10px;align-items:center;border:1px solid rgba(14,165,233,0.14);background:rgba(234,247,255,0.58);border-radius:16px;padding:12px;}
.topic-card span{width:34px;height:34px;border-radius:12px;background:var(--brand-blue);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;}
.topic-card strong{font-size:13px;line-height:1.55;color:var(--brand-gray);}
.teacher-script{margin-top:12px;border:1px solid rgba(20,184,166,0.16);background:rgba(240,253,250,0.72);border-radius:16px;padding:13px 14px;}
.teacher-script strong{display:block;font-size:12px;font-weight:900;color:#0F766E;margin-bottom:5px;}
.teacher-script p{margin:0;font-size:13px;line-height:1.7;color:#4B5563;}
.subject-plan-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
.subject-plan-card{border:1px solid var(--brand-border);border-radius:16px;background:#F8FAFC;padding:13px;}
.subject-plan-card strong{display:block;font-size:14px;font-weight:900;color:var(--brand-gray);margin-bottom:6px;}
.subject-plan-card span{display:block;font-size:12.5px;line-height:1.6;color:var(--brand-muted);}
.susi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
.susi-card{border:1px solid var(--brand-border);border-radius:18px;background:#F8FAFC;padding:14px;}
.susi-card.reach,.susi-card.high{border-color:rgba(249,115,22,0.24);background:rgba(255,247,237,0.72);}
.susi-card.target{border-color:rgba(14,165,233,0.22);background:rgba(234,247,255,0.72);}
.susi-card.safe{border-color:rgba(5,150,105,0.18);background:rgba(240,253,244,0.72);}
.susi-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;}
.susi-top span{border-radius:999px;background:#fff;color:var(--brand-blue);font-size:11px;font-weight:900;padding:4px 8px;}
.susi-top strong{font-size:12px;color:var(--brand-gray);}
.susi-card h4{font-size:15px;line-height:1.35;color:var(--brand-gray);font-weight:900;margin:0 0 4px;}
.susi-card p{font-size:12.5px;color:var(--brand-muted);margin:0 0 8px;}
.susi-meta{font-size:12px;line-height:1.5;color:#4B5563;}
.career-test-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;}
.career-test-card{border:1px solid var(--brand-border);border-radius:16px;background:#F8FAFC;padding:13px;}
.career-test-card strong{display:block;font-size:13px;font-weight:900;color:var(--brand-gray);}
.career-test-card span{display:block;font-size:11.5px;color:var(--brand-blue);font-weight:900;margin-top:2px;}
.career-test-card p{font-size:12px;line-height:1.55;color:var(--brand-muted);margin:8px 0;}
.career-test-card small{font-size:11px;color:var(--brand-subtle);font-weight:800;}
.career-test-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;}
.career-test-meta a{display:inline-flex;align-items:center;border-radius:999px;background:var(--brand-blue-soft);color:var(--brand-blue);font-size:11.5px;font-weight:900;padding:5px 8px;text-decoration:none;}
.admission-mini-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;}
.admission-mini-card{border:1px solid var(--brand-border);border-radius:16px;background:#F8FAFC;padding:13px;}
.admission-mini-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px;}
.admission-mini-top strong{font-size:14px;color:var(--brand-gray);font-weight:900;}
.admission-mini-card p{font-size:12.5px;color:var(--brand-muted);margin:0 0 7px;}
.admission-mini-card div:last-child{font-size:12px;color:#4B5563;}
.susi-label.safe{background:rgba(5,150,105,0.12);color:#059669;}
.susi-label.target{background:var(--brand-blue-soft);color:var(--brand-blue);}
.susi-label.reach,.susi-label.high{background:var(--brand-orange-soft);color:var(--brand-orange);}
.strategy-report.compact .strategy-hero{padding:18px 20px;}
.strategy-report.compact .strategy-title{font-size:20px;}
.strategy-report.compact .strategy-kpis{grid-template-columns:repeat(4,1fr);}
.strategy-report.compact .strategy-card{padding:16px 18px;border-radius:20px;}
.mobile-nav{display:none;}
.mobile-nav-btn{border:none;background:transparent;color:#6B7684;font-size:11px;font-family:'Noto Sans KR',sans-serif;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 4px;}
.mobile-nav-btn span{font-size:18px;line-height:1;}
.mobile-nav-btn.active{color:#0EA5E9;font-weight:700;}
.spinner{width:32px;height:32px;border:3px solid #E1E7EF;border-top:3px solid #0EA5E9;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px;}
@keyframes spin{to{transform:rotate(360deg);}}
.card,.gsec,.profile-section,.profile-head,.cstat,.class-group,.class-admin-card,.admin-counselor-card,.request-card,.booking-card,.home-hero,.quick-card,.progress-card,.check-month,.auth-card,.rcard,.student-table,.detail-panel,.ovc,.avbox{border-color:rgba(255,255,255,0.74);background:rgba(255,255,255,0.72);backdrop-filter:blur(20px) saturate(155%);box-shadow:0 16px 40px rgba(11,19,36,0.08),inset 0 1px 0 rgba(255,255,255,0.72);}
.card,.gsec,.profile-section,.profile-head,.auth-card{border-radius:20px;}
.ptitle,.booking-title,.home-title,.profile-name,.auth-title,.quick-title,.check-title,.class-title,.student-name,.request-title,.sval,.cstat-value{color:var(--brand-gray);}
.psub,.booking-sub,.home-sub,.quick-body,.request-body,.ibody,.mini-body{color:var(--brand-muted);}
.nav-btn{font-weight:600;border-radius:14px;}
.nav-btn.active,.t-chip.active{background:var(--brand-blue-soft);color:var(--brand-blue);}
.nav-btn:hover,.t-chip:hover,.rrow:hover,.student-card-row:hover,.student-row:hover{background:#F7FAFD;}
.primary-btn,.small-primary,.tab.active,.booking-top-btn,.booking-submit,.date-pill.active,.time-slot.active{background:var(--brand-blue);border-color:var(--brand-blue);color:#fff;}
.primary-btn:hover,.small-primary:hover,.booking-top-btn:hover,.booking-submit:hover{background:var(--brand-blue-dark);}
.abtn.add,.b수시,.score-pill.good,.status-pill.sent,.booking-notice{background:var(--brand-blue-soft);color:var(--brand-blue);}
.status-pill,.b정시{background:var(--brand-orange-soft);color:var(--brand-orange);}
.status-pill.confirmed{background:rgba(14,165,233,0.12);color:var(--brand-blue);}
.quick-card,.request-card,.check-month{border-radius:24px;}
.quick-card:hover{border-color:rgba(14,165,233,0.55);box-shadow:0 18px 36px rgba(14,165,233,0.16),inset 0 1px 0 rgba(255,255,255,0.78);transform:translateY(-1px);}
.booking-card{box-shadow:0 22px 54px rgba(11,19,36,0.12),inset 0 1px 0 rgba(255,255,255,0.78);}
.date-pill,.time-slot,.booking-select,.booking-note{border-color:var(--brand-border);}
.time-slot:hover{border-color:var(--brand-blue);background:#F4F8FF;}
.mobile-nav{background:rgba(255,255,255,0.72);border-top-color:rgba(255,255,255,0.78);backdrop-filter:blur(22px) saturate(145%);}
.mobile-nav-btn.active{color:var(--brand-blue);}
.ptitle,.booking-title{font-size:var(--fs-page);line-height:1.28;font-weight:800;letter-spacing:-0.45px;}
.home-title{font-size:var(--fs-hero);line-height:1.26;font-weight:800;letter-spacing:-0.5px;margin-bottom:8px;}
.profile-name{font-size:24px;line-height:1.3;font-weight:800;letter-spacing:-0.45px;}
.auth-mark{font-size:26px;line-height:1.25;font-weight:800;letter-spacing:-0.45px;}
.auth-title,.calendar-month{font-size:20px;line-height:1.3;font-weight:800;letter-spacing:-0.25px;}
.quick-title,.check-title,.class-title,.request-title,.student-name,.ititle,.mini-title,.detail-title,.check-month-title{font-size:var(--fs-card);line-height:1.35;font-weight:700;letter-spacing:-0.18px;}
.psub,.home-sub,.booking-sub,.quick-body,.check-body,.request-body,.ibody,.mini-body,.auth-copy{font-size:var(--fs-body);line-height:1.65;}
.home-kicker,.nav-label,.secl,.cell-label,.cstat-label,.filter-field label,.slabel{font-size:var(--fs-micro);line-height:1.35;}
.badge,.status-pill,.score-pill,.request-meta,.student-email,.rmeta,.class-meta,.user-meta,.chip,.dchip{font-size:var(--fs-small);line-height:1.45;}
.nav-btn{font-size:14px;line-height:1.3;}
.nav-btn span:first-child{width:20px;text-align:center;font-size:15px;line-height:1;}
.t-chip{font-size:12.5px;line-height:1.35;}
.cstat-value{font-size:22px;line-height:1.18;font-weight:800;}
.sval{font-size:18px;line-height:1.2;font-weight:700;}
.quick-icon{font-size:20px;margin-bottom:10px;line-height:1;}
.home-hero{padding:26px 28px;}
.quick-grid{gap:14px;}
.quick-card{min-height:132px;padding:22px 24px;display:flex;flex-direction:column;justify-content:center;}
.progress-card{padding:20px 24px;}
.progress-value{font-size:20px;line-height:1;font-weight:800;color:var(--brand-blue);}
.booking-title{font-size:22px;}
.booking-label{font-size:14px;line-height:1.4;}
.time-slot{font-size:14px;}
.booking-select,.booking-note{font-size:13.5px;line-height:1.55;}
.booking-submit{font-size:14px;}
.empty{font-size:14px;line-height:1.6;}
@media (max-width: 900px){
  .auth-shell{grid-template-columns:1fr;}
  .auth-brand{padding:4px 0;}
  .cstats{grid-template-columns:repeat(2,1fr);}
  .student-layout{grid-template-columns:1fr;}
  .detail-panel{position:static;}
  .student-row{grid-template-columns:1fr;gap:6px;}
  .student-head{display:none;}
  .filter-grid{grid-template-columns:1fr 1fr;}
  .filter-grid .sw{grid-column:1/-1;}
  .student-card-row{grid-template-columns:1fr;gap:8px;}
  .admin-form-grid{grid-template-columns:1fr 1fr;}
  .admin-student-row{grid-template-columns:1fr 1fr;}
  .cell-label{display:block;}
  .profile-head{flex-direction:column;}
  .profile-major-spotlight{display:flex;width:100%;justify-content:space-between;}
  .profile-grid{grid-template-columns:1fr;}
  .form-grid{grid-template-columns:1fr;}
  .strategy-kpis{grid-template-columns:repeat(2,1fr);}
  .swot-grid,.career-test-grid{grid-template-columns:repeat(2,1fr);}
  .susi-grid,.subject-plan-grid{grid-template-columns:repeat(2,1fr);}
  .admission-grid{grid-template-columns:repeat(2,1fr);}
  .admission-head{flex-direction:column;}
  .admission-range{width:100%;text-align:left;}
  .booking-page{max-width:560px;}
  .booking-hero{align-items:center;}
  .booking-title{font-size:22px;}
  .booking-sub{font-size:13px;}
  .booking-top-btn{padding:10px 14px;font-size:13px;border-radius:14px;}
  .booking-card{padding:16px;border-radius:18px;}
  .calendar-month{font-size:18px;}
  .date-strip{gap:5px;}
  .date-pill{min-height:52px;border-radius:14px;}
  .time-grid{grid-template-columns:repeat(4,1fr);gap:8px;}
  .time-slot{font-size:14px;min-height:40px;border-radius:12px;}
  .booking-select,.booking-note{font-size:13.5px;border-radius:12px;padding:10px 12px;}
  .booking-submit{font-size:14px;border-radius:14px;}
}
@media (max-width: 760px){
  .root{height:100dvh;min-height:100dvh;}
  .sidebar{display:none;}
  .main{width:100%;padding:20px 16px calc(132px + env(safe-area-inset-bottom));}
  .ptitle,.home-title{font-size:22px;}
  .booking-page{max-width:100%;}
  .booking-title{font-size:21px;}
  .psub{font-size:13px;margin-bottom:18px;}
  .card,.gsec,.profile-section,.profile-head{border-radius:12px;padding:16px;}
  .sgrid,.cstats{grid-template-columns:1fr 1fr;}
  .admission-grid{grid-template-columns:1fr 1fr;}
  .dept-stat-list{grid-template-columns:1fr;}
  .quick-grid{grid-template-columns:1fr 1fr;}
  .timeline-overview{grid-template-columns:1fr;padding:18px;border-radius:20px;}
  .timeline-ring{width:84px;height:84px;}
  .timeline-road{padding-left:42px;gap:14px;}
  .timeline-road::before{left:14px;}
  .timeline-rail{left:-42px;width:32px;}
  .timeline-dot{width:30px;height:30px;font-size:12px;}
  .timeline-card{border-radius:20px;padding:16px;}
  .timeline-card-head{align-items:center;}
  .timeline-task{grid-template-columns:30px minmax(0,1fr);gap:10px;padding:12px;}
  .timeline-task-icon{width:30px;height:30px;border-radius:10px;}
  .timeline-task-status{grid-column:2;justify-self:start;margin-top:-4px;}
  .assignment-summary{grid-template-columns:repeat(3,1fr);gap:8px;}
  .assignment-stat{border-radius:18px;padding:12px;}
  .assignment-stat-value{font-size:20px;}
  .assignment-board{grid-template-columns:1fr;gap:12px;}
  .admin-form-grid,.admin-student-row{grid-template-columns:1fr;}
  .admin-capacity{align-items:flex-start;flex-direction:column;}
  .assignment-column{min-height:auto;border-radius:20px;}
  .record-analysis-card{grid-template-columns:1fr;}
  .record-analysis-grid{grid-template-columns:1fr;}
  .record-finding.action{grid-column:auto;}
  .essay-shell{grid-template-columns:1fr;}
  .essay-analysis-card{grid-template-columns:1fr;}
  .strategy-hero{flex-direction:column;padding:20px;border-radius:22px;}
  .strategy-score{width:100%;min-width:0;}
  .strategy-split{grid-template-columns:1fr;}
  .strategy-kpis,.swot-grid,.topic-grid,.subject-plan-grid,.susi-grid,.career-test-grid,.admission-mini-grid{grid-template-columns:1fr;}
  .profile-target-results{grid-template-columns:1fr;}
  .univ-filter-bar{grid-template-columns:1fr;}
  .univ-result-meta{align-items:flex-start;flex-direction:column;}
	  .mobile-nav{display:grid;grid-template-columns:repeat(5,1fr);position:fixed;left:0;right:0;bottom:0;z-index:30;padding:7px 8px calc(7px + env(safe-area-inset-bottom));background:rgba(255,255,255,0.96);border-top:1px solid #E5EAF1;box-shadow:0 -8px 24px rgba(17,24,39,0.08);backdrop-filter:blur(14px);}
	  .mobile-nav.two{grid-template-columns:repeat(2,1fr);}
	  .mobile-nav.three{grid-template-columns:repeat(3,1fr);}
  .auth-root{align-items:flex-start;padding:20px 16px;}
  .auth-card{padding:20px;}
}
@media (max-width: 520px){
  .booking-hero{align-items:flex-start;flex-direction:column;}
  .booking-top-btn{width:100%;justify-content:center;}
  .date-strip{grid-template-columns:repeat(7,minmax(40px,1fr));overflow-x:auto;padding-bottom:2px;}
  .date-pill{min-width:40px;min-height:50px;}
  .date-weekday{font-size:10.5px;}
  .date-number{font-size:16px;}
  .time-grid{grid-template-columns:repeat(2,1fr);}
  .admission-grid{grid-template-columns:1fr;}
}
`;

function StrategyReport({ report, compact = false }) {
  if (!report) return null;
  return (
    <div className={`strategy-report${compact ? " compact" : ""}`}>
      <section className="strategy-hero">
        <div>
          <div className="strategy-eyebrow">AI 전략센터 · SUMMIT 핵심 기능 간소화</div>
          <div className="strategy-title">{report.major} 입시 전략 리포트</div>
          <div className="strategy-copy">성적 진단, SWOT, 세특 갭, 과목 선택, 수시 6장, 진로 탐색을 한 화면에서 요약합니다.</div>
        </div>
        <div className="strategy-score">
          <strong>{report.total}</strong>
          <span>{report.level}</span>
        </div>
      </section>

      <div className="strategy-kpis">
        <div className="strategy-kpi">
          <span>국수영 평균</span>
          <strong>{report.diagnosis.avgValue ? `${(+report.diagnosis.avgValue).toFixed(1)}등급` : "미입력"}</strong>
        </div>
        <div className="strategy-kpi">
          <span>성적 진단</span>
          <strong>{report.diagnosis.status}</strong>
        </div>
        <div className="strategy-kpi">
          <span>세특 근거</span>
          <strong>{report.setechCount}/{report.setechTarget}</strong>
        </div>
        <div className="strategy-kpi">
          <span>생기부 AI</span>
          <strong>{report.recordAnalysis.level}</strong>
        </div>
      </div>

      <section className="strategy-card">
        <div className="strategy-card-head">
          <div>
            <div className="strategy-label">성적 현황 진단</div>
            <h3>중간고사 이후 바로 볼 핵심 지표</h3>
          </div>
          <span className="strategy-tag">{report.diagnosis.latestSemester}</span>
        </div>
        <div className="strategy-split">
          <div className="strategy-diagnosis">
            <div className="strategy-big-number">{report.diagnosis.latestAvg ? `${report.diagnosis.latestAvg}등급` : "성적 필요"}</div>
            <div className="strategy-copy">최근 학기 국수영 평균 기준입니다. 낮을수록 우수합니다.</div>
          </div>
          <div className="strategy-list">
            {report.diagnosis.actions.map((item, index) => <div key={index} className="strategy-action">{item}</div>)}
          </div>
        </div>
        {!!report.diagnosis.weakSubjects.length && (
          <div className="strategy-chip-row">
            {report.diagnosis.weakSubjects.map(item => <span key={item.subject} className="strategy-chip">{item.subject} 보완 · {item.avg.toFixed(1)}등급</span>)}
          </div>
        )}
      </section>

      <section className="strategy-card">
        <div className="strategy-card-head">
          <div>
            <div className="strategy-label">SWOT 분석</div>
            <h3>강점은 살리고, 위험은 상담 과제로 바꾸기</h3>
          </div>
        </div>
        <div className="swot-grid">
          <div className="swot-card strength"><h4>Strength</h4>{report.swot.strengths.map((item, i) => <p key={i}>{item}</p>)}</div>
          <div className="swot-card weakness"><h4>Weakness</h4>{report.swot.weaknesses.map((item, i) => <p key={i}>{item}</p>)}</div>
          <div className="swot-card opportunity"><h4>Opportunity</h4>{report.swot.opportunities.map((item, i) => <p key={i}>{item}</p>)}</div>
          <div className="swot-card threat"><h4>Threat</h4>{report.swot.threats.map((item, i) => <p key={i}>{item}</p>)}</div>
        </div>
      </section>

      <section className="strategy-card">
        <div className="strategy-card-head">
          <div>
            <div className="strategy-label">세특 갭 분석</div>
            <h3>현재 기록과 목표 기록의 차이</h3>
          </div>
          <span className="strategy-tag">{report.setechGap ? `${report.setechGap}건 보완` : "목표 도달"}</span>
        </div>
        <div className="gap-meter">
          <div className="gap-meter-fill" style={{ width:`${Math.min(100, report.setechCount / report.setechTarget * 100)}%` }} />
        </div>
        <div className="strategy-copy">목표는 연간 세특/탐구 근거 {report.setechTarget}건입니다. 단순 개수보다 “교과 질문 → 탐구 → 발표/보고서 → 배운 점” 흐름이 중요합니다.</div>
      </section>

      {!compact && (
        <>
          <section className="strategy-card">
            <div className="strategy-card-head">
              <div>
                <div className="strategy-label">세특 작성 전략 + 주제 추천</div>
                <h3>{report.field} 추천 주제</h3>
              </div>
              <span className="strategy-tag">{report.guide.coreSubjects[0]}</span>
            </div>
            <div className="topic-grid">
              {report.guide.topics.map((topic, index) => (
                <div key={topic} className="topic-card">
                  <span>{index + 1}</span>
                  <strong>{topic}</strong>
                </div>
              ))}
            </div>
            <div className="teacher-script">
              <strong>교과 선생님께 전달할 문장</strong>
              <p>저는 {report.major}를 목표로 하고 있어서, 수업에서 위 주제를 심화 탐구했습니다. 발표 자료와 보고서를 제출드릴 테니 탐구 과정과 배운 점이 세특에 드러나도록 피드백 부탁드립니다.</p>
            </div>
          </section>

          <section className="strategy-card">
            <div className="strategy-card-head">
              <div>
                <div className="strategy-label">과목 선택 전략</div>
                <h3>전공 적합성을 보여주는 선택 과목</h3>
              </div>
            </div>
            <div className="subject-plan-grid">
              {report.guide.subjectPlan.map(([subject, plan]) => (
                <div key={subject} className="subject-plan-card">
                  <strong>{subject}</strong>
                  <span>{plan}</span>
                </div>
              ))}
            </div>
            <div className="strategy-chip-row">
              {report.guide.coreSubjects.map(subject => <span key={subject} className="strategy-chip">{subject}</span>)}
            </div>
          </section>
        </>
      )}

      <section className="strategy-card">
        <div className="strategy-card-head">
          <div>
            <div className="strategy-label">수시 6장 최적 배분</div>
            <h3>상향 1~2 · 적정 2~3 · 안정 1~2</h3>
          </div>
          <span className="strategy-tag">작년도 입결 기준</span>
        </div>
        <div className="susi-grid">
          {report.susiCards.map(card => (
            <div key={card.id} className={`susi-card ${card.fit.className}`}>
              <div className="susi-top">
                <span>{card.fit.label}</span>
                <strong>{card.gradeRange}</strong>
              </div>
              <h4>{card.name}</h4>
              <p>{card.dept}</p>
              <div className="susi-meta">{card.bestTrack} · {card.competition}:1</div>
            </div>
          ))}
        </div>
      </section>

      {!compact && (
        <section className="strategy-card">
          <div className="strategy-card-head">
            <div>
              <div className="strategy-label">진로·학과 탐색</div>
              <h3>커리어넷 API로 검사와 학과 후보 연결</h3>
            </div>
            <span className="strategy-tag">{report.careerTests.some(test => test.source === "careernet") ? "커리어넷 API 연결됨" : "커리어넷 검사 링크"}</span>
          </div>
          <div className="career-test-grid">
              {report.careerTests.map(test => (
                <div key={test.name} className="career-test-card">
                  <div>
                    <strong>{test.name}</strong>
                    <span>{test.type}</span>
                  </div>
                  <p>{test.desc}</p>
                  <div className="career-test-meta">
                    <small>{test.exectime ? `${test.exectime}분 · ` : ""}{test.status}</small>
                    {test.url && <a href={test.url} target="_blank" rel="noreferrer">검사 열기</a>}
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {!!report.targetStats.length && (
        <section className="strategy-card">
          <div className="strategy-card-head">
            <div>
              <div className="strategy-label">대학교 합격선 · 수시 배치표</div>
              <h3>목표 대학별 작년도 입결 비교</h3>
            </div>
          </div>
          <div className="admission-mini-grid">
            {report.targetStats.map(item => (
              <div key={`${item.name}-${item.dept}`} className="admission-mini-card">
                <div className="admission-mini-top">
                  <strong>{item.name}</strong>
                  <span className={`susi-label ${item.fit.className}`}>{item.fit.label}</span>
                </div>
                <p>{item.dept}</p>
                <div>{item.year} 수시 합격권 · {item.gradeRange}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="strategy-card">
        <div className="strategy-card-head">
          <div>
            <div className="strategy-label">다음 액션</div>
            <h3>복잡한 기능을 오늘 할 일로 줄이기</h3>
          </div>
        </div>
        <div className="strategy-list">
          {report.actionPlan.map((item, index) => <div key={index} className="strategy-action">{item}</div>)}
        </div>
      </section>
    </div>
  );
}

export default function App() {
  const [users, setUsers] = useState(() => supabaseEnabled ? [] : allowLocalDemoMode ? loadUsers() : []);
  const [profiles, setProfiles] = useState(() => supabaseEnabled ? {} : allowLocalDemoMode ? loadProfiles() : {});
  const [requests, setRequests] = useState(() => supabaseEnabled ? [] : allowLocalDemoMode ? loadRequests() : []);
  const [counselingJournals, setCounselingJournals] = useState(() => supabaseEnabled ? [] : allowLocalDemoMode ? loadCounselingJournals() : []);
  const [counselorClasses, setCounselorClasses] = useState(() => supabaseEnabled ? [] : allowLocalDemoMode ? loadCounselorClasses() : []);
  const [classMemberships, setClassMemberships] = useState(() => supabaseEnabled ? [] : allowLocalDemoMode ? loadClassMemberships() : []);
  const [currentUserId, setCurrentUserId] = useState(() => supabaseEnabled || !allowLocalDemoMode ? null : readJson(SESSION_KEY, null));
  const [backendReady, setBackendReady] = useState(!supabaseEnabled);
  const [backendError, setBackendError] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name:"", email:"", password:"", role:"student", gradeLevel:"3학년", className:"3-1", highSchool:"", preferredMajor:"", counselorCode:"" });
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [counselorTab, setCounselorTab] = useState("students");
  const [adminQuery, setAdminQuery] = useState("");
  const [adminNotice, setAdminNotice] = useState("");
  const [adminDrafts, setAdminDrafts] = useState({});
  const [joinCode, setJoinCode] = useState("");
  const [joinNotice, setJoinNotice] = useState("");
  const [studentQuery, setStudentQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [gradeFilter, setGradeFilter] = useState("all");
  const [schoolFilter, setSchoolFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [profileStudentId, setProfileStudentId] = useState(null);
  const [requestStatusFilter, setRequestStatusFilter] = useState("pending");
  const [bookingWeekStart, setBookingWeekStart] = useState(todayValue);
  const [requestForm, setRequestForm] = useState(() => ({ category:"", preferredDate:todayValue(), preferredTime:"", message:"" }));
  const [journalForm, setJournalForm] = useState(() => ({ date:todayValue(), topic:"목표 대학 상담", summary:"", nextSteps:"" }));
  const [journalNotice, setJournalNotice] = useState("");
  const [expandedJournalId, setExpandedJournalId] = useState(null);
  const [assignmentForm, setAssignmentForm] = useState(() => ASSIGNMENT_FORM_DEFAULT);
  const [assignmentNotice, setAssignmentNotice] = useState("");
  const [requestNotice, setRequestNotice] = useState("");
  const [section, setSection] = useState("홈");
  const [targets, setTargets] = useState([]);
  const [selId, setSelId] = useState(null);
  const [query, setQuery] = useState("");
  const [apiUniversities, setApiUniversities] = useState([]);
  const [apiMajors, setApiMajors] = useState([]);
  const [careerTests, setCareerTests] = useState(CAREER_TESTS);
  const [universityApiStatus, setUniversityApiStatus] = useState(CAREERNET_API_KEY ? "loading" : "fallback");
  const [regionFilter, setRegionFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [rankFilter, setRankFilter] = useState("overall");
  const [trackTab, setTrackTab] = useState("수시");
  const [grades, setGrades] = useState({});
  const [gibpu, setGibpu] = useState(null);
  const [essays, setEssays] = useState(createEmptyEssays);
  const [activeEssayId, setActiveEssayId] = useState(ESSAY_PROMPTS[0].id);
  const [checklist, setChecklist] = useState({});
  const [assignments, setAssignments] = useState([]);
  const [draggedAssignmentId, setDraggedAssignmentId] = useState(null);
  const [assignmentDropTarget, setAssignmentDropTarget] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [drag, setDrag] = useState(false);
  const [fname, setFname] = useState("");
  const [recordPreview, setRecordPreview] = useState(null);
  const [recordPreviewOpen, setRecordPreviewOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNotice, setAiNotice] = useState("");
  const fileRef = useRef(null);
  const currentUser = users.find(u => u.id === currentUserId) || null;
  const currentRole = currentUser?.role;
  const currentStudentMembership = currentRole === "student"
    ? classMemberships.find(item => item.studentId === currentUserId) || null
    : null;
  const currentStudentClass = currentStudentMembership
    ? counselorClasses.find(item => item.id === currentStudentMembership.classId) || null
    : null;

  const applyBackendState = state => {
    setUsers(state.users || []);
    setProfiles(state.profiles || {});
    setRequests(state.requests || []);
    setCounselingJournals(state.journals || []);
    setCounselorClasses(state.classes || []);
    setClassMemberships(state.memberships || []);
    setCurrentUserId(state.currentUser?.id || null);
    setBackendError("");
    localStorage.removeItem(SESSION_KEY);
  };

  useEffect(() => {
    if (!supabaseEnabled) return;
    let cancelled = false;
    setBackendReady(false);
    loadBackendState()
      .then(state => {
        if (cancelled) return;
        applyBackendState(state);
      })
      .catch(error => {
        if (!cancelled) setBackendError(error.message || "Supabase 연결에 실패했습니다.");
      })
      .finally(() => {
        if (!cancelled) setBackendReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!currentUserId || users.some(u => u.id === currentUserId)) return;
    localStorage.removeItem(SESSION_KEY);
    setCurrentUserId(null);
  }, [currentUserId, users]);

  useEffect(() => {
    return () => {
      if (recordPreview?.url) URL.revokeObjectURL(recordPreview.url);
    };
  }, [recordPreview?.url]);

  useEffect(() => {
    let cancelled = false;
    loadCareerNetData()
      .then(({ universities, majors, tests }) => {
        if (cancelled) return;
        setApiMajors(majors || []);
        setCareerTests(mergeCareerTests(tests || []));
        if (universities.length || majors.length || tests.length) {
          setApiUniversities(universities || []);
          setUniversityApiStatus("careernet");
        } else {
          setUniversityApiStatus("fallback");
        }
      })
      .catch(() => {
        if (!cancelled) setUniversityApiStatus("fallback");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setProfileReady(false);
    if (!currentUser) return;

    if (currentUser.role === "counselor") {
      setSection("학생관리");
      setCounselorTab("students");
      setSelectedStudentId(id => id || users.find(u => u.role === "student")?.id || null);
      return;
    }

    const profile = profiles[currentUser.id] || createProfile();
    if (!profiles[currentUser.id]) {
      setProfiles(prev => {
        const next = { ...prev, [currentUser.id]: profile };
        if (supabaseEnabled) saveBackendProfile(currentUser.id, profile).catch(error => setBackendError(error.message));
        else writeJson(PROFILES_KEY, next);
        return next;
      });
    }
    setTargets(profile.targets || []);
    setGrades(profile.grades || {});
    setGibpu(profile.gibpu || null);
    setEssays({ ...createEmptyEssays(), ...(profile.essays || {}) });
    setActiveEssayId(ESSAY_PROMPTS[0].id);
    setChecklist(profile.checklist || {});
    setAssignments(profile.assignments?.length ? profile.assignments : DEFAULT_ASSIGNMENTS);
    setFname(profile.fname || "");
    setRecordPreview(null);
    setRecordPreviewOpen(false);
    setSection("홈");
    setProfileReady(true);
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (!currentUser || currentUser.role !== "student" || !profileReady) return;
    const nextProfile = createProfile({ targets, grades, gibpu, fname, essays, checklist, assignments });
    setProfiles(prev => {
      const next = {
        ...prev,
        [currentUser.id]: nextProfile,
      };
      if (!supabaseEnabled) writeJson(PROFILES_KEY, next);
      return next;
    });
    if (supabaseEnabled) saveBackendProfile(currentUser.id, nextProfile).catch(error => setBackendError(error.message));
  }, [targets, grades, gibpu, fname, essays, checklist, assignments, currentUser?.id, currentUser?.role, profileReady]);

  useEffect(() => {
    setAssignmentForm(ASSIGNMENT_FORM_DEFAULT);
    setAssignmentNotice("");
    setExpandedJournalId(null);
  }, [profileStudentId]);

  const setAuthValue = (key, value) => {
    setAuthForm(prev => ({ ...prev, [key]: value }));
    setAuthError("");
    setAuthNotice("");
    setShowResendConfirmation(false);
  };

  const startSession = user => {
    setCurrentUserId(user.id);
    if (!supabaseEnabled) writeJson(SESSION_KEY, user.id);
    setAuthForm({ name:"", email:"", password:"", role:"student", gradeLevel:"3학년", className:"3-1", highSchool:"", preferredMajor:"", counselorCode:"" });
    setAuthError("");
    setAuthNotice("");
    setShowResendConfirmation(false);
  };

  const loginWithUser = user => {
    if (!user) return;
    startSession(user);
  };

  const handleAuthSubmit = async e => {
    e.preventDefault();
    const email = normalizeEmail(authForm.email);
    const password = authForm.password.trim();
    setShowResendConfirmation(false);

    if (!email || !password || (authMode === "signup" && !authForm.name.trim())) {
      setAuthError("필수 항목을 입력해주세요.");
      return;
    }

    if (authMode === "signup" && password.length < 6) {
      setAuthError("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }

    if (authMode === "signup" && authForm.role === "student" && !authForm.highSchool.trim()) {
      setAuthError("재학 중인 고등학교를 입력해주세요.");
      return;
    }

    if (authMode === "signup" && authForm.role === "student" && !authForm.preferredMajor.trim()) {
      setAuthError("희망 학과를 입력해주세요.");
      return;
    }

    if (authMode === "signup" && authForm.role === "counselor" && !authForm.counselorCode.trim()) {
      setAuthError("상담사 가입은 초대 코드가 필요합니다.");
      return;
    }

    if (allowLocalDemoMode && authMode === "signup" && authForm.role === "counselor" && authForm.counselorCode.trim() !== COUNSELOR_INVITE_CODE) {
      setAuthError("상담사 초대 코드가 올바르지 않습니다.");
      return;
    }

    if (!supabaseEnabled && !allowLocalDemoMode) {
      setAuthError("공개 배포 링크에 Supabase 설정이 연결되지 않았습니다. GitHub Actions Secrets 설정 후 다시 배포해주세요.");
      return;
    }

    if (authMode === "login") {
      if (supabaseEnabled) {
        try {
          setAuthError("");
          setAuthNotice("");
          const state = await signInBackend(email, password);
          applyBackendState(state);
        } catch (error) {
          setShowResendConfirmation(isUnconfirmedEmailError(error.message));
          setAuthError(getAuthErrorMessage(error) || "로그인에 실패했습니다.");
        }
        return;
      }
      const user = users.find(u => u.email === email);
      if (!user || user.password !== password) {
        setAuthError("이메일 또는 비밀번호가 올바르지 않습니다.");
        return;
      }
      startSession(user);
      return;
    }

    if (supabaseEnabled) {
      try {
        setAuthError("");
        setAuthNotice("");
        const state = await signUpBackend({ ...authForm, email, password });
        if (state?.needsEmailConfirmation) {
          setAuthMode("login");
          setShowResendConfirmation(true);
          setAuthNotice("확인 이메일을 보냈습니다. 메일 인증 후 방금 만든 계정으로 로그인해주세요.");
          return;
        }
        applyBackendState(state);
      } catch (error) {
        setAuthError(getAuthErrorMessage(error) || "회원가입에 실패했습니다.");
      }
      return;
    }

    if (users.some(u => u.email === email)) {
      setAuthError("이미 등록된 이메일입니다.");
      return;
    }

    const user = {
      id: createId(authForm.role),
      name: authForm.name.trim(),
      email,
      password,
      role: authForm.role,
      isActive: true,
      gradeLevel: authForm.role === "student" ? authForm.gradeLevel : undefined,
      className: authForm.role === "student" ? authForm.className.trim() || "미배정" : undefined,
      highSchool: authForm.role === "student" ? authForm.highSchool.trim() : undefined,
      preferredMajor: authForm.role === "student" ? authForm.preferredMajor.trim() : undefined,
    };
    const nextUsers = [...users, user];
    setUsers(nextUsers);
    writeJson(USERS_KEY, nextUsers);

    if (user.role === "student") {
      const nextProfiles = { ...profiles, [user.id]: createProfile() };
      setProfiles(nextProfiles);
      writeJson(PROFILES_KEY, nextProfiles);
    }

    startSession(user);
  };

  const handleResendConfirmation = async () => {
    const email = normalizeEmail(authForm.email);
    if (!email) {
      setAuthError("인증 메일을 다시 보내려면 이메일을 입력해주세요.");
      return;
    }
    try {
      setAuthError("");
      await resendConfirmationBackend(email);
      setShowResendConfirmation(false);
      setAuthNotice("인증 메일을 다시 보냈습니다. 메일함과 스팸함을 확인해주세요.");
    } catch (error) {
      setAuthError(getAuthErrorMessage(error) || "인증 메일 재전송에 실패했습니다.");
    }
  };

  const logout = async () => {
    if (supabaseEnabled) await signOutBackend();
    localStorage.removeItem(SESSION_KEY);
    setCurrentUserId(null);
    setProfileReady(false);
    setTargets([]);
    setGrades({});
    setGibpu(null);
    setEssays(createEmptyEssays());
    setActiveEssayId(ESSAY_PROMPTS[0].id);
    setChecklist({});
    setAssignments([]);
    setFname("");
    setRecordPreview(null);
    setRecordPreviewOpen(false);
    setSelId(null);
    setQuery("");
    setStudentQuery("");
    setProfileStudentId(null);
    setGradeFilter("all");
    setSchoolFilter("all");
    setClassFilter("all");
    setScoreFilter("all");
    setCounselorTab("students");
    setAdminQuery("");
    setAdminNotice("");
    setAdminDrafts({});
    setJoinCode("");
    setJoinNotice("");
    setRequestStatusFilter("pending");
    setRequestNotice("");
    setJournalNotice("");
    setExpandedJournalId(null);
    setJournalForm({ date:todayValue(), topic:"목표 대학 상담", summary:"", nextSteps:"" });
    setAssignmentNotice("");
    setAssignmentForm(ASSIGNMENT_FORM_DEFAULT);
  };

  const updateRequests = updater => {
    setRequests(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (supabaseEnabled) upsertBackendRequests(next).catch(error => setBackendError(error.message));
      else writeJson(REQUESTS_KEY, next);
      return next;
    });
  };

  const updateCounselingJournals = updater => {
    setCounselingJournals(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (supabaseEnabled) upsertBackendJournals(next).catch(error => setBackendError(error.message));
      else writeJson(JOURNALS_KEY, next);
      return next;
    });
  };

  const setAdminDraft = (counselorId, patch) => {
    setAdminDrafts(prev => ({ ...prev, [counselorId]: { ...(prev[counselorId] || {}), ...patch } }));
    setAdminNotice("");
  };

  const saveCounselorAccess = async counselor => {
    if (!currentUser || currentUser.role !== "admin") return;
    const draft = getAdminDraft(counselor);
    const joinCodeValue = normalizeInviteCode(draft.joinCode);
    const maxStudents = Math.max(1, Math.min(500, Number(draft.maxStudents) || 100));

    if (!joinCodeValue) {
      setAdminNotice("상담사 코드를 입력해주세요.");
      return;
    }
    if (joinCodeValue.length < 4) {
      setAdminNotice("상담사 코드는 4자 이상이어야 합니다.");
      return;
    }

    const duplicate = counselorClasses.find(item => normalizeInviteCode(item.joinCode) === joinCodeValue && item.counselorId !== counselor.id);
    if (duplicate) {
      setAdminNotice("이미 다른 상담사가 사용 중인 코드입니다.");
      return;
    }

    if (supabaseEnabled) {
      try {
        const state = await upsertBackendCounselorAccess({
          counselorId: counselor.id,
          name: draft.name || `${counselor.name} 학생 코드`,
          joinCode: joinCodeValue,
          maxStudents,
          isActive: Boolean(draft.isActive),
        });
        applyBackendState(state);
        setAdminDrafts(prev => {
          const next = { ...prev };
          delete next[counselor.id];
          return next;
        });
        setAdminNotice(`${counselor.name} 상담사 설정을 저장했습니다.`);
      } catch (error) {
        setAdminNotice(error.message || "상담사 설정 저장에 실패했습니다.");
      }
      return;
    }

    const existing = getCounselorAccess(counselor.id);
    const nextClass = {
      ...(existing || {
        id: `class-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        counselorId: counselor.id,
        createdAt: new Date().toISOString(),
      }),
      name: draft.name || `${counselor.name} 학생 코드`,
      joinCode: joinCodeValue,
      maxStudents,
      isActive: Boolean(draft.isActive),
      updatedAt: new Date().toISOString(),
    };
    setCounselorClasses(prev => {
      const next = existing
        ? prev.map(item => item.id === existing.id ? nextClass : item)
        : [...prev, nextClass];
      writeJson(CLASSES_KEY, next);
      return next;
    });
    setUsers(prev => {
      const next = prev.map(user => user.id === counselor.id ? { ...user, isActive:Boolean(draft.isActive) } : user);
      writeJson(USERS_KEY, next);
      return next;
    });
    setAdminDrafts(prev => {
      const next = { ...prev };
      delete next[counselor.id];
      return next;
    });
    setAdminNotice(`${counselor.name} 상담사 설정을 저장했습니다.`);
  };

  const changeUserRole = async (targetUser, nextRole) => {
    if (!currentUser || currentUser.role !== "admin" || !targetUser || targetUser.role === nextRole) return;
    if (nextRole !== "counselor") return;

    if (supabaseEnabled) {
      try {
        const state = await setBackendUserRole({ userId:targetUser.id, role:nextRole, isActive:true });
        applyBackendState(state);
        setAdminNotice(`${targetUser.name} 계정을 상담사로 변경했습니다.`);
      } catch (error) {
        setAdminNotice(error.message || "역할 변경에 실패했습니다.");
      }
      return;
    }

    setUsers(prev => {
      const next = prev.map(user => user.id === targetUser.id ? { ...user, role:nextRole, isActive:true } : user);
      writeJson(USERS_KEY, next);
      return next;
    });
    setProfiles(prev => {
      const next = { ...prev };
      delete next[targetUser.id];
      writeJson(PROFILES_KEY, next);
      return next;
    });
    setClassMemberships(prev => {
      const next = prev.filter(item => item.studentId !== targetUser.id);
      writeJson(MEMBERSHIPS_KEY, next);
      return next;
    });
    setAdminNotice(`${targetUser.name} 계정을 상담사로 변경했습니다.`);
  };

  const joinClassWithCode = async e => {
    e.preventDefault();
    if (!currentUser || currentUser.role !== "student") return;
    const code = normalizeInviteCode(joinCode);
    if (!code) {
      setJoinNotice("상담사 코드를 입력해주세요.");
      return;
    }

    if (supabaseEnabled) {
      try {
        const state = await joinBackendClass(code);
        applyBackendState(state);
        setJoinCode("");
        setJoinNotice("");
      } catch (error) {
        setJoinNotice(error.message || "상담사 코드를 확인해주세요.");
      }
      return;
    }

    const targetClass = counselorClasses.find(item => normalizeInviteCode(item.joinCode) === code);
    if (!targetClass) {
      setJoinNotice("상담사 코드를 찾을 수 없습니다.");
      return;
    }
    if (targetClass.isActive === false) {
      setJoinNotice("현재 비활성화된 상담사 코드입니다.");
      return;
    }
    const targetCounselor = users.find(user => user.id === targetClass.counselorId);
    if (targetCounselor?.isActive === false) {
      setJoinNotice("현재 비활성화된 상담사 계정입니다.");
      return;
    }
    const memberCount = classMemberships.filter(item => item.classId === targetClass.id).length;
    if (memberCount >= (targetClass.maxStudents || 100)) {
      setJoinNotice("이 상담사의 학생 정원이 가득 찼습니다.");
      return;
    }
    const nextMemberships = [
      ...classMemberships.filter(item => item.studentId !== currentUser.id),
      { studentId:currentUser.id, classId:targetClass.id, joinedAt:new Date().toISOString() },
    ];
    setClassMemberships(nextMemberships);
    writeJson(MEMBERSHIPS_KEY, nextMemberships);
    setJoinCode("");
    setJoinNotice("");
  };

  const submitConsultationRequest = e => {
    e.preventDefault();
    if (!requestForm.preferredDate) {
      setRequestNotice("희망 날짜를 선택해주세요.");
      return;
    }
    if (!requestForm.preferredTime) {
      setRequestNotice("희망 시간을 선택해주세요.");
      return;
    }
    if (!requestForm.category) {
      setRequestNotice("상담 주제를 선택해주세요.");
      return;
    }

    const nextRequest = createRequest({
      studentId: currentUser.id,
      category: requestForm.category,
      preferredDate: requestForm.preferredDate,
      preferredTime: requestForm.preferredTime,
      message: requestForm.message.trim() || "전달 내용 없음",
    });
    updateRequests(prev => [nextRequest, ...prev]);
    setRequestForm({ category:"", preferredDate:requestForm.preferredDate, preferredTime:"", message:"" });
    setRequestNotice("상담 신청이 접수되었습니다.");
  };

  const openConfirmationEmail = request => {
    const student = allStudentRows.find(row => row.user.id === request.studentId)?.user;
    if (!student) return;
    const subject = `[입시플래너] 상담 일정 확정 안내`;
    const body = `${student.name} 학생 안녕하세요.

상담 신청이 확정되었습니다.

- 상담 분야: ${request.category}
- 상담 일시: ${request.preferredDate}${request.preferredTime ? ` ${request.preferredTime}` : ""}
- 담당 상담사: ${currentUser.name}

상담 전 목표 대학, 성적표, 생활기록부 자료를 확인해 주세요.

감사합니다.`;
    const now = new Date().toISOString();
    updateRequests(prev => prev.map(item => item.id === request.id ? {
      ...item,
      status: "confirmed",
      confirmedAt: item.confirmedAt || now,
      emailSentAt: now,
    } : item));
    window.location.href = `mailto:${student.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const myCounselorClasses = currentRole === "counselor"
    ? counselorClasses.filter(item => item.counselorId === currentUserId)
    : [];
  const classById = new Map(counselorClasses.map(item => [item.id, item]));
  const membershipByStudentId = new Map(classMemberships.map(item => [item.studentId, item]));
  const myClassIds = new Set(myCounselorClasses.map(item => item.id));
  const visibleStudentIds = new Set(
    classMemberships
      .filter(item => myClassIds.has(item.classId))
      .map(item => item.studentId)
  );
  const allStudentRows = users
    .filter(u => u.role === "student")
    .filter(u => currentRole === "admin" ? true : currentRole === "counselor" ? visibleStudentIds.has(u.id) : u.id === currentUserId)
    .map((user, index) => {
      const student = withStudentMeta(user, index);
      const membership = membershipByStudentId.get(user.id) || null;
      const classInfo = membership ? classById.get(membership.classId) || null : null;
      const profile = profiles[user.id] || createProfile();
      const avgValue = coreAvgForGrades(profile.grades || {});
      const primaryTarget = profile.targets?.[0];
      const match = primaryTarget ? getMatchForAvg(primaryTarget, avgValue) : null;
      return { user: student, profile, avgValue, primaryTarget, match, membership, classInfo };
    });
  const schoolOptions = [...new Set(allStudentRows.map(row => row.user.highSchool).filter(Boolean))].sort();
  const classOptions = myCounselorClasses.slice().sort((a, b) => a.name.localeCompare(b.name, "ko", { numeric:true }));
  const studentRows = allStudentRows.filter(({ user, profile, avgValue, classInfo }) => {
      const q = studentQuery.trim().toLowerCase();
      const matchesQuery = !q
        || user.name.toLowerCase().includes(q)
        || user.email.toLowerCase().includes(q)
        || user.highSchool.toLowerCase().includes(q)
        || user.className.toLowerCase().includes(q)
        || user.preferredMajor.toLowerCase().includes(q)
        || (classInfo?.name || "").toLowerCase().includes(q)
        || (classInfo?.joinCode || "").toLowerCase().includes(q)
        || (profile.targets || []).some(t => `${t.name} ${t.dept || ""}`.toLowerCase().includes(q));
      const matchesGrade = gradeFilter === "all" || user.gradeLevel === gradeFilter;
      const matchesSchool = schoolFilter === "all" || user.highSchool === schoolFilter;
      const matchesClass = classFilter === "all" || classInfo?.id === classFilter;
      const matchesScore =
        scoreFilter === "all"
        || (scoreFilter === "top" && avgValue && +avgValue <= 2)
        || (scoreFilter === "middle" && avgValue && +avgValue > 2 && +avgValue <= 4)
        || (scoreFilter === "needs" && avgValue && +avgValue > 4)
        || (scoreFilter === "none" && !avgValue);
      return matchesQuery && matchesGrade && matchesSchool && matchesClass && matchesScore;
    });

  const groupedStudentRows = studentRows.reduce((groups, row) => {
    const key = row.classInfo?.id || "unassigned";
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
    return groups;
  }, {});
  const groupKeys = Object.keys(groupedStudentRows).sort((a, b) => {
    const aName = classById.get(a)?.name || "반 미배정";
    const bName = classById.get(b)?.name || "반 미배정";
    return aName.localeCompare(bName, "ko", { numeric:true });
  });
  const profileStudent = profileStudentId ? allStudentRows.find(row => row.user.id === profileStudentId) : null;
  const profileJournals = profileStudent
    ? counselingJournals
        .filter(journal => journal.studentId === profileStudent.user.id)
        .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
    : [];
  const profileChartData = profileStudent ? SEMS.map(m => {
    const e = { semester: m };
    Object.keys(LINE_COLORS).forEach(s => {
      const g = profileStudent.profile.grades?.[`${s}-${m}`];
      if (g !== undefined) e[s] = +g;
    });
    return e;
  }) : [];
  const profileHasGrades = profileChartData.some(d => Object.keys(d).length > 1);
  const allStudents = allStudentRows.map(row => row.user);
  const studentsWithTargets = allStudentRows.filter(row => (row.profile.targets || []).length > 0);
  const studentsWithGrades = allStudentRows.filter(row => row.avgValue);
  const studentsWithRecord = allStudentRows.filter(row => row.profile.gibpu);
  const visibleRequests = currentRole === "counselor"
    ? requests.filter(request => visibleStudentIds.has(request.studentId))
    : currentRole === "admin"
      ? requests
    : currentRole === "student"
      ? requests.filter(request => request.studentId === currentUserId)
      : [];
  const requestRows = visibleRequests
    .map(request => {
      const studentRow = allStudentRows.find(row => row.user.id === request.studentId);
      return { request, student: studentRow?.user, profile: studentRow?.profile };
    })
    .filter(row => row.student)
    .filter(({ request, student }) => {
      const statusMatch = requestStatusFilter === "all" || request.status === requestStatusFilter;
      const q = studentQuery.trim().toLowerCase();
      const queryMatch = !q
        || student.name.toLowerCase().includes(q)
        || student.email.toLowerCase().includes(q)
        || student.highSchool.toLowerCase().includes(q)
        || student.preferredMajor.toLowerCase().includes(q)
        || request.category.toLowerCase().includes(q)
        || request.message.toLowerCase().includes(q);
      return statusMatch && queryMatch;
    })
    .sort((a, b) => new Date(b.request.createdAt) - new Date(a.request.createdAt));
  const pendingRequests = visibleRequests.filter(request => request.status === "pending");
  const confirmedRequests = visibleRequests.filter(request => request.status === "confirmed");
  const sentRequests = visibleRequests.filter(request => request.emailSentAt);
  const myRequests = currentUser ? requests
    .filter(request => request.studentId === currentUser.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : [];
  const bookingDays = Array.from({ length:7 }, (_, index) => addDays(bookingWeekStart, index));
  const canSubmitRequest = Boolean(requestForm.preferredDate && requestForm.preferredTime && requestForm.category);
  const requestSubmitLabel = !requestForm.preferredTime
    ? "시간을 선택하세요"
    : !requestForm.category
      ? "상담 주제를 선택하세요"
      : "상담 신청하기";
  const roleLabels = { student:"학생", counselor:"상담사", admin:"총관리자" };
  const manageableUsers = users.filter(user => user.role !== "admin");
  const counselorUsers = users.filter(user => user.role === "counselor");
  const getCounselorAccess = counselorId => counselorClasses.find(item => item.counselorId === counselorId) || null;
  const getCounselorStudentCount = counselorId => {
    const ids = new Set(counselorClasses.filter(item => item.counselorId === counselorId).map(item => item.id));
    return classMemberships.filter(item => ids.has(item.classId)).length;
  };
  const getAdminDraft = counselor => {
    const access = getCounselorAccess(counselor.id);
    const draft = adminDrafts[counselor.id] || {};
    return {
      name: draft.name ?? access?.name ?? `${counselor.name} 학생 코드`,
      joinCode: draft.joinCode ?? access?.joinCode ?? "",
      maxStudents: draft.maxStudents ?? access?.maxStudents ?? 100,
      isActive: draft.isActive ?? (access ? access.isActive !== false : counselor.isActive !== false),
    };
  };
  const adminCounselorRows = counselorUsers
    .map(counselor => ({
      counselor,
      access: getCounselorAccess(counselor.id),
      studentCount: getCounselorStudentCount(counselor.id),
      draft: getAdminDraft(counselor),
    }))
    .filter(({ counselor, access }) => {
      const q = adminQuery.trim().toLowerCase();
      if (!q) return true;
      return counselor.name.toLowerCase().includes(q)
        || counselor.email.toLowerCase().includes(q)
        || (access?.joinCode || "").toLowerCase().includes(q);
    });
  const roadmapState = buildRoadmapState(checklist);
  const checklistDoneCount = roadmapState.doneCount;
  const checklistProgress = roadmapState.progress;
  const urgentChecklist = roadmapState.urgent;
  const checklistGroups = roadmapState.groups;
  const activeChecklistIndex = roadmapState.activeIndex;
  const nextChecklistItem = roadmapState.nextItem;
  const profileRoadmapState = profileStudent ? buildRoadmapState(profileStudent.profile.checklist || {}) : null;
  const profileAssignments = profileStudent
    ? (profileStudent.profile.assignments?.length ? profileStudent.profile.assignments : DEFAULT_ASSIGNMENTS)
    : [];
  const profileAssignmentCounts = ASSIGNMENT_COLUMNS.reduce((counts, column) => {
    counts[column.key] = profileAssignments.filter(item => normalizeAssignmentStatus(item.status) === column.key).length;
    return counts;
  }, {});
  const assignmentCounts = ASSIGNMENT_COLUMNS.reduce((counts, column) => {
    counts[column.key] = assignments.filter(item => normalizeAssignmentStatus(item.status) === column.key).length;
    return counts;
  }, {});
  const essayDrafts = { ...createEmptyEssays(), ...essays };
  const activeEssayPrompt = ESSAY_PROMPTS.find(prompt => prompt.id === activeEssayId) || ESSAY_PROMPTS[0];
  const activeEssayText = essayDrafts[activeEssayPrompt.id] || "";
  const essayDoneCount = ESSAY_PROMPTS.filter(prompt => (essayDrafts[prompt.id] || "").trim().length >= 100).length;
  const activeEssayAnalysis = analyzeEssayDraft(activeEssayText, activeEssayPrompt, gibpu?.원문 || "", currentUser?.preferredMajor || "");
  const nextStudentMeeting = myRequests
    .filter(request => request.status !== "cancelled")
    .sort((a, b) => `${a.preferredDate || ""}${a.preferredTime || ""}`.localeCompare(`${b.preferredDate || ""}${b.preferredTime || ""}`))[0];

  const universityCatalog = mergeUniversityCatalog([...UNIVS, ...apiUniversities]);
  const currentStudentProfile = createProfile({ targets, grades, gibpu, fname, essays: essayDrafts, checklist, assignments });
  const studentStrategy = currentUser?.role === "student"
    ? buildStrategyReport(currentUser, currentStudentProfile, universityCatalog, careerTests)
    : null;
  const profileStrategy = profileStudent
    ? buildStrategyReport(profileStudent.user, profileStudent.profile, universityCatalog, careerTests)
    : null;
  const profileTargetIds = new Set((profileStudent?.profile.targets || []).map(item => item.id));
  const profileRecordText = profileStudent?.profile.gibpu && !profileStudent.profile.gibpu.error ? profileStudent.profile.gibpu.원문 || "" : "";
  const activeUniversityFilters = regionFilter !== "all" || departmentFilter !== "all" || rankFilter !== "overall";
  const filtered = universityCatalog
    .filter(u => {
      const q = query.trim().toLowerCase();
      const searchable = `${u.name} ${u.short} ${u.region} ${u.type} ${(u.depts || []).join(" ")}`.toLowerCase();
      return (!q || searchable.includes(q))
        && (regionFilter === "all" || u.region === regionFilter)
        && departmentFilterMatches(u, departmentFilter);
    })
    .sort((a, b) => rankScore(a, rankFilter, departmentFilter) - rankScore(b, rankFilter, departmentFilter) || a.name.localeCompare(b.name, "ko"))
    .slice(0, query.trim() || activeUniversityFilters ? 160 : 0);
  const sel = universityCatalog.find(u => u.id === selId);
  const isAdded = id => targets.some(u => u.id === id);
  const addedTarget = targets.find(u => u.id === selId);

  const addUniv = u => { if (!isAdded(u.id)) setTargets(p => [...p, { ...u, dept: "" }]); setSelId(u.id); setQuery(""); };
  const removeUniv = id => { setTargets(p => p.filter(u => u.id !== id)); if (selId === id) setSelId(null); };
  const setDept = (id, dept) => setTargets(p => p.map(u => u.id === id ? { ...u, dept } : u));
  const toggleChecklist = id => setChecklist(prev => ({ ...prev, [id]: !prev[id] }));
  const setAssignmentStatus = (id, status) => setAssignments(prev => prev.map(item => item.id === id ? { ...item, status } : item));
  const handleAssignmentDrop = status => {
    if (!draggedAssignmentId) return;
    setAssignmentStatus(draggedAssignmentId, status);
    setDraggedAssignmentId(null);
    setAssignmentDropTarget(null);
  };

  const getG = (s, m) => grades[`${s}-${m}`] ?? "";
  const setG = (s, m, v) => {
    const n = parseFloat(v);
    setGrades(p => { const nx = { ...p }, k = `${s}-${m}`; if (v === "" || isNaN(n)) delete nx[k]; else nx[k] = Math.min(9, Math.max(1, n)); return nx; });
  };

  const coreAvg = () => coreAvgForGrades(grades);
  const semAvg = m => semAvgForGrades(grades, m);

  const getMatch = univ => getMatchForAvg(univ, coreAvg());

  const chartData = SEMS.map(m => { const e = { semester: m }; Object.keys(LINE_COLORS).forEach(s => { const g = grades[`${s}-${m}`]; if (g !== undefined) e[s] = +g; }); return e; });
  const hasGrades = chartData.some(d => Object.keys(d).length > 1);
  const avg = coreAvg();
  const matchSel = sel ? getMatch(sel) : null;
  const selectedDepartmentOptions = sel ? departmentOptionsForUniversity(sel, apiMajors) : [];
  const selectedDept = sel ? (addedTarget?.dept || selectedDepartmentOptions[0] || "") : "";
  const admissionStats = sel ? getLastYearAdmissionStats(sel, selectedDept) : null;
  const departmentStats = sel ? selectedDepartmentOptions.slice(0, 80).map(dept => getLastYearAdmissionStats(sel, dept)) : [];

  const updateProfileStudentProfile = updater => {
    if (!profileStudent) return;
    setProfiles(prev => {
      const existingProfile = prev[profileStudent.user.id] || profileStudent.profile || createProfile();
      const nextProfile = typeof updater === "function" ? updater(existingProfile) : { ...existingProfile, ...updater };
      const next = { ...prev, [profileStudent.user.id]: nextProfile };
      if (supabaseEnabled) saveBackendProfile(profileStudent.user.id, nextProfile).catch(error => setBackendError(error.message));
      else writeJson(PROFILES_KEY, next);
      return next;
    });
  };

  const updateProfileStudentUser = patch => {
    if (!profileStudent) return;
    setUsers(prev => {
      const baseUser = prev.find(user => user.id === profileStudent.user.id) || profileStudent.user;
      const nextUser = { ...baseUser, ...patch };
      const next = prev.map(user => user.id === profileStudent.user.id ? nextUser : user);
      if (supabaseEnabled) saveBackendUser(nextUser).catch(error => setBackendError(error.message));
      else writeJson(USERS_KEY, next);
      return next;
    });
  };

  const addProfileTarget = university => {
    if (!profileStudent || profileTargetIds.has(university.id)) return;
    updateProfileStudentProfile(profile => ({
      ...profile,
      targets: [...(profile.targets || []), { ...university, dept: university.depts?.[0] || "" }],
    }));
    setQuery("");
  };

  const removeProfileTarget = id => {
    updateProfileStudentProfile(profile => ({
      ...profile,
      targets: (profile.targets || []).filter(item => item.id !== id),
    }));
  };

  const setProfileTargetDept = (id, dept) => {
    updateProfileStudentProfile(profile => ({
      ...profile,
      targets: (profile.targets || []).map(item => item.id === id ? { ...item, dept } : item),
    }));
  };

  const setProfileGrade = (subject, semester, value) => {
    const n = parseFloat(value);
    updateProfileStudentProfile(profile => {
      const nextGrades = { ...(profile.grades || {}) };
      const key = `${subject}-${semester}`;
      if (value === "" || isNaN(n)) delete nextGrades[key];
      else nextGrades[key] = Math.min(9, Math.max(1, n));
      return { ...profile, grades: nextGrades };
    });
  };

  const updateProfileRecordText = value => {
    updateProfileStudentProfile(profile => ({
      ...profile,
      gibpu: buildRecordFromText(profile.gibpu, value, profileStudent?.user.preferredMajor || ""),
    }));
  };

  const updateProfileEssayDraft = (id, value) => {
    updateProfileStudentProfile(profile => ({
      ...profile,
      essays: { ...createEmptyEssays(), ...(profile.essays || {}), [id]: value },
    }));
  };

  const toggleProfileChecklist = id => {
    updateProfileStudentProfile(profile => ({
      ...profile,
      checklist: { ...(profile.checklist || {}), [id]: !profile.checklist?.[id] },
    }));
  };

  const setProfileAssignmentStatus = (id, status) => {
    updateProfileStudentProfile(profile => {
      const existingAssignments = profile.assignments?.length ? profile.assignments : DEFAULT_ASSIGNMENTS;
      return {
        ...profile,
        assignments: existingAssignments.map(item => item.id === id ? { ...item, status } : item),
      };
    });
  };

  const runProfileRecordAgentAnalysis = async () => {
    if (!profileStudent) return;
    const recordText = profileRecordText;
    if (!recordText.trim()) {
      setAiNotice("생활기록부 원문을 먼저 입력해주세요.");
      return;
    }
    if (!supabaseEnabled) {
      updateProfileRecordText(recordText);
      setAiNotice("규칙 기반 분석을 갱신했습니다. Supabase Edge Function 연결 후 진짜 AI 분석을 사용할 수 있습니다.");
      return;
    }
    setAiBusy(true);
    setAiNotice("");
    try {
      const data = await runAiAnalysis({
        kind: "record",
        preferredMajor: profileStudent.user.preferredMajor || "",
        recordText,
        student: profileStudent.user,
      });
      updateProfileStudentProfile(profile => {
        const source = buildRecordFromText(profile.gibpu, recordText, profileStudent.user.preferredMajor || "");
        return {
          ...profile,
          gibpu: {
            ...source,
            AI분석: {
              score: data.score ?? source.AI분석?.score ?? 0,
              level: data.level || source.AI분석?.level || "분석 완료",
              summary: data.summary || source.AI분석?.summary || "",
              strengths: data.strengths || source.AI분석?.strengths || [],
              gaps: data.gaps || source.AI분석?.gaps || [],
              actions: data.actions || source.AI분석?.actions || [],
              counselorNotes: data.counselorNotes || [],
            },
          },
        };
      });
      setAiNotice("AI 분석이 학생 프로필에 저장되었습니다.");
    } catch (error) {
      setAiNotice(error.message || "AI 분석에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setAiBusy(false);
    }
  };

  const setJournalValue = (key, value) => {
    setJournalForm(prev => ({ ...prev, [key]: value }));
    setJournalNotice("");
  };

  const setAssignmentValue = (key, value) => {
    setAssignmentForm(prev => ({ ...prev, [key]: value }));
    setAssignmentNotice("");
  };

  const submitCounselingJournal = e => {
    e.preventDefault();
    if (!profileStudent) return;
    if (!journalForm.summary.trim()) {
      setJournalNotice("상담 내용을 입력해주세요.");
      return;
    }
    const nextJournal = createCounselingJournal({
      studentId: profileStudent.user.id,
      studentName: profileStudent.user.name,
      counselorId: currentUser.id,
      counselorName: currentUser.name,
      date: journalForm.date || todayValue(),
      topic: journalForm.topic || "상담 기록",
      summary: journalForm.summary.trim(),
      nextSteps: journalForm.nextSteps.trim(),
    });
    updateCounselingJournals(prev => [nextJournal, ...prev]);
    setJournalForm(prev => ({ ...prev, summary:"", nextSteps:"" }));
    setJournalNotice("상담 일지가 저장되었습니다.");
  };

  const deleteCounselingJournal = id => {
    updateCounselingJournals(prev => prev.filter(journal => journal.id !== id));
    if (supabaseEnabled) deleteBackendJournal(id).catch(error => setBackendError(error.message));
    if (expandedJournalId === id) setExpandedJournalId(null);
    setJournalNotice("상담 기록이 삭제되었습니다.");
  };

  const assignStudentTask = e => {
    e.preventDefault();
    if (!profileStudent) return;
    if (!assignmentForm.title.trim()) {
      setAssignmentNotice("과제명을 입력해주세요.");
      return;
    }
    const nextAssignment = {
      id: `assign-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      source: assignmentForm.source,
      subject: assignmentForm.subject.trim() || "입시",
      title: assignmentForm.title.trim(),
      due: assignmentForm.due.trim() || "미정",
      teacher: currentUser?.name || "상담사",
      note: assignmentForm.note.trim() || "선생님이 배정한 과제입니다.",
      status: "todo",
      assignedBy: currentUser?.name || "상담사",
      assignedAt: new Date().toISOString(),
    };
    setProfiles(prev => {
      const existingProfile = prev[profileStudent.user.id] || profileStudent.profile || createProfile();
      const existingAssignments = existingProfile.assignments?.length ? existingProfile.assignments : DEFAULT_ASSIGNMENTS;
      const nextProfile = { ...existingProfile, assignments: [nextAssignment, ...existingAssignments] };
      const next = { ...prev, [profileStudent.user.id]: nextProfile };
      if (supabaseEnabled) saveBackendProfile(profileStudent.user.id, nextProfile).catch(error => setBackendError(error.message));
      else writeJson(PROFILES_KEY, next);
      return next;
    });
    setAssignmentForm(ASSIGNMENT_FORM_DEFAULT);
    setAssignmentNotice("학생의 해야 할 것 칼럼에 과제가 추가되었습니다.");
  };

  const deleteStudentAssignment = id => {
    if (!profileStudent) return;
    setProfiles(prev => {
      const existingProfile = prev[profileStudent.user.id] || profileStudent.profile || createProfile();
      const existingAssignments = existingProfile.assignments?.length ? existingProfile.assignments : DEFAULT_ASSIGNMENTS;
      const nextProfile = { ...existingProfile, assignments: existingAssignments.filter(item => item.id !== id) };
      const next = { ...prev, [profileStudent.user.id]: nextProfile };
      if (supabaseEnabled) saveBackendProfile(profileStudent.user.id, nextProfile).catch(error => setBackendError(error.message));
      else writeJson(PROFILES_KEY, next);
      return next;
    });
    setAssignmentNotice("과제가 삭제되었습니다. 학생 과제 보드에서도 제거됩니다.");
  };

  const updateRecordText = value => {
    const preferredMajor = currentUser?.preferredMajor || "";
    setGibpu(prev => buildRecordFromText(prev, value, preferredMajor));
  };

  const updateEssayDraft = (id, value) => {
    setEssays(prev => ({ ...createEmptyEssays(), ...prev, [id]: value }));
  };

  const runRecordAgentAnalysis = async () => {
    const recordText = gibpu && !gibpu.error ? gibpu.원문 || "" : "";
    if (!recordText.trim()) {
      setAiNotice("생활기록부 원문을 먼저 입력해주세요.");
      return;
    }
    if (!supabaseEnabled) {
      setAiNotice("Supabase 연결 후 진짜 AI 에이전트 분석을 사용할 수 있습니다. 지금은 규칙 기반 분석이 작동 중입니다.");
      return;
    }
    setAiBusy(true);
    setAiNotice("");
    try {
      const data = await runAiAnalysis({
        kind: "record",
        preferredMajor: currentUser?.preferredMajor || "",
        recordText,
        grades,
        targets,
      });
      const analysis = data.analysis;
      if (!analysis) throw new Error("AI 분석 결과가 비어 있습니다.");
      setGibpu(prev => ({
        ...(prev && !prev.error ? prev : createRecordUploadSummary({ name:"생활기록부 원문 입력", type:"text/plain", size:0 }, currentUser?.preferredMajor || "")),
        AI분석: {
          score: Math.round(Number(analysis.score) || 0),
          level: analysis.level || "AI 분석",
          summary: analysis.summary || "",
          strengths: analysis.strengths || [],
          gaps: [...(analysis.gaps || []), ...(analysis.risks || []).map(item => `리스크: ${item}`)],
          actions: analysis.actions || [],
          counselorNotes: analysis.counselorNotes || [],
          nextQuestions: analysis.nextQuestions || [],
        },
      }));
      setAiNotice(`${data.model || "AI"} 에이전트 분석이 완료되었습니다.`);
    } catch (error) {
      setAiNotice(error.message || "AI 에이전트 분석에 실패했습니다.");
    } finally {
      setAiBusy(false);
    }
  };

  const shiftBookingWeek = days => {
    setBookingWeekStart(prev => {
      const next = addDays(prev, days);
      setRequestForm(form => ({ ...form, preferredDate: next, preferredTime: "" }));
      return next;
    });
    setRequestNotice("");
  };

  const handleFile = async file => {
    if (!isRecordFile(file)) {
      setGibpu({ error: "PDF 또는 이미지 파일을 업로드해주세요." });
      setRecordPreview(null);
      setRecordPreviewOpen(false);
      return;
    }
    const existingText = gibpu && !gibpu.error ? gibpu.원문 || "" : "";
    const preferredMajor = currentUser?.preferredMajor || "";
    setFname(file.name); setParsing(true); setGibpu(null); setRecordPreview(createRecordPreview(file)); setRecordPreviewOpen(false);
    try {
      await new Promise(resolve => setTimeout(resolve, 250));
      const nextRecord = createRecordUploadSummary(file, preferredMajor);
      setGibpu(existingText ? buildRecordFromText(nextRecord, existingText, preferredMajor) : nextRecord);
    } catch {
      const nextRecord = createRecordUploadSummary(file, preferredMajor);
      setGibpu(existingText ? buildRecordFromText(nextRecord, existingText, preferredMajor) : nextRecord);
    }
    finally { setParsing(false); }
  };

  if (!backendReady) {
    return (
      <>
        <style>{css}</style>
        <main className="auth-root">
          <div style={{ textAlign:"center", color:"#6B7684" }}>
            <div className="spinner" />
            <div>Supabase 계정 정보를 불러오는 중입니다...</div>
          </div>
        </main>
      </>
    );
  }

  if (!currentUser) {
    return (
      <>
        <style>{css}</style>
        <div className="auth-root">
          <div className="auth-shell">
            <div className="auth-brand">
              <div className="auth-mark">입시<span>플래너</span></div>
              <div className="auth-copy">학생은 목표 대학과 성적을 관리하고, 상담사는 등록된 학생 현황을 한 화면에서 확인합니다.</div>
            </div>
            <form className="auth-card" onSubmit={handleAuthSubmit}>
              <div className="auth-title">{authMode === "login" ? "로그인" : "회원가입"}</div>
              <div className="auth-sub">{authMode === "login" ? "계정으로 계속하기" : "역할을 선택하고 계정을 만드세요"}</div>

              <div className="seg">
                <button type="button" className={`seg-btn${authMode === "login" ? " active" : ""}`} onClick={() => { setAuthMode("login"); setAuthError(""); setAuthNotice(""); }}>로그인</button>
                <button type="button" className={`seg-btn${authMode === "signup" ? " active" : ""}`} onClick={() => { setAuthMode("signup"); setAuthError(""); setAuthNotice(""); }}>회원가입</button>
              </div>

              {authMode === "signup" && (
                <>
                  <div className="seg">
                    <button type="button" className={`seg-btn${authForm.role === "student" ? " active" : ""}`} onClick={() => setAuthValue("role", "student")}>학생</button>
                    <button type="button" className={`seg-btn${authForm.role === "counselor" ? " active" : ""}`} onClick={() => setAuthValue("role", "counselor")}>상담사</button>
                  </div>
                  <div className="field">
                    <label htmlFor="auth-name">이름</label>
                    <input id="auth-name" className="auth-input" value={authForm.name} onChange={e => setAuthValue("name", e.target.value)} autoComplete="name" />
                  </div>
                  {authForm.role === "student" && (
                    <>
                      <div className="field">
                        <label htmlFor="auth-school">현재 다니는 고등학교</label>
                        <input id="auth-school" className="auth-input" value={authForm.highSchool} onChange={e => setAuthValue("highSchool", e.target.value)} placeholder="예: 서울고등학교" />
                      </div>
                      <div className="field">
                        <label htmlFor="auth-major">희망 학과</label>
                        <input id="auth-major" className="auth-input" value={authForm.preferredMajor} onChange={e => setAuthValue("preferredMajor", e.target.value)} placeholder="예: 컴퓨터공학과" />
                      </div>
	                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
	                        <div className="field">
	                          <label htmlFor="auth-grade">학년</label>
                          <select id="auth-grade" className="auth-input" value={authForm.gradeLevel} onChange={e => setAuthValue("gradeLevel", e.target.value)}>
                            <option value="1학년">1학년</option>
                            <option value="2학년">2학년</option>
                            <option value="3학년">3학년</option>
                          </select>
                        </div>
                        <div className="field">
                          <label htmlFor="auth-class">반</label>
	                          <input id="auth-class" className="auth-input" value={authForm.className} onChange={e => setAuthValue("className", e.target.value)} placeholder="예: 3-1" />
	                        </div>
	                      </div>
	                    </>
	                  )}
                  {authForm.role === "counselor" && (
                    <div className="field">
                      <label htmlFor="auth-counselor-code">상담사 초대 코드</label>
                      <input
                        id="auth-counselor-code"
                        className="auth-input"
                        value={authForm.counselorCode}
                        onChange={e => setAuthValue("counselorCode", e.target.value)}
                        placeholder="관리자에게 받은 코드"
                        autoComplete="off"
                      />
                    </div>
                  )}
                </>
              )}

              <div className="field">
                <label htmlFor="auth-email">이메일</label>
                <input id="auth-email" className="auth-input" type="email" value={authForm.email} onChange={e => setAuthValue("email", e.target.value)} autoComplete="email" />
              </div>
              <div className="field">
                <label htmlFor="auth-password">비밀번호</label>
                <input id="auth-password" className="auth-input" type="password" value={authForm.password} onChange={e => setAuthValue("password", e.target.value)} autoComplete={authMode === "login" ? "current-password" : "new-password"} />
              </div>

              {authNotice && <div className="auth-notice">{authNotice}</div>}
              {!supabaseEnabled && !allowLocalDemoMode && (
                <div className="auth-error">
                  공개 배포 링크에 Supabase 설정이 없습니다. 관리자에게 배포 설정 확인을 요청해주세요.
                </div>
              )}
              {authError && <div className="auth-error">{authError}</div>}
              {showResendConfirmation && supabaseEnabled && (
                <button type="button" className="ghost-btn auth-resend-btn" onClick={handleResendConfirmation}>
                  인증 메일 다시 보내기
                </button>
              )}
              <button className="primary-btn" type="submit">{authMode === "login" ? "로그인" : "가입하기"}</button>

              {backendError && <div className="auth-error">{backendError}</div>}
              {allowLocalDemoMode && (
                <div className="ghost-row">
                  <button type="button" className="ghost-btn" onClick={() => loginWithUser(users.find(u => u.email === "minseo@student.test"))}>학생 체험</button>
                  <button type="button" className="ghost-btn" onClick={() => loginWithUser(users.find(u => u.email === "counselor@test.com"))}>상담사 체험</button>
                  <button type="button" className="ghost-btn" onClick={() => loginWithUser(users.find(u => u.email === "admin@test.com"))}>관리자 체험</button>
                </div>
              )}
            </form>
          </div>
        </div>
      </>
    );
	  }

	  if (currentRole === "admin") {
	    return (
	      <>
	        <style>{css}</style>
	        <div className="root">
	          <aside className="sidebar">
	            <div className="logo">입시<span>플래너</span> 🎓</div>
	            <div className="nav-section">
	              <div className="nav-label">총관리자</div>
	              <button className="nav-btn active" type="button"><span>⚙️</span>운영 관리</button>
	            </div>
	            <div className="sidebar-spacer" />
	            <div className="userbox">
	              <div className="user-name">{currentUser.name}</div>
	              <div className="user-meta">{currentUser.email}</div>
	              <button className="logout-btn" type="button" onClick={logout}>로그아웃</button>
	            </div>
	          </aside>
	          <main className="main">
	            <div className="ptitle">총관리자 대시보드</div>
	            <div className="psub">상담사별 학생용 코드, 정원, 활성 상태와 연결된 학생을 관리합니다</div>

	            <div className="cstats">
	              <div className="cstat"><div className="cstat-label">상담사</div><div className="cstat-value">{counselorUsers.length}</div></div>
	              <div className="cstat"><div className="cstat-label">활성 코드</div><div className="cstat-value">{counselorClasses.filter(item => item.isActive !== false).length}</div></div>
	              <div className="cstat"><div className="cstat-label">학생</div><div className="cstat-value">{allStudents.length}</div></div>
	              <div className="cstat"><div className="cstat-label">미배정 학생</div><div className="cstat-value">{allStudentRows.filter(row => !row.classInfo).length}</div></div>
	            </div>

	            <section className="profile-section">
	              <div className="request-top">
	                <div>
	                  <div className="secl">상담사 가입 공용 코드</div>
	                  <div className="mini-body">상담사가 회원가입할 때 쓰는 공용 승인 코드입니다. 학생에게 주는 코드는 아래에서 상담사별로 따로 관리합니다.</div>
	                </div>
	                <span className="status-pill sent">{COUNSELOR_INVITE_CODE}</span>
	              </div>
	              <div className="sw" style={{ marginBottom:0 }}>
	                <span className="ico">🔍</span>
	                <input type="search" value={adminQuery} onChange={e => setAdminQuery(e.target.value)} placeholder="상담사명, 이메일, 학생용 코드 검색" />
	              </div>
	            </section>

	            <section className="profile-section">
	              <div className="request-top">
	                <div>
	                  <div className="secl">가입자 역할 관리</div>
	                  <div className="mini-body">학생으로 가입된 사용자를 상담사로 전환합니다. 상담사 계정은 이 화면에서 학생으로 되돌리지 않습니다.</div>
	                </div>
	                <span className="status-pill sent">{manageableUsers.length}명</span>
	              </div>
	              <div className="admin-student-table">
	                {manageableUsers.map(user => (
	                  <div key={user.id} className="admin-student-row admin-user-row">
	                    <div>
	                      <div className="student-name">{user.name}</div>
	                      <div className="student-email">{user.email}</div>
	                    </div>
	                    <div><span className={`role-pill ${user.role}`}>{roleLabels[user.role] || user.role}</span></div>
	                    <div>{user.role === "student" ? user.highSchool || "학교 미입력" : getCounselorAccess(user.id)?.joinCode || "코드 미발급"}</div>
	                    <div className="admin-role-actions">
	                      {user.role === "student" ? (
	                        <button className="small-primary" type="button" onClick={() => changeUserRole(user, "counselor")}>상담사로</button>
	                      ) : (
	                        <span className="role-pill counselor">상담사 등록됨</span>
	                      )}
	                    </div>
	                  </div>
	                ))}
	                {!manageableUsers.length && <div className="empty" style={{ padding:"36px 20px" }}>가입자가 없습니다</div>}
	              </div>
	            </section>

	            {adminNotice && <div className={`ai-notice${adminNotice.includes("저장") ? " done" : ""}`}>{adminNotice}</div>}

	            <div className="admin-counselor-list">
	              {adminCounselorRows.map(({ counselor, access, studentCount, draft }) => {
	                const studentRowsForCounselor = allStudentRows.filter(row => row.classInfo?.counselorId === counselor.id);
	                return (
	                  <section key={counselor.id} className="admin-counselor-card">
	                    <div className="admin-counselor-head">
	                      <div>
	                        <div className="student-name">{counselor.name}</div>
	                        <div className="student-email">{counselor.email}</div>
	                      </div>
	                      <span className={`status-pill${draft.isActive ? " confirmed" : ""}`}>{draft.isActive ? "활성" : "비활성"}</span>
	                    </div>
	                    <div className="admin-form-grid">
	                      <div className="field">
	                        <label htmlFor={`admin-access-name-${counselor.id}`}>관리 이름</label>
	                        <input id={`admin-access-name-${counselor.id}`} className="auth-input" value={draft.name} onChange={e => setAdminDraft(counselor.id, { name:e.target.value })} />
	                      </div>
	                      <div className="field">
	                        <label htmlFor={`admin-access-code-${counselor.id}`}>학생용 코드</label>
	                        <input id={`admin-access-code-${counselor.id}`} className="auth-input" value={draft.joinCode} onChange={e => setAdminDraft(counselor.id, { joinCode:e.target.value })} placeholder="예: DAYNA2026" autoComplete="off" />
	                      </div>
	                      <div className="field">
	                        <label htmlFor={`admin-access-max-${counselor.id}`}>최대 학생 수</label>
	                        <input id={`admin-access-max-${counselor.id}`} className="auth-input" type="number" min="1" max="500" value={draft.maxStudents} onChange={e => setAdminDraft(counselor.id, { maxStudents:e.target.value })} />
	                      </div>
	                      <label className="admin-toggle">
	                        <input type="checkbox" checked={Boolean(draft.isActive)} onChange={e => setAdminDraft(counselor.id, { isActive:e.target.checked })} />
	                        <span>활성화</span>
	                      </label>
	                    </div>
	                    <div className="admin-capacity">
	                      <div className="mbar" style={{ flex:1, marginTop:0 }}>
	                        <div style={{ height:"100%", width:`${Math.min(100, studentCount / Math.max(1, Number(draft.maxStudents) || 100) * 100)}%`, background:"#0EA5E9", borderRadius:8 }} />
	                      </div>
	                      <strong>{studentCount}/{Number(draft.maxStudents) || 100}명</strong>
	                      <button className="small-primary" type="button" onClick={() => saveCounselorAccess(counselor)}>저장</button>
	                    </div>
	                    <div className="admin-student-list">
	                      {studentRowsForCounselor.map(row => (
	                        <span key={row.user.id} className="admin-student-chip">
	                          {row.user.name} · {row.user.highSchool} · {row.user.preferredMajor}
	                        </span>
	                      ))}
	                      {!studentRowsForCounselor.length && <div className="assignment-empty">아직 연결된 학생이 없습니다</div>}
	                    </div>
	                  </section>
	                );
	              })}
	              {!adminCounselorRows.length && <div className="empty" style={{ padding:"48px 20px" }}>조건에 맞는 상담사가 없습니다</div>}
	            </div>

	            <section className="profile-section">
	              <div className="request-top">
	                <div>
	                  <div className="secl">전체 학생</div>
	                  <div className="mini-body">상담사 코드로 연결된 학생과 아직 배정되지 않은 학생을 함께 확인합니다.</div>
	                </div>
	                <span className="status-pill sent">{allStudentRows.length}명</span>
	              </div>
	              <div className="admin-student-table">
	                {allStudentRows.map(row => (
	                  <div key={row.user.id} className="admin-student-row">
	                    <div>
	                      <div className="student-name">{row.user.name}</div>
	                      <div className="student-email">{row.user.email}</div>
	                    </div>
	                    <div>{row.user.highSchool}</div>
	                    <div>{row.user.preferredMajor}</div>
	                    <div>{row.classInfo?.name || "미배정"}</div>
	                    <div>{row.avgValue ? `${(+row.avgValue).toFixed(1)}등급` : "성적 미입력"}</div>
	                  </div>
	                ))}
	              </div>
	            </section>
	          </main>
	        </div>
	      </>
	    );
	  }

	  if (currentRole === "student" && !currentStudentMembership) {
	    return (
	      <>
	        <style>{css}</style>
	        <main className="auth-root">
	          <form className="auth-card join-card" onSubmit={joinClassWithCode}>
	            <div className="auth-title">상담사 코드 입력</div>
	            <div className="auth-sub">담당 상담사에게 받은 학생용 코드를 입력하면 입시플래너가 열립니다.</div>
	            <div className="field">
	              <label htmlFor="join-class-code">상담사 코드</label>
	              <input
	                id="join-class-code"
	                className="auth-input"
	                value={joinCode}
	                onChange={e => { setJoinCode(e.target.value); setJoinNotice(""); }}
	                placeholder="예: PARK3"
	                autoComplete="off"
	              />
	            </div>
	            {joinNotice && <div className="auth-error">{joinNotice}</div>}
	            <button className="primary-btn" type="submit">입장하기</button>
	            <button className="logout-btn" type="button" onClick={logout}>로그아웃</button>
	          </form>
	        </main>
	      </>
	    );
	  }

	  if (currentRole === "counselor" && currentUser.isActive === false) {
	    return (
	      <>
	        <style>{css}</style>
	        <main className="auth-root">
	          <div className="auth-card join-card">
	            <div className="auth-title">계정 비활성화</div>
	            <div className="auth-sub">총관리자가 상담사 계정을 다시 활성화하면 학생 관리 화면을 사용할 수 있습니다.</div>
	            <button className="logout-btn" type="button" onClick={logout}>로그아웃</button>
	          </div>
	        </main>
	      </>
	    );
	  }

	  if (currentRole === "counselor") {
    return (
      <>
        <style>{css}</style>
        <div className="root">
          <aside className="sidebar">
            <div className="logo">입시<span>플래너</span> 🎓</div>
            <div className="nav-section">
              <div className="nav-label">상담사</div>
              <button className={`nav-btn${counselorTab === "students" ? " active" : ""}`} type="button" onClick={() => { setCounselorTab("students"); setProfileStudentId(null); }}>
                <span>👥</span>학생 관리
              </button>
	              <button className={`nav-btn${counselorTab === "classes" ? " active" : ""}`} type="button" onClick={() => { setCounselorTab("classes"); setProfileStudentId(null); }}>
	                <span>🔑</span>내 코드
	              </button>
              <button className={`nav-btn${counselorTab === "requests" ? " active" : ""}`} type="button" onClick={() => { setCounselorTab("requests"); setProfileStudentId(null); }}>
                <span>✉️</span>상담 신청
                {pendingRequests.length > 0 && <span style={{ marginLeft:"auto", fontSize:11, color:"#DC2626", fontWeight:700 }}>{pendingRequests.length}</span>}
              </button>
            </div>
            <div className="sidebar-spacer" />
            <div className="userbox">
              <div className="user-name">{currentUser.name}</div>
              <div className="user-meta">{currentUser.email}</div>
              <button className="logout-btn" type="button" onClick={logout}>로그아웃</button>
            </div>
          </aside>
          <main className="main">
            {counselorTab === "requests" ? (
              <>
                <div className="ptitle">상담 신청</div>
                <div className="psub">학생이 신청한 상담을 확인하고 확정 이메일을 작성합니다</div>

                <div className="cstats">
	                  <div className="cstat"><div className="cstat-label">전체 신청</div><div className="cstat-value">{visibleRequests.length}</div></div>
                  <div className="cstat"><div className="cstat-label">대기</div><div className="cstat-value">{pendingRequests.length}</div></div>
                  <div className="cstat"><div className="cstat-label">확정</div><div className="cstat-value">{confirmedRequests.length}</div></div>
                  <div className="cstat"><div className="cstat-label">이메일 작성</div><div className="cstat-value">{sentRequests.length}</div></div>
                </div>

                <div className="filter-grid" style={{ gridTemplateColumns:"1.4fr repeat(3,minmax(120px,1fr))" }}>
                  <div className="sw" style={{ marginBottom:0 }}>
                    <span className="ico">🔍</span>
                    <input type="search" value={studentQuery} onChange={e => setStudentQuery(e.target.value)} placeholder="학생명, 학교, 학과, 상담 분야, 내용 검색" />
                  </div>
                  <div className="filter-field">
                    <label htmlFor="request-status-filter">상태</label>
                    <select id="request-status-filter" value={requestStatusFilter} onChange={e => setRequestStatusFilter(e.target.value)}>
                      <option value="pending">대기</option>
                      <option value="confirmed">확정</option>
                      <option value="all">전체</option>
                    </select>
                  </div>
                  <div className="filter-field">
                    <label htmlFor="request-grade-filter">학년</label>
                    <select id="request-grade-filter" value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}>
                      <option value="all">전체</option>
                      <option value="1학년">1학년</option>
                      <option value="2학년">2학년</option>
                      <option value="3학년">3학년</option>
                    </select>
                  </div>
                  <div className="filter-field">
                    <label htmlFor="request-school-filter">고등학교</label>
                    <select id="request-school-filter" value={schoolFilter} onChange={e => setSchoolFilter(e.target.value)}>
                      <option value="all">전체</option>
                      {schoolOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="request-list">
                  {requestRows
                    .filter(({ student }) => (gradeFilter === "all" || student.gradeLevel === gradeFilter) && (schoolFilter === "all" || student.highSchool === schoolFilter))
                    .map(({ request, student }) => (
                      <section key={request.id} className="request-card">
                        <div className="request-top">
                          <div>
                            <div className="request-title">{student.name} · {request.category}</div>
                            <div className="request-meta">{student.highSchool} · {student.preferredMajor} · {student.gradeLevel} {student.className} · {student.email}</div>
                            <div className="request-meta">희망 일시: {request.preferredDate || "미정"}{request.preferredTime ? ` ${request.preferredTime}` : ""} · 신청일: {new Date(request.createdAt).toLocaleDateString("ko-KR")}</div>
                          </div>
                          <span className={`status-pill${request.status === "confirmed" ? " confirmed" : ""}`}>{request.status === "confirmed" ? "확정" : "대기"}</span>
                        </div>
                        <div className="request-body">{request.message}</div>
                        {request.emailSentAt && <div className="request-meta" style={{ marginTop:8 }}>이메일 작성: {new Date(request.emailSentAt).toLocaleString("ko-KR")}</div>}
                        <div className="action-row">
                          <button className="small-secondary" type="button" onClick={() => { setCounselorTab("students"); setProfileStudentId(student.id); }}>학생 프로필 보기</button>
                          <button className="small-primary" type="button" onClick={() => openConfirmationEmail(request)}>
                            {request.status === "confirmed" ? "확인 이메일 다시 작성" : "컨펌하고 이메일 작성"}
                          </button>
                        </div>
                      </section>
                    ))}
                  {!requestRows.filter(({ student }) => (gradeFilter === "all" || student.gradeLevel === gradeFilter) && (schoolFilter === "all" || student.highSchool === schoolFilter)).length && (
                    <div className="empty" style={{ padding:"48px 20px" }}>조건에 맞는 상담 신청이 없습니다</div>
                  )}
                </div>
              </>
	            ) : counselorTab === "classes" ? (
	              <>
	                <div className="ptitle">내 학생용 코드</div>
	                <div className="psub">총관리자가 발급한 코드를 학생에게 공유하세요. 코드는 상담사가 직접 수정할 수 없습니다</div>

	                <div className="class-admin-grid">
	                  {myCounselorClasses.map(item => {
	                    const memberCount = classMemberships.filter(membership => membership.classId === item.id).length;
	                    return (
	                      <section key={item.id} className="class-admin-card">
	                        <div className="class-admin-top">
	                          <div>
	                            <div className="class-title">{item.name}</div>
	                            <div className="class-meta">학생 {memberCount}/{item.maxStudents || 100}명 · {item.isActive === false ? "비활성" : "활성"}</div>
	                          </div>
	                          <span className={`status-pill${item.isActive !== false ? " confirmed" : ""}`}>{item.isActive === false ? "중지됨" : "사용 가능"}</span>
	                        </div>
	                        <div className="class-code-box">{item.joinCode}</div>
	                      </section>
	                    );
	                  })}
	                  {!myCounselorClasses.length && <div className="empty" style={{ padding:"48px 20px" }}>총관리자가 학생용 코드를 발급하면 여기에 표시됩니다</div>}
	                </div>
	              </>
	            ) : profileStudent ? (
              <>
                <button className="back-btn" type="button" onClick={() => setProfileStudentId(null)}>← 학생 목록</button>
                <div className="profile-head">
                  <div className="profile-head-main">
                    <div className="profile-name">{profileStudent.user.name}</div>
                    <div className="profile-major-spotlight">
                      <span className="profile-major-label">희망 학과</span>
                      <span className="profile-major-value">{profileStudent.user.preferredMajor}</span>
                    </div>
                    <div className="profile-meta">
                      <span>{profileStudent.user.highSchool}</span>
                      <span>{profileStudent.user.gradeLevel}</span>
                      <span>{profileStudent.user.className}</span>
                      <span>{profileStudent.user.email}</span>
                    </div>
                  </div>
                  <span className={`score-pill ${profileStudent.avgValue ? (+profileStudent.avgValue <= 2 ? "good" : +profileStudent.avgValue <= 4 ? "mid" : "warn") : ""}`}>
                    {profileStudent.avgValue ? `국수영 ${(+profileStudent.avgValue).toFixed(1)}등급` : "성적 미입력"}
                  </span>
                </div>

                <div className="cstats">
                  <div className="cstat"><div className="cstat-label">목표 대학</div><div className="cstat-value">{profileStudent.profile.targets?.length || 0}</div></div>
                  <div className="cstat"><div className="cstat-label">입력 과목수</div><div className="cstat-value">{Object.keys(profileStudent.profile.grades || {}).length}</div></div>
                  <div className="cstat"><div className="cstat-label">생활기록부</div><div className="cstat-value">{profileStudent.profile.gibpu ? "O" : "-"}</div></div>
                      <div className="cstat"><div className="cstat-label">대표 상태</div><div className="cstat-value">{profileStudent.match?.label || "대기"}</div></div>
                </div>

                <section className="profile-section counselor-edit-panel">
                  <div className="request-top">
                    <div>
                      <div className="secl">학생 정보 수정</div>
                      <div className="mini-body">상담사가 수정한 정보는 학생 화면에도 바로 반영됩니다.</div>
                    </div>
                    <span className="status-pill sent">편집 가능</span>
                  </div>
                  <div className="form-grid">
                    <div className="field">
                      <label htmlFor="profile-edit-name">이름</label>
                      <input id="profile-edit-name" className="auth-input" value={profileStudent.user.name || ""} onChange={e => updateProfileStudentUser({ name:e.target.value })} />
                    </div>
                    <div className="field">
                      <label htmlFor="profile-edit-school">고등학교</label>
                      <input id="profile-edit-school" className="auth-input" value={profileStudent.user.highSchool || ""} onChange={e => updateProfileStudentUser({ highSchool:e.target.value })} />
                    </div>
                    <div className="field">
                      <label htmlFor="profile-edit-major">희망 학과</label>
                      <input id="profile-edit-major" className="auth-input" value={profileStudent.user.preferredMajor || ""} onChange={e => updateProfileStudentUser({ preferredMajor:e.target.value })} />
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                      <div className="field">
                        <label htmlFor="profile-edit-grade">학년</label>
                        <select id="profile-edit-grade" className="auth-input" value={profileStudent.user.gradeLevel || "3학년"} onChange={e => updateProfileStudentUser({ gradeLevel:e.target.value })}>
                          <option value="1학년">1학년</option>
                          <option value="2학년">2학년</option>
                          <option value="3학년">3학년</option>
                        </select>
                      </div>
                      <div className="field">
                        <label htmlFor="profile-edit-class">반</label>
                        <input id="profile-edit-class" className="auth-input" value={profileStudent.user.className || ""} onChange={e => updateProfileStudentUser({ className:e.target.value })} />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="profile-section">
                  <div className="request-top">
                    <div>
                      <div className="secl">입시 전략 요약</div>
                      <div className="mini-body">성적 진단, SWOT, 세특 갭, 수시 6장 배치를 상담 전에 빠르게 확인합니다.</div>
                    </div>
                    <span className="status-pill sent">{profileStrategy?.level || "전략 대기"}</span>
                  </div>
                  <StrategyReport report={profileStrategy} />
                </section>

                <section className="profile-section">
                  <div className="request-top">
                    <div>
                      <div className="secl">과제 배정</div>
                      <div className="mini-body">여기서 배정한 과제는 학생의 과제 점검 페이지 `해야 할 것` 칼럼에 바로 표시됩니다.</div>
                      <div className="assignment-status-line" aria-label="학생 과제 상태 요약">
                        {ASSIGNMENT_COLUMNS.map(column => (
                          <span key={column.key} className="assignment-status-count">{column.label} {profileAssignmentCounts[column.key] || 0}</span>
                        ))}
                      </div>
                    </div>
                    <span className="status-pill sent">{profileAssignments.length}개 전체</span>
                  </div>

                  <form className="assignment-form-card" onSubmit={assignStudentTask}>
                    <div className="form-grid">
                      <div className="field">
                        <label htmlFor="assign-source">출처</label>
                        <select id="assign-source" className="auth-input" value={assignmentForm.source} onChange={e => setAssignmentValue("source", e.target.value)}>
                          <option value="상담사">상담사</option>
                          <option value="학교">학교</option>
                          <option value="학원">학원</option>
                        </select>
                      </div>
                      <div className="field">
                        <label htmlFor="assign-subject">과목/분류</label>
                        <input id="assign-subject" className="auth-input" value={assignmentForm.subject} onChange={e => setAssignmentValue("subject", e.target.value)} placeholder="예: 수학, 생기부, 자소서" />
                      </div>
                      <div className="field">
                        <label htmlFor="assign-due">마감일</label>
                        <input id="assign-due" className="auth-input" value={assignmentForm.due} onChange={e => setAssignmentValue("due", e.target.value)} placeholder="예: 5월 24일" />
                      </div>
                      <div className="field">
                        <label htmlFor="assign-title">과제명</label>
                        <input id="assign-title" className="auth-input" value={assignmentForm.title} onChange={e => setAssignmentValue("title", e.target.value)} placeholder="예: 활동 보고서 초안 보완" />
                      </div>
                      <div className="field wide">
                        <label htmlFor="assign-note">과제 설명</label>
                        <textarea id="assign-note" className="auth-input textarea-input" value={assignmentForm.note} onChange={e => setAssignmentValue("note", e.target.value)} placeholder="학생이 해야 할 구체적인 작업을 적어주세요." />
                      </div>
                    </div>
                    <div className="assignment-form-actions">
                      <div className="assignment-notice">{assignmentNotice}</div>
                      <button className="small-primary" type="submit">과제 배정하기</button>
                    </div>
                  </form>

                  <div className="secl" style={{ marginBottom:8 }}>학생 과제 현황</div>
                  <div className="assigned-preview">
                    {profileAssignments.map(item => {
                      const statusKey = normalizeAssignmentStatus(item.status);
                      const statusLabel = assignmentColumnForStatus(item.status).label;
                      return (
                      <article key={item.id} className={`assignment-card ${statusKey}`}>
                        <div className="assignment-preview-top">
                          <div className="assignment-tags">
                            <span className={`assignment-tag ${item.source === "학교" ? "school" : item.source === "학원" ? "academy" : "counselor"}`}>{item.source}</span>
                            <span className="assignment-tag">{item.subject}</span>
                            <span className={`assignment-tag status-${statusKey}`}>{statusLabel}</span>
                          </div>
                          <div className="assignment-preview-actions">
                            <select
                              className="mini-select"
                              value={statusKey}
                              onChange={e => setProfileAssignmentStatus(item.id, e.target.value)}
                              aria-label={`${item.title} 상태 변경`}
                            >
                              {ASSIGNMENT_COLUMNS.map(column => <option key={column.key} value={column.key}>{column.label}</option>)}
                            </select>
                            <button className="assignment-delete-btn" type="button" onClick={() => deleteStudentAssignment(item.id)}>삭제</button>
                          </div>
                        </div>
                        <div className="assignment-title">{item.title}</div>
                        <div className="assignment-meta">{item.teacher} · 마감 {item.due}</div>
                        <div className="assignment-note">{item.note}</div>
                      </article>
                      );
                    })}
                    {!profileAssignments.length && <div className="assignment-empty">아직 배정된 과제가 없습니다</div>}
                  </div>
                </section>

                {profileRoadmapState && (
                  <section className="profile-section counselor-roadmap">
                    <div className="request-top">
                      <div>
                        <div className="secl">학생 로드맵</div>
                        <div className="mini-body">학생이 완료한 월별 입시 준비 항목과 다음 미션을 확인합니다.</div>
                      </div>
                      <span className="status-pill sent">{profileRoadmapState.doneCount}/{CHECKLIST_ITEMS.length} 완료</span>
                    </div>

                    <section className="timeline-overview">
                      <div>
                        <div className="timeline-eyebrow">입시 로드맵</div>
                        <div className="timeline-headline">
                          {profileRoadmapState.nextItem ? `다음 미션: ${profileRoadmapState.nextItem.title}` : "모든 미션을 완료했어요"}
                        </div>
                        <div className="timeline-copy">
                          {profileRoadmapState.nextItem ? `${profileRoadmapState.nextItem.month} · ${profileRoadmapState.nextItem.body}` : "상담 전 필요한 준비가 모두 정리되었습니다."}
                        </div>
                        {profileRoadmapState.urgent.length > 0 && <div className="timeline-copy" style={{ color:"#F97316", fontWeight:800 }}>긴급 항목 {profileRoadmapState.urgent.length}개 미완료</div>}
                      </div>
                      <div className="timeline-ring" style={{ background:`conic-gradient(var(--brand-blue) ${profileRoadmapState.progress * 3.6}deg, rgba(229,231,235,0.85) 0deg)` }}>
                        <div>
                          <strong>{profileRoadmapState.progress}%</strong>
                          <span>{profileRoadmapState.doneCount}/{CHECKLIST_ITEMS.length} 완료</span>
                        </div>
                      </div>
                    </section>

                    <div className="timeline-road">
                      {profileRoadmapState.groups.map((group, groupIndex) => {
                        const state = group.done === group.items.length ? "done" : groupIndex === profileRoadmapState.activeIndex ? "active" : "upcoming";
                        return (
                          <section key={group.month} className={`timeline-step ${state}`}>
                            <div className="timeline-rail">
                              <div className="timeline-dot">{state === "done" ? "✓" : groupIndex + 1}</div>
                            </div>
                            <div className="timeline-card">
                              <div className="timeline-card-head">
                                <div>
                                  <div className="timeline-month">{group.month}</div>
                                  <div className="timeline-stage">{group.stage}</div>
                                </div>
                                <span className="timeline-count">{group.done}/{group.items.length}</span>
                              </div>
                              <div className="timeline-tasks">
                                {group.items.map((item, itemIndex) => {
                                  const done = Boolean(profileStudent.profile.checklist?.[item.id]);
                                  const isNext = profileRoadmapState.nextItem?.id === item.id && !item.urgent;
                                  const status = done ? "완료" : item.urgent ? "긴급" : isNext ? "다음" : "예정";
                                  return (
                                    <button key={item.id} type="button" className={`timeline-task${done ? " done" : ""}${item.urgent && !done ? " urgent" : ""}${isNext ? " next" : ""}`} onClick={() => toggleProfileChecklist(item.id)}>
                                      <span className="timeline-task-icon">{done ? "✓" : item.urgent ? "!" : itemIndex + 1}</span>
                                      <span>
                                        <span className="timeline-task-title">{item.title}</span>
                                        <span className="timeline-task-body">{item.body}</span>
                                      </span>
                                      <span className="timeline-task-status">{status}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </section>
                        );
                      })}
                    </div>
                  </section>
                )}

                <section className="profile-section">
                  <div className="request-top">
                    <div>
                      <div className="secl">상담 일지</div>
                      <div className="mini-body">상담 후 기록을 남기면 다음 상담에서 바로 이어서 확인할 수 있습니다.</div>
                    </div>
                    <span className="status-pill sent">{profileJournals.length}건</span>
                  </div>

                  <form className="journal-form" onSubmit={submitCounselingJournal}>
                    <div className="form-grid">
                      <div className="field">
                        <label htmlFor="journal-date">상담 날짜</label>
                        <input id="journal-date" className="auth-input" type="date" value={journalForm.date} onChange={e => setJournalValue("date", e.target.value)} />
                      </div>
                      <div className="field">
                        <label htmlFor="journal-topic">상담 주제</label>
                        <select id="journal-topic" className="auth-input" value={journalForm.topic} onChange={e => setJournalValue("topic", e.target.value)}>
                          {CONSULT_TOPICS.map(topic => <option key={topic} value={topic}>{topic}</option>)}
                        </select>
                      </div>
                      <div className="field wide">
                        <label htmlFor="journal-summary">상담 내용</label>
                        <textarea id="journal-summary" className="auth-input textarea-input" value={journalForm.summary} onChange={e => setJournalValue("summary", e.target.value)} placeholder="오늘 상담한 핵심 내용, 학생 반응, 결정한 지원 방향을 기록하세요." />
                      </div>
                      <div className="field wide">
                        <label htmlFor="journal-next">다음 상담 전 확인할 것</label>
                        <textarea id="journal-next" className="auth-input textarea-input" value={journalForm.nextSteps} onChange={e => setJournalValue("nextSteps", e.target.value)} placeholder="다음 과제, 추가 확인 자료, 학부모/학생에게 전달할 내용을 남기세요." />
                      </div>
                    </div>
                    <div className="journal-actions">
                      <div className="journal-notice">{journalNotice}</div>
                      <button className="small-primary" type="submit">일지 저장</button>
                    </div>
                  </form>

                  <div className="journal-list">
                    {profileJournals.map(journal => {
                      const expanded = expandedJournalId === journal.id;
                      return (
                      <article
                        key={journal.id}
                        className={`journal-entry${expanded ? " expanded" : ""}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => setExpandedJournalId(expanded ? null : journal.id)}
                        onKeyDown={e => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setExpandedJournalId(expanded ? null : journal.id);
                          }
                        }}
                      >
                        <div className="journal-entry-top">
                          <div>
                            <div className="journal-entry-title">{journal.date} · {journal.topic}</div>
                            <div className="journal-entry-meta">{journal.counselorName || "상담사"}</div>
                            <div className="journal-entry-summary">{oneLineSummary(journal.summary)}</div>
                          </div>
                          <div className="journal-entry-actions">
                            <span className="journal-open-label">{expanded ? "접기" : "열기"}</span>
                            <button
                              className="journal-delete-btn"
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                deleteCounselingJournal(journal.id);
                              }}
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                        {expanded && (
                          <div className="journal-entry-detail">
                            <div className="journal-entry-body">{journal.summary}</div>
                            {journal.nextSteps && (
                              <div className="journal-next">
                                <div className="journal-next-label">다음 확인 사항</div>
                                <div className="journal-entry-body">{journal.nextSteps}</div>
                              </div>
                            )}
                          </div>
                        )}
                      </article>
                      );
                    })}
                    {!profileJournals.length && <div className="empty" style={{ padding:"28px 20px" }}>아직 저장된 상담 일지가 없습니다</div>}
                  </div>
                </section>

                <div className="profile-grid">
                  <div>
                    <section className="profile-section">
                      <div className="request-top">
                        <div>
                          <div className="secl">목표 대학 및 전형 적합도</div>
                          <div className="mini-body">대학을 추가하고 관심 학과를 바로 수정할 수 있습니다.</div>
                        </div>
                        <span className="status-pill sent">{profileStudent.profile.targets?.length || 0}개</span>
                      </div>
                      <div className="profile-target-search">
                        <div className="sw compact">
                          <span className="ico">🔍</span>
                          <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="대학명, 학과명, 지역 검색" />
                        </div>
                        {query.trim() && (
                          <div className="profile-target-results">
                            {filtered.slice(0, 8).map(u => (
                              <button key={u.id} type="button" className="profile-target-result" onClick={() => addProfileTarget(u)} disabled={profileTargetIds.has(u.id)}>
                                <span className="dot" style={{ background:u.color, width:8, height:8 }} />
                                <span>{u.name}</span>
                                <small>{profileTargetIds.has(u.id) ? "추가됨" : `${u.region} · ${TIER_LABEL[u.tier]}권`}</small>
                              </button>
                            ))}
                            {!filtered.length && <div className="assignment-empty">검색 결과가 없습니다</div>}
                          </div>
                        )}
                      </div>
                      {(profileStudent.profile.targets || []).map(t => {
                        const match = getMatchForAvg(t, profileStudent.avgValue);
                        return (
                          <div key={t.id} className="detail-target">
                            <div style={{ display:"flex", justifyContent:"space-between", gap:12, flexWrap:"wrap", marginBottom:8 }}>
                              <div>
                                <div style={{ fontSize:16, fontWeight:700, color:"#202632" }}>{t.name}</div>
                                <div style={{ fontSize:12, color:"#6B7684", marginTop:2 }}>{t.region} · {t.type}</div>
                              </div>
                              <div className="target-edit-actions">
                                {match && <span style={{ fontSize:13, fontWeight:700, color:match.color }}>{match.label}</span>}
                                <button className="assignment-delete-btn" type="button" onClick={() => removeProfileTarget(t.id)}>삭제</button>
                              </div>
                            </div>
                            <div className="field" style={{ marginBottom:10 }}>
                              <label htmlFor={`profile-target-dept-${t.id}`}>관심 학과</label>
                              <select id={`profile-target-dept-${t.id}`} className="auth-input" value={t.dept || ""} onChange={e => setProfileTargetDept(t.id, e.target.value)}>
                                <option value="">학과 선택</option>
                                {departmentOptionsForUniversity(t, apiMajors).map(dept => <option key={dept} value={dept}>{dept}</option>)}
                              </select>
                            </div>
                            <div className="target-stack">
                              {tracksForTab(t.tracks, "수시").concat((t.tracks || []).filter(track => track.type !== "수시")).map(track => <span key={track.name} className={`badge b${track.type}`}>{track.name} · {track.grade ? `${track.grade}등급` : "수능"}</span>)}
                            </div>
                          </div>
                        );
                      })}
                      {!(profileStudent.profile.targets || []).length && <div className="empty" style={{ padding:"24px 0" }}>목표 대학이 아직 없습니다</div>}
                    </section>

                    <section className="profile-section">
                      <div className="secl">전체 성적표</div>
                      <div style={{ overflowX:"auto" }}>
                        <table className="grade-matrix">
                          <thead>
                            <tr>
                              <th>과목</th>
                              {SEMS.map(m => <th key={m}>{m}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {SUBJECTS.map(subject => (
                              <tr key={subject}>
                                <td>{subject}</td>
                                {SEMS.map(m => (
                                  <td key={m}>
                                    <input
                                      className="grade-mini-input"
                                      type="number"
                                      min="1"
                                      max="9"
                                      step="0.1"
                                      value={profileStudent.profile.grades?.[`${subject}-${m}`] ?? ""}
                                      onChange={e => setProfileGrade(subject, m, e.target.value)}
                                      aria-label={`${subject} ${m} 등급`}
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>

                    {profileHasGrades && (
                      <section className="profile-section">
                        <div className="secl">성적 추이</div>
                        <ResponsiveContainer width="100%" height={260}>
                          <LineChart data={profileChartData} margin={{ top:8, right:20, bottom:0, left:-18 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
                            <XAxis dataKey="semester" tick={{ fontSize:12, fill:"#9AA6B2" }} />
                            <YAxis domain={[1,9]} reversed={true} tickCount={9} tickFormatter={v=>`${v}등`} tick={{ fontSize:11, fill:"#9AA6B2" }} />
                            <Tooltip formatter={(v,n)=>[`${v}등급`,n]} contentStyle={{ background:"#fff", border:"1px solid #E5EAF1", borderRadius:10, fontSize:13 }} />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:12 }} />
                            {Object.entries(LINE_COLORS).map(([s,c]) => <Line key={s} type="monotone" dataKey={s} stroke={c} strokeWidth={2.5} dot={{ r:4, strokeWidth:0 }} activeDot={{ r:6 }} connectNulls />)}
                          </LineChart>
                        </ResponsiveContainer>
                      </section>
                    )}
                  </div>

                  <div>
                    <section className="profile-section">
                      <div className="secl">학생 기본 정보</div>
                      <div className="ocards">
                        <div className="ostat major-focus"><div className="cstat-label">희망 학과</div><div className="ostat-major-value">{profileStudent.user.preferredMajor}</div></div>
                        <div className="ostat"><div className="cstat-label">고등학교</div><div style={{ fontSize:14, fontWeight:700 }}>{profileStudent.user.highSchool}</div></div>
                        <div className="ostat"><div className="cstat-label">학년</div><div style={{ fontSize:14, fontWeight:700 }}>{profileStudent.user.gradeLevel}</div></div>
                        <div className="ostat"><div className="cstat-label">반</div><div style={{ fontSize:14, fontWeight:700 }}>{profileStudent.user.className}</div></div>
                      </div>
                    </section>

                    <section className="profile-section">
                      <div className="request-top">
                        <div>
                          <div className="secl">자소서</div>
                          <div className="mini-body">문항별 초안을 상담사가 바로 첨삭하고 분석을 확인합니다.</div>
                        </div>
                      </div>
                      <div className="mini-list">
                        {ESSAY_PROMPTS.map(prompt => {
                          const draft = profileStudent.profile.essays?.[prompt.id] || "";
                          const analysis = analyzeEssayDraft(draft, prompt, profileStudent.profile.gibpu?.원문 || "", profileStudent.user.preferredMajor || "");
                          return (
                            <div key={prompt.id} className="mini-item">
                              <div className="mini-title">{prompt.title}</div>
                              <div className="mini-body">{draft ? `${draft.length}자 · ${analysis.level} · ${analysis.score}점` : "초안 없음"}</div>
                              <textarea
                                className="auth-input textarea-input profile-essay-textarea"
                                value={draft}
                                onChange={e => updateProfileEssayDraft(prompt.id, e.target.value)}
                                placeholder={prompt.guide}
                              />
                              <div className="essay-edit-feedback">
                                <span>충분한 점 {analysis.strengths.length}</span>
                                <span>보완점 {analysis.gaps.length}</span>
                                <span>다음 액션 {analysis.actions.length}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>

                    <section className="profile-section">
                      <div className="secl">학기별 국수영 평균</div>
                      <div className="mini-list">
                        {SEMS.map(m => {
                          const a = semAvgForGrades(profileStudent.profile.grades || {}, m);
                          return <div key={m} className="mini-item"><div className="mini-title">{m}</div><div className="mini-body">{a ? `${a}등급` : "미입력"}</div></div>;
                        })}
                      </div>
                    </section>

                    <section className="profile-section">
                      <div className="request-top">
                        <div>
                          <div className="secl">생활기록부</div>
                          <div className="mini-body">업로드 파일명과 원문, AI 분석 결과를 확인하고 원문을 보정합니다.</div>
                        </div>
                        <button className="small-primary" type="button" onClick={runProfileRecordAgentAnalysis} disabled={aiBusy}>
                          {aiBusy ? "AI 분석 중" : "AI 분석 갱신"}
                        </button>
                      </div>
                      {aiNotice && <div className={`ai-notice${aiNotice.includes("저장") || aiNotice.includes("갱신") ? " done" : ""}`}>{aiNotice}</div>}
                      <div className="mini-item" style={{ marginBottom:10 }}>
                        <div className="mini-title">{profileStudent.profile.fname || "업로드 없음"}</div>
                        <div className="mini-body">{profileStudent.profile.gibpu ? "분석 결과 있음" : "분석 결과 없음"}</div>
                      </div>
                      <div className="field" style={{ marginBottom:12 }}>
                        <label htmlFor="profile-record-text">생활기록부 원문</label>
                        <textarea
                          id="profile-record-text"
                          className="auth-input textarea-input profile-record-textarea"
                          value={profileRecordText}
                          onChange={e => updateProfileRecordText(e.target.value)}
                          placeholder="학생이 올린 생활기록부 내용을 옮겨 적거나 OCR 결과를 붙여넣으세요."
                        />
                      </div>
                      {profileStudent.profile.gibpu && !profileStudent.profile.gibpu.error ? (
                        <>
                          {profileStudent.profile.gibpu.AI분석 && (
                            <div className="record-block">
                              <div className="mini-title">AI 분석</div>
                              <div className="mini-body">
                                {profileStudent.profile.gibpu.AI분석.level} · {profileStudent.profile.gibpu.AI분석.score}점
                              </div>
                              <div className="record-analysis-grid" style={{ marginTop:10 }}>
                                <div className="record-finding strength">
                                  <div className="record-finding-title">충분한 점</div>
                                  <ul>{profileStudent.profile.gibpu.AI분석.strengths.map((item, index) => <li key={index}>{item}</li>)}</ul>
                                </div>
                                <div className="record-finding gap">
                                  <div className="record-finding-title">부족한 점</div>
                                  <ul>{profileStudent.profile.gibpu.AI분석.gaps.map((item, index) => <li key={index}>{item}</li>)}</ul>
                                </div>
                              </div>
                            </div>
                          )}
                          {profileStudent.profile.gibpu.원문 && (
                            <div className="record-block">
                              <div className="mini-title">생활기록부 원문</div>
                              <div className="record-text-preview">{profileStudent.profile.gibpu.원문}</div>
                            </div>
                          )}
                          {profileStudent.profile.gibpu.학생정보 && <div className="record-block"><div className="mini-title">기본 정보</div><div className="mini-body">{Object.entries(profileStudent.profile.gibpu.학생정보).map(([k,v]) => `${k}: ${v || "-"}`).join(" · ")}</div></div>}
                          {profileStudent.profile.gibpu.출결 && <div className="record-block"><div className="mini-title">출결</div><div className="mini-body">{Object.entries(profileStudent.profile.gibpu.출결).map(([k,v]) => `${k}: ${v || "-"}`).join(" · ")}</div></div>}
                          {profileStudent.profile.gibpu.교과발달?.length > 0 && <div className="record-block"><div className="mini-title">교과 발달</div>{profileStudent.profile.gibpu.교과발달.map((item,i) => <div key={i} className="mini-body">{item.과목}: {item.특기사항 || item.성취도 || "-"}</div>)}</div>}
                          {profileStudent.profile.gibpu.창의체험 && <div className="record-block"><div className="mini-title">창의적 체험활동</div>{Object.entries(profileStudent.profile.gibpu.창의체험).filter(([,v])=>v).map(([k,v]) => <div key={k} className="mini-body">{k}: {v}</div>)}</div>}
                          {profileStudent.profile.gibpu.수상경력?.filter(x=>x.대회명).length > 0 && <div className="record-block"><div className="mini-title">수상 경력</div>{profileStudent.profile.gibpu.수상경력.filter(x=>x.대회명).map((item,i) => <div key={i} className="mini-body">{item.대회명} · {item.등위 || "-"}</div>)}</div>}
                          {profileStudent.profile.gibpu.독서?.filter(x=>x.책제목).length > 0 && <div className="record-block"><div className="mini-title">독서</div><div className="mini-body">{profileStudent.profile.gibpu.독서.filter(x=>x.책제목).map(x => x.책제목).join(", ")}</div></div>}
                          {profileStudent.profile.gibpu.행동특성종합의견 && <div className="record-block"><div className="mini-title">행동특성 및 종합의견</div><div className="mini-body">{profileStudent.profile.gibpu.행동특성종합의견}</div></div>}
                        </>
                      ) : (
                        <div className="mini-body">학생이 PDF나 사진 파일을 업로드하면 분석 내용이 여기에 표시됩니다.</div>
                      )}
                    </section>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="ptitle">학생 관리</div>
                <div className="psub">반별로 학생을 확인하고 학년, 학교, 성적 기준으로 필터링합니다</div>

                <div className="cstats">
                  <div className="cstat"><div className="cstat-label">전체 학생</div><div className="cstat-value">{allStudents.length}</div></div>
                  <div className="cstat"><div className="cstat-label">목표 대학 등록</div><div className="cstat-value">{studentsWithTargets.length}</div></div>
                  <div className="cstat"><div className="cstat-label">성적 입력</div><div className="cstat-value">{studentsWithGrades.length}</div></div>
                  <div className="cstat"><div className="cstat-label">생기부 업로드</div><div className="cstat-value">{studentsWithRecord.length}</div></div>
                </div>

                <div className="filter-grid">
                  <div className="sw" style={{ marginBottom:0 }}>
                    <span className="ico">🔍</span>
                    <input type="search" value={studentQuery} onChange={e => setStudentQuery(e.target.value)} placeholder="학생명, 이메일, 학교, 학과, 목표 대학 검색" />
                  </div>
                  <div className="filter-field">
                    <label htmlFor="grade-filter">학년</label>
                    <select id="grade-filter" value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}>
                      <option value="all">전체</option>
                      <option value="1학년">1학년</option>
                      <option value="2학년">2학년</option>
                      <option value="3학년">3학년</option>
                    </select>
                  </div>
                  <div className="filter-field">
                    <label htmlFor="school-filter">고등학교</label>
                    <select id="school-filter" value={schoolFilter} onChange={e => setSchoolFilter(e.target.value)}>
                      <option value="all">전체</option>
                      {schoolOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="filter-field">
                    <label htmlFor="class-filter">반</label>
                    <select id="class-filter" value={classFilter} onChange={e => setClassFilter(e.target.value)}>
	                      <option value="all">전체</option>
	                      {classOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
	                    </select>
                  </div>
                  <div className="filter-field">
                    <label htmlFor="score-filter">성적</label>
                    <select id="score-filter" value={scoreFilter} onChange={e => setScoreFilter(e.target.value)}>
                      <option value="all">전체</option>
                      <option value="top">1~2등급</option>
                      <option value="middle">2~4등급</option>
                      <option value="needs">4등급 이하</option>
                      <option value="none">미입력</option>
                    </select>
                  </div>
                </div>

                <div className="roster-note">
                  <span>현재 {studentRows.length}명 표시 · {groupKeys.length}개 반</span>
                  <button className="link-btn" type="button" onClick={() => { setStudentQuery(""); setGradeFilter("all"); setSchoolFilter("all"); setClassFilter("all"); setScoreFilter("all"); }}>필터 초기화</button>
                </div>

	                {groupKeys.map(group => {
	                  const rows = groupedStudentRows[group];
	                  const classInfo = classById.get(group) || rows[0]?.classInfo || null;
	                  const schools = [...new Set(rows.map(row => row.user.highSchool))].join(", ");
	                  return (
	                    <section key={group} className="class-group">
	                      <div className="class-head">
	                        <div>
	                          <div className="class-title">{classInfo?.name || "반 미배정"}</div>
	                          <div className="class-meta">{schools}{classInfo?.joinCode ? ` · 코드 ${classInfo.joinCode}` : ""}</div>
	                        </div>
	                        <span className="badge btag">{rows.length}명</span>
	                      </div>
                      {rows.map(({ user, profile, avgValue, match }) => (
                        <button key={user.id} className="student-card-row" type="button" onClick={() => setProfileStudentId(user.id)}>
                          <div>
                            <div className="cell-label">학생</div>
                            <div className="student-name">{user.name}</div>
                            <div className="student-email">{user.email}</div>
                          </div>
                          <div>
                            <div className="cell-label">학교</div>
                            <div style={{ fontSize:13, fontWeight:600, color:"#202632" }}>{user.highSchool}</div>
                            <div style={{ fontSize:12, color:"#9AA6B2" }}>{user.preferredMajor} · {user.gradeLevel} · {user.className}</div>
                          </div>
                          <div>
                            <div className="cell-label">성적</div>
                            <span className={`score-pill ${avgValue ? (+avgValue <= 2 ? "good" : +avgValue <= 4 ? "mid" : "warn") : ""}`}>{avgValue ? `${(+avgValue).toFixed(1)}등급` : "미입력"}</span>
                          </div>
                          <div>
                            <div className="cell-label">목표 대학</div>
                            <div className="target-stack">
                              {(profile.targets || []).slice(0, 2).map(t => <span key={t.id} className="badge btag">{t.short}{t.dept ? ` · ${t.dept}` : ""}</span>)}
                              {(profile.targets || []).length > 2 && <span className="badge btag">+{profile.targets.length - 2}</span>}
                              {!(profile.targets || []).length && <span style={{ fontSize:12, color:"#9AA6B2" }}>없음</span>}
                            </div>
                          </div>
                          <div>
                            <div className="cell-label">상태</div>
                            {match ? <span style={{ fontSize:12, fontWeight:700, color:match.color }}>{match.label}</span> : <span style={{ fontSize:12, color:"#9AA6B2" }}>검토 대기</span>}
                          </div>
                        </button>
                      ))}
                    </section>
                  );
                })}

                {!studentRows.length && <div className="empty" style={{ padding:"48px 20px" }}>조건에 맞는 학생이 없습니다</div>}
              </>
            )}
          </main>
	          <nav className="mobile-nav three" aria-label="상담사 모바일 메뉴">
	            <button className={`mobile-nav-btn${counselorTab === "students" ? " active" : ""}`} type="button" onClick={() => { setCounselorTab("students"); setProfileStudentId(null); }}>
	              <span>👥</span>
	              학생관리
	            </button>
	            <button className={`mobile-nav-btn${counselorTab === "classes" ? " active" : ""}`} type="button" onClick={() => { setCounselorTab("classes"); setProfileStudentId(null); }}>
	              <span>🔑</span>
	              내코드
	            </button>
	            <button className={`mobile-nav-btn${counselorTab === "requests" ? " active" : ""}`} type="button" onClick={() => { setCounselorTab("requests"); setProfileStudentId(null); }}>
	              <span>✉️</span>
	              상담신청
            </button>
          </nav>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div className="root">

        {/* Sidebar */}
        <aside className="sidebar">
          <div className="logo">입시<span>플래너</span> 🎓</div>
          <div className="nav-section">
            <div className="nav-label">메뉴</div>
            {STUDENT_NAV.map(([k,ic,lb]) => (
              <button key={k} className={`nav-btn${section===k?" active":""}`} onClick={() => setSection(k)}>
                <span>{ic}</span>{lb}
              </button>
            ))}
          </div>
          {targets.length > 0 && (
            <div className="target-list">
              <div className="nav-label">목표 대학 {targets.length}개</div>
              {targets.map(u => { const m = getMatch(u); return (
                <button key={u.id} className={`t-chip${selId===u.id&&section==="목표대학"?" active":""}`}
                  onClick={() => { setSelId(u.id); setSection("목표대학"); }}>
                  <span className="dot" style={{ background:u.color, width:8, height:8 }} />
                  <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.name}</span>
                  {m && <span style={{ fontSize:10, color:m.color }}>●</span>}
                </button>
              ); })}
            </div>
          )}
          <div className="sidebar-spacer" />
          <div className="userbox">
            <div className="user-name">{currentUser.name}</div>
            <div className="user-meta">{currentUser.email}</div>
            <button className="logout-btn" type="button" onClick={logout}>로그아웃</button>
          </div>
        </aside>

        {/* Main */}
        <main className="main">

          {/* 홈 */}
          {section === "홈" && <>
            <div className="home-hero">
              <div className="home-kicker">{currentUser.highSchool || "입시플래너"} · {currentUser.preferredMajor || "학과 미입력"} · {currentUser.gradeLevel || "학생"}</div>
              <div className="home-title">{currentUser.name}님의 입시 로드</div>
              <div className="home-sub">목표 대학, 성적표, 전략센터, 생활기록부, 자소서, 로드맵, 과제 점검, 상담 예약을 앱 흐름처럼 한 화면에서 이어서 관리합니다.</div>
            </div>

            <div className="quick-grid">
              <button className="quick-card" type="button" onClick={() => setSection("목표대학")}>
                <div className="quick-icon">🏛</div>
                <div className="quick-title">목표대학</div>
                <div className="quick-body">{targets.length ? `${targets.length}개 대학 검토 중` : "관심 대학을 추가하세요"}</div>
              </button>
              <button className="quick-card" type="button" onClick={() => setSection("성적표")}>
                <div className="quick-icon">📊</div>
                <div className="quick-title">성적표</div>
                <div className="quick-body">{avg ? `국수영 평균 ${(+avg).toFixed(1)}등급` : "학기별 등급 입력"}</div>
              </button>
              <button className="quick-card" type="button" onClick={() => setSection("전략센터")}>
                <div className="quick-icon">✨</div>
                <div className="quick-title">전략센터</div>
                <div className="quick-body">{studentStrategy ? `${studentStrategy.level} · ${studentStrategy.total}점` : "성적·SWOT·세특·수시 전략"}</div>
              </button>
              <button className="quick-card" type="button" onClick={() => setSection("로드맵")}>
                <div className="quick-icon">🧭</div>
                <div className="quick-title">로드맵</div>
                <div className="quick-body">{checklistDoneCount}/{CHECKLIST_ITEMS.length} 완료 · {checklistProgress}%</div>
              </button>
              <button className="quick-card" type="button" onClick={() => setSection("과제점검")}>
                <div className="quick-icon">📝</div>
                <div className="quick-title">과제 점검</div>
                <div className="quick-body">해야 할 것 {assignmentCounts.todo || 0}개 · 검사 {assignmentCounts.review || 0}개</div>
              </button>
              <button className="quick-card" type="button" onClick={() => setSection("생활기록부")}>
                <div className="quick-icon">📄</div>
                <div className="quick-title">생활기록부</div>
                <div className="quick-body">{gibpu && !gibpu.error ? "분석 결과 확인" : fname ? "업로드됨" : "자료 업로드"}</div>
              </button>
              <button className="quick-card" type="button" onClick={() => setSection("자소서")}>
                <div className="quick-icon">✍</div>
                <div className="quick-title">자소서</div>
                <div className="quick-body">{essayDoneCount}/{ESSAY_PROMPTS.length} 문항 초안 · {activeEssayAnalysis.level}</div>
              </button>
              <button className="quick-card" type="button" onClick={() => setSection("상담")}>
                <div className="quick-icon">🗓</div>
                <div className="quick-title">상담</div>
                <div className="quick-body">{nextStudentMeeting ? `${nextStudentMeeting.preferredDate} ${nextStudentMeeting.preferredTime}` : "상담 예약하기"}</div>
              </button>
            </div>

            <div className="progress-card">
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <div>
                  <div className="quick-title">로드맵 진행률</div>
                  <div className="quick-body">입시 준비 항목을 순서대로 마무리하세요</div>
                </div>
                <div className="progress-value">{checklistProgress}%</div>
              </div>
              <div className="mbar" style={{ height:8 }}><div style={{ height:"100%", width:`${checklistProgress}%`, background:"#0EA5E9", borderRadius:8 }} /></div>
              {urgentChecklist.length > 0 && <div style={{ marginTop:12, padding:"10px 12px", borderRadius:12, background:"#FEF2F2", color:"#DC2626", fontSize:12, fontWeight:700 }}>긴급 항목 {urgentChecklist.length}개를 확인하세요</div>}
            </div>

            {nextStudentMeeting ? (
              <div className="request-card">
                <div className="request-top">
                  <div>
                    <div className="request-title">다음 상담 · {nextStudentMeeting.category}</div>
                    <div className="request-meta">{nextStudentMeeting.preferredDate} {nextStudentMeeting.preferredTime} · {nextStudentMeeting.status === "confirmed" ? "확정" : "대기"}</div>
                  </div>
                  <span className={`status-pill${nextStudentMeeting.status === "confirmed" ? " confirmed" : ""}`}>{nextStudentMeeting.status === "confirmed" ? "확정" : "대기"}</span>
                </div>
                <div className="request-body">{nextStudentMeeting.message}</div>
              </div>
            ) : (
              <div className="empty" style={{ padding:"36px 20px" }}>상담 탭에서 첫 상담을 예약하세요</div>
            )}
          </>}

          {/* 목표 대학 */}
          {section === "목표대학" && <>
            <div className="ptitle">목표 대학</div>
            <div className="psub">대학명, 학과명, 지역으로 검색하세요</div>
            <div className="sw">
              <span className="ico">🔍</span>
              <input type="search" value={query} onChange={e => { setQuery(e.target.value); setSelId(null); }} placeholder="서울대, 컴퓨터공학, 서울…" />
            </div>
            <div className="univ-filter-bar">
              <div className="univ-filter-field">
                <label htmlFor="target-region-filter">지역</label>
                <select id="target-region-filter" value={regionFilter} onChange={e => { setRegionFilter(e.target.value); setSelId(null); }}>
                  <option value="all">전국</option>
                  {UNIVERSITY_REGIONS.map(region => <option key={region} value={region}>{region}</option>)}
                </select>
              </div>
              <div className="univ-filter-field">
                <label htmlFor="target-department-filter">학과 계열</label>
                <select id="target-department-filter" value={departmentFilter} onChange={e => { setDepartmentFilter(e.target.value); setSelId(null); }}>
                  {DEPARTMENT_FILTERS.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
                </select>
              </div>
              <div className="univ-filter-field">
                <label htmlFor="target-rank-filter">정렬</label>
                <select id="target-rank-filter" value={rankFilter} onChange={e => { setRankFilter(e.target.value); setSelId(null); }}>
                  {RANK_FILTERS.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
                </select>
              </div>
            </div>
            {(query || activeUniversityFilters) && (
              <div className="univ-result-meta">
                <span>{filtered.length}개 표시 · 전체 {universityCatalog.length}개 대학 데이터</span>
                      <span>{universityApiStatus === "careernet" ? `커리어넷 API 연결됨 · 대학 ${apiUniversities.length}개 · 학과 ${apiMajors.length}개 · 검사 ${careerTests.length}개` : universityApiStatus === "loading" ? "커리어넷 API 불러오는 중" : "내장 전국 데이터 사용 중"}</span>
              </div>
            )}

            {(query || activeUniversityFilters) && filtered.length > 0 && (
              <div className="rcard">
                {filtered.map(u => (
                  <div key={u.id} className="rrow" onClick={() => { setSelId(u.id); setQuery(""); }}>
                    <span className="dot" style={{ background:u.color, width:10, height:10 }} />
                    <div style={{ flex:1 }}>
                      <div className="rname">{u.name}</div>
                      <div className="rmeta">{u.region} · {u.type} · {TIER_LABEL[u.tier]}권</div>
                    </div>
                    <button className={`abtn ${isAdded(u.id)?"done":"add"}`}
                      onClick={e => { e.stopPropagation(); addUniv(u); }}>
                      {isAdded(u.id) ? "추가됨" : "+ 추가"}
                    </button>
                  </div>
                ))}
              </div>
            )}
            {(query || activeUniversityFilters) && !filtered.length && <div style={{ color:"#9AA6B2", fontSize:14, textAlign:"center", padding:"20px 0" }}>검색 결과 없음</div>}

            {sel && !query && <>
              {/* Header */}
              <div className="card">
                <div style={{ display:"flex", alignItems:"flex-start", gap:16 }}>
                  <div className="uavatar" style={{ background:sel.color }}>{sel.short.slice(0,3)}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap", marginBottom:6 }}>
                      <span style={{ fontSize:18, fontWeight:600, color:"#202632", letterSpacing:"-0.4px" }}>{sel.name}</span>
                      <span className="badge btag">{sel.type}</span>
                      <span className="badge btag">{sel.region}</span>
                      <span className="badge btag">{TIER_LABEL[sel.tier]}권</span>
                    </div>
                  </div>
                  {!isAdded(sel.id)
                    ? <button style={{ padding:"8px 18px", background:"#0EA5E9", color:"#fff", border:"none", borderRadius:9, fontSize:13, cursor:"pointer", fontFamily:"'Noto Sans KR',sans-serif", fontWeight:500 }} onClick={() => addUniv(sel)}>+ 목록 추가</button>
                    : <button style={{ padding:"8px 18px", background:"#FEF2F2", color:"#DC2626", border:"1px solid #FECACA", borderRadius:9, fontSize:13, cursor:"pointer", fontFamily:"'Noto Sans KR',sans-serif" }} onClick={() => removeUniv(sel.id)}>삭제</button>}
                </div>
                {isAdded(sel.id) && (
                  <div style={{ marginTop:14, paddingTop:14, borderTop:"1px solid #EEF2F7" }}>
                    <div style={{ fontSize:12, color:"#9AA6B2", marginBottom:6 }}>관심 학과</div>
                    <select value={addedTarget?.dept||""} onChange={e => setDept(sel.id, e.target.value)}>
                      <option value="">학과 선택</option>
                      {selectedDepartmentOptions.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Match indicator */}
              {avg && matchSel && (
                <div className="minfo" style={{ background:matchSel.bg, borderColor:matchSel.border }}>
                  <div><div style={{ fontSize:11, color:"#6B7684", marginBottom:2 }}>내 국·수·영 평균</div><div style={{ fontSize:22, fontWeight:700, color:"#202632", letterSpacing:"-0.5px" }}>{(+avg).toFixed(1)}등급</div></div>
                  <div style={{ fontSize:18, color:"#C9D3DF" }}>→</div>
                  <div>
                    <div style={{ fontSize:11, color:"#6B7684", marginBottom:2 }}>합격 가능성</div>
                    <div style={{ fontSize:16, fontWeight:600, color:matchSel.color }}>{matchSel.label}</div>
                    <div className="mbar" style={{ width:140 }}><div style={{ height:"100%", width:`${matchSel.pct}%`, background:matchSel.color, borderRadius:3 }} /></div>
                  </div>
                </div>
              )}

              {admissionStats && (
                <div className="card">
                  <div className="admission-head">
                    <div>
                      <div className="secl">{admissionStats.year} 수시 합격 통계</div>
                      <div className="admission-title">{admissionStats.dept}</div>
                      <div className="admission-copy">{admissionStats.info}</div>
                    </div>
                    <div className="admission-range">
                      <span>전년도 합격권</span>
                      <strong>{admissionStats.gradeRange}</strong>
                    </div>
                  </div>
                  <div className="admission-grid">
                    <div className="admission-stat">
                      <div className="admission-stat-label">합격 평균</div>
                      <div className="admission-stat-value">{admissionStats.avgGrade ? `${admissionStats.avgGrade.toFixed(1)}등급` : "-"}</div>
                    </div>
                    <div className="admission-stat">
                      <div className="admission-stat-label">70% 컷</div>
                      <div className="admission-stat-value">{admissionStats.cutGrade ? `${admissionStats.cutGrade.toFixed(1)}등급` : "-"}</div>
                    </div>
                    <div className="admission-stat">
                      <div className="admission-stat-label">평균 경쟁률</div>
                      <div className="admission-stat-value">{admissionStats.competition}:1</div>
                    </div>
                    <div className="admission-stat">
                      <div className="admission-stat-label">강한 전형</div>
                      <div className="admission-stat-value" style={{ fontSize:14 }}>{admissionStats.bestTrack}</div>
                    </div>
                  </div>
                  <div className="admission-table-wrap">
                    <table className="admission-table">
                      <thead>
                        <tr>
                          <th>전형</th>
                          <th>합격 평균</th>
                          <th>70% 컷</th>
                          <th>최저 합격권</th>
                          <th>경쟁률</th>
                          <th>모집 추정</th>
                        </tr>
                      </thead>
                      <tbody>
                        {admissionStats.rows.map(row => (
                          <tr key={row.name}>
                            <td>
                              <strong>{row.name}</strong>
                              {!!row.labels?.length && (
                                <div className="track-type-row">
                                  {row.labels.map(label => <span key={label} className={`track-type-pill${label === "일반전형" ? " secondary" : ""}`}>{label}</span>)}
                                </div>
                              )}
                              <div style={{ fontSize:11, color:"#9AA6B2", marginTop:3 }}>{row.note}</div>
                            </td>
                            <td>{row.avg.toFixed(1)}등급</td>
                            <td>{row.cut70.toFixed(1)}등급</td>
                            <td>{row.last.toFixed(1)}등급</td>
                            <td>{row.comp}:1</td>
                            <td>{row.admitted}명</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {departmentStats.length > 0 && (
                <div className="card">
                <div className="secl">학과별 수시 합격 등급표</div>
                <div className="mini-body" style={{ marginBottom:10 }}>
                  {apiMajors.length ? `커리어넷 학과정보 ${apiMajors.length}개 기준으로 표시합니다.` : "내장 학과 데이터 기준으로 표시합니다."}
                </div>
                  <div className="dept-stat-list">
                    {departmentStats.map(item => (
                      <button
                        key={item.dept}
                        type="button"
                        className={`dept-stat-row${selectedDept === item.dept ? " active" : ""}`}
                        onClick={() => { if (isAdded(sel.id)) setDept(sel.id, item.dept); }}
                      >
                        <div className="dept-stat-name">{item.dept}</div>
                        <div className="dept-stat-meta">{item.field} · {item.gradeRange}</div>
                        <div className="dept-stat-grade">{item.avgGrade ? `${item.avgGrade.toFixed(1)}등급` : "-"}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Track tabs */}
              <div className="tabs">
                {["수시","정시"].map(t => <button key={t} className={`tab${trackTab===t?" active":""}`} onClick={() => setTrackTab(t)}>{t}</button>)}
              </div>

              {tracksForTab(sel.tracks, trackTab).map((t,i) => (
                <div key={i} className="tcard">
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                    <div>
                      <div style={{ fontSize:14.5, fontWeight:600, color:"#202632", marginBottom:3 }}>{t.name}</div>
                      <div style={{ fontSize:12.5, color:"#6B7684" }}>{t.note}</div>
                    </div>
                    <span className={`badge b${t.type}`}>{t.type}</span>
                  </div>
                  <div className="sgrid">
                    <div className="sbox"><div className="slabel">권장 등급</div><div className="sval">{t.grade?`${t.grade}등급`:"수능 반영"}</div></div>
                    <div className="sbox"><div className="slabel">경쟁률</div><div className="sval">{t.comp}:1</div></div>
                    <div className="sbox"><div className="slabel">모집인원</div><div className="sval">{t.quota}명</div></div>
                  </div>
                </div>
              ))}
              {!tracksForTab(sel.tracks, trackTab).length && <div style={{ textAlign:"center", padding:"24px", fontSize:14, color:"#9AA6B2" }}>{trackTab} 전형 없음</div>}

              <div className="card">
                <div className="secl">📚 학과 정보 ({selectedDepartmentOptions.length}개)</div>
                <div>{selectedDepartmentOptions.slice(0, 120).map(d => <span key={d} className="dchip">{d}</span>)}</div>
              </div>
            </>}

            {!sel && !query && (
              targets.length > 0 ? (
                <div>
                  <div style={{ fontSize:13, color:"#9AA6B2", marginBottom:12 }}>추가된 대학을 클릭하여 상세 정보를 확인하세요</div>
                  <div className="ovgrid">
                    {targets.map(u => { const m = getMatch(u); const t = targets.find(x => x.id===u.id); return (
                      <div key={u.id} className="ovc" onClick={() => setSelId(u.id)}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                          <span className="dot" style={{ background:u.color, width:9, height:9 }} />
                          <span style={{ fontSize:14, fontWeight:600, color:"#202632" }}>{u.name}</span>
                        </div>
                        {t?.dept && <div style={{ fontSize:12, color:"#0EA5E9", marginBottom:4 }}>{t.dept}</div>}
                        <div style={{ fontSize:12, color:"#9AA6B2" }}>{u.region} · {u.type}</div>
                        {m && <div style={{ fontSize:12, fontWeight:500, marginTop:8, color:m.color }}>{m.label}</div>}
                      </div>
                    ); })}
                  </div>
                </div>
              ) : (
                <div className="empty"><div style={{ fontSize:44, marginBottom:16 }}>🏛️</div><div style={{ fontSize:15 }}>대학명을 검색하여 목표 대학을 추가하세요</div></div>
              )
            )}
          </>}

          {/* 성적표 */}
          {section === "성적표" && <>
            <div className="ptitle">성적표</div>
            <div className="psub">석차등급(1~9등급)을 입력하세요. 낮을수록 우수합니다.</div>
            {avg && <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"9px 16px", borderRadius:10, background:"#EAF2FF", marginBottom:16 }}><span style={{ fontSize:13, color:"#0EA5E9", fontWeight:500 }}>📊 국·수·영 전체 평균: {(+avg).toFixed(1)}등급</span></div>}
            {avg && (
              <div className="avrow">
                {SEMS.map(m => { const a = semAvg(m); return a ? (
                  <div key={m} className="avbox">
                    <div style={{ fontSize:11, color:"#9AA6B2", marginBottom:4 }}>{m}</div>
                    <div style={{ fontSize:16, fontWeight:600, color:"#202632" }}>{a}</div>
                    <div style={{ fontSize:10, color:"#C9D3DF", marginTop:1 }}>국수영 평균</div>
                  </div>
                ) : null; }).filter(Boolean)}
              </div>
            )}
            <div className="card" style={{ overflowX:"auto" }}>
              <table className="gtable">
                <thead><tr>
                  <th style={{ width:76 }}>과목</th>
                  {SEMS.map(m => <th key={m}>{m}</th>)}
                </tr></thead>
                <tbody>
                  {SUBJECTS.map(s => (
                    <tr key={s}>
                      <td><div className="sn">{LINE_COLORS[s] && <span className="dot" style={{ background:LINE_COLORS[s], width:7, height:7 }} />}<span style={{ fontWeight:CORE.includes(s)?600:400 }}>{s}</span></div></td>
                      {SEMS.map(m => <td key={m}><input type="number" min="1" max="9" step="0.1" value={getG(s,m)} placeholder="—" onChange={e => setG(s,m,e.target.value)} /></td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hasGrades ? (
              <div className="card">
                <div className="secl" style={{ marginBottom:6 }}>📈 등급 추이  <span style={{ fontWeight:400, color:"#C9D3DF" }}>— 위로 갈수록 우수 (1등급)</span></div>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={chartData} margin={{ top:8, right:20, bottom:0, left:-18 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
                    <XAxis dataKey="semester" tick={{ fontSize:12, fill:"#9AA6B2" }} />
                    <YAxis domain={[1,9]} reversed={true} tickCount={9} tickFormatter={v=>`${v}등`} tick={{ fontSize:11, fill:"#9AA6B2" }} />
                    <Tooltip formatter={(v,n)=>[`${v}등급`,n]} contentStyle={{ background:"#fff", border:"1px solid #E5EAF1", borderRadius:10, fontSize:13 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:12 }} />
                    {Object.entries(LINE_COLORS).map(([s,c]) => <Line key={s} type="monotone" dataKey={s} stroke={c} strokeWidth={2.5} dot={{ r:4, strokeWidth:0 }} activeDot={{ r:6 }} connectNulls />)}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="empty" style={{ padding:"40px 20px" }}><div style={{ fontSize:40, marginBottom:14 }}>📈</div><div style={{ fontSize:15 }}>성적을 입력하면 추이 그래프가 나타납니다</div></div>
            )}
          </>}

          {/* 전략센터 */}
          {section === "전략센터" && <>
            <div className="ptitle">전략센터</div>
            <div className="psub">SUMMIT의 핵심 기능을 학생과 선생님이 바로 이해할 수 있는 리포트로 줄였습니다.</div>
            <StrategyReport report={studentStrategy} />
          </>}

          {/* 로드맵 */}
          {section === "로드맵" && <>
            <div className="ptitle">로드맵</div>
            <div className="psub">월별 준비 항목을 입시 타임라인처럼 따라가며 하나씩 완료하세요</div>

            <section className="timeline-overview">
              <div>
                <div className="timeline-eyebrow">입시 로드맵</div>
                <div className="timeline-headline">
                  {nextChecklistItem ? `다음 미션: ${nextChecklistItem.title}` : "모든 미션을 완료했어요"}
                </div>
                <div className="timeline-copy">
                  {nextChecklistItem ? `${nextChecklistItem.month} · ${nextChecklistItem.body}` : "상담 전 필요한 준비가 모두 정리되었습니다."}
                </div>
                {urgentChecklist.length > 0 && <div className="timeline-copy" style={{ color:"#F97316", fontWeight:800 }}>긴급 항목 {urgentChecklist.length}개가 남아있어요.</div>}
              </div>
              <div className="timeline-ring" style={{ background:`conic-gradient(var(--brand-blue) ${checklistProgress * 3.6}deg, rgba(229,231,235,0.85) 0deg)` }}>
                <div>
                  <strong>{checklistProgress}%</strong>
                  <span>{checklistDoneCount}/{CHECKLIST_ITEMS.length} 완료</span>
                </div>
              </div>
            </section>

            <div className="timeline-road">
              {checklistGroups.map((group, groupIndex) => {
                const state = group.done === group.items.length ? "done" : groupIndex === activeChecklistIndex ? "active" : "upcoming";
                return (
                  <section key={group.month} className={`timeline-step ${state}`}>
                    <div className="timeline-rail">
                      <div className="timeline-dot">{state === "done" ? "✓" : groupIndex + 1}</div>
                    </div>
                    <div className="timeline-card">
                      <div className="timeline-card-head">
                        <div>
                          <div className="timeline-month">{group.month}</div>
                          <div className="timeline-stage">{group.stage}</div>
                        </div>
                        <span className="timeline-count">{group.done}/{group.items.length}</span>
                      </div>
                      <div className="timeline-tasks">
                        {group.items.map((item, itemIndex) => {
                          const done = Boolean(checklist[item.id]);
                          const isNext = nextChecklistItem?.id === item.id && !item.urgent;
                          const status = done ? "완료" : item.urgent ? "긴급" : isNext ? "다음" : "예정";
                          return (
                            <button key={item.id} className={`timeline-task${done ? " done" : ""}${item.urgent && !done ? " urgent" : ""}${isNext ? " next" : ""}`} type="button" onClick={() => toggleChecklist(item.id)}>
                              <span className="timeline-task-icon">{done ? "✓" : item.urgent ? "!" : itemIndex + 1}</span>
                              <span>
                                <span className="timeline-task-title">{item.title}</span>
                                <span className="timeline-task-body">{item.body}</span>
                              </span>
                              <span className="timeline-task-status">{status}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          </>}

          {/* 생활기록부 */}
          {section === "생활기록부" && <>
            <div className="ptitle">생활기록부</div>
            <div className="psub">PDF, PNG, JPG, JPEG, HEIC 등 모바일 사진 파일까지 업로드할 수 있습니다.</div>

            <div className={`uzone${drag?" drag":""}`}
              onDragOver={e => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); const f=e.dataTransfer.files[0]; if(f) handleFile(f); }}
              onClick={() => fileRef.current?.click()}>
              <input ref={fileRef} type="file" accept={RECORD_FILE_ACCEPT} style={{ display:"none" }} onChange={e => { const f=e.target.files?.[0]; if(f) handleFile(f); }} />
              {recordPreview
                ? <button
                    type="button"
                    className="record-preview-thumb"
                    onClick={e => { e.stopPropagation(); setRecordPreviewOpen(true); }}
                    aria-label="업로드한 생활기록부 사진 크게 보기"
                  >
                    <img src={recordPreview.url} alt={recordPreview.name} />
                  </button>
                : <div style={{ fontSize:36, marginBottom:12 }}>📤</div>}
              {fname ? <>
                <div style={{ fontSize:15, fontWeight:500, color:"#202632", marginBottom:6 }}>{fname}</div>
                <div style={{ fontSize:13, color:"#9AA6B2" }}>{recordPreview ? "사진을 클릭하면 크게 볼 수 있습니다" : "다른 파일을 업로드하려면 클릭하세요"}</div>
              </> : <>
                <div style={{ fontSize:15, fontWeight:500, color:"#202632", marginBottom:6 }}>생활기록부 자료를 드래그하거나 클릭하여 업로드</div>
                <div style={{ fontSize:13, color:"#9AA6B2" }}>PDF, PNG, JPG, JPEG, HEIC 등 사진 파일을 지원합니다</div>
              </>}
            </div>

            {parsing && <div style={{ textAlign:"center", padding:"40px 20px" }}><div className="spinner"/><div style={{ fontSize:14, color:"#6B7684" }}>생활기록부 자료를 정리하고 있습니다…</div></div>}

            <section className="gsec record-text-card">
              <div className="record-text-head">
                <div>
                  <div className="secl">생활기록부 원문</div>
                  <div className="record-text-hint">사진이나 PDF에 있는 내용을 옮겨 적거나 OCR 결과를 붙여넣으면, 아래 AI 분석이 바로 업데이트됩니다.</div>
                </div>
                <div className="record-ai-actions">
                  <span className="status-pill sent">{(gibpu && !gibpu.error ? gibpu.원문 || "" : "").length}자</span>
                  <button className="small-primary" type="button" onClick={runRecordAgentAnalysis} disabled={aiBusy}>
                    {aiBusy ? "AI 분석 중" : "AI 에이전트 분석"}
                  </button>
                </div>
              </div>
              {aiNotice && <div className={`ai-notice${aiNotice.includes("완료") ? " done" : ""}`}>{aiNotice}</div>}
              <textarea
                className="record-textarea"
                value={gibpu && !gibpu.error ? gibpu.원문 || "" : ""}
                onChange={e => updateRecordText(e.target.value)}
                placeholder={`예: 정보 수업에서 알고리즘의 효율성을 주제로 탐구 보고서를 작성하고, 동아리에서 웹 서비스 기획과 구현을 맡아 팀 프로젝트를 주도함...`}
              />
            </section>

            {gibpu && !gibpu.error && gibpu.AI분석 && (
              <section className="gsec record-analysis-card">
                <div className="record-ai-score">
                  <strong>{gibpu.AI분석.score}</strong>
                  <span>{gibpu.AI분석.level}</span>
                  <div className="record-ai-summary">{gibpu.AI분석.summary}</div>
                </div>
                <div className="record-analysis-grid">
                  <div className="record-finding strength">
                    <div className="record-finding-title">충분한 점</div>
                    <ul>{gibpu.AI분석.strengths.map((item, index) => <li key={index}>{item}</li>)}</ul>
                  </div>
                  <div className="record-finding gap">
                    <div className="record-finding-title">부족한 점</div>
                    <ul>{gibpu.AI분석.gaps.map((item, index) => <li key={index}>{item}</li>)}</ul>
                  </div>
                  <div className="record-finding action">
                    <div className="record-finding-title">다음 보완 액션</div>
                    <ul>{gibpu.AI분석.actions.map((item, index) => <li key={index}>{item}</li>)}</ul>
                  </div>
                </div>
              </section>
            )}

            {gibpu && !parsing && (gibpu.error
              ? <div style={{ padding:"16px", background:"#FEF2F2", borderRadius:10, color:"#DC2626", fontSize:14, border:"1px solid #FECACA" }}>{gibpu.error}</div>
              : <>
                {gibpu.학생정보 && <div className="gsec"><div className="secl">👤 기본 정보</div><div className="ocards">{Object.entries(gibpu.학생정보).map(([k,v]) => <div key={k} className="ostat"><div style={{ fontSize:11, color:"#9AA6B2", marginBottom:4 }}>{k}</div><div style={{ fontSize:15, fontWeight:600, color:"#202632" }}>{v||"—"}</div></div>)}</div></div>}
                {gibpu.출결 && <div className="gsec"><div className="secl">📅 출결 사항</div><div className="ocards">{Object.entries(gibpu.출결).map(([k,v]) => <div key={k} className="ostat"><div style={{ fontSize:11, color:"#9AA6B2", marginBottom:4 }}>{k}</div><div style={{ fontSize:20, fontWeight:700, color:"#202632" }}>{v||"—"}</div></div>)}</div></div>}
                {gibpu.교과발달?.length > 0 && <div className="gsec"><div className="secl">📖 교과 학습 발달사항</div>{gibpu.교과발달.map((item,i) => <div key={i} className="irow"><div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}><span className="ititle">{item.과목}</span>{item.성취도 && <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:"#F0FDF4", color:"#059669", fontWeight:500 }}>{item.성취도}</span>}</div>{item.특기사항 && <div className="ibody">{item.특기사항}</div>}</div>)}</div>}
                {gibpu.창의체험 && Object.values(gibpu.창의체험).some(v=>v) && <div className="gsec"><div className="secl">⭐ 창의적 체험활동</div>{Object.entries(gibpu.창의체험).filter(([,v])=>v).map(([k,v]) => <div key={k} className="irow"><div style={{ fontSize:11, color:"#9AA6B2", marginBottom:4, fontWeight:500 }}>{k}</div><div className="ibody">{v}</div></div>)}</div>}
                {gibpu.수상경력?.filter(x=>x.대회명).length > 0 && <div className="gsec"><div className="secl">🏆 수상 경력</div>{gibpu.수상경력.filter(x=>x.대회명).map((item,i) => <div key={i} className="irow" style={{ display:"flex", alignItems:"center", gap:12 }}><span style={{ fontSize:20 }}>🥇</span><div><div className="ititle">{item.대회명}</div><div className="ibody">{item.등위}{item.날짜?" · "+item.날짜:""}</div></div></div>)}</div>}
                {gibpu.독서?.filter(x=>x.책제목).length > 0 && <div className="gsec"><div className="secl">📚 독서 활동</div><div className="chips">{gibpu.독서.filter(x=>x.책제목).map((item,i) => <span key={i} className="chip">{item.책제목}{item.저자?` (${item.저자})`:""}</span>)}</div></div>}
                {gibpu.행동특성종합의견 && <div className="gsec"><div className="secl">💬 행동특성 및 종합의견</div><div className="ibody" style={{ lineHeight:1.9, fontSize:14 }}>{gibpu.행동특성종합의견}</div></div>}
              </>
            )}

            {recordPreviewOpen && recordPreview && (
              <div className="record-preview-modal" role="dialog" aria-modal="true" aria-label="생활기록부 사진 미리보기" onClick={() => setRecordPreviewOpen(false)}>
                <button className="record-preview-close" type="button" onClick={() => setRecordPreviewOpen(false)}>닫기</button>
                <div className="record-preview-shell" onClick={e => e.stopPropagation()}>
                  <img src={recordPreview.url} alt={recordPreview.name} />
                  <div className="record-preview-name">{recordPreview.name}</div>
                </div>
              </div>
            )}
          </>}

          {/* 자소서 */}
          {section === "자소서" && <>
            <div className="ptitle">자소서</div>
            <div className="psub">생활기록부 원문을 근거로 문항별 자기소개서 초안을 작성하고 보완점을 확인하세요.</div>

            <section className="timeline-overview">
              <div>
                <div className="timeline-eyebrow">자소서 작성 흐름</div>
                <div className="timeline-headline">
                  {essayDoneCount ? `${essayDoneCount}개 문항 초안 작성 중` : "생활기록부에서 소재를 골라 첫 문단을 시작하세요"}
                </div>
                <div className="timeline-copy">
                  {gibpu?.원문 ? "생활기록부 원문과 연결되는 활동 근거를 아래에서 함께 확인할 수 있습니다." : "생활기록부 원문을 먼저 옮겨 적으면 자소서 근거 연결이 더 정확해집니다."}
                </div>
              </div>
              <div className="timeline-ring" style={{ background:`conic-gradient(var(--brand-blue) ${(essayDoneCount / ESSAY_PROMPTS.length) * 360}deg, rgba(229,231,235,0.85) 0deg)` }}>
                <div>
                  <strong>{Math.round((essayDoneCount / ESSAY_PROMPTS.length) * 100)}%</strong>
                  <span>{essayDoneCount}/{ESSAY_PROMPTS.length} 초안</span>
                </div>
              </div>
            </section>

            <div className="essay-shell">
              <section className="gsec">
                <div className="secl" style={{ marginBottom:10 }}>문항 선택</div>
                <div className="essay-prompt-list">
                  {ESSAY_PROMPTS.map(prompt => {
                    const length = (essayDrafts[prompt.id] || "").trim().length;
                    return (
                      <button key={prompt.id} type="button" className={`essay-prompt-btn${activeEssayPrompt.id === prompt.id ? " active" : ""}`} onClick={() => setActiveEssayId(prompt.id)}>
                        <div className="essay-prompt-label">{prompt.label}</div>
                        <div className="essay-prompt-title">{prompt.title}</div>
                        <div className="essay-prompt-meta">{length}자 · {length >= 100 ? "초안 있음" : "작성 전"}</div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <div>
                <section className="gsec essay-editor-card">
                  <div className="essay-editor-head">
                    <div>
                      <div className="secl">{activeEssayPrompt.title}</div>
                      <div className="essay-guide">{activeEssayPrompt.guide}</div>
                    </div>
                    <span className="status-pill sent">{activeEssayText.length}자</span>
                  </div>
                  <textarea
                    className="essay-textarea"
                    value={activeEssayText}
                    onChange={e => updateEssayDraft(activeEssayPrompt.id, e.target.value)}
                    placeholder="생활기록부에 있는 실제 활동을 바탕으로, 상황 → 내가 한 행동 → 결과 → 배운 점 순서로 작성해보세요."
                  />
                </section>

                <section className="gsec essay-analysis-card">
                  <div className="record-ai-score">
                    <strong>{activeEssayAnalysis.score}</strong>
                    <span>{activeEssayAnalysis.level}</span>
                    <div className="record-ai-summary">{activeEssayAnalysis.summary}</div>
                  </div>
                  <div className="record-analysis-grid">
                    <div className="record-finding strength">
                      <div className="record-finding-title">충분한 점</div>
                      <ul>{activeEssayAnalysis.strengths.map((item, index) => <li key={index}>{item}</li>)}</ul>
                    </div>
                    <div className="record-finding gap">
                      <div className="record-finding-title">부족한 점</div>
                      <ul>{activeEssayAnalysis.gaps.map((item, index) => <li key={index}>{item}</li>)}</ul>
                    </div>
                    <div className="record-finding action">
                      <div className="record-finding-title">다음 수정 액션</div>
                      <ul>{activeEssayAnalysis.actions.map((item, index) => <li key={index}>{item}</li>)}</ul>
                    </div>
                  </div>
                </section>

                <section className="gsec">
                  <div className="secl" style={{ marginBottom:10 }}>생활기록부에서 가져올 근거</div>
                  <div className="essay-evidence">
                    {activeEssayAnalysis.evidence.map((item, index) => <div key={index} className="essay-evidence-item">{item}</div>)}
                    {!activeEssayAnalysis.evidence.length && <div className="assignment-empty">생활기록부 원문을 입력하면 자소서에 연결할 활동 근거가 여기에 표시됩니다</div>}
                  </div>
                </section>
              </div>
            </div>
          </>}

          {/* 과제 점검 */}
          {section === "과제점검" && <>
            <div className="ptitle">과제 점검</div>
            <div className="psub">선생님이 주신 학교·학원 과제를 상태별로 확인하고 검사 단계까지 관리하세요.</div>

            <div className="assignment-summary">
              {ASSIGNMENT_COLUMNS.map(column => (
                <div key={column.key} className="assignment-stat">
                  <div className="assignment-stat-label">{column.label}</div>
                  <div className="assignment-stat-value">{assignmentCounts[column.key] || 0}</div>
                </div>
              ))}
            </div>

            <div className="assignment-board">
              {ASSIGNMENT_COLUMNS.map(column => {
                const rows = assignments.filter(item => normalizeAssignmentStatus(item.status) === column.key);
                return (
                  <section
                    key={column.key}
                    className={`assignment-column${assignmentDropTarget === column.key ? " drop-active" : ""}`}
                    onDragOver={e => { e.preventDefault(); setAssignmentDropTarget(column.key); }}
                    onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setAssignmentDropTarget(null); }}
                    onDrop={e => { e.preventDefault(); handleAssignmentDrop(column.key); }}
                  >
                    <div className="assignment-column-head">
                      <div>
                        <div className="assignment-column-title">{column.label}</div>
                        <div className="assignment-column-hint">{column.hint}</div>
                      </div>
                      <span className="assignment-count">{rows.length}</span>
                    </div>
                    <div className="assignment-stack">
                      {rows.map(item => (
                        <article
                          key={item.id}
                          className={`assignment-card ${normalizeAssignmentStatus(item.status)}${draggedAssignmentId === item.id ? " dragging" : ""}`}
                          draggable
                          onDragStart={e => { setDraggedAssignmentId(item.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", item.id); }}
                          onDragEnd={() => { setDraggedAssignmentId(null); setAssignmentDropTarget(null); }}
                        >
                          <div className="assignment-tags">
                            <span className={`assignment-tag ${item.source === "학교" ? "school" : item.source === "학원" ? "academy" : "counselor"}`}>{item.source}</span>
                            <span className="assignment-tag">{item.subject}</span>
                          </div>
                          <div className="assignment-title">{item.title}</div>
                          <div className="assignment-meta">{item.teacher} · 마감 {item.due}</div>
                          <div className="assignment-note">{item.note}</div>
                        </article>
                      ))}
                      {!rows.length && <div className="assignment-empty">아직 이 상태의 과제가 없습니다</div>}
                    </div>
                  </section>
                );
              })}
            </div>
          </>}

          {/* 상담 신청 */}
          {section === "상담" && <>
            <div className="booking-page">
              <div className="booking-hero">
                <div>
                  <div className="booking-title">상담 예약</div>
                  <div className="booking-sub">담당 선생님과 상담을 예약하세요</div>
                </div>
                <button className="booking-top-btn" type="submit" form="consultation-form" disabled={!canSubmitRequest}>
                  <span className="booking-plus">+</span>
                  예약하기
                </button>
              </div>

              <form id="consultation-form" className="booking-card" onSubmit={submitConsultationRequest}>
                <div className="calendar-head">
                  <button className="calendar-arrow" type="button" aria-label="이전 주" onClick={() => shiftBookingWeek(-7)}>‹</button>
                  <div className="calendar-month">{formatWeekMonthLabel(bookingWeekStart)}</div>
                  <button className="calendar-arrow" type="button" aria-label="다음 주" onClick={() => shiftBookingWeek(7)}>›</button>
                </div>

                <div className="date-strip">
                  {bookingDays.map(value => {
                    const date = parseDateValue(value);
                    const active = requestForm.preferredDate === value;
                    return (
                      <button key={value} className={`date-pill${active ? " active" : ""}`} type="button" onClick={() => { setRequestForm(p => ({ ...p, preferredDate:value, preferredTime:"" })); setRequestNotice(""); }}>
                        <span className="date-weekday">{WEEKDAY_KO[date.getDay()]}</span>
                        <span className="date-number">{date.getDate()}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="booking-label">시간 선택 — {formatDateLabel(requestForm.preferredDate)}</div>
                <div className="time-grid">
                  {TIME_SLOTS.map(time => (
                    <button key={time} className={`time-slot${requestForm.preferredTime === time ? " active" : ""}`} type="button" onClick={() => { setRequestForm(p => ({ ...p, preferredTime:time })); setRequestNotice(""); }}>
                      {time}
                    </button>
                  ))}
                </div>

                <select className={`booking-select${requestForm.category ? "" : " placeholder"}`} value={requestForm.category} onChange={e => { setRequestForm(p => ({ ...p, category:e.target.value })); setRequestNotice(""); }}>
                  <option value="">상담 주제 선택</option>
                  {CONSULT_TOPICS.map(topic => <option key={topic} value={topic}>{topic}</option>)}
                </select>

                <textarea className="booking-note" value={requestForm.message} onChange={e => { setRequestForm(p => ({ ...p, message:e.target.value })); setRequestNotice(""); }} placeholder="선생님께 미리 전달할 내용을 입력하세요 (선택)" />

                {requestNotice && <div className={requestNotice.includes("접수") ? "booking-notice" : "auth-error"}>{requestNotice}</div>}
                <button className="booking-submit" type="submit" disabled={!canSubmitRequest}>{requestSubmitLabel}</button>
              </form>

              <div className="secl" style={{ marginTop:26 }}>내 상담 신청 내역</div>
              <div className="request-list">
                {myRequests.map(request => (
                  <section key={request.id} className="request-card">
                    <div className="request-top">
                      <div>
                        <div className="request-title">{request.category}</div>
                        <div className="request-meta">희망 일시: {request.preferredDate || "미정"}{request.preferredTime ? ` ${request.preferredTime}` : ""}</div>
                        <div className="request-meta">신청일: {new Date(request.createdAt).toLocaleDateString("ko-KR")}</div>
                      </div>
                      <span className={`status-pill${request.status === "confirmed" ? " confirmed" : ""}`}>{request.status === "confirmed" ? "확정" : "대기"}</span>
                    </div>
                    <div className="request-body">{request.message}</div>
                    {request.emailSentAt && <div className="request-meta" style={{ marginTop:8 }}>확인 이메일 작성됨: {new Date(request.emailSentAt).toLocaleString("ko-KR")}</div>}
                  </section>
                ))}
                {!myRequests.length && <div className="empty" style={{ padding:"34px 20px" }}>아직 상담 신청이 없습니다</div>}
              </div>
            </div>
          </>}

        </main>
        <nav className="mobile-nav" aria-label="학생 모바일 메뉴">
          {STUDENT_NAV.map(([k, ic, lb]) => (
            <button key={k} className={`mobile-nav-btn${section === k ? " active" : ""}`} type="button" onClick={() => setSection(k)}>
              <span>{ic}</span>
              {k === "생활기록부" ? "생기부" : k === "전략센터" ? "전략" : k === "과제점검" ? "과제" : lb}
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}

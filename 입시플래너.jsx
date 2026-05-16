import { useState, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

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

const SUBJECTS = ["국어","수학","영어","한국사","사회","과학","체육","음악","미술"];
const CORE = ["국어","수학","영어"];
const SEMS = ["고1-1","고1-2","고2-1","고2-2","고3-1"];
const LINE_COLORS = {"국어":"#E74C3C","수학":"#1B3A6B","영어":"#27AE60","사회":"#8B6914","과학":"#2980B9"};
const TIER_LABEL = {1:"최상위",2:"상위",3:"중상위"};

const css = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Noto Sans KR',sans-serif;}
.root{display:flex;height:100vh;background:#F8F7F4;overflow:hidden;}
.sidebar{width:220px;min-width:220px;background:#fff;border-right:1px solid #ECEAE4;display:flex;flex-direction:column;overflow-y:auto;}
.logo{padding:22px 20px 14px;font-size:15px;font-weight:600;color:#1a1a1a;letter-spacing:-0.3px;border-bottom:1px solid #ECEAE4;}
.logo span{color:#2563EB;}
.nav-section{padding:12px 12px 0;}
.nav-label{font-size:10px;font-weight:500;color:#9CA3AF;letter-spacing:0.08em;padding:0 8px;margin-bottom:6px;}
.nav-btn{display:flex;align-items:center;gap:9px;padding:9px 10px;border-radius:8px;cursor:pointer;font-size:13.5px;color:#4B5563;transition:all 0.12s;border:none;background:transparent;width:100%;text-align:left;font-family:'Noto Sans KR',sans-serif;}
.nav-btn:hover{background:#F3F4F6;color:#111;}
.nav-btn.active{background:#EFF6FF;color:#1D4ED8;font-weight:500;}
.target-list{padding:8px 12px 16px;margin-top:12px;border-top:1px solid #ECEAE4;}
.t-chip{display:flex;align-items:center;gap:7px;padding:7px 10px;border-radius:8px;cursor:pointer;font-size:12.5px;color:#374151;transition:all 0.12s;border:none;background:transparent;width:100%;text-align:left;font-family:'Noto Sans KR',sans-serif;}
.t-chip:hover{background:#F3F4F6;}
.t-chip.active{background:#EFF6FF;color:#1D4ED8;}
.dot{border-radius:50%;flex-shrink:0;}
.main{flex:1;overflow-y:auto;padding:32px 36px;}
.ptitle{font-size:22px;font-weight:600;color:#111;letter-spacing:-0.5px;margin-bottom:4px;}
.psub{font-size:14px;color:#6B7280;margin-bottom:24px;}
.sw{position:relative;margin-bottom:14px;}
.sw .ico{position:absolute;left:13px;top:50%;transform:translateY(-50%);font-size:15px;color:#9CA3AF;pointer-events:none;}
input[type=search]{width:100%;padding:10px 14px 10px 38px;border:1px solid #E5E7EB;border-radius:10px;font-size:14px;color:#111;background:#fff;outline:none;font-family:'Noto Sans KR',sans-serif;transition:border 0.15s;}
input[type=search]:focus{border-color:#2563EB;box-shadow:0 0 0 3px rgba(37,99,235,0.08);}
input[type=number]{padding:5px 6px;border:1px solid #E5E7EB;border-radius:7px;font-size:13px;color:#111;background:#fff;outline:none;font-family:'Noto Sans KR',sans-serif;text-align:center;transition:border 0.15s;width:62px;}
input[type=number]:focus{border-color:#2563EB;}
input[type=number]::placeholder{color:#D1D5DB;}
select{padding:8px 12px;border:1px solid #E5E7EB;border-radius:8px;font-size:13px;color:#111;background:#fff;outline:none;font-family:'Noto Sans KR',sans-serif;cursor:pointer;}
select:focus{border-color:#2563EB;}
.card{background:#fff;border:1px solid #ECEAE4;border-radius:14px;padding:20px 22px;margin-bottom:12px;}
.rcard{background:#fff;border:1px solid #ECEAE4;border-radius:12px;overflow:hidden;margin-bottom:14px;}
.rrow{display:flex;align-items:center;gap:12px;padding:11px 16px;border-bottom:1px solid #F3F4F6;cursor:pointer;transition:background 0.1s;}
.rrow:last-child{border-bottom:none;}
.rrow:hover{background:#F9FAFB;}
.rname{font-size:14px;font-weight:500;color:#111;}
.rmeta{font-size:12px;color:#9CA3AF;margin-top:1px;}
.abtn{font-size:12px;padding:5px 14px;border-radius:7px;cursor:pointer;border:none;font-family:'Noto Sans KR',sans-serif;font-weight:500;transition:all 0.12s;}
.abtn.add{background:#EFF6FF;color:#1D4ED8;}
.abtn.add:hover{background:#DBEAFE;}
.abtn.done{background:#F3F4F6;color:#9CA3AF;cursor:default;}
.uavatar{width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:13px;flex-shrink:0;}
.badge{display:inline-block;font-size:11px;padding:2px 9px;border-radius:20px;font-weight:500;margin:0 2px;}
.b수시{background:#EFF6FF;color:#1D4ED8;}
.b정시{background:#FFF7ED;color:#C2410C;}
.btag{background:#F3F4F6;color:#4B5563;}
.sgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px;}
.sbox{background:#F8F7F4;border-radius:10px;padding:14px;text-align:center;}
.slabel{font-size:11px;color:#9CA3AF;margin-bottom:6px;}
.sval{font-size:19px;font-weight:600;color:#111;letter-spacing:-0.5px;}
.tcard{border:1px solid #ECEAE4;border-radius:12px;padding:16px 18px;margin-bottom:10px;}
.tabs{display:flex;gap:6px;margin-bottom:14px;}
.tab{padding:7px 18px;border-radius:8px;border:1px solid #E5E7EB;background:#fff;font-size:13px;cursor:pointer;font-family:'Noto Sans KR',sans-serif;color:#4B5563;transition:all 0.12s;}
.tab.active{background:#1D4ED8;color:#fff;border-color:#1D4ED8;font-weight:500;}
.mbar{height:6px;background:#F3F4F6;border-radius:3px;margin-top:6px;overflow:hidden;}
.dchip{display:inline-block;font-size:12.5px;padding:5px 12px;border-radius:20px;background:#F8F7F4;border:1px solid #ECEAE4;color:#374151;margin:3px;}
.gtable{width:100%;border-collapse:collapse;}
.gtable th{padding:9px 6px;font-size:12px;color:#9CA3AF;font-weight:500;border-bottom:1px solid #F3F4F6;text-align:center;}
.gtable th:first-child{text-align:left;}
.gtable td{padding:5px 6px;border-bottom:1px solid #F9FAFB;text-align:center;}
.gtable td:first-child{text-align:left;}
.gtable tr:last-child td{border-bottom:none;}
.gtable tr:nth-child(even){background:#FAFAFA;}
.sn{display:flex;align-items:center;gap:7px;font-size:13.5px;}
.avrow{display:flex;gap:10px;margin-bottom:20px;}
.avbox{flex:1;background:#fff;border:1px solid #ECEAE4;border-radius:10px;padding:12px 8px;text-align:center;}
.uzone{border:2px dashed #E5E7EB;border-radius:14px;padding:44px 20px;text-align:center;cursor:pointer;transition:all 0.15s;background:#fff;margin-bottom:20px;}
.uzone:hover,.uzone.drag{border-color:#2563EB;background:#F5F8FF;}
.gsec{background:#fff;border:1px solid #ECEAE4;border-radius:14px;padding:20px 22px;margin-bottom:12px;}
.secl{font-size:11.5px;font-weight:600;color:#9CA3AF;letter-spacing:0.06em;margin-bottom:14px;}
.irow{padding:10px 0;border-bottom:1px solid #F3F4F6;}
.irow:last-child{border-bottom:none;}
.ititle{font-size:14px;font-weight:500;color:#111;margin-bottom:3px;}
.ibody{font-size:13px;color:#6B7280;line-height:1.75;}
.chips{display:flex;flex-wrap:wrap;gap:8px;}
.chip{font-size:12.5px;padding:5px 12px;border-radius:20px;background:#F8F7F4;border:1px solid #ECEAE4;color:#374151;}
.ocards{display:flex;gap:12px;flex-wrap:wrap;}
.ostat{background:#F8F7F4;border-radius:10px;padding:12px 16px;text-align:center;flex:1;min-width:90px;}
.empty{text-align:center;padding:60px 20px;color:#9CA3AF;}
.ovgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;}
.ovc{background:#fff;border:1px solid #ECEAE4;border-radius:12px;padding:16px;cursor:pointer;transition:all 0.12s;}
.ovc:hover{border-color:#2563EB;box-shadow:0 2px 8px rgba(37,99,235,0.08);}
.minfo{border-radius:10px;padding:14px 16px;margin-bottom:14px;display:flex;align-items:center;gap:20px;flex-wrap:wrap;border:1px solid transparent;}
.spinner{width:32px;height:32px;border:3px solid #E5E7EB;border-top:3px solid #2563EB;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px;}
@keyframes spin{to{transform:rotate(360deg);}}
`;

export default function App() {
  const [section, setSection] = useState("대학");
  const [targets, setTargets] = useState([]);
  const [selId, setSelId] = useState(null);
  const [query, setQuery] = useState("");
  const [trackTab, setTrackTab] = useState("수시");
  const [grades, setGrades] = useState({});
  const [gibpu, setGibpu] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [drag, setDrag] = useState(false);
  const [fname, setFname] = useState("");
  const fileRef = useRef(null);

  const filtered = query.trim()
    ? UNIVS.filter(u => u.name.includes(query) || u.short.includes(query) || u.region.includes(query) || u.depts.some(d => d.includes(query)))
    : [];
  const sel = UNIVS.find(u => u.id === selId);
  const isAdded = id => targets.some(u => u.id === id);
  const addedTarget = targets.find(u => u.id === selId);

  const addUniv = u => { if (!isAdded(u.id)) setTargets(p => [...p, { ...u, dept: "" }]); setSelId(u.id); setQuery(""); };
  const removeUniv = id => { setTargets(p => p.filter(u => u.id !== id)); if (selId === id) setSelId(null); };
  const setDept = (id, dept) => setTargets(p => p.map(u => u.id === id ? { ...u, dept } : u));

  const getG = (s, m) => grades[`${s}-${m}`] ?? "";
  const setG = (s, m, v) => {
    const n = parseFloat(v);
    setGrades(p => { const nx = { ...p }, k = `${s}-${m}`; if (v === "" || isNaN(n)) delete nx[k]; else nx[k] = Math.min(9, Math.max(1, n)); return nx; });
  };

  const coreAvg = () => {
    const vals = []; SEMS.forEach(m => CORE.forEach(s => { const g = grades[`${s}-${m}`]; if (g !== undefined) vals.push(+g); }));
    if (!vals.length) return null;
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
  };
  const semAvg = m => { const vals = CORE.map(s => grades[`${s}-${m}`]).filter(v => v !== undefined); if (!vals.length) return null; return (vals.reduce((a, b) => a + +b, 0) / vals.length).toFixed(1); };

  const getMatch = univ => {
    const avg = coreAvg(); if (!avg || !univ) return null;
    const bt = [...univ.tracks].filter(t => t.grade).sort((a, b) => b.grade - a.grade)[0]; if (!bt) return null;
    const d = +avg - bt.grade;
    if (d <= -0.5) return { label: "도달 어려움", color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", pct: 25 };
    if (d <= 0.3) return { label: "적정 수준", color: "#059669", bg: "#F0FDF4", border: "#BBF7D0", pct: 65 };
    return { label: "안정권", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", pct: 92 };
  };

  const chartData = SEMS.map(m => { const e = { semester: m }; Object.keys(LINE_COLORS).forEach(s => { const g = grades[`${s}-${m}`]; if (g !== undefined) e[s] = +g; }); return e; });
  const hasGrades = chartData.some(d => Object.keys(d).length > 1);
  const avg = coreAvg();
  const matchSel = sel ? getMatch(sel) : null;

  const handleFile = async file => {
    if (!file || file.type !== "application/pdf") return;
    setFname(file.name); setParsing(true); setGibpu(null);
    try {
      const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(file); });
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } },
          { type: "text", text: `이 생활기록부를 분석하여 아래 JSON 형식으로만 반환하세요. 마크다운 없이 순수 JSON:\n{"학생정보":{"이름":"","학교":"","학년":""},"출결":{"수업일수":"","결석":"","지각":"","조퇴":""},"교과발달":[{"과목":"","성취도":"","특기사항":""}],"창의체험":{"자율활동":"","동아리":"","봉사활동":"","진로활동":""},"수상경력":[{"대회명":"","등위":"","날짜":""}],"독서":[{"책제목":"","저자":""}],"행동특성종합의견":""}` }
        ] }] })
      });
      const data = await resp.json();
      const txt = data.content?.find(c => c.type === "text")?.text || "";
      setGibpu(JSON.parse(txt.replace(/```json|```/g, "").trim()));
    } catch { setGibpu({ error: "파싱 중 오류가 발생했습니다. PDF를 확인 후 다시 시도해주세요." }); }
    finally { setParsing(false); }
  };

  return (
    <>
      <style>{css}</style>
      <div className="root">

        {/* Sidebar */}
        <aside className="sidebar">
          <div className="logo">입시<span>플래너</span> 🎓</div>
          <div className="nav-section">
            <div className="nav-label">메뉴</div>
            {[["대학","🏛","목표 대학"],["성적표","📊","성적표"],["생기부","📄","생활기록부"]].map(([k,ic,lb]) => (
              <button key={k} className={`nav-btn${section===k?" active":""}`} onClick={() => setSection(k)}>
                <span>{ic}</span>{lb}
              </button>
            ))}
          </div>
          {targets.length > 0 && (
            <div className="target-list">
              <div className="nav-label">목표 대학 {targets.length}개</div>
              {targets.map(u => { const m = getMatch(u); return (
                <button key={u.id} className={`t-chip${selId===u.id&&section==="대학"?" active":""}`}
                  onClick={() => { setSelId(u.id); setSection("대학"); }}>
                  <span className="dot" style={{ background:u.color, width:8, height:8 }} />
                  <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.name}</span>
                  {m && <span style={{ fontSize:10, color:m.color }}>●</span>}
                </button>
              ); })}
            </div>
          )}
        </aside>

        {/* Main */}
        <main className="main">

          {/* 목표 대학 */}
          {section === "대학" && <>
            <div className="ptitle">목표 대학</div>
            <div className="psub">대학명, 학과명, 지역으로 검색하세요</div>
            <div className="sw">
              <span className="ico">🔍</span>
              <input type="search" value={query} onChange={e => { setQuery(e.target.value); setSelId(null); }} placeholder="서울대, 컴퓨터공학, 서울…" />
            </div>

            {query && filtered.length > 0 && (
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
            {query && !filtered.length && <div style={{ color:"#9CA3AF", fontSize:14, textAlign:"center", padding:"20px 0" }}>검색 결과 없음</div>}

            {sel && !query && <>
              {/* Header */}
              <div className="card">
                <div style={{ display:"flex", alignItems:"flex-start", gap:16 }}>
                  <div className="uavatar" style={{ background:sel.color }}>{sel.short.slice(0,3)}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap", marginBottom:6 }}>
                      <span style={{ fontSize:18, fontWeight:600, color:"#111", letterSpacing:"-0.4px" }}>{sel.name}</span>
                      <span className="badge btag">{sel.type}</span>
                      <span className="badge btag">{sel.region}</span>
                      <span className="badge btag">{TIER_LABEL[sel.tier]}권</span>
                    </div>
                  </div>
                  {!isAdded(sel.id)
                    ? <button style={{ padding:"8px 18px", background:"#1D4ED8", color:"#fff", border:"none", borderRadius:9, fontSize:13, cursor:"pointer", fontFamily:"'Noto Sans KR',sans-serif", fontWeight:500 }} onClick={() => addUniv(sel)}>+ 목록 추가</button>
                    : <button style={{ padding:"8px 18px", background:"#FEF2F2", color:"#DC2626", border:"1px solid #FECACA", borderRadius:9, fontSize:13, cursor:"pointer", fontFamily:"'Noto Sans KR',sans-serif" }} onClick={() => removeUniv(sel.id)}>삭제</button>}
                </div>
                {isAdded(sel.id) && (
                  <div style={{ marginTop:14, paddingTop:14, borderTop:"1px solid #F3F4F6" }}>
                    <div style={{ fontSize:12, color:"#9CA3AF", marginBottom:6 }}>관심 학과</div>
                    <select value={addedTarget?.dept||""} onChange={e => setDept(sel.id, e.target.value)}>
                      <option value="">학과 선택</option>
                      {sel.depts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Match indicator */}
              {avg && matchSel && (
                <div className="minfo" style={{ background:matchSel.bg, borderColor:matchSel.border }}>
                  <div><div style={{ fontSize:11, color:"#6B7280", marginBottom:2 }}>내 국·수·영 평균</div><div style={{ fontSize:22, fontWeight:700, color:"#111", letterSpacing:"-0.5px" }}>{(+avg).toFixed(1)}등급</div></div>
                  <div style={{ fontSize:18, color:"#D1D5DB" }}>→</div>
                  <div>
                    <div style={{ fontSize:11, color:"#6B7280", marginBottom:2 }}>합격 가능성</div>
                    <div style={{ fontSize:16, fontWeight:600, color:matchSel.color }}>{matchSel.label}</div>
                    <div className="mbar" style={{ width:140 }}><div style={{ height:"100%", width:`${matchSel.pct}%`, background:matchSel.color, borderRadius:3 }} /></div>
                  </div>
                </div>
              )}

              {/* Track tabs */}
              <div className="tabs">
                {["수시","정시"].map(t => <button key={t} className={`tab${trackTab===t?" active":""}`} onClick={() => setTrackTab(t)}>{t}</button>)}
              </div>

              {sel.tracks.filter(t => t.type===trackTab).map((t,i) => (
                <div key={i} className="tcard">
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                    <div>
                      <div style={{ fontSize:14.5, fontWeight:600, color:"#111", marginBottom:3 }}>{t.name}</div>
                      <div style={{ fontSize:12.5, color:"#6B7280" }}>{t.note}</div>
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
              {!sel.tracks.filter(t => t.type===trackTab).length && <div style={{ textAlign:"center", padding:"24px", fontSize:14, color:"#9CA3AF" }}>{trackTab} 전형 없음</div>}

              <div className="card">
                <div className="secl">📚 개설 학과 ({sel.depts.length}개)</div>
                <div>{sel.depts.map(d => <span key={d} className="dchip">{d}</span>)}</div>
              </div>
            </>}

            {!sel && !query && (
              targets.length > 0 ? (
                <div>
                  <div style={{ fontSize:13, color:"#9CA3AF", marginBottom:12 }}>추가된 대학을 클릭하여 상세 정보를 확인하세요</div>
                  <div className="ovgrid">
                    {targets.map(u => { const m = getMatch(u); const t = targets.find(x => x.id===u.id); return (
                      <div key={u.id} className="ovc" onClick={() => setSelId(u.id)}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                          <span className="dot" style={{ background:u.color, width:9, height:9 }} />
                          <span style={{ fontSize:14, fontWeight:600, color:"#111" }}>{u.name}</span>
                        </div>
                        {t?.dept && <div style={{ fontSize:12, color:"#2563EB", marginBottom:4 }}>{t.dept}</div>}
                        <div style={{ fontSize:12, color:"#9CA3AF" }}>{u.region} · {u.type}</div>
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
            {avg && <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"9px 16px", borderRadius:10, background:"#EFF6FF", marginBottom:16 }}><span style={{ fontSize:13, color:"#1D4ED8", fontWeight:500 }}>📊 국·수·영 전체 평균: {(+avg).toFixed(1)}등급</span></div>}
            {avg && (
              <div className="avrow">
                {SEMS.map(m => { const a = semAvg(m); return a ? (
                  <div key={m} className="avbox">
                    <div style={{ fontSize:11, color:"#9CA3AF", marginBottom:4 }}>{m}</div>
                    <div style={{ fontSize:16, fontWeight:600, color:"#111" }}>{a}</div>
                    <div style={{ fontSize:10, color:"#D1D5DB", marginTop:1 }}>국수영 평균</div>
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
                <div className="secl" style={{ marginBottom:6 }}>📈 등급 추이  <span style={{ fontWeight:400, color:"#D1D5DB" }}>— 위로 갈수록 우수 (1등급)</span></div>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={chartData} margin={{ top:8, right:20, bottom:0, left:-18 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="semester" tick={{ fontSize:12, fill:"#9CA3AF" }} />
                    <YAxis domain={[1,9]} reversed={true} tickCount={9} tickFormatter={v=>`${v}등`} tick={{ fontSize:11, fill:"#9CA3AF" }} />
                    <Tooltip formatter={(v,n)=>[`${v}등급`,n]} contentStyle={{ background:"#fff", border:"1px solid #ECEAE4", borderRadius:10, fontSize:13 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:12 }} />
                    {Object.entries(LINE_COLORS).map(([s,c]) => <Line key={s} type="monotone" dataKey={s} stroke={c} strokeWidth={2.5} dot={{ r:4, strokeWidth:0 }} activeDot={{ r:6 }} connectNulls />)}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="empty" style={{ padding:"40px 20px" }}><div style={{ fontSize:40, marginBottom:14 }}>📈</div><div style={{ fontSize:15 }}>성적을 입력하면 추이 그래프가 나타납니다</div></div>
            )}
          </>}

          {/* 생기부 */}
          {section === "생기부" && <>
            <div className="ptitle">생활기록부</div>
            <div className="psub">PDF를 업로드하면 AI가 섹션별로 자동 정리해 드립니다</div>
            <div className={`uzone${drag?" drag":""}`}
              onDragOver={e => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); const f=e.dataTransfer.files[0]; if(f) handleFile(f); }}
              onClick={() => fileRef.current?.click()}>
              <input ref={fileRef} type="file" accept=".pdf" style={{ display:"none" }} onChange={e => { const f=e.target.files?.[0]; if(f) handleFile(f); }} />
              <div style={{ fontSize:36, marginBottom:12 }}>📤</div>
              {fname ? <>
                <div style={{ fontSize:15, fontWeight:500, color:"#111", marginBottom:6 }}>{fname}</div>
                <div style={{ fontSize:13, color:"#9CA3AF" }}>다른 파일을 업로드하려면 클릭하세요</div>
              </> : <>
                <div style={{ fontSize:15, fontWeight:500, color:"#111", marginBottom:6 }}>생활기록부 PDF를 드래그하거나 클릭하여 업로드</div>
                <div style={{ fontSize:13, color:"#9CA3AF" }}>PDF 파일만 지원됩니다</div>
              </>}
            </div>

            {parsing && <div style={{ textAlign:"center", padding:"40px 20px" }}><div className="spinner"/><div style={{ fontSize:14, color:"#6B7280" }}>AI가 생활기록부를 분석하고 있습니다…</div></div>}

            {gibpu && !parsing && (gibpu.error
              ? <div style={{ padding:"16px", background:"#FEF2F2", borderRadius:10, color:"#DC2626", fontSize:14, border:"1px solid #FECACA" }}>{gibpu.error}</div>
              : <>
                {gibpu.학생정보 && <div className="gsec"><div className="secl">👤 기본 정보</div><div className="ocards">{Object.entries(gibpu.학생정보).map(([k,v]) => <div key={k} className="ostat"><div style={{ fontSize:11, color:"#9CA3AF", marginBottom:4 }}>{k}</div><div style={{ fontSize:15, fontWeight:600, color:"#111" }}>{v||"—"}</div></div>)}</div></div>}
                {gibpu.출결 && <div className="gsec"><div className="secl">📅 출결 사항</div><div className="ocards">{Object.entries(gibpu.출결).map(([k,v]) => <div key={k} className="ostat"><div style={{ fontSize:11, color:"#9CA3AF", marginBottom:4 }}>{k}</div><div style={{ fontSize:20, fontWeight:700, color:"#111" }}>{v||"—"}</div></div>)}</div></div>}
                {gibpu.교과발달?.length > 0 && <div className="gsec"><div className="secl">📖 교과 학습 발달사항</div>{gibpu.교과발달.map((item,i) => <div key={i} className="irow"><div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}><span className="ititle">{item.과목}</span>{item.성취도 && <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:"#F0FDF4", color:"#059669", fontWeight:500 }}>{item.성취도}</span>}</div>{item.특기사항 && <div className="ibody">{item.특기사항}</div>}</div>)}</div>}
                {gibpu.창의체험 && Object.values(gibpu.창의체험).some(v=>v) && <div className="gsec"><div className="secl">⭐ 창의적 체험활동</div>{Object.entries(gibpu.창의체험).filter(([,v])=>v).map(([k,v]) => <div key={k} className="irow"><div style={{ fontSize:11, color:"#9CA3AF", marginBottom:4, fontWeight:500 }}>{k}</div><div className="ibody">{v}</div></div>)}</div>}
                {gibpu.수상경력?.filter(x=>x.대회명).length > 0 && <div className="gsec"><div className="secl">🏆 수상 경력</div>{gibpu.수상경력.filter(x=>x.대회명).map((item,i) => <div key={i} className="irow" style={{ display:"flex", alignItems:"center", gap:12 }}><span style={{ fontSize:20 }}>🥇</span><div><div className="ititle">{item.대회명}</div><div className="ibody">{item.등위}{item.날짜?" · "+item.날짜:""}</div></div></div>)}</div>}
                {gibpu.독서?.filter(x=>x.책제목).length > 0 && <div className="gsec"><div className="secl">📚 독서 활동</div><div className="chips">{gibpu.독서.filter(x=>x.책제목).map((item,i) => <span key={i} className="chip">{item.책제목}{item.저자?` (${item.저자})`:""}</span>)}</div></div>}
                {gibpu.행동특성종합의견 && <div className="gsec"><div className="secl">💬 행동특성 및 종합의견</div><div className="ibody" style={{ lineHeight:1.9, fontSize:14 }}>{gibpu.행동특성종합의견}</div></div>}
              </>
            )}
          </>}

        </main>
      </div>
    </>
  );
}

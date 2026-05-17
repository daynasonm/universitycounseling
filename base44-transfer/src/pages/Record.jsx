import React, { useEffect, useRef, useState } from "react";
import { BookOpen, CheckCircle2, FileText, MessageSquare, Sparkles, Trophy, UploadCloud, X } from "lucide-react";
import { PageHeader, SectionCard, StatusPill } from "@/components/admission/Cards";
import { filterEntity, getCurrentUser, upsertStudentProfile } from "@/components/admission/base44";

const summarySections = [
  { icon: FileText, title: "기본 정보", body: "학교, 학년, 인적사항을 확인합니다." },
  { icon: BookOpen, title: "교과 세특", body: "전공과 연결되는 과목별 기록을 모읍니다." },
  { icon: Sparkles, title: "창의적 체험활동", body: "동아리, 진로, 자율활동의 핵심 근거를 정리합니다." },
  { icon: Trophy, title: "수상/독서", body: "지원 전공과 이어지는 활동을 표시합니다." },
  { icon: MessageSquare, title: "종합의견", body: "상담 전 선생님이 볼 요약 메모를 준비합니다." },
];

const RECORD_FILE_ACCEPT = ".pdf,image/*,.png,.jpg,.jpeg,.heic,.heif,.webp,.gif,.bmp,.tif,.tiff";
const splitLines = text => String(text || "").replace(/\r/g, "").trim().split("\n").map(line => line.trim()).filter(Boolean);
const includesAny = (text, keywords) => keywords.some(keyword => keyword && text.includes(keyword));
const majorKeywords = major => {
  if (/컴퓨터|소프트웨어|전산|AI|인공지능|데이터/.test(major)) return ["컴퓨터", "소프트웨어", "정보", "코딩", "프로그래밍", "데이터", "알고리즘"];
  if (/의예|의학|간호|약학|보건/.test(major)) return ["생명", "화학", "의학", "보건", "탐구", "봉사"];
  if (/경영|경제|금융|회계/.test(major)) return ["경제", "경영", "통계", "사회", "시장", "창업"];
  return ["탐구", "진로", "보고서", "발표"];
};
function analyzeRecordText(text, preferredMajor = "") {
  const clean = String(text || "").trim();
  const lines = splitLines(clean);
  const joined = clean.replace(/\s+/g, " ");
  const keywords = majorKeywords(preferredMajor);
  const checks = {
    enoughText: clean.length >= 500,
    majorFit: includesAny(joined, keywords),
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
  if (checks.majorFit) strengths.push(`${preferredMajor || "희망 학과"}와 연결되는 키워드가 보입니다.`);
  else gaps.push("희망 학과와 직접 연결되는 활동 근거가 약합니다.");
  if (checks.inquiry) strengths.push("탐구, 보고서, 발표처럼 학습 과정 근거가 있습니다.");
  else gaps.push("교과 세특에서 탐구 과정과 결론이 더 필요합니다.");
  if (checks.leadership) strengths.push("주도성, 협업, 기획 경험이 드러납니다.");
  else gaps.push("팀 활동 속 본인의 역할과 주도 행동이 더 구체적이어야 합니다.");
  if (checks.reading) strengths.push("독서 또는 자료 탐색 흔적이 있습니다.");
  else gaps.push("전공 관련 독서와 확장 활동 기록이 부족합니다.");
  if (checks.awards) strengths.push("수상 또는 대회 기록이 있습니다.");
  if (!checks.continuity) gaps.push("활동이 다음 탐구나 진로 계획으로 이어지는 흐름이 약합니다.");
  if (!checks.enoughText) gaps.push("원문 입력량이 적어 분석 신뢰도가 낮습니다.");
  if (!checks.majorFit) actions.push(`세특/진로활동에서 ${preferredMajor || "희망 학과"}와 연결되는 탐구 주제를 보강하세요.`);
  if (!checks.inquiry) actions.push("보고서 제목, 탐구 질문, 조사 방법, 결론을 원문에 남겨주세요.");
  if (!checks.leadership) actions.push("팀 활동에서는 맡은 역할, 결정한 내용, 결과를 분리해서 적어두세요.");
  if (!checks.reading) actions.push("전공 관련 책 2권과 읽은 뒤 확장한 활동을 연결하세요.");
  if (!actions.length) actions.push("강점이 보입니다. 목표 대학 전형에 맞춰 활동 우선순위를 정리하세요.");
  return {
    score,
    level: score >= 80 ? "충분" : score >= 60 ? "보완 필요" : "자료 부족",
    strengths: strengths.length ? strengths : ["아직 판단할 원문이 부족합니다."],
    gaps: gaps.length ? gaps : ["큰 결손은 보이지 않습니다."],
    actions: actions.slice(0, 4),
  };
}

function isRecordFile(file) {
  if (!file) return false;
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  return type === "application/pdf" || type.startsWith("image/") || /\.(pdf|png|jpe?g|heic|heif|webp|gif|bmp|tiff?)$/.test(name);
}

function createPreview(file) {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  const isImage = type.startsWith("image/") || /\.(png|jpe?g|heic|heif|webp|gif|bmp|tiff?)$/.test(name);
  return isImage ? { url: URL.createObjectURL(file), name: file.name } : null;
}

export default function Record() {
  const [user, setUser] = useState(null);
  const [fileName, setFileName] = useState("");
  const [recordText, setRecordText] = useState("");
  const [analysis, setAnalysis] = useState(analyzeRecordText(""));
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    getCurrentUser().then(async me => {
      setUser(me);
      const existing = me?.id ? await filterEntity("StudentProfile", { user_id: me.id }, "-updated_date", 1) : [];
      const profile = existing?.[0];
      if (profile?.record_file_name) setFileName(profile.record_file_name);
      if (profile?.record_text) {
        setRecordText(profile.record_text);
        setAnalysis(analyzeRecordText(profile.record_text, profile.preferred_major || me?.preferred_major || ""));
      }
    });
  }, []);

  useEffect(() => {
    return () => {
      if (preview?.url) URL.revokeObjectURL(preview.url);
    };
  }, [preview?.url]);

  async function handleFile(file) {
    if (!isRecordFile(file)) return;
    setFileName(file.name);
    setPreview(createPreview(file));
    setPreviewOpen(false);
    await upsertStudentProfile(user, { record_status: recordText.trim() ? "분석완료" : "업로드", record_file_name: file.name });
  }

  async function saveRecordText() {
    const nextAnalysis = analyzeRecordText(recordText, user?.preferred_major || user?.preferredMajor || "");
    setAnalysis(nextAnalysis);
    await upsertStudentProfile(user, {
      record_status: recordText.trim() ? "분석완료" : fileName ? "업로드" : "미업로드",
      record_file_name: fileName,
      record_text: recordText,
      record_ai_score: nextAnalysis.score,
      record_ai_level: nextAnalysis.level,
      record_strengths: nextAnalysis.strengths.join("\n"),
      record_gaps: nextAnalysis.gaps.join("\n"),
      record_actions: nextAnalysis.actions.join("\n"),
    });
    setNotice("원문과 AI 분석이 저장되었습니다.");
  }

  return (
    <div>
      <PageHeader title="생활기록부" subtitle="PDF와 모바일 사진 파일을 상담 준비용으로 따로 관리하세요" />

      <SectionCard
        className={`mb-5 cursor-pointer rounded-3xl p-5 text-center transition-all ${
          dragging ? "border-primary bg-primary/5" : "hover:border-primary/40"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={event => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={event => {
          event.preventDefault();
          setDragging(false);
          handleFile(event.dataTransfer.files?.[0]);
        }}
      >
        <input ref={inputRef} type="file" accept={RECORD_FILE_ACCEPT} className="hidden" onChange={event => handleFile(event.target.files?.[0])} />
        {preview ? (
          <button
            type="button"
            className="mx-auto mb-4 block h-40 w-full max-w-sm overflow-hidden rounded-3xl border border-primary/20 bg-white/80 p-2 shadow-2xl shadow-slate-900/10"
            onClick={event => {
              event.stopPropagation();
              setPreviewOpen(true);
            }}
          >
            <img src={preview.url} alt={preview.name} className="h-full w-full rounded-2xl object-contain" />
          </button>
        ) : (
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {fileName ? <CheckCircle2 className="h-6 w-6" /> : <UploadCloud className="h-6 w-6" />}
          </div>
        )}
        <p className="text-sm font-bold text-foreground">{fileName || "생활기록부 자료 업로드"}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {preview ? "사진을 클릭하면 크게 볼 수 있습니다." : fileName ? "다른 파일로 교체하려면 다시 선택하세요." : "PDF, PNG, JPG, JPEG, HEIC 등 사진 파일을 올릴 수 있습니다."}
        </p>
      </SectionCard>

      {previewOpen && preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-5 backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
          aria-label="생활기록부 사진 미리보기"
          onClick={() => setPreviewOpen(false)}
        >
          <button
            type="button"
            className="fixed right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white shadow-xl backdrop-blur"
            onClick={() => setPreviewOpen(false)}
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex max-h-[90vh] max-w-[96vw] flex-col items-center gap-3" onClick={event => event.stopPropagation()}>
            <img src={preview.url} alt={preview.name} className="max-h-[82vh] max-w-[96vw] rounded-[28px] bg-white object-contain shadow-2xl shadow-black/40" />
            <p className="max-w-[90vw] break-all text-center text-xs font-semibold text-slate-200">{preview.name}</p>
          </div>
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">정리할 항목</h2>
        <StatusPill tone={recordText.trim() ? "success" : fileName ? "primary" : "muted"}>{recordText.trim() ? "분석완료" : fileName ? "업로드" : "미업로드"}</StatusPill>
      </div>

      <SectionCard className="mb-4 rounded-3xl p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-foreground">생활기록부 원문</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">사진이나 PDF에 있는 내용을 옮겨 적거나 OCR 결과를 붙여넣으세요.</p>
          </div>
          <StatusPill tone="primary">{recordText.length}자</StatusPill>
        </div>
        <textarea
          value={recordText}
          onChange={event => {
            setRecordText(event.target.value);
            setAnalysis(analyzeRecordText(event.target.value, user?.preferred_major || user?.preferredMajor || ""));
            setNotice("");
          }}
          placeholder="예: 정보 수업에서 알고리즘 효율성을 주제로 탐구 보고서를 작성하고, 동아리에서 웹 서비스 기획과 구현을 맡아 팀 프로젝트를 주도함..."
          className="min-h-52 w-full resize-y rounded-2xl border border-border bg-background p-3 text-sm leading-relaxed outline-none focus:border-primary"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-primary">{notice}</p>
          <button type="button" onClick={saveRecordText} className="h-10 rounded-xl bg-primary px-4 text-xs font-black text-primary-foreground">원문 저장/분석</button>
        </div>
      </SectionCard>

      <SectionCard className="mb-4 rounded-3xl p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-foreground">AI 분석</h2>
            <p className="mt-1 text-xs text-muted-foreground">충분한 점과 부족한 점을 상담 전 자동 점검합니다.</p>
          </div>
          <StatusPill tone={analysis.score >= 80 ? "success" : analysis.score >= 60 ? "warning" : "muted"}>{analysis.score}점 · {analysis.level}</StatusPill>
        </div>
        <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3">
            <p className="mb-2 text-xs font-black text-foreground">충분한 점</p>
            <ul className="space-y-1 pl-4 text-xs leading-relaxed text-muted-foreground">{analysis.strengths.map((item, index) => <li key={index}>{item}</li>)}</ul>
          </div>
          <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-3">
            <p className="mb-2 text-xs font-black text-foreground">부족한 점</p>
            <ul className="space-y-1 pl-4 text-xs leading-relaxed text-muted-foreground">{analysis.gaps.map((item, index) => <li key={index}>{item}</li>)}</ul>
          </div>
          <div className="col-span-2 rounded-2xl border border-primary/10 bg-primary/5 p-3 max-sm:col-span-1">
            <p className="mb-2 text-xs font-black text-foreground">다음 보완 액션</p>
            <ul className="space-y-1 pl-4 text-xs leading-relaxed text-muted-foreground">{analysis.actions.map((item, index) => <li key={index}>{item}</li>)}</ul>
          </div>
        </div>
      </SectionCard>

      <div className="space-y-3">
        {summarySections.map(({ icon: Icon, title, body }) => (
          <SectionCard key={title} className="flex items-start gap-3 rounded-3xl p-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}

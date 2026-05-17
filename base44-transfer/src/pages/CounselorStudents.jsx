import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Filter, Search, Users } from "lucide-react";
import { EmptyState, PageHeader, SectionCard, StatCard, StatusPill } from "@/components/admission/Cards";
import { ROADMAP_SEED } from "@/components/admission/data";
import { createEntity, deleteEntity, getCurrentUser, listEntity } from "@/components/admission/base44";

function scoreTone(value) {
  if (!value) return "muted";
  if (Number(value) <= 2) return "primary";
  if (Number(value) <= 4) return "success";
  return "warning";
}

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

const roadmapStatusTone = {
  "예정": "muted",
  "진행중": "primary",
  "완료": "success",
  "긴급": "danger",
};
const assignmentFormDefault = { source: "상담사", subject: "", title: "", due_date: "", notes: "" };
const assignmentStatusColumns = [
  { key: "해야할것", label: "해야 할 것", tone: "muted" },
  { key: "하는중", label: "하고 있는 것", tone: "primary" },
  { key: "검사중", label: "다 한 것", tone: "warning" },
];
const assignmentStatusMeta = status => assignmentStatusColumns.find(column => column.key === status) || assignmentStatusColumns[0];
const oneLineSummary = text => {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "내용 요약 없음";
  return clean.length > 72 ? `${clean.slice(0, 72)}...` : clean;
};

export default function CounselorStudents() {
  const [user, setUser] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [journals, setJournals] = useState([]);
  const [roadmapTasks, setRoadmapTasks] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [query, setQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [schoolFilter, setSchoolFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [journalForm, setJournalForm] = useState({ date: todayValue(), topic: "목표대학 상담", summary: "", next_steps: "" });
  const [journalNotice, setJournalNotice] = useState("");
  const [expandedJournalId, setExpandedJournalId] = useState(null);
  const [assignmentForm, setAssignmentForm] = useState(assignmentFormDefault);
  const [assignmentNotice, setAssignmentNotice] = useState("");

  async function load() {
    const [me, profileRows, meetingRows, journalRows, roadmapRows, assignmentRows] = await Promise.all([
      getCurrentUser(),
      listEntity("StudentProfile", "grade_level"),
      listEntity("CounselorMeeting", "-created_date"),
      listEntity("CounselingJournal", "-date"),
      listEntity("RoadmapTask", "month"),
      listEntity("Assignment", "-created_date"),
    ]);
    setUser(me);
    setProfiles(profileRows);
    setMeetings(meetingRows);
    setJournals(journalRows);
    setRoadmapTasks(roadmapRows);
    setAssignments(assignmentRows);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setAssignmentForm(assignmentFormDefault);
    setAssignmentNotice("");
    setExpandedJournalId(null);
  }, [selected?.user_id]);

  const schoolOptions = useMemo(() => [...new Set(profiles.map(item => item.high_school).filter(Boolean))].sort(), [profiles]);
  const classOptions = useMemo(() => [...new Set(profiles.map(item => item.class_name).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ko", { numeric: true })), [profiles]);
  const filtered = profiles.filter(student => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q
      || student.name?.toLowerCase().includes(q)
      || student.email?.toLowerCase().includes(q)
      || student.high_school?.toLowerCase().includes(q)
      || student.preferred_major?.toLowerCase().includes(q)
      || student.class_name?.toLowerCase().includes(q);
    const matchesGrade = gradeFilter === "all" || student.grade_level === gradeFilter;
    const matchesSchool = schoolFilter === "all" || student.high_school === schoolFilter;
    const matchesClass = classFilter === "all" || student.class_name === classFilter;
    const matchesScore = scoreFilter === "all"
      || (scoreFilter === "top" && Number(student.core_avg) > 0 && Number(student.core_avg) <= 2)
      || (scoreFilter === "middle" && Number(student.core_avg) > 2 && Number(student.core_avg) <= 4)
      || (scoreFilter === "needs" && Number(student.core_avg) > 4)
      || (scoreFilter === "none" && !student.core_avg);

    return matchesQuery && matchesGrade && matchesSchool && matchesClass && matchesScore;
  });

  const grouped = filtered.reduce((map, student) => {
    const key = `${student.grade_level || "학년 미정"} ${student.class_name || "반 미정"}`;
    if (!map[key]) map[key] = [];
    map[key].push(student);
    return map;
  }, {});
  const groupKeys = Object.keys(grouped).sort((a, b) => a.localeCompare(b, "ko", { numeric: true }));

  function setJournalValue(key, value) {
    setJournalForm(prev => ({ ...prev, [key]: value }));
    setJournalNotice("");
  }

  function setAssignmentValue(key, value) {
    setAssignmentForm(prev => ({ ...prev, [key]: value }));
    setAssignmentNotice("");
  }

  async function saveJournal(event) {
    event.preventDefault();
    if (!selected) return;
    if (!journalForm.summary.trim()) {
      setJournalNotice("상담 내용을 입력해주세요.");
      return;
    }
    await createEntity("CounselingJournal", {
      student_user_id: selected.user_id,
      student_name: selected.name,
      student_email: selected.email,
      counselor_user_id: user?.id,
      counselor_name: user?.full_name || user?.name || "상담사",
      date: journalForm.date || todayValue(),
      topic: journalForm.topic,
      summary: journalForm.summary.trim(),
      next_steps: journalForm.next_steps.trim(),
    });
    setJournalForm(prev => ({ ...prev, summary: "", next_steps: "" }));
    setJournalNotice("상담 일지가 저장되었습니다.");
    await load();
  }

  async function deleteJournal(id) {
    await deleteEntity("CounselingJournal", id);
    setJournals(prev => prev.filter(item => item.id !== id));
    if (expandedJournalId === id) setExpandedJournalId(null);
    setJournalNotice("상담 기록이 삭제되었습니다.");
  }

  async function assignTask(event) {
    event.preventDefault();
    if (!selected) return;
    if (!assignmentForm.title.trim()) {
      setAssignmentNotice("과제명을 입력해주세요.");
      return;
    }
    await createEntity("Assignment", {
      student_user_id: selected.user_id,
      source: assignmentForm.source,
      subject: assignmentForm.subject.trim() || "입시",
      title: assignmentForm.title.trim(),
      teacher: user?.full_name || user?.name || "상담사",
      due_date: assignmentForm.due_date.trim() || "미정",
      notes: assignmentForm.notes.trim() || "선생님이 배정한 과제입니다.",
      status: "해야할것",
    });
    setAssignmentForm(assignmentFormDefault);
    setAssignmentNotice("학생의 해야 할 것 칼럼에 과제가 추가되었습니다.");
    await load();
  }

  async function deleteAssignment(id) {
    await deleteEntity("Assignment", id);
    setAssignments(prev => prev.filter(item => item.id !== id));
    setAssignmentNotice("과제가 삭제되었습니다. 학생 과제 보드에서도 제거됩니다.");
  }

  if (selected) {
    const studentMeetings = meetings.filter(item => item.student_user_id === selected.user_id || item.student_email === selected.email);
    const studentJournals = journals
      .filter(item => item.student_user_id === selected.user_id || item.student_email === selected.email)
      .sort((a, b) => new Date(b.date || b.created_date) - new Date(a.date || a.created_date));
    const studentAssignments = assignments.filter(item => item.student_user_id === selected.user_id);
    const assignmentCounts = assignmentStatusColumns.reduce((map, column) => {
      map[column.key] = studentAssignments.filter(item => item.status === column.key).length;
      return map;
    }, {});
    const savedRoadmapTasks = roadmapTasks.filter(item => item.student_user_id === selected.user_id || item.student_email === selected.email);
    const studentRoadmap = savedRoadmapTasks.length
      ? savedRoadmapTasks
      : ROADMAP_SEED.map((task, index) => ({ ...task, id: `seed-${index}`, status: task.status === "긴급" ? "긴급" : "예정" }));
    const roadmapCompleted = studentRoadmap.filter(task => task.status === "완료").length;
    const roadmapProgress = studentRoadmap.length ? Math.round((roadmapCompleted / studentRoadmap.length) * 100) : 0;
    const groupedRoadmap = studentRoadmap
      .slice()
      .sort((a, b) => `${a.month || ""}${a.due_date || ""}`.localeCompare(`${b.month || ""}${b.due_date || ""}`))
      .reduce((map, task) => {
        const month = task.month || "미정";
        if (!map[month]) map[month] = [];
        map[month].push(task);
        return map;
      }, {});
    const roadmapGroups = Object.entries(groupedRoadmap).map(([month, rows], index) => ({
      month,
      rows,
      done: rows.filter(task => task.status === "완료").length,
      stage: ["기초 세팅", "자료 준비", "서류 초안", "지원 확정"][index] || "준비 단계",
    }));
    const activeRoadmapIndex = Math.max(0, roadmapGroups.findIndex(group => group.done < group.rows.length));
    const nextRoadmapTask = studentRoadmap.find(task => task.status !== "완료");

    return (
      <div>
        <button type="button" onClick={() => setSelected(null)} className="mb-4 inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold">
          <ArrowLeft className="w-4 h-4" />
          학생 목록
        </button>

        <SectionCard className="p-5 mb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{selected.name}</h1>
              <div className="mt-3 inline-flex items-center gap-3 rounded-3xl border border-primary/15 bg-primary/5 px-4 py-3 shadow-lg shadow-primary/5">
                <span className="text-[11px] font-black text-primary">희망 학과</span>
                <span className="text-xl font-black tracking-tight text-foreground">{selected.preferred_major || "학과 미입력"}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-3">{selected.high_school} · {selected.grade_level} · {selected.class_name}</p>
              <p className="text-xs text-muted-foreground mt-1">{selected.email}</p>
            </div>
            <StatusPill tone={scoreTone(selected.core_avg)}>{selected.core_avg ? `${Number(selected.core_avg).toFixed(1)}등급` : "성적 미입력"}</StatusPill>
          </div>
        </SectionCard>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <StatCard label="희망학과" value={selected.preferred_major || "미입력"} />
          <StatCard label="목표대학" value={`${selected.target_count || 0}개`} />
          <StatCard label="생활기록부" value={selected.record_status || "미업로드"} />
        </div>

        <SectionCard className="p-4 mb-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">생활기록부 원문 및 AI 분석</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">학생이 옮겨 적은 생활기록부 내용과 상담 전 보완 포인트를 확인합니다.</p>
            </div>
            <StatusPill tone={selected.record_ai_score >= 80 ? "success" : selected.record_ai_score >= 60 ? "warning" : "muted"}>
              {selected.record_ai_score ? `${selected.record_ai_score}점 · ${selected.record_ai_level}` : selected.record_status || "미업로드"}
            </StatusPill>
          </div>
          {selected.record_text ? (
            <>
              <div className="mb-3 max-h-44 overflow-auto whitespace-pre-wrap rounded-3xl border border-border bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
                {selected.record_text}
              </div>
              <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3">
                  <p className="mb-2 text-xs font-black text-foreground">충분한 점</p>
                  <div className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{selected.record_strengths || "분석 대기"}</div>
                </div>
                <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-3">
                  <p className="mb-2 text-xs font-black text-foreground">부족한 점</p>
                  <div className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{selected.record_gaps || "분석 대기"}</div>
                </div>
              </div>
              {selected.record_actions && (
                <div className="mt-3 rounded-2xl border border-primary/10 bg-primary/5 p-3">
                  <p className="mb-2 text-xs font-black text-foreground">다음 보완 액션</p>
                  <div className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{selected.record_actions}</div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-3xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              학생이 생활기록부 원문을 입력하면 여기에 표시됩니다.
            </div>
          )}
        </SectionCard>

        <SectionCard className="p-4 mb-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">과제 배정</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">여기서 배정한 과제는 학생의 과제 점검 페이지 해야 할 것 칼럼에 바로 표시됩니다.</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {assignmentStatusColumns.map(column => (
                  <StatusPill key={column.key} tone={column.tone}>{column.label} {assignmentCounts[column.key] || 0}</StatusPill>
                ))}
              </div>
            </div>
            <StatusPill tone="primary">{studentAssignments.length}개 전체</StatusPill>
          </div>

          <form onSubmit={assignTask} className="mb-4 rounded-3xl border border-border bg-muted/40 p-4">
            <div className="mb-3 grid grid-cols-2 gap-2 max-sm:grid-cols-1">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">출처</label>
                <select value={assignmentForm.source} onChange={event => setAssignmentValue("source", event.target.value)} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm">
                  <option value="상담사">상담사</option>
                  <option value="학교">학교</option>
                  <option value="학원">학원</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">과목/분류</label>
                <input value={assignmentForm.subject} onChange={event => setAssignmentValue("subject", event.target.value)} placeholder="예: 수학, 생기부, 자소서" className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">마감일</label>
                <input value={assignmentForm.due_date} onChange={event => setAssignmentValue("due_date", event.target.value)} placeholder="예: 5월 24일" className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">과제명</label>
                <input value={assignmentForm.title} onChange={event => setAssignmentValue("title", event.target.value)} placeholder="예: 활동 보고서 초안 보완" className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm" />
              </div>
            </div>
            <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">과제 설명</label>
            <textarea
              value={assignmentForm.notes}
              onChange={event => setAssignmentValue("notes", event.target.value)}
              placeholder="학생이 해야 할 구체적인 작업을 적어주세요."
              className="min-h-24 w-full resize-y rounded-2xl border border-border bg-background p-3 text-sm leading-relaxed"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-primary">{assignmentNotice}</p>
              <button type="submit" className="h-9 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground">
                과제 배정하기
              </button>
            </div>
          </form>

          <div className="space-y-2">
            {studentAssignments.map(item => {
              const statusMeta = assignmentStatusMeta(item.status);
              return (
                <article key={item.id} className="rounded-3xl border border-border bg-background p-4">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="flex flex-wrap gap-1.5">
                      <StatusPill tone={item.source === "학교" ? "primary" : item.source === "학원" ? "warning" : "success"}>{item.source}</StatusPill>
                      <StatusPill>{item.subject}</StatusPill>
                      <StatusPill tone={statusMeta.tone}>{statusMeta.label}</StatusPill>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteAssignment(item.id)}
                      className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-black text-red-600"
                    >
                      삭제
                    </button>
                  </div>
                  <p className="text-sm font-black text-foreground">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.teacher} · 마감 {item.due_date}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.notes}</p>
                </article>
              );
            })}
            {!studentAssignments.length && <EmptyState title="배정된 과제가 없습니다" body="과제를 배정하면 학생 보드에 바로 추가됩니다." />}
          </div>
        </SectionCard>

        <SectionCard className="p-4 mb-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">학생 로드맵</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">학생이 완료한 월별 입시 준비 항목과 다음 미션을 확인합니다.</p>
            </div>
            <StatusPill tone={roadmapProgress >= 80 ? "success" : "primary"}>{roadmapProgress}%</StatusPill>
          </div>

          <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-3xl border border-border bg-muted/40 p-4 max-sm:grid-cols-1">
            <div>
              <div className="mb-2 inline-flex rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary">입시 로드맵</div>
              <h3 className="text-base font-black text-foreground">
                {nextRoadmapTask ? `다음 미션: ${nextRoadmapTask.title}` : "모든 미션을 완료했어요"}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {nextRoadmapTask ? `${nextRoadmapTask.month || "미정"} · ${nextRoadmapTask.description || nextRoadmapTask.body || "다음 준비 항목을 완료하세요."}` : "상담 전 필요한 준비가 모두 정리되었습니다."}
              </p>
            </div>
            <div
              className="relative grid h-20 w-20 place-items-center rounded-full shadow-sm"
              style={{ background: `conic-gradient(#0ea5e9 ${roadmapProgress * 3.6}deg, rgba(229, 231, 235, 0.88) 0deg)` }}
            >
              <div className="absolute inset-2 rounded-full bg-card" />
              <div className="relative text-center">
                <div className="text-lg font-black text-primary">{roadmapProgress}%</div>
                <div className="mt-1 text-[10px] font-bold text-muted-foreground">{roadmapCompleted}/{studentRoadmap.length}</div>
              </div>
            </div>
          </div>

          <div className="relative ml-4 space-y-3 before:absolute before:left-0 before:top-5 before:bottom-5 before:w-[3px] before:rounded-full before:bg-gradient-to-b before:from-primary before:via-primary/20 before:to-accent/50">
            {roadmapGroups.map((group, groupIndex) => {
              const state = group.done === group.rows.length ? "done" : groupIndex === activeRoadmapIndex ? "active" : "upcoming";
              return (
                <div key={group.month} className="relative pl-7">
                  <div className={`absolute left-[-13px] top-4 grid h-7 w-7 place-items-center rounded-full border-2 text-xs font-black shadow-sm ${
                    state === "done"
                      ? "border-accent/30 bg-accent text-white"
                      : state === "active"
                        ? "border-primary/30 bg-primary text-white"
                        : "border-border bg-card text-muted-foreground"
                  }`}>
                    {state === "done" ? <CheckCircle2 className="h-3.5 w-3.5" /> : groupIndex + 1}
                  </div>
                  <div className="rounded-3xl border border-border bg-background p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-foreground">{group.month}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{group.stage}</p>
                      </div>
                      <StatusPill>{group.done}/{group.rows.length}</StatusPill>
                    </div>
                    <div className="space-y-2">
                      {group.rows.map(task => (
                        <div key={task.id} className="flex items-start gap-3 rounded-2xl border border-border bg-muted/30 p-3">
                          <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg text-xs font-black ${
                            task.status === "완료" ? "bg-accent text-white" : task.status === "긴급" ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"
                          }`}>
                            {task.status === "완료" ? "✓" : "!"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-foreground">{task.title}</p>
                            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{task.description || task.body}</p>
                          </div>
                          <StatusPill tone={roadmapStatusTone[task.status] || "muted"}>{task.status}</StatusPill>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard className="p-4 mb-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">상담 일지</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">상담 후 기록을 남기면 다음 상담에서 바로 참고할 수 있습니다.</p>
            </div>
            <StatusPill>{studentJournals.length}건</StatusPill>
          </div>

          <form onSubmit={saveJournal} className="mb-4 rounded-3xl border border-border bg-muted/40 p-4">
            <div className="mb-3 grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">상담 날짜</label>
                <input
                  type="date"
                  value={journalForm.date}
                  onChange={event => setJournalValue("date", event.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">상담 주제</label>
                <select
                  value={journalForm.topic}
                  onChange={event => setJournalValue("topic", event.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                >
                  {["생활기록부 검토", "목표대학 상담", "성적 분석", "자기소개서 첨삭", "전형 전략", "기타"].map(topic => (
                    <option key={topic} value={topic}>{topic}</option>
                  ))}
                </select>
              </div>
            </div>
            <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">상담 내용</label>
            <textarea
              value={journalForm.summary}
              onChange={event => setJournalValue("summary", event.target.value)}
              placeholder="오늘 상담한 핵심 내용, 학생 반응, 결정한 지원 방향을 기록하세요."
              className="mb-3 min-h-28 w-full resize-y rounded-2xl border border-border bg-background p-3 text-sm leading-relaxed"
            />
            <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">다음 상담 전 확인할 것</label>
            <textarea
              value={journalForm.next_steps}
              onChange={event => setJournalValue("next_steps", event.target.value)}
              placeholder="다음 과제, 추가 확인 자료, 전달할 내용을 남기세요."
              className="min-h-24 w-full resize-y rounded-2xl border border-border bg-background p-3 text-sm leading-relaxed"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-primary">{journalNotice}</p>
              <button type="submit" className="h-9 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground">
                일지 저장
              </button>
            </div>
          </form>

          <div className="space-y-3">
            {studentJournals.map(journal => {
              const expanded = expandedJournalId === journal.id;
              return (
              <article
                key={journal.id}
                role="button"
                tabIndex={0}
                onClick={() => setExpandedJournalId(expanded ? null : journal.id)}
                onKeyDown={event => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setExpandedJournalId(expanded ? null : journal.id);
                  }
                }}
                className={`rounded-3xl border p-4 transition-all ${expanded ? "border-primary/40 bg-background" : "border-border bg-background/80 hover:border-primary/25"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-foreground">{journal.date} · {journal.topic}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{journal.counselor_name || "상담사"}</p>
                    <p className="mt-2 line-clamp-1 text-sm leading-relaxed text-muted-foreground">{oneLineSummary(journal.summary)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <StatusPill tone="primary">{expanded ? "접기" : "열기"}</StatusPill>
                    <button
                      type="button"
                      onClick={event => {
                        event.stopPropagation();
                        deleteJournal(journal.id);
                      }}
                      className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-black text-red-600"
                    >
                      삭제
                    </button>
                  </div>
                </div>
                {expanded && (
                  <div className="mt-3 border-t border-border pt-3">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{journal.summary}</p>
                    {journal.next_steps && (
                      <div className="mt-3 rounded-2xl border border-primary/15 bg-primary/5 p-3">
                        <p className="mb-1 text-[11px] font-bold text-primary">다음 확인 사항</p>
                        <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{journal.next_steps}</p>
                      </div>
                    )}
                  </div>
                )}
              </article>
              );
            })}
            {!studentJournals.length && <EmptyState title="저장된 상담 일지가 없습니다" body="상담 후 기록을 남기면 여기에 누적됩니다." />}
          </div>
        </SectionCard>

        <SectionCard className="p-4 mb-4">
          <h2 className="text-sm font-bold text-foreground mb-3">학생 메모</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{selected.notes || "아직 상담사 메모가 없습니다."}</p>
        </SectionCard>

        <SectionCard className="overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">상담 내역</h2>
            <span className="text-xs text-muted-foreground">{studentMeetings.length}건</span>
          </div>
          {studentMeetings.map(meeting => (
            <div key={meeting.id} className="p-4 border-b border-border last:border-b-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{meeting.topic}</p>
                  <p className="text-xs text-muted-foreground mt-1">{meeting.date} {meeting.time_slot}</p>
                  {meeting.notes && <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{meeting.notes}</p>}
                </div>
                <StatusPill>{meeting.status}</StatusPill>
              </div>
            </div>
          ))}
          {!studentMeetings.length && <EmptyState title="상담 내역이 없습니다" body="학생이 상담을 신청하면 이곳에 표시됩니다." />}
        </SectionCard>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="학생 관리" subtitle="학생을 반별로 보고 학년, 학교, 성적 기준으로 필터링합니다" />

      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard label="전체" value={`${profiles.length}명`} icon={Users} />
        <StatCard label="표시" value={`${filtered.length}명`} />
        <StatCard label="반" value={`${groupKeys.length}개`} />
      </div>

      <SectionCard className="p-4 mb-4">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="학생명, 이메일, 학교, 학과 검색"
            className="h-11 w-full rounded-2xl border border-border bg-background pl-10 pr-4 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <FilterSelect label="학년" value={gradeFilter} onChange={setGradeFilter} options={["고1", "고2", "고3", "1학년", "2학년", "3학년"]} />
          <FilterSelect label="학교" value={schoolFilter} onChange={setSchoolFilter} options={schoolOptions} />
          <FilterSelect label="반" value={classFilter} onChange={setClassFilter} options={classOptions} />
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">성적</label>
            <select value={scoreFilter} onChange={event => setScoreFilter(event.target.value)} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm">
              <option value="all">전체</option>
              <option value="top">1~2등급</option>
              <option value="middle">2~4등급</option>
              <option value="needs">4등급 이하</option>
              <option value="none">미입력</option>
            </select>
          </div>
        </div>
      </SectionCard>

      <div className="space-y-3">
        {groupKeys.map(group => (
          <SectionCard key={group} className="overflow-hidden">
            <div className="flex items-center justify-between bg-muted/50 p-4 border-b border-border">
              <div>
                <h2 className="text-sm font-bold text-foreground">{group}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{[...new Set(grouped[group].map(item => item.high_school).filter(Boolean))].join(", ")}</p>
              </div>
              <StatusPill>{grouped[group].length}명</StatusPill>
            </div>
            {grouped[group].map(student => (
              <button key={student.id} type="button" onClick={() => setSelected(student)} className="w-full p-4 border-b border-border last:border-b-0 text-left hover:bg-muted/40">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-foreground">{student.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{student.high_school} · {student.preferred_major || "학과 미입력"} · {student.email}</p>
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      <StatusPill>{student.target_count || 0}개 대학</StatusPill>
                      <StatusPill>{student.record_status || "미업로드"}</StatusPill>
                    </div>
                  </div>
                  <StatusPill tone={scoreTone(student.core_avg)}>{student.core_avg ? `${Number(student.core_avg).toFixed(1)}등급` : "미입력"}</StatusPill>
                </div>
              </button>
            ))}
          </SectionCard>
        ))}

        {!groupKeys.length && (
          <EmptyState icon={Filter} title="조건에 맞는 학생이 없습니다" body="필터를 조정하거나 학생이 앱에서 프로필을 만든 뒤 다시 확인하세요." />
        )}
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">{label}</label>
      <select value={value} onChange={event => onChange(event.target.value)} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm">
        <option value="all">전체</option>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}

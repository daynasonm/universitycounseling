import React, { useEffect, useMemo, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { PageHeader, SectionCard, StatusPill } from "@/components/admission/Cards";
import { createEntity, getCurrentUser, listForUser, updateEntity } from "@/components/admission/base44";

const columns = [
  { key: "해야할것", label: "해야 할 것", hint: "새로 받은 과제" },
  { key: "하는중", label: "하고 있는 것", hint: "진행 중인 과제" },
  { key: "검사중", label: "다 한 것", hint: "검사 맡고 있는 과제" },
];

const seedAssignments = [
  { source: "학교", subject: "국어", title: "문학 수행평가 작품 해석 정리", teacher: "김국어 선생님", due_date: "2026-05-20", notes: "작품별 주제, 표현법, 느낀 점을 한 장으로 정리", status: "해야할것" },
  { source: "학원", subject: "수학", title: "미적분 오답 25문항 재풀이", teacher: "수학학원", due_date: "2026-05-18", notes: "틀린 이유를 풀이 옆에 한 줄씩 적기", status: "하는중" },
  { source: "학교", subject: "영어", title: "모의고사 지문 3개 요약", teacher: "박영어 선생님", due_date: "2026-05-22", notes: "각 지문 핵심 문장과 어휘 10개 표시", status: "해야할것" },
  { source: "학원", subject: "생기부", title: "진로활동 보고서 초안 제출", teacher: "입시 컨설팅", due_date: "검사 중", notes: "활동 동기와 배운 점 중심으로 피드백 대기", status: "검사중" },
];

const toneByStatus = {
  해야할것: "muted",
  하는중: "primary",
  검사중: "warning",
};

export default function Assignments() {
  const [user, setUser] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [draggedId, setDraggedId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  async function load() {
    const me = await getCurrentUser();
    setUser(me);
    let rows = await listForUser("Assignment", me, "-created_date");
    if (rows.length === 0) {
      await Promise.all(seedAssignments.map(item => createEntity("Assignment", { ...item, student_user_id: me?.id })));
      rows = await listForUser("Assignment", me, "-created_date");
    }
    setAssignments(rows);
  }

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(() => {
    return columns.reduce((map, column) => {
      map[column.key] = assignments.filter(item => item.status === column.key).length;
      return map;
    }, {});
  }, [assignments]);

  async function moveAssignment(item, status) {
    await updateEntity("Assignment", item.id, { status });
    await load();
  }

  async function dropAssignment(status) {
    if (!draggedId) return;
    const item = assignments.find(row => row.id === draggedId);
    setDraggedId(null);
    setDropTarget(null);
    if (!item || item.status === status) return;
    await moveAssignment(item, status);
  }

  return (
    <div>
      <PageHeader title="과제 점검" subtitle="학교와 학원 선생님이 준 과제를 상태별로 확인하세요" />

      <div className="mb-5 grid grid-cols-3 gap-2">
        {columns.map(column => (
          <SectionCard key={column.key} className="rounded-3xl p-3 text-center">
            <p className="text-[11px] font-bold text-muted-foreground">{column.label}</p>
            <p className="mt-1 text-xl font-bold text-foreground">{counts[column.key] || 0}</p>
          </SectionCard>
        ))}
      </div>

      <div className="space-y-4">
        {columns.map(column => {
          const rows = assignments.filter(item => item.status === column.key);
          return (
            <SectionCard
              key={column.key}
              className={`rounded-3xl p-4 transition-all ${dropTarget === column.key ? "border-primary bg-primary/5" : ""}`}
              onDragOver={event => {
                event.preventDefault();
                setDropTarget(column.key);
              }}
              onDragLeave={event => {
                if (!event.currentTarget.contains(event.relatedTarget)) setDropTarget(null);
              }}
              onDrop={event => {
                event.preventDefault();
                dropAssignment(column.key);
              }}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-foreground">{column.label}</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">{column.hint}</p>
                </div>
                <StatusPill tone={toneByStatus[column.key]}>{rows.length}개</StatusPill>
              </div>

              <div className="space-y-2">
                {rows.map(item => (
                  <article
                    key={item.id}
                    draggable
                    onDragStart={event => {
                      setDraggedId(item.id);
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", item.id);
                    }}
                    onDragEnd={() => {
                      setDraggedId(null);
                      setDropTarget(null);
                    }}
                    className={`cursor-grab rounded-2xl border border-border bg-background/80 p-3 transition-all active:cursor-grabbing ${
                      draggedId === item.id ? "scale-[0.98] opacity-50" : ""
                    }`}
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      <StatusPill tone={item.source === "학원" ? "warning" : item.source === "상담사" ? "success" : "primary"}>{item.source}</StatusPill>
                      <StatusPill>{item.subject}</StatusPill>
                    </div>
                    <p className="text-sm font-bold text-foreground">{item.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.teacher} · 마감 {item.due_date}</p>
                    {item.notes && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.notes}</p>}
                  </article>
                ))}
                {!rows.length && (
                  <div className="rounded-2xl border border-dashed border-border p-5 text-center">
                    <ClipboardCheck className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">아직 이 상태의 과제가 없습니다</p>
                  </div>
                )}
              </div>
            </SectionCard>
          );
        })}
      </div>
    </div>
  );
}

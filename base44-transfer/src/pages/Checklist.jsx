import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { PageHeader, SectionCard, StatusPill } from "@/components/admission/Cards";
import { ROADMAP_SEED } from "@/components/admission/data";
import { createEntity, getCurrentUser, listForUser, updateEntity } from "@/components/admission/base44";

const statusTone = {
  "예정": "muted",
  "진행중": "primary",
  "완료": "success",
  "긴급": "danger",
};

export default function Checklist() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);

  async function load() {
    const me = await getCurrentUser();
    setUser(me);
    let rows = await listForUser("RoadmapTask", me, "month");
    if (rows.length === 0) {
      await Promise.all(ROADMAP_SEED.map(task => createEntity("RoadmapTask", { ...task, student_user_id: me?.id })));
      rows = await listForUser("RoadmapTask", me, "month");
    }
    setTasks(rows);
  }

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => {
    return tasks
      .slice()
      .sort((a, b) => `${a.month || ""}${a.due_date || ""}`.localeCompare(`${b.month || ""}${b.due_date || ""}`))
      .reduce((map, task) => {
        const key = task.month || "미정";
        if (!map[key]) map[key] = [];
        map[key].push(task);
        return map;
      }, {});
  }, [tasks]);

  const completed = tasks.filter(task => task.status === "완료").length;
  const urgent = tasks.filter(task => task.status === "긴급");
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const timelineGroups = useMemo(() => {
    const stages = ["기초 세팅", "자료 준비", "서류 초안", "지원 확정"];
    return Object.entries(grouped).map(([month, rows], index) => {
      const done = rows.filter(task => task.status === "완료").length;
      return {
        month,
        rows,
        done,
        stage: stages[index] || "준비 단계",
      };
    });
  }, [grouped]);
  const activeGroupIndex = Math.max(0, timelineGroups.findIndex(group => group.done < group.rows.length));
  const nextTask = timelineGroups.flatMap(group => group.rows).find(task => task.status !== "완료");

  async function toggleTask(task) {
    const status = task.status === "완료" ? "예정" : "완료";
    await updateEntity("RoadmapTask", task.id, { status });
    await load();
  }

  return (
    <div>
      <PageHeader title="로드맵" subtitle="월별 입시 준비 항목을 확인하고 완료 상태를 업데이트하세요" />

      <SectionCard className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-3xl bg-card/80 p-5 max-sm:grid-cols-1">
        <div>
          <div className="mb-2 inline-flex rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary">입시 로드맵</div>
          <h2 className="text-lg font-bold text-foreground">
            {nextTask ? `다음 미션: ${nextTask.title}` : "모든 미션을 완료했어요"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            {nextTask ? `${nextTask.month || "미정"} · ${nextTask.description || "다음 준비 항목을 완료하세요."}` : "상담 전 필요한 준비가 모두 정리되었습니다."}
          </p>
          {urgent.length > 0 && (
            <div className="mt-2 flex items-center gap-2 text-xs font-bold text-accent">
              <AlertCircle className="w-3.5 h-3.5" />
              긴급 항목 {urgent.length}개가 남아있어요
            </div>
          )}
        </div>
        <div
          className="relative grid h-24 w-24 place-items-center rounded-full shadow-sm"
          style={{ background: `conic-gradient(#0ea5e9 ${progress * 3.6}deg, rgba(229, 231, 235, 0.88) 0deg)` }}
        >
          <div className="absolute inset-2 rounded-full bg-card" />
          <div className="relative text-center">
            <div className="text-xl font-bold text-primary">{progress}%</div>
            <div className="mt-1 text-[11px] font-bold text-muted-foreground">{completed}/{tasks.length} 완료</div>
          </div>
        </div>
      </SectionCard>

      <div className="relative ml-5 space-y-4 before:absolute before:left-0 before:top-6 before:bottom-6 before:w-[3px] before:rounded-full before:bg-gradient-to-b before:from-primary before:via-primary/20 before:to-accent/50">
        {timelineGroups.map((group, groupIndex) => {
          const hasUrgent = group.rows.some(task => task.status === "긴급");
          const [year, monthNumber] = group.month.split("-");
          const state = group.done === group.rows.length ? "done" : groupIndex === activeGroupIndex ? "active" : "upcoming";

          return (
            <div key={group.month} className="relative pl-8">
              <div className={`absolute left-[-15px] top-5 grid h-8 w-8 place-items-center rounded-full border-2 text-xs font-black shadow-sm ${
                state === "done"
                  ? "border-accent/30 bg-accent text-white"
                  : state === "active"
                    ? "border-primary/30 bg-primary text-white"
                    : "border-border bg-card text-muted-foreground"
              }`}>
                {state === "done" ? <CheckCircle2 className="h-4 w-4" /> : groupIndex + 1}
              </div>

              <SectionCard className={`overflow-hidden rounded-3xl p-4 ${state === "active" ? "border-primary/40 shadow-sm" : ""} ${hasUrgent ? "border-accent/40" : ""}`}>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-foreground">{year}년 {Number(monthNumber)}월</h2>
                    <p className="mt-0.5 text-xs font-semibold text-muted-foreground">{group.stage}</p>
                  </div>
                  <StatusPill tone={state === "done" ? "success" : state === "active" ? "primary" : "muted"}>{group.done}/{group.rows.length}</StatusPill>
                </div>

                <div className="space-y-2">
                  {group.rows.map((task, taskIndex) => {
                    const doneTask = task.status === "완료";
                    const isNext = nextTask?.id === task.id;
                    const tone = doneTask ? "success" : task.status === "긴급" ? "warning" : isNext ? "primary" : "muted";
                    const label = doneTask ? "완료" : task.status === "긴급" ? "긴급" : isNext ? "다음" : "예정";
                    return (
                      <button key={task.id} type="button" onClick={() => toggleTask(task)} className={`grid w-full grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-3 text-left transition-all hover:border-primary/50 hover:bg-background ${
                        doneTask
                          ? "border-accent/20 bg-accent/5"
                          : task.status === "긴급"
                            ? "border-accent/30 bg-accent/10"
                            : isNext
                              ? "border-primary/40 bg-primary/5"
                              : "border-border bg-background/80"
                      }`}>
                        <span className={`grid h-8 w-8 place-items-center rounded-xl text-xs font-black ${
                          doneTask ? "bg-accent text-white" : task.status === "긴급" ? "bg-accent text-white" : isNext ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                        }`}>
                          {doneTask ? <CheckCircle2 className="h-4 w-4" /> : task.status === "긴급" ? "!" : taskIndex + 1}
                        </span>
                        <div className="min-w-0">
                          <p className={`text-sm font-bold ${doneTask ? "text-muted-foreground line-through" : "text-foreground"}`}>{task.title}</p>
                          {task.description && <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{task.description}</p>}
                          {task.due_date && <p className="mt-1 text-[11px] text-muted-foreground">마감 {task.due_date}</p>}
                        </div>
                        <StatusPill tone={tone}>{label}</StatusPill>
                      </button>
                    );
                  })}
                </div>
              </SectionCard>
            </div>
          );
        })}
      </div>
    </div>
  );
}

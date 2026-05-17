import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowRight, BarChart3, CalendarDays, CheckSquare, ClipboardCheck, FileText, GraduationCap } from "lucide-react";
import { EmptyState, PageHeader, ProgressBar, SectionCard, StatCard, StatusPill } from "@/components/admission/Cards";
import { averageCoreGrade } from "@/components/admission/data";
import { getCurrentUser, listForUser, upsertStudentProfile } from "@/components/admission/base44";

export default function Index() {
  const [user, setUser] = useState(null);
  const [targets, setTargets] = useState([]);
  const [grades, setGrades] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [meetings, setMeetings] = useState([]);

  useEffect(() => {
    async function load() {
      const me = await getCurrentUser();
      setUser(me);

      const [targetRows, gradeRows, taskRows, meetingRows] = await Promise.all([
        listForUser("TargetUniversity", me),
        listForUser("Grade", me),
        listForUser("RoadmapTask", me, "month"),
        listForUser("CounselorMeeting", me, "date"),
      ]);

      setTargets(targetRows);
      setGrades(gradeRows);
      setTasks(taskRows);
      setMeetings(meetingRows);

      await upsertStudentProfile(me, {
        core_avg: averageCoreGrade(gradeRows),
        target_count: targetRows.length,
      });
    }

    load();
  }, []);

  const avg = useMemo(() => averageCoreGrade(grades), [grades]);
  const completed = tasks.filter(task => task.status === "완료").length;
  const urgent = tasks.filter(task => task.status === "긴급");
  const upcomingMeeting = meetings
    .filter(item => ["요청됨", "컨펌됨", "예약됨"].includes(item.status))
    .sort((a, b) => `${a.date || ""}${a.time_slot || ""}`.localeCompare(`${b.date || ""}${b.time_slot || ""}`))[0];
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  return (
    <div>
      <PageHeader
        title={`${user?.full_name || user?.name || "학생"}님의 입시 로드`}
        subtitle="오늘 필요한 준비 항목과 상담 일정을 한눈에 확인하세요"
      />

      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard label="목표대학" value={`${targets.length}개`} hint="상향/적정/안정 균형" icon={GraduationCap} />
        <StatCard label="국수영 평균" value={avg ? `${avg.toFixed(1)}등급` : "미입력"} hint="성적표 기준" icon={BarChart3} />
        <StatCard label="로드맵" value={`${completed}/${tasks.length || 0}`} hint={`${progress}% 완료`} icon={CheckSquare} />
        <StatCard label="상담" value={upcomingMeeting ? upcomingMeeting.status : "예약 전"} hint={upcomingMeeting ? `${upcomingMeeting.date} ${upcomingMeeting.time_slot}` : "선생님과 예약"} icon={CalendarDays} />
      </div>

      <SectionCard className="p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-foreground">이번 달 진행률</h2>
            <p className="text-xs text-muted-foreground mt-0.5">진행 중인 대입 준비 항목</p>
          </div>
          <span className="text-sm font-bold text-primary">{progress}%</span>
        </div>
        <ProgressBar value={progress} />
        {urgent.length > 0 && (
          <div className="mt-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-destructive">
              <AlertCircle className="w-3.5 h-3.5" />
              긴급 항목 {urgent.length}개를 먼저 확인하세요
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard className="overflow-hidden mb-5">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">빠른 이동</h2>
          <span className="text-xs text-muted-foreground">앱 흐름</span>
        </div>
        {[
          { to: "/universities", icon: GraduationCap, title: "목표대학 정리", body: "관심 대학과 전형 적합도를 확인합니다." },
          { to: "/grades", icon: BarChart3, title: "성적표 입력", body: "학기별 등급을 입력하고 추이를 봅니다." },
          { to: "/record", icon: FileText, title: "생활기록부", body: "활동 기록과 상담 준비 자료를 따로 관리합니다." },
          { to: "/checklist", icon: CheckSquare, title: "로드맵", body: "월별 입시 준비 상태를 업데이트합니다." },
          { to: "/assignments", icon: ClipboardCheck, title: "과제 점검", body: "학교·학원 과제를 상태별로 확인합니다." },
          { to: "/counseling", icon: CalendarDays, title: "상담 예약", body: "희망 날짜와 시간을 선택해 신청합니다." },
        ].map(({ to, icon: Icon, title, body }) => (
          <Link key={to} to={to} className="flex items-center justify-between gap-3 p-4 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{body}</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        ))}
      </SectionCard>

      <SectionCard className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground">다음 상담</h2>
          {upcomingMeeting && <StatusPill tone={upcomingMeeting.status === "컨펌됨" ? "success" : "warning"}>{upcomingMeeting.status}</StatusPill>}
        </div>
        {upcomingMeeting ? (
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex flex-col items-center justify-center text-primary flex-shrink-0">
              <span className="text-[10px] font-semibold leading-none">{String(upcomingMeeting.date || "").slice(5).replace("-", "/")}</span>
              <span className="text-xs font-bold mt-0.5">{upcomingMeeting.time_slot}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{upcomingMeeting.topic}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{upcomingMeeting.notes || "전달 내용 없음"}</p>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={FileText}
            title="예정된 상담이 없습니다"
            body="상담 탭에서 날짜와 시간을 선택해 예약하세요."
            action={<Link to="/counseling" className="inline-flex h-9 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">상담 예약하기</Link>}
          />
        )}
      </SectionCard>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { Inbox, Mail, Search } from "lucide-react";
import { EmptyState, PageHeader, PrimaryButton, SectionCard, StatCard, StatusPill } from "@/components/admission/Cards";
import { getCurrentUser, listEntity, updateEntity } from "@/components/admission/base44";

const statusTone = {
  "요청됨": "warning",
  "컨펌됨": "success",
  "이메일발송": "primary",
  "완료": "success",
  "취소됨": "muted",
};

export default function CounselorRequests() {
  const [user, setUser] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("요청됨");

  async function load() {
    const me = await getCurrentUser();
    setUser(me);
    setMeetings(await listEntity("CounselorMeeting", "-created_date"));
  }

  useEffect(() => {
    load();
  }, []);

  const pending = meetings.filter(item => item.status === "요청됨");
  const confirmed = meetings.filter(item => ["컨펌됨", "이메일발송"].includes(item.status));
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return meetings.filter(item => {
      const statusMatch = statusFilter === "all" || item.status === statusFilter;
      const queryMatch = !q
        || item.student_name?.toLowerCase().includes(q)
        || item.student_email?.toLowerCase().includes(q)
        || item.student_high_school?.toLowerCase().includes(q)
        || item.student_preferred_major?.toLowerCase().includes(q)
        || item.topic?.toLowerCase().includes(q)
        || item.notes?.toLowerCase().includes(q);
      return statusMatch && queryMatch;
    });
  }, [meetings, query, statusFilter]);

  async function confirmAndEmail(meeting) {
    const now = new Date().toISOString();
    await updateEntity("CounselorMeeting", meeting.id, {
      status: "컨펌됨",
      confirmed_at: meeting.confirmed_at || now,
      email_sent_at: now,
      counselor_name: user?.full_name || user?.name || meeting.counselor_name || "",
    });

    const subject = "[입시로드] 상담 일정 확정 안내";
    const body = `${meeting.student_name || "학생"} 학생 안녕하세요.

상담 신청이 확정되었습니다.

- 상담 주제: ${meeting.topic}
- 상담 일시: ${meeting.date} ${meeting.time_slot}
- 담당 상담사: ${user?.full_name || user?.name || meeting.counselor_name || ""}

상담 전 목표 대학, 성적표, 생활기록부 자료를 확인해 주세요.

감사합니다.`;

    window.location.href = `mailto:${meeting.student_email || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    await load();
  }

  return (
    <div>
      <PageHeader title="상담 신청" subtitle="학생 상담 신청을 확인하고 확정 이메일을 작성합니다" />

      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard label="전체" value={`${meetings.length}건`} icon={Inbox} />
        <StatCard label="대기" value={`${pending.length}건`} />
        <StatCard label="확정" value={`${confirmed.length}건`} />
      </div>

      <SectionCard className="p-4 mb-4">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="학생명, 학교, 학과, 상담 주제 검색"
            className="h-11 w-full rounded-2xl border border-border bg-background pl-10 pr-4 text-sm outline-none focus:border-primary"
          />
        </div>
        <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm">
          <option value="요청됨">대기</option>
          <option value="컨펌됨">확정</option>
          <option value="완료">완료</option>
          <option value="취소됨">취소</option>
          <option value="all">전체</option>
        </select>
      </SectionCard>

      <div className="space-y-3">
        {filtered.map(meeting => (
          <SectionCard key={meeting.id} className="p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-sm font-bold text-foreground">{meeting.student_name || "학생"} · {meeting.topic}</p>
                <p className="text-xs text-muted-foreground mt-1">{meeting.student_high_school || "학교 미입력"} · {meeting.student_preferred_major || "학과 미입력"} · {meeting.student_grade_level || "학년 미입력"} {meeting.student_class_name || ""}</p>
                <p className="text-xs text-muted-foreground mt-1">{meeting.date} {meeting.time_slot} · {meeting.student_email}</p>
              </div>
              <StatusPill tone={statusTone[meeting.status]}>{meeting.status}</StatusPill>
            </div>
            {meeting.notes && <p className="text-sm text-muted-foreground leading-relaxed mb-3">{meeting.notes}</p>}
            {meeting.email_sent_at && <p className="text-[11px] text-muted-foreground mb-3">이메일 작성: {new Date(meeting.email_sent_at).toLocaleString("ko-KR")}</p>}
            <div className="flex justify-end">
              <PrimaryButton className="h-9 px-3 text-xs gap-1.5" onClick={() => confirmAndEmail(meeting)}>
                <Mail className="w-3.5 h-3.5" />
                {meeting.status === "요청됨" ? "컨펌하고 이메일 작성" : "이메일 다시 작성"}
              </PrimaryButton>
            </div>
          </SectionCard>
        ))}

        {!filtered.length && (
          <EmptyState icon={Inbox} title="조건에 맞는 상담 신청이 없습니다" body="학생이 상담을 예약하면 이 페이지에 신청 내역이 표시됩니다." />
        )}
      </div>
    </div>
  );
}

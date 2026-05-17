import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { EmptyState, IconButton, PageHeader, PrimaryButton, SectionCard, StatusPill } from "@/components/admission/Cards";
import { CONSULT_TOPICS, TIME_SLOTS } from "@/components/admission/data";
import { addDays, formatDate, formatWeekMonth, getWeekday, parseDateValue, todayValue } from "@/components/admission/date";
import { createEntity, getCurrentUser, listForUser, updateEntity, upsertStudentProfile } from "@/components/admission/base44";

const meetingTone = {
  "요청됨": "warning",
  "컨펌됨": "success",
  "예약됨": "primary",
  "완료": "success",
  "취소됨": "muted",
  "이메일발송": "primary",
};

export default function Counseling() {
  const [user, setUser] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [weekStart, setWeekStart] = useState(todayValue());
  const [selectedDate, setSelectedDate] = useState(todayValue());
  const [timeSlot, setTimeSlot] = useState("");
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [showForm, setShowForm] = useState(true);

  async function load() {
    const me = await getCurrentUser();
    setUser(me);
    setMeetings(await listForUser("CounselorMeeting", me, "date"));
    await upsertStudentProfile(me);
  }

  useEffect(() => {
    load();
  }, []);

  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const bookedTimes = meetings
    .filter(item => item.date === selectedDate && !["취소됨", "완료"].includes(item.status))
    .map(item => item.time_slot);
  const upcoming = meetings
    .filter(item => !["취소됨", "완료"].includes(item.status))
    .sort((a, b) => `${a.date || ""}${a.time_slot || ""}`.localeCompare(`${b.date || ""}${b.time_slot || ""}`));
  const past = meetings.filter(item => ["취소됨", "완료"].includes(item.status));
  const canSubmit = selectedDate && timeSlot && topic;

  async function submitMeeting() {
    if (!canSubmit) return;
    await createEntity("CounselorMeeting", {
      date: selectedDate,
      time_slot: timeSlot,
      topic,
      notes,
      status: "요청됨",
      student_user_id: user?.id,
      student_name: user?.full_name || user?.name || "학생",
      student_email: user?.email || "",
      student_high_school: user?.school || user?.high_school || "",
      student_preferred_major: user?.preferred_major || user?.preferredMajor || user?.major || user?.department || "",
      student_grade_level: user?.grade_level || user?.gradeLevel || "",
      student_class_name: user?.class_name || user?.className || "",
      counselor_name: user?.counselor || "",
    });
    setTimeSlot("");
    setTopic("");
    setNotes("");
    setShowForm(false);
    await load();
  }

  async function cancelMeeting(meeting) {
    await updateEntity("CounselorMeeting", meeting.id, { status: "취소됨" });
    await load();
  }

  function shiftWeek(days) {
    const next = addDays(weekStart, days);
    setWeekStart(next);
    setSelectedDate(next);
    setTimeSlot("");
  }

  return (
    <div>
      <PageHeader
        title="상담 예약"
        subtitle="담당 선생님과 상담을 예약하세요"
        action={
          <PrimaryButton className="h-10 px-3.5 gap-1.5 text-sm" onClick={() => setShowForm(prev => !prev)}>
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "닫기" : "예약하기"}
          </PrimaryButton>
        }
      />

      {showForm && (
        <SectionCard className="p-4 mb-5 max-w-xl mx-auto rounded-3xl">
          <div className="flex items-center justify-between mb-3">
            <IconButton className="w-8 h-8" onClick={() => shiftWeek(-7)}>
              <ChevronLeft className="w-4 h-4" />
            </IconButton>
            <div className="text-sm font-bold text-foreground">{formatWeekMonth(weekStart)}</div>
            <IconButton className="w-8 h-8" onClick={() => shiftWeek(7)}>
              <ChevronRight className="w-4 h-4" />
            </IconButton>
          </div>

          <div className="grid grid-cols-7 gap-1.5 mb-4">
            {days.map(dateValue => {
              const active = dateValue === selectedDate;
              const date = parseDateValue(dateValue);
              const disabled = dateValue < todayValue();
              return (
                <button
                  key={dateValue}
                  disabled={disabled}
                  type="button"
                  onClick={() => { setSelectedDate(dateValue); setTimeSlot(""); }}
                  className={`flex min-h-[52px] flex-col items-center justify-center rounded-xl text-[11px] transition-all ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : disabled
                        ? "text-muted-foreground opacity-35"
                        : "text-foreground hover:bg-muted"
                  }`}
                >
                  <span className="font-semibold">{getWeekday(dateValue)}</span>
                  <span className="mt-0.5 text-base font-bold">{date.getDate()}</span>
                </button>
              );
            })}
          </div>

          <p className="text-sm font-bold text-muted-foreground mb-2">시간 선택 - {formatDate(selectedDate)}</p>
          <div className="grid grid-cols-4 gap-2 mb-4 max-sm:grid-cols-2">
            {TIME_SLOTS.map(slot => {
              const booked = bookedTimes.includes(slot);
              const active = timeSlot === slot;
              return (
                <button
                  key={slot}
                  type="button"
                  disabled={booked}
                  onClick={() => setTimeSlot(slot)}
                  className={`h-10 rounded-xl border text-sm font-semibold transition-all ${
                    booked
                      ? "border-transparent bg-muted text-muted-foreground opacity-45"
                      : active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:border-primary"
                  }`}
                >
                  {slot}
                </button>
              );
            })}
          </div>

          <select value={topic} onChange={event => setTopic(event.target.value)} className="mb-3 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold outline-none focus:border-primary">
            <option value="">상담 주제 선택</option>
            {CONSULT_TOPICS.map(item => <option key={item} value={item}>{item}</option>)}
          </select>

          <textarea
            value={notes}
            onChange={event => setNotes(event.target.value)}
            placeholder="선생님께 미리 전달할 내용을 입력하세요 (선택)"
            className="mb-3 min-h-[86px] w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
          />

          <PrimaryButton className="h-11 w-full text-sm" disabled={!canSubmit} onClick={submitMeeting}>
            {timeSlot ? `${formatDate(selectedDate)} ${timeSlot} 예약하기` : "시간을 선택하세요"}
          </PrimaryButton>
        </SectionCard>
      )}

      <MeetingList title={`예정된 상담 (${upcoming.length})`} meetings={upcoming} onCancel={cancelMeeting} />
      {past.length > 0 && <MeetingList title="지난 상담" meetings={past} />}
      {meetings.length === 0 && !showForm && <EmptyState icon={CalendarDays} title="아직 예약된 상담이 없습니다" body="예약하기 버튼을 눌러 첫 상담 일정을 선택하세요." />}
    </div>
  );
}

function MeetingList({ title, meetings, onCancel }) {
  if (!meetings?.length) return null;

  return (
    <div className="mb-5">
      <h2 className="text-sm font-bold text-foreground mb-3">{title}</h2>
      <div className="space-y-3">
        {meetings.map(meeting => (
          <SectionCard key={meeting.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-semibold leading-none">{String(meeting.date || "").slice(5).replace("-", "/")}</span>
                  <span className="text-xs font-bold mt-0.5">{meeting.time_slot}</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{meeting.topic}</p>
                  {meeting.notes && <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{meeting.notes}</p>}
                </div>
              </div>
              <StatusPill tone={meetingTone[meeting.status]}>{meeting.status}</StatusPill>
            </div>
            {onCancel && meeting.status !== "취소됨" && (
              <div className="flex justify-end mt-3">
                <button type="button" onClick={() => onCancel(meeting)} className="h-8 rounded-xl border border-border px-3 text-xs font-semibold text-muted-foreground">
                  취소
                </button>
              </div>
            )}
          </SectionCard>
        ))}
      </div>
    </div>
  );
}

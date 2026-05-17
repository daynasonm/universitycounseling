import React, { useEffect, useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3 } from "lucide-react";
import { EmptyState, PageHeader, SectionCard, StatCard } from "@/components/admission/Cards";
import { averageCoreGrade, gradeMatrix, SEMESTERS, SUBJECT_COLORS, SUBJECTS } from "@/components/admission/data";
import { createEntity, getCurrentUser, listForUser, updateEntity, upsertStudentProfile } from "@/components/admission/base44";

export default function Grades() {
  const [user, setUser] = useState(null);
  const [grades, setGrades] = useState([]);
  const matrix = useMemo(() => gradeMatrix(grades), [grades]);
  const avg = useMemo(() => averageCoreGrade(grades), [grades]);

  async function load() {
    const me = await getCurrentUser();
    setUser(me);
    const gradeRows = await listForUser("Grade", me);
    setGrades(gradeRows);
    await upsertStudentProfile(me, { core_avg: averageCoreGrade(gradeRows) });
  }

  useEffect(() => {
    load();
  }, []);

  async function saveGrade(subject, semester, value) {
    const numeric = Number(value);
    const key = `${subject}-${semester}`;
    const existing = matrix[key];
    const payload = {
      student_user_id: user?.id,
      subject,
      semester,
      grade: Number.isFinite(numeric) ? Math.min(9, Math.max(1, numeric)) : null,
    };

    if (!payload.grade) return;
    if (existing?.id) await updateEntity("Grade", existing.id, payload);
    else await createEntity("Grade", payload);
    await load();
  }

  const chartData = SEMESTERS.map(semester => {
    const row = { semester };
    SUBJECTS.forEach(subject => {
      const grade = matrix[`${subject}-${semester}`]?.grade;
      if (grade) row[subject] = Number(grade);
    });
    return row;
  });
  const hasGrades = chartData.some(row => Object.keys(row).length > 1);

  return (
    <div>
      <PageHeader title="성적표" subtitle="석차등급을 입력하면 목표 대학 적합도와 상담 자료에 자동 반영됩니다" />

      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard label="국수영 평균" value={avg ? `${avg.toFixed(1)}등급` : "미입력"} icon={BarChart3} />
        <StatCard label="입력 과목" value={`${grades.length}개`} hint="학기별 과목 수" />
      </div>

      <SectionCard className="overflow-hidden mb-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="p-3 text-left text-xs font-semibold text-muted-foreground">과목</th>
                {SEMESTERS.map(semester => <th key={semester} className="p-3 text-center text-xs font-semibold text-muted-foreground">{semester}</th>)}
              </tr>
            </thead>
            <tbody>
              {SUBJECTS.map(subject => (
                <tr key={subject} className="border-b border-border last:border-b-0">
                  <td className="p-3 text-sm font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      {SUBJECT_COLORS[subject] && <span className="w-2 h-2 rounded-full" style={{ background: SUBJECT_COLORS[subject] }} />}
                      {subject}
                    </div>
                  </td>
                  {SEMESTERS.map(semester => (
                    <td key={semester} className="p-2 text-center">
                      <input
                        type="number"
                        min="1"
                        max="9"
                        step="0.1"
                        defaultValue={matrix[`${subject}-${semester}`]?.grade || ""}
                        onBlur={event => saveGrade(subject, semester, event.target.value)}
                        placeholder="-"
                        className="h-9 w-14 rounded-xl border border-border bg-background text-center text-sm outline-none focus:border-primary"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard className="p-4">
        <h2 className="text-sm font-bold text-foreground mb-3">등급 추이</h2>
        {hasGrades ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
              <XAxis dataKey="semester" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis domain={[1, 9]} reversed tickCount={9} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip formatter={(value, name) => [`${value}등급`, name]} />
              {Object.entries(SUBJECT_COLORS).map(([subject, color]) => (
                <Line key={subject} type="monotone" dataKey={subject} stroke={color} strokeWidth={2.4} dot={{ r: 3 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState icon={BarChart3} title="성적을 입력하면 그래프가 나타납니다" body="국어, 수학, 영어부터 입력하면 목표 대학 분석이 더 정확해집니다." />
        )}
      </SectionCard>
    </div>
  );
}

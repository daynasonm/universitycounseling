import React, { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { PageHeader, PrimaryButton, ProgressBar, SectionCard, StatusPill } from "@/components/admission/Cards";
import {
  DEPARTMENT_FILTERS,
  RANK_FILTERS,
  UNIVERSITIES,
  UNIVERSITY_REGIONS,
  averageCoreGrade,
  admissionTrackLabels,
  departmentFilterMatches,
  getLastYearAdmissionStats,
  loadCareerNetUniversities,
  matchForGrade,
  mergeUniversityCatalog,
  rankScore,
  tracksForTab,
} from "@/components/admission/data";
import { createEntity, getCurrentUser, listForUser, updateEntity, upsertStudentProfile } from "@/components/admission/base44";

export default function Universities() {
  const [user, setUser] = useState(null);
  const [targets, setTargets] = useState([]);
  const [grades, setGrades] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [trackTab, setTrackTab] = useState("수시");
  const [apiUniversities, setApiUniversities] = useState([]);
  const [apiStatus, setApiStatus] = useState("fallback");
  const [regionFilter, setRegionFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [rankFilter, setRankFilter] = useState("overall");

  async function load() {
    const me = await getCurrentUser();
    setUser(me);
    const [targetRows, gradeRows] = await Promise.all([
      listForUser("TargetUniversity", me),
      listForUser("Grade", me),
    ]);
    setTargets(targetRows);
    setGrades(gradeRows);
    await upsertStudentProfile(me, { target_count: targetRows.length, core_avg: averageCoreGrade(gradeRows) });
  }

  useEffect(() => {
    load();
    let cancelled = false;
    loadCareerNetUniversities()
      .then(rows => {
        if (cancelled) return;
        if (rows.length) {
          setApiUniversities(rows);
          setApiStatus("careernet");
        }
      })
      .catch(() => {
        if (!cancelled) setApiStatus("fallback");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const avg = useMemo(() => averageCoreGrade(grades), [grades]);
  const universityCatalog = useMemo(() => mergeUniversityCatalog([...UNIVERSITIES, ...apiUniversities]), [apiUniversities]);
  const activeFilters = regionFilter !== "all" || departmentFilter !== "all" || rankFilter !== "overall";
  const filtered = useMemo(() => universityCatalog
    .filter(item => {
      const q = query.trim().toLowerCase();
      const searchable = `${item.name} ${item.short} ${item.region} ${item.type} ${(item.departments || []).join(" ")}`.toLowerCase();
      return (!q || searchable.includes(q))
        && (regionFilter === "all" || item.region === regionFilter)
        && departmentFilterMatches(item, departmentFilter);
    })
    .sort((a, b) => rankScore(a, rankFilter, departmentFilter) - rankScore(b, rankFilter, departmentFilter) || a.name.localeCompare(b.name, "ko"))
    .slice(0, query.trim() || activeFilters ? 160 : 0), [activeFilters, departmentFilter, query, rankFilter, regionFilter, universityCatalog]);
  const selectedUniversity = selected || (targets[0] && universityCatalog.find(item => item.id === targets[0].university_id));
  const selectedTarget = selectedUniversity ? targets.find(item => item.university_id === selectedUniversity.id || item.university_name === selectedUniversity.name) : null;
  const match = selectedUniversity ? matchForGrade(selectedUniversity, avg) : null;
  const addedIds = new Set(targets.map(item => item.university_id || item.university_name));
  const selectedDepartment = selectedUniversity ? (selectedTarget?.department || selectedUniversity.departments?.[0] || "") : "";
  const admissionStats = useMemo(
    () => selectedUniversity ? getLastYearAdmissionStats(selectedUniversity, selectedDepartment) : null,
    [selectedUniversity, selectedDepartment],
  );
  const departmentStats = useMemo(
    () => selectedUniversity ? selectedUniversity.departments.map(department => getLastYearAdmissionStats(selectedUniversity, department)) : [],
    [selectedUniversity],
  );

  async function addTarget(university) {
    await createEntity("TargetUniversity", {
      student_user_id: user?.id,
      university_id: university.id,
      university_name: university.name,
      short_name: university.short,
      region: university.region,
      school_type: university.type,
      tier: university.tier,
      admission_type: "수시",
      match_label: matchForGrade(university, avg)?.label || "미분석",
    });
    setQuery("");
    setSelected(university);
    await load();
  }

  async function updateDepartment(value) {
    if (!selectedTarget?.id) return;
    await updateEntity("TargetUniversity", selectedTarget.id, { department: value });
    await load();
  }

  return (
    <div>
      <PageHeader title="목표대학" subtitle="관심 대학을 추가하고 현재 성적 기준 적합도를 확인하세요" />

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="서울대, 컴퓨터공학, 서울..."
          className="h-11 w-full rounded-2xl border border-border bg-card pl-10 pr-4 text-sm outline-none focus:border-primary"
        />
      </div>
      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <select value={regionFilter} onChange={event => setRegionFilter(event.target.value)} className="h-10 rounded-xl border border-border bg-card px-3 text-sm">
          <option value="all">전국</option>
          {UNIVERSITY_REGIONS.map(region => <option key={region} value={region}>{region}</option>)}
        </select>
        <select value={departmentFilter} onChange={event => setDepartmentFilter(event.target.value)} className="h-10 rounded-xl border border-border bg-card px-3 text-sm">
          {DEPARTMENT_FILTERS.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
        </select>
        <select value={rankFilter} onChange={event => setRankFilter(event.target.value)} className="h-10 rounded-xl border border-border bg-card px-3 text-sm">
          {RANK_FILTERS.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
        </select>
      </div>
      {(query || activeFilters) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{filtered.length}개 표시 · 전체 {universityCatalog.length}개 대학 데이터</span>
          <span>{apiStatus === "careernet" ? "커리어넷 API 연결됨" : "내장 전국 데이터 사용 중"}</span>
        </div>
      )}

      {(query || activeFilters) && filtered.length > 0 && (
        <SectionCard className="overflow-hidden mb-5">
          {filtered.map(university => {
            const alreadyAdded = addedIds.has(university.id) || addedIds.has(university.name);
            return (
              <div
                key={university.id}
                onClick={() => setSelected(university)}
                className="w-full flex items-center gap-3 p-4 border-b border-border last:border-b-0 text-left hover:bg-muted/50"
                role="button"
                tabIndex={0}
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: university.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{university.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{university.region} · {university.type} · {university.tier}</p>
                </div>
                <PrimaryButton className="h-8 px-3 text-xs gap-1" disabled={alreadyAdded} onClick={event => { event.stopPropagation(); addTarget(university); }}>
                  <Plus className="w-3.5 h-3.5" />
                  {alreadyAdded ? "추가됨" : "추가"}
                </PrimaryButton>
              </div>
            );
          })}
        </SectionCard>
      )}

      {selectedUniversity ? (
        <div className="space-y-4">
          <SectionCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-sm font-bold" style={{ background: selectedUniversity.color }}>
                {selectedUniversity.short.slice(0, 3)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-foreground">{selectedUniversity.name}</h2>
                  <StatusPill>{selectedUniversity.region}</StatusPill>
                  <StatusPill>{selectedUniversity.type}</StatusPill>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{selectedUniversity.tier}권 대학 · {selectedUniversity.departments.length}개 주요 학과</p>
              </div>
            </div>

            {selectedTarget && (
              <div className="mt-4 pt-4 border-t border-border">
                <label className="text-xs text-muted-foreground font-semibold block mb-2">관심 학과</label>
                <select value={selectedTarget.department || ""} onChange={event => updateDepartment(event.target.value)} className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm">
                  <option value="">학과 선택</option>
                  {selectedUniversity.departments.map(department => <option key={department} value={department}>{department}</option>)}
                </select>
              </div>
            )}
          </SectionCard>

          {avg && match && (
            <SectionCard className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-muted-foreground">내 국수영 평균</p>
                  <p className="text-xl font-bold text-foreground">{avg.toFixed(1)}등급</p>
                </div>
                <StatusPill tone={match.tone}>{match.label}</StatusPill>
              </div>
              <ProgressBar value={match.pct} />
            </SectionCard>
          )}

          {admissionStats && (
            <SectionCard className="p-4">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-muted-foreground">{admissionStats.year} 수시 합격 통계</p>
                  <h2 className="mt-1 text-lg font-black text-foreground">{admissionStats.department}</h2>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{admissionStats.info}</p>
                </div>
                <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-right">
                  <p className="text-[11px] font-semibold text-muted-foreground">전년도 합격권</p>
                  <p className="mt-1 whitespace-nowrap text-base font-black text-foreground">{admissionStats.gradeRange}</p>
                </div>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-2">
                <InfoTile label="합격 평균" value={admissionStats.averageGrade ? `${admissionStats.averageGrade.toFixed(1)}등급` : "-"} />
                <InfoTile label="70% 컷" value={admissionStats.cutGrade ? `${admissionStats.cutGrade.toFixed(1)}등급` : "-"} />
                <InfoTile label="평균 경쟁률" value={`${admissionStats.competition}:1`} />
                <InfoTile label="강한 전형" value={admissionStats.bestTrack} />
              </div>

              <div className="overflow-hidden rounded-2xl border border-border">
                {admissionStats.rows.map(row => (
                  <div key={row.name} className="border-b border-border p-3 last:border-b-0">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-foreground">{row.name}</p>
                        {!!row.labels?.length && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {row.labels.map(label => <StatusPill key={label} tone={label === "일반전형" ? "warning" : "primary"}>{label}</StatusPill>)}
                          </div>
                        )}
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{row.note}</p>
                      </div>
                      <StatusPill tone="primary">{row.competition}:1</StatusPill>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <InfoTile label="평균" value={`${row.average.toFixed(1)}등급`} />
                      <InfoTile label="70% 컷" value={`${row.cut70.toFixed(1)}등급`} />
                      <InfoTile label="최저권" value={`${row.last.toFixed(1)}등급`} />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {departmentStats.length > 0 && (
            <SectionCard className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-foreground">학과별 수시 합격 등급표</h2>
                <span className="text-xs text-muted-foreground">{departmentStats.length}개</span>
              </div>
              <div className="grid gap-2">
                {departmentStats.map(item => (
                  <button
                    key={item.department}
                    type="button"
                    onClick={() => selectedTarget?.id && updateDepartment(item.department)}
                    className={`rounded-2xl border p-3 text-left transition-all ${
                      selectedDepartment === item.department ? "border-primary bg-primary/5" : "border-border bg-background"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-foreground">{item.department}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.field} · {item.gradeRange}</p>
                      </div>
                      <p className="text-base font-black text-primary">{item.averageGrade ? `${item.averageGrade.toFixed(1)}등급` : "-"}</p>
                    </div>
                  </button>
                ))}
              </div>
            </SectionCard>
          )}

          <div className="flex gap-2">
            {["수시", "정시"].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setTrackTab(type)}
                className={`h-9 flex-1 rounded-xl border text-sm font-semibold ${trackTab === type ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border"}`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {tracksForTab(selectedUniversity.tracks, trackTab).map(track => (
              <SectionCard key={track.name} className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{track.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{track.note}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <StatusPill tone={track.type === "수시" ? "primary" : "warning"}>{track.type}</StatusPill>
                    {admissionTrackLabels(track).map(label => <StatusPill key={label} tone={label === "일반전형" ? "warning" : "primary"}>{label}</StatusPill>)}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <InfoTile label="권장 등급" value={track.grade ? `${track.grade}등급` : "수능"} />
                  <InfoTile label="경쟁률" value={`${track.competition}:1`} />
                  <InfoTile label="모집" value={`${track.quota}명`} />
                </div>
              </SectionCard>
            ))}
          </div>
        </div>
      ) : (
        <SectionCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-foreground">내 목표 대학</h2>
            <span className="text-xs text-muted-foreground">{targets.length}개</span>
          </div>
          <div className="space-y-2.5">
            {targets.map(target => (
              <button key={target.id} type="button" onClick={() => setSelected(universityCatalog.find(item => item.id === target.university_id) || null)} className="w-full rounded-xl border border-border bg-background p-3 text-left">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{target.university_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{target.department || "학과 미선택"} · {target.region}</p>
                  </div>
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
            ))}
            {!targets.length && <p className="text-sm text-muted-foreground py-3">검색해서 목표 대학을 추가하세요.</p>}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-xl bg-muted p-3 text-center">
      <div className="text-[10px] text-muted-foreground mb-1">{label}</div>
      <div className="text-sm font-bold text-foreground">{value}</div>
    </div>
  );
}

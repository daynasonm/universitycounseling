import fs from "node:fs/promises";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");
const envPath = path.join(rootDir, ".env.local");
const outputPath = path.join(rootDir, "src/data/careernetDepartments.generated.json");
const apiUrl = "https://www.career.go.kr/cnet/openapi/getOpenApi";
const concurrency = 8;

const asArray = value => Array.isArray(value) ? value : value ? [value] : [];
const stripSchoolKey = name => String(name || "")
  .replace(/\([^)]*\)/g, "")
  .replace(/[\s·ㆍ\-_.]/g, "")
  .trim();
const manualSchoolDepartments = {
  공군사관학교: [
    "항공우주공학",
    "기계공학",
    "전자통신공학",
    "컴퓨터과학",
    "국제관계학",
    "국방경영학",
    "군사학",
  ],
};

async function readLocalEnv() {
  try {
    const text = await fs.readFile(envPath, "utf8");
    return Object.fromEntries(text
      .split(/\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith("#"))
      .map(line => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      }));
  } catch {
    return {};
  }
}

async function careerNetRequest(params) {
  const env = await readLocalEnv();
  const apiKey = process.env.VITE_CAREERNET_API_KEY || env.VITE_CAREERNET_API_KEY;
  if (!apiKey) throw new Error("Missing VITE_CAREERNET_API_KEY");
  const query = new URLSearchParams({
    apiKey,
    svcType: "api",
    contentType: "json",
    ...params,
  });
  const response = await fetch(`${apiUrl}?${query.toString()}`);
  if (!response.ok) throw new Error(`CareerNet request failed: ${response.status}`);
  return response.json();
}

async function loadAllMajors() {
  const all = [];
  let total = 0;
  for (let page = 1; page <= 20; page += 1) {
    const payload = await careerNetRequest({
      svcCode: "MAJOR",
      gubun: "univ_list",
      perPage: "500",
      thisPage: String(page),
    });
    const rows = asArray(payload?.dataSearch?.content);
    if (!rows.length) break;
    total = Number(rows[0]?.totalCount || total || rows.length);
    all.push(...rows.filter(row => row?.majorSeq));
    if (!total || all.length >= total) break;
  }
  return all;
}

async function loadMajorUniversities(major) {
  const payload = await careerNetRequest({
    svcCode: "MAJOR_VIEW",
    gubun: "univ_list",
    majorSeq: String(major.majorSeq),
  });
  const content = asArray(payload?.dataSearch?.content);
  return content.flatMap(detail => {
    const rows = asArray(detail?.university?.content || detail?.university);
    return rows.map(row => ({
      schoolName: row.schoolName || "",
      campusName: row.campus_nm || row.campusName || "",
      majorName: row.majorName || detail.major || major.mClass || "",
    })).filter(row => row.schoolName && row.majorName);
  });
}

function addDepartment(index, key, department, source = "careernet") {
  if (!key || !department) return;
  if (!index[key]) {
    index[key] = {
      status: "ready",
      source,
      departments: [],
    };
  }
  if (index[key].source !== source && !index[key].source.includes(source)) {
    index[key].source = `${index[key].source}+${source}`;
  }
  index[key].departments.push(department);
}

async function main() {
  const majors = await loadAllMajors();
  const departmentIndex = {};
  let completed = 0;

  for (let start = 0; start < majors.length; start += concurrency) {
    const chunk = majors.slice(start, start + concurrency);
    const results = await Promise.all(chunk.map(major => (
      loadMajorUniversities(major).catch(error => {
        console.warn(`Skipped majorSeq ${major.majorSeq}: ${error.message}`);
        return [];
      })
    )));

    results.flat().forEach(row => {
      const schoolKey = stripSchoolKey(row.schoolName);
      const campusKey = stripSchoolKey(`${row.schoolName}${row.campusName}`);
      addDepartment(departmentIndex, schoolKey, row.majorName);
      addDepartment(departmentIndex, campusKey, row.majorName);
    });

    completed += chunk.length;
    if (completed % 40 === 0 || completed >= majors.length) {
      console.log(`CareerNet majors processed: ${completed}/${majors.length}`);
    }
  }

  Object.entries(manualSchoolDepartments).forEach(([schoolName, departments]) => {
    const schoolKey = stripSchoolKey(schoolName);
    departments.forEach(department => addDepartment(departmentIndex, schoolKey, department, "manual"));
  });

  const sorted = Object.fromEntries(Object.entries(departmentIndex)
    .map(([key, value]) => [key, {
      ...value,
      departments: [...new Set(value.departments)].sort((a, b) => a.localeCompare(b, "ko")),
    }])
    .sort(([a], [b]) => a.localeCompare(b, "ko")));

  const payload = {
    _meta: {
      generatedAt: new Date().toISOString(),
      majorCount: majors.length,
      schoolKeyCount: Object.keys(sorted).length,
    },
    ...sorted,
  };

  await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote ${outputPath}`);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});

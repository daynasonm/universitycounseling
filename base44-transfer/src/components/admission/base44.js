import { base44 } from "@/api/base44Client";

export async function getCurrentUser() {
  try {
    return await base44.auth.me();
  } catch {
    return null;
  }
}

export function getEntity(name) {
  return base44?.entities?.[name] || null;
}

export async function listEntity(name, sort = "-created_date", limit, skip) {
  const model = getEntity(name);
  if (!model?.list) return [];
  try {
    return await model.list(sort, limit, skip);
  } catch {
    return [];
  }
}

export async function filterEntity(name, query, sort = "-created_date", limit) {
  const model = getEntity(name);
  if (!model?.filter) return [];
  try {
    return await model.filter(query, sort, limit);
  } catch {
    return [];
  }
}

export async function listForUser(name, user, sort = "-created_date") {
  if (!user?.id) return listEntity(name, sort);

  const filtered = await filterEntity(name, { student_user_id: user.id }, sort);
  if (filtered.length) return filtered;

  const all = await listEntity(name, sort);
  return all.filter(item => !item.student_user_id || item.student_user_id === user.id);
}

export async function createEntity(name, payload) {
  const model = getEntity(name);
  if (!model?.create) return null;
  return model.create(payload);
}

export async function updateEntity(name, id, payload) {
  const model = getEntity(name);
  if (!model?.update || !id) return null;
  return model.update(id, payload);
}

export async function deleteEntity(name, id) {
  const model = getEntity(name);
  if (!model?.delete || !id) return null;
  return model.delete(id);
}

export async function upsertStudentProfile(user, patch = {}) {
  if (!user) return null;

  const existing = await filterEntity("StudentProfile", { user_id: user.id }, "-updated_date", 1);
  const baseProfile = {
    user_id: user.id,
    name: user.full_name || user.name || "학생",
    email: user.email || "",
    high_school: user.school || user.high_school || "",
    preferred_major: user.preferred_major || user.preferredMajor || user.major || user.department || user.target_department || "",
    grade_level: user.grade_level || user.gradeLevel || "고3",
    class_name: user.class_name || user.className || "미배정",
    counselor: user.counselor || "",
    target_track: user.target_type || "수시",
    ...patch,
  };

  if (existing?.[0]?.id) {
    return updateEntity("StudentProfile", existing[0].id, baseProfile);
  }

  return createEntity("StudentProfile", baseProfile);
}

export function isCounselorUser(user) {
  const role = String(user?.role || user?.app_role || user?.user_type || "").toLowerCase();
  return role.includes("counselor") || role.includes("상담");
}

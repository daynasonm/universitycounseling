import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env?.VITE_SUPABASE_URL || "").trim();
const supabaseAnonKey = (import.meta.env?.VITE_SUPABASE_ANON_KEY || "").trim();

export const supabaseEnabled = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = supabaseEnabled
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

const mapAppUser = row => ({
  id: row.id,
  name: row.name || row.email?.split("@")[0] || "사용자",
  email: row.email || "",
  password: "",
  role: row.role || "student",
  gradeLevel: row.grade_level || undefined,
  className: row.class_name || undefined,
  highSchool: row.high_school || undefined,
  preferredMajor: row.preferred_major || undefined,
});

const mapProfile = row => ({
  targets: row.targets || [],
  grades: row.grades || {},
  gibpu: row.gibpu || null,
  fname: row.fname || "",
  essays: row.essays || {},
  checklist: row.checklist || {},
  assignments: row.assignments || [],
});

const mapRequest = row => ({
  id: row.id,
  studentId: row.student_id,
  category: row.category,
  preferredDate: row.preferred_date || "",
  preferredTime: row.preferred_time || "",
  message: row.message || "",
  status: row.status || "pending",
  createdAt: row.created_at,
  confirmedAt: row.confirmed_at || undefined,
  emailSentAt: row.email_sent_at || undefined,
});

const mapJournal = row => ({
  id: row.id,
  studentId: row.student_id,
  studentName: row.student_name || "",
  counselorId: row.counselor_id,
  counselorName: row.counselor_name || "",
  date: row.date,
  topic: row.topic,
  summary: row.summary || "",
  nextSteps: row.next_steps || "",
  createdAt: row.created_at,
});

export const profileToRow = (studentId, profile) => ({
  student_id: studentId,
  targets: profile.targets || [],
  grades: profile.grades || {},
  gibpu: profile.gibpu || null,
  fname: profile.fname || "",
  essays: profile.essays || {},
  checklist: profile.checklist || {},
  assignments: profile.assignments || [],
  updated_at: new Date().toISOString(),
});

const requestToRow = request => ({
  id: request.id,
  student_id: request.studentId,
  category: request.category,
  preferred_date: request.preferredDate || null,
  preferred_time: request.preferredTime || null,
  message: request.message || "",
  status: request.status || "pending",
  created_at: request.createdAt || new Date().toISOString(),
  confirmed_at: request.confirmedAt || null,
  email_sent_at: request.emailSentAt || null,
});

const journalToRow = journal => ({
  id: journal.id,
  student_id: journal.studentId,
  student_name: journal.studentName || "",
  counselor_id: journal.counselorId,
  counselor_name: journal.counselorName || "",
  date: journal.date,
  topic: journal.topic,
  summary: journal.summary || "",
  next_steps: journal.nextSteps || "",
  created_at: journal.createdAt || new Date().toISOString(),
});

const getAuthFallbackUser = session => {
  const meta = session?.user?.user_metadata || {};
  return session?.user ? {
    id: session.user.id,
    name: meta.name || session.user.email?.split("@")[0] || "사용자",
    email: session.user.email || "",
    password: "",
    role: meta.role || "student",
    gradeLevel: meta.grade_level,
    className: meta.class_name,
    highSchool: meta.high_school,
    preferredMajor: meta.preferred_major,
  } : null;
};

export const loadBackendState = async () => {
  if (!supabase) return null;

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const session = sessionData.session;
  if (!session) {
    return { currentUser: null, users: [], profiles: {}, requests: [], journals: [] };
  }

  const { data: userRows, error: usersError } = await supabase
    .from("app_users")
    .select("*")
    .order("created_at", { ascending: true });
  if (usersError) throw usersError;

  const users = (userRows || []).map(mapAppUser);
  const currentUser = users.find(user => user.id === session.user.id) || getAuthFallbackUser(session);

  const { data: profileRows, error: profileError } = await supabase
    .from("student_profiles")
    .select("*")
    .order("updated_at", { ascending: false });
  if (profileError) throw profileError;

  const profiles = {};
  (profileRows || []).forEach(row => {
    profiles[row.student_id] = mapProfile(row);
  });

  const { data: requestRows, error: requestsError } = await supabase
    .from("consultation_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (requestsError) throw requestsError;

  const { data: journalRows, error: journalsError } = await supabase
    .from("counseling_journals")
    .select("*")
    .order("created_at", { ascending: false });
  if (journalsError) throw journalsError;

  return {
    currentUser,
    users,
    profiles,
    requests: (requestRows || []).map(mapRequest),
    journals: (journalRows || []).map(mapJournal),
  };
};

export const signInBackend = async (email, password) => {
  if (!supabase) throw new Error("Supabase 설정이 없습니다.");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return loadBackendState();
};

export const signUpBackend = async form => {
  if (!supabase) throw new Error("Supabase 설정이 없습니다.");
  const email = form.email.trim().toLowerCase();
  const role = form.role || "student";
  const metadata = {
    name: form.name.trim(),
    role,
    counselor_invite_code: role === "counselor" ? form.counselorCode?.trim() : null,
    grade_level: role === "student" ? form.gradeLevel : null,
    class_name: role === "student" ? form.className?.trim() || "미배정" : null,
    high_school: role === "student" ? form.highSchool?.trim() : null,
    preferred_major: role === "student" ? form.preferredMajor?.trim() : null,
  };
  const { data, error } = await supabase.auth.signUp({
    email,
    password: form.password.trim(),
    options: { data: metadata },
  });
  if (error) throw error;
  if (!data.session) return { needsEmailConfirmation: true };
  return loadBackendState();
};

export const signOutBackend = async () => {
  if (!supabase) return;
  await supabase.auth.signOut();
};

export const saveBackendProfile = async (studentId, profile) => {
  if (!supabase || !studentId) return;
  const { error } = await supabase
    .from("student_profiles")
    .upsert(profileToRow(studentId, profile), { onConflict: "student_id" });
  if (error) throw error;
};

export const saveBackendUser = async user => {
  if (!supabase || !user?.id) return;
  const { error } = await supabase
    .from("app_users")
    .update({
      name: user.name,
      grade_level: user.gradeLevel || null,
      class_name: user.className || null,
      high_school: user.highSchool || null,
      preferred_major: user.preferredMajor || null,
    })
    .eq("id", user.id);
  if (error) throw error;
};

export const upsertBackendRequests = async requests => {
  if (!supabase || !requests?.length) return;
  const rows = requests.map(requestToRow);
  const { error } = await supabase
    .from("consultation_requests")
    .upsert(rows, { onConflict: "id" });
  if (error) throw error;
};

export const upsertBackendJournals = async journals => {
  if (!supabase || !journals?.length) return;
  const rows = journals.map(journalToRow);
  const { error } = await supabase
    .from("counseling_journals")
    .upsert(rows, { onConflict: "id" });
  if (error) throw error;
};

export const deleteBackendJournal = async id => {
  if (!supabase || !id) return;
  const { error } = await supabase.from("counseling_journals").delete().eq("id", id);
  if (error) throw error;
};

export const runAiAnalysis = async payload => {
  if (!supabase) throw new Error("Supabase 설정이 없습니다.");
  const { data, error } = await supabase.functions.invoke("ai-analysis", { body: payload });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
};

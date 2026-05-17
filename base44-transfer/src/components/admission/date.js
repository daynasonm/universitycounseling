const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

export function pad2(value) {
  return String(value).padStart(2, "0");
}

export function toDateValue(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function todayValue() {
  return toDateValue(new Date());
}

export function parseDateValue(value) {
  const [year, month, day] = (value || todayValue()).split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(value, days) {
  const date = parseDateValue(value);
  date.setDate(date.getDate() + days);
  return toDateValue(date);
}

export function formatMonth(value) {
  const date = parseDateValue(value);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

export function formatWeekMonth(value) {
  const start = parseDateValue(value);
  const end = parseDateValue(addDays(value, 6));
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  if (sameMonth) return `${start.getFullYear()}년 ${start.getMonth() + 1}월`;
  if (sameYear) return `${start.getFullYear()}년 ${start.getMonth() + 1}월 - ${end.getMonth() + 1}월`;
  return `${start.getFullYear()}년 ${start.getMonth() + 1}월 - ${end.getFullYear()}년 ${end.getMonth() + 1}월`;
}

export function formatDate(value) {
  const date = parseDateValue(value);
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAY_KO[date.getDay()]})`;
}

export function getWeekday(value) {
  return WEEKDAY_KO[parseDateValue(value).getDay()];
}

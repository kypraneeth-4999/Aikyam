/** Helpers for the friendlier date/time pickers in the event wizard. */

/** "2026-07-28" for today in the user's locale. */
export function todayISO(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

/** Quick date chips: Today, Tomorrow, and the next Sat/Sun. */
export function dateShortcuts(): { label: string; value: string }[] {
  const today = todayISO();
  const dow = new Date(`${today}T00:00:00`).getDay(); // 0 Sun … 6 Sat
  const toSat = (6 - dow + 7) % 7 || 7;
  const toSun = (7 - dow) % 7 || 7;
  return [
    { label: "Today", value: today },
    { label: "Tomorrow", value: addDays(today, 1) },
    { label: "Saturday", value: addDays(today, toSat) },
    { label: "Sunday", value: addDays(today, toSun) },
  ];
}

/** "18:30" → "6:30 PM" */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

/** Every half hour from 06:00 to 23:30 — covers realistic event times. */
export function timeOptions(): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  for (let h = 6; h <= 23; h++) {
    for (const m of [0, 30]) {
      const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      out.push({ label: formatTime(value), value });
    }
  }
  return out;
}

export const DURATIONS = [
  { label: "1 hour", mins: 60 },
  { label: "1½ hours", mins: 90 },
  { label: "2 hours", mins: 120 },
  { label: "3 hours", mins: 180 },
  { label: "4 hours", mins: 240 },
  { label: "All day", mins: 480 },
] as const;

/** Combine date + time into the datetime-local string the API expects. */
export function toLocalDateTime(date: string, time: string): string {
  return date && time ? `${date}T${time}` : "";
}

/** Start + duration → the matching end datetime-local string. */
export function endFromDuration(
  date: string,
  time: string,
  mins: number,
): string {
  if (!date || !time) return "";
  const start = new Date(`${date}T${time}:00`);
  const end = new Date(start.getTime() + mins * 60000);
  return new Date(end.getTime() - end.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

/** Human summary for the preview step, e.g. "Sat, 1 Aug · 6:00 PM – 8:00 PM". */
export function describeWhen(
  date: string,
  time: string,
  mins: number,
): string {
  if (!date || !time) return "Not set";
  const start = new Date(`${date}T${time}:00`);
  const end = new Date(start.getTime() + mins * 60000);
  const day = start.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const endHHMM = `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
  return `${day} · ${formatTime(time)} – ${formatTime(endHHMM)}`;
}

/** True when the chosen start is in the past. */
export function isPastStart(date: string, time: string): boolean {
  if (!date || !time) return false;
  return new Date(`${date}T${time}:00`).getTime() < Date.now();
}

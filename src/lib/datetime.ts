const IST = "Asia/Kolkata";

/** Format an event's date/time range in IST (Pune). */
export function formatEventWhen(
  startsAt: string | null,
  endsAt: string | null,
): string {
  if (!startsAt) return "Date to be announced";
  const start = new Date(startsAt);
  const startStr = start.toLocaleString("en-IN", {
    timeZone: IST,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  if (!endsAt) return startStr;
  const endStr = new Date(endsAt).toLocaleString("en-IN", {
    timeZone: IST,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${startStr} – ${endStr}`;
}

/** Short date for event cards, e.g. "Sat, 26 Jul · 6:00 PM". */
export function formatEventShort(startsAt: string | null): string {
  if (!startsAt) return "Date TBA";
  return new Date(startsAt).toLocaleString("en-IN", {
    timeZone: IST,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

type CalOpts = {
  uid: string;
  title: string;
  description?: string | null;
  location?: string | null;
  start: string;
  end?: string | null;
};

function toICSDate(iso: string): string {
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function esc(s: string): string {
  return s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
}

function endOrDefault(o: CalOpts): string {
  return o.end ?? new Date(new Date(o.start).getTime() + 2 * 36e5).toISOString();
}

export function buildICS(o: CalOpts): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Aikyam//EN",
    "BEGIN:VEVENT",
    `UID:${o.uid}`,
    `DTSTAMP:${toICSDate(new Date().toISOString())}`,
    `DTSTART:${toICSDate(o.start)}`,
    `DTEND:${toICSDate(endOrDefault(o))}`,
    `SUMMARY:${esc(o.title)}`,
    o.description ? `DESCRIPTION:${esc(o.description)}` : "",
    o.location ? `LOCATION:${esc(o.location)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

export function icsDataUri(o: CalOpts): string {
  return `data:text/calendar;charset=utf8,${encodeURIComponent(buildICS(o))}`;
}

export function googleCalUrl(o: CalOpts): string {
  const dates = `${toICSDate(o.start)}/${toICSDate(endOrDefault(o))}`;
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: o.title,
    dates,
    details: o.description ?? "",
    location: o.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

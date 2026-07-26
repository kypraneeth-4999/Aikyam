// Netlify scheduled function — fires hourly and asks the app to send any due
// 24h / 3h event reminders. Kept thin on purpose: all the logic (and the
// Supabase/email wiring) lives in /api/cron/reminders.

export default async () => {
  const base = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL;
  const secret = process.env.CRON_SECRET;

  if (!base || !secret) {
    console.error("[reminders] NEXT_PUBLIC_SITE_URL/URL or CRON_SECRET not set");
    return new Response("not configured", { status: 500 });
  }

  const origin = /^https?:\/\//i.test(base) ? base : `https://${base}`;
  const res = await fetch(`${origin}/api/cron/reminders`, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
  });
  const body = await res.text();
  console.log("[reminders]", res.status, body);
  return new Response(body, { status: res.status });
};

export const config = {
  schedule: "@hourly",
};

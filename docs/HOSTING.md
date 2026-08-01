# Hosting — Vercel

Aikyam runs on **Vercel** (native Next.js, no runtime plugin). Netlify was
removed on 1 Aug 2026 — config, scheduled function and the `[deploy]` build gate
are all gone. Nothing in the app code is host-specific.

**Every push to `master` deploys to production.** There is no build gate.

---

## ⚠️ The two things that break sign-in

Both bit us on 1 Aug. Read them before touching hosting config.

### 1. `NEXT_PUBLIC_*` is baked in at build time

These values are **inlined into the browser bundle when `next build` runs** —
they are not read at runtime. Consequences:

- Adding one in the dashboard does nothing until a build runs *with it present*.
- A redeploy that **reuses the build cache** can keep serving the old bundle,
  leaving the server correctly configured while the client JS has nothing.

When that happens `createBrowserClient(undefined, undefined)` throws inside the
click handler and *Continue with Google* silently does nothing. (`createClient()`
in `src/lib/supabase/client.ts` now throws a named error instead, and `/login`
displays it — but the actual fix is still a rebuild.)

**After changing any `NEXT_PUBLIC_*`: redeploy with "Use existing Build Cache"
unticked.**

Verify from outside, without signing in:

```bash
U=https://<your-app>.vercel.app; REF=<your-supabase-project-ref>
for f in $(curl -sS $U/login | grep -o '/_next/static/chunks/[^"]*\.js' | sort -u); do curl -sS "$U$f" | grep -q "$REF" && echo "KEY INLINED: $f"; done
```

Any `KEY INLINED` line means the anon key reached the bundle. Silence means the
build cache won.

### 2. Supabase must know every origin you host on

**Supabase → Authentication → URL Configuration:**

- **Site URL** → your production URL
- **Redirect URLs** → `https://<your-app>.vercel.app/**`

If `redirect_to` is not on the allowlist, GoTrue **silently discards it** and
sends the auth code to the **Site URL** instead. The symptom is landing on
`https://<old-host>/?code=…` after Google — which is exactly how the old Netlify
redirect survived the move. Google OAuth itself needs no change: its callback
points at Supabase, not at us.

---

## Environment variables

**Settings → Environment Variables**, ticked for Production, Preview and
Development unless noted.

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | from `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | from `.env.local` (secret) |
| `NEXT_PUBLIC_SITE_URL` | the production URL, **with `https://`** |
| `PLATFORM_FEE_BPS` | `500` |
| `QR_JWT_SECRET` | from `.env.local` |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | from `.env.local` |
| `RESEND_API_KEY` | from `.env.local` |
| `EMAIL_FROM` | `Aikyam <onboarding@resend.dev>` |
| `CRON_SECRET` | from `.env.local` |

> `CRON_SECRET` is special on Vercel: when set, Vercel Cron automatically sends
> `Authorization: Bearer <CRON_SECRET>` — exactly what `/api/cron/reminders`
> already checks. No code change needed.

## When the production URL changes

Four places reference it. Miss one and something breaks quietly:

1. **Vercel** → `NEXT_PUBLIC_SITE_URL` → **redeploy without build cache**
   (OG tags, ticket links and emails are built from this)
2. **Supabase** → Authentication → URL Configuration → Site URL **and**
   Redirect URLs (see §2 above — this is the one that breaks Google sign-in)
3. **Razorpay** → Account & Settings → Webhooks →
   `https://<new>/api/webhooks/razorpay` (same secret; keep `payment.captured`
   + `order.paid` ticked)
4. **GitHub** → repository secret `SITE_URL`, used by the reminders workflow

## Reminders

Vercel's Hobby plan runs cron **once per day**, too coarse for a 3-hour
reminder, so the hourly trigger lives in GitHub Actions — free, and
host-independent.

1. Repo → **Settings → Secrets and variables → Actions**
   - `SITE_URL` = production URL (no trailing slash)
   - `CRON_SECRET` = the same value as in Vercel
2. **Actions** tab → *Event reminders* → **Run workflow** to test
   — a successful run prints `{"ok":true,...}`

`vercel.json` also registers a once-daily cron as a backstop. Running both is
safe: `notification_log` has a unique constraint per booking + kind + channel,
so nobody can be messaged twice.

*On Vercel Pro, change `vercel.json`'s schedule to `0 * * * *` and disable the
workflow.*

## Verify a deploy

- [ ] Home page loads
- [ ] The anon key is in the client bundle (script in §1)
- [ ] **Google sign-in completes and lands back on our own domain** (needs §2)
- [ ] An event page shows the host card, gallery and directions
- [ ] A test-card booking completes and issues a QR ticket
- [ ] The reminders workflow returns `{"ok":true}`

## Cost note

Vercel's **Hobby tier is free but not licensed for commercial use** — Aikyam
charges a platform fee, so once you're taking real money you'd move to **Pro**
(~$20/month; check current pricing). Fine for testing until then.

## Custom domain

Add it in **Vercel → Settings → Domains**, then repeat *When the production URL
changes* with the new hostname.

# Aikyam — project guide for Claude

> **👉 Read [`docs/STATUS.md`](docs/STATUS.md) first** — current state, pending
> migrations, open bugs, and what to build next. This file is conventions only.

Aikyam is a **mobile-first PWA** and the **organizer's platform** for small,
hyperlocal cultural events (~10–50 attendees) in Pune, India. Full spec:
[`docs/JAD.md`](docs/JAD.md). Read it before adding scope.

**Circles** (`/circles`) layers invitation-led communities on top: a circle's
gatherings are ordinary events (`events.circle_id`), and member reputation is
computed from **QR check-ins**, so attendance is verified rather than
self-declared. See `src/lib/circles.ts`.

**Golden rule for any feature:** does this make on-platform strictly better than
"WhatsApp + GPay"? If not, it's not Phase 1.

## Stack (locked)
- **Next.js 16** (App Router, TypeScript, `src/`) — SSR event/profile pages are the growth loop.
- **Supabase** (Postgres + Auth + Storage). Auth = phone OTP + Google only (no passwords).
- **Razorpay** Standard Checkout → **Route** for split payouts.
- **WhatsApp Cloud API** (direct) + email for the notification lifecycle.
- **Tailwind CSS v4**. **Vercel** hosting.

## Conventions
- **Money is integer paise** everywhere (₹1 = 100). Never floats. Matches Razorpay.
- **Platform fee is config-driven** — `src/config/app.ts` (`PLATFORM_FEE_BPS`, default 500 = 5%,
  organizer-absorbed). Never hard-code the percentage in logic.
- **Payment truth is server-side only** — mark a booking paid only on a signature-verified
  Razorpay webhook. Never trust a client "success" callback.
- **RLS is on for every table.** Reads run as the user; privileged / money-moving writes go through
  server routes using the service-role client (`src/lib/supabase/admin.ts`), which bypasses RLS.
- **Server-side authz on every mutation** — UI hiding is not authorization.
- **Theming:** colours come from CSS variables declared in plain `@theme`
  (never `@theme inline`, which bakes values in and can't be re-themed).
  Use `text-onaccent` for text on a gold surface, never `text-ink`.
- **Layout:** `body` is a flex column — a page-root element with `mx-auto`
  needs `w-full`, or it sizes to content and blows past the viewport on mobile.
- **Validation** lives in `src/lib/validation.ts` and is shared by forms and
  APIs so client hints and server rules can't drift.
- Supabase clients: `client.ts` (browser), `server.ts` (RSC / route handlers), `admin.ts`
  (service role, server-only — never import from client code).

## Layout
- `src/app` — routes.  `src/lib/supabase` — clients.  `src/config` — tunable config.
- `supabase/migrations` — SQL schema (source of truth for the DB).
- `docs/JAD.md` — the spec (BRD/PRD/FRD/Tech + build sequence).
- `docs/EXTERNAL-SETUP.md` — the accounts/keys only a human can set up.

## Build sequence (vertical slices — build in order, each ends demoable)
0. **Foundation** (current): app + schema + auth wiring + deploy.  ← we are here
1. Identity + organizer profile (P1, P2)
2. Create + view an event (P3, P4)
3. Book + pay + ticket (P5, P6, F1)
4. WhatsApp lifecycle (F3)
5. Run the day — dashboard, attendee list, QR check-in (P7–P9, F2)
6. Trust loop — refunds, my tickets, reviews (P8, P10, P11, F4)
7. Hardening + settings + security pass (P12, §6.5)

Do not start a slice until the previous one is deployed and works end-to-end.

## Security non-negotiables (JAD §6.5)
Webhook-verified payments · idempotency keys · signed single-use QR tickets ·
OTP rate limiting · server-side RBAC · PII minimization · atomic capacity decrement ·
signed expiring URLs for private exports · append-only AuditLog on all money moves.

## Hosting — Vercel

**Vercel only.** Netlify is gone (config, scheduled function and the `[deploy]`
build gate were all removed on 1 Aug 2026). Nothing in the app code is
host-specific. Operational detail: [`docs/HOSTING.md`](docs/HOSTING.md).

**Every push to `master` deploys to production.** There is no build gate any
more — don't push half-finished work to `master`.

Reminders are triggered hourly by `.github/workflows/reminders.yml` (Vercel's
Hobby cron only runs daily). Sends are idempotent, so overlapping triggers are safe.

⚠️ **`NEXT_PUBLIC_*` values are inlined into the browser bundle at build time,
not read at runtime.** Adding one in the Vercel dashboard changes nothing until a
build runs with it present, and a redeploy that reuses the build cache can keep
serving the old bundle. After changing any `NEXT_PUBLIC_*`, redeploy with **"Use
existing Build Cache" unticked**.

⚠️ **A new host origin needs Supabase told about it**, or Google sign-in breaks:
Supabase → Authentication → URL Configuration → **Site URL** *and* **Redirect
URLs**. If `redirect_to` isn't on the allowlist, GoTrue silently discards it and
sends the auth code to the Site URL instead.

## Local dev
- `npm run dev` — http://localhost:3000
- Copy `.env.example` → `.env.local`, fill in Supabase keys (see `docs/EXTERNAL-SETUP.md`).
- Apply schema: paste `supabase/migrations/*.sql` into the Supabase SQL editor, or `supabase db push`.

# Aikyam — current status

**Start here.** Snapshot of what's built, what's pending, and what's broken.

_Last updated: 1 Aug 2026_

---

## 🔴 Do these first

### 1. Apply the pending migration — Circles is dead until you do
Supabase → **SQL Editor → New query** → paste
[`supabase/migrations/20260801120000_circles.sql`](../supabase/migrations/20260801120000_circles.sql) → **Run**.

All earlier migrations (through `20260728120000_location_trust.sql`) are already applied.
**Confirmed still pending on 1 Aug** — `circles`, `circle_members` and
`circle_invites` all return `404` from PostgREST.

⚠️ It fails *silently*, not loudly: `/circles` renders a cheerful
"No circles yet" empty state because the query error is discarded. Don't read
that as "Circles works". Verify with:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/circles?select=id&limit=1" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

`200` = applied, `404` = not.

### 2. Google sign-in broken on Vercel — set the build-time env vars
**Root cause found 1 Aug. It is a Vercel configuration problem, not an auth bug.**

`NEXT_PUBLIC_*` variables are **inlined into the browser bundle when `next build`
runs**. On the Vercel deployment they are missing from the built JS, so
`createBrowserClient(undefined, undefined)` throws inside the click handler and
*Continue with Google* silently does nothing — no redirect, no cookie, no error.

Evidence (1 Aug):

| | Netlify (works) | Vercel (broken) |
|---|---|---|
| Supabase ref in client chunks | present | **absent from all 11** |
| Click *Continue with Google* | → `accounts.google.com`, PKCE cookie set | nothing at all |
| Server routes (`/circles`) | 200 | 200 — so **server** env is set |

Server-side works, client-side doesn't ⇒ the vars exist in Vercel but were not
present for the **build** that is live. Almost always a redeploy that reused the
build cache.

**Fix (Vercel dashboard — cannot be done from code):**
1. **Settings → Environment Variables** — confirm `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` exist and are ticked for **Production**.
2. **Deployments → ⋯ → Redeploy**, and **untick "Use existing Build Cache"**.
   Adding a variable alone does nothing — the bundle must be rebuilt.
3. Verify without signing in:
   ```bash
   curl -sS https://aikyam-umber.vercel.app/login | grep -o '/_next/static/chunks/[^"]*\.js' | sort -u |
     while read -r f; do curl -sS "https://aikyam-umber.vercel.app$f" | grep -ql wfdzttafjwebhckfxsth && echo "OK $f"; done
   ```
   Any `OK` line means the key is in the bundle and Google sign-in will work.

Also confirm **Supabase → Authentication → URL Configuration** lists the Vercel
origin (Site URL + `https://aikyam-umber.vercel.app/**` in Redirect URLs), per
[`VERCEL-MIGRATION.md`](VERCEL-MIGRATION.md) step 3.2.

Ruled out, so don't re-investigate these:
- The `handle_new_user()` trigger — 11 `auth.users` rows, 11 `public.users`
  rows, exact 1:1; latest Google signup succeeded 30 Jul.
- Supabase → Google handoff — `302` to `accounts.google.com` from localhost,
  Netlify **and** Vercel, with `redirect_to` preserved.
- The proxy's CSRF check — it only guards mutating `/api/*`.
- The auth code itself — unchanged and working on localhost.

**Code fixes shipped alongside** so this class of failure is never silent again:
`src/lib/supabase/client.ts` throws naming the missing variable, the `/login`
handlers catch and display it, and `/auth/callback` forwards Supabase's real
error instead of a bare `?error=oauth`.

### 3. Hosting — now on Vercel
**Live: https://aikyam-umber.vercel.app** (Vercel project `ykp-claide-code/aikyam`,
deploying from `master`).

Netlify (https://aikyam-unity.netlify.app) is still up but frozen on a pre-26-Jul
build — treat it as a fallback only, and don't use it to judge whether something
is broken. `netlify.toml` and its `[deploy]` build gate remain in place.

Remaining migration follow-ups from [`VERCEL-MIGRATION.md`](VERCEL-MIGRATION.md):
`NEXT_PUBLIC_SITE_URL` must be the Vercel URL, the Razorpay webhook must point at
`…vercel.app/api/webhooks/razorpay`, and hourly reminders run from
`.github/workflows/reminders.yml` (Vercel Hobby cron is daily only).

---

## ✅ What's built

All eight JAD slices, plus features added since.

| Area | State |
|---|---|
| Auth — Google + phone OTP UI | Google working (see bug above); phone OTP needs an SMS provider |
| Organiser profiles, `@handle` + change-with-redirect | done |
| Event creation — **7-step wizard** | done |
| Public event page, discovery homepage, categories | done |
| Booking, Razorpay payment, signed QR tickets | **verified with a real ₹1 payment** |
| Email: ticket + 24h/3h reminders | done; delivery limited (see below) |
| Dashboard, attendee list, CSV, QR check-in | done |
| My Tickets, reviews, cancel/refund | done |
| Co-organisers (invite → approve) + external names | done |
| Location, venue public/private, host trust card, photo gallery | done |
| Settings, notification prefs, delete account | done |
| Security pass — CSRF, moderation hook, rate limiting | done |
| **Light/dark theme** | done, WCAG AA |
| **Circles** (invitation-led communities) | built, **needs migration + testing** |

**Live (old build):** https://aikyam-unity.netlify.app
**Repo:** https://github.com/kypraneeth-4999/Aikyam

---

## ⏳ Waiting on external things

| Item | State | Blocks |
|---|---|---|
| Razorpay **live** keys | KYC submitted, awaiting approval | taking real money (test mode works) |
| Razorpay **Route** | not started | automatic organiser payouts (manual is fine at first) |
| **Domain** | not bought | see below |
| **Resend sending domain** | not set up | **ticket emails only reach your own inbox** — real attendees receive nothing |
| **Meta WhatsApp Business** | not started | WhatsApp tickets/reminders + WhatsApp OTP — see [`WHATSAPP-SETUP.md`](WHATSAPP-SETUP.md) |

The domain is the real blocker for a first public event: it unlocks Resend
domain verification (so attendees actually get their tickets) and makes
`aikyam.app/@handle` credible for the Instagram-bio growth loop.

---

## 🧭 What to build next

[`BACKLOG.md`](BACKLOG.md) has everything specced to a start-coding level.
Highest value:

1. **Edit a published event** (`BACKLOG` 0.1) — currently *impossible*; a wrong
   time or venue can only be fixed by cancelling, which refunds everyone. This
   will bite on the first real event.
2. **SEO** (1.2) — no sitemap, robots, or JSON-LD, despite Google indexing being
   a stated growth loop. About an hour's work.
3. **Tests + CI** — there is no test suite; only ad-hoc `scripts/*.mjs`.
4. Circles: membership payments, discussion spaces, AI matching, identity
   verification (all deliberately out of the v1 scope).

---

## 🛠 Working notes

```bash
npm run dev      # http://localhost:3000
npm run build    # typecheck + build
npm run deploy   # empty [deploy] commit + push → triggers a Netlify build
```

Dev-only scripts (service-role; run from the repo root):

| Script | Purpose |
|---|---|
| `check-db.mjs` | verify schema/tables |
| `list-events.mjs` | recent events + featured/photo flags |
| `set-featured.mjs <slug>` | feature an event on the homepage |
| `verify-organizer.mjs <handle>` | grant the verified badge |
| `check-payments.mjs` | recent payments + fee + ticket check |
| `check-booking.mjs <slug>` | bookings/tickets for an event |
| `purge-event.mjs <slug>` | delete an event **and its bookings** |
| `test-reminders.mjs` | end-to-end reminder job test |
| `verify-*.mjs` | slice verification suites |

TypeScript checks run with type stripping:
`node --experimental-strip-types scripts/test-validation.mts`
(`scripts/` is excluded from the app tsconfig.)

### Gotchas worth remembering
- **Tailwind v4:** use plain `@theme`, never `@theme inline` — `inline` bakes
  values into utilities so they can't be re-themed at runtime.
- **Flexbox:** `body` is a flex column, so a page-root element with `mx-auto`
  opts out of stretch and blows out to its `max-w-*`. Always add `w-full`.
  (This caused a real mobile layout bug — invisible on desktop.)
- **Money is integer paise** everywhere. Never floats.
- **Payment truth is the webhook**, never the client callback.
- **Netlify env vars must be scoped to Functions/Runtime**, not Builds-only, or
  server routes can't see them — and they need a redeploy.
- Razorpay's webhook can't reach `localhost`, so the **paid flow can only be
  tested on a deployed URL**.
- After editing CSS, let the stylesheet reload before measuring computed styles
  — early reads give false failures.
- **Supabase query errors are widely swallowed** (`const { data } = await …`
  with no `error` check), so a missing table or an RLS denial looks like an
  empty list. When a page renders "nothing here", check the table exists before
  believing it.

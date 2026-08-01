# Aikyam — current status

**Start here.** Snapshot of what's built, what's pending, and what's broken.

_Last updated: 1 Aug 2026_

---

## 🔴 Do these first

### 1. Apply the pending migration — Circles pages will error until you do
Supabase → **SQL Editor → New query** → paste
[`supabase/migrations/20260801120000_circles.sql`](../supabase/migrations/20260801120000_circles.sql) → **Run**.

All earlier migrations (through `20260728120000_location_trust.sql`) are already applied.

### 2. Open bug — Google login reported not working
**Not yet diagnosed.** Reported 1 Aug; investigation was interrupted before any
root cause was found. Nothing is known to be wrong with the auth code — it was
working on 17 Jul and the recent changes near it were cosmetic
(`text-ink` → `text-onaccent`) plus an added `<head>` block in
`src/app/layout.tsx` for the theme script.

Check in this order:
1. **Which environment?** The live Netlify site is frozen on an old build
   (see §3), so a failure there may be unrelated to current code.
2. **Supabase → Authentication → URL Configuration** — Site URL and
   **Redirect URLs** must include the origin you're testing
   (`http://localhost:3000/**` for local).
3. **Browser console + network** on `/login` when clicking *Continue with Google*
   — does it redirect to `accounts.google.com` at all?
4. Confirm Supabase still hands off correctly:
   ```bash
   curl -sSi "https://wfdzttafjwebhckfxsth.supabase.co/auth/v1/authorize?provider=google&redirect_to=http://localhost:3000/auth/callback" -H "apikey: <NEXT_PUBLIC_SUPABASE_ANON_KEY>" | head -5
   ```
   A `302` to `accounts.google.com` means Supabase/Google config is fine and the
   problem is on our side (`/auth/callback`, cookies, or the proxy).
5. `src/app/auth/callback/route.ts` exchanges the code for a session;
   `src/proxy.ts` refreshes it. The proxy's CSRF check only guards
   **mutating `/api/*`** requests, so it should not affect this — verify.

### 3. Hosting — production deploys are paused
Netlify free build credits ran out. **Everything since ~26 Jul is committed but
not live**, including the mobile fixes, trust/location features, the event
wizard, theming and Circles.

Two things are already in place:
- Builds now only run when a commit message contains **`[deploy]`**
  (`npm run deploy` makes an empty tagged commit and pushes), so ordinary pushes
  no longer burn credits.
- A **Vercel migration** is prepared — see
  [`VERCEL-MIGRATION.md`](VERCEL-MIGRATION.md). Nothing in the app is
  host-specific; it's env vars plus three URLs.

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

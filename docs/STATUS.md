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

### 2. Open bug — Google login reported not working
**Still open, but now diagnosable.** The reason it stayed undiagnosed: a failed
OAuth round-trip bounced back to `/login?error=oauth` and the login page *never
read that parameter*, so the user saw a blank form and no message.

**Fixed 1 Aug:** `src/app/auth/callback/route.ts` now forwards the real reason
(Supabase's `error_description`, or the `exchangeCodeForSession` message) and
logs it server-side; `/login` renders it. Retry the sign-in and **the failure
will now tell you what it is.**

Already verified working locally, so these are *not* the cause:
- Supabase → Google handoff: `/auth/v1/authorize?provider=google` returns `302`
  to `accounts.google.com`, and `redirect_to=http://localhost:3000/auth/callback`
  is accepted unrewritten — so localhost **is** in the allowed Redirect URLs.
- Clicking *Continue with Google* on `/login` does redirect to Google, and the
  PKCE `sb-…-auth-token-code-verifier` cookie is set on `localhost:3000` first.
- The proxy's CSRF check only guards **mutating `/api/*`** requests, so it never
  touches `/auth/callback`.

So the failure is after Google returns. Likely candidates, in order:
1. Whichever environment was actually tested — the live Netlify site is frozen
   on an old build (see §3), so a failure *there* may be unrelated to this code.
2. `handle_new_user()` trigger on `auth.users` failing on first Google sign-up
   (shows as *"Database error saving new user"*).
3. A `redirect_to` origin not in Supabase's Redirect URLs for the **deployed**
   origin (localhost is confirmed fine).

Reproduce the Supabase handoff check with:
```bash
curl -sSi "https://wfdzttafjwebhckfxsth.supabase.co/auth/v1/authorize?provider=google&redirect_to=http://localhost:3000/auth/callback" -H "apikey: <NEXT_PUBLIC_SUPABASE_ANON_KEY>" | head -5
```

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
- **Supabase query errors are widely swallowed** (`const { data } = await …`
  with no `error` check), so a missing table or an RLS denial looks like an
  empty list. When a page renders "nothing here", check the table exists before
  believing it.

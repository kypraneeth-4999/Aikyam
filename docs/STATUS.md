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

### 2. Google sign-in — one dashboard setting left, in Supabase
**Nothing left to change in code.** This was two separate faults stacked; the
first is fixed, the second is a Supabase setting only you can change.

**Fault A — dead button (FIXED).** `NEXT_PUBLIC_*` values are inlined into the
browser bundle at *build* time. The live Vercel bundle had none, so
`createBrowserClient(undefined, undefined)` threw inside the click handler and
*Continue with Google* did nothing at all. Fixed by setting the vars and
rebuilding — confirmed: the anon key is now in `aikyam-7gzf.vercel.app`'s bundle.

**Fault B — lands back on Netlify (OPEN).** After Google you end up at
`https://aikyam-unity.netlify.app/?code=…`. That is Supabase's **Site URL
fallback**: GoTrue validates `redirect_to` against the Redirect URLs allowlist
and, when it doesn't match, *silently discards it* and sends the auth code to the
Site URL. So Supabase still has the Netlify URL configured.

**Fix — Supabase → Authentication → URL Configuration:**
1. **Site URL** → your Vercel production URL
2. **Redirect URLs** → add `https://<your-app>.vercel.app/**`
   (and keep `http://localhost:3000/**` for local dev)
3. Remove the `aikyam-unity.netlify.app` entries

The symptom to expect when it's right: you land on **our** `/auth/callback`, then
`/onboarding` — never on a bare `/?code=…`.

Ruled out with evidence, so don't re-investigate these:
- The `handle_new_user()` trigger — 11 `auth.users` rows, 11 `public.users` rows,
  exact 1:1; latest Google signup succeeded 30 Jul.
- Supabase → Google handoff — `302` to `accounts.google.com` from every origin
  tested, `redirect_to` preserved at the authorize step.
- The proxy's CSRF check — it only guards mutating `/api/*`.
- The auth code itself — unchanged and working on localhost throughout.

**Code hardening shipped alongside**, so this class of failure is never silent
again: `src/lib/supabase/client.ts` throws naming the missing variable, the
`/login` handlers catch and display it, and `/auth/callback` forwards Supabase's
real error instead of a bare `?error=oauth`.

### 3. Two Vercel projects are deploying from this repo — delete one
Both auto-deploy from `master`, which doubles builds and makes "is it live?"
ambiguous:

| URL | Project | State |
|---|---|---|
| `aikyam-7gzf.vercel.app` | `aikyam-7gzf` (newer) | env vars set, anon key in bundle ✅ |
| `aikyam-umber.vercel.app` | `aikyam` (original) | anon key still missing ❌ |

Pick one, delete the other in Vercel → Settings → General → Delete Project, then
make sure the survivor's URL is the one in `NEXT_PUBLIC_SITE_URL`, Supabase URL
Configuration, the Razorpay webhook, and the GitHub `SITE_URL` secret. See
[`HOSTING.md`](HOSTING.md).

**Netlify is gone from the codebase** as of 1 Aug — `netlify.toml`, the scheduled
function, and the `npm run deploy` / `[deploy]` build gate were all removed.
Every push to `master` now deploys to production, with no gate. The old
`aikyam-unity.netlify.app` site may still be up in Netlify's dashboard; delete it
there.

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

**Live:** https://aikyam-7gzf.vercel.app *(see §3 — a second Vercel project,
`aikyam-umber.vercel.app`, is also deploying from `master`; delete one)*
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
git push         # → deploys to production on Vercel (no build gate any more)
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
- **`NEXT_PUBLIC_*` is inlined at build time, not read at runtime.** Setting one
  in Vercel does nothing until a build runs with it present, and a redeploy that
  reuses the build cache can keep serving the old bundle. Redeploy with **"Use
  existing Build Cache" unticked**. (This is what killed Google sign-in on 1 Aug.)
- **Every new origin must be added to Supabase → Auth → URL Configuration.**
  GoTrue silently discards an unlisted `redirect_to` and sends the auth code to
  the Site URL instead, so sign-in "works" but lands on the wrong domain.
- Razorpay's webhook can't reach `localhost`, so the **paid flow can only be
  tested on a deployed URL**.
- After editing CSS, let the stylesheet reload before measuring computed styles
  — early reads give false failures.
- **Supabase query errors are widely swallowed** (`const { data } = await …`
  with no `error` check), so a missing table or an RLS denial looks like an
  empty list. When a page renders "nothing here", check the table exists before
  believing it.

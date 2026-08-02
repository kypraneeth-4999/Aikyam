# Aikyam — current status

**Start here.** Snapshot of what's built, what's pending, and what's broken.

_Last updated: 2 Aug 2026_

**Live: https://aikyam-7gzf.vercel.app** — the only Vercel project, the only host.

---

## 🔴 Do these first — two things are silently broken

Neither is a code problem. Both are external dashboards, and both fail **quietly**
— nothing errors, the work just never happens.

### 1. Razorpay webhook still points at a dead URL
The webhook was configured against the old Netlify domain, which no longer
exists. Razorpay is POSTing into a 404.

**Razorpay → Account & Settings → Webhooks** → set the URL to:

```
https://aikyam-7gzf.vercel.app/api/webhooks/razorpay
```

Keep the same secret; leave `payment.captured` and `order.paid` ticked.

**Why it matters:** payment truth is the webhook *only* — the client callback is
never trusted (JAD §6.5). Until this is fixed a person can pay, and their booking
is never marked paid, so no ticket is issued. Nothing on our side reports an
error. Verify by completing a test-card booking and confirming a QR ticket.

### 2. `CRON_SECRET` is missing from GitHub Actions
`SITE_URL` is set. `CRON_SECRET` is not, so *Event reminders* cannot authenticate
against `/api/cron/reminders` — the workflow is registered and active but **has
never run successfully**, meaning no 24h/3h reminder has ever been sent.

From the repo root (reads the value out of your own `.env.local`, so it is never
typed anywhere):

```bash
gh secret set CRON_SECRET --body "$(grep '^CRON_SECRET=' .env.local | cut -d= -f2- | tr -d '[:space:]')"
```

Then **Actions → Event reminders → Run workflow**. A good run prints
`{"ok":true,...}`.

---

## ✅ Closed on 1 Aug 2026

### Google sign-in — FIXED
Two faults stacked, which is why it kept looking half-mended:

**Fault A — the button did nothing.** `NEXT_PUBLIC_*` values are inlined into the
browser bundle at *build* time. The live bundle had none, so
`createBrowserClient(undefined, undefined)` threw inside the click handler: no
redirect, no cookie, no error. Fixed by setting the vars and rebuilding.

**Fault B — sign-in landed on `aikyam-unity.netlify.app/?code=…`.** That is
Supabase's **Site URL fallback**: GoTrue validates `redirect_to` against the
Redirect URLs allowlist and, when it doesn't match, *silently discards it* and
sends the auth code to the Site URL — which was still Netlify. Fixed in
Supabase → Authentication → URL Configuration.

Verified end-to-end, and the allowlist is confirmed from outside with:

```bash
curl -sS -o /dev/null -w "%{redirect_url}\n" "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/verify?token=invalid-probe&type=magiclink&redirect_to=<origin>/auth/callback" -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```

Echoes the origin back = allowlisted. Returns the Site URL = not allowlisted.
Omit `redirect_to` entirely and it reveals the current Site URL.

Ruled out with evidence — don't re-investigate:
- `handle_new_user()` trigger — 11 `auth.users` rows, 11 `public.users` rows, 1:1.
- Supabase → Google handoff — `302` to `accounts.google.com` from every origin.
- The proxy's CSRF check — only guards mutating `/api/*`.

**Code hardening shipped with it**, so this class of failure is never silent
again: `src/lib/supabase/client.ts` throws naming the missing variable, the
`/login` handlers catch and display it, and `/auth/callback` forwards Supabase's
real error instead of a bare `?error=oauth`.

### Circles migration — APPLIED
`circles`, `circle_members`, `circle_endorsements` and `events.circle_id` all
confirmed present.

⚠️ Note for next time: it would have failed *silently*. `/circles` renders a
cheerful "No circles yet" empty state when the tables are missing, because the
query error is discarded. Check the tables, don't trust the page:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/circles?select=id&limit=1" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

### Netlify — REMOVED
`netlify.toml`, the scheduled function and the `npm run deploy` / `[deploy]`
build gate are gone from the repo, and the `aikyam-unity` site is deleted.
**Every push to `master` now deploys to production, with no gate.**

### Duplicate Vercel project — DELETED (2 Aug)
`aikyam-7gzf` is the only project. `aikyam-umber.vercel.app` no longer resolves,
and pushes build once instead of twice.

### Light-mode contrast on the organiser CTA — FIXED (2 Aug)
The homepage CTA panel's gradient is hard-coded dark via an inline style, but its
text used theme tokens that flip: in light mode `text-cream` resolved to `#1c1626`
— near-black on near-black. `text-gold` was wrong there too, since light mode
deepens gold to `#9a5f08` for contrast against ivory.

The panel now carries `data-theme="dark"`, and `globals.css` declares the dark
palette under a plain `[data-theme="dark"]` selector so it can scope to a
**subtree**, not just `:root`. Measured after: heading 15.28:1, label 8.41:1,
body 6.03–6.33:1 — AA in both themes.

**Reusable rule:** any panel with a fixed dark background should set
`data-theme="dark"` on itself rather than hard-coding text colours.

---

## ✅ What's built

All eight JAD slices, plus features added since.

| Area | State |
|---|---|
| Auth — Google + phone OTP UI | Google verified working on Vercel 1 Aug; phone OTP needs an SMS provider |
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
| **Circles** (invitation-led communities) | built, migration applied, **untested end-to-end** |

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

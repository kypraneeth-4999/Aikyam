# Aikyam — product backlog

Everything not yet built, specced closely enough to start coding on a word.
Each item lists **why**, the **spec** (schema / API / files), and a rough
**effort**. Ordered by priority within each section.

**Status today:** all 8 JAD slices built · deployed at aikyam-unity.netlify.app ·
Razorpay test payment verified end-to-end · 24h/3h reminder emails live ·
co-organisers, discovery, featured events, image upload, settings all shipped.

Effort key: **S** ≈ under an hour · **M** ≈ a few hours · **L** ≈ a day+

---

## P0 — Blocks running a real event

### 0.1 Edit a published event · **M** ⚠️ biggest hole
Today an event is immutable once created — a wrong time, venue typo, or price
can't be fixed, only cancelled (which refunds everyone). This *will* bite on the
first real event.

- **API:** `PUT /api/events/[id]` — organiser-only (`userOrganizesEvent`),
  reuse `validateEvent()`. Guard rails: block reducing `capacity` below seats
  already sold; block editing a `cancelled`/`completed` event; block changing
  `slug` once published (link stability).
- **Notify:** if `starts_at` or `venue_name` changes on a published event with
  paid bookings, email attendees (`sendEventChangedEmail` — the JAD's
  "venue/time change" template) and write an `AuditLog`.
- **UI:** reuse `event-form.tsx` in edit mode, reached from
  `/organizer/events/[id]`; add "Edit event" button.
- **Also unlocks:** draft resume — drafts are currently write-only dead ends.

### 0.2 Real email delivery (domain + Resend) · **S** (mostly DNS waiting)
Attendees get **no email** today — Resend only delivers to the account owner
until a sending domain is verified. Someone can pay and receive nothing.

- Buy domain → point at Netlify → add SPF/DKIM records in Resend → set
  `EMAIL_FROM=Aikyam <tickets@yourdomain>` in Netlify → redeploy.
- Then update `NEXT_PUBLIC_SITE_URL`, Supabase Auth redirect URLs, and the
  Razorpay webhook URL to the new domain.

### 0.3 Razorpay live mode · **S** (gated on KYC, already submitted)
Swap test keys for live, add a live-mode webhook at the same path, redeploy.
Consider **Razorpay Route** for automatic organiser payouts — until then payouts
are manual (fine for the first event, not beyond).

### 0.4 Report an event · **S**
The `reports` table exists with no way to file one — a safety gap on a public
marketplace.
- **API:** `POST /api/reports` (reason enum + note, rate-limited, works
  logged-out). **UI:** "Report" link on `/e/[slug]`.
- **Admin:** `scripts/list-reports.mjs` to triage.

---

## P1 — High value, build next

### 1.1 Search + filters · **M**
Discovery is category-chips only. No text search, date, price, or city filter.
- Extend `fetchDiscoverEvents()` in `src/lib/discovery.ts` with `q`, `city`,
  `dateFrom/dateTo`, `freeOnly`, `priceMax`.
- Postgres `ilike` on title/description/venue/tags is plenty at this scale;
  move to `tsvector` + GIN index past ~10k events.
- UI: search band on the homepage (the Figma design already has one).

### 1.2 SEO: sitemap, robots, structured data · **S** 🚀 highest ROI/effort
Your JAD names Google indexing as a core growth loop, and none of it exists.
- `src/app/sitemap.ts` — published events + organiser profiles
- `src/app/robots.ts`
- **JSON-LD `Event` schema** on `/e/[slug]` (name, startDate, location, offers,
  performer) → rich results in Google, and Google Events surfaces it.
- Also add JSON-LD `ProfilePage` on `/@handle`.

### 1.3 Attendee self-cancel + refund · **M**
Attendees must currently email the organiser. JAD parked this, but it's the
"cancellation guarantee" that defends against leakage to WhatsApp+GPay.
- **API:** `POST /api/bookings/[id]/cancel` — attendee-only, honours the event's
  `cancellation_policy` window (add `refund_cutoff_hours` to `events`), reuses
  `refundBooking()`, releases the seat.
- **UI:** "Cancel booking" on `/tickets`.

### 1.4 Ticket tiers · **L**
Your own Figma design shows Gallery / Stalls / Patron Circle. Today there's one
price.
- **Schema:** `ticket_tiers` table (event_id, name, description, price,
  capacity, sort). `bookings.tier_id`. Capacity moves per-tier —
  `create_booking()` must lock and count per tier.
- Sizeable change to the booking core; do it deliberately, with tests.

### 1.5 Announce to attendees · **M**
Organisers can't message their attendees at all (e.g. "parking is on the left").
- **API:** `POST /api/events/[id]/announce` — primary organiser, rate-limited,
  moderated, emails all paid attendees, logs to `notification_log`.
- **UI:** composer on the manage page.

### 1.6 Duplicate an event · **S**
Most organisers run the *same* workshop repeatedly — this is the single biggest
time-saver for repeat supply (and your #1 success metric is organisers
publishing a second event).
- `POST /api/events/[id]/duplicate` → copies fields into a new draft.

### 1.7 Multi-photo gallery · **S**
`events.photos[]` exists and is rendered as a fallback only; the create form
uploads a cover only.
- Multi-file upload in the form; gallery + lightbox on `/e/[slug]`.

### 1.8 Waitlist · **M**
JAD Phase 2, manual promotion only (auto-promotion deliberately parked).
- **Schema:** `waitlist_entries` (event_id, user_id, seats, created_at, status).
- Join waitlist when sold out; organiser "offer seat" from the manage page sends
  a time-limited claim link.

---

## P2 — Growth & retention

| Item | Why | Effort |
|---|---|---|
| **Follow organiser** + "new event" email | repeat demand; JAD Phase 2 | M |
| **Save / favourite events** | intent capture | S |
| **Guest checkout** (book without an account) | biggest conversion lever on paid funnels | M |
| **Share sheet + WhatsApp deep link** on event page | your primary distribution channel | S |
| **Add-to-calendar on the event page** (not just the ticket) | pre-booking intent | S |
| **Referral codes** for organisers | supply growth | M |
| **Promo / discount codes** | organiser ask; JAD parked | M |
| **Post-event photo drop** | JAD Phase 2; retention | M |
| **Instagram import** when creating an event | JAD P3 bonus — cuts creation to ~2 min | M |
| **Email digest** of upcoming events by city/category | re-engagement | M |
| **Ticket transfer** to another person | common real-world need | M |
| **Organiser earnings / payout view** | trust; needs Route data | M |
| **Event analytics** (views → bookings) | organiser retention | M |
| **i18n — Marathi / Hindi** | Pune cultural audience; real differentiator | L |

---

## P3 — Trust, safety & scale

- **Verification tiers** — `verification_status` exists with no way to become
  verified. Needs an application flow + admin review. (JAD Phase 3.) · M
- **Moderation queue** — `moderateText()` is a blocklist stub; add an admin
  review surface and image moderation before public UGC scales. · M
- **Co-host permissions matrix** — currently binary (accepted co-hosts can view
  attendees + check in; only primary can cancel/refund). · M
- **Partial refunds** · S · **No-show tracking** · S
- **Age-gating** for 18+ events · S
- **GST invoicing** — likely required once revenue is real in India. · M
- **Multi-city** + city switcher — JAD says density in Pune first. · M

---

## Engineering quality (do alongside features)

| Item | Why | Effort |
|---|---|---|
| **Automated tests + CI** ⚠️ | there is *no* test suite — only ad-hoc `scripts/*.mjs`. Add Vitest for `src/lib/*` (validation, money, handles, ics) and a GitHub Action running typecheck + build + tests on PR. | M |
| **Error monitoring** (Sentry) | today a production error is invisible unless someone reports it | S |
| **Analytics** (Plausible/PostHog) | you can't see your JAD success metrics — fill rate, repeat organisers | S |
| **Durable rate limiting** | `src/lib/rate-limit.ts` is in-memory, so it resets per serverless instance. Move to Upstash Redis before real traffic. | S |
| **`next/image`** | all images are raw `<img>`; Netlify's image CDN is configured but unused → slow cards on mobile data | S |
| **Accessibility pass** | focus states, labels, contrast, keyboard nav on the scanner/forms | M |
| **DB backups + restore drill** | verify Supabase PITR is on and *test* a restore | S |
| **Seed script for a demo dataset** | makes local dev and demos far easier | S |
| **Re-enable Netlify secrets scanning** | disabled after false positives; revisit with `SECRETS_SCAN_OMIT_PATHS` | S |

---

## Known small gaps

- Organiser can't reply to reviews in the UI (`POST /api/reviews/[id]/respond`
  exists, no button)
- Manual check-in has no **attendee name search** — only QR scan or pasting a token
- No **offline check-in** (JAD deliberately cut it; venues have data)
- `reserved_handles` grace entries are never garbage-collected once expired
- Pending bookings are never swept — expired holds linger as `pending` rows
  (harmless: `create_booking` ignores holds older than 15 min)
- Event page has no "similar events" section (the Figma design shows one)

---

## Suggested order

1. **0.1 edit event** — the most likely thing to hurt you in production
2. **1.2 SEO** — an hour's work for a growth loop the JAD depends on
3. **0.2 / 0.3** — domain + live payments, as approvals land
4. **1.6 duplicate** + **1.1 search** — cheap, high leverage on both sides
5. **Tests + CI** before the codebase grows further
6. Then P1 by whatever your first organisers actually ask for

# Aikyam — JAD (Jack of All Doc)

**One document, four hats:** Business (BRD) · Product (PRD) · Functional (FRD) · Technical (Tech).
**Purpose:** the single source of truth to build Aikyam **page by page, feature by feature**.

- **Version:** 0.2 (Phase 1 spec — Appendix B decisions locked)
- **Owner:** YK
- **Last updated:** 9 July 2026
- **Status:** Pre-build / ready to scaffold
- **Locked stack decisions:** Supabase · WhatsApp Cloud API (direct) · all Pune cultural categories at launch · fee mechanism live from event #1 (rate configurable) · auto-generated handles with redirect-on-change

---

## 0. How to use this document

This JAD is deliberately ordered so you can build in **vertical slices** — one complete, demoable user journey at a time — instead of building all the database, then all the APIs, then all the UI.

- **Sections 1–3** = the "why" and the "what's in / what's out." Read once, refer back when tempted to add scope.
- **Section 4** = the PRD, organized **by page**. Each page is a self-contained build unit with its own acceptance criteria.
- **Section 5** = the cross-page flows (booking, payment, check-in, notifications).
- **Section 6** = the technical spec (stack, data model, APIs, integrations, security).
- **Section 7** = the **build sequence** — the exact order to build the pages/features, with a "definition of done" for each slice. **This is your day-to-day roadmap.**
- **Section 8** = external dependencies (the things that gate you regardless of code speed).
- **Appendix A** = everything we deliberately cut, parked so it's never lost.

> **Golden rule for every feature decision:** *Does this make on-platform strictly better than "WhatsApp + GPay"?* If not, it's not Phase 1.

---

# PART I — BUSINESS (BRD)

## 1. Business context

### 1.1 What Aikyam is
A mobile-first PWA that is **the organizer's platform** for small, hyperlocal cultural events (≈10–50 attendees) in India — pottery classes, poetry evenings, heritage walks, folk-art workshops, music jams. Organizers get a genuinely excellent free toolkit (beautiful event page + payments + WhatsApp automation + QR check-in); attendees discover and book authentic local experiences with trust.

### 1.2 Positioning (the one-line moat)
> **Aikyam is the organizer's platform. Alive is the curator's brand. District/BookMyShow are for concerts.**

- **District / BookMyShow** are structurally absent from the small-event segment — a 15-person ₹800 workshop is too small for their cost model. Moat by neglect.
- **Alive** (₹6cr funded, Bengaluru/Hyderabad) is *full-stack* — it creates and curates its own experiences. It scales with its ops team. Aikyam is a **marketplace + toolkit** where the organizer owns the brand and Aikyam scales with supply.
- **Meetup** teaches us: never charge organizers a fixed fee to exist. **Luma** is the playbook: tool first → supply density → discovery.

### 1.3 The two existential risks (design must answer both)
1. **Cold-start** (two-sided chicken-and-egg). *Answer:* launch as a single-player **tool** + **link-in-bio profile** so an organizer gets value on day one with zero other users; their own Instagram audience seeds demand. One city only (Pune).
2. **Leakage / disintermediation** (users pay the organizer directly via UPI to dodge fees). Because the platform fee is **live from event #1** (see §1.5), this exposure is *higher* than in a 0%-launch model, so the **non-price defences carry the weight**: WhatsApp-native ticketing + reminders users won't want to lose, an **attendee cancellation guarantee** a GPay transfer can't match, and **trust/reputation metrics that accrue only on-platform**. The fee **rate** is the first lever to revisit if early supply resists.

### 1.4 Target users (roles)
| Role | Who | Core job-to-be-done |
|---|---|---|
| **Attendee** | Urban professional (21–38), craving authentic local experiences | Discover → trust → book → attend → review |
| **Organizer** | Independent creators (artists, teachers, performers, hosts) | Create event → get bookings & payments → run the day → build reputation |
| **Admin** | You (internal) | Moderate, verify, resolve refunds — **via internal tooling, not a built UI** |

One account per person. A user can be both attendee and organizer; role is a mode, not a separate login.

### 1.5 Business model
- **Platform fee is live from event #1** (YK decision). Default **5%** (Luma's number, *configurable*), **deducted from the organizer's payout** via Razorpay Route's split — Aikyam earns only when the organizer earns. *(The attendee separately bears the payment-gateway fee, as always.)*
- **Why from day one:** revenue from the first rupee, and expectations set honestly up front — avoiding the Meetup-style backlash that comes from *introducing* a fee later.
- **Trade-off we're accepting:** during cold-start any fee is a leakage incentive (see §1.3). We offset it with non-price value, not by waiving the fee. **The 5% rate is the primary dial** — if founding organizers resist, lower it or make it promotional for the first cohort before touching the model itself.
- **Fee bearer — one detail still to confirm:** default is **organizer-absorbed** (order total = ticket price; the 5% comes out of payout — cleaner for the attendee, standard marketplace model). Alternative is **attendee-added** (order total = price + 5%; organizer keeps full price). JAD assumes organizer-absorbed until told otherwise.
- **Never:** subscription-to-exist (Meetup's mistake), or a per-RSVP fee charged to attendees.

### 1.6 Success metrics (what "working" looks like)
1. **Events published / week** (supply velocity)
2. **% organizers who publish a *second* event** ← the single most important number
3. **Average fill rate** per event
4. **GMV** (gross booking value)
5. **Repeat-attendee rate**

If organizers come back unprompted to list event #2, the tool works; everything else follows.

### 1.7 Phasing strategy
- **Phase 0 — Concierge (no code):** manually run 10 Pune organizers' next events (Payment Page + WhatsApp group + spreadsheet). Validate fee tolerance and seed launch supply.
- **Phase 1 — The Tool (this doc):** organizer toolkit + attendee booking. **No discovery feed.**
- **Phase 2 — Discovery:** home feed, filters, follow, series, co-host UI — once ~50+ live events/month in Pune.
- **Phase 3 — Trust & scale:** verification tiers, analytics, second city, native wrapper.

---

# PART II — SCOPE

## 2. In scope (Phase 1)

Auth (phone OTP + Google) · Organizer link-in-bio profile · Event creation wizard · Public event page (server-rendered, shareable) · Multi-seat booking · Razorpay checkout · WhatsApp + email ticket delivery · Automated WhatsApp reminders (24h, 3h) · Browser QR check-in · Organizer dashboard + per-event management · Full-event cancellation with auto-refund · Check-in-gated reviews · Minimal settings.

## 3. Out of scope / deferred

### 3.1 Cut for v1 (with reason)
| Item | Why cut |
|---|---|
| Apple + Facebook login | Apple only needed for native iOS; FB is low-trust/fading in India |
| SMS + Push channels | WhatsApp + email cover it; push needs install; SMS redundant |
| Message delivery/read-tracking dashboards | v3 luxury; not needed to run events |
| Full admin dashboard UI | You are admin — use internal tooling (Retool/DB) |
| Verification Tier 2 + featured placement | v1 needs 2 states only: unverified / verified |
| Waitlist **auto-promotion** | Nasty edge cases; v1 = manual "offer seat" |
| Offline check-in | Hard PWA engineering for a rare case; venues have data |
| Co-host **UI** & permissions matrix | **Schema built now**, UI in Phase 2 |
| Custom payout wallet/ledger | Razorpay Route owns this (also a regulatory surface to avoid) |
| Search-as-you-type, distance sort, trending algo | <200 events in one city → filtered chronological list is best |
| Multi-city | Density in Pune beats presence in five |
| Kids category | Minors carry distinct safety/liability burden |
| Mandatory cover video / exactly-3-photos | Hard requirement strangles supply onboarding → make optional |
| Material-kit logistics/delivery | Keep only as a checkout **flag** (included / BYO + optional add-on price) |

### 3.2 Explicitly never-build (security posture)
- No password storage (OTP + OAuth only → no password to leak).
- No storing raw card/payment data (Razorpay holds it; you store IDs + status only).
- No storing government-ID images until Tier 2 is actually built (don't hold liability you're not using).
- No client-side-only capacity or payment truth (see security section).

---

# PART III — PRODUCT (PRD), BY PAGE

> Each page below is a **build unit**. Format: Purpose · Users · Components · States · Data · APIs · Acceptance criteria · Not-in-v1.

## P1 — Landing / Auth
- **Purpose:** get a user authenticated with minimum friction; capture minimal profile on first login.
- **Users:** everyone.
- **Components:** phone-number input → OTP entry; "Continue with Google"; first-time-only capture of **Full Name** + **City (optional)**.
- **States:** default · OTP-sent · OTP-error/expired · rate-limited · new-user (show name capture) · returning-user (skip straight in).
- **Data:** reads/writes `User`.
- **APIs:** `POST /auth/request-otp`, `POST /auth/verify-otp`, `GET /auth/google/callback`, `GET /me`.
- **Acceptance criteria:**
  - [ ] New phone number receives OTP; correct OTP creates a `User` and a session.
  - [ ] Returning user is **not** asked for name again.
  - [ ] OTP endpoints are rate-limited (per phone + per IP).
  - [ ] Google login creates/links a `User` by verified email.
- **Not in v1:** Apple, Facebook, email-OTP as a separate path.

## P2 — Organizer profile (link-in-bio) — `aikyam.app/@handle`
- **Purpose:** the organizer's public storefront + the **single-player value** on day one; the link they put in their Instagram bio.
- **Users:** public (attendees), owned by organizer.
- **Components:** profile photo, name, **verified badge**, bio, city, optional intro video, curated images, social links (Instagram/YouTube/website), **all upcoming events with inline booking**, past-event highlights, aggregate rating.
- **States:** public view · owner view (with "edit" + "create event") · empty (no events yet) · unverified vs verified badge.
- **Data:** reads `OrganizerProfile`, `Event` (by organizer via `EventOrganizer`), cached metrics.
- **APIs:** `GET /o/:handle`, `PUT /organizer/profile`, `POST /organizer/profile` (first-time claim of handle), `POST /organizer/handle/check` (live availability), `PUT /organizer/handle` (change, with redirect).

- **Handle system (designed for safety + not breaking shared links):**
  - **Auto-generated on signup, not typed cold.** Slugify the organizer's name → `@priya-sharma`. On collision, append the smallest free integer → `@priya-sharma-2`. The user is *offered* this default and can customise it inline (with a live availability check) — so nobody stares at an empty box, but power users still get the handle they want.
  - **Format rules (validated server-side):** lowercase `a–z`, `0–9`, single hyphens; length **3–30**; no leading/trailing hyphen; no consecutive hyphens; unique **case-insensitively**.
  - **Reserved blocklist:** system words (`admin, api, aikyam, support, help, about, login, signup, settings, e, o, terms, privacy, www`, etc.) + an offensive-words list. Blocklist is config-driven so it can grow without a deploy.
  - **Change-safe by design (this is the "something better"):** an organizer may change their handle; the **old handle 301-redirects to the new one** and is **reserved for a grace period** (e.g. 90 days) before it can be re-claimed. This means the link already in their Instagram bio never dies — a real failure mode for creators.
  - **Premium/short handles reserved for verified organizers:** very short (≤4 char) or high-demand handles are only claimable once `verification_status = verified`, protecting against squatting.
  - **Schema impact:** add `handle_history` (jsonb of `{old_handle, released_at}`) to `OrganizerProfile`, and a `reserved_handles` table (`handle, reason, reserved_until?`).

- **Acceptance criteria:**
  - [ ] Server-rendered with correct social/link-preview meta (OG tags) for WhatsApp/Instagram sharing.
  - [ ] New organizer is offered an auto-generated handle; can customise with live availability check.
  - [ ] Format rules + reserved blocklist enforced server-side; uniqueness is case-insensitive.
  - [ ] Changing a handle 301-redirects the old one and reserves it for the grace period.
  - [ ] Short/premium handles are gated behind `verified`.
  - [ ] Public metrics shown are computed **only from on-platform bookings** (the retention hook).
  - [ ] Owner sees management affordances; public does not.
- **Not in v1:** follow button (Phase 2), messaging.

## P3 — Event creation wizard
- **Purpose:** let a non-technical organizer publish an event in minutes.
- **Users:** organizer.
- **Components (guided steps):**
  1. Basics — title, category, description
  2. When — date, start/end time (duration auto)
  3. Where — venue name, Google Maps link, landmark
  4. Capacity & price — max attendees, free/paid + price, **materials: included / BYO (+ optional add-on price)**
  5. Details — what to bring, cancellation policy, languages, age suitability, tags
  6. Media — **optional** cover video, 1–5 photos (nudge: "pages with video get 3× views")
  7. Preview → Publish
- **Bonus feature (high-leverage):** **"Import from Instagram"** — paste a post/reel link to auto-draft title/description/image and attempt date extraction. Cuts creation from ~20 fields to ~2 minutes.
- **States:** draft (autosave) · validation errors per step · preview · published.
- **Data:** writes `Event` (+ `EventOrganizer` row linking creator as primary).
- **APIs:** `POST /events` (draft), `PUT /events/:id`, `POST /events/:id/publish`, `POST /uploads/sign` (media), `POST /events/import-instagram`.
- **Acceptance criteria:**
  - [ ] Event can be saved as draft and resumed.
  - [ ] Media is **not** mandatory to publish.
  - [ ] Publishing generates a unique `slug` and a live public URL.
  - [ ] Capacity + price validated server-side.
- **Not in v1:** multi-day series, co-host invitations (schema present, no UI), recurring.

## P4 — Public event page — `aikyam.app/e/:slug`
- **Purpose:** the shareable, server-rendered page that **is** the growth loop (WhatsApp previews, Google indexing).
- **Users:** public.
- **Components:** cover media + gallery, title, category, price, **seats left**, date/time/duration, venue + map link, description, what-to-bring, host card (links to P2), reviews, cancellation policy, **Reserve/Pay** button, share, report.
- **States:** available · nearly full · sold out · cancelled · past/completed.
- **Data:** reads `Event`, `OrganizerProfile`, `Review`, live `seats_left` (derived).
- **APIs:** `GET /e/:slug`, `POST /reports`.
- **Acceptance criteria:**
  - [ ] Full server-side render with correct OG/Twitter meta (title, image, price, date).
  - [ ] `seats_left` reflects paid bookings accurately (server truth).
  - [ ] Sold-out disables booking; cancelled shows clear notice.
- **Not in v1:** "ask organizer" chat (WhatsApp deep-link is fine), FAQs module.

## P5 — Booking & checkout (flow surfaced from P4)
- **Purpose:** convert a viewer into a paid, ticketed attendee.
- **Users:** attendee (auth required at this step).
- **Components:** seat quantity, **per-guest names** (group booking), materials add-on if offered, order summary, auth gate if logged-out, Razorpay checkout, result screen.
- **States:** selecting · auth-required · payment-processing · paid · payment-failed · capacity-lost-during-checkout.
- **Data:** writes `Booking`, then `Ticket` on confirmed payment.
- **APIs:** `POST /bookings` (creates Razorpay order + pending booking), Razorpay checkout (client), `POST /webhooks/razorpay` (server confirms), `GET /bookings/:id`.
- **Acceptance criteria:**
  - [ ] Booking marked **paid only** after verified Razorpay **webhook** (never client callback alone).
  - [ ] **Idempotency key** prevents double-charge on retry.
  - [ ] Capacity decrement is **atomic** server-side (no overbooking under concurrency).
  - [ ] Free events skip payment but still create booking + ticket.
  - [ ] **Platform fee applied per §1.5** — organizer-absorbed by default (order total = ticket price; 5% split out at settlement). If switched to attendee-added, order total = price + 5%. Fee % read from config, never hard-coded.
- **Not in v1:** split-UPI-request among guests (multi-seat single-payer is enough), promo codes.

## P6 — Booking confirmation / Ticket
- **Purpose:** deliver proof of booking the way Indians actually use — on WhatsApp.
- **Users:** attendee.
- **Components:** QR ticket, event summary, add-to-calendar, venue directions; same ticket **pushed to WhatsApp + email**.
- **States:** valid · checked-in · cancelled/refunded.
- **Data:** reads `Ticket`, `Booking`, `Event`.
- **APIs:** `GET /tickets/:id`, WhatsApp send pipeline (utility template).
- **Acceptance criteria:**
  - [ ] QR encodes a **signed, single-use token** (screenshot can't be reused after check-in).
  - [ ] Ticket arrives on WhatsApp (utility template) **and** email.
  - [ ] Add-to-calendar produces a correct event entry.
- **Not in v1:** wallet passes (Apple/Google Wallet).

## P7 — Organizer dashboard
- **Purpose:** the organizer's home base.
- **Users:** organizer.
- **Components:** list of my events (upcoming / past / draft / cancelled), quick stats (bookings, revenue, fill), primary CTAs (Create event, Manage, View profile).
- **States:** empty (no events) · has events · loading.
- **Data:** reads `Event` list via `EventOrganizer`, aggregated `Booking` stats.
- **APIs:** `GET /events/mine`.
- **Acceptance criteria:**
  - [ ] Shows only events the user organizes (server-side role check).
  - [ ] Revenue reflects paid bookings (read-only view of truth).
- **Not in v1:** analytics charts, payout ledger UI (read-only Route data only).

## P8 — Event management (per event)
- **Purpose:** run a specific event end-to-end.
- **Users:** organizer (of that event).
- **Components:** overview, **attendee list** (with per-guest names, payment status), export, **cancel event** (→ auto-refund all), **manual refund** (single booking), manual waitlist ("offer seat"), edit event.
- **States:** upcoming · in-progress · completed · cancelled.
- **Data:** reads/writes `Event`, `Booking`, triggers refunds, writes `AuditLog`.
- **APIs:** `GET /events/:id/bookings`, `POST /events/:id/cancel`, `POST /bookings/:id/refund`, `PUT /events/:id`.
- **Acceptance criteria:**
  - [ ] Only the event's organizer can access (server-side authz on every call).
  - [ ] Cancelling an event refunds all paid bookings and notifies attendees.
  - [ ] Every money-moving action writes an `AuditLog` row.
  - [ ] Attendee-list export is a signed, expiring URL.
- **Not in v1:** partial refunds, per-attendee messaging composer, capacity increase mid-sale UI (can edit within rules).

## P9 — Check-in scanner
- **Purpose:** mark attendance on event day using a phone browser.
- **Users:** organizer (at the door).
- **Components:** camera QR scanner, scan result (valid / already-used / wrong-event / cancelled), running checked-in count, manual search fallback.
- **States:** scanning · success · duplicate · invalid.
- **Data:** reads/writes `Ticket.status`, `checked_in_at`.
- **APIs:** `POST /tickets/verify` (validates signature + marks checked-in atomically).
- **Acceptance criteria:**
  - [ ] Check-in is **atomic and single-use** (a valid ticket can be checked in exactly once).
  - [ ] Tampered/forged tokens are rejected (signature verified server-side).
  - [ ] Works on a standard mobile browser with camera permission.
- **Not in v1:** offline scanning/sync.

## P10 — My tickets / My events (attendee)
- **Purpose:** attendee's record of bookings.
- **Users:** attendee.
- **Components:** tabs — Upcoming / Past / Cancelled; ticket access, directions, **review CTA after attendance**.
- **States:** empty · has bookings · loading.
- **Data:** reads `Booking`, `Ticket`, `Event`.
- **APIs:** `GET /bookings/mine`.
- **Acceptance criteria:**
  - [ ] Review CTA appears **only** for events the user checked into.
  - [ ] Cancelled/refunded bookings clearly labelled.
- **Not in v1:** "leave event" self-cancel with auto-refund logic (v1: contact organizer), favourites.

## P11 — Review submission + organizer response
- **Purpose:** verified-attendance-only reviews (trust weapon vs leakage).
- **Users:** attendee (checked-in); organizer (responds).
- **Components:** rating + comment; organizer one-time response.
- **States:** eligible · submitted · responded.
- **Data:** writes `Review` (gated on `Ticket.checked_in`).
- **APIs:** `POST /reviews`, `POST /reviews/:id/respond`.
- **Acceptance criteria:**
  - [ ] Server rejects reviews from users who did not check in.
  - [ ] Aggregate rating on P2/P4 updates from verified reviews only.
- **Not in v1:** review photos, editing after submit.

## P12 — Settings
- **Purpose:** minimal account controls.
- **Users:** any authenticated user.
- **Components:** name/city edit, notification preferences (WhatsApp/email toggles), logout, **delete account**, links to Terms/Privacy/Help.
- **APIs:** `PUT /me`, `POST /me/delete`.
- **Acceptance criteria:**
  - [ ] Delete account removes/anonymises PII per policy and writes an `AuditLog`.
- **Not in v1:** granular privacy controls, communication-channel-per-event settings.

---

# PART IV — FUNCTIONAL (FRD): cross-page flows

## F1 — Booking → Payment (the critical path)
1. Attendee taps Reserve on P4 → auth gate if needed.
2. `POST /bookings`: server creates a **pending** `Booking` + Razorpay order (with **idempotency key**), atomically checks capacity.
3. Client opens Razorpay checkout.
4. Razorpay → `POST /webhooks/razorpay`: server **verifies signature**, marks `Booking.paid`, decrements capacity, generates `Ticket`.
5. Trigger F3 (notifications): WhatsApp + email ticket.
6. Client polls/receives confirmation → P6.
- **Failure handling:** payment failed → booking stays pending/expired, capacity released; webhook is the source of truth even if the client drops.

## F2 — Check-in
1. Organizer opens P9 → scans QR.
2. `POST /tickets/verify`: verify signature → check status → if `valid`, atomically set `checked_in` (single-use) → return result.
3. Unlocks review eligibility for that attendee (P11).

## F3 — Notifications (WhatsApp + email)
- **Utility templates (cheap, ~₹0.12–0.15 each):** booking confirmed, 24h reminder, 3h reminder, venue/time change, cancellation + refund, review request.
- **Rules:** reminders scheduled off `Event.starts_at`; sent via **WhatsApp Cloud API**; email fallback always. **Organizer promotional broadcasts are metered/paid** (Phase 2) because marketing templates cost ~₹1+.

## F4 — Cancellation & refund
- **Event cancel (P8):** refund all paid bookings via Razorpay, set event `cancelled`, notify all attendees (F3), write `AuditLog`.
- **Single refund (P8):** organizer refunds one booking; ticket → cancelled; notify; `AuditLog`.

## F5 — Auth & session
- Phone OTP or Google → session (httpOnly, secure cookie or equivalent). First login captures name/city. Every mutating API re-checks identity + role server-side.

---

# PART V — TECHNICAL

## 6. Technical requirements

### 6.1 Stack
| Layer | Choice | Why |
|---|---|---|
| Frontend / SSR | **Next.js (React) PWA** | Server-rendered event/profile pages = shareable previews + Google indexing = the growth loop |
| DB | **Supabase (Postgres)** ✅ locked | Bundles Postgres + auth + storage → fastest path to a working v1; still plain Postgres underneath if we ever migrate |
| Payments | **Razorpay** Standard Checkout → **Route** for payouts | Route handles split settlements, sub-merchant KYC, RBI/AML compliance out of the box |
| Messaging | **WhatsApp Cloud API (direct from Meta)** ✅ locked + email | Best developer experience and lowest cost (no BSP markup); official docs + SDK. **Fallback if Meta onboarding/verification is painful: Gupshup** (most API-first managed BSP) |
| Hosting | **Netlify** (already connected) | Near-zero deploy effort |
| QR | Signed **JWT** tokens, verified server-side | Screenshots can't be forged/reused |

### 6.2 Data model (entities & key fields)
> Build the **many-to-many Event↔Organizer** relationship from day one (co-host UI comes later, but retrofitting the schema is painful).

- **User** — `id, phone, email, name, city?, google_id?, default_role, created_at`
- **OrganizerProfile** — `id, user_id→User, handle (display), handle_normalised (unique, case-insensitive), handle_history(jsonb: [{old_handle, released_at}]), bio, city, profile_photo?, intro_video_url?, social_links(jsonb), verification_status(enum: unverified|verified), metrics_cache(jsonb), created_at`
- **Event** — `id, slug(unique), title, category, description, starts_at, ends_at, venue_name, maps_url?, landmark?, capacity, price, is_free, currency, cover_media?, photos(array), what_to_bring?, materials(enum: included|byo), materials_addon_price?, cancellation_policy?, languages(array), age_suitability?, tags(array), status(enum: draft|published|cancelled|completed), created_at`
- **EventOrganizer** (join) — `event_id→Event, organizer_id→OrganizerProfile, role(enum: primary|cohost)` *(cohost unused in v1 UI)*
- **Booking** — `id, event_id→Event, attendee_user_id→User, seats, guest_names(jsonb), amount, platform_fee_amount, payment_status(enum: pending|paid|failed|refunded|cancelled), razorpay_order_id?, razorpay_payment_id?, idempotency_key, created_at`
- **Ticket** — `id, booking_id→Booking, qr_token(signed), status(enum: valid|checked_in|cancelled), checked_in_at?`
- **Review** — `id, event_id→Event, booking_id→Booking, attendee_user_id→User, rating(1–5), comment?, organizer_response?, created_at` *(insert gated on checked_in)*
- **AuditLog** — `id, actor_user_id?, action, entity_type, entity_id, metadata(jsonb), created_at`
- **Report** — `id, event_id→Event, reporter_user_id?, reason(enum), note?, created_at`
- **ReservedHandle** — `handle (unique), reason(enum: system|offensive|premium|redirect_grace), reserved_until?` *(powers the blocklist + the post-change grace hold from P2)*
- *(Parked: WaitlistEntry, Message/Thread — Phase 2.)*

### 6.3 API surface (Phase 1)
- **Auth:** `POST /auth/request-otp` · `POST /auth/verify-otp` · `GET /auth/google/callback` · `GET /me` · `PUT /me` · `POST /me/delete`
- **Organizer:** `POST /organizer/profile` · `PUT /organizer/profile` · `GET /o/:handle`
- **Events:** `POST /events` · `PUT /events/:id` · `POST /events/:id/publish` · `POST /events/:id/cancel` · `GET /e/:slug` · `GET /events/mine` · `POST /events/import-instagram`
- **Bookings:** `POST /bookings` · `GET /bookings/:id` · `GET /bookings/mine` · `GET /events/:id/bookings` · `POST /bookings/:id/refund`
- **Payments:** `POST /webhooks/razorpay` *(signature-verified, source of truth)*
- **Tickets:** `GET /tickets/:id` · `POST /tickets/verify`
- **Reviews:** `POST /reviews` · `POST /reviews/:id/respond`
- **Media/misc:** `POST /uploads/sign` · `POST /reports`

### 6.4 Integrations
- **Razorpay:** Standard Checkout first; migrate to **Route** when real payouts begin (linked sub-merchant accounts, KYC via Route onboarding, split settlement, refund reversal). **You store IDs + status only — never raw payment data.** **Platform-fee mechanics:** the 5% is realised at settlement via Route's split — the organizer's linked account receives *(ticket total − 5%)*, Aikyam's account receives the 5%; on refund the split reverses. (If you switch to *attendee-added*, add 5% to the order amount at booking time instead.)
- **WhatsApp Cloud API (direct):** register a WABA (India, INR billing) via Meta, complete Meta Business verification, get **utility** templates approved (confirmation, 24h, 3h, change, cancellation, review). No BSP markup → ~₹0.12–0.15 per utility message; budget ~₹0.60–0.80 all-in per attendee for the full lifecycle. *(If Meta verification stalls the launch, switch to Gupshup as a managed BSP — same templates, small markup, less setup.)*
- **Maps:** store a Google Maps link (no paid Maps API needed for v1).

### 6.5 Security requirements (non-negotiable)
- [ ] **Webhook-verified payments** — mark paid only on signature-verified Razorpay webhook; never trust client "success."
- [ ] **Idempotency keys** on booking/payment creation → no double charge.
- [ ] **Signed, single-use QR tickets** — verified server-side; check-in invalidates atomically.
- [ ] **Rate limiting** on OTP endpoints (per phone + per IP) → block OTP bombing/enumeration.
- [ ] **Server-side RBAC** on every mutation (organizer vs attendee) — UI hiding is not authz.
- [ ] **PII minimization** — no passwords stored (OTP/OAuth only); no raw card data; collect only what's needed.
- [ ] **Signed, expiring URLs** for private data (attendee-list exports).
- [ ] **Atomic capacity decrement** — DB-level guard against overbooking under concurrency.
- [ ] **Append-only AuditLog** on refunds, payouts, cancellations, account deletion.
- [ ] **Content-moderation hook** (even manual) on event text/images before/after publish.
- [ ] **HTTPS everywhere**, httpOnly+secure session cookies, CSRF protection on state-changing routes.
- [ ] **Input validation server-side** on all endpoints (never trust client).

---

# PART VI — BUILD SEQUENCE (page by page, feature by feature)

> Build in **vertical slices**. Each slice ends with something **demoable** and a clear **definition of done**. Do **not** start the next slice until the current one is deployed and works end-to-end.

### Slice 0 — Foundation
- **Build:** repo, Next.js + **Supabase** (Postgres + Auth + Storage), full **schema** (incl. Event↔Organizer m2m, `ReservedHandle`, `handle_history`), Supabase Auth wired for phone-OTP + Google, Netlify deploy pipeline, `CLAUDE.md` project file. **Also today:** kick off **Razorpay Route KYC** + **Meta WhatsApp Business verification** (long-lead — see Part VII).
- **Done when:** an empty app is live on a real URL and the DB has all tables.
- **Demo:** "here's the deployed shell + schema."

### Slice 1 — Identity + Organizer profile *(P1, P2)*
- **Build:** phone OTP + Google auth, first-login profile capture, claim `@handle`, public link-in-bio page (SSR + OG tags).
- **Done when:** a user can sign up and share `aikyam.app/@handle` with a correct WhatsApp preview.
- **Demo:** your own live organizer profile (even with no events).

### Slice 2 — Create + view an event *(P3, P4)*
- **Build:** creation wizard (draft→publish), media upload (optional), public event page (SSR + OG), Instagram-import (nice-to-have within this slice).
- **Done when:** organizer publishes an event → gets a shareable `aikyam.app/e/:slug` that renders fully.
- **Demo:** publish a real Pune event and share the link.

### Slice 3 — Book + pay + ticket *(P5, P6, F1)*
- **Build:** seat selection + guest names, Razorpay checkout, webhook confirmation, atomic capacity, signed QR ticket, confirmation screen. *(Requires Razorpay account — start in Slice 0.)*
- **Done when:** a real ₹ booking completes and produces a valid ticket; overbooking is impossible.
- **Demo:** book a seat on a live event with a real payment.

### Slice 4 — WhatsApp lifecycle *(F3)*
- **Build:** WhatsApp Cloud API integration, approved utility templates, ticket-on-WhatsApp, scheduled 24h/3h reminders, email fallback. *(Requires WABA + template approval — started in Slice 0.)*
- **Done when:** booking → ticket + reminders arrive on WhatsApp and email.
- **Demo:** a booking that texts you the ticket, then reminds you.

### Slice 5 — Run the day *(P7, P8, P9, F2)*
- **Build:** organizer dashboard, per-event attendee list + export, browser QR check-in (atomic, single-use), manual "offer seat."
- **Done when:** organizer can see attendees and check them in on a phone.
- **Demo:** scan a ticket at a mock door; count updates.

### Slice 6 — Trust loop *(P8 refunds, P10, P11, F4)*
- **Build:** event cancel → auto-refund + notify, single refund, attendee "my tickets," check-in-gated reviews + organizer response, AuditLog on all money moves.
- **Done when:** a cancelled event refunds everyone; only attendees can review.
- **Demo:** cancel → refund → attendee reviews.

### Slice 7 — Hardening + settings *(P12 + security pass)*
- **Build:** settings + delete account, full run through the **security checklist (6.5)**, mobile QA, edge-case cleanup, content-moderation hook.
- **Done when:** every box in 6.5 is checked and the app survives a hostile-input pass.
- **Demo:** hand to your 10 Phase-0 organizers.

---

# PART VII — EXTERNAL DEPENDENCIES & TIMELINE

- **Active build with Claude Code:** ~**5–6 weeks** of focused daily work for Phase 1.
- **Calendar time:** ~**8–12 weeks**, because of two external gates (start both in Slice 0):
  1. **Razorpay Route / marketplace KYC** — ~1–3 weeks of compliance back-and-forth.
  2. **WhatsApp Business (Meta verification) + template approval** — ~3–10 business days per template, can loop on rejection.
- **Phase 0 (concierge, no code):** can start **today** in parallel.

---

# Appendix A — Parked backlog (nothing is lost)

**Phase 2 (after ~50+ events/month in Pune):** home feed + city/category/date/free-paid filters · saved events/favourites · follow-organizer · series/recurring events · **co-host UI + permissions** · group-booking split-UPI · post-event photo drop · attendee self-cancel + auto-refund · organizer promotional broadcasts (metered) · waitlist auto-promotion.

**Phase 3 (trust & scale):** verification tiers 0/1/2 + public metrics + featured placement · organizer analytics · messaging composer with templates/tokens · venue-partner ("host at my café") supply motion · second city · native app wrapper (unlocks Apple login, push).

**Never (by design):** subscription-to-exist · per-RSVP attendee fee · password storage · raw payment-data storage · unused gov-ID storage · client-side-only capacity/payment truth.

---

# Appendix B — Decisions (locked in v0.2)

| # | Decision | Resolution |
|---|---|---|
| 1 | **DB host** | **Supabase** — Postgres + Auth + Storage bundled (fastest v1). |
| 2 | **WhatsApp** | Optimise for **API/dev experience** → **Meta WhatsApp Cloud API (direct)**; **Gupshup** as managed-BSP fallback if Meta onboarding stalls. Confirm at Slice 0. |
| 3 | **Launch categories** | **All Pune cultural categories at once** — broader discovery variety; density pursued at the *city* level, not per-category. |
| 4 | **Platform fee** | **Live from event #1**, default **5% (configurable)**, **organizer-absorbed** via Route split (see §1.5). Rate is the primary dial if supply resists. |
| 5 | **Handles** | Purpose-built **`@`-namespaced, auto-generated, redirect-on-change** system — full spec in **P2**. |

**One sub-detail still open:** fee **bearer** — organizer-absorbed (JAD default) vs attendee-added. Say which and I'll flip it across §1.5, P5, and §6.4 in one pass.

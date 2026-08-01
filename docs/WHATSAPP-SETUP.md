# WhatsApp Business — verification & setup checklist

Everything Meta needs before Aikyam can send WhatsApp messages. **Start this
early** — it runs on calendar time (approvals), not code time. The app code for
WhatsApp isn't built yet; this unlocks it.

**What this unlocks (two things, one verification):**
1. **WhatsApp ticket delivery + reminders** — the JAD's core differentiator (F3).
2. **WhatsApp OTP login** — replaces SMS OTP and, unlike SMS, needs **no TRAI/DLT
   registration** (DLT governs carrier SMS; WhatsApp is over-the-top).

---

## Phase 0 — Before you start, gather these

**A phone number for WhatsApp** (the most common blocker)
- [ ] A number that is **NOT currently registered on WhatsApp** — not on regular
      WhatsApp *or* the WhatsApp Business app. If it is, delete that account first
      (in the app: Settings → Account → Delete my account) and wait a few minutes.
- [ ] It must be able to receive an **SMS or voice call** once, to verify.
- [ ] Once attached to the API it **cannot be used in the WhatsApp app again**.
      Use a dedicated number — do not use your personal one.

**Business identity documents** (must match each other *exactly*)
- [ ] Legal business name, registered address, contact phone
- [ ] One of: **GST certificate**, **Certificate of Incorporation**, **Udyam/MSME
      registration**, or **Shop & Establishment licence**
- [ ] Supporting proof if asked: recent utility bill or bank statement showing the
      same name + address
- [ ] A **website** (your Vercel/custom domain) with a visible **Privacy Policy**
      and contact info — verification reviewers do look for this

> **Sole proprietor / not registered yet?** Meta verification generally expects a
> registered entity. Udyam (MSME) registration is free, online, and usually the
> quickest route to a document Meta accepts.

---

## Phase 1 — Meta Business Account

1. [ ] Go to **business.facebook.com** → create a **Business Portfolio**
2. [ ] Enter the **legal** business name — character-for-character as on your
       documents. A mismatch here is the #1 cause of rejection.
3. [ ] Add address, phone, and website
4. [ ] Add yourself as admin; enable 2FA on your Facebook account (required later)

## Phase 2 — WhatsApp Business Account (WABA)

1. [ ] **developers.facebook.com** → **My Apps → Create App** → type **Business**
2. [ ] In the app dashboard, add the **WhatsApp** product
3. [ ] Link it to your Business Portfolio → this creates the **WABA**
4. [ ] Meta gives you a **test number** immediately — you can send test messages to
       up to 5 self-registered recipients before verification. Good for early dev.
5. [ ] **Add your real phone number**: WhatsApp → API Setup → Add phone number →
       set display name → verify via SMS/call
   - The **display name** must relate to your business (e.g. "Aikyam"); Meta
     reviews it and rejects generic or misleading names.

## Phase 3 — Business Verification ⏳ (the long pole)

1. [ ] Business Portfolio → **Settings → Business Info → Start Verification**
       (also reachable via Security Centre)
2. [ ] Upload your document(s); confirm name/address match exactly
3. [ ] Verify via the method offered (email at your domain, phone call, or SMS)
4. [ ] **Submit and wait.** Typically a few business days; can run longer if
       documents mismatch. You'll get a decision in the Business Portfolio.

**While unverified** you're limited (roughly: a small number of unique recipients
per day and up to 2 phone numbers) — fine for development, not for launch.
After verification, messaging limits scale with your quality rating.

## Phase 4 — Message templates

Every business-initiated message needs a pre-approved template. Submit these
(**WhatsApp Manager → Message Templates → Create**), all **Utility** category
except the last:

| Template | Purpose | Category |
|---|---|---|
| `booking_confirmed` | ticket + event details after payment | Utility |
| `reminder_24h` | day-before reminder | Utility |
| `reminder_3h` | starting-soon reminder | Utility |
| `event_changed` | venue/time change | Utility |
| `event_cancelled` | cancellation + refund notice | Utility |
| `review_request` | post-event review ask | Utility |
| `login_otp` | sign-in code | **Authentication** |

Tips that avoid rejection:
- [ ] Keep them **transactional** — no promotional language in Utility templates
      (a single "Book now!" can get it re-categorised as Marketing, which costs
      several times more).
- [ ] Use variables (`{{1}}`) for name/event/time; provide sample values — missing
      samples is a common auto-reject.
- [ ] Expect **~1–5 business days** per template; rejections can be edited and
      resubmitted.
- [ ] Use Meta's **Authentication** template flow for the OTP one (it has a
      built-in copy-code button and cannot be freely worded).

## Phase 5 — Credentials for the app

1. [ ] **System User token (permanent)** — Business Settings → Users → System
       Users → Add → assign the WhatsApp app with **full control** → Generate
       token with scopes `whatsapp_business_messaging` + `whatsapp_business_management`
   - ⚠️ Do **not** ship the temporary token from the API Setup page — it expires
     in ~24 hours. This is the single most common "it worked yesterday" bug.
2. [ ] Collect these three values:

| Env var | Where to find it |
|---|---|
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp → API Setup → next to your number |
| `WHATSAPP_WABA_ID` | WhatsApp → API Setup (WhatsApp Business Account ID) |
| `WHATSAPP_ACCESS_TOKEN` | the System User token from step 1 |

3. [ ] Add all three to **Vercel → Settings → Environment Variables** (tick
       Production, Preview and Development) and to your local `.env.local`.
       Placeholders already exist in `.env.example`.

## Phase 6 — Billing

- [ ] Business Settings → **WhatsApp Accounts → Payment settings** → add a card
      (INR billing). Without this, sending stops after the free allowance.
- Pricing is **per message** and varies by category and country. Utility and
  Authentication messages to India are inexpensive (paise-level); **Marketing is
  many times more** — which is why every template above is Utility. Check Meta's
  current India rate card, since Meta revises pricing periodically.

---

## Fallback if Meta onboarding stalls

The JAD's stated fallback is a managed BSP — **Gupshup** (India-focused) or
**Twilio** (best docs, WhatsApp channel available through Verify for OTP). They
handle the WABA and template plumbing for a small per-message markup, and can be
noticeably faster to get live. Same templates, same concepts — we'd swap the
sending client only.

---

## What I build once you have credentials

- `src/lib/whatsapp.ts` — Cloud API client (template send)
- Wire it alongside email in `src/lib/notifications.ts` so ticket, reminder, and
  cancellation messages go to **both** channels (email stays as the fallback the
  JAD requires)
- Extend `notification_log` with `channel = 'whatsapp'` — the unique constraint
  already covers per-channel dedupe, so no schema change is needed
- WhatsApp OTP on `/login` (the phone-OTP UI already exists; it needs the
  provider channel switched)

## Progress tracker

- [ ] Dedicated phone number ready (not on WhatsApp)
- [ ] Business documents gathered
- [ ] Meta Business Portfolio created
- [ ] WABA created + number added
- [ ] **Business verification submitted** ← start this ASAP
- [ ] Business verification approved
- [ ] Templates submitted
- [ ] Templates approved
- [ ] System User token generated
- [ ] Credentials in Vercel + `.env.local`
- [ ] Billing added

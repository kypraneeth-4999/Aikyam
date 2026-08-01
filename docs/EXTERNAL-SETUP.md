# External setup — the things only a human can do

Slice 0's code is done. These are the accounts, keys, and verifications that gate
the rest of the build. **Start the two long-lead ones (Razorpay Route, WhatsApp)
now** — they run on calendar time, not code time (JAD Part VII).

---

## 1. Supabase project — needed for Slice 1

1. Create a project at <https://supabase.com/dashboard>. Region: **ap-south-1 (Mumbai)**.
2. Project Settings → API. Copy into your local `.env.local` (and later into Vercel):
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`  *(server-only — never expose)*
3. Apply the schema, either:
   - **SQL editor:** paste `supabase/migrations/20260711120000_init.sql` and run; **or**
   - **CLI:** `npx supabase link --project-ref <ref>` then `npx supabase db push`.
4. Auth → Providers:
   - Enable **Phone** and pick an SMS/OTP provider (e.g. MSG91 or Twilio).
   - Enable **Google** — create OAuth credentials in Google Cloud and add Supabase's callback URL.
5. Auth → **URL Configuration** — set **Site URL** to the deployed origin and add
   `https://<your-app>.vercel.app/**` to **Redirect URLs**. Skipping this is what
   breaks Google sign-in: GoTrue discards an unlisted `redirect_to` and sends the
   auth code to the Site URL instead. Repeat for every origin you host on.

## 2. Vercel — deploy the shell (Slice 0 "done")

1. **Add New → Project** → import `kypraneeth-4999/Aikyam` from GitHub. The
   Next.js preset is detected automatically; leave build settings alone.
2. Settings → Environment Variables: add the three Supabase vars above, plus
   `NEXT_PUBLIC_SITE_URL` = your Vercel URL (with `https://`). Add them **before**
   the first build — `NEXT_PUBLIC_*` values are inlined at build time.
3. Deploy → confirm the shell loads at the live URL.

Full detail, including the build-cache trap, is in [`HOSTING.md`](HOSTING.md).

## 3. Razorpay Route / marketplace KYC — long-lead, needed Slice 3

1. Create a Razorpay account; request **Route** (marketplace split settlements).
2. Complete business KYC. Expect **~1–3 weeks** of compliance back-and-forth.
3. Later: keys → `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`; webhook secret → `RAZORPAY_WEBHOOK_SECRET`.

## 4. Meta WhatsApp Business — long-lead, needed Slice 4

1. Create a Meta Business account + WhatsApp Business Account (WABA), **INR billing**.
2. Complete Meta Business verification.
3. Submit **utility** templates for approval: booking confirmed · 24h reminder · 3h
   reminder · venue/time change · cancellation + refund · review request.
   **~3–10 business days** each; can loop on rejection.
4. Later: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_WABA_ID`.
5. Fallback if Meta onboarding stalls: **Gupshup** (managed BSP, same templates).

---

## Env var → where it's used

| Var | Used by | Slice |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | auth + all RLS reads | 1 |
| `SUPABASE_SERVICE_ROLE_KEY` | trusted server routes (payments, tickets, refunds) | 3 |
| `PLATFORM_FEE_BPS` | platform-fee calculation | 3 |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | checkout + webhook | 3 |
| `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_WABA_ID` | notifications | 4 |
| `QR_JWT_SECRET` | single-use ticket signing | 3 |

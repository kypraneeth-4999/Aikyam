# Moving from Netlify to Vercel

Netlify's free build credits ran out mid-development, pausing production deploys.
Vercel builds Next.js natively (no runtime plugin), so the move is mostly
copying environment variables and updating three URLs.

**Nothing in the app code is Netlify-specific.** `next.config.ts` is empty, all
hosting behaviour lives in config files, and `netlify.toml` is left in place so
you can fall back at any time.

---

## 1. Import the project

1. Go to **vercel.com** → sign in **with GitHub**
2. **Add New → Project** → import `kypraneeth-4999/Aikyam`
3. Framework preset auto-detects **Next.js** — leave build settings alone
4. **Don't deploy yet** — add the environment variables first (step 2)

## 2. Environment variables

**Settings → Environment Variables.** Copy each value from your local
`.env.local`, and tick **all three** environments (Production, Preview,
Development) unless noted.

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | from `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | from `.env.local` (secret) |
| `NEXT_PUBLIC_SITE_URL` | your Vercel URL, **with `https://`** — set after the first deploy, then redeploy |
| `PLATFORM_FEE_BPS` | `500` |
| `QR_JWT_SECRET` | from `.env.local` |
| `RAZORPAY_KEY_ID` | from `.env.local` |
| `RAZORPAY_KEY_SECRET` | from `.env.local` |
| `RAZORPAY_WEBHOOK_SECRET` | from `.env.local` |
| `RESEND_API_KEY` | from `.env.local` |
| `EMAIL_FROM` | `Aikyam <onboarding@resend.dev>` |
| `CRON_SECRET` | from `.env.local` |

```bash
notepad "C:\Users\Praneeth Krishna\dev\Aikyam\.env.local"
```

> `CRON_SECRET` is special on Vercel: when it's set, Vercel Cron automatically
> sends `Authorization: Bearer <CRON_SECRET>` — exactly what
> `/api/cron/reminders` already checks. No code change needed.

Then **Deploy**, and note your URL (e.g. `https://aikyam.vercel.app`).

> ⚠️ **`NEXT_PUBLIC_*` variables are baked into the browser bundle at build
> time, not read at runtime.** Adding one to the dashboard changes nothing until
> a build runs *with it present* — and a redeploy that reuses the build cache
> can keep serving the old bundle. This is what broke Google sign-in on 1 Aug:
> the server had the keys, the client JS didn't, so *Continue with Google*
> silently did nothing. If you add or change any `NEXT_PUBLIC_*` value,
> **Redeploy with "Use existing Build Cache" unticked.**

## 3. Point everything at the new URL

Three places still reference the Netlify domain:

1. **Vercel** → `NEXT_PUBLIC_SITE_URL` = your Vercel URL → **Redeploy**
   (OG tags, ticket links and emails are all built from this)
2. **Supabase → Authentication → URL Configuration**
   - Site URL → your Vercel URL
   - Redirect URLs → add `https://<your-app>.vercel.app/**`
   (without this, Google sign-in fails on the new domain)
3. **Razorpay → Account & Settings → Webhooks** → edit the webhook URL to
   `https://<your-app>.vercel.app/api/webhooks/razorpay`
   (keep the same secret; leave `payment.captured` + `order.paid` ticked)

Google OAuth itself needs no change — its callback points at Supabase, not at us.

## 4. Reminders (the one real difference)

Netlify ran an hourly scheduled function. **Vercel's Hobby plan only runs cron
once per day**, which is too coarse for a 3-hour reminder, so the hourly trigger
moves to **GitHub Actions** (free, and host-independent):

1. GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**
   - `SITE_URL` = your Vercel URL (no trailing slash)
   - `CRON_SECRET` = the same value as in Vercel
2. **Actions** tab → *Event reminders* → **Run workflow** to test it now
   — a successful run prints `{"ok":true,...}`

`vercel.json` also registers a once-daily cron as a backstop. Running both is
safe: `notification_log` has a unique constraint per booking + kind + channel,
so nobody can be messaged twice.

*On Vercel Pro you can skip GitHub Actions entirely — change `vercel.json`'s
schedule to `0 * * * *` and disable the workflow.*

## 5. Verify

- [ ] Home page loads on the Vercel URL
- [ ] **Google sign-in works** (needs step 3.2)
- [ ] An event page shows the host card, gallery and directions
- [ ] A test-card booking completes and issues a QR ticket (needs step 3.3)
- [ ] The reminders workflow returns `{"ok":true}`

## 6. Afterwards

- Netlify: leave the site up until Vercel is verified, then delete it (or keep
  it as a spare — `netlify.toml` still works, including the `[deploy]` build gate).
- If you buy a domain later, add it in **Vercel → Settings → Domains** and repeat
  step 3 with the new hostname.

## Cost note

Vercel's **Hobby tier is free but not licensed for commercial use** — Aikyam
charges a platform fee, so once you're taking real money you'd move to **Pro**
(~$20/month; check current pricing). Fine for testing until then.

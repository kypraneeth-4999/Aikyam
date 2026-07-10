# Aikyam

The organizer's platform for small, hyperlocal cultural events in Pune, India —
pottery classes, poetry evenings, heritage walks, folk-art workshops. Organizers
get a free toolkit (beautiful event page + payments + WhatsApp automation + QR
check-in); attendees discover and book authentic local experiences with trust.

Mobile-first PWA · **Next.js + Supabase + Razorpay + WhatsApp Cloud API**.

## Status

Phase 1 — **Slice 0 (foundation)**. See [`docs/JAD.md`](docs/JAD.md) for the full
spec and [`CLAUDE.md`](CLAUDE.md) for engineering conventions.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase keys
npm run dev                  # http://localhost:3000
```

Applying the database schema and provisioning the external services (Supabase,
Netlify, Razorpay, WhatsApp) is described in
[`docs/EXTERNAL-SETUP.md`](docs/EXTERNAL-SETUP.md).

## Project layout

| Path | What |
|---|---|
| `src/app` | Next.js App Router routes |
| `src/lib/supabase` | Browser / server / admin Supabase clients |
| `src/config` | Tunable app config (platform fee, etc.) |
| `supabase/migrations` | Database schema (source of truth) |
| `docs/` | JAD spec + setup guides |

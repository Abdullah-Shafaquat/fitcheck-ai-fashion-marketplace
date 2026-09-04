# FitCheck — Production Deployment

Deployment runbook for the FitCheck e-commerce marketplace (Next.js 16 / React 19 / Prisma 5 /
PostgreSQL / Neon). Follow this only when the external configuration items in
`docs/FINAL_PRODUCTION_CHECKLIST.md` and `docs/production-readiness.md` are in place.

**IMPORTANT:** This document is a runbook for a future deploy. It was written, not executed,
during Phase 8 (no build/dev/server was run per the phase restriction).

## Pre-requisites (must be resolved before deploy)

- [ ] Live payment credentials: Safepay live keys + webhook secret; JazzCash + Easypaisa merchant
      approval and credentials. Until then those providers remain sandboxed / hard-blocked.
- [ ] A production host and a live PostgreSQL/Neon database.
- [ ] Carrier/tracking credentials and registration in `lib/shipping`.
- [ ] Monitoring/backup providers and a DB backup + restore plan.

## Environment variables

Set all of the following in the production environment (see `.env.example` for the full list and
comments). Values are never committed; the `.env` file holds key names only in this repo.

- `DATABASE_URL` — production Prisma connection string (PostgreSQL/Neon).
- `ADMIN_USERNAME`, `ADMIN_PASSWORD` — admin login credentials.
- `ADMIN_AUTH_SECRET` — HMAC signing secret for the admin session cookie (must be a long random
  value; the code throws if a dev fallback is used in production).
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
  `NEXT_PUBLIC_GOOGLE_CLIENT_ID` — Google auth (if enabled).
- `SAFTPAY_PUBLIC_API`, `SAFTPAY_Secret_key`, `SAFTPAY_MODE`, `SAFEPAY_WEBHOOK_SECRET` — Safepay
  payment provider (set `SAFTPAY_MODE=live` + live keys + webhook secret; legacy
  `SAFTPAY_WEBHOOK_SECRET` is accepted as a fallback alias).
- `JAZZCASH_MERCHANT_ID`, `JAZZCASH_PASSWORD`, `JAZZCASH_INTEGRITY_SALT`, `JAZZCASH_RETURN_URL` —
  JazzCash (enables that provider; otherwise hard-blocked).
- `EASYPAISA_MERCHANT_ID`, `EASYPAISA_HASH_KEY`, `EASYPAISA_RETURN_URL` — Easypaisa (enables that
  provider; otherwise hard-blocked).
- `NEXT_PUBLIC_SITE_URL` (or `APP_URL`) — canonical origin used by metadata, sitemap and robots
  (falls back to `NEXTAUTH_URL`, then localhost).

## Database

1. Provision the production database and apply the schema:
   - `npm run db:generate`
   - `npm run db:push` (or `prisma migrate deploy` if using migrations) — **schedule a window** so
     this does not disturb existing traffic.
2. Add the recommended indexes in the same window (see `docs/FINAL_PRODUCTION_CHECKLIST.md`):
   `Product(category, subCategory, gender, isActive)`, `SellerEarning(sellerId, kind)`.
3. Seed any launch data (`npm run db:seed`) if applicable.
4. Confirm backup + restore drill before go-live.

## Build & deploy

1. Run the production build in your CI/host: `npm run build` (static type-check used during this
   audit as a stand-in; the actual build runs at deploy time in your pipeline).
2. Start the server with the production runtime (e.g. `npm run start` / platform-managed server).
3. Health check: `GET /api/health` must return `200` with `services.database === "ok"`.
4. Smoke-test after deploy: login (customer/seller/admin), homepage SEO tags,
   `/sitemap.xml`, `/robots.txt`, a check-out + webhook callback in each configured provider,
   and a seller verification upload.

## Operations

- Route logs (`lib/logger` JSON lines) to a collector; alert on `error`-level events e.g. payment/
  webhook/import failures.
- Back up Postgres on a schedule and periodically restore to a scratch DB to validate.
- For horizontal scaling, replace the in-memory rate limiter with a shared Redis-backed limiter.

## Notes & limitations

- `robots.txt` is a crawl hint only — never a security boundary (private routes are authorized
  server-side regardless).
- Carrier events are not faked; tracking shows real data only once a carrier is integrated.

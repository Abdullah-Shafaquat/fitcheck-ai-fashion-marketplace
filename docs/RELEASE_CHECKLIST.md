# FitCheck — Release Checklist (go / no-go gate)

A concise go / no-go gate for shipping FitCheck. Every line must be resolvable before a public
production release. For the full itemized audit, see `docs/FINAL_PRODUCTION_CHECKLIST.md`; for the
deploy runbook, see `docs/production-deployment.md`.

Status legend: `?? NO-GO` (must be fixed before release) · `ok` (verified) · `n/a` (not applicable).

## Go / No-Go

- [ ] **Live payment credentials present** — Safepay live + webhook secret; JazzCash + Easypaisa
      merchant credentials (or explicitly disabled for launch). NO-GO if a checkout advertises a
      provider without working credentials.
- [ ] **Payment verification verified** — a real (sandbox/live) webhook + verify round-trip
      confirmed in each enabled provider; idempotency and duplicate-callback protection observed.
- [ ] **Shipping / tracking** — at least one carrier registered, or the checkout/order UI clearly
      disabled/placeholder for shipping affiliations (no faked events).
- [ ] **Production DB provisioned** — live PostgreSQL/Neon, schema applied, recommended indexes,
      backup + restore drill passed.
- [ ] **Secrets provisioned** — all env vars set; no dev fallback secrets reachable in production
      (the auth libs throw rather than weaken when unset).
- [ ] **Health check green** — `/api/health` returns 200 with DB ok.
- [ ] **Monitoring wired** — log collector consumes `lib/logger` output; error alerting on.
- [ ] **Customer / seller / admin smoke tests pass** — login, catalog, cart, checkout, order,
      tracking, seller verification, admin approvals, import/export.
- [ ] **SEO live** — homepage/product/category metadata present; `/sitemap.xml` + `/robots.txt`
      served and correct.
- [ ] **No known critical security issue** — IDOR/authorization/upload/secrets audit clean.

## Blockers summary (must all be resolved)

1. Live payment credentials / approval (Safepay live, JazzCash, Easypaisa).
2. Carrier/shipping credentials + registration.
3. Deployment environment + env vars + live database.
4. Recommended DB index migration window.
5. Monitoring/backup infrastructure.

## Decision

- All NO-GO items cleared  → **READY FOR PRODUCTION**.
- Only external-config/environment items remain (no code defect) → **READY FOR PRODUCTION AFTER
  EXTERNAL CONFIGURATION** (current status).
- Any critical code/security/data-integrity defect → **BLOCKED** (none known at this time).

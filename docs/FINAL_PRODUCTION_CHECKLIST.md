# FitCheck — FINAL PRODUCTION CHECKLIST

Applies to the FitCheck e-commerce marketplace (Next.js 16 / React 19 / Prisma 5 / PostgreSQL / Neon).

Status legend:
- `[x]` — verified present and working at the code level (this session's Phase 8 audit).
- `[~]` — present but with a documented follow-up / non-blocking caveat.
- `[ ]` — NOT yet done; requires external credential, deployment-environment config, or a dedicated task.
- A blank/cosmetic-only item is never marked `[x]`; a feature is only complete when frontend + backend + DB + authorization + validation + error handling are all implemented.

---

## SECURITY

- [x] Authentication protected (customer HMAC 30d / seller 7d / admin 7d, expired + timing-safe compare)
- [x] Authorization server-side on every sensitive route (requireCustomer / requireSeller / requireAdmin)
- [x] Ownership checks (orders by email, addresses by email, notifications by userId, seller products/orders/earnings by sellerId)
- [x] IDOR audit completed — no live gaps found
- [x] Input validation + explicit allowlists on mutations (fulfillment status, payment state, order transitions, refund/cancel reasons)
- [x] File upload restrictions (MIME + size via validateVerificationFile; product images admin-only)
- [x] Secrets protected (env only; never logged, returned, or shipped to client; dev fallbacks throw in production)
- [x] Payment security (server-side amount verify, authoritative order total, idempotent markPaid)
- [x] Webhooks (Safepay now fail-closed on missing/invalid signature when credentials configured; JazzCash/Easypaisa verify signatures + amount)
- [x] Sensitive document access (CNIC/video under private/uploads/verification, auth-guarded with traversal guard)
- [~] `/api/upload` (admin product images) trusts client-claimed MIME (no magic-byte read) — low risk, admin-only
- [~] Rate limiting is in-memory (per-instance) — needs shared Redis at horizontal scale

## DATABASE

- [x] Schema represents all entities (Product, Order, User, SellerProfile, Address, Notification, Earnings, Payout, Verification, AuditLog)
- [~] Indexes — hot fields indexed; recommended (not applied, needs migration on live Neon): Product.category/subCategory/gender/isActive, SellerEarning(sellerId,kind)
- [~] Queries — N+1 in seller-earnings transaction paths + getMarketplaceGMV flagged for a dedicated, tested change
- [x] Constraints — unique slug/sku/orderNo/clientRef; FK relations present
- [~] Pagination — storefront paginated; unbounded admin/seller full-list loads documented (frontend must coordinate before capping)
- [ ] Migration safety — recommended index migration requires a scheduled deployment window (no migration applied on live DB)
- [ ] Backup strategy — requires deployment-environment configuration (periodic Neon/Postgres backups + restore drill)

## CUSTOMER

- [x] Search (real DB query, no-results suggestions)
- [x] Categories / subcategories (real taxonomy, server metadata)
- [x] Product listing (server-side filter/sort/paginate)
- [x] Product detail + color/images + size (public-only SEO metadata)
- [x] Cart (stock-clamped, live price validation)
- [x] Checkout (server-computed total, address form labelled)
- [x] Payment (Safepay verify; JazzCash/Easypaisa gated until credentials)
- [x] Orders (email ownership, receipt/invoice)
- [x] Tracking (server-controlled timeline; carrier events require credentials)
- [x] Cancellation / refund (approved-administrated, stock/payment/earnings reverted)
- [x] Notifications (recipient-correct, ownership-guarded)
- [x] Account (profile/password/addresses)

## SELLER

- [x] Registration / apply
- [x] Verification (CNIC + images + live video; admin review; approval gate)
- [x] CNIC (private storage + auth-guarded access, masked serialization)
- [x] Video (private storage + auth-guarded)
- [x] Approval (admin approve/reject; rejection reviewer/date surfaced)
- [x] Products (create/edit/delete + ownership; admin approval for marketplace)
- [x] Orders (own items only; item-level fulfillment allowlist)
- [x] Earnings (credit on Delivered, reverse on cancel/refund, payout)
- [x] Notifications (own-scope)
- [~] Order list loads all orders then filters in JS (perf follow-up, not a leak)

## ADMIN

- [x] Authentication (HMAC admin auth, cookie)
- [x] Dashboard / stats
- [x] Customers (list/detail/edit/block/unblock/suspend/delete)
- [x] Sellers (list/approve/reject/suspend/verify)
- [x] Products (approve/reject/review)
- [x] Orders (status workflow via ALLOWED_TRANSITIONS)
- [x] Refunds / cancellations (approval + completion with reversion)
- [x] Notifications (list/mark-read/clear)
- [x] Analytics (dashboard + catalog + marketplace GMV)
- [x] Import / export
- [x] Server-side role security across all 22 `/api/admin/*` routes

## FRONTEND

- [x] Responsive (no page-level horizontal overflow; tables use contained scroll)
- [x] Accessibility (aria-live toasts, modal roles, labelled icon buttons, checkout/contact/track-order form linkage)
- [x] Reduced motion (global CSS override + GSAP/autoplay now respect prefers-reduced-motion)
- [x] Error handling (app/error, global-error, loading, not-found; sanitized API errors)
- [x] Loading states (branded spinner/skeleton)
- [x] Empty states (present)
- [x] UI consistency (login/register/admin/seller share design tokens; radius/border/colors consistent)
- [x] Animations (smooth; reduced-motion guarded)
- [~] No shared <Spinner>/<EmptyState> component (60+ inline copies) — consistency follow-up, not a user-facing defect

## SEO

- [x] Metadata (root, homepage, product, category, contact, faq; public-only product SEO)
- [x] Canonicals (root, homepage, category, product, contact, faq)
- [x] Sitemap (dynamic, DB-driven, public-only, bounded)
- [x] Robots (blocks private areas; robots not a security boundary)
- [x] Public/private separation (unapproved/inactive products → noindex; admin/seller/account excluded)

## OPERATIONS

- [x] Monitoring (safe health endpoint `/api/health` + logger)
- [x] Logging (`lib/logger.ts` with secret redaction)
- [x] Health check (`/api/health` — DB probe, no secrets)
- [ ] Backup plan — requires deployment-environment configuration
- [ ] Recovery plan — requires deployment-environment configuration
- [ ] Deployment documentation — see `docs/production-deployment.md`

---

## PRODUCTION BLOCKERS (must be resolved before a public production launch)

The following are listed in ascending order of severity. None are code defects; all are external /
environmental. Cosmetic issues are explicitly NOT blockers.

1. `[BLOCKER — EXTERNAL]` **Payment provider live credentials / approval**
   - Safepay is wired but running in **sandbox mode**; requires live (non-sandbox) keys + live webhook secret (`SAFEPAY_WEBHOOK_SECRET`; legacy `SAFTPAY_WEBHOOK_SECRET` accepted as fallback) to confirm real payments.
   - JazzCash and Easypaisa architecture is complete but **checkout is hard-blocked** until valid merchant credentials are provided (`JAZZCASH_*`, `EASYPAISA_*`).
2. `[BLOCKER — EXTERNAL]` **Shipping / tracking provider credentials**
   - `lib/shipping` carrier contract exists but `REGISTRY = {}` (no live carrier). Tracking numbers are admin-entered, not carrier-validated, until a carrier is registered.
3. `[BLOCKER — ENVIRONMENT]` **Production deployment environment + env vars**
   - A production host (e.g. Vercel/Node host), real PostgreSQL (Neon project), and all secrets must be provisioned. `NEXT_PUBLIC_SITE_URL` / `APP_URL` must be set for canonical/sitemap correctness.
4. `[BLOCKER — ENVIRONMENT]` **Database migration window for recommended indexes**
   - Adding `Product(category/subCategory/gender/isActive)` and `SellerEarning(sellerId, kind)` indexes requires a `prisma migrate`/`db push` run against the live DB in a scheduled window.
5. `[BLOCKER — ENVIRONMENT]` **Monitoring/backup infrastructure**
   - Log/metrics collector wiring (Sentry/Datadog/etc.) and Postgres backup + restore plan are not configured. `/api/health` and `lib/logger` provide the hooks.

## EXTERNAL DEPENDENCIES (CODE COMPLETE vs EXTERNAL CONFIG)

| Dependency | Code / Architecture | External config still required |
|---|---|---|
| Safepay | COMPLETE (verify + amount + fail-closed webhook) | Live keys + live webhook secret + non-sandbox mode |
| JazzCash | COMPLETE + hard-gated | Merchant ID / password / integrity salt / return URL + approval |
| Easypaisa | COMPLETE + hard-gated | Merchant ID / hash key / return URL + approval |
| Shipping (carrier) | COMPLETE contract | Carrier API credentials + registration in `lib/shipping/registry` |
| Tracking | Architecture ready (event mapping) | Carrier events (no faked courier events today) |
| PostgreSQL | COMPLETE | Live Neon/Postgres provisioning |
| Redis (rate limiting) | N/A (in-memory now, documented) | Provision if horizontal scaling |
| Email | Hooks present | SMTP/transactional provider + DNS |
| Monitoring | Hooks present (health + logger) | Collector provider + config |
| Object/file storage | Local `private/` + `public/uploads` | Object storage if multi-instance |

## RELEASE DECISION

**Overall: READY FOR PRODUCTION AFTER EXTERNAL CONFIGURATION**

The codebase is audited, hardened (security, SEO, monitoring, accessibility, reduced motion),
and structurally production-ready. No critical code-level defect remains. Launch is blocked only
by the external configuration and deployment-environment items above (live payment credentials,
carrier credentials, deployment/env provisioning, DB index migration window, monitoring/backup
infrastructure). Nothing should be deployed to a public production URL until those are resolved.

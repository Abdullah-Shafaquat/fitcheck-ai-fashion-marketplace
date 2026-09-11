<div align="center">

# FitCheck

### A premium, full-stack fashion e-commerce marketplace

**Customer storefront · Seller marketplace · Admin operations — on one shared design system and data model.**

[![Next.js](https://img.shields.io/badge/Next.js%2016-App%20Router-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React%2019-61DAFB?logo=react&logoColor=000)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS%20v4-06B6D4?logo=tailwindcss&logoColor=fff)](https://tailwindcss.com)
[![Prisma](https://img.shields.io/badge/Prisma%205-2D3748?logo=prisma&logoColor=fff)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL%20%2F%20Neon-4169E1?logo=postgresql&logoColor=fff)](https://neon.tech)
[![Gemini](https://img.shields.io/badge/Gemini%20AI-4285F4?logo=google&logoColor=fff)](https://ai.google.dev)

</div>

---

> **Production status:** `READY FOR PRODUCTION AFTER EXTERNAL CONFIGURATION`
>
> The code is audited, type-checked and hardened, but launch requires live external credentials and infrastructure. See [Production Readiness](#production-readiness).

---

## Table of Contents

- [Overview](#overview)
- [Highlights](#highlights)
- [Features](#features)
  - [Customer](#customer)
  - [Seller](#seller)
  - [Admin](#admin)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Scripts](#scripts)
- [Payments](#payments)
- [Shipping & Tracking](#shipping--tracking)
- [Import / Export](#import--export)
- [Security](#security)
- [Notifications](#notifications)
- [Production Readiness](#production-readiness)
- [Known Limitations](#known-limitations)
- [License](#license)

---

## Overview

FitCheck is a complete, production-oriented **fashion e-commerce marketplace** built with **Next.js (App Router)**, **React 19**, **Prisma** and **PostgreSQL / Neon**, styled with **Tailwind CSS v4**. It ships three surfaces — a polished customer storefront, a seller marketplace with identity verification, and a full admin operations platform — sharing one design system, one brand, and one data model.

### The three surfaces

- **Customer storefront** — browse, discover, buy and track fashion products from the platform and from verified independent sellers, assisted by an **AI shopping agent**.
- **Seller marketplace** — independent brands apply, get identity-verified, are reviewed and approved, then manage products, orders, earnings and payouts.
- **Admin operations** — a professional platform to manage customers, sellers, products, orders, refunds, notifications, analytics, import/export and marketplace settings.

---

## Highlights

- ✨ **Premium editorial design** — a cinematic, light-editorial UI tuned for fashion: CSS-based 3D product cards (tilt, parallax, reveal), GSAP + Motion scroll choreography, accent-halo hero, and a consistent token-based design system in Tailwind CSS v4.
- 🤖 **Gemini AI shopping agent** — a first-class assistant (floating launcher + dedicated page) powered by server-side Google Gemini 2.0 Flash with real function calling against your product catalog. Account-aware (it can reference your orders) and rate-limited per IP.
- 🛍️ **Three-role architecture** — customer, seller and admin surfaces with **separate HMAC-signed sessions** and strict server-side ownership checks.
- 🔐 **Hardened security** — no client-trusted totals, fail-closed webhook verification, auth-guarded uploads with traversal protection, and role-scoped notifications.
- 🧩 **One data model** — customers, sellers, products/variants, orders, reviews, payouts, verifications and audit logs share a single Prisma schema.

---

## Features

### Customer

- **Product discovery** — editorial homepage (hero carousel or cinematic composition, top categories, collection banners, latest arrivals, featured & best sellers, trust badges, newsletter).
- **Search** — fullscreen search overlay with live results and `Ctrl/Cmd+K` shortcut.
- **AI shopping agent** — ask for outfit ideas, "summer dresses under Rs 3,000", or "show me my orders", and get real product recommendations back.
- **Categories** — Men / Women / Kids, plus 35+ subcategories and promo collections (new arrivals, sale, featured).
- **Product variants** — color, size, quantity; selecting a color updates the displayed image to the matching image.
- **Product detail** — gallery with thumbnails + lightbox, rating & reviews, price/old-price/savings, badges, stock status, size guide, accordions, related & recently-viewed.
- **Cart** — images, size/color, quantities, savings, live server-side stock & price validation, price-change warnings, order summary.
- **Wishlist** — saved products with live availability overlays, quick add to cart.
- **Checkout** — 3-step wizard (Shipping → Payment → Review) with saved addresses, COD / online (Safepay, incl. Easypaisa wallet) / JazzCash.
- **Orders & tracking** — order history, order detail with a visual tracking timeline, tracking-by-order-number, receipts (print/download), cancellation & refund requests.
- **Addresses & notifications** — saved address CRUD with default address, per-account notification center.
- **Account** — profile (rendered from real authenticated data), settings, security (password change), notification preferences.

### Seller

- **Registration & application** — multi-step application (personal, business, CNIC, images, live-camera video).
- **Identity verification** — KYC center with per-item statuses; a pending/under-review seller is limited to verification, profile and notifications.
- **Product management** — create/edit/draft products, status tabs (all/active/draft/pending/rejected), low-stock awareness, import/export.
- **Orders & fulfillment** — seller-specific orders with per-item fulfillment status.
- **Earnings & payouts** — balance cards, earnings ledger (sale/refund/commission/payout), payout requests and history.
- **Analytics & notifications** — store performance charts and a notification center.

### Admin

- **Dashboard & analytics** — revenue/order/product stat cards, recent orders, low-stock alerts, and analytics charts.
- **Customer management** — list + detail with account control (activate/deactivate/suspend/block), password reset, admin notes, orders and audit log.
- **Seller & marketplace management** — seller list/detail with KYC review, product moderation (approve/reject), payouts (approve/mark-paid/reject), GMV/commission, marketplace settings.
- **Order management** — full order workflow with status advancement, rejection, cancellation & refund, tracking input and payment actions.
- **Product management** — catalog with filters, bulk/single delete, **import wizard** (upload → map → preview → import → results) and **export** (CSV/XLSX with filters).
- **Notifications** — bell + page with read/unread, mark-read-all, delete, clear-all.
- **Settings** — store settings, blocked-emails blocklist, notifications.

---

## Technology Stack

> This documents the **actual** stack in this repository (see `package.json` — do not assume anything not listed here).

- **Framework:** Next.js 16.x (App Router) · React 19.x
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 (CSS-first config via `@theme` in `app/globals.css`) + `tailwindcss-animate`
- **Database ORM:** Prisma 5 (PostgreSQL)
- **Database:** PostgreSQL (Neon serverless in production)
- **Authentication:** session-based customer auth (HMAC-signed), separate seller & admin auth; Google OAuth sign-in supported
- **AI assistant:** Google Gemini (REST, function calling) — server-side key only
- **Animation:** `motion` (Framer Motion) + `gsap` + `tailwindcss-animate`
- **Icons:** `react-icons`
- **Payments:** Safepay (cards + local wallets incl. Easypaisa, live-integration-ready) & JazzCash (direct hosted checkout, config-gated on JazzCash merchant credentials)
- **Other:** Next.js metadata/SEO, dynamic sitemap & robots

---

## Project Structure

```
.
├── app/                    # App Router pages & route handlers
│   ├── page.tsx            # Homepage
│   ├── [category]/         # Categories & subcategories (shop)
│   ├── shop/               # All-products shop
│   ├── products/[slug]/    # Product detail + SEO layout
│   ├── cart/ wishlist/ checkout/ orders/ track-order/
│   ├── account/            # Customer dashboard/settings/addresses/notifications/reset-password
│   ├── login/ register/ reset-password/ auth/callback/
│   ├── ai-assistant/       # AI shopping agent (full-page variant)
│   ├── admin/              # Admin platform
│   ├── seller/             # Seller platform
│   ├── store/[slug]/       # Public seller storefronts
│   ├── about/ contact/ faq/ shipping/ returns/ privacy/ terms/ size-guide/
│   ├── our-story/ careers/ sitemap/
│   ├── sitemap.ts          # Dynamic sitemap
│   ├── robots.ts           # Robots rules
│   ├── layout.tsx          # Root layout + SEO/metadata
│   └── error/ global-error/ not-found/ loading.tsx
├── Components/             # React components (capitalized folder)
│   ├── ui/                 # Shared UI primitives (Badge, Spinner, Skeleton, EmptyState, StatCard, Modal)
│   ├── layout/             # Header, Navigation, SearchOverlay, Footer, AccountDropdown
│   ├── HomePage/Sections/  # Homepage section components (Hero, BestSellers, etc.)
│   ├── shop/               # ProductCard, CollectionPage, gallery, size guide, breadcrumbs
│   ├── admin/              # Admin components (sidebar, tables, product form, import/export)
│   ├── seller/             # Seller components (import wizard, verification, camera)
│   ├── orders/             # Order timeline, items, status history, cancel/refund modals
│   ├── AI/                 # AI shopping agent (AiAssistant launcher + panel)
│   ├── ThreeD/             # Motion primitives (Parallax, Reveal, TiltCard, Magnetic)
│   └── Receipt/            # Printable order receipt
├── lib/                    # Business logic, auth, context, hooks, helpers
│   ├── context/            # StoreContext (cart/wishlist/recently-viewed)
│   ├── hooks/              # useProducts, useModal, useScrollReveal
│   ├── ai-tools.ts         # Server-side AI search functions for Gemini
│   ├── redirect.ts         # Safe post-login redirect helpers
│   ├── customer-auth.ts    # HMAC-signed customer sessions
│   ├── rateLimit.ts        # IP rate limiting
│   └── logger.ts site.ts   # Logging & site metadata helpers
├── prisma/                 # Prisma schema & seed
├── docs/                   # Roadmap, audit, production & release docs
├── public/                 # Static assets, images, logos, uploads
└── app/globals.css         # Tailwind v4 @theme tokens + design system
```

---

## Getting Started

### Prerequisites

- **Node.js 18+** (Next.js 16)
- A **PostgreSQL** database (local or [Neon](https://neon.tech) serverless)

### Install

```bash
npm install
```

### Configure environment

Copy the template and fill in your values:

```bash
cp .env.example .env
```

See [Environment Variables](#environment-variables) below.

### Synchronize the database

```bash
npm run db:generate   # generate the Prisma client
npm run db:push       # push the schema to your dev database
npm run db:seed       # optional, for sample data
```

### Run

```bash
npm run dev            # http://localhost:3000
```

For the **AI shopping agent** to respond, set `GEMINI_API_KEY` in `.env` (server-side only).

---

## Environment Variables

All secrets are provided at runtime via environment variables. **Never commit real secrets.** A template is provided at `.env.example` — copy it to `.env` and fill in values.

**Required variables** (no value ⇒ app cannot start or protected flows break):

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL / Neon connection string |
| `NEXTAUTH_SECRET` | Session signing secret (keep secret) |
| `NEXTAUTH_URL` | Base URL for auth callbacks (produces `siteUrl()` fallback) |
| `NEXT_PUBLIC_SITE_URL` / `APP_URL` | Canonical site origin (SEO) |
| `ADMIN_AUTH_SECRET` | HMAC secret signing **admin** session cookies (≥16 chars) |
| `SELLER_AUTH_SECRET` | HMAC secret signing **seller** session cookies; falls back to `ADMIN_AUTH_SECRET` if unset |
| `CUSTOMER_AUTH_SECRET` | HMAC secret signing **customer** session cookies; falls back to `ADMIN_AUTH_SECRET` if unset |

**AI assistant (required for the agent):**

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Server-side Google Gemini API key. Never expose via a `NEXT_PUBLIC_` prefix. |

**Payments (external config required):**

| Variable | Purpose |
| --- | --- |
| `SAFEPAY_*` (client/secret, base URL, `SAFEPAY_WEBHOOK_SECRET`) | Safepay live/sandbox integration + webhook signature verification (legacy `SAFTPAY_WEBHOOK_SECRET` accepted as fallback) |
| `JAZZCASH_*` | JazzCash merchant credentials. When set, checkout offers the direct JazzCash hosted-wallet option (IPN webhook confirms the order). Easypaisa needs no credentials of its own — it is offered inside Safepay's hosted checkout. |

**Optional / feature variables:** carrier/tracking credentials for the shipping-tracking registry, email provider, object storage for uploads, and monitoring keys. Refer to `.env.example` and `docs/production-deployment.md`.

---

## Database

- **Technology:** PostgreSQL (Neon serverless in production), accessed through the **Prisma 5** ORM.
- **Schema:** `prisma/schema.prisma` — customers, sellers, admins, products (+ variants: colors, sizes, images), carts, wishlists, orders, order items & status history, addresses, reviews, notifications (per role), earnings/payouts, verification records, audit logs.
- **Migration process:** generate the client with `npm run db:generate`, apply the schema with `npm run db:push`. Production uses the same flow within a maintained migration window.
- **Seed:** optional `npm run db:seed` for sample data.

---

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server (`http://localhost:3000`) |
| `npm run build` | Create a production build |
| `npm start` | Run the built production server |
| `npm run lint` | Run ESLint |
| `npx tsc --noEmit` | Static type-check (recommended verification) |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:push` | Push the Prisma schema to the database |
| `npm run db:seed` | Seed the database with sample data |
| `npm run db:studio` | Open Prisma Studio |

> **Note:** There is no automated test suite configured in this repository. The recommended verification command is `npx tsc --noEmit` alongside the documented read-only audits.

---

## Payments

Only integrations that actually exist are described here:

- **Safepay** — online card payment. Amounts are **verified server-side** from the database (client-controlled totals are never trusted). Callback webhooks verify the HMAC signature and **fail closed** (unverifiable callbacks are rejected) before any order is marked paid. Sandbox development is supported; live mode requires live credentials.
- **JazzCash** — a direct hosted checkout. Amounts and payee are **verified server-side**; the IPN webhook verifies the SecureHash signature and **fails closed** (unverifiable callbacks are rejected) before any order is marked paid. The checkout option is config-gated on JazzCash merchant credentials — there is no fake or placeholder integration.
- **Easypaisa** — not a separate integration. Safepay processes the Easypaisa wallet on its own hosted checkout page (where the merchant account has it enabled), so shoppers select Easypaisa inside the Safepay flow and no additional credentials are required.

External configuration requirements are identified in `docs/production-deployment.md`.

---

## Shipping & Tracking

The shipping/tracking architecture and carrier contract are implemented with an extensible carrier registry. **No live carrier is wired in** (`REGISTRY` is empty until a carrier's credentials are configured), so real tracking events are not fabricated — the timeline shows only states that actually apply. Providing live carrier credentials is an external launch requirement.

---

## Import / Export

- **Admin products:** import via a wizard (upload → column mapping → preview → import → results) and export to CSV/XLSX with filters. `Components/admin/ImportExportModal.tsx` + `ExportModal.tsx`.
- **Seller products:** a dedicated multi-step import wizard and a filtered export dialog. `Components/seller/ImportWizard.tsx` + `ExportDialog.tsx`.

Backend validation/parsing lives in `lib/sellerImportExport.ts`, `lib/sellerExport.ts`, `lib/sellerImport.ts`.

---

## Security

- **Authentication:** separate session types for customer, seller and admin, each with an HMAC-signed token and timed expiry; Google OAuth for customers.
- **Authorization:** every sensitive route/action enforces the correct session server-side and verifies ownership of the resource.
- **Ownership checks:** orders, addresses, cart/wishlist and notifications are scoped to their owner; sellers cannot access other sellers' data.
- **Secret handling:** all secrets are environment-only; never logged. The structured logger redacts secret keys and long values.
- **Safe redirects:** post-login redirects are validated (`lib/redirect.ts`) to prevent open-redirect and role-escalation.
- **File upload security:** upload endpoints are admin/seller-gated; private verification files are stored out of traversal reach and served through an auth-guarded handler with traversal protection.
- **Payment verification:** order amounts are validated server-side; never trust client totals.
- **Webhook security:** Safepay webhooks verify the HMAC signature and **fail closed** when credentials are configured.
- **Rate limiting:** the AI assistant endpoint is rate-limited per IP.

---

## Notifications

Notifications are **role-scoped** across customers, sellers and admins via separate tables/endpoints wired to each role's own auth — a notification for one role is never shown to another. Each surface has a bell/center with read/unread states, timestamps and meaningful messages (order updates, verification status, payout status, admin actions). Implementation detail lives in `lib/notify.ts` and the per-role notification modules.

---

## AI Shopping Agent

The `Gemini AI` agent answers natural-language shopping questions with **real, current catalog data** (not canned responses):

- **Floating launcher** — a pulsing button mounted globally on the customer storefront opens a chat drawer (full-height on mobile, fixed panel on desktop).
- **Dedicated page** — `/ai-assistant` offers a distraction-free full-page chat.
- **Function calling** — the assistant calls server-side tools (`searchProducts`, `getFeaturedProducts`, `getPopularProducts`, `getSaleProducts`, `getCustomerOrders`, and more in `lib/ai-tools.ts`) that query Prisma directly and return public-safe data only.
- **Account-aware** — if a customer is signed in, the assistant can reference their own orders.
- **Server-side only** — the Gemini API key never reaches the browser; the route is IP rate-limited and handles network/quota/malformed-response errors gracefully.
- **Ready to enable:** set `GEMINI_API_KEY` in `.env`.

---

## Production Readiness

- `docs/production-readiness.md` — production-readiness summary.
- `docs/FINAL_PRODUCTION_CHECKLIST.md` — itemized production checklist, blockers and release decision.
- `docs/production-deployment.md` — deployment runbook.
- `docs/RELEASE_CHECKLIST.md` — go / no-go release gate.
- `docs/FITCHECK_ECOMMERCE_AUDIT.md` — current-state audit + Phase 8 P1–P12 verification matrix.
- `docs/FITCHECK_ECOMMERCE_ROADMAP.md` — phased roadmap & progress.

---

## Known Limitations

Be completely honest — these are real, current limitations:

- **Payments:** JazzCash requires JazzCash merchant credentials before the direct hosted-checkout option can process real payments; Safepay requires live mode + webhook secret (Easypaisa is paid through Safepay, no separate keys).
- **Shipping/tracking:** carrier registry is empty until live carrier credentials are provided; no tracking events are fabricated.
- **Gemini agent:** requires `GEMINI_API_KEY` and live network access to the Gemini API; without it the UI loads but the assistant cannot respond.
- **`/admin/settings`** persists store settings to `localStorage` (not a backend).
- **Automated tests:** none configured; verification is static type-check + documented read-only audits.
- **Deferred refinements** (documented, non-blocking): recommended database indexes not yet applied (needs a live migration window); some admin/seller list pages load full datasets without pagination; some admin/seller forms use visually-linked (not `htmlFor`) labels; no shared `Spinner`/`EmptyState` rollout on every page yet.

---

## License

No license file is present in this repository, so none is claimed.

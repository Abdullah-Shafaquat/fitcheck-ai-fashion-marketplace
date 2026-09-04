# FitCheck — Walmart-Level Reference Implementation

**Purpose:** Use Walmart's public e-commerce *functional concepts* as a benchmark to measure
and improve FitCheck's system quality. This document is NOT a visual clone guide — FitCheck
keeps its own branding, logo, colors, typography, and UI language. Walmart is used only as a
reference for e-commerce functionality, UX patterns, feature completeness, navigation logic,
product discovery, account/order workflows, and marketplace-level quality.

> Principle: *"Walmart-level e-commerce functionality and system quality with FitCheck's own
> UI and branding."*

Each feature below follows the same structure:

- **FEATURE** — name
- **REFERENCE CONCEPT** — what large e-commerce does and why it helps users
- **FITCHECK IMPLEMENTATION** — the adapted approach for FitCheck (real data, own UI)
- **CURRENT STATUS** — Already exists / Needs improvement / Missing
- **FRONTEND / BACKEND / DATABASE / API / SECURITY** — required changes
- **DEPENDENCIES**
- **PRIORITY**

---

## Header & Global Navigation

**REFERENCE CONCEPT:** A persistent header gives users constant, predictable access to
search, category navigation, account, wishlist and cart. Mobile versions must open/close
cleanly, support nested categories and keep active states correct.

**FITCHECK IMPLEMENTATION:** FitCheck's sticky header (Components/layout/Header) already has
logo, desktop+mobile search, notification bell, account dropdown, wishlist and cart with
count badges. Navigation.tsx renders a desktop top nav and a full mobile drawer. Active state
is URL-based (`isNavItemActive`).

**CURRENT STATUS:** Needs improvement (active-state fidelity on product pages; unused
`SearchBar.tsx` dead component).

**FRONTEND:**
- Keep the existing header/nav look.
- Remove/retire the orphaned `SearchBar.tsx` (a second, unused search UI).
- Improve active-state so nested routes still highlight the correct parent where the URL
  expresses the category (`/men`, `/women`, `/kids`, `/clothing`, …).
- Mobile drawer already uses `useModal`, supports navigation and closes on link click.

**BACKEND:** none.

**DATABASE:** none.

**API:** none.

**SECURITY:** Only authenticated-account controls live behind server auth; nav itself is public.

**PRIORITY:** High

---

## Smart Product Search

**REFERENCE CONCEPT:** Large-marketplace search supports fast discovery, suggestions, typo
tolerance where supported, category/subcategory/gender-aware matching, loading and
no-results guidance, and real ranked results.

**FITCHECK IMPLEMENTATION:** `SearchOverlay.tsx` (opened from header) queries
`/api/products?search=…` which matches name, slug, category, subCategory and SKU
case-insensitively (`contains`), returns real products, shows loading & empty states and
navigates each hit to the real product page.

**CURRENT STATUS:** Needs improvement.

**FRONTEND:**
- Keep SearchOverlay as the primary search.
- Remove dead `SearchBar.tsx`.
- Add a no-results suggestion panel (popular categories / "browse all").
- Keep loading and empty states.

**BACKEND:** `/api/products` already handles `search`; add a relevance-ordered search mode.

**DATABASE:** none (name/slug/category/subCategory/sku are indexed or scanned).

**API:** `GET /api/products?search=&limit=`.

**SECURITY:** Search is read-only; no auth required; inputs are parameterized by Prisma.

**DEPENDENCIES:** Product data.

**PRIORITY:** High

---

## Category System

**REFERENCE CONCEPT:** Clear main categories, subcategories and gender-specific browsing with
landing pages, counts where useful, and no broken links.

**FITCHECK IMPLEMENTATION:** `app/[category]/page.tsx` maps friendly slugs (`men`, `women`,
`kids`, `clothing`, `shoes`, `dresses`, `t-shirts`, …) to `CollectionPage` with the correct
gender/category/subcategory filter. Unknown slugs fall back to a readable title.

**CURRENT STATUS:** Needs improvement (multi-select filters must be server-side to stay
correct across pagination).

**FRONTEND:** `CollectionPage` filter sidebar (color/size/price/subcategory), active-filter
chips, clear-all, mobile filter drawer.

**BACKEND:** Extend `/api/products` to accept multi-value `colors` and `sizes` (OR) plus a
`sale` flag so pagination and counts stay correct.

**DATABASE:** none.

**API:** `GET /api/products?gender=&category=&subCategory=&colors=&sizes=&sale=&minPrice=&maxPrice=&sort=&page=&limit=`.

**SECURITY:** Read-only public data; only APPROVED/PLATFORM products exposed.

**PRIORITY:** High

---

## Product Listing Experience

**REFERENCE CONCEPT:** Filterable, sortable lists with price/subcategory/gender/color/size
filters, availability, applied-filter indicators, clear-all, mobile filter drawer, and real
pagination with accurate counts.

**FITCHECK IMPLEMENTATION:** `CollectionPage` (category pages) and `ShopPage` (`/shop`) both
list products. CollectionPage filters server-side; ShopPage mixes server + incomplete
client-side filtering and has a broken "newest" sort.

**CURRENT STATUS:** Needs improvement.

**FRONTEND:**
- Fix `ShopPage` to filter/sort/paginate server-side (like CollectionPage) so counts and
  pages are correct.
- Fix the `newest` sort (currently sorts by product id parsed as a date → NaN).
- Replace the fixed max-500 price slider with realistic price bands.
- Keep grid/list toggle and mobile filter drawer.

**BACKEND:** Multi-value `colors`/`sizes` and `sale` support (see Category System).

**DATABASE:** none.

**API:** `GET /api/products`.

**SECURITY:** server-side filtering only ever returns approved/active products.

**PRIORITY:** High

---

## Product Detail Page

**REFERENCE CONCEPT:** High-quality gallery, thumbnails/zoom, color+size variants with
correct per-color images, stock/availability, price + old price + discount, description &
specs, SKU/category, delivery/return info, wishlist, add-to-cart, related & recently viewed,
reviews.

**FITCHECK IMPLEMENTATION:** `app/products/[slug]/page.tsx` already has: image gallery,
color selector (with `colorImages` per-color), size selector, quantity capped to stock,
stock label (Out of Stock / Only N left / In Stock), price+discount, specs accordion,
wishlist/add-to-cart/buy-now/share, seller card, related products, recently viewed, and a
reviews UI backed by `/api/products/[id]/reviews`.

**CURRENT STATUS:** Already exists (strong); minor hardening.

**FRONTEND:** Preserve selected color/size/quantity integrity; ensure per-color images update
on color change (the gallery already uses `getVariantImages`).

**BACKEND:** `/api/products/slug/[slug]` returns real product + related; 404 on missing.

**DATABASE:** none.

**API:** `GET /api/products/slug/[slug]`, `GET/POST /api/products/[id]/reviews`.

**SECURITY:** Reviews require login to post; ownership/rating server-recomputed.

**PRIORITY:** Medium (mostly done)

---

## Cart System

**REFERENCE CONCEPT:** Quantity updates with stock validation, remove, price recalculation,
shipping calc, empty state, persistence, guest support, and — critically — stock capped at
the UI and re-validated server-side at checkout so users can't oversell.

**FITCHECK IMPLEMENTATION:** `StoreContext` holds a localStorage cart (guest) with
add/remove/quantity/total; `app/cart` renders it with shipping (free ≥ Rs 5,000). Server-side
`/api/orders` already validates `quantity > stock` and, for COD, decrements stock in an atomic
`where: { stock: { gte: qty } }` update.

**CURRENT STATUS:** Needs improvement (client cart does not cap by stock).

**FRONTEND:** Cap `quantity` to available stock on add and on increment; carry `stock` on cart
items so the cart UI disables `+` at the limit; show low/out-of-stock affordance.

**BACKEND:** server-side stock validation already present; keep it authoritative.

**DATABASE:** none.

**API:** order creation validates stock.

**SECURITY:** never trust the client total/quantity; server re-derives prices and stock.

**PRIORITY:** High

---

## Wishlist

**REFERENCE CONCEPT:** Save products, remove, view, move to cart, reflect unavailable items.

**FITCHECK IMPLEMENTATION:** `StoreContext` wishlist (localStorage only). Header badge + wishlist page exist.

**CURRENT STATUS:** Needs improvement (guest-only; no server sync for authenticated users).

**FRONTEND:** keep wishlist page; add "move to cart".

**BACKEND/API:** add authenticated server-saved wishlist (deferred to roadmap phase).

**SECURITY:** guest wishlist is client-side data only; authenticated sync is a roadmap item.

**PRIORITY:** Medium (deferred enhancement)

---

## Customer Account System

**REFERENCE CONCEPT:** Profile, settings, orders, order details, tracking, addresses,
wishlist, notifications, security/password, and the customer only ever sees their own data.

**FITCHECK IMPLEMENTATION:** `app/account`, `account/settings`, `account/addresses`,
`app/orders`, `app/orders/[orderNo]`, `app/track-order`, notifications via
`/api/notifications`. `requireCustomer` + email scoping protect data.

**CURRENT STATUS:** Already exists (solid); some settings actions are cosmetic/dead.

**FRONTEND/BACKEND:** ensure each account section has a real API-backed action (deferred
minor fixes to roadmap).

**SECURITY:** ownership scoping by authenticated customer email/user id.

**PRIORITY:** Medium

---

## Saved Address System

**REFERENCE CONCEPT:** add/edit/delete/default addresses; choose saved or new address at
checkout; each order stores a shipping **snapshot** so later address edits never rewrite
historical orders.

**FITCHECK IMPLEMENTATION:** `UserAddress` model + `/api/addresses`; `Order.addressSnapshot`
already snapshots order shipping address (`parseAddressSnapshot`/`formatAddressLines`).

**CURRENT STATUS:** Already exists (address snapshot present).

**FRONTEND/BACKEND:** verify checkout uses the snapshot for the order and saved-address for
form prefill only.

**SECURITY:** addresses scoped to the owning account email.

**PRIORITY:** Low–Medium (verify only)

---

## Checkout System

**REFERENCE CONCEPT:** multi-step customer/shipping/payment/confirm with real configured
payment methods; never advertise an unconfigured provider as live.

**FITCHECK IMPLEMENTATION:** `app/checkout` handles customer info, saved address, shipping,
payment; providers Safepay/JazzCash/Easypaisa/alternative per `lib/paymentMethods.ts`.
`/api/orders` creates the order and validates stock server-side.

**CURRENT STATUS:** Already exists; verify provider gating reflects real configuration.

**BACKEND:** only expose configured providers; keep server-side stock + price authority.

**SECURITY:** order total recomputed server-side; payment success validated by backend, never
by frontend redirect alone.

**PRIORITY:** Medium

---

## Order Management & Tracking

**REFERENCE CONCEPT:** a valid lifecycle (Pending → Confirmed → Processing → Shipped → Out
for Delivery → Delivered; Cancelled/Refunded) with allowed transitions, admin-controlled
status, and a customer tracking timeline.

**FITCHECK IMPLEMENTATION:** `lib/orderWorkflow.ts` is a single source of truth with
`ALLOWED_TRANSITIONS`, `normalizeOrderStatus`, status history, expected delivery range,
cancellation/refund reasons. `app/orders/[orderNo]` and `app/track-order` render real order
data.

**CURRENT STATUS:** Already exists (strong foundation).

**BACKEND:** enforce transitions server-side via admin workflows (already the case).

**SECURITY:** customers cannot self-advance status; only authorized roles change status.

**PRIORITY:** Medium (mostly done)

---

## Cancellation & Refund

**REFERENCE CONCEPT:** structured reasons + optional detail, request date/status, admin
response, refund amount/status, and prevention of invalid actions by status.

**FITCHECK IMPLEMENTATION:** `canCustomerCancel`/`canRequestRefund` gates and
`CANCELLATION_REASONS`/`REFUND_REASONS`; `Order` stores cancellation/refund fields.

**CURRENT STATUS:** Already exists.

**SECURITY:** status-gated; admin-controlled.

**PRIORITY:** Medium (verification/edge-cases in roadmap)

---

## Notification System

**REFERENCE CONCEPT:** role-correct notifications (customer/seller/admin), "belongs to the
correct user", no cross-account leakage.

**FITCHECK IMPLEMENTATION:** `Notification` (customer, userId), `SellerNotification`
(sellerId), admin notifications via `/api/admin/notifications`; `notifySellerSent`/`notifyAdmin`
helpers. All scoped and owned.

**CURRENT STATUS:** Already exists.

**SECURITY:** notifications scoped by owner; never expose cross-account.

**PRIORITY:** Low (verify)

---

## Recommendations / Recently Viewed

**REFERENCE CONCEPT:** related/similar products, recently viewed, best sellers, new arrivals,
trending — initially via sensible rule-based logic; do not fake AI.

**FITCHECK IMPLEMENTATION:** Related products via the slug API (category/subcategory/gender
matches); recently viewed via localStorage in `StoreContext`; homepage Best Sellers / Featured
/ Latest Arrivals sections; PDP shows related + recently viewed.

**CURRENT STATUS:** Already exists (rule-based).

**BACKEND:** related logic already in slug route.

**SECURITY:** public read data.

**PRIORITY:** Medium (rule-based is intentionally limited)

---

## Product Availability / Stock Handling

**REFERENCE CONCEPT:** in stock / low stock / out of stock / unavailable variants; block
checkout of unavailable items; final stock validation server-side.

**FITCHECK IMPLEMENTATION:** PDP shows stock label and caps quantity; `/api/orders` validates
and atomically decrements stock.

**CURRENT STATUS:** Already exists; client cart cap is the Phase 1 gap.

**SECURITY:** server decrement with `stock >= qty` is the authoritative guard.

**PRIORITY:** High (client cap)

---

## Promotions & Deals

**REFERENCE CONCEPT:** sale prices, old prices, discount badges, featured, new arrivals —
driven by real configured data, no fake countdowns.

**FITCHECK IMPLEMENTATION:** `oldPrice`, `badge`, `featured`, `latestArrival` fields; discount
badges on cards and PDP; Sale category filter.

**CURRENT STATUS:** Already exists.

**SECURITY:** sale display is derived from real product fields.

**PRIORITY:** Low–Medium

---

## Homepage

**REFERENCE CONCEPT:** hero, shop-by-category, gender rails, featured, new arrivals, best
sellers, collections, promo banners, trust badges, newsletter.

**FITCHECK IMPLEMENTATION:** `app/page.tsx` + `Components/HomePage/Sections` (Hero, Top
Categories, Featured, Latest Arrivals, Best Sellers, Collections, Newsletter, Trust Badges).

**CURRENT STATUS:** Already exists.

**BACKEND:** homepage sections pull real approved products.

**PRIORITY:** Medium (enhancements only)

---

## Mobile-First Experience

**REFERENCE CONCEPT:** professional behavior on mobile/tablet/desktop; no overflow; accessible
buttons; a working mobile filter drawer and menu.

**FITCHECK IMPLEMENTATION:** Tailwind responsive grids; mobile menu drawer; mobile filter
drawer (CollectionPage) and overlay filters (ShopPage).

**CURRENT STATUS:** Needs improvement (verify ShopPage mobile filter after refactor).

**PRIORITY:** High (part of Phase 1 fixes)

---

## Performance

**REFERENCE CONCEPT:** lazy image loading, server-side list pagination, avoid ballooning
client data.

**FITCHECK IMPLEMENTATION:** server pagination on `/api/products`; `next/image` fills;
client-side ShopPage filter currently fetches a page then filters (fixed in Phase 1).

**PRIORITY:** High

---

## Security (cross-cutting)

**REFERENCE CONCEPT:** never trust frontend roles, URL params, localStorage roles, or client
product/order ownership; enforce authZ, ownership, input validation, server-side transitions,
safe uploads, safe errors, private env vars, rate protection.

**FITCHECK IMPLEMENTATION (already strong):**
- Auth via HMAC-signed cookies (`adminAuth`, `sellerAuth`, customer).
- Server-side `requireAdmin`/`requireSeller`/`requireCustomer` + ownership scoping.
- Seller product ownership enforced server-side; import/export strip forbidden columns.
- Rate limiting on auth + import/export endpoints.
- Order status transitions server-controlled; address snapshots; atomic stock decrement.
- Upload admin-only, image-only, validated.

**PRIORITY:** High (maintain; do not weaken during Phase 1)

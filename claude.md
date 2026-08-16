# CLAUDE.md — Flikk

Instructions for Claude Code when working in this repo. Read this before making any architectural, scope, or dependency decision.

## What this is

Flikk — asset-light hyperlocal delivery app connecting existing kirana/pharmacy stores to customers in underserved tier-2/3 pockets of coastal Karnataka (starting zone: Kaup/outer Udupi). No owned inventory, no dark stores — a software + logistics coordination layer on top of stores that already stock goods.

**Source of truth:** [PRD-Flikk-Final.md](PRD-Flikk-Final.md) — architecture, schema, and scope decisions are derived from it, **except app-surface scope below, which supersedes the PRD** (see note).

Also in this repo: [BUILD-PLAN-Flikk.md](BUILD-PLAN-Flikk.md) (week-by-week build order — **stale as of the app-surface change below, needs a re-pass before it's trusted again**) and a [clickable screen prototype](https://claude.ai/code/artifact/5e469049-797c-41c8-ae8b-447bf1929f63) (customer-app screens only, still valid for that surface).

## Four app surfaces — not three, not one

This is the single most important structural fact about the project. Build four separate apps, not a shared codebase pretending to be one:

| Surface | Who uses it | Platform |
|---|---|---|
| **Customer app** | Public — people ordering | React Native (Expo) mobile app |
| **Partner app** | Store owners managing incoming orders/catalog | React Native (Expo) mobile app |
| **Rider app** | Delivery riders — pickup/drop assignments | React Native (Expo) mobile app |
| **Admin dashboard** | Founder only, internal ops | Next.js web — the only web surface in the product |

> **Note on PRD divergence:** PRD-Flikk-Final.md Section 9 scopes the store partner as a web dashboard and puts a rider app entirely out of scope until v2. That was a deliberate solo-dev-speed tradeoff. This file overrides that: all three operational roles (customer, partner, rider) get native apps; only admin stays web. Treat this CLAUDE.md as authoritative on app-surface scope; treat the PRD as authoritative on everything else (schema, API shape, design tokens, business logic) until it's formally revised to match.

## Tech stack — locked, do not re-litigate

| Layer | Choice | Notes |
|---|---|---|
| Customer, Partner, Rider apps | React Native via **Expo** (managed workflow), three separate Expo projects | Don't eject to bare workflow unless a specific native module need appears (e.g. rider app may eventually need background location — cross that bridge when it's actually needed, not preemptively) |
| Admin dashboard | Next.js, web only | The one and only web surface — do not scaffold a mobile app for admin |
| Navigation (all 3 RN apps) | React Navigation (native-stack + bottom-tabs) | |
| State | **Zustand** (client state) + **TanStack Query** (server state, caching, retry) | Not Redux — deliberately chosen to avoid boilerplate at solo-dev scale. Same pattern across all three apps for consistency |
| Forms | React Hook Form | |
| Backend | Node.js + Express, **monolith** serving all four apps | Not microservices, not one backend per app — a single API with role-scoped endpoints/auth is correct at this scale |
| Database | PostgreSQL via **Supabase** | Auth (phone OTP) + Postgres + realtime + storage in one service — don't hand-roll any of these |
| Payments | Razorpay (UPI-first) | Customer app only |
| Notifications | WhatsApp Business API (Interakt/Gupshup), Twilio SMS as fallback | Cross-cutting — customer order updates, partner new-order alerts, rider assignment pings |
| Hosting | Railway/Render (backend), Vercel (admin dashboard), Supabase (DB/auth) | Cost ceiling: <₹2,000/month at MVP order volume — treat as a real constraint when adding any paid service. Re-check this ceiling now that infra serves 3 mobile apps instead of 1 |
| Analytics | PostHog or Supabase event table | |

**Package managers:**
- All three Expo apps (customer, partner, rider) → **npm**. Metro bundler has known symlink/resolution friction with pnpm and worse with bun for React Native specifically — npm is what Expo's own tooling assumes, fewest surprises.
- Backend (Node/Express) and admin dashboard (Next.js) → **pnpm**. Pure Node/web, no Metro involved — pnpm's stricter resolution and disk efficiency are a clean win with none of the RN caveats.
- Don't use bun anywhere in this stack yet — least battle-tested option for Expo/Supabase client libs specifically, and its speed advantage doesn't matter at solo-dev MVP scale.

React Native is not a solo-dev compromise — Zepto, Blinkit, and Swiggy Instamart all run React Native in production at scale (PRD Section 4). Validated choice, not a shortcut.

## Repo structure

One repo, four independently-runnable apps plus the shared backend. Don't reach for Turborepo/Nx/monorepo tooling at this scale — that's infrastructure earning no benefit yet for a solo dev on four apps.

```
/apps
  /customer      — Expo app
  /partner       — Expo app
  /rider         — Expo app
  /admin         — Next.js app
/backend         — Node/Express API, shared by all four
/PRD-Flikk-Final.md
/CLAUDE.md
```

Each `/apps/*` folder has its own `package.json` and lockfile — they are not workspace-linked to each other. Only pull in shared-code tooling (a `/packages/shared` for types, API client, design tokens) once real duplication pain shows up across the three RN apps — not preemptively.

## Scope discipline

The out-of-scope list is not a backlog for "later" — it's what must NOT appear in the codebase until v1 has shipped and proven the metrics in PRD Section 8. Adding any of these early is scope creep delaying the only thing that matters right now: real orders, real stores, real riders using this in the launch zone.

**Do not build, scaffold, or add dependencies for, until explicitly told the MVP has validated:**
- Live GPS delivery tracking (status-only 4-stage tracking is the v1 spec, even though a rider app exists — a rider app does not imply live map tracking for the customer)
- Automated rider-assignment/routing algorithm (manual/founder-assigned dispatch is correct at MVP volume — the rider app receives assignments, it doesn't compute them)
- Multi-city or multi-zone support (single zone only — `zone` exists as a DB concept from day 1, the app only ever surfaces one active zone in v1)
- Real-time inventory sync with store POS systems
- AI/conversational ordering
- Loyalty/rewards programs
- Multi-store cart (single-store-per-order, enforced at schema and UI level)

If a task seems to require one of these, stop and flag it rather than building around the constraint.

## Architecture summary

```
Customer app (Expo) ──┐
Partner app (Expo)  ──┼─→ Node/Express API (monolith, role-scoped auth) ─→ Supabase (Postgres, Auth, Realtime, Storage)
Rider app (Expo)    ──┘              │
Admin dashboard (Next.js) ───────────┤
                                      ├─→ Razorpay (payments)
                                      └─→ WhatsApp Business API / Twilio (notifications)
```

Full detail — database schema and REST API surface: PRD-Flikk-Final.md Sections 15-18. Note the PRD's API table assumes a web partner dashboard; endpoints hold, but partner and rider endpoints now serve native app clients instead — same contracts, different consumer.

## Database

Schema per PRD-Flikk-Final.md Section 16 — `zones`, `users`, `addresses`, `stores`, `products`, `orders`, `order_items`, `riders`, `payouts`. `users.role` now meaningfully distinguishes four consumer types at the API auth layer (`customer` / `store_owner` / `rider` / `admin`), each hitting role-scoped endpoints from their respective app. Don't add speculative columns for out-of-scope features (no GPS coordinates on `orders` — that's v3, PRD Section 26). `order_items.unit_price_at_order` is deliberately denormalized — never derive an order's total from current product prices.

Supabase Row-Level Security on every table: a customer reads only their own orders/addresses, a store owner reads/writes only their own store's data, a rider reads only assignments given to them. This is a security requirement, implemented alongside the table — not a follow-up task.

## Design system

Full tokens and rationale in PRD-Flikk-Final.md Section 11 and the live prototype (customer-app screens). Quick reference — applies to customer and partner apps; rider app can be visually simpler (it's an operational tool checked between deliveries, not a browsing experience) but should still use these brand tokens for consistency, not a different palette:

```
--lime:      #A8D93A   brand — nav, active states, key highlights
--lime-deep: #7CB518   pressed states, header gradients
--lime-soft: #EEF7DC   selected/highlighted surfaces
--ink:       #101C10   text, dark surfaces
--coral:     #FF6B4A   CTA buttons only — not brand, keeps lime from double-duty
--gold:      #D9A441   ratings, ETA highlight — sparingly only
--white:     #FFFFFF   dominant surface
--mist:      #F6FAF0   secondary surface
--success:   #2E9E77
--danger:    #D64545
```

`lime` is brand/active-state; `coral` is the only CTA color — don't put lime on a primary action button. White text on lime fails AA contrast — use `ink` on lime surfaces. Deliberately not purple/yellow/orange — exists specifically to not read as a Zepto/Blinkit/Instamart clone. Don't drift toward those hues.

System font stack only (no custom webfont) — deliberate call for load-time performance on 3G. `font-variant-numeric: tabular-nums` on every price/ETA display.

## Code quality

**TypeScript everywhere, strict mode on, in all four apps and the backend.** No `any` without a comment explaining why it's unavoidable. Given four codebases sharing one mental model (orders, stores, users), type mismatches between app and API are the most likely class of solo-dev bug — strict typing is the cheapest defense available.

**Linting/formatting:** ESLint + Prettier, one shared config file copied (not npm-linked) into each app until a `/packages/shared` exists. Run lint in CI on every push — don't let it drift silently across four separate codebases.

**Testing — matched to what's actually risky, not blanket coverage:**
- Every function that touches money (order totals, commission calculation, payout amounts) needs a runnable test. This is a real-money path in a business run by one person — bugs here are expensive and easy to miss by eye.
- The order status state machine (placed → packed → out_for_delivery → delivered) needs a test covering valid and invalid transitions — this is shared logic that all three operational apps depend on agreeing about.
- No framework-heavy test suite for UI screens at this stage — one smoke test per app (does it boot, does auth work) is enough until real usage surfaces real bugs worth guarding against.
- Skip tests for trivial CRUD (a product-catalog edit endpoint doesn't need a test suite) — match effort to actual risk, not to what "professional" projects usually have.

**Code review discipline (self-review, solo dev):** before merging any change touching `orders`, `payouts`, or `order_items`, re-read the diff specifically for off-by-one/rounding errors in money math and for RLS policy gaps — these two failure classes are the ones that lose real money or leak real data, everything else is more forgiving to get slightly wrong and fix later.

**Consistency across the three RN apps matters more than perfecting any one of them.** Same navigation pattern, same state-management pattern, same API client shape in customer/partner/rider — a bug fixed once in the shared pattern should be checkable across all three, not rediscovered independently in each.

**No premature abstraction.** Don't build a shared component library across all four apps before there's real duplicated code to justify it. Three similar screens across customer/partner/rider is fine to leave similar-but-separate until a fourth near-identical one shows up — then extract.

## Commands

_To be filled in per app once scaffolded — `/apps/customer`, `/apps/partner`, `/apps/rider`, `/apps/admin`, and `/backend` will each get their own `dev`/`test`/`lint` commands here as they're established, so future sessions don't have to rediscover them._

## Environment / secrets

Razorpay keys, Supabase service role key, WhatsApp API credentials — environment variables only, never committed, and never shared across apps beyond what each genuinely needs (the rider app has no business holding a Razorpay key, for instance — scope secrets per app, not one global `.env` copied everywhere). Add a `.env.example` per app once these are introduced.
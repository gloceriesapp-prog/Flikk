# Flikk — Week-by-Week Build Plan (v2 — Four-App Architecture)

Solo dev, 40hrs/week, backend + full-stack + mobile skills. Based on PRD-Flikk-Final.md v3.0 — customer, partner, and rider as native Expo apps; admin as the only web surface.

**Revised from the original 8-week plan.** Three native apps instead of one web dashboard is a real scope increase — this plan runs ~11 weeks including Week 0 validation, not 8. Don't compress this back down; the extra time is the actual cost of the app-surface decision, not padding.

---

## Week 0 — Validation (NO CODE)

Unchanged, and more important now given the larger build ahead — a bad Week 0 signal should stop an 11-week build, not just an 8-week one.

- Install eSamudaay app, use as customer, log gaps
- Talk to 3-5 kirana owners already on eSamudaay
- Pick target zone (Kaup / outer Udupi / Karkala)
- Recruit 5 stores manually — WhatsApp order-taking, founder delivers personally
- Run 2 weeks minimum, track orders/week, repeat customers, store willingness to continue
- **Gate: proceed to Week 1 only if 20+ organic orders/week sustained**

---

## Week 1 — Foundation (shared across all four apps)

- Repo structure per CLAUDE.md: `/apps/customer`, `/apps/partner`, `/apps/rider`, `/apps/admin`, `/backend`
- Backend: Node/Express skeleton, Supabase project, full schema from PRD Section 16 (all tables, including `rider_earnings` and `users.is_approved` from the start — cheaper to have the columns now than migrate later)
- Auth: Supabase phone-OTP wired once in the backend, reused by all four clients via role-scoped session
- Scaffold all three Expo apps (`npm create expo-app` × 3) and the Next.js admin app — get each to a blank "logged in, hello world" state before building real screens. This week's goal is four apps that boot and authenticate, nothing more.
- Design tokens (Section 11 palette/type/spacing) implemented once as a shared constants file, copied into each RN app (not npm-linked — see CLAUDE.md on avoiding premature monorepo tooling)

---

## Week 2 — Customer App: Browse & Cart

- Zone select, Home, Store list, Store catalog, product quick-add sheet, cart (screens C2-C7)
- Backend: `/zones`, `/stores`, `/products` endpoints
- Seed data: your Week 0 pilot stores' real catalogs

---

## Week 3 — Customer App: Payments & Order Flow

- Razorpay UPI checkout integration
- `/orders` creation endpoint (transactional — validate stock, lock prices, create order)
- Order confirmation, order tracking screens (C9-C10) with Supabase Realtime subscription
- WhatsApp notification triggers on status change (Interakt/Gupshup)
- Test with real small-value transactions before moving on — this remains the highest-risk integration in the whole build

---

## Week 4 — Customer App: Finish & Bug Bash

- Profile/order history (C11), reorder shortcut
- Saved addresses (max 3)
- End-to-end test: 10-15 real orders through the full customer flow yourself
- **Customer app should be feature-complete and stable by end of this week** — everything after this builds on a working core, don't carry customer-app bugs forward into partner/rider weeks

---

## Week 5 — Partner App

- OTP login with `is_approved` gate (pending state UI for unapproved stores)
- Order queue (P2), order detail/mark-packed (P3) — this reuses the same order-status-update pattern as customer tracking, just from the other side
- Catalog management (P4) — CRUD screens, straightforward given backend already exists from Week 2
- Expo Push notification wiring for new-order alerts
- **Ponytail note:** the partner app's navigation/data-fetching patterns should closely mirror the customer app's (same Zustand + TanStack Query approach) — don't invent a different pattern just because it's a different app

---

## Week 6 — Partner App: Payouts + Rider App: Core

- Partner payouts view (P5), store settings (P6) — finishes partner app
- Rider app: OTP login with approval gate, assignment queue (R2), assignment detail (R3)
- Backend: `/rider/assignments` endpoint, `orders.picked_up_at` write path

---

## Week 7 — Rider App: Finish + Admin Dashboard Start

- Rider app: mark-delivered flow (R4), earnings/history (R5)
- Backend: `rider_earnings` write-on-delivery logic
- Admin dashboard: store onboarding/approval (A1), rider onboarding/approval (A2-equivalent) — the gate that unblocks real partner/rider app usage, build this before you need it for real onboarding in Week 9
- Expo Push wiring for rider assignment alerts

---

## Week 8 — Admin Dashboard: Finish + Cross-App Integration Testing

- Cross-app order monitor (A2), manual rider assignment (A3), payouts/export (A4)
- **Full integration test across all four apps:** place a real order in the customer app → confirm it appears in partner app → mark packed → confirm admin can assign a rider → confirm rider app shows the assignment → mark delivered → confirm customer sees "delivered" status. Run this loop 10+ times, fix breakage — this is the week most likely to surface integration bugs that unit-level work hides.

---

## Week 9 — Store & Rider Onboarding, App Store Prep

- Onboard 10-15 real stores in target zone — now includes installing the partner app and a short walkthrough, not just a WhatsApp habit change; budget more time per store than the original plan assumed
- Recruit and onboard riders onto the rider app (founder as first rider, validated in Week 8's integration test, now recruit 1-2 real external riders)
- App store submission: customer app to public Play Store listing; partner and rider apps via closed/internal testing tracks (skips full public review, appropriate for pilot-phase apps not meant for public discovery)
- Print/distribute in-store QR posters
- Seed first 50 customers personally

---

## Week 10 — Soft Launch

- Public launch in single zone, customer app live
- Partner and rider apps in active use by onboarded stores/riders (closed track — direct install link, no public listing needed yet)
- Daily WhatsApp check-ins with store partners and riders — catch friction in the new apps early, this is a bigger behavior change for them than the original web-dashboard plan assumed

---

## Week 11 — Measure & Decide

- Track daily against PRD Section 8 metrics — now including the new partner/rider **app-adoption** metrics (>90% partner, 100% rider), not just order volume
- **Decision gate at day 90 (ongoing from launch, not this week specifically):** repeat-order rate >40%? Scale rider recruitment, consider second zone. Below ~25%? Stop, diagnose before spending more — same eSamudaay-mirroring signal as the original plan.
- If partner or rider app adoption lags badly despite working software, that's a distinct signal from order-demand weakness — diagnose separately (is it an installation-friction problem, a training problem, or genuine resistance to leaving WhatsApp/paper habits?)

---

## What's still deliberately NOT in these 11 weeks (v2+, per PRD Section 26)

- Live GPS tracking
- Automated rider-routing algorithm
- Multi-store cart
- Real-time POS inventory sync
- Multi-city support

Having three native apps does not mean building everything those apps could eventually do — the scope discipline from the original plan still holds, just applied across a wider build.
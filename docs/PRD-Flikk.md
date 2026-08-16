# PRD: Flikk — Hyperlocal Quick Delivery for Underserved Tier-2/3 Zones

**Version:** 3.0 (Final — Product Design Complete, Four-App Architecture)
**Owner:** Nishal Poojary
**Role of this document:** Complete product definition — problem, competitive landscape, design system, every screen across all four apps, full technical architecture. Build directly from this.
**Target launch geography:** Coastal Karnataka (Udupi district), starting with one dark-store-excluded zone (Kaup / outer Udupi / Karkala)

---

## Table of Contents

1. Executive Summary
2. Problem Statement
3. Competitive Analysis — Product
4. Competitive Analysis — Technical (how they're actually built)
5. Why Now
6. Design Philosophy — What "Premium" Means Here
7. Target Users
8. Goals & Success Metrics
9. Scope (v1 MVP) — Four App Surfaces
10. Complete Screen Inventory — All Four Apps
11. Design System
12. Core User Flows
13. Functional Requirements
14. Non-Functional Requirements
15. Technical Architecture (React Native, complete)
16. Database Schema
17. API Design
18. Real-Time & Notification Architecture
19. Security & Compliance
20. DevOps, Hosting & Cost Model
21. Analytics & Instrumentation
22. Monetization Model
23. Go-to-Market Plan
24. Risks & Mitigations
25. Pre-Build Validation Checklist
26. Roadmap Beyond v1

---

## 1. Executive Summary

Flikk is an asset-light hyperlocal delivery app connecting existing kirana/pharmacy/general stores to customers in tier-2/3 towns and peri-urban zones that national quick-commerce players (Zepto, Blinkit, Swiggy Instamart) structurally cannot serve profitably. Flikk owns no inventory and no dark stores — it is a software and logistics coordination layer on top of stores that already stock goods, launching in a single underserved pocket of Udupi district before any expansion.

**v3 architecture decision:** every operational role gets a native app — customer, store partner, and rider each have a dedicated React Native app. Only the founder's internal admin surface is web. This is a deliberate step up from a leaner "web dashboard for partners, WhatsApp for riders" MVP — it costs more build time, but gives partners and riders a faster, more reliable, app-store-installable tool from day one rather than a browser tab and manual messages.

**Core bet:** dark-store economics require order density that low-population pockets will never reach — Zepto/Blinkit's ₹5-15L per-store capital model makes this gap permanent, not temporary. Flikk exploits it with zero inventory capital and a kirana-partnership model already proven at national scale by JioMart.

---

## 2. Problem Statement

- Customers in small towns and semi-urban pockets near Udupi/Mangalore have no fast (same-day/60-min) delivery option for groceries, medicines, and daily essentials.
- Kirana/medical store owners are losing walk-in relevance to online-ordering habits customers picked up from nearby cities, but have no affordable way to go online themselves.
- Local gig riders have inconsistent, informal delivery work — no dedicated tool to receive and manage assignments professionally.
- The one direct local precedent, eSamudaay Udupi, has publicly struggled with user engagement and rising operational costs — a roadmap of what to avoid, not evidence the category is dead.

---

## 3. Competitive Analysis — Product

| Platform | Model | Delivery time | Coverage in Udupi/Mangalore | Capital model | Key weakness we exploit |
|---|---|---|---|---|---|
| **Zepto** | Owned dark stores (~1,000+ nationally), AI-routed picking | ~10 min | Not confirmed present; concentrated in metros | Heavy — owns inventory + real estate + staff | Dark-store economics never reach low-density pockets |
| **Blinkit** | Owned dark stores, real-time inventory sync, dedicated delivery-partner app | ~10-30 min | 2 dark stores in Udupi, 3 in Mangaluru — hub-radius only | Heavy — same as Zepto | Everything outside ~3-5km hub radius unserved |
| **Swiggy Instamart** | Hybrid — partner-run delivery-only shops, ~2,500 SKUs | 30-45 min | Bundled in main Swiggy app; limited small-town dark-store presence | Medium — partner-operated but still a dedicated shop | Slower window; still needs dedicated shop setup, not existing kirana |
| **JioMart (kirana model)** | True kirana-integration via WhatsApp/tiered onboarding, 6,000+ stores nationally | Varies | Present via WhatsApp; fulfillment quality inconsistent in small towns | Light — kirana keeps stock | Generic, impersonal at local level; weak last-mile reliability |
| **eSamudaay Udupi** | "Circle Promoter" model, local kirana aggregator, fixed fee not commission | Same-day | Active in Udupi core | Light — unfunded local entity, ~13 employees at parent | Public reporting cites engagement + cost struggles; ranks 12th of 12 local competitors (Tracxn) |
| **Fooodzapp** | Local food-only ordering/delivery | Same-day | Udupi/Manipal | Light | Food-only, no grocery/pharmacy |

**Takeaway:** JioMart proves the asset-light kirana model scales nationally; nobody has executed it well hyperlocally in this district — and nobody local gives store owners or riders a dedicated app. That's the opening on both the customer and operational side.

---

## 4. Competitive Analysis — Technical (how the big players are actually built)

| Company | Mobile | Backend | Database | Real-time/messaging | Notes |
|---|---|---|---|---|---|
| **Zepto** | React Native | Node.js + Express (RESTful APIs, non-blocking I/O) | MongoDB Atlas (migrated from Postgres), Redis for caching | Apache Kafka | Python/TensorFlow for demand forecasting — irrelevant at our MVP scale |
| **Blinkit** | React Native, **dedicated delivery-partner app** with route optimization | Java/Spring Boot + Node.js + Python/Django, microservices | Polyglot per service | — | Blinkit's own delivery-partner app is precedent for our rider app decision — this is proven pattern, not novel risk |
| **Swiggy (incl. Instamart)** | React Native (+ native sync/storage modules), Flux/Redux data flow | Node.js + Python (Flask/Django) + legacy Java | PostgreSQL + MongoDB + Redis | — | Confirms React Native holds up at extreme scale across multiple app surfaces (consumer + delivery partner), not just one |

**Implication for Flikk:** React Native is what Zepto, Blinkit, and Swiggy Instamart all ship on today — and critically, Blinkit's own dedicated delivery-partner app is direct precedent that a separate native app per operational role is the pattern proven companies converge on, not solo-dev overreach. We adopt the same frontend framework across all three operational apps, but a **monolithic Node.js backend + Postgres**, not their microservices/polyglot setup — that complexity only pays off well past our MVP order volume.

---

## 5. Why Now

- Tier-2 quick-commerce order growth >20% month-on-month, but structurally excludes low-density zones — the gap persists rather than closes.
- UPI is fully normalized even in small towns — zero payment-adoption friction.
- Kirana owners are increasingly aware of losing relevance and receptive to a zero-capital digital channel.
- Local gig workers increasingly expect app-based work (Swiggy/Zomato/Uber normalized this even in tier-2 towns) — a rider app is now an expectation, not a novelty.
- eSamudaay proves demand exists; its struggles are a lesson, not a rejection signal.

---

## 6. Design Philosophy — What "Premium" Means Here

Premium does not mean maximalist. For users on mid-range Android phones and patchy 3G — across all four apps — premium means:

1. **Speed reads as trust.** Every screen states an honest ETA before the user has to ask. Skeleton screens, not spinners.
2. **Fewer decisions, not more options.** Single-store cart, four-stage order status, no feature the user has to learn before their first order/task completes.
3. **Local, not generic.** Real store names, real regional products, a color identity distinct from every competitor in this category.
4. **Honesty in the interface.** No fake progress bars pretending to be more automated than they are — a rider's real name and phone number is the backstop, not a simulated live map.
5. **Performance is a design decision.** Cold start under 3 seconds and catalog load under 2 seconds are UX requirements enforced like a color palette — this applies to the partner and rider apps too, not just the customer-facing one.
6. **Operational apps (partner, rider) are tools, not showcases.** A store owner checking orders between customers and a rider checking an assignment mid-route need speed and clarity over visual flourish — restraint here is also premium, just a different kind than the customer app's.

---

## 7. Target Users

**Persona 1 — Customer.** Resident of an underserved pocket (Kaup, outer Udupi, Karkala), 22-45, smartphone-native, UPI user, wants groceries/medicine delivered same-day without traveling to town center.

**Persona 2 — Store Partner.** Kirana/medical/general store owner, single or 2-outlet, no existing online presence, wants incremental revenue at zero upfront cost. Now gets a dedicated app rather than a browser tab — checked between serving walk-in customers, needs to be fast and simple enough to use one-handed at the counter.

**Persona 3 — Delivery Partner (Rider).** Local gig rider (student, part-time worker), paid per delivery, not exclusively employed. Now gets a dedicated app to receive assignments, mark pickup/delivery, and see earnings — mirrors the Swiggy/Zomato rider-app experience riders already know.

**Persona 4 — Founder (Admin).** You. Runs the whole operation from a web dashboard — store onboarding, cross-app order monitoring, manual rider assignment (until v2 automation), payouts.

---

## 8. Goals & Success Metrics (first 90 days post-launch)

| Metric | Target |
|---|---|
| Partner stores onboarded | 10-15 in launch zone |
| Weekly active customers | 150+ |
| Orders/week | 100+ |
| Repeat order rate (14-day) | >40% |
| Average delivery time | <60 min |
| Store partner retention (day 90) | >80% |
| Rider utilization | >3 orders/hour at peak |
| Partner app adoption (vs. WhatsApp fallback) | >90% of stores using app within 2 weeks of onboarding |
| Rider app adoption | 100% of active riders (this is the only assignment channel — no WhatsApp fallback once launched) |
| App cold start (all 3 native apps) | <3s on mid-range Android |
| Catalog load | <2s |
| Crash-free session rate | >99.5%, tracked per app |

Repeat-order rate below ~25% at day 90 mirrors eSamudaay's known engagement failure — a hard stop-and-diagnose signal.

---

## 9. Scope — v1 MVP — Four App Surfaces

**Customer app (React Native/Expo):**
Zone select → browse stores → catalog → cart → UPI checkout → 4-stage order status → WhatsApp/SMS notifications → order history/reorder.

**Partner app (React Native/Expo):**
OTP login → catalog management (add/edit/mark out-of-stock) → incoming order queue with accept/packed/ready actions → weekly payout summary. Push notifications for new orders replace the WhatsApp-fallback approach from earlier scope drafts.

**Rider app (React Native/Expo):**
OTP login → view assigned pickup/drop tasks (manually assigned by admin, no auto-routing) → mark picked-up/delivered → view completed-deliveries/earnings history. Push notifications for new assignments.

**Admin dashboard (Next.js, web — the only web surface):**
Store onboarding/approval, cross-app order monitoring, manual rider assignment interface, commission/payout calculation and export.

**Explicitly out of scope for v1 (unchanged from prior scope, still correct even with three native apps):**
- Live GPS delivery tracking (rider app captures pickup/delivered timestamps, not a live location feed to customers)
- Automated rider-assignment/routing algorithm (admin assigns manually; rider app is a receive-and-update tool, not a routing engine)
- Multi-city support
- Real-time POS inventory sync
- AI/conversational ordering
- Loyalty/rewards programs
- Multi-store cart

Having a rider app does not imply live tracking or auto-routing — those remain deliberately deferred regardless of app-surface scope.

---

## 10. Complete Screen Inventory — All Four Apps

Reference: [customer-app prototype](https://claude.ai/code/artifact/5e469049-797c-41c8-ae8b-447bf1929f63) — screens 01-11 below are built and clickable there. Partner and rider app screens are newly specified in this revision (not yet prototyped).

### Customer App

| # | Screen | Purpose | Key state variants |
|---|---|---|---|
| C1 | Splash | Brand entry, session check | Cold start / returning user |
| C2 | Zone select | Gate to serviceable pockets only | Available / waitlist / unavailable |
| C3 | Home | Discovery — categories, ETA banner, featured stores | First-time / returning |
| C4 | Store list | Browse, filter by category/rating/ETA | Empty state |
| C5 | Store catalog | Product grid, tabbed categories | In stock / out of stock / cart-float visible |
| C6 | Product quick-add sheet | Add without leaving catalog | Qty 0 / qty >0 |
| C7 | Cart | Review before payment | Empty / single-store / min order not met |
| C8 | Checkout | Address + payment | Saved / new address, payment method select |
| C9 | Order confirmation | Post-payment reassurance | Success / payment failed |
| C10 | Order tracking | Status timeline + rider contact | Placed/packed/out/delivered/delayed |
| C11 | Profile & order history | Account, reorder, saved addresses | Has orders / none |

### Partner App

| # | Screen | Purpose | Key state variants |
|---|---|---|---|
| P1 | Login (OTP) | Store owner auth | New store (pending approval) / active store |
| P2 | Order queue (home) | Incoming orders needing action | Empty / new order (needs accept) / accepted, needs packing |
| P3 | Order detail | Item list for one order, mark packed | Packed action taken / already packed |
| P4 | Catalog management | Add/edit products, toggle stock | Item list / add-new-item form |
| P5 | Payouts | Weekly settlement summary | Current week pending / past weeks history |
| P6 | Store settings | Hours, store info | — |

### Rider App

| # | Screen | Purpose | Key state variants |
|---|---|---|---|
| R1 | Login (OTP) | Rider auth | Active rider / inactive |
| R2 | Assignment queue (home) | Current pickup/drop tasks | No assignment / assigned, awaiting pickup / picked up, en route |
| R3 | Assignment detail | Store address, customer address, order summary | Pre-pickup / post-pickup (shows drop details prominently) |
| R4 | Mark delivered | Confirm drop-off | Success confirmation |
| R5 | Earnings/history | Completed deliveries, per-day earnings | Today / this week |

### Admin Dashboard (web)

| # | Screen | Purpose | Key state variants |
|---|---|---|---|
| A1 | Store onboarding | Approve/reject new store applications | Pending / approved / rejected |
| A2 | Cross-app order monitor | All orders, all stores, live status | Filter by status/store/zone |
| A3 | Rider assignment | Manually assign a rider to a ready order | Unassigned orders / assigned |
| A4 | Payouts & commission | Store payout calculation, CSV export | Current cycle / historical |

**Navigation model:** each of the three RN apps uses a bottom-tab structure appropriate to its own role (Customer: Home/Orders/Profile; Partner: Orders/Catalog/Payouts; Rider: Assignments/Earnings) — do not try to share one navigation shell across apps, they serve different jobs.

---

## 11. Design System

Full token set validated in the customer-app prototype; applies to all three RN apps for brand consistency, with partner/rider leaning more utilitarian per Section 6.

**Color**
| Token | Hex | Use |
|---|---|---|
| `--ink` | `#0C1D1A` | Primary text, dark surfaces |
| `--teal` | `#0E6E68` | Brand, primary actions, links |
| `--teal-deep` | `#0A4F4B` | Pressed states, header gradients |
| `--teal-soft` | `#DCECE9` | Selected/highlighted surfaces |
| `--coral` | `#FF6B4A` | CTA buttons, urgency, cart float |
| `--gold` | `#D9A441` | Ratings, ETA highlight — used sparingly |
| `--mist` | `#EAF1EF` | App background |
| `--success` | `#2E9E77` | Delivered, positive status |
| `--danger` | `#D64545` | Errors, out of stock |

Deliberately not purple (Zepto), yellow (Blinkit), or orange (Swiggy/Instamart).

**Typography:** system font stack — zero webfont load time, matters more than a custom face on 3G, across all apps. Display weight 800 tight tracking for headings/prices; `font-variant-numeric: tabular-nums` on every price/ETA/earnings figure.

**Spacing & shape:** 4px base unit, 14-18px card radius, 12-14px button radius — same scale across customer, partner, and rider apps so they read as one product family even though their content differs.

---

## 12. Core User Flows

**Customer:** zone gate → browse → catalog → cart → checkout → confirmation → tracking → delivered → reorder.

**Store partner (app):** push notification of new order → open partner app → accept → pack → mark ready → rider (assigned by admin) picks up → weekly payout visible in app.

**Rider (app):** push notification of new assignment → open rider app → view pickup store + drop address → mark picked up → deliver → mark delivered → status auto-updates to customer via backend → earnings entry appears.

**Admin (web):** monitors order monitor → sees order marked "ready" by store → manually assigns an available rider → tracks completion → runs weekly payout export.

---

## 13. Functional Requirements

**Customer App**
- FR1: Zone-based store discovery
- FR2: Product catalog per store, category-filtered
- FR3: Single-store-per-order cart
- FR4: Razorpay UPI checkout
- FR5: 4-stage order status, non-GPS
- FR6: WhatsApp/SMS notifications on status change
- FR7: Order history + one-tap reorder
- FR8: Saved addresses (max 3 for v1)

**Partner App**
- FR9: Phone-OTP login, gated on admin approval (FR: pending stores see a "waiting for approval" state, not the full app)
- FR10: Product catalog CRUD, stock toggle
- FR11: Order queue — accept/packed/ready actions
- FR12: Push notification on new order
- FR13: Weekly settlement/payout summary view

**Rider App**
- FR14: Phone-OTP login, gated on admin approval
- FR15: View assigned pickup/drop tasks (assigned by admin, not self-selected)
- FR16: Mark picked-up, mark delivered — each action timestamps and triggers the order status update visible to the customer
- FR17: Push notification on new assignment
- FR18: Earnings/completed-delivery history view

**Admin Dashboard**
- FR19: Store onboarding/approval
- FR20: Rider onboarding/approval
- FR21: Cross-app order monitoring
- FR22: Manual rider assignment
- FR23: Commission/payout calculation and CSV export

---

## 14. Non-Functional Requirements

- **Reliability:** all three RN apps function on 3G/patchy network — optimistic UI updates with retry queue, not hard failure on timeout. This matters especially for the rider app, which is used while moving/outdoors with the worst connectivity of any surface.
- **Performance:** cold start <3s, catalog/queue load <2s on mid-range Android, across customer, partner, and rider apps equally — the partner and rider apps are not exempt from this bar just because they're operational tools.
- **Security:** Razorpay handles all card/UPI data; OTP-only auth across all four user roles; Supabase RLS scoped per role (customer sees own orders, store sees own orders, rider sees own assignments, admin sees all).
- **Scalability:** `zone` is a first-class table from day 1.
- **Cost:** infra <₹2,500/month at MVP volume — revised slightly up from the single-web-dashboard estimate to account for push notification infra (Expo push service, effectively free at this scale, but budgeted honestly) across three apps instead of one.
- **Accessibility:** minimum 44×44px touch targets, AA contrast, status conveyed by icon+color+text — applies to all three RN apps, not just customer-facing.

---

## 15. Technical Architecture (React Native, complete)

```
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ Customer App    │  │ Partner App     │  │ Rider App       │
│ (Expo, RN)       │  │ (Expo, RN)       │  │ (Expo, RN)       │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │ HTTPS/REST + push   │                     │
         └──────────────────────┼─────────────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │  Backend API (Node.js +    │
                    │  Express, monolith,         │
                    │  role-scoped auth)           │
                    │  /auth /stores /products      │
                    │  /orders /riders /admin        │
                    └───────┬──────────────┬───────┘
                            │              │
                ┌───────────▼───┐   ┌──────▼─────────────────┐
                │ Supabase        │   │ Third-party              │
                │ - Postgres       │   │ - Razorpay (customer only)│
                │ - Auth (OTP)      │   │ - WhatsApp Business API    │
                │ - Realtime         │   │   (customer notifications)  │
                │ - Storage           │   │ - Expo Push (partner+rider)  │
                └─────────────────────┘   │ - Twilio SMS (fallback)        │
                                           └───────────────────────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │  Admin Dashboard             │
                    │  (Next.js, web, founder-only) │
                    └───────────────────────────────┘
```

**Why Expo over bare React Native, across all three apps:** solo dev, no native module needs at v1 for any of the three (no custom Bluetooth/hardware integration even for the rider app at this stage) — Expo's managed workflow means faster builds and OTA JS updates that skip App Store review for non-native changes. This benefit compounds with three apps instead of one — three separate native-build pipelines would be a much heavier solo-dev tax than three Expo projects.

**Why push notifications (Expo Push) replace the earlier WhatsApp-fallback plan for partner/rider:** now that partner and rider are native apps rather than a web dashboard, in-app push is faster and more reliable than routing through a third-party messaging API for time-sensitive operational alerts (new order, new assignment) — WhatsApp remains the customer-facing notification channel since customers don't have a Flikk app notification relationship to rely on for trust-building in the same way.

**Why one backend serves all four apps:** role-scoped auth (customer/store_owner/rider/admin on the `users.role` column) and endpoint-level authorization is sufficient to safely serve four different clients from one API — running four separate backends would multiply operational surface for zero benefit at this scale.

---

## 16. Database Schema

```sql
zones (
  id, name, slug, is_active, created_at
)

users (
  id, phone, name, role,  -- 'customer' | 'store_owner' | 'rider' | 'admin'
  is_approved,            -- gates store_owner/rider access until admin approval
  created_at
)

addresses (
  id, user_id, label, line1, landmark, zone_id, is_default
)

stores (
  id, owner_user_id, zone_id, name, category, rating,
  avg_prep_minutes, is_active, created_at
)

products (
  id, store_id, name, unit, price, category, is_in_stock,
  image_url
)

orders (
  id, customer_id, store_id, rider_id (nullable), address_id,
  status,        -- 'placed' | 'packed' | 'out_for_delivery' | 'delivered' | 'cancelled'
  item_total, delivery_fee, commission_amount, total,
  razorpay_payment_id,
  placed_at, packed_at, picked_up_at, delivered_at
)

order_items (
  id, order_id, product_id, quantity, unit_price_at_order
)

riders (
  id, user_id, name, phone, vehicle_number, is_active
)

payouts (
  id, store_id, week_start, week_end, gross_amount,
  commission_deducted, net_payout, status
)

rider_earnings (
  id, rider_id, order_id, amount, paid_at
)
```

`unit_price_at_order` remains deliberately denormalized. `orders.picked_up_at` (renamed from a generic "out_at") is now written directly by the rider app's "mark picked up" action — this is a new, real data point v1 didn't have when partner/rider were web/WhatsApp-only. `rider_earnings` is new — needed to power the rider app's earnings screen (R5).

---

## 17. API Design

REST, resource-based, role-scoped auth on every endpoint.

| Endpoint | Method | Consumed by | Purpose |
|---|---|---|---|
| `/auth/otp/request` | POST | All 4 apps | Send OTP to phone |
| `/auth/otp/verify` | POST | All 4 apps | Verify OTP, issue role-scoped session |
| `/zones` | GET | Customer | List serviceable zones |
| `/stores?zone_id=` | GET | Customer | Stores in a zone |
| `/stores/:id/products` | GET | Customer | Store catalog |
| `/orders` | POST | Customer | Create order (validates cart, locks prices) |
| `/orders/:id` | GET | Customer, Partner, Rider, Admin | Order detail + status (scoped to what each role should see) |
| `/orders/:id/status` | PATCH | Partner (packed), Rider (picked-up/delivered), Admin | Updates status, triggers realtime + notification |
| `/payments/webhook` | POST | Razorpay | Payment confirmation |
| `/partner/products` | GET/POST/PATCH | Partner app | Catalog management |
| `/partner/orders` | GET | Partner app | Store's incoming order queue |
| `/partner/payouts` | GET | Partner app | Own store's payout history |
| `/rider/assignments` | GET | Rider app | Rider's current/past assignments |
| `/rider/earnings` | GET | Rider app | Rider's earnings history |
| `/admin/stores/pending` | GET/PATCH | Admin | Store approval |
| `/admin/riders/pending` | GET/PATCH | Admin | Rider approval |
| `/admin/orders` | GET | Admin | Cross-store order monitor |
| `/admin/orders/:id/assign-rider` | PATCH | Admin | Manual rider assignment |
| `/admin/payouts` | GET | Admin | Weekly payout computation, export |

Order creation remains the one transactional endpoint requiring all-or-nothing handling: validate stock, lock item price, create order + order_items, initiate Razorpay payment intent.

---

## 18. Real-Time & Notification Architecture

- **In-app status updates (customer):** Supabase Realtime subscription on the active order row.
- **Push notifications (partner, rider):** Expo Push Notifications — new order → partner app; new assignment → rider app. Native push is the right fit here since both are installed apps with a direct, ongoing relationship to the platform.
- **WhatsApp notifications (customer only):** Interakt/Gupshup, template messages on every status transition — order placed, packed, out for delivery, delivered.
- **SMS fallback (customer only):** Twilio, triggered only if WhatsApp delivery fails.
- **Admin dashboard:** Supabase Realtime subscription on the full orders table (filtered/paginated) so the cross-app order monitor updates live without polling.

---

## 19. Security & Compliance

- Razorpay handles all payment credential data — PCI-DSS scope stays off Flikk's infrastructure entirely.
- Phone-OTP is the only auth method across all four roles.
- Supabase RLS on every table, scoped per role: customer → own orders/addresses; store_owner → own store's products/orders/payouts; rider → own assignments/earnings; admin → all.
- `users.is_approved` gates store_owner and rider app access until admin approval — prevents unvetted parties from appearing as live stores or riders.
- Razorpay webhook signature verification on every payment callback.

---

## 20. DevOps, Hosting & Cost Model

| Layer | Choice | Est. monthly cost at MVP volume |
|---|---|---|
| Backend API | Railway or Render | ₹0-500 |
| Database + Auth + Realtime | Supabase | ₹0 (free tier) |
| Admin dashboard | Vercel | ₹0 (hobby tier) |
| Payments | Razorpay | Transaction fee only (~2%) |
| WhatsApp API | Interakt/Gupshup | ₹500-1,000 |
| Push notifications (partner + rider) | Expo Push | ₹0 at this volume |
| **Total** | | **under the revised ₹2,500/month NFR target** |

CI: GitHub Actions — lint + typecheck on every push across all four codebases, Expo EAS Build for the three app binaries, auto-deploy backend + admin on merge to main.

**App store submission note:** three separate Play Store listings (customer public, partner and rider can launch via closed/internal testing tracks to skip full public review during the pilot phase — only the customer app needs to be publicly discoverable at launch).

---

## 21. Analytics & Instrumentation

- `order_placed`, `order_delivered`, `order_cancelled`
- `app_opened`, `zone_selected` (customer)
- `store_viewed`, `product_added_to_cart`, `cart_abandoned` (customer — leading indicator of engagement problems)
- `reorder_tapped` (customer)
- `partner_order_accepted`, `partner_order_packed`, `partner_app_session` (partner — adoption tracking against the >90% target in Section 8)
- `rider_assignment_accepted`, `rider_delivery_completed`, `rider_app_session` (rider — adoption tracking)

Tool: PostHog or a Supabase event table — either sufficient at this scale.

---

## 22. Monetization Model

- **Commission:** 12-18% from store partner per order.
- **Delivery fee:** ₹20-30 flat, customer-paid, passed to rider via `rider_earnings`.
- **No onboarding/listing fee** for stores or riders.

---

## 23. Go-to-Market Plan

**Phase 0 (Week 0, pre-code):** manual WhatsApp pilot in target zone — validate 20+ organic orders/week before writing production code. This phase is unaffected by the four-app architecture decision — validate demand before building any app.

**Phase 1:** build all four surfaces per Section 9 scope.

**Phase 2 (Launch):** onboard 10-15 stores — this now includes installing and training on the partner app, not just a WhatsApp habit change, so budget onboarding time accordingly. Recruit riders onto the rider app similarly. Founder personally seeds first 50 customers.

**Phase 3 (Month 2-3):** evaluate against Section 8 targets, including the new partner/rider app-adoption metrics, before any second-zone expansion.

---

## 24. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Three native apps take meaningfully longer to build than one web dashboard | Shared design tokens, shared navigation/state patterns across the three RN apps reduce duplicated decision-making, even though code isn't shared; see BUILD-PLAN-Flikk.md for the revised timeline |
| Store owners/riders resist installing yet another app | Keep partner/rider apps radically simple (Section 6) — installation and first-use friction must stay near-zero, or this app-first bet backfires vs. the original WhatsApp-fallback plan |
| Repeats eSamudaay's engagement/cost problem | Study eSamudaay directly pre-build; instrument `cart_abandoned` from day 1 |
| Rider app has zero users at launch (chicken-and-egg with orders) | Founder personally serves as the first rider using the rider app, validating it end-to-end before recruiting external riders |
| App store review delays partner/rider launch | Use closed/internal testing tracks for partner and rider apps — no public review gate needed during pilot |
| National players eventually enter these zones | Local execution speed + founder's community trust |

---

## 25. Pre-Build Validation Checklist

1. Install and use eSamudaay app as a customer — document specific UX/catalog/coverage gaps
2. Interview 3-5 kirana owners already on eSamudaay — app-quality problem or fundamental demand weakness?
3. Run 2-week manual WhatsApp pilot, 5 stores, founder-as-rider — confirm 20+ organic orders/week before scaling to full four-app build (this validation gate matters even more now, given the larger build investment)

---

## 26. Roadmap Beyond v1

- **v1.1:** order ratings, basic repeat-customer discount
- **v2:** semi-automated rider assignment once manual dispatch hits its ceiling
- **v2.1:** second zone expansion (Karkala/Kundapura or similar)
- **v3:** live GPS tracking, multi-store cart, real-time POS inventory sync

---

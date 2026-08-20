# `src/` structure

```
src/
  components/   shared UI primitives used by more than one screen
    AppIcon.tsx    HugeIcons wrapper — see apps/customer's own copy, kept in sync by hand
    BottomNavBar/  floating black-glass pill nav (Orders/Catalog/Payouts) — all three wired to real screens
  navigation/   route param types + the one Navigator this app has
  screens/      one file per screen, named after what it shows, not its PRD code (P1-P6)
    orders/     order queue (P2) — this app's home screen, see its own data.ts
    catalog/    catalog management (P4) — item list + stock toggle
    payouts/    weekly settlements (P5) — read-only
  theme/        design tokens (colors, spacing, type) — see specs/00-foundation/design-system.md
```

## Where things live, and why

- **No `store/` yet.** No auth exists (Login/OTP, P1, is a later pass — see `App.tsx`), so there's no session state to hold. `store/useAuthStore.ts` lands here the same shape as `apps/customer`'s once P1 is built.
- **No `api/` yet**, for the same reason — every screen's `data.ts` is placeholder data shaped to match the real backend endpoint it'll eventually call (`backend/src/routes/partner.ts` already implements `GET /partner/orders`, `/products`, `/payouts` — they're just not reachable from this app without a session token yet).
- **`components/BottomNavBar/`** is the exact dark-glass recipe from `apps/customer`'s own `BottomNavBar` (BlurView `systemThickMaterialDark` + a black wash) — copied, not shared, per `specs/00-foundation/repo-structure.md`'s no-`/packages/shared`-yet rule. Active tab is derived from the navigator's own current route (`useNavigationState`), not locally tracked state.
- **`theme/tokens.ts`** is copied (not npm-linked) from `apps/customer`. Keep both in sync by hand if design tokens change.

## Current screens

| Screen | File | Spec |
|---|---|---|
| Order queue (home) | `screens/orders/OrdersScreen.tsx` | P2 — `specs/02-partner-app/screens.md` |
| Catalog management | `screens/catalog/CatalogScreen.tsx` | P4 |
| Payouts | `screens/payouts/PayoutsScreen.tsx` | P5 |

Not yet built: Login/OTP (P1), Order detail (P3, "mark packed" currently happens inline on the queue card instead), Store settings (P6). See `specs/02-partner-app/screens.md` for the full inventory.

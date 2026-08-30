# `src/` structure

```
src/
  api/          fetch wrapper + one file per backend resource (auth.ts, later: stores.ts, orders.ts...)
  components/   shared UI primitives used by more than one screen (buttons, inputs)
    BottomNavBar/ floating pill nav (Home/Order Again/Categories/Store) — Home, Categories, and Store are wired to real screens
  location/     geocoding helpers (expo-location wrapper) — used only by screens/location/
  navigation/   route param types + one Navigator per app section (Auth, App) + RootNavigator
  screens/      one file per screen, named after what it shows, not its PRD code
    location/   the permission → search → map-confirm flow, see its own README
    categories/ grouped category grid, reached from the bottom nav — see its own README
    search/     search screen (top stores + most-searched grid), reached by tapping the Home search bar — see its own README
    store-list/ vertical store list, reached from the bottom nav's Store tab, reuses Home's header — see its own README
    home/       Home screen + its header components, see its own README
      products/ shared product-card UI (ProductCard, ProductSection) — used by fish/ and sections/, see its own README
      fish/     Fresh Fish product grid, shown when that category tab is selected — see its own README
      deals/    ads/deals promo card — see its own README
      sections/ "All" tab content (deals + Today's Steal Deals), only shown when 'all' is selected — see its own README
      nearby-stores/ "Shops near you" static row on the All tab — see its own file
      everyday-essentials/ horizontal "Everyday essentials" row on the All tab
      coastal-kitchen-picks/ horizontal "Coastal Kitchen picks" row on the All tab
      category-tab/ shared sub-category-grid + promo-banner + teaser-row components — used by groceries/, bakery/, essentials/, see its own README
      groceries/ "Groceries" tab content — see its own README
      bakery/    "Bakery" tab content — see its own README
      essentials/ "Essentials" tab content — see its own README
  store/        Zustand stores — one file per slice of client state
  theme/        design tokens (colors, spacing, type) — see specs/00-foundation/design-system.md
```

## Where things live, and why

- **`api/client.ts`** is the only place that knows the base URL and attaches the auth header. Every other `api/*.ts` file calls through it — never `fetch` directly from a screen or component.
- **`store/useAuthStore.ts`** is the single source of truth for "is the user logged in." `navigation/RootNavigator.tsx` reads it to decide whether to render `AuthNavigator` or `AppNavigator` — no screen should independently decide navigation based on auth state.
- **`store/useLocationStore.ts`** is the single source of truth for "has a delivery location been picked." `navigation/AppNavigator.tsx` reads it to decide whether to open on the location flow or straight to Home. Local/on-device only for now — see `screens/location/README.md` for the backend gap.
- **`navigation/types.ts`** lists every route and its params in one place — check here first when adding a screen, not by grepping `navigate()` calls.
- **`screens/home/components/CollapsibleHeaderTop.tsx`** collapses the ETA/location text on scroll (height + opacity, driven by a `scrollY` shared value from `HomeScreen.tsx`'s `Animated.ScrollView`) — everything else in the header (avatar, search, category tabs) stays fixed via `stickyHeaderIndices`.
- **`theme/tokens.ts`** is copied (not npm-linked) into `apps/partner` and `apps/rider` too. If you change it here, copy the same change there — see `specs/00-foundation/repo-structure.md` for why there's no shared package yet.

## Current screens

| Screen | File | Spec |
|---|---|---|
| Onboarding | `screens/OnboardingScreen.tsx` | PRD C1 (Splash), expanded |
| Login (phone) | `screens/LoginScreen.tsx` | `specs/00-foundation/auth-and-roles.md` |
| OTP verification | `screens/OtpVerificationScreen.tsx` | `specs/00-foundation/auth-and-roles.md` |
| Location permission | `screens/location/LocationPermissionScreen.tsx` | See `screens/location/README.md` |
| Location search + map pin confirm | `screens/location/LocationSearchScreen.tsx` | See `screens/location/README.md` |
| Home | `screens/home/HomeScreen.tsx` | PRD C3 — header is real, body is a placeholder. See `screens/home/README.md` |
| Categories | `screens/categories/CategoriesScreen.tsx` | See `screens/categories/README.md` |
| Search | `screens/search/SearchScreen.tsx` | See `screens/search/README.md` |
| Store list | `screens/store-list/StoreListScreen.tsx` | See `screens/store-list/README.md` |

Everything past Home (C4–C11: browse, cart, checkout, tracking, profile) is still to be built — see `specs/01-customer-app/screens.md`.

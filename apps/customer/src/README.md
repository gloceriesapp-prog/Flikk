# `src/` structure

```
src/
  api/          fetch wrapper + one file per backend resource (auth.ts, later: stores.ts, orders.ts...)
  components/   shared UI primitives used by more than one screen (buttons, inputs)
  location/     geocoding helpers (expo-location wrapper) — used only by screens/location/
  navigation/   route param types + one Navigator per app section (Auth, App) + RootNavigator
  screens/      one file per screen, named after what it shows, not its PRD code
    location/   the permission → search → map-confirm flow, see its own README
  store/        Zustand stores — one file per slice of client state
  theme/        design tokens (colors, spacing, type) — see specs/00-foundation/design-system.md
```

## Where things live, and why

- **`api/client.ts`** is the only place that knows the base URL and attaches the auth header. Every other `api/*.ts` file calls through it — never `fetch` directly from a screen or component.
- **`store/useAuthStore.ts`** is the single source of truth for "is the user logged in." `navigation/RootNavigator.tsx` reads it to decide whether to render `AuthNavigator` or `AppNavigator` — no screen should independently decide navigation based on auth state.
- **`store/useLocationStore.ts`** is the single source of truth for "has a delivery location been picked." `navigation/AppNavigator.tsx` reads it to decide whether to open on the location flow or straight to Home. Local/on-device only for now — see `screens/location/README.md` for the backend gap.
- **`navigation/types.ts`** lists every route and its params in one place — check here first when adding a screen, not by grepping `navigate()` calls.
- **`theme/tokens.ts`** is copied (not npm-linked) into `apps/partner` and `apps/rider` too. If you change it here, copy the same change there — see `specs/00-foundation/repo-structure.md` for why there's no shared package yet.

## Current screens

| Screen | File | Spec |
|---|---|---|
| Onboarding | `screens/OnboardingScreen.tsx` | PRD C1 (Splash), expanded |
| Login (phone) | `screens/LoginScreen.tsx` | `specs/00-foundation/auth-and-roles.md` |
| OTP verification | `screens/OtpVerificationScreen.tsx` | `specs/00-foundation/auth-and-roles.md` |
| Location permission | `screens/location/LocationPermissionScreen.tsx` | See `screens/location/README.md` |
| Location search | `screens/location/LocationSearchScreen.tsx` | See `screens/location/README.md` |
| Map pin confirm | `screens/location/MapConfirmScreen.tsx` | See `screens/location/README.md` |
| Home (stub) | `screens/HomeScreen.tsx` | Placeholder for PRD C3 — full build in `specs/01-customer-app/` |

Everything past Home (C4–C11: browse, cart, checkout, tracking, profile) is still to be built — see `specs/01-customer-app/screens.md`.

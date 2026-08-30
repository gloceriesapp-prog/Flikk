# Location flow

Runs once between login and Home, until a delivery location is saved (then
`AppNavigator` skips straight to Home on future opens — see `useLocationStore`).

```
LocationPermissionScreen
  ├─ Allow  → GPS fix → reverse-geocode → LocationSearchScreen (pre-centered)
  └─ Deny   → LocationSearchScreen (default zone center)

LocationSearchScreen
  → search bar + live map + fixed center pin, all one screen
  → text search or the on-map "Current location" pill both just re-center
    the same map — no separate confirm page to navigate to
  → drag map under the fixed center pin, reverse-geocode on settle
  → "Confirm location" → useLocationStore.setLocation() → reset stack to Home
```

## Why this shape

- **Soft-ask before the OS dialog.** `LocationPermissionScreen` is our own copy,
  shown before `expo-location`'s native permission prompt fires. Priming users
  with context first measurably lowers hard-denial rates versus firing the OS
  dialog cold on screen mount.
- **Fixed-pin-under-moving-map**, not a draggable `Marker`. Same pattern
  Blinkit/Zepto/Swiggy use — avoids the marker's drag gesture fighting the
  map's own pan gesture.
- **No Google Places API.** Search and reverse-geocoding both go through
  `expo-location`'s device-native geocoder (`src/location/geocoding.ts`) —
  free, no key, no live autocomplete dropdown. If a true type-ahead search
  is wanted later, that's a deliberate call to add a paid API — see
  `specs/00-foundation/environments-and-config.md`'s cost ceiling before
  reaching for it.

## Known gaps — flag before relying on these

- **Not persisted server-side.** `useLocationStore` only writes to
  `SecureStore` on-device. `specs/00-foundation/api-conventions.md` has no
  `/addresses` endpoint yet, even though the `addresses` table exists in
  `data-model.md`. Add that endpoint deliberately when "save to account" is
  actually needed — don't bolt it onto this flow silently.
- **`react-native-maps` isn't in Expo Go** (SDK 52+ dropped it from the
  prebuilt client). `LocationSearchScreen` needs a dev build
  (`npx expo run:ios` / `run:android`, or an EAS dev client) to render at all.
- **Android needs a Google Maps API key** (`app.json` →
  `android.config.googleMapsApiKey`) or the map renders blank grey tiles.
  iOS uses Apple Maps by default, no key needed.

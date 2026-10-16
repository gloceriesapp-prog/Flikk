# Customer location flow

`LocationPermissionScreen` requests foreground GPS access, then opens
`LocationSearchScreen`. `SelectLocationScreen` offers saved addresses, recent
searches and manual search. The map screen keeps one selected coordinate and
reverse-geocodes every explicit selection and settled manual pan. Confirming a delivery location
persists it locally; the address-book intent opens `AddressFormScreen`, which
saves the complete address through `/addresses`.

## Separate map rendering from address lookup

| Responsibility | Configuration | Restrictions |
| --- | --- | --- |
| Android map tiles | `ANDROID_GOOGLE_MAPS_API_KEY` in this app's EAS environment | Maps SDK for Android; package `com.gloceries.customer` plus signing SHA-1 |
| iOS map tiles | Optional `IOS_GOOGLE_MAPS_API_KEY` in this app's EAS environment | Maps SDK for iOS; bundle `com.gloceries.customer` |
| Server reverse-geocoding | `GOOGLE_GEOCODING_API_KEY` in backend environment only | Geocoding API; server restrictions compatible with backend egress |

`GOOGLE_GEOCODING_MAP_KEY` and `GOOGLE_MAPS_API_KEY` are supported Android aliases.
If multiple Android names are configured, their values must match. Never copy the server geocoding key
into the mobile app. `app.config.js` uses the shared native-key resolver; it
rejects conflicting or malformed keys and a missing Android key on release
builders. The release verification script permits iOS Apple Maps without an
Android key.

Android always uses Google Maps. iOS defaults to Apple Maps; setting an iOS
Google key enables Google Maps on a **new native build**. Changing an EAS
variable or backend variable does not replace the key embedded in an already
installed binary. After rotating or deleting a native map key, rebuild and
install the app. For local generated native projects, run `npx expo prebuild`
to regenerate configuration before `npx expo run:android`; preserve any manual
native edits first. EAS builds use the committed Expo configuration because
native folders are ignored.

Register the SHA-1 for the actual installed build: debug, EAS-signed internal
build and Google Play App Signing certificates can differ. A working backend
address lookup does not prove native tiles are authorized. Inspect Android
logcat for Google Maps authorization errors if the map is blank. Native keys
are embedded identifiers; package/certificate and API restrictions protect them.

## Address and GPS behavior

- `reverseGeocode` calls the backend `/location/reverse-geocode` first, then
  falls back to the device geocoder. The client deadlines are eight and three
  seconds respectively; backend provider failures are retryable rather than
  cached as successful empty addresses. An unresolved result is explicit.
  Backend lookup never supplies map tiles.
- Search suggestions use backend `/location/search`; free-text resolution
  uses `expo-location` geocoding. Nearby landmarks cannot replace the pin's
  actual address and are not requested by the map confirmation screen.
- `useLiveLocation` admits fresh, bounded-accuracy GPS updates, holds tiny
  stationary changes, and requires coherent outliers before rebasing.
  GPS accuracy remains limited by device permission,
  indoor reception and OS accuracy settings. A geocoded label does not change
  the selected coordinate. Explicit current-location actions acquire fresh
  validated readings rather than using a preview captured earlier.
- Device acquisition combines concurrent callers and races high-accuracy GPS
  against a cached fix. Cache reuse requires a reading at most two seconds old
  with known reported accuracy within 25 m. Native readings within 25 m resolve
  immediately; after 2.5 seconds of refinement, a native reading within 50 m
  and at most five seconds old can open a map preview. Its actual uncertainty
  remains visible in the map circle and location button; the continuous watch
  keeps improving it. Older, unknown-accuracy and very coarse readings cannot
  become the current-location pin. A temporary watch runs alongside acquisition,
  bounded by the same 15-second deadline. The continuous
  watch starts without waiting for the
  Android accuracy prompt. Location entry screens open the map once GPS is
  ready; address resolution happens there instead of blocking navigation.
  Confirmed movement uses lighter smoothing, while stationary drift is held.
  The cache contains native readings rather than filtered display anchors.
  Explicit recentering reanchors the blue dot and delivery pin together,
  preferring a newer precise watch reading over an older acquisition result.
- Request gates discard stale reverse-geocoding results after a newer map
  movement. Nearby repeated camera settles reuse in-flight address lookups.
  Dragging or searching stops GPS follow; newer readings cannot overwrite a
  manual pin. Tracking stops while this screen is unfocused.
- The full address remains visible beneath the headline. Failed lookup shows
  a retry action and disables confirmation; the app never saves a previous
  address against a new unresolved coordinate.
- `locationFilter.test.ts`, `reverseGeocoding.test.ts` and
  `locationSelection.test.tsx` cover filtering, deadlines, retries and manual
  selection races. Configuration
  regression tests check native-key separation; real map rendering still
  requires an installed native build with valid Google restrictions.

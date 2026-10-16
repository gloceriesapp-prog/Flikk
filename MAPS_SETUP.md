# Maps and location credentials

Map tiles, device GPS, address lookup and road routes are independent paths.
Changing a backend credential does not replace the credential embedded in an
installed Android/iOS app. Rotating and deleting a native SDK key disables
older builds using that key; ship a replacement build before retiring it.

## Credential ownership

| Environment variable | Where configured | Google API and restriction |
| --- | --- | --- |
| `ANDROID_GOOGLE_MAPS_API_KEY` | Each app's EAS environment and local app environment | Maps SDK for Android; Android package + signing SHA-1 |
| `GOOGLE_GEOCODING_MAP_KEY` | Supported Android SDK alias in each app/EAS environment | Despite its name, this is a native map key, not a Geocoding REST key |
| `GOOGLE_MAPS_API_KEY` | Existing Android name, still supported | Same Android key; omit when using the platform-specific name |
| `IOS_GOOGLE_MAPS_API_KEY` | Each app's EAS environment, optional | Maps SDK for iOS; restrict by bundle identifier |
| `GOOGLE_GEOCODING_API_KEY` | Backend/Railway only | Geocoding API; server IP restriction where static egress is available |
| `GOOGLE_ROUTES_API_KEY` | Backend/Railway only | Routes API; server IP restriction where available |
| `GOOGLE_GEOCODING_ROUTE_KEY` | Supported backend routing alias | Routes API; explicit empty value disables routing unless the other routing alias is configured |
| `GOOGLE_PLACES_API_KEY` | Backend/Railway only | Places API for legacy nearby lookup, if used |

Prefer separate SDK keys for each app to isolate usage and rotation. Never put
backend web-service credentials in `EXPO_PUBLIC_*`, app config or client code.
Native SDK keys necessarily exist inside binaries and must be protected with
Google's application and API restrictions. Do not use an Android-restricted
key for backend HTTP calls. Keep billing enabled and set quotas/alerts.

## Android registration

Register the correct package and signing SHA-1 for every distribution:

| App | Package |
| --- | --- |
| Customer | `com.gloceries.customer` |
| Partner | `com.gloceries.partner` |
| Rider | `com.gloceries.rider` |

Google Play internal testing uses the **Play app-signing certificate**, which
can differ from EAS/upload and local debug certificates. Find its SHA-1 in
Play Console's app integrity/app signing settings. Register local debug and
directly installed EAS build fingerprints separately when testing them.
Do not guess fingerprints from another app.

## Build and rollout

1. Create or restore the SDK-restricted Android key in Google Cloud. Enable
   Maps SDK for Android. Keep the new working Geocoding key in the backend.
2. Set `ANDROID_GOOGLE_MAPS_API_KEY` in the matching EAS environment for each
   project. Remove a conflicting legacy `GOOGLE_MAPS_API_KEY`, or make it match.
   Native map configuration is consumed during the build, not by Railway.
3. For local native builds with generated native folders, run
   `npx expo prebuild --platform android` from that app directory before
   `npx expo run:android`. This refreshes the manifest from config. Review any
   manually maintained native changes first; do not use `--clean` blindly.
4. For Play distribution build each app with
   `npx eas-cli build --platform android --profile production`, then upload
   the resulting AAB to internal testing and install the new version.
5. If enabling Google Maps on iOS, add its separate key, enable Maps SDK for
   iOS, and produce a new iOS native build. Without this key, use Apple Maps.
   Changing Google-vs-Apple native support requires a new compatible runtime
   version before publishing OTA JavaScript to avoid old-binary mismatches.

An OTA update, Metro restart, or backend redeploy cannot repair a deleted key
embedded in an old native build. Do not disable Android application restrictions
as a permanent workaround.

## Verification

- Confirm tiles render in each new signed app on a physical device.
- Confirm current GPS pin and permission-denied/manual-pin flows independently.
- Confirm address labels load through `/location/reverse-geocode` and native
  fallback remains usable when the backend is unavailable.
- Confirm rider road routes return a real route; a straight fallback line does
  not prove Routes API authorization succeeded.
- Repeat on Play internal testing, not only a debug APK. If tiles remain blank,
  inspect Android logcat for Google Maps authorization failures; compare the
  logged package/signing fingerprint with Cloud restrictions. Never share keys.

Automated provider mocks and config tests validate code contracts but cannot
prove Google Cloud billing, production restrictions, or physical tile rendering.

References: [Google API security guidance](https://developers.google.com/maps/api-security-best-practices),
[react-native-maps installation and blank map troubleshooting](https://github.com/react-native-maps/react-native-maps/blob/master/docs/installation.md).

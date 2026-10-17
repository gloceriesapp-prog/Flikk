# Partner app updates

`AppUpdateGate` is mounted once, above the navigator, login and release policy gate.
It runs on Android/iOS release builds with Expo Updates enabled. Metro and Expo Go
skip it; they cannot exercise the native update lifecycle.

- `updateController.ts`: single-flight discovery, download and restart; foreground
  checks are limited to once per minute. No account data or auth is required.
- `useAppUpdate.ts`: connects Expo's startup/download state and real asset progress
  to the controller. Already-downloaded updates immediately offer Reload App.
- `AppUpdateSheet.tsx`: bottom-aligned white sheet, safe-area spacing, scrollable
  copy, progress, and a pinned black retry/reload button that remains visible.
- `UpdateProgressBar.tsx`: smoothly interpolates real native progress, provides
  an indeterminate sweep when the total is unknown, and respects reduced motion.
  Expo exposes a fraction, not byte totals: no artificial MB/s or ETA is shown.

Discovery failures leave the existing app usable. Once an available update is
detected, the sheet cannot be dismissed by backdrop, swipe or Android Back.
Download failures retain the gate with Retry download. Restart failures retain
the downloaded update with Reload App. Progress stays below 100% until Expo
confirms the update is downloaded; unknown progress is labelled without a fake
percentage. No automatic retry loop or automatic restart interrupts the user.

This installs compatible JS/assets updates from this app's EAS channel and runtime.
Native dependency/config changes still use the existing ReleaseGate app-store
flow and a new binary. Introducing this sheet cannot change the older JS already
running on a phone: its first OTA installation uses that build's existing update
behavior. Subsequent updates can use this sheet.

## Verification

Controller tests: `cd backend && npm test -- src/partner/appUpdate.test.ts`.
App checks: `cd apps/partner && npm run typecheck && npm run lint`.

For visual review in a local debug build, start Metro with
`EXPO_PUBLIC_UPDATE_UI_PREVIEW=true`. `AppUpdatePreview` shows a labelled,
simulated download animation followed by the ready sheet. Its Reload App button closes the preview;
it does not claim to install or validate an OTA. The preview is gated by
`__DEV__` and cannot run in a release build, even if the flag is accidentally set.

For real lifecycle testing, use a release build on a test EAS channel with two
compatible updates. Open the older update: verify the sheet, disable networking
during download, retry, then Reload App. Confirm a new update ID is running and
the sheet closes after restart. Repeat foreground/background, Android Back,
large text, rotation, and iOS safe-area checks. An ordinary debug build cannot
prove OTA download/reload behavior. Never publish dummy download states to the
production channel for visual testing.

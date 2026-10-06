# Customer notifications

- `api.ts`: typed, account-owned inbox and read acknowledgements.
- `target.ts`: strict order/trip payload validation and account/navigation readiness policy.
- `navigation.ts`: one pending tap, bounded native deduplication, server ownership lookup, retry and navigation.
- `useNotifications.ts`: foreground listeners, cold-start last response, token rotation and foreground recovery.
- `native.ts`: native-build capability guard, permissions/settings and serialized device ownership registration.
- `NotificationsScreen.tsx`: Profile → Notifications; paginated inbox, refresh/retry and permission controls.

Tap navigation waits through SecureStore hydration, the welcome gate and login. A different signed-in account discards the pending target. Only verified order/trip IDs open TrackOrder. Native notification and inbox taps share the ownership check; inbox entries can be opened repeatedly.

Installation IDs are persisted independently of accounts. Registration revisions increase monotonically; the server rejects old registration requests and logout leaves a revision tombstone. Logout detachment is best effort if the network is unavailable. The next online login rebinds the installation; foreground alerts are suppressed when their account does not match. Push copy intentionally contains no address or product details. Already delivered system alerts can exist until the OS clears them; pending inbox data is isolated by customer.

Remote push requires a physical native development/release build, EAS project ID and configured APNs/FCM credentials. Expo Go still supports the inbox but does not import remote notification APIs. Permission is requested from the inbox's Enable notifications action, never repeatedly on token refresh. Denied permissions lead to device settings.

Acceptance: test foreground, background and killed-app taps on iOS and Android, allow/deny/settings changes, token rotation, offline order lookup/retry, multi-shop trip targets, and A→B logout/login. Automated tests cover payload policy and backend delivery; native acceptance remains pending.

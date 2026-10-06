# Customer account boundaries

`useAuthStore.customerId` is the JWT subject used only as a local namespace. The backend authenticates the token and authorizes every resource independently.

Logout and a fresh login synchronously cancel/clear the outgoing QueryClient, replace it with a fresh client, reset cart/wishlist/location, and remount the navigation stack. Private orders, trips, profiles, addresses, reviews, referral data, quotes, payment recovery, support, refunds and notifications include customer ID in their keys. Access tokens are never cache keys; refresh keeps the same cache and navigation.

Every API call captures its starting session epoch. A late successful response is rejected after account change. Old 401s cannot refresh using the next account's refresh token or expire that account. Secure token/location writes are serialized; wishlist callbacks and location hydration are guarded against late completion. Saved checkout attempts remain in customer-specific namespaces so signing back in can recover a pending payment safely.

## Device acceptance test (not yet executed)

Use two test customers on the same iOS device and repeat on Android:

1. Sign in as A. Load purchase history, profile, saved addresses, wishlist, refunds, support cases and notification inbox; add a cart item.
2. Throttle/disconnect networking while loading orders and updating the wishlist. Log out and sign in as B. Resume networking. No A data, cart, address or navigation should reappear, including a frame during loading.
3. Cause A's access token to expire with an old request still pending. Sign in as B before A's response/refresh completes. B must stay signed in and its tokens/cache must stay unchanged.
4. Force close/relaunch as B. Confirm B's session is restored. Sign back in as A and confirm its backend history and any pending payment recovery remain available.
5. Tap an A push while B is signed in. It must not open A's order. Send B a new order update and confirm B owns the device registration.

Automated tests in `backend/src/lib/customerAccountIsolation.test.ts` cover the two-account cache and API/refresh races. They do not replace these native device checks.

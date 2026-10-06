# Home browsing readiness

Home warms bounded inventory previews for up to five nearby stores and the enabled Grocery, Fresh and Regional tabs. Festival and the All page reuse the existing 48-product-per-store preview. The shared Home content response already contains all three managed layouts; it is not fetched separately for each tab.

`inventoryPreviewQuery` owns the exact key, endpoint and cache policy used by both background warming and visible shelves. React Query combines simultaneous requests. Warming schedules one request at a time after a small randomized startup delay, skips cached responses, has no retry loop and stops scheduling on backgrounding, address changes or unmount. Full catalogue pages remain demand-loaded and paginated. Warming adds bounded startup work in exchange for faster first category visits; it does not preload every product or image.

Inventory previews are fresh for two minutes and retained for 30 minutes while unused. Layouts are fresh for five minutes. Existing scoped inventory events invalidate affected caches, and existing connection-failure fallback remains responsible for missed live updates. Stale visible queries refresh normally while showing their cached data. These are in-memory caches, so a cold app start may still need the short loading message. Checkout always uses the server's eligibility and price checks.

`BrowseLoadingText` replaces browsing spinners with static, accessible, concise copy. All, managed tabs and Festival reveal their initial inventory layout together rather than rendering a separate loader per shelf. Location selection, empty inventory and retry/error states remain distinct. Payment, order submission and service-coverage retry controls retain their existing progress indicators.

Verification: customer TypeScript and affected-file ESLint; backend Vitest `browseWarmup.test.ts` and `inventoryCache.test.ts` cover request reuse, stopping work after scope changes, background failure handling and scoped invalidation. Device navigation/slow-network visual validation should still be performed on iOS and Android.

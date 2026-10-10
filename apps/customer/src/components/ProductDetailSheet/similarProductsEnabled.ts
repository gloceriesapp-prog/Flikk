// Pure enable-gate for the similar-products query, kept in its own RN/expo-free
// module so it's runnable under `npx tsx` without dragging in the react-query /
// api-client / expo import graph — see useSimilarProducts.selfcheck.ts.
//
// Driven by an explicit `shouldFetch` (e.g. "the detail sheet is open") AND the
// presence of a real category — NOT by category alone, which is what made every
// ProductCard on Home fire the request on mount (~36 requests on one Home open).
export function similarProductsEnabled(shouldFetch: boolean, category: string | undefined): boolean {
  return shouldFetch && Boolean(category);
}

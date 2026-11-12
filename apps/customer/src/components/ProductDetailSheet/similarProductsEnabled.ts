// Pure enable-gate for the similar-products query, kept in its own RN/expo-free
// module so it's runnable under `npx tsx` without dragging in the react-query /
// api-client / expo import graph — see useSimilarProducts.selfcheck.ts.
//
// Driven by an explicit `shouldFetch` (e.g. "the detail sheet is open") AND the
// presence of a product ID. The server resolves its category; brand/search
// responses need not include a category label. The explicit open-state gate
// still prevents every mounted card from making a recommendation request.
export function similarProductsEnabled(shouldFetch: boolean, productId: string | undefined): boolean {
  return shouldFetch && Boolean(productId);
}

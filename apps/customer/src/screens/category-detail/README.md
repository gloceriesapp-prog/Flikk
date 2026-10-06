# Category detail

The shared header contains back, category title and search. The delivery-address row has been removed. The existing category rail remains 86px wide; the product pane is a separate flex child with zero minimum width and clipped overflow. Its horizontal filter toolbar stays above the two-column FlashList, so it cannot cover the left rail on narrow devices.

Sort By supports catalogue order, ascending/descending price and discount percentage. Type uses normalized catalogue category labels. Brand uses checked product-to-brand links from the existing brand registry; it never infers a brand from a product or seller name. The current product API has no brand field and the checked registry is empty, so the Brand sheet explains missing metadata. The filter icon opens all controls, including vegetarian and discounted products. Choices apply immediately; Show products closes the sheet. Reset restores all defaults.

Filters combine with AND. Price ties retain catalogue order; malformed prices sort last. Changing category/subcategory remounts the pane to reset filters and scrolling. Filter changes scroll the grid to the beginning. Missing results have a Clear filters action. Failed initial requests show retry; refresh failures retain cached cards with a retry notice.

Database UUID categories use live category/subcategory endpoints, even with zero subcategories. Static category IDs skip these requests and retain the existing sample appearance with purchasing disabled. Samples never replace an empty or failed real category. Query keys separate categories and subcategories; a 60-second stale window avoids immediate refetches on switching. Removed subcategories fall back to All.

The grid is virtualized and filtering is memoized. The existing backend endpoints still return complete arrays without pagination; server-side pagination and structured brand/type metadata are required before claiming unlimited catalogue scale. This change does not modify those API contracts.

Run the filter tests from apps/customer with Node 22:

```
node --experimental-strip-types --test src/screens/category-detail/filters/__tests__/productFilters.test.mjs
```

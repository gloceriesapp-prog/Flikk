// Shapes shared by the "Today on Gloceries" engine, the backend endpoint, the
// customer app and the admin. Source of truth: this folder (src/*.ts), compiled
// to the package's plain JS + .d.ts by `npm run build` (see package README).
export const EMPTY_STAT = { count: 0, minPrice: null, minPriceMrp: null, maxDiscountPct: null, imageUrls: [] };

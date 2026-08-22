// Real implementation moved to packages/shared/src/location/geocoding.ts —
// it was genuinely duplicated with apps/customer's own copy, so it now
// lives in the one shared package instead. Re-exported from this same path
// so every existing import site in this app (useLiveDistrict.ts,
// StoreLocationCard.tsx, LocationPinScreen.tsx, ...) keeps working
// unchanged.
export * from '@flikk/shared/src/location/geocoding';

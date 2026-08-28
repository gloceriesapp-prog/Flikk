# Essentials data

`EssentialsTab.tsx` (the screen this data was originally built for) was
deleted — it was never wired into `HomeScreen.tsx`, dead code. `data.ts`
survives only because `../store-detail/data/registry.ts`'s Shetty Stores
entry reuses `ESSENTIALS_PRODUCTS` — keep it until that consumer is
removed or given its own data.

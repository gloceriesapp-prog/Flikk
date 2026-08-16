# Home screen

```
home/
  HomeScreen.tsx           composes everything below, owns navigation
  components/
    HomeHeader.tsx          top block: sticky, wraps everything below
    EtaBadge.tsx             "⚡ 9 mins"
    LocationSelector.tsx     reads useLocationStore, taps through to LocationSearch
    ProfileAvatarButton.tsx  stub — no Profile screen (PRD C11) yet
    HomeSearchBar.tsx        search input + notes/wishlist stubs
    CategoryTabs.tsx         horizontal scroll, owns its own selected-tab state
    CategoryTabItem.tsx      single chip
  data/
    categories.ts            placeholder category list
```

One component, one file, one job — no file mixes layout for more than one visual
block. `HomeScreen.tsx` itself only composes; it has no styling of its own beyond
the outer `ScrollView`.

## What's real vs. placeholder

- **Real**: location selector reads the actual saved address (`useLocationStore`,
  set during the `screens/location/` flow) and taps through to change it.
- **Placeholder**: the ETA value, category list, and everything below the header
  (store list). These need backend data that Home doesn't fetch yet — see
  `specs/01-customer-app/screens.md` (C3/C4/C5) for the real build.
- **Stubs, deliberately unwired**: profile avatar, search-bar notes/wishlist
  icons. Their target screens don't exist — wiring them now would mean either a
  crash or a fake no-op that looks done when it isn't. Better to leave visibly
  inert until the real screen exists.

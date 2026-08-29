// @flikk/shared — code proven to be duplicated across at least two of the
// three Expo apps (customer/partner/rider), moved here instead of copied.
// This is a deliberate exception to CLAUDE.md's default "copied, not
// shared" rule for this repo — see that file's own note on why that rule
// exists (solo-dev speed, no premature abstraction). Admin (Next.js/web)
// and backend (Node) are NOT workspace members of this package — different
// platforms, nothing here targets them.
//
// `location` has no React Native dependency of its own worth noting beyond
// expo-location/react-native-maps (peer deps, see package.json). `auth` is
// pure fetch — framework-agnostic, no RN import at all — currently wired
// into apps/partner only, per an explicit "only touch partner right now"
// scope; apps/customer keeps its own still-duplicated copy for now rather
// than being migrated as a side effect of unrelated partner work.
//
// Raw TypeScript source, no build step — each consuming Expo app's own
// metro.config.js is configured to transform this package's source
// directly (see that file's own monorepo-resolver note), same as its own
// src/ files. Nothing to `npm run build` here.

export * from './auth';
export * from './location';

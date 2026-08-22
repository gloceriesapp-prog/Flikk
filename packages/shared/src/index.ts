// @flikk/shared — code proven to be duplicated across at least two of the
// three Expo apps (customer/partner/rider), moved here instead of copied.
// This is a deliberate exception to CLAUDE.md's default "copied, not
// shared" rule for this repo — see that file's own note on why that rule
// exists (solo-dev speed, no premature abstraction) and only add a new
// module here once real duplication is confirmed, not preemptively for
// something only one app currently needs. Admin (Next.js/web) and backend
// (Node) are NOT workspace members of this package — they're different
// platforms with no expo-location/react-native-maps equivalent, so nothing
// here applies to them.
//
// Raw TypeScript source, no build step — each consuming Expo app's own
// metro.config.js is configured to transform this package's source
// directly (see that file's own monorepo-resolver note), same as its own
// src/ files. Nothing to `npm run build` here.

export * from './location';

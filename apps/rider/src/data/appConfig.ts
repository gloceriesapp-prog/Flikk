// Static, local-only config for the soft in-app notice on Home
// (MaintenanceBanner.tsx) — a real deployment would read this from a
// remote-config/backend flag; null here just means "nothing to show,"
// never a blocking gate. Deliberately dismissible, never a forced screen —
// a hard-blocking maintenance modal is its own class of 1-star review.
export const MAINTENANCE_MESSAGE: string | null = null;

// Single-zone launch per CLAUDE.md (Kaup / outer Udupi) — surfaced on Home
// as a plain fact, not a marketing claim, so nothing implies citywide
// coverage that doesn't exist yet.
export const ZONE_LABEL = 'Serving Kaup · Outer Udupi';

// Daily earnings goal for Home's progress nudge — static for now (no
// per-rider target from a backend yet); ₹500 is a plausible single-shift
// number for this zone's mock payout range, not a tuned real figure.
export const DAILY_EARNINGS_GOAL = 500;

// Cosmetic-only mock incentive tier for Home's IncentiveProgressCard —
// CLAUDE.md lists loyalty/incentive programs as explicitly out of scope
// until the MVP validates (Scope discipline section); this is UI-only
// against a static target, not a real bonus-payout ledger. No backend
// reads or writes this — same "cosmetic banner, real ledger deferred"
// pattern already used for the customer app's loyalty points display.
export const INCENTIVE_TARGET = 2000;
export const INCENTIVE_BONUS = 150;

// Placeholder rider name for Home's greeting — auth is phone-only right
// now (api/auth.ts's own note on why there's no real name yet), same gap
// ProfileScreen's generic "Flikk Rider" label already flags. Swap for the
// real onboarding name once that exists; grounded in the same Kaup/outer
// Udupi naming pool as data/mockOrders.ts rather than a placeholder like
// "John Doe".
export const DUMMY_RIDER_NAME = 'Ganesh Poojary';

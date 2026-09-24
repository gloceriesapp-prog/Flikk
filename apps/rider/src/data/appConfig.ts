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

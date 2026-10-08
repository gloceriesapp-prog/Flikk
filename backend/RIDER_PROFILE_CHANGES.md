# Rider identity changes and service zones

Approved riders request updates from **Profile → Your documents**. The backend validates
allowed fields, vehicle registration and ownership of ready private media assets. It stores
a pending request without changing approved identity data. One pending request per rider
is enforced with a row lock and unique index, including concurrent retries.

Administrators review new scans and vehicle details in **Riders → Document and vehicle
changes**. Approval updates the rider and records the decision in one transaction. Rejection
keeps existing details and requires a reason shown to the rider. A repeated identical decision
returns the existing outcome; a contradictory decision conflicts. Review identity references
`auth.users`; clients cannot execute either RPC or read/write the review table directly.

Selfies and document scans remain in private Supabase storage, exposed only through short-lived
signed URLs on authenticated rider/admin APIs. No signed URL is stored as the canonical path.

Service zones come from `riders.zone_id → zones.name`, not bundled geography. Admins assign an
active zone from the Riders roster. The migration backfills existing riders only when exactly
one active zone exists. Multiple-zone deployments must assign each rider explicitly. The
assignment is a profile/service-area label; dispatch continues to apply its existing geographic
eligibility rules and is not restricted by this label.

Maintenance is already controlled by Admin App settings and GET `/app-config/release/rider`.
The existing release gate polls it every minute; no hard-coded maintenance text is reintroduced.

Apply `20261008161055_rider_reviewed_profile_changes.sql` before deploying these routes.
Run `backend/tests/sql/rider-profile-changes.sql` only against the isolated
`flikk_migrations_tests` database. The fixture rolls back all synthetic rows.

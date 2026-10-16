# Store availability

Saved daily opening/closing times use Asia/Kolkata. Opening is inclusive;
closing is exclusive. Overnight schedules are supported. Equal times mean
24 hours. Both hours empty preserve an always-open schedule; a partial or
invalid schedule fails closed.

The partner header switch calls `PATCH /partner/store/availability` with
`mode: open | closed | auto`. The authenticated operator's store is resolved
server-side. A manual choice expires at the next opening/closing boundary;
without a boundary, it expires at the next IST midnight. “Use store hours”
clears it immediately. Editing hours also resumes automatic operation.
Admin suspension, owner suspension/approval and platform ordering hours
cannot be overridden. Already accepted orders keep their normal workflow.

Database triggers materialize `is_active` and the next boundary. The worker
drains indexed due rows in bounded, SKIP LOCKED batches. Final transactional
checkout calculates effective availability from the database clock, so a
delayed worker cannot authorize an expired override. Customer/server product
availability uses the override metadata. Catalogue coverage includes closed
approved shops independently of the orderable-store discovery feed.

Lifting an admin or owner suspension leaves the shop temporarily closed until
the operator reopens it or the next scheduled boundary. Suspension guards run
before availability materialization so attempted reopening remains an explicit
permission error.

Rollout: apply `20261015203513_store_scheduled_availability.sql` and
`20261016051231_preserve_store_suspension_availability.sql`, deploy the
API and worker together, then distribute updated partner/customer JS builds.
Older clients retain the existing schedule checks and may not display a
manual opening outside hours. Never put this scheduler in each API process.

Verify with `npm run test:stores:availability:db` (local-only, rollback) and
the availability, partnerAvailability and nearbyStores Vitest suites.

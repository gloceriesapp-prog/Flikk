# Store team and shared validation

Apply `20261008161114_store_team_access.sql` before deploying the backend or admin UI. It is service-only: clients have no table grants or RPC execution permission.

Admin store details include a team panel. An existing signed-in customer can be explicitly approved as a manager by phone. Riders, admins and existing primary store owners cannot be reassigned. Each manager belongs to one active store; each store has at most 20 managers. The primary owner remains immutable. Removal disables membership without deleting the audit row.

Managers share the partner app/dashboard and can manage orders, catalogue products, customer review replies and the open/closed toggle. Legal identity, store details, document uploads and payout destination remain owner-only. Payout amounts and recorded admin payment notes are readable; bank/KYC fields are omitted from manager store responses. Settings explain the restriction instead of presenting editing forms.

Backend membership lookups are uncached and scoped to the requested store. Role/approval are verified by existing authentication middleware. Authentication `has_store`, order reads/status changes and store push recipients use the same access model. Manager push fanout includes only active, approved store accounts and deduplicates device tokens. A push registration indicator means a token exists; it does not assert notification permission or guaranteed delivery.

`src/stores/validation.ts` is framework-free and imported by partner API and admin store create/edit validation. It enforces common category, document format, field size, coordinates, hours and image-URL rules. Format checks do not verify government records. Partner documents retain their existing write-once restriction; admin can correct them with the same format validation.

Verification: focused Vitest authorization/validation/push suites and `tests/sql/store-team-access.sql` against the disposable bootstrap database. Device sign-in and manager notification delivery require staging tests with two accounts.

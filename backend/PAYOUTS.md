# Manual payouts (no RazorpayX)

RazorpayX is removed entirely. Store and rider payouts are paid by the founder
manually (net banking / any UPI app) once a week and recorded in admin with the
bank reference (UTR). This file is the contract shared by backend, admin,
partner and rider apps.

## Weekly cycle

1. Existing weekly jobs (`jobs/weeklyPayouts.ts`, `jobs/weeklyRiderPayouts.ts`)
   keep computing `payouts` / `rider_payouts` rows with `status = 'pending'`.
2. Admin "Payouts" page lists every pending row per payee: name, payout method,
   UPI ID or bank account + IFSC, payee verification status, net amount.
3. Founder pays outside the app. For UPI, the UPI app shows the registered name
   before confirming — that is the name check (replaces penny-drop).
4. Founder clicks **Mark paid** on that one row and must enter the UTR /
   bank reference. No bulk "mark all paid".

## Schema (migration `102_manual_payouts.sql`)

`payouts` and `rider_payouts` gain:

| column | type | notes |
|---|---|---|
| `utr` | text null | `^[A-Za-z0-9]{6,35}$`, stored upper-case; unique per table (partial unique index where not null) |
| `payment_mode` | text null | `'upi' \| 'bank_transfer'` |
| `payee_snapshot` | jsonb null | destination at the moment it was paid: `{method, upi_id?, account_last4?, ifsc?, account_holder_name?, verified_name?}` |
| `paid_by` | uuid null | admin user id |
| `payment_note` | text null | ≤ 500 chars |

Status set stays `pending \| paid \| blocked \| failed` (`processing` removed;
any existing `processing` rows migrate back to `pending`). `paid` ⇒ `utr`,
`payment_mode`, `paid_at`, `payee_snapshot` all non-null (CHECK constraint).
`razorpay_payout_id` dropped.

`stores` and `riders` gain:

| column | type | notes |
|---|---|---|
| `payout_details_status` | text not null default `'unverified'` | `'unverified' \| 'verified'` |
| `payout_details_verified_at` | timestamptz null | |
| `payout_details_verified_by` | uuid null | admin user id |
| `payout_proof_path` | text null | storage path of cancelled cheque / passbook photo (required for bank method) |

Kept: `payout_method` (`'upi' \| 'bank'`), `payout_upi_id`,
`payout_bank_account_number`, `payout_bank_ifsc`, `payout_bank_name`,
`payout_account_holder_name` (riders; stores add it if missing),
`payout_upi_verified_name` (now = name the founder saw in the UPI app).
Dropped: `razorpay_contact_id`, `razorpay_fund_account_id`,
`payout_release_work` table and its RPCs (`claim_payout_releases`,
`renew_payout_release`, `finish_payout_release`, `settle_payout_webhook`).

Any change to a payee's payout details resets `payout_details_status` to
`'unverified'` (trigger), so a verified flag can never carry over to a new
account.

## RPCs (service_role only, SECURITY DEFINER, `search_path = ''`)

- `mark_payout_paid(p_kind text, p_payout_id uuid, p_utr text, p_mode text, p_admin uuid, p_note text default null) returns jsonb`
  - `p_kind in ('store','rider')`. Locks the row `FOR UPDATE`.
  - Row must be `pending` or `failed`; payee must have payout details.
  - Idempotent: already `paid` with the same UTR → returns the row; different
    UTR → raises `PAYOUT_ALREADY_PAID`. Duplicate UTR on another row →
    `UTR_ALREADY_USED`. Bad UTR → `INVALID_UTR`. Amount ≤ 0 → `NOTHING_TO_PAY`.
  - Writes snapshot from current payee details.
- `set_payee_verification(p_kind text, p_payee_id uuid, p_verified boolean, p_verified_name text, p_admin uuid) returns void`

## Backend API (Express, `backend/src`)

Partner (store owner):
- `GET  /partner/payout-account` → `PayoutAccount`
- `PUT  /partner/payout-account` body `PayoutAccountInput` → `PayoutAccount`

Rider:
- `GET  /rider/payout-account` → `PayoutAccount`
- `PUT  /rider/payout-account` body `PayoutAccountInput` → `PayoutAccount`

```ts
type PayoutAccountInput =
  | { method: 'upi'; upiId: string }                      // ^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$
  | { method: 'bank'; accountHolderName: string;          // 2–100 chars
      accountNumber: string;                              // ^\d{9,18}$
      ifsc: string;                                       // ^[A-Z]{4}0[A-Z0-9]{6}$ (upper-cased server side)
      bankName?: string;
      proofPath: string };                                // must be inside the caller's own storage prefix

type PayoutAccount = {
  method: 'upi' | 'bank' | null;
  upiId: string | null;
  accountHolderName: string | null;
  accountLast4: string | null;      // full number never returned to clients
  ifsc: string | null;
  bankName: string | null;
  hasProof: boolean;
  status: 'unverified' | 'verified';
  verifiedName: string | null;
};
```

Proof upload (bank method's `proofPath`) reuses the existing private
document upload routes — no new endpoint:
- Partner: `POST /partner/store-document-photo` body `{ base64, kind: 'payout-proof' }` → `{ path }` (`store-documents` bucket)
- Rider: `POST /rider/document-photo` body `{ base64, kind: 'payout-proof' }` → `{ path }` (`rider-documents` bucket)

Both routes must add `'payout-proof'` to their `kind` whitelist. The returned
path is `<auth user id>/payout-proof-<uuid>.jpg`, i.e. inside the caller's
own storage prefix, which is what PUT's `proofPath` check requires.

Existing payout history endpoints (`GET /partner/payouts`, `GET /rider/payouts`)
additionally return `utr`, `paymentMode`, `paidAt` per row (UTR shown so the
payee can match it in their bank statement).

Removed: `POST /partner/verify-payout`, rider verify-payout route, payout
webhook events, payout release worker, `RAZORPAYX_ACCOUNT_NUMBER` env.

## Admin (Next.js, service role)

- `GET  /api/payouts?status=pending|paid|all&kind=store|rider|all` (defaults
  `pending`, `all`) — store + rider rows with payee details (full account
  number allowed here — admin only). `pending` = status in
  `pending|failed|blocked` (everything still owed). Row shape:
  `AdminPayoutRow` in `apps/admin/src/lib/types.ts`.
- `POST /api/payouts/[kind]/[id]/mark-paid` body `{ utr, mode, note? }` → calls `mark_payout_paid`.
- `POST /api/payees/[kind]/[id]/verification` body `{ verified, verifiedName? }` → `set_payee_verification`.
- `GET  /api/payees/[kind]/[id]/proof` → short-lived signed URL of the proof image.

Payee id convention (admin routes and `set_payee_verification.p_payee_id`):
store = `stores.id`; rider = `users.id` (= `riders.user_id` =
`rider_payouts.rider_id`), not `riders.id`.

Proof storage: `payout_proof_path` is an object key inside the private
`store-documents` bucket (stores) or `rider-documents` bucket (riders); admin
signs it for 60s. Admin also accepts legacy `payout_method = 'bank_account'`
as bank.

## Backend implementation notes (migration 102, as built)

- RPC errors: `ERRCODE = 'P0001'`, `MESSAGE` = the bare contract code
  (`PAYOUT_ALREADY_PAID`, `UTR_ALREADY_USED`, `INVALID_UTR`, `NOTHING_TO_PAY`)
  or `CODE: human text` for the rest (`INVALID_KIND`, `INVALID_MODE`,
  `INVALID_NOTE`, `INVALID_ADMIN`, `PAYOUT_NOT_FOUND`, `PAYOUT_NOT_PAYABLE`,
  `PAYEE_DETAILS_MISSING`, `PAYEE_NOT_FOUND`, `INVALID_VERIFIED_NAME`).
- `mark_payout_paid` accepts `pending | failed` only; `blocked` rows raise
  `PAYOUT_NOT_PAYABLE` (unblock = fix payee details, then set the row back to
  `pending`). UTR is trimmed + upper-cased by the RPC; uniqueness is checked
  across both tables. Rider payouts also stamp `rider_earnings.paid_at`.
- `payee_snapshot.method` uses `'upi' | 'bank'`. Legacy `'bank_account'` values
  are rewritten to `'bank'` by the migration; CHECK is `('upi','bank')`.
- The `paid ⇒ utr/mode/paid_at/snapshot` CHECK is `NOT VALID`: legacy
  zero-amount rows that the old release worker auto-marked paid have no UTR.
  Every new or updated row is still checked.
- Owners can't self-verify: migration 102 revokes INSERT/UPDATE/DELETE on
  `stores`/`riders` from `anon`/`authenticated` (every app writes through the
  service-role API). `set_payee_verification` touches only verification
  columns, so the reset trigger leaves it alone. Any API `PUT
  /payout-account` sets the status back to `unverified`, even if the details
  are unchanged.
- PUT `proofPath` must match `<caller user id>/<kind>-<uuid>.jpg` and have a
  `ready` `media_assets` row in the caller's bucket, uploaded by the caller.
  Writes are rate-limited to 10 per account (`claim_auth_budget`).

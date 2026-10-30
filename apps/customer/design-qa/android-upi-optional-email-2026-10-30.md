# Android direct UPI optional-email candidate

## Confirmed production issue

The connected CPH2381 runs Play-installed customer 1.0.4 (12). Its cart rejects missing saved email before order creation. The current repository has a receipt-contact form, but that is not in the installed release.

Razorpay live Dashboard > Checkout Features was inspected: Collect email enabled, Optional selected, and the preview labels email optional. The support conversation recommends this setting. Official Checkout Features documentation scopes it to Checkout and hosted payment products; the S2S intent reference still lists email mandatory. Account-specific S2S acceptance remains to be physically verified.

## Candidate behavior

`RAZORPAY_UPI_EMAIL_OPTIONAL` defaults false. When explicitly enabled, the backend advertises `upi_email_optional`, skips saved-email lookup for S2S UPI and omits the email property from its provider request. New Android cart and recovered-payment code skip the Gloceries contact form only with that explicit capability. Older servers and default-off deployments retain contact collection. iOS behavior is unchanged. No invented email, provider key, payee or intent URI is introduced.

Order ownership, transactional intent claims, total/currency/link checks, captured-state reconciliation and duplicate-payment protections remain in place. No database migration is needed.

## Validation

- 67 focused customer tests passed, including optional capability, legacy server fallback, Android recovery and iOS regression coverage.
- Backend suite: 217 files / 1332 tests passed, including provider payload omission, default-off rejection, contact privacy and intent claims.
- Customer and backend TypeScript checks passed.
- Focused customer/backend lint and git diff checks passed.

## Remaining release gate

This is not yet deployed, enabled or verified as a live email-free payment fix. Validate one explicitly approved pending sample checkout on the updated Android app and current live merchant. Stop before payment authorization; no UPI PIN or charge is permitted by this test. If Razorpay rejects omission, keep the switch off and obtain an S2S-specific support answer. The Play-installed build 12 still needs a replacement app release; a dashboard setting cannot remove its bundled guard.

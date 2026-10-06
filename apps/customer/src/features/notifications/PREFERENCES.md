Promotional settings
====================

The Notifications page stores SMS, promotional push and email choices under
`customer_promotional_preferences` in Supabase Auth user metadata. New accounts
and missing channels default to enabled; explicit false values are preserved.
GET/PATCH `/notifications/preferences` are customer-authenticated and always use
the session's account ID. No SQL migration is required. Cached preferences are
scoped to that account and cleared by the existing account-session reset.

The app waits for a successful save before changing a switch, disables switches
while saving and keeps the saved values when a request fails. Device push
permission is separate: enabling a promotional switch does not grant OS permission.
Existing order updates and inbox delivery remain independent.

No promotional SMS/email/campaign sender is currently implemented. Any future
campaign sender must read these saved choices before sending through that channel;
metadata is a communication preference, never an authorization or payment source.

Profile payment selection uses PATCH `/payments/preferred-method` to save a
supported display default without an order. The existing confirmed-order preference
endpoint and all payment verification rules remain unchanged. Profile entry skips
address/quote requests and returns to Profile after a successful selection.

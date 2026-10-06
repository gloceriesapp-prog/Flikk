Promotional delivery
====================

Apply migration 095 to add the service-only outbox. This feature is OFF by
 default (`PROMOTIONS_ENABLED=false`). Default adapters are Twilio Messaging
Services for SMS and Resend for email; neither has been activated or sent a real
message during implementation. Configure approved sender details and keys in
backend environment variables. Never expose them in mobile/admin public env.

An authenticated admin can POST `/admin/promotions` with `campaign_id` (UUID),
`customer_ids` (up to 100 UUIDs), `channel` (`sms` or `email`), `subject`, `body`.
This queues explicit recipients, it does not broadcast to all customers. Reuse
exactly the same campaign ID, recipients and content for retries; the unique
campaign/customer/channel key prevents a repeated request resending messages.
Use a new campaign ID for different content. GET `/admin/promotions/:id` returns
up to 100 status records; it never returns destination phone/email.

The existing standalone worker consumes one claimed job at a time per replica,
rechecks each recipient's confirmed contact and current saved opt-out, and fences
completion by lease token. Expiry cleanup uses bounded locked batches. Resend
retries use the same 24-hour idempotency key. Uncertain SMS responses become
`uncertain` and require provider reconciliation; never manually resend them
without checking Twilio first. `accepted` means provider acceptance, not delivery.
No destination, body, token or raw provider error is written to logs.

Promotional push remains a saved preference; no push campaign broadcaster is
implemented here. Transactional order push/inbox remains separate. Before enabling
SMS/email, verify provider opt-out suppression and your approved promotional
sender/template setup with test recipients. The API has no admin campaign UI yet.

# 05 — Platform (Cross-Cutting)

Concerns shared by every app surface. These aren't built as a standalone "phase" — they're implemented incrementally as each app surface needs them (e.g. Razorpay lands in Week 3 alongside the customer checkout flow, Expo Push lands in Week 5 alongside the partner app). This folder exists so the spec is written once and referenced by every app folder that needs it, instead of restated per app.

## Contents

| File | Covers | First needed by |
|---|---|---|
| [`payments.md`](payments.md) | Razorpay UPI checkout, webhook handling | `01-customer-app` |
| [`realtime.md`](realtime.md) | Supabase Realtime subscriptions | `01-customer-app`, `04-admin-dashboard` |
| [`notifications.md`](notifications.md) | WhatsApp/SMS (customer), Expo Push (partner/rider) | `01-customer-app` (WhatsApp), `02-partner-app` (push) |
| [`testing-strategy.md`](testing-strategy.md) | What actually needs tests vs. what doesn't | All folders, from the first line of code |
| [`security.md`](security.md) | PCI scope, RLS summary, webhook verification | All folders |
| [`analytics.md`](analytics.md) | Event tracking, success metrics | All folders |

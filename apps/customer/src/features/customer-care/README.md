# Help and refunds

`SupportScreen` selects an order and issue; `SupportTicketScreen` reads/replies to a persistent case. `RefundsScreen` lists refunds and `RefundDetailScreen` shows their linked order, destination, reason and recorded updates. Shared API types, query lifecycles and layout components live alongside these screens.

Profile and tracking navigate here through typed stack routes. Guest access asks for sign-in. Backend ownership checks authorize every request; cached account subjects are only namespaces. Unknown submission failures preserve the same request body and ID for safe retry. Case resolution is an admin action, while a customer follow-up can reopen it. A support request never promises or initiates a refund.

See `backend/CUSTOMER_CARE.md` for the schema, endpoints, admin inbox, deployment order and verification.

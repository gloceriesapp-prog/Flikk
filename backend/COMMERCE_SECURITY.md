# Server-owned checkout and merchant approval

Migration `078_server_owned_commerce_writes.sql` closes three alternative database entry points. It does not alter existing orders, stock, shops, products or user roles.

## Trust boundary

| Operation | Authorized path | Database boundary |
|---|---|---|
| Create order or trip | Customer token → backend role/ownership checks → server quote/attempt → transactional checkout RPC | No direct API-role order/item/trip mutations; all checkout RPC overloads private |
| Submit merchant application | `/store-onboarding` draft flow → admin approval | An application does not grant permission to create an active store |
| Manage store | Approved store-owner token → `/partner` → own store | Backend service client writes; owner JWT cannot mutate stores directly |
| Add/edit products and packs | Approved owner → `/partner/products`; approved status supplied only by admin | Direct product/variant writes denied; partner payload mapping excludes approval fields; new partner products pending |
| Read account/session context | Backend authentication module → service-only RPC | Anonymous/authenticated cannot execute either context function |

Backend writes use the private service-role client. This is an intentional boundary: backend/admin code must validate the actual authenticated actor because service-role queries bypass RLS. Store/product ownership alone is not approval. Existing partner routes enforce `requireAuth`, `requireRole('store_owner')`, `requireApproved` and resolve the store from the authenticated user. Admin approval uses its protected server-only service client.

## Database strategy

1. Remove client table **and column** write grants for orders, order items, trips, stores, products and product variants. Include TRUNCATE, REFERENCES and TRIGGER: those capabilities should never accompany customer read access.
2. Remove permissive write policies. Narrow old ALL policies to SELECT, preserving their original read conditions, roles and permissiveness.
3. Add restrictive INSERT/UPDATE/DELETE deny policies for anon/authenticated. Even an accidental future permissive policy and DML grant cannot reopen writes. RLS does not protect TRUNCATE; its privilege must remain revoked.
4. Revoke PUBLIC, anon and authenticated execution on every installed checkout overload and both auth-context functions. Grant trusted execution on the current contracts explicitly.
5. Check effective permissions before committing. Unexpected inherited grants fail the migration rather than silently claiming protection.

SELECT permissions and row ownership policies remain intact. The hot read/auth paths acquire no new authorization queries; hardening is applied at database privilege and RLS boundaries. Service-only checkout still performs its existing final transactional price, eligibility and stock validation.

Migrations 069 and 071 also explicitly revoke anon/authenticated so fresh installs or recreating these functions cannot reproduce the previous default-grant exposure. Revoking PUBLIC alone did not remove Supabase's explicit API-role grants.

## Deployment

Apply migration 078 after the existing migrations through 077 to each target environment, using the normal privileged migration runner/Supabase SQL workflow. Code deployment alone does not change live database permissions. The migration is transactional and safely repeatable. It uses a five-second lock timeout and a sixty-second statement budget; apply during quieter traffic and retry if a busy table prevents lock acquisition. A timeout rolls back the transaction rather than leaving partial hardening.

Before production, verify all supported client versions send writes through the backend. Inspected customer/partner/rider paths do; intentionally unsupported direct-Supabase writes will receive permission errors. Keep the service-role key server-only. No permissive rollback is recommended; correct a failing trusted server route instead of restoring client financial/approval writes.

After applying, run the read-only deployment check using a securely configured psql connection:

```sh
psql -X -v ON_ERROR_STOP=1 -f backend/tests/sql/verify-commerce-security.sql
```

It checks effective table/column/function access, RLS guards, and the trusted server contracts without reading private records or writing data. For the Supabase SQL editor, omit psql's `\set` line.

## Regression suite

Run only against a fresh disposable `flikk_checkout_tests` database:

```sh
psql -X -v ON_ERROR_STOP=1 \
  -f backend/tests/sql/checkout-eligibility.sql \
  -f backend/tests/sql/commerce-security.sql \
  -f backend/tests/sql/verify-commerce-security.sql
```

The SQL fixture deliberately recreates Supabase-style explicit default function grants, old checkout overloads, PUBLIC/column write grants and permissive ownership policies. It verifies actual role-level rejections, preserved owner/product reads, service-role single/multi-shop checkout and auth lookup, repeatable migration, and restrictive protection after accidental DML grants. The temporary database is synthetic and contains no real customers.

GitHub CI runs this suite on PostgreSQL 17. The existing product-mapper unit test also verifies injected approval/ownership fields cannot enter the partner write row. Existing middleware tests cover rejected customer roles and unapproved merchants.

This hardening addresses the three requested findings. It does not claim to resolve the audit's separate merchant-column privacy, delivery OTP, refund/earnings, rate-limit or other launch blockers.

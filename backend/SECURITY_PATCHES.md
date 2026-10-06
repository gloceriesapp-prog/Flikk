# Security patch review — 5 October 2026

This review addresses the supplied findings against the current repository.
It does not certify unknown infrastructure/account/provider controls. No live
exploit, customer-record export or financial write was performed. Database
mutation tests used isolated disposable databases only.

| Finding | Protection / patch |
| --- | --- |
| Auth-context execution | 078 revokes every overload from PUBLIC/anon/authenticated. 092 closes all non-extension application RPCs to these roles and checks effective inherited permissions. |
| Direct forged orders | 078 table/column revokes and restrictive mutation policies remain; backend locked checkout RPCs are the only supported insert path. |
| Self-approval | 078 server-only commerce mutation policies/approval guards remain; approval is not inferred from ownership. |
| Public merchant fields | 079 storefront view and explicit column grants remain. Public APIs use the safe projection; KYC/payout fields remain restricted columns on the private server-facing store record. Physical KYC-table separation is not required for this access boundary. |
| Rider delivery proof | 079 isolates codes from orders, assigned-rider reads and public views. Customer-only API projection, OS cryptographic entropy, expiry, five attempts and consumed-proof protection remain. 089 verifies the shared proof and all trip legs atomically. Displayable codes remain in a service-only private table; do not describe this as one-way hashed storage. Encryption-key management and database/operator access controls require infrastructure review. |
| Credential logging | Request headers/body/query/URLs and credential fields are redacted. Error serialization strips provider message/cause/request objects; Pino's automatic error-message copying is disabled. Error handling/dispatch uses the redacted logger. Existing log exposure/retention must be reviewed separately. |
| Public inventory helpers | 092 explicitly removes effective client execution from all non-extension public application functions, including signaling/pruning and trigger helpers. |
| Old checkout overloads | 092 keeps only the two canonical variant/eligibility checkout signatures and drops the others without CASCADE. Missing canonical signatures or remaining dependencies fail the migration. |
| Review trust | 088 eligible-review RPC, immutable content, one-review/order constraint and transactional count/sum/average maintenance remain. Owner replies use the server; moderation deletion maintains the same totals. |
| Abuse protection | Bounded per-replica IP/account token budgets precede expensive requests. Shared auth/maps/upload quotas and SSE admission bounds supplement them. Global cross-replica edge controls and provider quotas must be deployed and monitored. |
| Enumeration | Partner-check already returns the same neutral response and uses shared IP/phone budgets. |
| Parsing/uploads | Ordinary JSON is 128KB. Uploads authenticate before 6MB parsing; product photos additionally require an approved merchant. Shared account quota: six uploads/minute. Four concurrent upload requests and two concurrent Sharp transformations per replica. Base64-decoded image maximum 4MB, 20 million input pixels, format validation, metadata stripping, orientation normalization and eight-second transform timeout. Absolute upload-body deadline: 20 seconds. Rider documents remain in the private bucket and are normalized to JPEG. Admin authenticates before bounded multipart streaming and caps two simultaneous uploads, 6MB multipart/5MB file and 20 million pixels. |
| Webhook resource admission | POST plus 64-hex signature header checked before parsing; 32 concurrent requests and a body deadline. Full HMAC verification still precedes every financial write. Ordinary IP budgets exempt this provider endpoint; use a separate edge/provider budget to avoid rejecting legitimate payment bursts through carrier/customer quotas. |
| Release API configuration | Customer, partner and rider use one URL validator at runtime and app-config/build time. Release/preview configs require explicit HTTPS, reject local/private hosts and URL credentials/query/hash, and cannot fall back to localhost. Development retains explicit LAN/Metro support. |

## Deployment

Apply **092_private_application_rpcs.sql** before relying on the new database
permissions. It was verified locally, not applied live in this task. Latest
082–091 database changes were already verified live in the prior check.
Deploy backend/admin/mobile changes together with appropriate release API URL
configuration. The native apps no longer quietly ship a localhost API URL.

`tests/sql/verify-rpc-security.sql` is a read-only deployment check. CI also
simulates explicit helper grants, a legacy checkout overload and a future
function creation to verify inherited/default permissions. Extension functions
are preserved; Supabase auth-owned RLS helpers remain intact. The complete
93-file migration sequence is tested from an empty schema.

Backend-only RPCs match current clients: mobile and partner dashboard flows
use authenticated HTTP routes, not direct application RPC calls. Any future
client RPC requires an explicit, audited allowlist change rather than a broad
grant. Migration defaults apply to the migration-executing database role;
run the deployment verifier after migrations created by another role.

## Operational controls still to verify

- Configure a WAF/reverse proxy with shared route/IP/account quotas, connection
  limits, header/body limits and deadlines. Local limits are safety bounds and
  multiply with replica count; authenticated quotas and SMS/maps/upload provider
  limits complement them. Tune carrier-NAT fairness using actual rejection data.
- Set trusted proxy hops to the actual topology; never accept arbitrary XFF as
  identity. Restrict origin and provider credentials in their management consoles.
- Review historical logs for token/OTP/credential leakage, access and retention.
  Rotate credentials or revoke sessions if exposure is confirmed; no speculative
  live rotation or log deletion was performed.
- Verify secret manager, database backup/encryption/operator access, signing-key
  management, storage bucket policies, SMS/Maps billing quotas and provider
  webhook settings. These cannot be proven by repository inspection.
- Reconcile the manually applied migration ledger from verified deployment
  records; do not rerun old data-changing migrations to manufacture a ledger.
- Run staging abuse/reconnect/slow-client/image workloads and real-device upload
  and release-build checks before production rollout. Unit tests are not a
  capacity guarantee.

## Validation completed

- **439 backend tests passed**, including HTTP admission/parser integration,
  bounded multipart reads, image normalization, malformed webhook headers,
  secret-safe logging and release-config execution for all three native apps.
- Backend TypeScript build and ESLint passed; customer, rider and admin
  TypeScript checks passed.
- Partner's full TypeScript check is currently blocked by missing NativeWind
  type augmentation in its installed dependencies (`className` errors). The
  shared URL validator and partner release-config tests passed; this dependency
  issue still needs resolution before a partner production build.
- All **93 migrations** applied to an empty isolated database. Simulated helper
  grant drift, legacy overload removal, future default function permissions,
  commerce security and order financial/privacy deployment checks passed.
- No live database permission changes or live financial operations were run.

# MSG91 authentication SMS

## Architecture

Customer, partner, rider and partner web dashboard continue using `POST /auth/otp/request` and `POST /auth/otp/verify`. Supabase generates the six-digit code, enforces OTP expiry/single use, validates the code and issues its normal access/refresh session. The signed HTTP Send SMS hook calls MSG91 only to deliver that code. Do not call MSG91's separate SendOTP/VerifyOTP endpoints or mint replacement sessions.

The screenshot shows the SMS Templates product: MSG91 template `6ac7bde3ec8459c14b0cadb2`, with `##OTP##`. This uses the Flow SMS API, not the separate MSG91 OTP template API. Confirm the exact variable name and approved sender/DLT mapping in MSG91 before activation. The MSG91 template ID differs from its DLT registration ID.

## Staging setup

The `flikk-staging` project is `qgbuvydwcgjthwqxqylk`. A read-only check on 2026-10-09 found zero public application tables and no migration ledger. Bootstrap the complete canonical schema there before deploying this branch. Never restore production customer data merely to test OTP.

1. Configure the staging backend's `SUPABASE_URL` and server-only `SUPABASE_SERVICE_ROLE_KEY` for staging. Follow `ENVIRONMENTS.md` for database credentials and the guarded migration runner. Apply the complete manifest, including `20261009100545_msg91_sms_delivery_guards.sql`. Deploy the matching backend and worker.
2. In MSG91, open **Authkey** from the top bar or username menu, verify your registered mobile if asked, then **Create New** (for example `GloceriesStaging`). Choose a rule permitted to send SMS, whitelist the staging server egress IP, and copy the generated key into backend secrets. Create/use an Auth Key with permission to send this approved SMS template. Use separate staging credentials or restrict the key to the staging server egress IP when supported. Verify balance, approved sender, entity/template mapping and delivery logs. Do not copy a key into chat, Git or an app bundle.
3. Add these **backend-only** environment variables. Locally add them to the existing ignored `backend/.env.local`. On the hosting service add them under Variables/Secrets. Do not overwrite other existing values or put secrets in `EXPO_PUBLIC_*`/`NEXT_PUBLIC_*`.

```dotenv
OTP_SMS_PROVIDER=msg91
MSG91_AUTH_KEY=<your MSG91 Auth Key>
MSG91_SMS_TEMPLATE_ID=6ac7bde3ec8459c14b0cadb2
MSG91_OTP_VARIABLE=OTP
SUPABASE_SEND_SMS_HOOK_SECRET=<Supabase-generated v1,whsec_ signing secret>
AUTH_BUDGET_SECRET=<stable random server secret shared across API and worker replicas>
MSG91_SMS_PER_MINUTE=100
MSG91_SMS_PER_DAY=10000
```

Generate the HMAC budget secret securely with `openssl rand -hex 32`. Keep it stable during hook secret rotation; changing it changes receipt and phone hashes. Keep the server service key secret even if this dedicated HMAC secret is configured.

4. In **staging Supabase Authentication → Hooks → Send SMS**, prepare an HTTPS HTTP hook pointing to `https://<staging-api-host>/auth/hooks/send-sms`. Use the signing secret generated/provided there as `SUPABASE_SEND_SMS_HOOK_SECRET`. Deploy/restart the backend with valid settings before enabling the hook. `OTP_SMS_PROVIDER=msg91` only enables this receiver; it does not change Supabase's provider by itself. An unreachable/local-only endpoint will prevent SMS sign-in.
5. In staging Supabase Auth, enable phone sign-in, disable automatic phone confirmation, use six-digit OTPs, set a suitable short expiry (for example five minutes), and align resend interval with the app's 60-second cooldown. Remove fixed test-number OTPs from real-message tests and from production. Review project SMS and endpoint rate limits; Supabase's defaults can be much lower than the app's traffic.
6. For proxy deployments, set `TRUST_PROXY_HOPS` to the actual trusted network topology. For per-user Supabase Auth IP limits, enable **Authentication → Rate Limits → IP Address Forwarding**, add a new `sb_secret_...` key as `SUPABASE_AUTH_SECRET_KEY`, and set `SUPABASE_AUTH_FORWARD_CLIENT_IP=true`. Legacy `service_role` keys do not support this forwarding. The backend sends only Express's validated resolved IP on a request-scoped client. Without this configuration, Supabase can apply one shared backend-egress IP quota.
7. Point staging builds at the staging backend API URL and staging Supabase project. No MSG91 Auth Key or hook signing secret belongs in any mobile/web app. Do not point the production app at staging accidentally.

The backend may run behind Railway, Render or another host: the provider name is not assumed. Configure secrets on the service that actually runs Express and restart/redeploy it. For local real-SMS testing, the staging Supabase hook needs a secure publicly reachable development endpoint; a physical phone reaching your LAN backend is insufficient for Supabase's outbound webhook.

### Keys are present but SMS still uses the previous provider

Adding `MSG91_AUTH_KEY`, the template ID and variable does not activate delivery. Confirm all of these before a real-message test:

- The running backend uses the staging Supabase project, with the SMS receipt migration applied there.
- `OTP_SMS_PROVIDER=msg91` and the matching `SUPABASE_SEND_SMS_HOOK_SECRET` are configured on that backend and it has restarted successfully. Set a stable `AUTH_BUDGET_SECRET` shared with its worker.
- Staging Supabase's Send SMS hook is enabled and points to that backend's public HTTPS `/auth/hooks/send-sms` endpoint. Never substitute a generated local signing secret for the secret configured on Supabase.
- Customer, partner and rider builds point at the same staging backend. Hosted Supabase test-number OTP mappings must be removed separately; deleting local `auth.sms.test_otp` configuration does not change hosted settings.

All three apps use the same server-authentication routes; no MSG91 credentials belong in app environment files. Delivery verification OTPs are a separate order workflow and are unchanged by this integration. Automated synthetic OTP fixtures remain isolated to tests and cannot log a user in.

## Database and abuse controls

The new RLS-enabled service-only tables store keyed event/body/phone identifiers and delivery outcomes, never plaintext codes or phone numbers. An atomic unique receipt allows one send across replicas. Accepted duplicates return success; in-flight, failed or ambiguous duplicates do not send again. A provider timeout may already have submitted the SMS, so there are no automatic provider retries. A fresh user request after the cooldown creates a fresh Supabase OTP event.

All signed sends, including requests made directly to Supabase's public Auth endpoint, share limits: one accepted send per phone/minute, five/hour, global configured minute/day caps. These are fixed UTC windows; Supabase's own resend window remains the authoritative rolling cooldown. Quota rejection rolls back tentative counters. The daily limit is a submission cap, not a rupee billing estimate. Tighten staging caps to your test volume and raise production limits only with monitoring and a budget.

Receipts expire after one day and budget rows after their windows; the backend worker prunes bounded batches. Raw HTTP payloads are limited to 16 KB, signatures/timestamps are checked before database/provider work, provider requests abort after 2.5 seconds, and each receipt RPC has a 650 ms deadline to fit Supabase's five-second HTTP hook budget. Slow networks can fail closed. Never log raw hook bodies, OTPs, Auth Keys or signing secrets. `sent` means MSG91 accepted submission, not confirmed handset delivery; check MSG91 delivery logs for delivery status.

Promotional SMS still uses its separate existing Twilio adapter. Do not use the login DLT template for campaigns. Migrating promotional sending requires its own approved templates/consent and is outside authentication delivery.

## Test before production

Automated tests use signed synthetic hooks and mocked provider requests: no SMS charges, live auth setting changes or production database writes. Run backend tests/build/lint, the SQL permissions/quota/concurrency scenarios and all app typechecks/bundles.

Then use consenting staging test phones to verify:

- New and returning customer login; partner/rider role and approval gates; wrong-app login rejection.
- Correct, incorrect, expired and already-used codes; code with a leading zero; autofill and rapid double taps.
- Resend after 60 seconds and after backgrounding; no fake login when offline; provider rejection/timeout and quota failure.
- Two phones signing in concurrently; no cross-account headers/session leakage; revoked/blocked accounts remain denied.
- Refresh and logout; no OTP/token/key in backend logs; delivery visible in MSG91 logs.

Only after these checks, configure the corresponding production backend/Supabase hook. Do not disable the previous provider until the new route is ready. Rollback: disable the Send SMS hook in the affected Supabase project to restore its dashboard provider, then set backend `OTP_SMS_PROVIDER=supabase`. Switching only the backend flag while the hook remains enabled causes sign-in failures.

## References

- https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook
- https://supabase.com/docs/guides/auth/auth-hooks
- https://supabase.com/docs/guides/auth/rate-limits
- https://docs.msg91.com/sms/send-sms
- https://msg91.com/help/api/where-can-i-find-my-authentication-ke

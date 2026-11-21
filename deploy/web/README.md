# Web hosting migration candidate

Status: preparation only. No server, credential, permission, registry or DNS changes
are made by these files. The validation workflow does not publish images or deploy.

## Decision

Keep `gloceriesapp-prog/Flikk` as the repository owner. Contributors, including
Nishal77, retain their real Git authorship. GitHub CI validates pull requests;
production releases must use a tested, immutable commit from protected `main`.
Do not solve deployment access by changing commit identities or making the private
repository public.

Use a separate Ubuntu 24.04 Lightsail instance in Mumbai for the Next.js landing
website and admin. Recommended starting bundle: Linux public IPv4, 4 GB, 2 vCPU,
80 GB, US$24/month. Keep the existing API, worker, database and media endpoints.
The API host's configured container memory limits already total 1,904 MiB on its
2 GB plan; putting two Next.js servers there would create avoidable contention.
The web configuration reserves 768 MiB for landing, 1,024 MiB for admin and
192 MiB for Caddy, leaving capacity for the OS and deployment operations.
These are starting limits, not proof of load capacity.

Both apps need a Node runtime: admin has authenticated server routes and the
landing uses ISR and image optimization. A static export would change behavior.
The AWS managed source-upload/static-export migration workflow is therefore not
used. ECS/Kubernetes and a new database are unnecessary for this initial migration.

Vercel Hobby is not a suitable long-term commercial deployment plan. A separate
web host costs more than keeping Hobby, but removes the commit-author deployment
restriction and isolates web releases from checkout infrastructure.

## Credits and costs

On 2026-11-06 the signed-in AWS Credits page showed US$199.71 estimated remaining
(US$199.82 finalized remaining). The AWS Free Tier credit's applicable-products
list explicitly included Amazon Lightsail; its displayed expiry was 2027-10-23.
This is a point-in-time observation, not a guaranteed future balance.

AWS automatically applies eligible credits. Base compute for the existing US$12
API plus proposed US$24 web host is US$36/month. US$199.71 / US$36 is approximately
5.55 months, excluding snapshots, taxes, excess transfer and other AWS resources.
Credits are shared with eligible usage across the account. Check current credits,
bills and account-plan expiry before provisioning; credit expiry and free-account
plan expiry can differ. Do not promise that credits prevent all charges or keep a
production Free-plan account running indefinitely.

Keep the existing budget and add usage/forecast alerts based on gross usage as
well as credits. Suggested review points: US$50 remaining and 30 days before the
earliest credit/account expiry. Alerts do not cap spending. New snapshots and any
additional paid service require an explicit cost decision.

## Build preparation

1. Run the existing app checks. Use each app's build script, preserving admin's
   webpack flag and its raw backend imports.
2. `WEB_STANDALONE=1` enables Next's standalone output. `WEB_RELEASE_SHA` sets
   deployment identity so old clients can detect a changed release.
3. Build on GitHub's Linux runner with Node 22 and locked pnpm dependencies, not
   on the web server or this nearly full Mac. The manual **Web hosting validation**
   workflow builds both apps with placeholders, assembles images and checks public
   pages plus the admin unauthenticated-API 401 boundary. It grants no AWS access.
4. Production builds must set `APP_ENV=production`, the real public API and
   Supabase values, and every existing public legal/contact/verification value
   from `apps/landing/.env.example`. `NEXT_PUBLIC_*` values are compiled into the
   browser bundle; setting them only after the build does not change the bundle.
   Audit that URLs select the intended production project. Landing production
   catalogue failures must abort the build or preserve the last good ISR page,
   including outside Vercel.
5. Assemble a fresh image context outside the checkout:

   ```sh
   node deploy/web/package-standalone.mjs admin /tmp/admin-image-context
   docker build -f deploy/web/Dockerfile --build-arg WEB_APP=admin \
     --build-arg RELEASE_SHA=<full-commit> -t <candidate-admin-image> /tmp/admin-image-context
   ```

   Repeat for landing. Standalone tracing uses the monorepo root and includes
   server dependencies. Packaging also copies `public` and `.next/static`, which
   Next omits by default, and filters `.env` files. Runtime is non-root. Verify
   Linux native modules and optimized images in the resulting container.
6. Production publishing must produce private registry images pinned by SHA256
   digest with commit labels. Record the previous digest pair for rollback. No
   `latest` tags or rebuilding a previously approved release on the production host.

## Runtime and access plan

Candidate files: `compose.yml`, `Caddyfile`, `Dockerfile`. Copy reviewed deployment
files to a new web host only; do not overwrite `/opt/gloceries` on the API server.
Use separate directories and environment files, for example `/opt/gloceries-web`.

Compose inputs are `LANDING_IMAGE` and `ADMIN_IMAGE` (complete `image@sha256:...`
references), `WEB_DOMAIN`, `WWW_DOMAIN`, `ADMIN_DOMAIN`. Proposed names are
`gloceries.com`, `www.gloceries.com`, `admin.gloceries.com`.

Admin expects `admin.runtime.env`, owned by the deployment operator with mode 600.
Inventory existing configuration against the current source before transfer:
Supabase service role, admin identity, OTP/session secret, Gmail SMTP settings,
R2 configuration, private-media encryption settings and any optional integrations.
Do not assume the old DEPLOY.md list is complete. Never commit values, pass private
values as Docker build args, or print Compose's expanded configuration into logs.
Public Supabase configuration must match the build.

Credential handling is a separate deployment gate: project rules require the
`aws-secrets-manager` skill, currently unavailable. This preparation neither
retrieves nor transfers credentials. Obtain the required skill or a specific user
exception before configuring runtime credentials or registry/deployment access.

Only Caddy publishes ports 80/443. Next ports stay inside Docker. Keep SSH restricted
to approved administration access. For automated deployment, create dedicated
least-privilege access for this web host, verify the SSH host key out of band, and
limit a runner's temporary SSH access to its /32 with cleanup on failure. Do not
reuse or expand the API deployment role without reviewing and approving its scope.
Avoid long-lived broad AWS keys. Preserve admin OTP authentication and secure
host-only cookies. Migrating its hostname requires a fresh login.

Do not cache authenticated admin HTML/API responses at Cloudflare. Keep API/media
DNS records unchanged. Test HTTPS through Caddy and keep the origin private ports
closed. Review Supabase redirects, upload origins, CSP and API CORS against the
chosen admin hostname; do not add wildcard origins.

## Deployment and rollback gates

The production deployment workflow is deliberately **not enabled** in this PR.
Implement and test it after provisioning/access approval with these requirements:

1. Deploy only protected `main`, after full CI succeeds for the exact SHA. Restrict
   workflow permissions and use a production GitHub environment. Serialize releases.
2. Build/publish in CI and pull digest-pinned images on the host. Check disk and
   memory first; keep the current and previous releases. Bound logs and cache use.
3. Start a candidate under an isolated Compose project without public ports.
   Validate landing/ISR/catalogue, static assets, image optimization, admin login,
   OTP/logout, protected routes, uploads and real read-only data. Test the actual
   production configuration; placeholder smoke tests cannot establish readiness.
4. Preflight both new containers' memory while the current release is running.
   Never assume full blue/green fits. Switch one app at a time, validate and reload
   Caddy atomically; if overlap cannot fit, use an approved maintenance window.
   Do not balance different Next builds behind one upstream without shared cache
   and Server Action compatibility. A single active container per app is the
   initial model. Requests can be interrupted during an untested replacement.
5. Verify HTTPS, auth boundary, catalogue, app/API connectivity and memory after
   each switch. Restore the previous digest/upstream immediately on failure.
   Rehearse failed-start and rollback paths before enabling automatic deployment.
6. Change Cloudflare web DNS only after verified host checks, including TLS
   issuance. Preserve old DNS values and the existing Vercel deployment for the
   transition/rollback window. Do not cancel Vercel first. A staged domain or
   controlled DNS validation may be needed for pre-cutover certificate issuance.
7. After cutover, monitor HTTP 5xx, memory/OOM, disk, certificate renewal, image
   responses, ISR freshness and admin authentication. Confirm gross AWS spend and
   credit application. A single web server is a single failure domain, not HA.

## Verification record

Local source/configuration checks must be recorded separately from container CI
and production acceptance. This Mac has insufficient free space for reliable
Next/Docker builds. Until the manual container workflow and real-configuration
acceptance pass, these files are a migration candidate, not a live deployment.

References:
- https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-bundles.html
- https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/useconsolidatedbilling-credits.html
- https://nextjs.org/docs/app/guides/self-hosting
- https://vercel.com/docs/limits/fair-use-guidelines

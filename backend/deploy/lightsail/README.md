# Gloceries Lightsail backend

Production target: `gloceries-api`, Ubuntu 24.04, Mumbai `ap-south-1a`,
2 GB RAM / 2 vCPU / 60 GB, $12/month plus daily snapshot storage.
Attach static IP `gloceries-api-ip`. Keep the original Railway deployment until
the cutover has passed real client checks.

The console-created host is at static IPv4 `15.252.56.122`.
`instance.yaml` records the intended infrastructure for future provisioning;
it has not been deployed as a stack. Verify catalog IDs and plan prices before
using it. Do not create a second host with the same names or replace this host.

## Host preparation

Run `sudo bash setup.sh` on the new instance. Confirm Docker Compose is available,
security updates are enabled and SSH password authentication is disabled.
Restrict port 22 in Lightsail to trusted operator addresses and Lightsail browser
SSH. Open only ports 80 and 443 publicly; do not publish 3000, 9464 or 9465.
Docker-published ports bypass UFW, so the Lightsail firewall is also required.

Store the existing production backend environment at `/opt/gloceries/.env`, owned
by `ubuntu`, mode 600. Never use a developer `.env.local` as the production source.
Preserve document encryption keys and all webhook/signature secrets. Required
settings include `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`API_DOMAIN=api.gloceries.com`, `PUBLIC_API_URL=https://api.gloceries.com` and the
real HTTPS admin/partner origins in `WEB_DASHBOARD_ORIGINS`.
The Compose file fixes production mode, proxy hops and monitoring bind addresses.

## GitHub configuration

Repository secrets:

- `LIGHTSAIL_HOST`: attached static IPv4 address.
- `LIGHTSAIL_SSH_KEY`: deployment private key whose public key is authorized on the host.
- `LIGHTSAIL_KNOWN_HOSTS`: host public-key entry verified through the Lightsail
  browser SSH session. Compare `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`
  there before trusting a key obtained over the network.

Repository variables: `API_DOMAIN=api.gloceries.com`,
`LIGHTSAIL_INSTANCE_NAME=gloceries-api`, `LIGHTSAIL_AWS_ROLE_ARN` from the access
stack output and, only after the migration gates below pass,
`LIGHTSAIL_DEPLOY=true`. The workflow builds on GitHub, pulls an
immutable commit tag and uses the short-lived job token for registry access.
No registry password is retained on the instance. Private GHCR package settings
must grant this repository's Actions workflow access to the package.

Deploy `github-access.yaml` in Mumbai after checking IAM for an existing GitHub
OIDC provider (set `CreateGitHubProvider=false` if one exists). It creates no
instance and no persistent AWS access key. Tag only this instance with
`DeploymentTarget=gloceries-api`. The role trusts only this repository's `main`
branch and can open/close ports only on instances carrying that explicit tag in
the stack's region. The port-state read API requires `Resource: '*'` in IAM.
AWS does not expose a port-number condition for these mutation APIs: the trusted
workflow and its helper constrain them to TCP 22. Protect `main` and review any
changes to the workflow or helper as production deployment access.

Each deployment waits for the full push CI run on its exact commit to pass,
builds on GitHub, authenticates to AWS with OIDC, discovers its public IPv4 and
temporarily allows only that `/32` on SSH. The helper verifies that browser SSH
remains available and never changes HTTP/HTTPS rules. Strict host-key checking
uses the independently pinned server key; it never trusts a new keyscan result.
Authorize the deployment public key with OpenSSH's `restrict` option to disable
PTY, forwarding and agent access. This key still grants deployment shell access
as `ubuntu`; protect it as a production secret.

An `always()` cleanup step removes the job's rule after success, failure or
normal cancellation, and fails the workflow if removal cannot be verified.
An abruptly destroyed runner or AWS outage can prevent cleanup; inspect the
Lightsail firewall after such a run and remove only its recorded `/32`, keeping
the `lightsail-connect` alias. The next run refuses unexpected stale SSH rules.
Do not open port 22 to `0.0.0.0/0` or `::/0`.

`ONLINE_PAYMENTS_DISABLED=false` permits the admin checkout setting to enable
online payments. Razorpay must have valid live credentials and the matching
webhook secret. Confirm `/payments/availability`, `/payments/netbanking-banks`
and `/payments/wallets` after restarting API/worker. This does not itself prove a
real payment and webhook settlement; test those separately before launch.

For the first deployment, run the workflow manually with `build_only=true`.
This builds an immutable image on GitHub and saves a one-day artifact without
using SSH, pushing a registry package or starting production services. Transfer
the authenticated artifact to the host, verify its digest and load it with
`docker load`. Keep automatic deployment disabled until its access is configured.

## Cutover gates

1. Keep the existing Supabase production project for the compute migration.
   A Mumbai database move is a separate migration: validate schema, roles, Auth,
   storage objects, row counts and a final write synchronization window first.
2. Build the backend image and stage `docker-compose.yml`, `Caddyfile` and
   `deploy.sh` in `/opt/gloceries/releases/<40-character-commit>`.
3. Coordinate the worker transition. Do not run a second production worker
   against unverified data or assume all scheduled jobs are safe to duplicate.
4. Run `bash releases/<commit>/deploy.sh <commit>`. Both API and worker must become
   healthy. Worker startup checks `background_worker_ready` in the database.
   API readiness alone does not prove external dependencies work.
5. Validate read-only database connectivity and login, authorized store access,
   catalog, images, cart, orders, payment callbacks and realtime updates using
   approved test accounts. Avoid real payment/order mutations during smoke tests.
6. Change the API DNS A record to the static IP only when ready. Check any AAAA
   record as well. Caddy obtains its public certificate after DNS reaches this
   host; pre-DNS container health does not prove HTTPS certificate readiness.
7. Verify HTTPS, CORS, client requests and webhook delivery, then enable automatic
   deployment and monitor API/worker errors. Retain Railway as rollback until the
   new path is stable. Do not rebuild mobile apps until their production URL works.

## Recovery

The deploy script pulls before changing containers, waits for API and worker
health and restores the previous release on failure. The `current` symlink moves
only after success. For a manual restart, use its immutable commit:

```sh
cd /opt/gloceries
commit=$(basename "$(readlink -f current)")
bash "current/deploy.sh" "$commit"
```

This is a single host: releases can briefly interrupt in-memory OTP sessions and
SSE connections. Snapshots protect the host, not the external Supabase database.
Test restore separately and keep database backups. No deploy automatically runs
schema migrations, deletes Railway or prunes rollback images.

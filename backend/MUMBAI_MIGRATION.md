# Moving to Mumbai: Supabase (ap-south-1) + AWS Lightsail (ap-south-1)

Today: database in Seoul (Supabase `ap-northeast-2`, project `bjlknohjdnemxwwoxcsv`),
API + worker in Singapore (Railway). Every request from Kaup crosses India →
Singapore → Seoul, usually several times. Database and backend move together;
moving only one of them makes latency worse.

Supabase cannot change a project's region. The move is: new project in Mumbai,
copy schema + data + auth users + files, repoint everything, retire the old one.

State at planning time (22 Oct 2026): 20 MB database, 9 auth users,
15 storage buckets with ~154 files, 141 migrations, 0 orders. This is the
cheapest moment the move will ever be.

## 0. Before the move (do these first, each is useful on its own)

1. **Put the API behind your own domain**, e.g. `api.gloceries.com` (CNAME at
   your DNS provider to the current Railway domain). Set `EXPO_PUBLIC_API_URL`
   in the EAS production env to it, rebuild/OTA the three apps, and point
   Razorpay/Cashfree webhooks and `PUBLIC_API_URL` at it. After this, changing
   hosts is a DNS change, not an app release.
2. **Stop the apps depending on the Supabase hostname.**
   - `apps/customer/src/utils/storageUrl.ts` and
     `apps/partner/src/utils/storageUrl.ts` hard-code
     `https://bjlknohjdnemxwwoxcsv.supabase.co` as the artwork base. Set
     `EXPO_PUBLIC_ARTWORK_BASE_URL` (already supported) to
     `https://images.gloceries.com` once those files are on R2, or to the new
     project URL at cut-over, and ship it.
   - 7 `categories.image_url` rows still store the old Supabase URL; move the
     files to R2 (the `media_assets` path from migration 094) and rewrite them.
3. **Pay for Railway Hobby** so nothing lapses during the move.

## 1. Create the Mumbai project

- Supabase dashboard → New project → Region **South Asia (Mumbai) `ap-south-1`**,
  same organization, strong DB password (store it in your password manager, never
  in git or chat).
- Copy from the old project's dashboard by hand (not part of a database dump):
  Authentication → Providers (Email on, Phone as today, sign-ups as today),
  Auth → URL configuration, Auth rate limits, Auth hooks (Send SMS hook should
  stay **off**: login OTP is sent by the backend), Storage bucket settings,
  Database → Network restrictions, any custom SMTP.
- Extensions in use: `pgcrypto`, `uuid-ossp`, `pg_trgm`, `pg_stat_statements`,
  `supabase_vault`. Enable the same ones (Database → Extensions).

## 2. Rehearse on a throwaway project first

Run steps 3–5 into a scratch Mumbai project, point a local backend at it
(`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) and run:

```bash
cd backend
pnpm test
node scripts/verify-fresh-migrations.mjs   # schema matches migrations
pnpm db:status                             # ledger shows 141 applied
```

then log in with a test number from a dev build. Delete the scratch project
afterwards.

## 3. Copy the database (CLI, from your laptop)

Supabase's documented path is the CLI dump/restore. Connection strings come
from each project's Connect button (use the **session pooler** URI on IPv4
networks).

```bash
OLD="postgresql://postgres.bjlknohjdnemxwwoxcsv:<old-password>@<old-pooler-host>:5432/postgres"
NEW="postgresql://postgres.<new-ref>:<new-password>@<new-pooler-host>:5432/postgres"

supabase db dump --db-url "$OLD" -f roles.sql  --role-only
supabase db dump --db-url "$OLD" -f schema.sql
supabase db dump --db-url "$OLD" -f data.sql   --use-copy --data-only

psql --single-transaction --variable ON_ERROR_STOP=1 \
  --file roles.sql --file schema.sql \
  --command 'SET session_replication_role = replica' \
  --file data.sql \
  --dbname "$NEW"
```

- `session_replication_role = replica` stops triggers (e.g. the rider and
  store guards) from firing while rows are loaded.
- Auth users come across in the data dump (`auth.users`), so the 9 accounts
  keep their ids. Phone logins mint a fresh one-time password on every sign-in,
  so nothing about them needs migrating; admin email/password hashes carry over.
- `ops.applied_migrations` comes across too, so the migration ledger stays
  correct (`pnpm db:status` must show the same 141 rows).
- Check the `supabase_realtime` publication on the new project lists the same
  tables as the old one (`select * from pg_publication_tables`); add any missing
  ones with `alter publication supabase_realtime add table …`.
- Never commit `roles.sql` / `data.sql`: they contain personal data. Delete them
  after the move.

## 4. Copy storage files

The dump copies `storage.objects` rows, not the files. Copy the files bucket by
bucket with the Supabase JS client using each project's service-role key
(list → download from old → upload to new, same path, `upsert: true`).
~154 files, so a one-off script run once from your laptop is fine. Private
buckets (`rider-documents`, `store-documents`, `private-documents`) must stay
private on the new project.

## 5. Cut over (≈30 minutes, low-traffic hour)

1. Announce a short maintenance window (Play/partners are not affected beyond
   that window).
2. Stop writes: scale the Railway API and worker to 0 (or pause them).
3. Re-run the **data** dump/restore (step 3, data only, after truncating the new
   project's public tables) so nothing written since the rehearsal is lost.
4. Swap secrets everywhere:

   | Where | Variables |
   |---|---|
   | Backend API + worker | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (and anon/publishable key if set) |
   | Admin panel host | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, service key |
   | Landing site | `NEXT_PUBLIC_SUPABASE_*` |
   | EAS production env (customer, partner) | `EXPO_PUBLIC_ARTWORK_BASE_URL` (or keep R2) |

5. Start the backend on Lightsail (section 6), run the smoke test (section 7).
6. Everyone signs in again once (the JWT secret differs between projects).
7. Keep the old Seoul project **paused, not deleted**, for 2 weeks as a fallback.

## 6. Backend on AWS Lightsail, Mumbai

Chosen over Cloud Run after a cost check (22 Oct 2026): one always-on Cloud
Run vCPU is ~₹3,500/month on its own, and the API runs cron schedules and a
realtime subscription in-process (`src/server/background.ts`), so Cloud Run's
cheap request-based mode would starve them. A $12 Lightsail instance in
Mumbai runs API + worker + HTTPS for ~₹1,000/month, in the same AWS region as
Supabase `ap-south-1`.

Files: `backend/deploy/lightsail/` (`docker-compose.yml`, `Caddyfile`,
`setup.sh`) and `.github/workflows/backend-lightsail.yml`.

1. Lightsail → Create instance → Mumbai → Linux → OS only → Ubuntu 24.04 →
   $12 plan (2 GB, dual-stack). Attach a static IP. Networking: allow 80, 443.
   Turn on automatic snapshots. Billing → budget alert.
2. SSH in (browser SSH is fine) and run `setup.sh` (updates, Docker, swap,
   firewall, key-only SSH, `/opt/gloceries`).
3. Copy `docker-compose.yml` and `Caddyfile` to `/opt/gloceries`. Create
   `/opt/gloceries/.env` (chmod 600) with the same variables Railway has, the
   new Supabase URL/key after cut-over, and `API_DOMAIN=api.gloceries.com`.
4. DNS: `A` record `api.gloceries.com` → the static IP. Caddy gets the
   certificate on first start.
5. `docker login ghcr.io` with a GitHub token that has `read:packages`, then
   `docker compose up -d`. Check `docker compose ps` and
   `curl https://api.gloceries.com/`.
6. GitHub → Settings → Secrets and variables → Actions: secrets
   `LIGHTSAIL_HOST`, `LIGHTSAIL_SSH_KEY`; variables `API_DOMAIN`,
   `LIGHTSAIL_DEPLOY=true` (only at cut-over, so Railway and Lightsail never
   both serve). Pushes to `main` that touch the backend then build the image
   on GitHub and roll it out.
7. After a stable week on Lightsail, delete the Railway services.

Operational notes:
- One API container only (pending login codes live in memory). A deploy
  restarts it in a few seconds; codes sent in that window must be resent.
- The $12 plan's CPU is burstable. Watch Lightsail → Metrics → "CPU burst
  capacity"; if it trends to zero, move to the $24 plan (snapshot → bigger
  instance, ~10 minutes).
- Logs: `docker compose logs -f api worker` (rotated, 5 × 20 MB each).
- Add an external uptime check (UptimeRobot/Better Stack, free) on
  `https://api.gloceries.com/`.

## 7. Smoke test after cut-over

- `GET https://api.gloceries.com/` answers.
- Login: Play reviewer number + its code in the rider app; a partner number in
  the partner dashboard (gets OTP), a customer number in the dashboard (refused).
- Customer: browse, add to cart, place a COD order to the test store.
- Partner: order alert arrives, accept, pack.
- Rider: go online, receive the offer, deliver with the doorstep OTP.
- Admin: approvals list loads, private documents open.
- Images load in all apps (artwork base URL).
- `pnpm db:status` against the new project: 141 applied, 0 pending.

## 8. Rollback

Until the old project is deleted: put the old `SUPABASE_URL` /
`SUPABASE_SERVICE_ROLE_KEY` back on the backend, point `api.gloceries.com` back
at Railway, and unpause the old project. Anything written to the new project
after cut-over has to be copied back by hand, so decide within the first day.

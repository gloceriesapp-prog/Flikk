# Moving to Mumbai: Supabase (ap-south-1) + Google Cloud Run (asia-south1)

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

5. Start the backend on the new host (section 6), run the smoke test (section 7).
6. Everyone signs in again once (the JWT secret differs between projects).
7. Keep the old Seoul project **paused, not deleted**, for 2 weeks as a fallback.

## 6. Backend on Google Cloud Run, Mumbai

**Billing in INR**: create the Google Cloud billing account with an Indian
address; Google Cloud India bills in rupees and Indian cards work. Set a budget
alert (Billing → Budgets, e.g. ₹3,000/month, alerts at 50/90/100%).

### One-time setup

```bash
gcloud config set project <your-project-id>
gcloud services enable run.googleapis.com artifactregistry.googleapis.com \
  cloudbuild.googleapis.com secretmanager.googleapis.com
gcloud artifacts repositories create flikk --repository-format=docker \
  --location=asia-south1
```

Put every backend secret in Secret Manager (one secret per variable, same names
as Railway: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MSG91_AUTH_KEY`,
`MSG91_SMS_TEMPLATE_ID`, `LOGIN_TEST_OTPS`, `RAZORPAY_*`, `CASHFREE_*`,
`R2_*`, `DOC_ENCRYPTION_KEY`, `GOOGLE_GEOCODING_*`, `MAPPLS_ACCESS_TOKEN`, …).
Type them in the console yourself; don't paste them anywhere else.

### Build (repo root is the build context, as on Railway)

`cloudbuild.yaml` at the repo root:

```yaml
steps:
  - name: gcr.io/cloud-builders/docker
    args: ["build", "-f", "backend/Dockerfile",
           "-t", "asia-south1-docker.pkg.dev/$PROJECT_ID/flikk/backend:$SHORT_SHA", "."]
images:
  - asia-south1-docker.pkg.dev/$PROJECT_ID/flikk/backend:$SHORT_SHA
```

Connect the GitHub repo in Cloud Build → Triggers (branch `main`, file
`cloudbuild.yaml`) so pushes to `main` build like Railway does today.

### API service

```bash
gcloud run deploy flikk-api \
  --image asia-south1-docker.pkg.dev/<project>/flikk/backend:<tag> \
  --region asia-south1 \
  --min-instances 1 --max-instances 1 \
  --cpu 1 --memory 512Mi --concurrency 80 --timeout 3600 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,TRUST_PROXY_HOPS=1 \
  --set-secrets SUPABASE_URL=SUPABASE_URL:latest,SUPABASE_SERVICE_ROLE_KEY=SUPABASE_SERVICE_ROLE_KEY:latest,...
```

- **Exactly one instance** (`min = max = 1`): pending login codes live in the
  process (`auth/loginOtp.ts`), so a second instance would reject codes sent by
  the first. Raise this only after moving pending codes into the database.
- Request-based billing (the default) is fine for the API: its only timers are
  metrics sampling and SSE heartbeats, which run while a stream request is open.
- `--timeout 3600` keeps the home-content SSE stream alive (Cloud Run's maximum).
- Cloud Run sets `PORT`; the backend already reads it (`config/env.ts`).
- Check `TRUST_PROXY_HOPS` against Google's front end before relying on IP
  rate limits.
- Map `api.gloceries.com` (Cloud Run → Domain mappings, or a load balancer).

### Worker

The worker (`node dist/workers/index.js`) has no HTTP port and must run all the
time. Cheapest reliable options, in order:

1. **Small Compute Engine VM in Mumbai** (e2-small) running the same image with
   `docker run --restart=always … node dist/workers/index.js`. Roughly the price
   of the always-on alternatives below or less. You patch the VM.
2. **Cloud Run worker pool** (instance-based, always on) with the image and the
   same secrets, command `node dist/workers/index.js`.
3. Cloud Run service with `--no-cpu-throttling --min-instances 1` and a tiny
   health endpoint: works, but always-on CPU billing makes it the most expensive.

### Cost, honestly

An always-on vCPU on Cloud Run is billed every second whether or not traffic
arrives, so "API + worker on Cloud Run, both always on" is **several thousand
rupees a month**, not hundreds. The API with request-based billing and one warm
instance is cheap when idle; the worker is the expensive part, which is why
option 1 (VM) is listed first. Run Google's pricing calculator for asia-south1
with your actual settings before committing, and keep the budget alert on.

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

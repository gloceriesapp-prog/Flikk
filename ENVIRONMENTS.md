# Environments: local, staging, production

Every change goes **local → staging → production**. Only production has real customers, real money and real SMS. Nothing reaches production without first running on staging, on a real phone.

| | Local | Staging | Production |
|---|---|---|---|
| Purpose | Build and debug | End-to-end test before release | Real customers |
| Database (Supabase) | `supabase start` on your laptop | `flikk-staging` (`qgbuvydwcgjthwqxqylk`, Singapore) | `Flikk` (`bjlknohjdnemxwwoxcsv`) |
| Backend + worker | `pnpm dev` / `pnpm dev:worker` in `backend/` | Railway environment `staging` (branch `staging`) | Railway environment `production` (branch `main`) |
| Mobile apps | Dev build, `.env.local` → your LAN IP | EAS profile `preview` → APK on test phones | EAS profile `production` → Play Store |
| EAS variables | none (`.env.local`) | EAS environment `preview` | EAS environment `production` |
| Admin panel | `pnpm dev` in `apps/admin` | Vercel preview pointed at staging | Vercel production |
| Payments | Cashfree sandbox | Cashfree sandbox | Cashfree live |
| Phone OTP | Fixed test OTPs in `supabase/config.toml` | Supabase test phone numbers | Real SMS via MSG91 (Supabase Send SMS hook → `POST /auth/hooks/send-sms`) |
| Data | `backend/seed/dev-seed.sql` | `backend/seed/dev-seed.sql` + your test accounts | Real |

## Guard rails already in the code

- **Laptop backends can't use the production database.** The backend refuses to start against the production project unless `NODE_ENV=production`, which only the Docker image sets, or you set `ALLOW_PRODUCTION_DATABASE=true` on purpose.
- **`db-migrate.mjs` won't touch production by accident.** It needs `--production` plus `CONFIRM_PRODUCTION=bjlknohjdnemxwwoxcsv`, and it never loads seed data there.
- **Migrations are tracked.** Every applied migration is recorded in `ops.applied_migrations` with its checksum. Editing a migration after it was applied anywhere fails loudly.
- **Release app builds need a real HTTPS API URL.** The check runs on the EAS builder, so a local `.env.local` can't leak into a Play Store build.

## One-time setup

### Tools (macOS)

```
brew install libpq && brew link --force libpq   # psql, used by db-migrate
brew install supabase/tap/supabase              # local Supabase (needs Docker Desktop)
```

### Local database

```
supabase start                      # from the repo root; prints URL + keys
cd backend
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres pnpm db:seed
```

`pnpm db:seed` applies every migration and then the test data. Then edit `backend/.env.local`:

```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<service_role key from `supabase status`>
CASHFREE_ENV=sandbox
```

In each app's `.env.local`, set:
- `EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:4000`
- `EXPO_PUBLIC_SUPABASE_URL=http://<your-LAN-IP>:54321`

Log in with `+91 0000000001` and OTP `123456`.

### Staging database (once)

1. Supabase → `flikk-staging` → **Connect** → copy the **Session pooler** URI (it includes the password).
2. Apply migrations and test data:
   ```
   cd backend
   DATABASE_URL='<staging pooler URI>' pnpm db:seed
   ```
3. Supabase → `flikk-staging` → Authentication → Phone: enable phone sign-in and add test numbers, for example `910000000001` with OTP `123456`.
4. Storage: create the same public buckets as production (store-images, product-images, banners, etc.) if a migration didn't already create them.

### Railway staging environment (once)

1. Railway → project → **Environments → New Environment → Duplicate `production`**, and name it `staging`.
2. For both services (API and worker), go to **Settings → Source** and set the branch to `staging`.
3. Change these **Variables** in staging. Everything else can stay the same:
   - `SUPABASE_URL=https://qgbuvydwcgjthwqxqylk.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = staging service_role key (Supabase → flikk-staging → Settings → API)
   - `CASHFREE_ENV=sandbox`, plus sandbox `CASHFREE_APP_ID` / `CASHFREE_SECRET_KEY`
   - `PUBLIC_API_URL` = the staging service's Railway domain
4. **Settings → Networking → Generate domain**, giving something like `flikk-staging.up.railway.app`.

### EAS preview environment (once)

On expo.dev, open each project → Environment variables → **preview**:
- `EXPO_PUBLIC_API_URL=https://<staging railway domain>`
- `EXPO_PUBLIC_SUPABASE_URL=https://qgbuvydwcgjthwqxqylk.supabase.co`
- `EXPO_PUBLIC_CASHFREE_ENV=sandbox`
- `GOOGLE_MAPS_API_KEY` (the same key is fine)

Account-wide (Global) variables apply to every environment you tick, so make sure the **preview** values point at staging and not production.

## How every change flows

1. **Branch from `main`** and build it locally against local Supabase. Write the migration if the schema changes.
2. **Open a PR.** CI runs every backend, SQL, app and admin check. Don't merge on red.
3. **Merge into `staging`.** Railway staging deploys by itself. Apply the new migrations to staging:
   ```
   DATABASE_URL='<staging URI>' pnpm db:migrate
   ```
4. **Test on phones.** Run `npx eas-cli build --profile preview --platform android` and install the APK, then walk through the full flow:
   - log in, browse, add to cart, order (COD and sandbox online);
   - the store accepts and packs it;
   - a rider gets the offer, picks up, and delivers with the code;
   - admin sees the order, payout and earnings.
5. **Promote to production:**
   1. Back up: Supabase → Flikk → Database → Backups. Download one, or note the latest daily backup time.
   2. Apply the migrations first:
      ```
      DATABASE_URL='<prod URI>' CONFIRM_PRODUCTION=bjlknohjdnemxwwoxcsv node scripts/db-migrate.mjs --production
      ```
   3. Then merge `staging` → `main`, and Railway production deploys.
   4. Watch Railway logs for 10 minutes.
6. **Mobile release:** EAS production build → Play internal testing → closed testing → production with a staged rollout (20% → 50% → 100%).

### Production's migration ledger (one time)

Production got migrations 001–112 before this ledger existed. Record them once, without running them, before using `db-migrate` there:

```
DATABASE_URL='<prod URI>' CONFIRM_PRODUCTION=bjlknohjdnemxwwoxcsv \
  node scripts/db-migrate.mjs --production --baseline-through 112_app_config_and_hours.sql
```

After that, `--status` lists exactly what production is missing (113 onward).

## Rules to keep in mind

**Database**
- The database gets its migration **before** the code that needs it, and staging always gets it before production.
- Never edit an applied migration. Write a new one; the ledger refuses edited files.
- Never run hand-written SQL in the production dashboard. If it matters, it's a migration file in a PR.
- Migrations add things: new columns get defaults, and nothing is dropped or renamed in the same release that stops using it. Remove old columns a release later, so the old app version keeps working.
- Back up before every production migration.

**Code and releases**
- `main` is always what production runs. No direct pushes, only PRs with green CI.
- Old app versions stay installed for weeks. The backend must keep answering requests the previous app version makes, so add new fields and don't change what old ones mean.
- A Play Store release can't be undone, only replaced. Use staged rollout and watch crash reports before going to 100%.
- Deploy in the morning, not at night, and not before a festival rush.

**Secrets**
- Secrets live only in Railway variables, EAS secrets, Supabase and local `.env.local` files. They never go in Git, chat, screenshots or `EXPO_PUBLIC_*` variables. Anything `EXPO_PUBLIC_` is readable by anyone who downloads the app.
- If a secret is ever pasted somewhere public, rotate it the same day.
- Staging and production use different keys: Cashfree sandbox vs live, and a different Supabase service key.

**Money and data**
- Test payments only with Cashfree sandbox until go-live. After go-live, do a real ₹1 order end to end after every payments change.
- Payouts are manual: reconcile Cashfree settlements against admin payouts every week.
- Production data never gets copied into local or staging. Customer phones and addresses stay in production only.

**Watching production**
- Check Railway logs (errors, crashes) and Supabase logs after every deploy.
- Admin → Push outbox, Stuck checkouts and Refunds pages each morning.
- Keep the app's support phone, WhatsApp and email filled in (Admin → App settings).

# Deploying the admin dashboard (Vercel)

The admin app is **not** an isolatable Next.js app. It compiles raw TypeScript
from `backend/src/**` and framework-free `packages/**/*.cjs` siblings at build
time, via deep relative imports (`../../../../backend/src/...`,
`../../../../../../packages/...`). The build contract below exists because of
that coupling. Do not treat it as optional.

## Vercel project settings

- **Root Directory:** `apps/admin`
- **Install command:** `pnpm install --frozen-lockfile`
- **Build command:** `pnpm build` (which is `next build --webpack`)
- **Framework preset:** Next.js

### Check out the WHOLE monorepo — do NOT use an isolated/sparse checkout

Admin imports and compiles `backend/src/**` and `packages/**` as source. The
build needs those directories present as siblings two levels up from
`apps/admin` (i.e. the repo root). If Vercel is configured to only pull
`apps/admin` (sparse/isolated checkout, "Include files outside root" off, or a
split-repo deploy), the build fails with `Module not found: Can't resolve
'../lib/storeCategories.js'` and similar. Keep the full repo in the deployment.

`next.config.ts` sets `outputFileTracingRoot` (and `turbopack.root`) to the repo
root (`path.resolve(__dirname, '../..')`) precisely so Next traces runtime files
that live outside `apps/admin` (e.g. `packages/home-content/package.json`)
instead of pruning them from the output. Leave it pointed at the repo root.

### Webpack, not Turbopack

The build runs on **webpack** (`next build --webpack`), not the Next 16 default
Turbopack. Reason: the imported `backend/src/**` files use NodeNext-style
explicit `.js` import extensions that actually resolve to `.ts` sources (e.g.
`import { AppError } from './errors.js'` → `errors.ts`). Turbopack cannot rewrite
`.js`→`.ts`; webpack can, via `experimental.extensionAlias` in `next.config.ts`.
Do not drop the `--webpack` flag or the `extensionAlias` config — either one
alone re-breaks the build.

## A backend type error breaks the admin build

Because `backend/src/**` is compiled as part of this app, a TypeScript error
*anywhere in the backend source that admin imports* (transitively) will fail
`pnpm build` here, even though the file lives in `backend/`. The admin build is
only as green as the backend code it pulls in. There is no isolation boundary.

## Environment variables

### Baked at BUILD time (must be set in Vercel before/at build)

Inlined into the client bundle during `next build`; changing them requires a
rebuild.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Needed at RUNTIME (server-only; read by route handlers per request)

Never prefix with `NEXT_PUBLIC_`.

- `SUPABASE_SERVICE_ROLE_KEY` — bypasses RLS; used by `app/api/**` route handlers
- `ADMIN_USERNAME`, `ADMIN_LOGIN_EMAIL` — admin sign-in gating
- `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
  `R2_PUBLIC_BASE_URL` (and optional `R2_ENDPOINT`) — only the media/image
  upload feature (`features/media/publicImages.ts` → `packages/server-media`);
  read lazily at request time, so the build is green without them, but uploads
  fail at runtime if unset.

A production build with placeholder values for all of the above succeeds — the
app compiles and renders without live credentials; the credentials only matter
once real requests hit Supabase / R2.

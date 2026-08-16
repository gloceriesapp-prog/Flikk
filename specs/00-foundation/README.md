# 00 — Foundation

Build this before any app surface. Every other spec folder assumes this exists and is correct.

## Contents

| File | Covers |
|---|---|
| [`repo-structure.md`](repo-structure.md) | Folder layout, package managers, per-app independence |
| [`data-model.md`](data-model.md) | Full Postgres schema, table-by-table, RLS policies |
| [`auth-and-roles.md`](auth-and-roles.md) | Phone-OTP auth, `users.role`, approval gating |
| [`api-conventions.md`](api-conventions.md) | REST shape, error format, status codes, endpoint table |
| [`design-system.md`](design-system.md) | Color tokens, type, spacing — shared across all 3 RN apps |
| [`environments-and-config.md`](environments-and-config.md) | Env vars, secrets scoping per app |
| [`out-of-scope.md`](out-of-scope.md) | The hard boundary — what must not appear in the codebase until v1 ships |

## Definition of done for this folder

- Backend boots, connects to Supabase, all tables from `data-model.md` exist with RLS enabled.
- OTP auth works end-to-end for at least one role.
- All four app shells (`/apps/customer`, `/apps/partner`, `/apps/rider`, `/apps/admin`) boot to a "logged in, hello world" state per `docs/BUILD-PLAN-Flikk.md` Week 1.
- Design tokens exist as a constants file, copied (not npm-linked) into each RN app.

This matches Week 1 of the build plan exactly — this folder's specs are that week, written out.

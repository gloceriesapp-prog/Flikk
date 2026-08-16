# Flikk — Specs Index

This folder is the implementation-ready spec set for Flikk, derived from `claude.md` (authoritative on app-surface scope) and `docs/PRD-Flikk.md` (authoritative on everything else: schema, API, design, business logic). `docs/BUILD-PLAN-Flikk.md` is the week-by-week sequencing reference.

**Read order for any AI agent picking up work here:** read this file, then the spec folder for the surface you're building, in order. Each folder's `README.md` states its own dependencies — don't skip ahead to `02-partner-app` before `00-foundation` is real, the endpoints and schema it needs don't exist yet.

## Why this structure

One folder per app surface plus a shared foundation and a shared platform layer, matching the four-app architecture in `claude.md`. Specs are written so a coding agent can open exactly one folder, plus its stated dependencies, and have everything needed to implement that slice — no need to re-derive intent from the PRD's prose each time.

## Folder map (build order)

| Order | Folder | What it defines | Depends on |
|---|---|---|---|
| 1 | [`00-foundation/`](00-foundation/README.md) | Repo layout, DB schema, auth/roles, API conventions, design tokens, env/config | Nothing — build this first |
| 2 | [`01-customer-app/`](01-customer-app/README.md) | Customer Expo app — screens, flows, endpoints, acceptance criteria | `00-foundation` |
| 3 | [`02-partner-app/`](02-partner-app/README.md) | Partner Expo app | `00-foundation` (independent of `01-customer-app`, but the order queue only makes sense once orders exist) |
| 4 | [`03-rider-app/`](03-rider-app/README.md) | Rider Expo app | `00-foundation`, `02-partner-app` (assignments only exist after an order is packed) |
| 5 | [`04-admin-dashboard/`](04-admin-dashboard/README.md) | Admin Next.js dashboard | `00-foundation`, plus a working slice of all three RN apps to have something to administer |
| — | [`05-platform/`](05-platform/README.md) | Cross-cutting concerns used by every surface above: notifications, realtime, payments, testing strategy, security, devops/hosting, analytics | Referenced by all of the above, not built standalone |

This mirrors `docs/BUILD-PLAN-Flikk.md` Weeks 1 → 8. Week 0 (manual WhatsApp pilot, no code) and Weeks 9–11 (onboarding, launch, measurement) are operational, not implementation specs — they stay in the build plan, not here.

## Non-negotiable constraints (apply to every spec in this folder)

These come from `claude.md` and override anything that reads differently in the PRD:

1. **Four separate apps, not a shared codebase.** Customer, Partner, Rider = React Native/Expo. Admin = Next.js web, the only web surface.
2. **Monolith backend.** One Node/Express API, role-scoped auth, serving all four clients. No microservices.
3. **Supabase for Postgres + Auth (phone OTP) + Realtime + Storage.** Don't hand-roll any of these.
4. **TypeScript strict mode everywhere**, all four apps + backend.
5. **Out-of-scope list is a hard boundary, not a backlog.** See [`00-foundation/out-of-scope.md`](00-foundation/out-of-scope.md). If a spec here seems to imply building one of those items, that's a spec bug — flag it, don't build around it.
6. **Cost ceiling:** infra under ₹2,500/month at MVP order volume. Treat as a real constraint when any spec proposes a paid dependency.

## How to use these specs

- Each spec file has a **Purpose**, the **spec body**, and an **Acceptance criteria** checklist at the bottom — implementation is done when the checklist passes, not before.
- Specs reference each other by relative path (e.g. `../00-foundation/data-model.md#orders`) instead of repeating schema/token definitions — treat foundation and platform specs as the single source of truth, don't fork a copy of a table definition into an app-level spec.
- When a spec is silent on something, check `00-foundation/` and `05-platform/` before improvising — most cross-cutting questions (how does auth work, what does an error response look like, what are the brand colors) are answered once, there.

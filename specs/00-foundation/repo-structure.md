# Repo Structure & Tooling

## Purpose

Define the exact folder layout and package-manager rules so every app can be scaffolded consistently and no agent invents a different structure mid-build.

## Layout

```
/apps
  /customer      — Expo app (React Native)
  /partner       — Expo app (React Native)
  /rider         — Expo app (React Native)
  /admin         — Next.js app
/backend         — Node/Express API, shared by all four apps
/docs            — PRD, build plan (reference only, not source of truth for new work — specs/ is)
/specs           — this folder
/CLAUDE.md
```

One repo. Not a monorepo with workspace tooling — `/apps/*` folders each have their own `package.json` and lockfile, not linked to each other. No Turborepo/Nx. That's infrastructure earning no benefit yet for a solo dev on four apps.

Only introduce `/packages/shared` (types, API client, design tokens as an actual linked package instead of copy-pasted files) once real duplication pain shows up across the three RN apps — not preemptively, and not as a Week 1 nicety.

## Package managers — do not mix these up

| Apps | Manager | Why |
|---|---|---|
| `/apps/customer`, `/apps/partner`, `/apps/rider` | **npm** | Metro bundler has known symlink/resolution friction with pnpm, worse with bun. npm is what Expo's own tooling assumes. |
| `/backend`, `/apps/admin` | **pnpm** | Pure Node/web, no Metro. pnpm's stricter resolution and disk efficiency are a clean win here. |

Never use bun anywhere in this stack. Least battle-tested option for Expo/Supabase client libs specifically; its speed advantage is irrelevant at solo-dev MVP scale.

## Scaffolding commands (Week 1)

```bash
# three Expo apps
npx create-expo-app apps/customer --template
npx create-expo-app apps/partner --template
npx create-expo-app apps/rider --template

# admin
pnpm create next-app apps/admin --typescript

# backend
mkdir backend && cd backend && pnpm init
```

Each Expo app: React Navigation (native-stack + bottom-tabs), Zustand, TanStack Query, React Hook Form — same dependency set across all three, installed in Week 1 even before real screens exist, so the pattern is consistent from the first commit.

## TypeScript

Strict mode on in all five package.json/tsconfig.json (three Expo apps, admin, backend). No `any` without an inline comment explaining why it's unavoidable.

## Linting/formatting

ESLint + Prettier, one shared config file **copied** (not npm-linked) into each app until `/packages/shared` exists. Run lint in CI on every push.

## Acceptance criteria

- [ ] `/apps/customer`, `/apps/partner`, `/apps/rider`, `/apps/admin`, `/backend` exist with the exact layout above
- [ ] Each app has its own lockfile matching the table above (npm for the 3 RN apps, pnpm for backend + admin)
- [ ] No bun anywhere — check for `bun.lockb` in CI as a guard
- [ ] Each RN app has React Navigation, Zustand, TanStack Query, React Hook Form installed
- [ ] Shared ESLint/Prettier config file copied into all five packages, not symlinked/npm-linked
- [ ] All five packages have `strict: true` in tsconfig
- [ ] GitHub Actions runs lint + typecheck on every push across all five packages

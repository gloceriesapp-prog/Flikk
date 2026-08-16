# Auth & Roles

## Purpose

Define how all four apps authenticate and how the backend scopes access per role. This is the mechanism every other spec's "who can call this endpoint" assumes.

## Method

**Phone-OTP only, across all four roles.** No email/password, no social login, no magic links. Supabase Auth handles OTP send/verify — don't hand-roll this.

## Roles

`users.role` is one of: `customer`, `store_owner`, `rider`, `admin`. This single column is the entire authorization model — no separate permissions/roles table. Every endpoint is role-scoped by checking this column against the authenticated session.

## Flow (same shape across all four apps)

1. App calls `POST /auth/otp/request` with phone number.
2. Supabase sends OTP via SMS.
3. App calls `POST /auth/otp/verify` with phone + code.
4. Backend issues a role-scoped session (Supabase session token, role embedded/looked up server-side on every request — never trust a client-supplied role).
5. App stores session, attaches it to every subsequent API call.

## Approval gating

`users.is_approved` blocks `store_owner` and `rider` roles from using their app **at all** until an admin approves them via [`04-admin-dashboard/`](../04-admin-dashboard/README.md) A1/A2. This is not endpoint-level filtering — it's a full app-state gate:

- **Partner app (P1):** unapproved store owner sees a "waiting for approval" screen, not the real app shell. No catalog, no order queue, nothing — see [`02-partner-app/screens.md`](../02-partner-app/screens.md).
- **Rider app (R1):** same pattern — unapproved rider sees a waiting state, not the assignment queue.
- **Customer role:** never gated on `is_approved` — anyone can sign up and order immediately, this column is irrelevant for `role = 'customer'`.
- **Admin:** never gated — admin accounts are provisioned manually, not self-signup.

## What each role can reach (endpoint-level enforcement lives in [`api-conventions.md`](api-conventions.md), data-level enforcement lives in [`data-model.md`](data-model.md)'s RLS table)

| Role | Can call |
|---|---|
| `customer` | `/zones`, `/stores`, `/stores/:id/products`, `/orders` (own), `/payments/webhook` is Razorpay-only |
| `store_owner` | `/partner/*` (own store only) |
| `rider` | `/rider/*` (own assignments/earnings only) |
| `admin` | `/admin/*`, plus read access to everything for the cross-app monitor |

## Rules

- A JWT/session never carries a client-editable role claim the backend trusts blindly — role is looked up server-side from `users.role` on every request, or verified against a signed session Supabase itself issues.
- One backend, four clients — the same `/auth/otp/*` endpoints serve all four apps (per `api-conventions.md`'s endpoint table). Don't build per-app auth endpoints.
- Session/token storage on-device: use Expo SecureStore (RN apps) / httpOnly cookie or equivalent (admin web) — never AsyncStorage/localStorage in plaintext for the session token.

## Acceptance criteria

- [ ] `POST /auth/otp/request` and `POST /auth/otp/verify` work identically for all four roles from a single shared implementation
- [ ] A `store_owner` or `rider` with `is_approved = false` is blocked from every `/partner/*` or `/rider/*` endpoint except whatever read-only "am I approved yet" check the waiting screen needs
- [ ] A `customer` session cannot successfully call any `/partner/*`, `/rider/*`, or `/admin/*` endpoint (403, verified by test)
- [ ] Role is never trusted from client input — verified server-side on every request
- [ ] Session tokens stored via SecureStore (mobile) / httpOnly cookie (web), not plaintext local storage

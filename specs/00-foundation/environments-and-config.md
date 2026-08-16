# Environments & Config

## Purpose

Define secrets scoping per app so no app holds a credential it has no business holding, and how hosting maps to each surface.

## Secrets — scoped per app, not one global `.env`

| Secret | Lives in |
|---|---|
| Razorpay keys | `/backend` only (customer app never talks to Razorpay directly — always through the backend) |
| Supabase service role key | `/backend` only — never in any client app, which use the anon/public key instead |
| Supabase anon/public key | Each app that needs Supabase client access (all four) |
| WhatsApp Business API (Interakt/Gupshup) credentials | `/backend` only |
| Twilio SMS credentials | `/backend` only |
| Expo Push credentials | `/backend` (to send) + each RN app (to register a push token) |

The rider app has no business holding a Razorpay key — this is the guiding example from `claude.md`: scope every secret to what the app genuinely needs, never copy the full `.env` set everywhere out of convenience.

Environment variables only, never committed. Add a `.env.example` per app as each is scaffolded, listing variable names with no real values.

## Hosting per surface

| Layer | Choice | Cost at MVP volume |
|---|---|---|
| Backend API | Railway or Render | ₹0-500/mo |
| Database + Auth + Realtime + Storage | Supabase | ₹0 (free tier) |
| Admin dashboard | Vercel | ₹0 (hobby tier) |
| Payments | Razorpay | ~2% transaction fee only |
| WhatsApp API | Interakt/Gupshup | ₹500-1,000/mo |
| Push notifications | Expo Push | ₹0 at this volume |
| Customer/Partner/Rider app builds | Expo EAS Build | Free tier sufficient at MVP scale |

**Total must stay under ₹2,500/month at MVP order volume.** Check this ceiling before adding any new paid dependency — this number was revised up once already (from ₹2,000) specifically to account for push infra across three apps; don't let it silently creep further without a deliberate check.

## CI/CD

GitHub Actions: lint + typecheck on every push, across all five packages (`customer`, `partner`, `rider`, `admin`, `backend`). Expo EAS Build for the three app binaries. Auto-deploy backend + admin on merge to `main`.

## App store distribution

Three separate Play Store listings:
- **Customer app:** public listing — needs to be publicly discoverable at launch.
- **Partner app, Rider app:** closed/internal testing tracks — skips full public review, appropriate during the pilot phase since these aren't meant for public discovery yet.

## Acceptance criteria

- [ ] No app holds a secret it doesn't directly need (audit: grep each app's `.env.example` against the table above)
- [ ] `/backend` is the only package holding Razorpay keys, Supabase service role key, WhatsApp/Twilio credentials
- [ ] `.env.example` exists per app once that app is scaffolded, with variable names only
- [ ] CI runs lint + typecheck on every push across all five packages
- [ ] Monthly infra cost tracked and confirmed under ₹2,500 before each new paid dependency is added

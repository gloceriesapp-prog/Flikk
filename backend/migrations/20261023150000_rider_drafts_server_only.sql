-- Rider onboarding drafts are written only by the backend (routes/
-- riderOnboarding.ts, service role), which validates every field and sets
-- submitted_at. Migration 042 also gave signed-in users a self-only FOR ALL
-- policy, and the table still carries the default client grants, so a
-- rider applicant could write their own draft straight through the
-- Supabase API: skip validation, mark it submitted, or clear a
-- rejection_reason. No app reads or writes this table directly (the rider
-- app uses GET/PATCH /rider/draft), so close the client path entirely.
drop policy if exists rider_onboarding_drafts_self on public.rider_onboarding_drafts;
revoke all on table public.rider_onboarding_drafts from anon, authenticated;

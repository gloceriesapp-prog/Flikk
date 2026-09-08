-- Rejection now carries a real, readable reason back to the applicant
-- instead of just flipping users.is_rejected with nothing to show for it.
-- Lives on store_onboarding_drafts (not users) because the draft is what
-- already survives a reject (admin's approve route only ever deletes it
-- on approve, never on reject) — the reason travels with the exact
-- application it explains, and a resubmission naturally overwrites it via
-- the same upsert onConflict:user_id every draft PATCH already uses.
alter table store_onboarding_drafts
  add column if not exists rejection_reason text;

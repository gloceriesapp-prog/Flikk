-- Business documents collected during onboarding Step 2 (StoreDetailsScreen)
-- now mirror what Store Settings already writes onto the real `stores` row
-- (fssai_number, pan_number). Applicant-facing table, not the approved
-- store — admin's approve action copies these across at approval time.
alter table store_onboarding_drafts
  add column if not exists fssai_number text,
  add column if not exists pan_number text;

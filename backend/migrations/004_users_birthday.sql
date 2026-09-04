-- Customer-facing "Add your birthday" (Profile screen) — so notifications
-- (WhatsApp/SMS, already the stack's chosen channel) can wish a customer on
-- their birthday. Single nullable date column, no backfill needed — same
-- optional-profile-info shape as users.name.
alter table users add column birthday date;

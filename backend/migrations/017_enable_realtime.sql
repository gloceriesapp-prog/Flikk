-- Supabase Realtime only streams postgres_changes for tables added to the
-- supabase_realtime publication — off by default for every table.
-- specs/05-platform/realtime.md's admin cross-app order monitor (orders)
-- and apps/admin's Overview page (stores/riders, for active-store/
-- active-rider counts) both need this to actually fire.
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table stores;
alter publication supabase_realtime add table riders;

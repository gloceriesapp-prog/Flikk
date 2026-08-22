-- Store Setup (partner onboarding, P1) needs to persist fields the original
-- schema never had a slot for: the district the owner picked (StoreSetupScreen
-- already sends it, silently dropped until now), a storefront photo, and an
-- optional GST number. All nullable/optional except district — a store
-- without GST registration is normal at kirana scale, a store without any
-- district isn't.
alter table stores
  add column district text not null default '',
  add column photo_url text,
  add column gst_number text;

alter table stores alter column district drop default;

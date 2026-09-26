-- Store-owner reply to a customer review. reviews (020_reviews.sql) was
-- read-only for owners (reviews_store_owner_read, SELECT only) — this adds the
-- reply text + timestamp and the UPDATE policy that lets an owner write ONLY on
-- reviews left for their own store. Nullable: an unanswered review is the norm.
-- Does not touch rating or stores.rating — the aggregate recompute in
-- routes/reviews.ts is unaffected, reply is display-only metadata.
alter table reviews add column if not exists owner_reply text;
alter table reviews add column if not exists owner_replied_at timestamptz;

comment on column reviews.owner_reply is
  'Store owner''s public reply to this review. NULL = not yet answered.';

-- Owner may update only their own store's reviews (mirrors
-- reviews_store_owner_read's ownership test). Column scope (reply-only, not
-- rating/comment) is enforced in the API allowlist, not RLS — same split as
-- PATCH /partner/store.
create policy reviews_store_owner_reply on reviews for update using (
  store_id in (select id from stores where owner_user_id = auth.uid())
) with check (
  store_id in (select id from stores where owner_user_id = auth.uid())
);

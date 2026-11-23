-- "Didn't find an item?" requests from the customer Store list
-- (RequestProductSheet.tsx). Public insert through the backend, same as
-- area_upvotes: a browsing guest can ask too. Admin reads and marks them done.
create table product_requests (
  id uuid primary key default gen_random_uuid(),
  message text not null check (char_length(btrim(message)) between 3 and 500),
  city text check (city is null or char_length(city) <= 120),
  store_name text check (store_name is null or char_length(store_name) <= 200),
  status text not null default 'new' check (status in ('new', 'done')),
  created_at timestamptz not null default now()
);

create index product_requests_created_at_idx on product_requests (created_at desc);

alter table product_requests enable row level security;
-- Intentionally no policies: only the backend and admin service-role
-- clients read or write these rows.

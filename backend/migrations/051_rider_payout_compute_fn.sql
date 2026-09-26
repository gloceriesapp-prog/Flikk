-- Atomic rider-payout compute — closes a double-pay window in the previous
-- two-write compute (jobs/weeklyRiderPayouts.ts): it inserted a rider_payouts
-- row, THEN stamped rider_payout_id on that rider's unpaid earnings in a
-- separate write. A crash/network drop between the two left a payable payout
-- row with its earnings still unlinked; the next weekly run re-summed those
-- same earnings under a new week_start (no unique conflict) and paid them a
-- second time.
--
-- Doing the insert and the link in one statement (one transaction) makes the
-- invariant hard: a committed rider_payouts row ALWAYS has its earnings
-- linked. So `on conflict do nothing` is safe — a conflict can only mean a
-- prior run already fully settled that rider's week (row + links both
-- present), leaving nothing in the unpaid set to re-link. Same
-- Supabase-has-no-multi-statement-txn reasoning as 002/015.
--
-- amount is round(sum, 2): rider_earnings.amount is already numeric(10,2), so
-- the sum has at most 2 decimals and the round is a safety no-op — no
-- IEEE-754 drift the way the old JS round2 had to guard against.

create or replace function create_weekly_rider_payouts(
  p_week_start date,
  p_week_end date
)
returns integer
language plpgsql
as $$
declare
  v_created integer;
begin
  with ins as (
    insert into rider_payouts (rider_id, week_start, week_end, amount, status)
    select rider_id, p_week_start, p_week_end, round(sum(amount), 2), 'pending'
    from rider_earnings
    where rider_payout_id is null
    group by rider_id
    on conflict (rider_id, week_start) do nothing
    returning id, rider_id
  ),
  linked as (
    update rider_earnings e
    set rider_payout_id = ins.id
    from ins
    where e.rider_id = ins.rider_id and e.rider_payout_id is null
    returning 1
  )
  select count(*) into v_created from ins;
  return v_created;
end;
$$;

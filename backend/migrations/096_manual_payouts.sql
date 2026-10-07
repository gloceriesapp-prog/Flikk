-- Manual payouts while no payout provider (RazorpayX / Cashfree Payouts) is
-- active. Store owners can save payout details without a provider check; the
-- founder pays from the bank and records the bank reference (UTR) per payout.

-- Payout destination: who the account belongs to as typed by the owner, and
-- whether a provider has confirmed it. Existing rows with a provider-returned
-- name were verified by RazorpayX.
alter table stores add column if not exists payout_account_holder_name text;
alter table stores add column if not exists payout_details_verified boolean not null default false;
update stores set payout_details_verified = true
where payout_upi_verified_name is not null and payout_details_verified = false;

-- Bank reference for a manually released payout. Required by the admin
-- mark-paid action; null for provider-released payouts.
alter table payouts add column if not exists payment_reference text;
alter table rider_payouts add column if not exists payment_reference text;

-- Riders: same manual-payout model. payout_account_holder_name already exists.
alter table riders add column if not exists payout_details_verified boolean not null default false;
update riders set payout_details_verified = true
where (payout_upi_verified_name is not null or razorpay_fund_account_id is not null) and payout_details_verified = false;

-- Records one manually-sent payout as paid. Atomic: for riders the linked
-- rider_earnings rows are stamped in the same transaction. Only pending /
-- blocked / failed rows qualify — 'processing' is mid-flight with a provider
-- and 'paid' must not be overwritten. Returns false when nothing qualified.
CREATE OR REPLACE FUNCTION public.mark_payout_paid_manually(p_kind text, p_id uuid, p_reference text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE updated uuid;
BEGIN
  IF p_kind NOT IN ('store','rider') THEN RAISE EXCEPTION 'invalid payout kind'; END IF;
  IF p_reference IS NULL OR p_reference !~ '^[A-Za-z0-9-]{6,40}$' THEN RAISE EXCEPTION 'invalid payment reference'; END IF;
  IF p_kind = 'store' THEN
    UPDATE public.payouts SET status='paid', paid_at=now(), payment_reference=p_reference
    WHERE id=p_id AND status IN ('pending','blocked','failed') RETURNING id INTO updated;
  ELSE
    UPDATE public.rider_payouts SET status='paid', paid_at=now(), payment_reference=p_reference
    WHERE id=p_id AND status IN ('pending','blocked','failed') RETURNING id INTO updated;
    IF updated IS NOT NULL THEN
      UPDATE public.rider_earnings SET paid_at=now() WHERE rider_payout_id=updated AND paid_at IS NULL;
    END IF;
  END IF;
  RETURN updated IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION public.mark_payout_paid_manually(text,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.mark_payout_paid_manually(text,uuid,text) TO service_role;

BEGIN;
SET LOCAL lock_timeout='5s';
-- PostgreSQL runs same-kind triggers alphabetically. Enforce the existing
-- suspension guard before availability materialization can normalize is_active.
ALTER TRIGGER stores_apply_availability ON public.stores RENAME TO zz_stores_apply_availability;
CREATE OR REPLACE FUNCTION public.stores_apply_availability()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE at_time timestamptz:=statement_timestamp(); boundary timestamptz;
BEGIN
  boundary:=store_next_hours_boundary(NEW.open_time,NEW.close_time,at_time);
  -- Lifting suspension restores access, not an unattended open store.
  IF TG_OP='UPDATE' THEN
    IF OLD.admin_suspended AND NOT NEW.admin_suspended THEN
      NEW.availability_override:=false;
      NEW.availability_override_until:=coalesce(boundary,
        (date_trunc('day',at_time AT TIME ZONE 'Asia/Kolkata')+interval '1 day') AT TIME ZONE 'Asia/Kolkata');
    END IF;
  END IF;
  IF TG_OP='INSERT' AND NOT NEW.is_active AND NEW.availability_override IS NULL THEN
    NEW.availability_override:=false;
    NEW.availability_override_until:=coalesce(boundary,
      (date_trunc('day',at_time AT TIME ZONE 'Asia/Kolkata')+interval '1 day') AT TIME ZONE 'Asia/Kolkata');
  END IF;
  IF TG_OP='UPDATE' THEN
    -- Old clients/admin editors still PATCH is_active. Convert a manual
    -- departure from the automatic result into a bounded override.
    IF NEW.is_active IS DISTINCT FROM OLD.is_active
       AND NEW.availability_override IS NOT DISTINCT FROM OLD.availability_override
       AND NEW.availability_override_until IS NOT DISTINCT FROM OLD.availability_override_until
       AND NEW.admin_suspended IS NOT DISTINCT FROM OLD.admin_suspended
       AND NEW.is_active IS DISTINCT FROM store_effective_open(NEW,at_time) THEN
      NEW.availability_override:=NEW.is_active;
      NEW.availability_override_until:=coalesce(boundary,
        (date_trunc('day',at_time AT TIME ZONE 'Asia/Kolkata')+interval '1 day') AT TIME ZONE 'Asia/Kolkata');
    END IF;
    -- New hours take effect immediately and resume automatic operation.
    IF NEW.open_time IS DISTINCT FROM OLD.open_time OR NEW.close_time IS DISTINCT FROM OLD.close_time THEN
      NEW.availability_override:=NULL; NEW.availability_override_until:=NULL;
    END IF;
  END IF;
  IF NEW.availability_override_until<=at_time THEN
    NEW.availability_override:=NULL; NEW.availability_override_until:=NULL;
  END IF;
  NEW.is_active:=store_effective_open(NEW,at_time);
  NEW.availability_next_change_at:=least(boundary,NEW.availability_override_until);
  RETURN NEW;
END $$;
-- Account reinstatement also requires a deliberate reopening by the operator.
CREATE OR REPLACE FUNCTION public.owner_availability_changed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE at_time timestamptz:=statement_timestamp();
BEGIN
  IF OLD.partner_suspended AND NOT NEW.partner_suspended THEN
    UPDATE stores SET availability_override=false,
      availability_override_until=coalesce(store_next_hours_boundary(open_time,close_time,at_time),
        (date_trunc('day',at_time AT TIME ZONE 'Asia/Kolkata')+interval '1 day') AT TIME ZONE 'Asia/Kolkata')
      WHERE owner_user_id=NEW.id;
  ELSE
    UPDATE stores SET availability_next_change_at=NULL WHERE owner_user_id=NEW.id;
  END IF;
  RETURN NEW;
END $$;
COMMIT;

-- Run against the disposable migration bootstrap database, never production.
BEGIN;
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Disposable fixture only'; END IF; END $$;
DO $$
DECLARE v_owner uuid:=gen_random_uuid(); v_manager uuid:=gen_random_uuid(); v_admin uuid:=gen_random_uuid();
        v_rider uuid:=gen_random_uuid(); v_zone uuid:=gen_random_uuid(); v_store uuid:=gen_random_uuid(); v_other uuid:=gen_random_uuid(); v_temp uuid; v_otherowner uuid:=gen_random_uuid(); i integer;
BEGIN
  IF has_table_privilege('anon','public.store_memberships','SELECT') OR has_table_privilege('authenticated','public.store_memberships','INSERT')
    OR has_function_privilege('authenticated','public.manage_store_member(uuid,uuid,uuid,boolean)','EXECUTE')
    OR has_function_privilege('anon','public.manage_store_member(uuid,uuid,uuid,boolean)','EXECUTE') THEN RAISE EXCEPTION 'store team privileges exposed'; END IF;
  INSERT INTO auth.users(id) VALUES(v_owner),(v_manager),(v_admin),(v_rider),(v_otherowner);
  INSERT INTO public.users(id,phone,role,is_approved) VALUES(v_owner,'+919900001001','store_owner',true),(v_manager,'+919900001002','customer',false),(v_admin,'+919900001003','admin',true),(v_rider,'+919900001004','rider',true),(v_otherowner,'+919900001005','store_owner',true);
  INSERT INTO public.zones(id,name,slug,is_active) VALUES(v_zone,'Team test',v_zone::text,true);
  INSERT INTO public.stores(id,owner_user_id,zone_id,name,category,district) VALUES(v_store,v_owner,v_zone,'Team test','Supermarket','Udupi'),(v_other,v_otherowner,v_zone,'Other','Supermarket','Udupi');
  PERFORM public.manage_store_member(v_store,v_manager,v_admin,true);
  IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=v_manager AND role='store_owner' AND is_approved) THEN RAISE EXCEPTION 'manager not approved'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.store_memberships WHERE user_id=v_manager AND store_id=v_store AND is_active) THEN RAISE EXCEPTION 'manager not assigned'; END IF;
  BEGIN PERFORM public.manage_store_member(v_other,v_manager,v_admin,true); RAISE EXCEPTION 'FAIL: cross-store assignment allowed';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%MEMBER_HAS_ANOTHER_STORE%' THEN RAISE; END IF; END;
  BEGIN PERFORM public.manage_store_member(v_store,v_owner,v_admin,false); RAISE EXCEPTION 'FAIL: owner removal allowed';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%PRIMARY_OWNER_IMMUTABLE%' THEN RAISE; END IF; END;
  BEGIN PERFORM public.manage_store_member(v_store,v_rider,v_admin,true); RAISE EXCEPTION 'FAIL: rider promotion allowed';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%INELIGIBLE_MEMBER%' THEN RAISE; END IF; END;
  BEGIN INSERT INTO public.stores(owner_user_id,zone_id,name,category,district) VALUES(v_manager,v_zone,'Forbidden','Supermarket','Udupi'); RAISE EXCEPTION 'FAIL: manager ownership allowed';
  EXCEPTION WHEN SQLSTATE 'P0409' THEN IF SQLERRM NOT LIKE '%STORE_MANAGER_CANNOT_OWN%' THEN RAISE; END IF; END;
  FOR i IN 1..19 LOOP
    v_temp:=gen_random_uuid();
    INSERT INTO auth.users(id) VALUES(v_temp);
    INSERT INTO public.users(id,phone,role,is_approved) VALUES(v_temp,'+91880000'||lpad(i::text,4,'0'),'customer',false);
    PERFORM public.manage_store_member(v_store,v_temp,v_admin,true);
  END LOOP;
  v_temp:=gen_random_uuid(); INSERT INTO auth.users(id) VALUES(v_temp);
  INSERT INTO public.users(id,phone,role,is_approved) VALUES(v_temp,'+918800000999','customer',false);
  BEGIN PERFORM public.manage_store_member(v_store,v_temp,v_admin,true); RAISE EXCEPTION 'FAIL: team limit bypassed';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%TEAM_LIMIT_REACHED%' THEN RAISE; END IF; END;
  PERFORM public.manage_store_member(v_store,v_manager,v_admin,false);
  IF EXISTS(SELECT 1 FROM public.store_memberships WHERE user_id=v_manager AND is_active) THEN RAISE EXCEPTION 'revocation failed'; END IF;
END;
$$;
ROLLBACK;

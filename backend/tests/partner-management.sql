-- Run only through the loopback-only rollback harness. Requires applied migrations and local seed data.
DO $$
DECLARE
  signature text;
  index_name text;
  shop public.stores;
  other_shop public.stores;
  member_id uuid;
  request public.store_profile_change_requests;
  original_pan text;
  replacement_pan text;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'public.partner_request_store_profile_change(uuid,uuid,jsonb)',
    'public.admin_review_store_profile_change(uuid,boolean,text,uuid)',
    'public.partner_remove_store_member(uuid,uuid,uuid)'
  ] LOOP
    IF to_regprocedure(signature) IS NULL THEN
      RAISE EXCEPTION 'Required RPC % is missing; apply the pending local management migration first', signature;
    END IF;
    IF has_function_privilege('anon',signature,'EXECUTE') OR has_function_privilege('authenticated',signature,'EXECUTE') THEN
      RAISE EXCEPTION 'Client role can execute %', signature;
    END IF;
    IF NOT has_function_privilege('service_role',signature,'EXECUTE') THEN
      RAISE EXCEPTION 'Service role cannot execute %', signature;
    END IF;
  END LOOP;
  IF has_table_privilege('anon','public.store_profile_change_requests','SELECT')
     OR has_table_privilege('authenticated','public.store_profile_change_requests','SELECT')
     OR has_table_privilege('authenticated','public.store_memberships','UPDATE') THEN
    RAISE EXCEPTION 'Private management tables exposed to client roles';
  END IF;
  FOREACH index_name IN ARRAY ARRAY['products_partner_store_page_idx','products_partner_name_search_idx','products_partner_category_search_idx'] LOOP
    IF NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('public.'||index_name) AND indisvalid AND indisready) THEN
      RAISE EXCEPTION 'Required catalogue index % is missing or invalid', index_name;
    END IF;
  END LOOP;
  SELECT * INTO shop FROM public.stores WHERE owner_user_id IS NOT NULL ORDER BY id LIMIT 1;
  SELECT * INTO other_shop FROM public.stores WHERE owner_user_id IS NOT NULL AND id<>shop.id ORDER BY id LIMIT 1;
  SELECT u.id INTO member_id FROM public.users u JOIN auth.users a ON a.id=u.id
    WHERE u.id<>shop.owner_user_id AND u.id<>other_shop.owner_user_id
      AND NOT EXISTS(SELECT 1 FROM public.stores s WHERE s.owner_user_id=u.id) ORDER BY u.id LIMIT 1;
  IF shop.id IS NULL OR other_shop.id IS NULL OR member_id IS NULL THEN
    RAISE EXCEPTION 'Local fixtures required: two owned stores and one non-owner user with an auth record';
  END IF;
  -- Existing local pending changes must not interfere; this modification rolls back.
  UPDATE public.store_profile_change_requests SET status='superseded' WHERE store_id=shop.id AND status='pending';
  original_pan:=shop.pan_number;
  replacement_pan:=CASE WHEN original_pan='ABCDE1234F' THEN 'ZYXWV9876A' ELSE 'ABCDE1234F' END;
  BEGIN
    PERFORM public.partner_request_store_profile_change(shop.id,member_id,jsonb_build_object('pan_number',replacement_pan));
    RAISE EXCEPTION 'Non-owner submitted a legal replacement';
  EXCEPTION WHEN SQLSTATE 'P0403' THEN NULL; END;
  BEGIN
    PERFORM public.partner_request_store_profile_change(shop.id,shop.owner_user_id,'{"pan_number":"invalid"}');
    RAISE EXCEPTION 'Malformed legal replacement accepted';
  EXCEPTION WHEN SQLSTATE 'P0400' THEN NULL; END;
  request:=public.partner_request_store_profile_change(shop.id,shop.owner_user_id,jsonb_build_object('pan_number',replacement_pan));
  IF request.status<>'pending' OR request.previous->>'pan_number' IS DISTINCT FROM original_pan
    OR (SELECT pan_number FROM public.stores WHERE id=shop.id) IS DISTINCT FROM original_pan THEN
    RAISE EXCEPTION 'Proposal changed live data or lost its previous value';
  END IF;
  BEGIN
    PERFORM public.admin_review_store_profile_change(request.id,false,'',shop.owner_user_id);
    RAISE EXCEPTION 'Rejection without reason accepted';
  EXCEPTION WHEN SQLSTATE 'P0400' THEN NULL; END;
  request:=public.admin_review_store_profile_change(request.id,false,'Document not legible',shop.owner_user_id);
  IF request.status<>'rejected' OR request.reviewed_at IS NULL
    OR (SELECT pan_number FROM public.stores WHERE id=shop.id) IS DISTINCT FROM original_pan THEN
    RAISE EXCEPTION 'Rejection altered live document or lost review metadata';
  END IF;
  request:=public.partner_request_store_profile_change(shop.id,shop.owner_user_id,jsonb_build_object('pan_number',replacement_pan));
  request:=public.admin_review_store_profile_change(request.id,true,NULL,shop.owner_user_id);
  IF request.status<>'approved' OR (SELECT pan_number FROM public.stores WHERE id=shop.id) IS DISTINCT FROM replacement_pan THEN
    RAISE EXCEPTION 'Approved replacement not committed with request state';
  END IF;
  BEGIN
    PERFORM public.admin_review_store_profile_change(request.id,false,'Already reviewed',shop.owner_user_id);
    RAISE EXCEPTION 'Completed request reviewed twice';
  EXCEPTION WHEN SQLSTATE 'P0409' THEN NULL; END;
  INSERT INTO public.store_memberships(user_id,store_id,created_by,is_active)
    VALUES(member_id,other_shop.id,member_id,true)
    ON CONFLICT(user_id) DO UPDATE SET store_id=EXCLUDED.store_id,is_active=true;
  BEGIN
    PERFORM public.partner_remove_store_member(shop.id,member_id,member_id);
    RAISE EXCEPTION 'Non-owner removed staff';
  EXCEPTION WHEN SQLSTATE 'P0403' THEN NULL; END;
  BEGIN
    PERFORM public.partner_remove_store_member(shop.id,shop.owner_user_id,shop.owner_user_id);
    RAISE EXCEPTION 'Primary owner removed';
  EXCEPTION WHEN SQLSTATE 'P0400' THEN NULL; END;
  PERFORM public.partner_remove_store_member(shop.id,shop.owner_user_id,member_id);
  IF NOT (SELECT is_active FROM public.store_memberships WHERE user_id=member_id AND store_id=other_shop.id) THEN
    RAISE EXCEPTION 'Owner removed another store''s staff';
  END IF;
  UPDATE public.store_memberships SET store_id=shop.id WHERE user_id=member_id;
  PERFORM public.partner_remove_store_member(shop.id,shop.owner_user_id,member_id);
  IF (SELECT is_active FROM public.store_memberships WHERE user_id=member_id) THEN
    RAISE EXCEPTION 'Owned staff membership not deactivated';
  END IF;
  -- Retrying the same removal must be harmless.
  PERFORM public.partner_remove_store_member(shop.id,shop.owner_user_id,member_id);
  IF (SELECT is_active FROM public.store_memberships WHERE user_id=member_id) THEN
    RAISE EXCEPTION 'Removal retry reactivated membership';
  END IF;
  RAISE NOTICE '22 partner management permission, catalogue index, legal review and scoped staff removal assertions passed';
END $$;

\set ON_ERROR_STOP on
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Use isolated fixture'; END IF; END $$;
BEGIN;
DO $$ BEGIN
 IF has_function_privilege('anon','create_staff_support_ticket(uuid,uuid,uuid,text,text)','EXECUTE') OR has_function_privilege('authenticated','create_staff_support_ticket(uuid,uuid,uuid,text,text)','EXECUTE')
 OR has_function_privilege('authenticated','reply_support_ticket(uuid,uuid,uuid,text,text)','EXECUTE') OR has_function_privilege('authenticated','create_customer_ticket(uuid,uuid,uuid,uuid,text,text)','EXECUTE')
 OR has_function_privilege('anon','admin_overview_stats(timestamptz)','EXECUTE') OR has_function_privilege('authenticated','admin_overview_stats(timestamptz)','EXECUTE')
 OR has_function_privilege('authenticated','admin_revenue_trend()','EXECUTE') OR has_function_privilege('authenticated','admin_attention_counts(timestamptz,integer)','EXECUTE') THEN
  RAISE EXCEPTION 'Support/admin RPC exposed to API roles'; END IF;
 IF NOT has_function_privilege('service_role','create_staff_support_ticket(uuid,uuid,uuid,text,text)','EXECUTE')
 OR NOT has_function_privilege('service_role','admin_overview_stats(timestamptz)','EXECUTE')
 OR NOT has_function_privilege('service_role','admin_revenue_trend()','EXECUTE')
 OR NOT has_function_privilege('service_role','admin_attention_counts(timestamptz,integer)','EXECUTE') THEN RAISE EXCEPTION 'API cannot call support/admin RPCs'; END IF;
 IF (SELECT count(*) FROM support_tickets WHERE requester_role<>'customer')<>0 THEN RAISE EXCEPTION 'Existing tickets must stay customer tickets'; END IF;
END $$;

-- Baselines taken before the fixture, so the assertions are deltas.
CREATE TEMP TABLE baseline AS SELECT admin_overview_stats(now()) AS overview, admin_attention_counts(now(),20) AS attention,
 (SELECT coalesce(sum(commission),0) FROM admin_revenue_trend()) AS commission, (SELECT coalesce(sum(platform_fee),0) FROM admin_revenue_trend()) AS fee;

SET LOCAL session_replication_role=replica;
INSERT INTO zones(id,name,slug) VALUES('00000000-0000-4000-8000-0000000118a0','Support zone','support-zone');
INSERT INTO users(id,phone,role,is_approved) VALUES
 ('00000000-0000-4000-8000-0000000118c1','+919999118001','customer',true),
 ('00000000-0000-4000-8000-0000000118d1','+919999118002','store_owner',true),
 ('00000000-0000-4000-8000-0000000118d2','+919999118003','store_owner',true),
 ('00000000-0000-4000-8000-0000000118e1','+919999118004','rider',true),
 ('00000000-0000-4000-8000-0000000118e2','+919999118005','rider',true),
 ('00000000-0000-4000-8000-0000000118aa','+919999118006','admin',true);
INSERT INTO riders(user_id,name,phone,status) VALUES
 ('00000000-0000-4000-8000-0000000118e1','Rider one','+919999118004','online'),
 ('00000000-0000-4000-8000-0000000118e2','Rider two','+919999118005','online');
INSERT INTO stores(id,owner_user_id,zone_id,name,category,district,lat,lng) VALUES
 ('00000000-0000-4000-8000-0000000118f1','00000000-0000-4000-8000-0000000118d1','00000000-0000-4000-8000-0000000118a0','Busy shop','grocery','Test',12.97,77.59),
 ('00000000-0000-4000-8000-0000000118f2','00000000-0000-4000-8000-0000000118d2','00000000-0000-4000-8000-0000000118a0','Quiet shop','grocery','Test',12.98,77.60);
INSERT INTO addresses(id,user_id,line1,zone_id) VALUES('00000000-0000-4000-8000-0000000118b1','00000000-0000-4000-8000-0000000118c1','1 Test Road','00000000-0000-4000-8000-0000000118a0');
-- 1,200 delivered single-store orders: more than one PostgREST page.
INSERT INTO orders(customer_id,store_id,address_id,item_total,delivery_fee,commission_amount,handling_fee,total,payment_method,provider_payment_id,status,rider_id,placed_at,delivered_at)
 SELECT '00000000-0000-4000-8000-0000000118c1','00000000-0000-4000-8000-0000000118f1','00000000-0000-4000-8000-0000000118b1',10,20,2,1,31,'online','pay_support_'||n,'delivered',
  '00000000-0000-4000-8000-0000000118e1',now()-interval '2 days',now()-interval '2 days'+interval '30 minutes'
 FROM generate_series(1,1200) n;
-- A placed order with no rider for an hour: stuck. Its store is store two.
INSERT INTO orders(id,customer_id,store_id,address_id,item_total,delivery_fee,commission_amount,total,payment_method,provider_payment_id,status,placed_at)
 VALUES('00000000-0000-4000-8000-000000011801','00000000-0000-4000-8000-0000000118c1','00000000-0000-4000-8000-0000000118f2','00000000-0000-4000-8000-0000000118b1',10,20,1,30,'online','pay_support_stuck','placed',now()-interval '1 hour');
-- Trip one fully delivered (counts once, with its trip fee); trip two half delivered (does not count yet).
INSERT INTO trips(id,customer_id,address_id,delivery_fee,item_total,total,provider_payment_id,handling_fee) VALUES
 ('00000000-0000-4000-8000-000000011811','00000000-0000-4000-8000-0000000118c1','00000000-0000-4000-8000-0000000118b1',40,20,65,'pay_support_trip1',5),
 ('00000000-0000-4000-8000-000000011812','00000000-0000-4000-8000-0000000118c1','00000000-0000-4000-8000-0000000118b1',40,20,65,'pay_support_trip2',7);
INSERT INTO orders(trip_id,customer_id,store_id,address_id,item_total,delivery_fee,commission_amount,total,payment_method,provider_payment_id,status,rider_id,placed_at,delivered_at)
 SELECT ('00000000-0000-4000-8000-00000001181'||t)::uuid,'00000000-0000-4000-8000-0000000118c1',('00000000-0000-4000-8000-0000000118f'||s)::uuid,'00000000-0000-4000-8000-0000000118b1',
  10,20,3,30,'online','pay_support_trip'||t,CASE WHEN t=2 AND s=2 THEN 'out_for_delivery' ELSE 'delivered' END,'00000000-0000-4000-8000-0000000118e2',
  now()-interval '3 days',CASE WHEN t=2 AND s=2 THEN null ELSE now()-interval '3 days'+interval '40 minutes' END
 FROM generate_series(1,2) t,generate_series(1,2) s;
UPDATE orders SET refund_status='failed' WHERE id=(SELECT id FROM orders WHERE provider_payment_id='pay_support_1');
SET LOCAL session_replication_role=origin;

-- Rider and partner tickets.
DO $$ DECLARE
 rider uuid:='00000000-0000-4000-8000-0000000118e1'; other_rider uuid:='00000000-0000-4000-8000-0000000118e2';
 owner uuid:='00000000-0000-4000-8000-0000000118d1'; other_owner uuid:='00000000-0000-4000-8000-0000000118d2';
 customer uuid:='00000000-0000-4000-8000-0000000118c1'; admin uuid:='00000000-0000-4000-8000-0000000118aa';
 rider_order uuid; t uuid; again uuid; owner_ticket uuid; general uuid; customer_ticket uuid; request uuid:=gen_random_uuid(); m uuid;
BEGIN
 SELECT id INTO rider_order FROM orders WHERE provider_payment_id='pay_support_2';
 t:=create_staff_support_ticket(rider,request,rider_order,'order_issue','Customer was not at the address');
 again:=create_staff_support_ticket(rider,request,rider_order,'order_issue','Customer was not at the address');
 IF t<>again OR (SELECT count(*) FROM support_messages WHERE ticket_id=t)<>1 THEN RAISE EXCEPTION 'Rider replay duplicated'; END IF;
 IF (SELECT requester_role FROM support_tickets WHERE id=t)<>'rider' OR (SELECT actor_role FROM support_messages WHERE ticket_id=t)<>'rider' THEN RAISE EXCEPTION 'Requester role not recorded'; END IF;
 again:=create_staff_support_ticket(rider,gen_random_uuid(),rider_order,'order_issue','Following up on the same delivery');
 IF t<>again OR (SELECT count(*) FROM support_messages WHERE ticket_id=t)<>2 THEN RAISE EXCEPTION 'Active issue not deduplicated'; END IF;
 BEGIN PERFORM create_staff_support_ticket(rider,request,rider_order,'payout','Changed payload for same request'); RAISE EXCEPTION 'Mutated replay allowed'; EXCEPTION WHEN sqlstate 'P0409' THEN NULL; END;
 BEGIN PERFORM create_staff_support_ticket(other_rider,gen_random_uuid(),rider_order,'order_issue','Not my delivery at all'); RAISE EXCEPTION 'Foreign rider order allowed'; EXCEPTION WHEN sqlstate 'P0404' THEN NULL; END;
 BEGIN PERFORM create_staff_support_ticket(customer,gen_random_uuid(),null,'general','Customers use their own flow'); RAISE EXCEPTION 'Customer used staff tickets'; EXCEPTION WHEN sqlstate 'P0403' THEN NULL; END;
 BEGIN PERFORM create_staff_support_ticket(rider,gen_random_uuid(),null,'missing_items','Customer category for a rider'); RAISE EXCEPTION 'Customer category allowed'; EXCEPTION WHEN sqlstate 'P0400' THEN NULL; END;
 owner_ticket:=create_staff_support_ticket(owner,gen_random_uuid(),rider_order,'order_issue','Order shows the wrong items');
 IF (SELECT requester_role FROM support_tickets WHERE id=owner_ticket)<>'store_owner' THEN RAISE EXCEPTION 'Owner role not recorded'; END IF;
 BEGIN PERFORM create_staff_support_ticket(other_owner,gen_random_uuid(),rider_order,'order_issue','Another shop order here'); RAISE EXCEPTION 'Foreign shop order allowed'; EXCEPTION WHEN sqlstate 'P0404' THEN NULL; END;
 general:=create_staff_support_ticket(owner,gen_random_uuid(),null,'payout','My weekly payout is missing');
 IF general=owner_ticket OR (SELECT order_id FROM support_tickets WHERE id=general) IS NOT NULL THEN RAISE EXCEPTION 'Order-less ticket wrong'; END IF;
 -- Replies: own ticket only, never a status from the requester.
 BEGIN PERFORM reply_support_ticket(t,owner,gen_random_uuid(),'Reading a rider ticket'); RAISE EXCEPTION 'Owner read rider ticket'; EXCEPTION WHEN sqlstate 'P0404' THEN NULL; END;
 BEGIN PERFORM reply_support_ticket(t,rider,gen_random_uuid(),'Closing it myself','resolved'); RAISE EXCEPTION 'Rider resolved ticket'; EXCEPTION WHEN sqlstate 'P0403' THEN NULL; END;
 m:=reply_support_ticket(t,admin,gen_random_uuid(),'We have contacted the customer.','resolved');
 IF (SELECT status FROM support_tickets WHERE id=t)<>'resolved' OR (SELECT actor_role FROM support_messages WHERE id=m)<>'admin' THEN RAISE EXCEPTION 'Admin reply not saved'; END IF;
 m:=reply_support_ticket(t,rider,gen_random_uuid(),'It happened again today.');
 IF (SELECT status FROM support_tickets WHERE id=t)<>'open' OR (SELECT actor_role FROM support_messages WHERE id=m)<>'rider' THEN RAISE EXCEPTION 'Rider follow-up did not reopen'; END IF;
 -- The customer flow is unchanged and separate.
 customer_ticket:=create_customer_ticket(customer,gen_random_uuid(),rider_order,null,'missing_items','One item is missing from my order');
 IF (SELECT requester_role FROM support_tickets WHERE id=customer_ticket)<>'customer' THEN RAISE EXCEPTION 'Customer role wrong'; END IF;
 BEGIN PERFORM create_customer_ticket(customer,gen_random_uuid(),null,null,'missing_items','No order for an item issue'); RAISE EXCEPTION 'Customer order rule lost'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  INSERT INTO support_tickets(customer_id,requester_role,request_id,category,initial_message) VALUES(customer,'customer',gen_random_uuid(),'payout','Customer with a partner category');
  RAISE EXCEPTION 'Customer took a partner category';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  INSERT INTO support_tickets(customer_id,requester_role,request_id,trip_id,category,initial_message) VALUES(rider,'rider',gen_random_uuid(),'00000000-0000-4000-8000-000000011811','order_issue','Rider ticket linked to a trip');
  RAISE EXCEPTION 'Staff ticket linked a trip';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $$;

-- Admin aggregates count every row, not the first 1,000.
DO $$ DECLARE b record; o jsonb; a jsonb; top jsonb; commission numeric; fee numeric; BEGIN
 SELECT * INTO b FROM baseline;
 o:=admin_overview_stats(now()); a:=admin_attention_counts(now(),20);
 IF (o->>'weekDelivered')::int-(b.overview->>'weekDelivered')::int<>1203 THEN RAISE EXCEPTION 'Week delivered wrong: %', o; END IF;
 IF (o->>'pendingOrders')::int-(b.overview->>'pendingOrders')::int<>1 THEN RAISE EXCEPTION 'Pending orders wrong: %', o; END IF;
 IF (b.overview->>'weekDelivered')::int=0 AND (o->>'avgDeliveryMinutes')::int NOT BETWEEN 30 AND 31 THEN RAISE EXCEPTION 'Average delivery wrong: %', o->'avgDeliveryMinutes'; END IF;
 top:=o->'topStores'->0;
 IF top->>'storeId'<>'00000000-0000-4000-8000-0000000118f1' OR (top->>'totalOrders')::int<1202 OR top->>'name'<>'Busy shop' THEN RAISE EXCEPTION 'Top store wrong: %', top; END IF;
 IF jsonb_array_length(o->'topStores')>5 THEN RAISE EXCEPTION 'Top stores not capped'; END IF;
 SELECT sum(t.commission), sum(t.platform_fee) INTO commission, fee FROM admin_revenue_trend() t;
 IF commission-b.commission<>2406 OR fee-b.fee<>1205 THEN RAISE EXCEPTION 'Revenue wrong: % %', commission-b.commission, fee-b.fee; END IF;
 IF EXISTS(SELECT 1 FROM admin_revenue_trend() t WHERE extract(isodow FROM t.week_start)<>1) THEN RAISE EXCEPTION 'Weeks must start on Monday'; END IF;
 IF (a->>'stuckOrders')::int-(b.attention->>'stuckOrders')::int<>1 THEN RAISE EXCEPTION 'Stuck orders wrong: %', a; END IF;
 IF (a->>'refundsNeedingAction')::int-(b.attention->>'refundsNeedingAction')::int<>1 THEN RAISE EXCEPTION 'Refunds wrong: %', a; END IF;
 IF (a->>'openSupportTickets')::int-(b.attention->>'openSupportTickets')::int<>4 THEN RAISE EXCEPTION 'Open tickets wrong: %', a; END IF;
 IF (admin_attention_counts(now(),120)->>'stuckOrders')::int<>(b.attention->>'stuckOrders')::int THEN RAISE EXCEPTION 'Stuck threshold ignored'; END IF;
END $$;
ROLLBACK;
SELECT 'Partner/rider tickets, requester roles, admin aggregates and attention counts verified' AS result;

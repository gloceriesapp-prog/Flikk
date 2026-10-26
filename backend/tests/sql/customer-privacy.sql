\set ON_ERROR_STOP on
BEGIN;
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Disposable fixture only'; END IF; END $$;
DO $$ DECLARE ticket uuid:=gen_random_uuid(); cust uuid:='00000000-0000-4000-8000-000000002610'; BEGIN
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='birthday') THEN RAISE EXCEPTION 'Birthday column remains'; END IF;
 INSERT INTO users(id,phone,role) VALUES(cust,'privacy-fixture','customer');
 BEGIN PERFORM create_customer_ticket(cust,gen_random_uuid(),null,null,'general','No new customer chat'); RAISE EXCEPTION 'RPC still enabled'; EXCEPTION WHEN sqlstate 'P0410' THEN NULL; END;
 BEGIN INSERT INTO support_tickets(id,customer_id,request_id,requester_role,category,initial_message) VALUES(ticket,cust,gen_random_uuid(),'customer','general','Direct insert bypass'); RAISE EXCEPTION 'Ticket guard bypass'; EXCEPTION WHEN sqlstate 'P0410' THEN NULL; END;
 -- Simulate a retained historical ticket without deleting any real records.
 ALTER TABLE support_tickets DISABLE TRIGGER customer_support_email_only;
 INSERT INTO support_tickets(id,customer_id,request_id,requester_role,category,initial_message) VALUES(ticket,cust,gen_random_uuid(),'customer','general','Historical record');
 ALTER TABLE support_tickets ENABLE TRIGGER customer_support_email_only;
 BEGIN INSERT INTO support_messages(ticket_id,actor_id,actor_role,request_id,body,status_after) VALUES(ticket,cust,'customer',gen_random_uuid(),'Follow-up bypass','open'); RAISE EXCEPTION 'Message guard bypass'; EXCEPTION WHEN sqlstate 'P0410' THEN NULL; END;
 IF NOT EXISTS(SELECT 1 FROM support_tickets WHERE id=ticket AND initial_message='Historical record') THEN RAISE EXCEPTION 'Historical support was deleted'; END IF;
 IF has_function_privilege('anon','guard_email_only_customer_support()','EXECUTE') OR has_function_privilege('authenticated','guard_email_only_customer_support()','EXECUTE') THEN RAISE EXCEPTION 'Guard exposed to API roles'; END IF;
END $$;
ROLLBACK;
SELECT 'Customer birthday removal and email-only support verified' AS result;

begin;
do $$
declare u uuid:=gen_random_uuid();other_u uuid:=gen_random_uuid();school uuid:=gen_random_uuid();tx uuid:=gen_random_uuid();blocked boolean;
begin
 insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) select x,'authenticated','authenticated','email-fixture-'||x||'@example.invalid','{}','{"first_name":"Email","middle_name":"Test","last_name":"Fixture"}',now(),now() from unnest(array[u,other_u])x;
 insert into public.datasub_transactions(id,user_id,reference,service_type,provider,recipient,amount,status,routing_state) values(tx,u,'email-fixture-'||tx,'data','fixture','08000000000',100,'failed','REFUNDED');
 if not exists(select 1 from public.ihlink_email_queue where source='datasub_transactions' and source_id=tx::text and user_id=u and status='queued')then raise exception 'Purchase email not queued';end if;
 update public.datasub_transactions set status='failed' where id=tx;
 if (select count(*) from public.ihlink_email_queue where source_id=tx::text)<>1 then raise exception 'Purchase email duplicated';end if;
 perform set_config('request.jwt.claim.sub',u::text,true);execute 'set local role authenticated';
 if not exists(select 1 from public.ihlink_email_queue where source_id=tx::text) then raise exception 'Recipient queue unavailable';end if;
 blocked:=false;begin perform public.claim_ihlink_emails();exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Customer claimed private email delivery jobs';end if;
 perform set_config('request.jwt.claim.sub',other_u::text,true);
 if exists(select 1 from public.ihlink_email_queue where source_id=tx::text)then raise exception 'Another account read email history';end if;
 execute 'reset role';
end $$;
rollback;

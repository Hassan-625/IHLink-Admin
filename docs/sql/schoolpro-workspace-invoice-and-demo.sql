do $fix$ declare d text; begin
select pg_get_functiondef('private.create_default_school_assessment_scheme()'::regprocedure) into d;
d:=replace(d,'begin','begin
 if not private.schoolpro_operationally_active(new.id) or exists(select 1 from public.schoolpro_assessment_schemes where school_id=new.id) then return new;end if;');
execute d;
end $fix$;
create trigger initialize_assessments_after_activation after update of status on public.schoolpro_schools for each row when (new.status='active') execute function private.create_default_school_assessment_scheme();
create or replace function public.create_schoolpro_workspace(p_request uuid,p_tier text default 'starter') returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.schoolpro_onboarding_requests;c public.schoolpro_subscription_catalog;i public.schoolpro_subscription_intents;sid uuid;owner_email text;begin
 if auth.uid() is null or not private.is_active_account() then raise exception 'Active account required';end if;
 select * into r from public.schoolpro_onboarding_requests where id=p_request for update;
 if r.id is null or r.user_id is null then raise exception 'Verified school owner required';end if;
 if auth.uid()<>r.user_id and not coalesce(private.has_product_access('schoolpro','approve'),false) then raise exception 'School owner or authorized administrator required';end if;
 if r.status in('rejected','active') then raise exception 'This request cannot create a pending workspace';end if;
 select email into owner_email from auth.users where id=r.user_id and email_confirmed_at is not null;
 if owner_email is null or not exists(select 1 from public.profiles where id=r.user_id and status='active') then raise exception 'Owner must verify their account first';end if;
 if not exists(select 1 from public.profiles where id=r.user_id and role='super_admin') and (exists(select 1 from public.schoolpro_members where user_id=r.user_id and role<>'proprietor') or exists(select 1 from public.schoolpro_students where user_id=r.user_id) or exists(select 1 from public.schoolpro_guardian_links where guardian_user_id=r.user_id and status='active')) then raise exception 'Invited accounts cannot create an owner workspace';end if;
 select * into c from public.schoolpro_subscription_catalog where code=p_tier and active and annual_price>0;
 if c.id is null then raise exception 'Published school plan required';end if;
 sid:=r.school_id;
 if sid is null then
  insert into public.schoolpro_schools(owner_id,name,code,plan,status) values(r.user_id,trim(r.school_name),'SP-'||upper(left(replace(r.id::text,'-',''),12)),'trial','trial') returning id into sid;
  insert into public.schoolpro_members(school_id,user_id,role) values(sid,r.user_id,'proprietor') on conflict(school_id,user_id) do nothing;
 elsif not exists(select 1 from public.schoolpro_schools where id=sid and owner_id=r.user_id) then raise exception 'Workspace owner mismatch';end if;
 select * into i from public.schoolpro_subscription_intents where school_id=sid and status='pending' order by created_at limit 1 for update;
 if i.id is null then
  insert into public.schoolpro_subscription_intents(school_id,payer_user_id,catalog_id,billing_cycle,amount,reference,status,payment_method) values(sid,r.user_id,c.id,'annual',c.annual_price,'SCHSUB-'||upper(replace(gen_random_uuid()::text,'-','')),'pending','bank_transfer') returning * into i;
  insert into public.schoolpro_email_queue(school_id,recipient_email,recipient_name,template_key,subject,payload) values(sid,owner_email,r.contact_name,'workspace_subscription_invoice','Your SchoolPro workspace and subscription invoice',jsonb_build_object('message','Your school workspace is ready for setup. Invoice '||i.reference||' is for the '||c.name||' annual subscription, NGN '||i.amount||'. Sign in to view the invoice, receiving bank accounts and submit payment proof: https://ihlink-schoolpro.onrender.com/schoolpro/subscription?school_id='||sid::text,'invoice_id',i.id,'action_url','https://ihlink-schoolpro.onrender.com/schoolpro/subscription?school_id='||sid::text));
 elsif i.catalog_id<>c.id then raise exception 'Existing invoice must be reviewed before changing plan';end if;
 update public.schoolpro_onboarding_requests set school_id=sid,status='provisioning',updated_at=now() where id=r.id;
 insert into public.audit_logs(actor_id,action,product,target_type,target_id,metadata) values(auth.uid(),'schoolpro_workspace_invoice_created','schoolpro','schoolpro_onboarding_request',r.id::text,jsonb_build_object('school_id',sid,'invoice_id',i.id,'activation',false));
 return jsonb_build_object('school_id',sid,'invoice_id',i.id,'reference',i.reference,'amount',i.amount,'status','pending','owner_email',owner_email);
end $$;
revoke all on function public.create_schoolpro_workspace(uuid,text) from public,anon;
grant execute on function public.create_schoolpro_workspace(uuid,text) to authenticated;

create or replace function public.activate_schoolpro_demo(p_school uuid,p_tier text,p_days integer,p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;begin
 if auth.uid() is null or not private.is_active_account() or not coalesce(private.has_product_access('schoolpro','approve'),false) then raise exception 'Authorized school administrator required';end if;
 if p_days is null or p_days<1 or p_days>30 then raise exception 'Demo must last between 1 and 30 days';end if;
 perform 1 from public.schoolpro_schools where id=p_school for update;
 if not found then raise exception 'School unavailable';end if;
 if exists(select 1 from public.schoolpro_subscriptions where school_id=p_school and status='active' and amount>0 and renews_at>now()) then raise exception 'Paid subscription cannot be replaced by a demo';end if;
 result:=public.control_center_activate_schoolpro(p_school,p_tier,p_reason);
 update public.schoolpro_subscriptions set amount=0,renews_at=now()+make_interval(days=>p_days) where school_id=p_school;
 update public.schoolpro_onboarding_requests set status='active',updated_at=now() where school_id=p_school;
 insert into public.audit_logs(actor_id,action,product,target_type,target_id,metadata) values(auth.uid(),'schoolpro_demo_activated','schoolpro','schoolpro_school',p_school::text,jsonb_build_object('days',p_days,'reason',p_reason,'payment_recorded',false));
 return result||jsonb_build_object('source','admin_demo','renews_at',now()+make_interval(days=>p_days));
end $$;
revoke all on function public.activate_schoolpro_demo(uuid,text,integer,text) from public,anon;
grant execute on function public.activate_schoolpro_demo(uuid,text,integer,text) to authenticated;

create or replace function private.sync_school_request_activation() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if new.status='active' and private.schoolpro_operationally_active(new.id) then update public.schoolpro_onboarding_requests set status='active',updated_at=now() where school_id=new.id and status<>'active';end if;return new;end $$;
create trigger sync_school_request_activation after update of status on public.schoolpro_schools for each row execute function private.sync_school_request_activation();

do $fix$ declare d text;begin select pg_get_functiondef('private.review_school_subscription_transfer(uuid,text,text)'::regprocedure) into d;d:=replace(d,'s.status=''active'' and s.renews_at>now()','s.status=''active'' and s.amount>0 and s.renews_at>now()');execute d;end $fix$;
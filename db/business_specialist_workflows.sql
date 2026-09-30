-- Shared standalone Business Centre workflows. Existing records are preserved.
create or replace function private.business_staff_allowed(target_unit text, action text default 'view')
returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.profiles p where p.id=auth.uid() and p.status='active' and
 (p.role='super_admin' or (p.role in ('platform_admin','support','finance') and exists(
 select 1 from public.admin_product_access a where a.user_id=p.id and a.product in (target_unit,'business_centre')
 and case action when 'edit' then a.can_edit or a.can_manage when 'approve' then a.can_approve or a.can_manage
 when 'delete' then a.can_delete or a.can_manage else a.can_view end))));
$$;
revoke all on function private.business_staff_allowed(text,text) from public,anon;
grant execute on function private.business_staff_allowed(text,text) to authenticated;

alter table public.business_orders add column if not exists specifications jsonb not null default '{}';
alter table public.business_files add column if not exists storage_path text;

-- Split broad ALL policies by action and use the actual division of each record.
do $$ declare t text; p record; predicate text; begin
 foreach t in array array['business_orders','business_files','business_quotes','business_invoices','business_production_jobs','fabrication_jobs','compute_jobs','business_notifications','business_support_tickets','academy_courses','academy_enrollments','academy_sessions'] loop
  for p in select policyname from pg_policies where schemaname='public' and tablename=t and policyname like 'Business admins manage%' loop
   execute format('drop policy %I on public.%I',p.policyname,t);
  end loop;
  predicate:=case when t in ('business_orders','business_notifications','business_support_tickets') then 'private.business_staff_allowed(unit_code, %L)'
   when t like 'academy_%' then 'private.business_staff_allowed(''academy'', %L)'
   else format('exists(select 1 from public.business_orders o where o.id=%I.order_id and private.business_staff_allowed(o.unit_code, %%L))',t) end;
  execute format('create policy specialist_staff_read on public.%I for select to authenticated using (%s)',t,format(predicate,'view'));
  execute format('create policy specialist_staff_insert on public.%I for insert to authenticated with check (%s)',t,format(predicate,'edit'));
  execute format('create policy specialist_staff_update on public.%I for update to authenticated using (%s) with check (%s)',t,format(predicate,'edit'),format(predicate,'edit'));
  execute format('create policy specialist_staff_delete on public.%I for delete to authenticated using (%s)',t,format(predicate,'delete'));
 end loop;
end $$;

drop policy "Customers own enrollments" on public.academy_enrollments;
create policy academy_customer_read on public.academy_enrollments for select to authenticated using (user_id=auth.uid());
create policy academy_customer_apply on public.academy_enrollments for insert to authenticated with check (
 user_id=auth.uid() and status='applied' and progress=0 and completed_at is null
 and exists(select 1 from public.profiles p where p.id=auth.uid() and p.status='active')
 and exists(select 1 from public.customer_service_access a where a.user_id=auth.uid() and a.product='academy' and a.status='active')
 and exists(select 1 from public.academy_courses c where c.id=course_id and c.is_active));

drop policy "Customers own business files" on public.business_files;
create policy business_customer_file_read on public.business_files for select to authenticated using (
 user_id=auth.uid() and exists(select 1 from public.business_orders o where o.id=order_id and o.user_id=auth.uid()));
create policy business_customer_file_insert on public.business_files for insert to authenticated with check (
 user_id=auth.uid() and storage_path is not null and file_url=storage_path
 and split_part(storage_path,'/',1)=auth.uid()::text and split_part(storage_path,'/',2)=order_id::text
 and exists(select 1 from public.business_orders o where o.id=order_id and o.user_id=auth.uid() and o.status in ('submitted','reviewing'))
 and exists(select 1 from storage.objects s where s.bucket_id='business-files' and s.name=storage_path));
drop policy "Customers own business support" on public.business_support_tickets;
create policy business_customer_support_read on public.business_support_tickets for select to authenticated using(user_id=auth.uid());
create policy business_customer_support_insert on public.business_support_tickets for insert to authenticated with check(
 user_id=auth.uid() and status='open' and admin_response is null and unit_code in ('fabrication','compute','academy','digital_business')
 and exists(select 1 from public.customer_service_access a where a.user_id=auth.uid() and a.product=unit_code and a.status='active')
 and exists(select 1 from public.profiles p where p.id=auth.uid() and p.status='active'));
grant update(read_at) on public.business_notifications to authenticated;
create policy business_customer_mark_read on public.business_notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
-- Column grants alone do not narrow pre-existing grants; protect the acknowledgement with a trigger.
create or replace function private.business_notification_update_guard() returns trigger
language plpgsql security invoker set search_path='' as $$ begin
 if current_user='authenticated' and not private.business_staff_allowed(old.unit_code,'edit')
 and (to_jsonb(new)-'read_at') is distinct from (to_jsonb(old)-'read_at') then raise exception 'Only read acknowledgement may be changed'; end if;
 return new; end $$;
create trigger business_notification_update_guard before update on public.business_notifications for each row execute function private.business_notification_update_guard();

create policy customer_fabrication_request on public.fabrication_jobs for insert to authenticated with check(
 status='review' and design_file_url is null and machine_notes is null and exists(select 1 from public.business_orders o where o.id=order_id and o.user_id=auth.uid() and o.unit_code='fabrication' and o.status='submitted'));
create policy customer_compute_request on public.compute_jobs for insert to authenticated with check(
 status='review' and (estimated_hours is null or estimated_hours>0) and exists(select 1 from public.business_orders o where o.id=order_id and o.user_id=auth.uid() and o.unit_code='compute' and o.status='submitted'));

create or replace function public.submit_business_request(target_unit text, request_title text, request_requirements text, request_quantity integer, request_specs jsonb default '{}', catalog_service uuid default null)
returns uuid language plpgsql security invoker set search_path='' as $$ declare request_id uuid; begin
 if auth.uid() is null or target_unit not in ('fabrication','compute','digital_business') or length(trim(request_title))<3
 or length(trim(request_requirements))<10 or request_quantity<1 or request_quantity>100000 or jsonb_typeof(request_specs)<>'object'
 or octet_length(request_specs::text)>16000 then raise exception 'Invalid service request'; end if;
 insert into public.business_orders(user_id,unit_code,service_id,title,requirements,quantity,specifications)
 values(auth.uid(),target_unit,catalog_service,trim(request_title),trim(request_requirements),request_quantity,request_specs) returning id into request_id;
 if target_unit='fabrication' then
  insert into public.fabrication_jobs(order_id,process,material,dimensions,status) values(request_id,coalesce(nullif(request_specs->>'process',''),'FDM'),request_specs->>'material',request_specs->>'dimensions','review');
 elsif target_unit='compute' then
  insert into public.compute_jobs(order_id,workload_type,compute_profile,dataset_notes,estimated_hours,status)
  values(request_id,coalesce(nullif(request_specs->>'workload_type',''),'Project compute'),request_specs->>'compute_profile',request_specs->>'dataset_notes',nullif(request_specs->>'estimated_hours','')::numeric,'review');
 end if; return request_id; end $$;
revoke all on function public.submit_business_request(text,text,text,integer,jsonb,uuid) from public,anon;
grant execute on function public.submit_business_request(text,text,text,integer,jsonb,uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit) values('business-files','business-files',false,20971520) on conflict(id) do nothing;
create policy business_private_upload on storage.objects for insert to authenticated with check (
 bucket_id='business-files' and (storage.foldername(name))[1]=auth.uid()::text
 and lower(storage.extension(name)) in ('stl','obj','step','stp','pdf','doc','docx','xls','xlsx','png','jpg','jpeg','txt','csv','zip')
 and exists(select 1 from public.business_orders o where o.id::text=(storage.foldername(name))[2] and o.user_id=auth.uid() and o.status in ('submitted','reviewing')));
create policy business_private_read on storage.objects for select to authenticated using (
 bucket_id='business-files' and exists(select 1 from public.business_orders o where o.id::text=(storage.foldername(name))[2]
 and (o.user_id=auth.uid() or private.business_staff_allowed(o.unit_code,'view'))));
create policy business_private_cleanup on storage.objects for delete to authenticated using (
 bucket_id='business-files' and (storage.foldername(name))[1]=auth.uid()::text
 and exists(select 1 from public.business_orders o where o.id::text=(storage.foldername(name))[2] and o.user_id=auth.uid() and o.status in ('submitted','reviewing')));

create table public.compute_usage_records(
 id uuid primary key default gen_random_uuid(),order_id uuid not null references public.business_orders(id) on delete cascade,
 equipment_id uuid references public.equipment(id),started_at timestamptz,ended_at timestamptz,
 hours numeric not null check(hours>=0),credits_used numeric not null default 0 check(credits_used>=0),notes text,created_at timestamptz not null default now(),
 check(ended_at is null or started_at is null or ended_at>=started_at));
alter table public.compute_usage_records enable row level security;
grant select,insert,update,delete on public.compute_usage_records to authenticated;
create policy compute_usage_owner_read on public.compute_usage_records for select to authenticated using(exists(select 1 from public.business_orders o where o.id=order_id and o.user_id=auth.uid() and o.unit_code='compute'));
create policy compute_usage_staff_read on public.compute_usage_records for select to authenticated using(private.business_staff_allowed('compute','view'));
create policy compute_usage_staff_edit on public.compute_usage_records for all to authenticated using(private.business_staff_allowed('compute','edit') and exists(select 1 from public.business_orders o where o.id=order_id and o.unit_code='compute')) with check(private.business_staff_allowed('compute','edit') and exists(select 1 from public.business_orders o where o.id=order_id and o.unit_code='compute'));

create table public.academy_attendance(
 id uuid primary key default gen_random_uuid(),enrollment_id uuid not null references public.academy_enrollments(id) on delete cascade,
 session_id uuid not null references public.academy_sessions(id) on delete cascade,status text not null check(status in ('present','absent','excused')),
 notes text,recorded_at timestamptz not null default now(),unique(enrollment_id,session_id));
create table public.academy_resources(
 id uuid primary key default gen_random_uuid(),course_id uuid not null references public.academy_courses(id) on delete cascade,
 title text not null,resource_url text not null check(resource_url ~ '^https://'),resource_type text not null default 'resource' check(resource_type in ('resource','assignment')),
 due_at timestamptz,created_at timestamptz not null default now());
create table public.academy_certificates(
 id uuid primary key default gen_random_uuid(),enrollment_id uuid not null unique references public.academy_enrollments(id),
 certificate_code uuid not null unique default gen_random_uuid(),issued_at timestamptz not null default now(),status text not null default 'issued' check(status in ('issued','revoked')));
create table public.academy_certificate_registry(
 certificate_code uuid primary key,course_title text not null,issued_at timestamptz not null,status text not null check(status in ('issued','revoked')));
alter table public.academy_attendance enable row level security;
alter table public.academy_resources enable row level security;
alter table public.academy_certificates enable row level security;
alter table public.academy_certificate_registry enable row level security;
grant select,insert,update,delete on public.academy_attendance,public.academy_resources,public.academy_certificates to authenticated;
grant select on public.academy_certificate_registry to anon,authenticated;
create policy certificate_public_verification on public.academy_certificate_registry for select to anon,authenticated using(true);
do $$ declare t text; begin foreach t in array array['academy_attendance','academy_resources','academy_certificates'] loop
 execute format('create policy academy_staff_read on public.%I for select to authenticated using(private.business_staff_allowed(''academy'',''view''))',t);
 execute format('create policy academy_staff_insert on public.%I for insert to authenticated with check(private.business_staff_allowed(''academy'',''edit''))',t);
 execute format('create policy academy_staff_update on public.%I for update to authenticated using(private.business_staff_allowed(''academy'',''edit'')) with check(private.business_staff_allowed(''academy'',''edit''))',t);
 execute format('create policy academy_staff_delete on public.%I for delete to authenticated using(private.business_staff_allowed(''academy'',''delete''))',t);
 end loop; end $$;
create policy academy_attendance_owner_read on public.academy_attendance for select to authenticated using(exists(select 1 from public.academy_enrollments e where e.id=enrollment_id and e.user_id=auth.uid()));
create policy academy_resources_owner_read on public.academy_resources for select to authenticated using(exists(select 1 from public.academy_enrollments e where e.course_id=academy_resources.course_id and e.user_id=auth.uid() and e.status in ('enrolled','active','completed')));
create policy academy_certificate_owner_read on public.academy_certificates for select to authenticated using(exists(select 1 from public.academy_enrollments e where e.id=enrollment_id and e.user_id=auth.uid()));

-- Internal publication trigger is the only writer to the public, non-personal registry.
create or replace function private.publish_academy_certificate() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if tg_op='DELETE' then update public.academy_certificate_registry set status='revoked' where certificate_code=old.certificate_code; return old; end if;
 if not exists(select 1 from public.academy_enrollments e where e.id=new.enrollment_id and e.status='completed' and e.progress=100 and e.completed_at is not null) then raise exception 'Verified course completion is required'; end if;
 insert into public.academy_certificate_registry(certificate_code,course_title,issued_at,status)
 select new.certificate_code,c.title,new.issued_at,new.status from public.academy_enrollments e join public.academy_courses c on c.id=e.course_id where e.id=new.enrollment_id
 on conflict(certificate_code) do update set status=excluded.status,course_title=excluded.course_title;
 return new; end $$;
revoke all on function private.publish_academy_certificate() from public,anon,authenticated;
create trigger publish_academy_certificate after insert or update or delete on public.academy_certificates for each row execute function private.publish_academy_certificate();

create or replace function private.academy_attendance_course_guard() returns trigger language plpgsql security invoker set search_path='' as $$ begin
 if not exists(select 1 from public.academy_enrollments e join public.academy_sessions s on s.course_id=e.course_id where e.id=new.enrollment_id and s.id=new.session_id) then raise exception 'Attendance must match the enrolled course'; end if; return new; end $$;
create trigger academy_attendance_course_guard before insert or update on public.academy_attendance for each row execute function private.academy_attendance_course_guard();

-- Gateway settlement owns payment writes; division staff can inspect the ledger.
drop policy "Business admins manage business_payments" on public.business_payments;
create policy business_payment_staff_read on public.business_payments for select to authenticated using(
 exists(select 1 from public.business_invoices i join public.business_orders o on o.id=i.order_id where i.id=invoice_id and private.business_staff_allowed(o.unit_code,'view')));
create or replace function private.business_invoice_settlement_guard() returns trigger language plpgsql security invoker set search_path='' as $$ begin
 if current_user='authenticated' and new.status='paid' and (tg_op='INSERT' or old.status is distinct from 'paid') then raise exception 'Verified gateway settlement is required to mark an invoice paid'; end if; return new; end $$;
create trigger business_invoice_settlement_guard before insert or update on public.business_invoices for each row execute function private.business_invoice_settlement_guard();

do $$ declare t text; begin foreach t in array array['business_orders','business_files','business_quotes','business_invoices','business_payments','business_production_jobs','fabrication_jobs','compute_jobs','business_notifications','business_support_tickets','academy_enrollments','academy_sessions','academy_attendance','academy_resources','academy_certificates','compute_usage_records'] loop
 execute format('create policy specialist_active_account on public.%I as restrictive for all to authenticated using(exists(select 1 from public.profiles p where p.id=auth.uid() and p.status=''active'')) with check(exists(select 1 from public.profiles p where p.id=auth.uid() and p.status=''active''))',t);
 end loop; end $$;

insert into public.print_products(name,category,description,base_price,active)
select 'Awards, Trophies & Plaques','Awards & Recognition','Custom awards, trophies and recognition plaques. Confirm material, dimensions, engraving, recipient names, artwork and deadline before quotation.',0,true
where not exists(select 1 from public.print_products where name='Awards, Trophies & Plaques');

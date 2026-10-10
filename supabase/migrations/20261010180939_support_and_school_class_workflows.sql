-- Tickets are stored once and delivered by the shared provider-configured queue.
create or replace function private.queue_ihlink_support_email() returns trigger language plpgsql security definer set search_path='' as $$
declare j jsonb:=to_jsonb(new); p text; sender public.profiles; ref text;
begin
 select * into sender from public.profiles where id=(j->>'user_id')::uuid;
 if sender.id is null then return new;end if;
 p:=case tg_table_name when 'support_tickets' then j->>'product' when 'business_support_tickets' then j->>'unit_code' when 'engineering_support_tickets' then 'engineering' when 'host_support_tickets' then 'host' else 'print' end;
 ref:=coalesce(j->>'ticket_number',new.id::text);
 insert into public.ihlink_email_queue(user_id,product,recipient_email,recipient_name,subject,message,source,source_id,action_url)
 values(sender.id,p,'hassanisahassan12@gmail.com','IHLink Support',left('Support ['||p||'] '||ref||': '||new.subject,200),
 'From: '||concat_ws(' ',sender.first_name,sender.last_name)||E'\nEmail: '||coalesce(sender.email,'')||E'\nReference: '||ref||E'\n\n'||new.message,tg_table_name,new.id::text,'https://ihlink-admin.onrender.com/admin/support')
 on conflict(source,source_id) do nothing;
 return new;
end $$;
revoke all on function private.queue_ihlink_support_email() from public,anon,authenticated;
do $$declare t text;begin foreach t in array array['support_tickets','business_support_tickets','engineering_support_tickets','host_support_tickets','print_support_tickets'] loop execute format('create trigger ihlink_support_email after insert on public.%I for each row execute function private.queue_ihlink_support_email()',t);end loop;end$$;

-- Keep the existing class/session permission check authoritative.
create or replace function public.schoolpro_class_broadsheet(p_school uuid,p_class uuid,p_term text,p_session text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare summary jsonb; subjects jsonb;
begin
 select coalesce(jsonb_agg(to_jsonb(b)||jsonb_build_object('scores',coalesce((select jsonb_object_agg(r.subject_id::text,r.total_score) from public.schoolpro_results r where r.school_id=p_school and r.student_id=b.student_id and r.term=trim(p_term) and r.session=trim(p_session) and r.status='published'),'{}'::jsonb)) order by b.class_position,b.student_name),'[]'::jsonb)
 into summary from public.schoolpro_broadsheet(p_school,p_class,p_term,p_session) b;
 select coalesce(jsonb_agg(to_jsonb(q) order by q.name),'[]'::jsonb) into subjects from (
 select distinct su.id,su.name,su.code from public.schoolpro_subjects su join public.schoolpro_results r on r.subject_id=su.id and r.school_id=su.school_id join public.schoolpro_students s on s.id=r.student_id and s.school_id=r.school_id
 where s.school_id=p_school and s.class_id=p_class and r.term=trim(p_term) and r.session=trim(p_session) and r.status='published')q;
 return jsonb_build_object('rows',summary,'subjects',subjects);
end $$;
revoke all on function public.schoolpro_class_broadsheet(uuid,uuid,text,text) from public,anon;
grant execute on function public.schoolpro_class_broadsheet(uuid,uuid,text,text) to authenticated;

-- Edit only unpaid school-owned invoices. Preserve receipts, pending payment instructions and the audit trail.
create or replace function public.edit_schoolpro_fee_invoice(p_invoice uuid,p_title text,p_amount numeric,p_due date,p_notes text) returns uuid language plpgsql security definer set search_path='' as $$
declare inv public.schoolpro_invoices;
begin
 select * into inv from public.schoolpro_invoices where id=p_invoice for update;
 if auth.uid() is null or inv.id is null or not coalesce(private.schoolpro_module_allowed(inv.school_id,'finance'),false) or not coalesce(private.has_school_access(inv.school_id,array['proprietor','administrator','accountant','bursar']::public.school_member_role[]),false) then raise exception 'School finance permission required';end if;
 if inv.status<>'unpaid' or inv.amount_paid<>0 then raise exception 'Only unpaid invoices without recorded payments can be edited';end if;
 if nullif(trim(p_title),'') is null or length(p_title)>200 or p_amount is null or p_amount<0 or p_amount<>round(p_amount,2) or p_amount::text in ('NaN','Infinity','-Infinity') then raise exception 'Enter an invoice title and a valid amount with up to two decimal places';end if;
 if exists(select 1 from public.schoolpro_payment_intents where invoice_id=inv.id and status='pending') or exists(select 1 from public.schoolpro_payment_allocations a join public.schoolpro_payment_submissions s on s.id=a.submission_id where a.invoice_id=inv.id and s.status='pending') then raise exception 'Review the pending payment before changing this invoice';end if;
 update public.schoolpro_invoices set title=trim(p_title),amount_due=p_amount,gross_amount=p_amount+coalesce(discount,0)+coalesce(scholarship,0)+coalesce(waiver_amount,0),due_date=p_due,notes=left(p_notes,2000),updated_at=now() where id=inv.id;
 insert into public.audit_logs(actor_id,action,product,target_type,target_id,metadata) values(auth.uid(),'School fee invoice edited','schoolpro','invoice',inv.id::text,jsonb_build_object('school_id',inv.school_id,'previous_amount',inv.amount_due,'new_amount',p_amount,'previous_title',inv.title,'new_title',trim(p_title)));
 return inv.id;
end $$;
revoke all on function public.edit_schoolpro_fee_invoice(uuid,text,numeric,date,text) from public,anon;
grant execute on function public.edit_schoolpro_fee_invoice(uuid,text,numeric,date,text) to authenticated;
create or replace function public.create_schoolpro_fee_bundle(p_school uuid,p_name text,p_classes text[],p_term text,p_session text,p_due date,p_items jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare item jsonb; target text; fee_id uuid; amount numeric; total numeric:=0; ids jsonb:='[]'::jsonb;
begin
 if auth.uid() is null or not coalesce(private.schoolpro_module_allowed(p_school,'finance'),false) or not coalesce(private.has_school_access(p_school,array['proprietor','administrator','accountant','bursar']::public.school_member_role[]),false) then raise exception 'School finance permission required';end if;
 if nullif(trim(p_name),'') is null or length(p_name)>200 or nullif(trim(p_term),'') is null or nullif(trim(p_session),'') is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 100 then raise exception 'Enter a fee name, academic period and at least one charge';end if;
 for item in select value from jsonb_array_elements(p_items) loop
  amount:=(item->>'amount')::numeric;
  if nullif(trim(item->>'label'),'') is null or length(item->>'label')>200 or amount is null or amount<0 or amount<>round(amount,2) or amount::text in ('NaN','Infinity','-Infinity') then raise exception 'Every charge needs a name and a valid amount';end if;
  total:=total+amount;
 end loop;
 if p_classes is not null and cardinality(p_classes)=0 then raise exception 'Select a class in this section';end if;
 foreach target in array coalesce(p_classes,array[null::text]) loop
  if target is not null and not exists(select 1 from public.schoolpro_classes where school_id=p_school and concat_ws(' ',name,nullif(arm,''))=target) then raise exception 'Choose a class in this school';end if;
  insert into public.schoolpro_fee_structures(school_id,name,class_name,term,session,amount,due_date,created_by) values(p_school,trim(p_name),target,trim(p_term),trim(p_session),total,p_due,auth.uid()) returning id into fee_id;
  insert into public.schoolpro_fee_items(fee_structure_id,label,amount,category,sort_order)
  select fee_id,trim(value->>'label'),(value->>'amount')::numeric,case when value->>'category' in ('fee','levy','books','transport','hostel','uniform','other') then value->>'category' else 'other' end,ordinality::integer-1 from jsonb_array_elements(p_items) with ordinality;
  ids:=ids||jsonb_build_array(fee_id);
 end loop;
 return jsonb_build_object('structures',ids,'total',total);
end $$;
revoke all on function public.create_schoolpro_fee_bundle(uuid,text,text[],text,text,date,jsonb) from public,anon;
grant execute on function public.create_schoolpro_fee_bundle(uuid,text,text[],text,text,date,jsonb) to authenticated;
create or replace function public.publish_schoolpro_class_results(p_school uuid,p_class uuid,p_term text,p_session text) returns integer language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 if auth.uid() is null or not coalesce(private.schoolpro_module_allowed(p_school,'results'),false) or not(public.schoolpro_member_can_manage(p_school) or exists(select 1 from public.schoolpro_members m where m.school_id=p_school and m.user_id=auth.uid() and m.role::text in ('exam_officer','head_teacher','vice_principal'))) then raise exception 'Result publication permission required';end if;
 if not exists(select 1 from public.schoolpro_classes where id=p_class and school_id=p_school) then raise exception 'Select a class in this school';end if;
 update public.schoolpro_results r set status='published',published_at=now(),locked=true where r.school_id=p_school and r.term=trim(p_term) and r.session=trim(p_session) and r.status='approved' and not r.locked and exists(select 1 from public.schoolpro_students s where s.id=r.student_id and s.school_id=p_school and s.class_id=p_class and s.status='active');
 get diagnostics n=row_count;
 insert into public.audit_logs(actor_id,action,product,target_type,target_id,metadata)values(auth.uid(),'Class results published','schoolpro','class',p_class::text,jsonb_build_object('school_id',p_school,'term',p_term,'session',p_session,'published',n));
 return n;
end $$;
revoke all on function public.publish_schoolpro_class_results(uuid,uuid,text,text) from public,anon;
grant execute on function public.publish_schoolpro_class_results(uuid,uuid,text,text) to authenticated;

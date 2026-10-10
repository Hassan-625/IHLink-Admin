create or replace function public.edit_schoolpro_fee_bundle(p_structure uuid,p_name text,p_due date,p_items jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare f public.schoolpro_fee_structures; item jsonb; amount numeric; total numeric:=0;
begin
 select * into f from public.schoolpro_fee_structures where id=p_structure for update;
 if f.id is null or auth.uid() is null or not coalesce(private.schoolpro_module_allowed(f.school_id,'finance'),false) or not coalesce(private.has_school_access(f.school_id,array['proprietor','administrator','accountant','bursar']::public.school_member_role[]),false) then raise exception 'School finance permission required';end if;
 if nullif(trim(p_name),'') is null or length(p_name)>200 or jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 100 then raise exception 'Enter a fee name and at least one charge';end if;
 for item in select value from jsonb_array_elements(p_items) loop
  amount:=(item->>'amount')::numeric;
  if nullif(trim(item->>'label'),'') is null or length(item->>'label')>200 or amount is null or amount<0 or amount<>round(amount,2) or amount::text in ('NaN','Infinity','-Infinity') then raise exception 'Every charge needs a name and a valid amount';end if;
  if not coalesce((item->>'is_optional')::boolean,false) then total:=total+amount;end if;
 end loop;
 if exists(select 1 from public.schoolpro_invoices i where i.fee_structure_id=f.id and i.amount_paid=0 and (exists(select 1 from public.schoolpro_payment_intents p where p.invoice_id=i.id and p.status='pending') or exists(select 1 from public.schoolpro_payment_allocations a join public.schoolpro_payment_submissions s on s.id=a.submission_id where a.invoice_id=i.id and s.status='pending'))) then raise exception 'Review pending payments before changing this fee';end if;
 delete from public.schoolpro_fee_items where fee_structure_id=f.id;
 insert into public.schoolpro_fee_items(fee_structure_id,label,amount,category,is_optional,sort_order)
 select f.id,trim(value->>'label'),(value->>'amount')::numeric,case when value->>'category' in ('fee','levy','books','transport','hostel','uniform','other') then value->>'category' else 'other' end,coalesce((value->>'is_optional')::boolean,false),ordinality::integer-1 from jsonb_array_elements(p_items) with ordinality;
 update public.schoolpro_fee_structures set name=trim(p_name),amount=total,due_date=p_due,updated_at=now() where id=f.id;
 insert into public.audit_logs(actor_id,action,product,target_type,target_id,metadata) values(auth.uid(),'School fee charges edited','schoolpro','fee_structure',f.id::text,jsonb_build_object('school_id',f.school_id,'previous_total',f.amount,'new_total',total));
 return jsonb_build_object('id',f.id,'total',total);
end $$;
revoke all on function public.edit_schoolpro_fee_bundle(uuid,text,date,jsonb) from public,anon;
grant execute on function public.edit_schoolpro_fee_bundle(uuid,text,date,jsonb) to authenticated;

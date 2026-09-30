-- Atomic Print staff actions. Invoker functions retain the existing RLS grants.
create or replace function public.print_issue_artwork_proof(p_artwork uuid) returns uuid language plpgsql security invoker set search_path='' as $$
declare a public.print_artworks; proof uuid; version_no int;
begin
 if auth.uid() is null or not private.print_staff_permission('edit') then raise exception 'Print edit permission required'; end if;
 select * into a from public.print_artworks where id=p_artwork for update;
 if not found or nullif(a.file_path,'') is null then raise exception 'Artwork file required'; end if;
 perform 1 from public.print_orders where id=a.order_id for update;
 select coalesce(max(version),0)+1 into version_no from public.print_proofs where order_id=a.order_id;
 update public.print_proofs set status='superseded' where order_id=a.order_id and status='pending';
 insert into public.print_proofs(order_id,artwork_id,file_path,version,status) values(a.order_id,a.id,a.file_path,version_no,'pending') returning id into proof;
 insert into public.print_notifications(user_id,order_id,title,body,kind) values(a.user_id,a.order_id,'Proof ready for review','Review the supplied artwork and approve it or request a revision.','proof');
 insert into public.print_audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'proof_issued','proof',proof,jsonb_build_object('artwork_id',a.id));
 return proof;
end $$;
revoke all on function public.print_issue_artwork_proof(uuid) from public,anon;
grant execute on function public.print_issue_artwork_proof(uuid) to authenticated;
create or replace function public.print_issue_quote(p_order uuid,p_subtotal numeric,p_discount numeric,p_tax numeric,p_delivery numeric,p_valid_until date) returns uuid
language plpgsql security invoker set search_path='' as $$
declare o public.print_orders; q uuid; total numeric;
begin
 if auth.uid() is null or not private.print_staff_permission('edit') then raise exception 'Print edit permission required'; end if;
 if p_subtotal is null or p_discount is null or p_tax is null or p_delivery is null or p_subtotal::text in ('NaN','Infinity','-Infinity') or p_discount::text in ('NaN','Infinity','-Infinity') or p_tax::text in ('NaN','Infinity','-Infinity') or p_delivery::text in ('NaN','Infinity','-Infinity') or least(p_subtotal,p_discount,p_tax,p_delivery)<0 or p_discount>p_subtotal or p_subtotal<>round(p_subtotal,2) or p_discount<>round(p_discount,2) or p_tax<>round(p_tax,2) or p_delivery<>round(p_delivery,2) then raise exception 'Enter valid nonnegative NGN amounts with at most two decimals'; end if;
 total:=p_subtotal-p_discount+p_tax+p_delivery;
 if total<=0 or p_valid_until is null or p_valid_until<current_date then raise exception 'A positive total and valid expiry date are required'; end if;
 select * into o from public.print_orders where id=p_order for update;
 if not found or o.status not in ('request','quoted') then raise exception 'Only an unbilled request can be quoted'; end if;
 if exists(select 1 from public.print_invoices where order_id=o.id and status<>'cancelled') then raise exception 'An invoice has already been issued'; end if;
 if o.quote_id is not null then update public.print_quotes set status='superseded' where id=o.quote_id; end if;
 insert into public.print_quotes(user_id,title,specifications,subtotal,discount,tax,delivery_fee,total,status,valid_until) values(o.user_id,o.title,jsonb_build_object('order_id',o.id),p_subtotal,p_discount,p_tax,p_delivery,total,'issued',p_valid_until) returning id into q;
 update public.print_orders set quote_id=q,status='quoted' where id=o.id;
 insert into public.print_notifications(user_id,order_id,title,body,kind) values(o.user_id,o.id,'Quotation issued','Review and accept your Print quotation before invoice issuance.','quote');
 insert into public.print_audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'quote_issued','order',o.id,jsonb_build_object('quote_id',q,'total',total));
 return q;
end $$;

create or replace function private.print_quote_customer_guard() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if not private.print_staff_permission('edit') then
  if auth.uid() is null or old.user_id<>auth.uid() or old.status<>'issued' or new.status not in ('accepted','rejected') or old.valid_until is null or old.valid_until<current_date or (to_jsonb(new)-'status'-'updated_at') is distinct from (to_jsonb(old)-'status'-'updated_at') then raise exception 'Only the owner may respond to a current issued quote'; end if;
 end if;
 return new;
end $$;
drop trigger if exists print_quote_customer_guard on public.print_quotes;
create trigger print_quote_customer_guard before update on public.print_quotes for each row execute function private.print_quote_customer_guard();
drop policy if exists print_quote_owner_response on public.print_quotes;
create policy print_quote_owner_response on public.print_quotes for update to authenticated using (user_id=(select auth.uid()) and status='issued' and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.status::text='active') and exists(select 1 from public.customer_service_access a where a.user_id=(select auth.uid()) and a.product='print' and a.status='active')) with check (user_id=(select auth.uid()) and status in ('accepted','rejected'));

create or replace function public.print_invoice_accepted_quote(p_order uuid,p_due_at timestamptz default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare o public.print_orders; q public.print_quotes; i uuid;
begin
 if auth.uid() is null or not private.print_staff_permission('edit') then raise exception 'Print edit permission required'; end if;
 select * into o from public.print_orders where id=p_order for update;
 if not found then raise exception 'Order not found'; end if;
 select * into q from public.print_quotes where id=o.quote_id and user_id=o.user_id for update;
 if not found or q.status<>'accepted' or q.total<=0 or q.valid_until is null or q.valid_until<current_date then raise exception 'A current accepted quotation is required'; end if;
 if exists(select 1 from public.print_invoices where order_id=o.id and status<>'cancelled') then raise exception 'An invoice has already been issued'; end if;
 insert into public.print_invoices(order_id,amount,amount_paid,currency,status,due_at) values(o.id,q.total,0,'NGN','unpaid',p_due_at) returning id into i;
 update public.print_orders set status='awaiting_payment' where id=o.id;
 insert into public.print_notifications(user_id,order_id,title,body,kind) values(o.user_id,o.id,'Invoice issued','Your accepted quotation has been invoiced. Use Payments for verified settlement.','invoice');
 insert into public.print_audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'invoice_issued','order',o.id,jsonb_build_object('invoice_id',i,'quote_id',q.id));
 return i;
end $$;

create or replace function public.print_advance_job(p_order uuid,p_stage text,p_notes text default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare o public.print_orders; j public.print_jobs; stages text[]:=array['prepress','production','finishing','qc','ready']; next_index int; old_index int;
begin
 if auth.uid() is null or not private.print_staff_permission('edit') then raise exception 'Print edit permission required'; end if;
 select * into o from public.print_orders where id=p_order for update;
 if not found then raise exception 'Order not found'; end if;
 if not exists(select 1 from public.print_invoices where order_id=o.id and status='paid' and amount_paid=amount and amount>0) then raise exception 'Verified full invoice payment is required before production'; end if;
 if coalesce((select status from public.print_proofs where order_id=o.id order by created_at desc,version desc limit 1),'')<>'approved' then raise exception 'Customer-approved proof required before production'; end if;
 next_index:=array_position(stages,p_stage);
 if next_index is null then raise exception 'Invalid production stage'; end if;
 select * into j from public.print_jobs where order_id=o.id order by created_at desc limit 1 for update;
 old_index:=coalesce(array_position(stages,j.stage),0);
 if next_index<>old_index+1 then raise exception 'Advance one production stage at a time'; end if;
 if p_stage='ready' and coalesce((select status='passed' and not reprint_required from public.print_qc_checks where job_id=j.id order by created_at desc limit 1),false)=false then raise exception 'Passed quality control is required'; end if;
 if j.id is null then insert into public.print_jobs(order_id,stage,progress,internal_notes,started_at) values(o.id,p_stage,20,p_notes,now()) returning * into j;
 else update public.print_jobs set stage=p_stage,progress=next_index*20,internal_notes=p_notes,completed_at=case when p_stage='ready' then now() else null end where id=j.id; end if;
 update public.print_orders set status=case when p_stage='ready' then 'ready' else 'in_production' end where id=o.id;
 insert into public.print_audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'production_advanced','job',j.id,jsonb_build_object('stage',p_stage,'notes',p_notes));
 return j.id;
end $$;

create or replace function public.print_record_qc(p_job uuid,p_passed boolean,p_notes text) returns uuid language plpgsql security invoker set search_path='' as $$
declare j public.print_jobs; q uuid;
begin
 if auth.uid() is null or not private.print_staff_permission('edit') then raise exception 'Print edit permission required'; end if;
 select * into j from public.print_jobs where id=p_job for update;
 if not found or j.stage<>'qc' then raise exception 'Job must be at quality control'; end if;
 if p_passed is null or (not p_passed and nullif(trim(p_notes),'') is null) then raise exception 'Record a result and defect notes for failed QC'; end if;
 insert into public.print_qc_checks(job_id,status,defect_notes,reprint_required,checked_by) values(j.id,case when p_passed then 'passed' else 'failed' end,p_notes,not p_passed,auth.uid()) returning id into q;
 if not p_passed then update public.print_jobs set stage='production',progress=40 where id=j.id; end if;
 insert into public.print_audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'quality_checked','job',j.id,jsonb_build_object('passed',p_passed,'notes',p_notes));
 return q;
end $$;

create or replace function public.print_dispatch_order(p_order uuid,p_status text,p_recipient text,p_tracking text default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare o public.print_orders; d public.print_deliveries;
begin
 if auth.uid() is null or not private.print_staff_permission('edit') then raise exception 'Print edit permission required'; end if;
 select * into o from public.print_orders where id=p_order for update;
 if not found or o.status not in ('ready','dispatched') or p_status not in ('dispatched','delivered','collected') or nullif(trim(p_recipient),'') is null then raise exception 'Ready order and recipient required'; end if;
 if not exists(select 1 from public.print_invoices where order_id=o.id and status='paid' and amount_paid=amount and amount>0) then raise exception 'Verified payment required'; end if;
 if not exists(select 1 from public.print_jobs j join public.print_qc_checks q on q.job_id=j.id where j.order_id=o.id and j.stage='ready' and q.status='passed' and not q.reprint_required) then raise exception 'Completed production and passed QC required'; end if;
 if o.fulfillment='pickup' and p_status<>'collected' or o.fulfillment='delivery' and p_status='collected' then raise exception 'Use the configured fulfillment method'; end if;
 select * into d from public.print_deliveries where order_id=o.id order by created_at desc limit 1 for update;
 if p_status='delivered' and (d.id is null or d.status<>'dispatched') then raise exception 'Dispatch the order before confirming delivery'; end if;
 if d.id is null then insert into public.print_deliveries(order_id,method,address,status,tracking_reference,recipient_name,delivered_at) values(o.id,o.fulfillment,o.delivery_address,p_status,p_tracking,p_recipient,case when p_status in ('delivered','collected') then now() end) returning * into d;
 else update public.print_deliveries set status=p_status,tracking_reference=p_tracking,recipient_name=p_recipient,delivered_at=case when p_status in ('delivered','collected') then now() end where id=d.id; end if;
 update public.print_orders set status=case when p_status='dispatched' then 'dispatched' else 'completed' end where id=o.id;
 insert into public.print_notifications(user_id,order_id,title,body,kind) values(o.user_id,o.id,'Fulfilment updated',p_status||coalesce(' — '||p_tracking,''),'delivery');
 insert into public.print_audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'fulfilment_updated','order',o.id,jsonb_build_object('status',p_status,'recipient',p_recipient));
 return d.id;
end $$;

create or replace function public.print_adjust_stock(p_inventory uuid,p_movement text,p_quantity numeric,p_notes text,p_job uuid default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare stock public.print_inventory; delta numeric; m uuid;
begin
 if auth.uid() is null or not private.print_staff_permission('edit') then raise exception 'Print edit permission required'; end if;
 if p_movement not in ('receipt','use','adjustment') or p_quantity is null or p_quantity::text in ('NaN','Infinity','-Infinity') or p_quantity=0 or (p_movement<>'adjustment' and p_quantity<=0) or nullif(trim(p_notes),'') is null then raise exception 'Valid movement, nonzero quantity and reason required'; end if;
 select * into stock from public.print_inventory where id=p_inventory for update;
 if not found then raise exception 'Stock item not found'; end if;
 if p_job is not null and not exists(select 1 from public.print_jobs where id=p_job) then raise exception 'Job not found'; end if;
 delta:=case when p_movement='use' then -p_quantity else p_quantity end;
 if stock.quantity+delta<0 then raise exception 'Insufficient stock'; end if;
 update public.print_inventory set quantity=quantity+delta where id=stock.id;
 insert into public.print_stock_movements(inventory_id,job_id,movement,quantity,notes) values(stock.id,p_job,p_movement,p_quantity,p_notes) returning id into m;
 insert into public.print_audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'stock_adjusted','inventory',stock.id,jsonb_build_object('delta',delta,'reason',p_notes));
 return m;
end $$;

create or replace function private.print_proof_customer_guard() returns trigger language plpgsql security invoker set search_path='' as $$
declare latest uuid;
begin
 if private.print_staff_permission('edit') then
  if new.status='approved' and old.status<>'approved' then raise exception 'Only the customer may approve a proof'; end if;
 else
  if auth.uid() is null or old.status<>'pending' or new.status not in ('approved','revision_requested') or
   (to_jsonb(new)-'status'-'customer_notes'-'approved_at'-'updated_at') is distinct from (to_jsonb(old)-'status'-'customer_notes'-'approved_at'-'updated_at') or
   not exists(select 1 from public.profiles where id=auth.uid() and status::text='active') or
   not exists(select 1 from public.customer_service_access where user_id=auth.uid() and product='print' and status='active') then raise exception 'Only an active customer may respond to a pending proof'; end if;
  perform 1 from public.print_orders where id=old.order_id and user_id=auth.uid();
  if not found then raise exception 'Proof owner required'; end if;
  select id into latest from public.print_proofs where order_id=old.order_id order by version desc,created_at desc limit 1;
  if latest<>old.id then raise exception 'Review the latest proof'; end if;
  if new.status='revision_requested' and nullif(trim(new.customer_notes),'') is null then raise exception 'Revision notes are required'; end if;
  new.approved_at:=case when new.status='approved' then now() else null end;
 end if;
 return new;
end $$;
drop trigger if exists print_proof_customer_guard on public.print_proofs;
create trigger print_proof_customer_guard before update on public.print_proofs for each row execute function private.print_proof_customer_guard();
revoke all on function private.print_proof_customer_guard() from public,anon,authenticated;
revoke all on function private.print_quote_customer_guard() from public,anon,authenticated;
revoke all on function public.print_issue_quote(uuid,numeric,numeric,numeric,numeric,date),public.print_invoice_accepted_quote(uuid,timestamptz),public.print_advance_job(uuid,text,text),public.print_record_qc(uuid,boolean,text),public.print_dispatch_order(uuid,text,text,text),public.print_adjust_stock(uuid,text,numeric,text,uuid) from public,anon;
grant execute on function public.print_issue_quote(uuid,numeric,numeric,numeric,numeric,date),public.print_invoice_accepted_quote(uuid,timestamptz),public.print_advance_job(uuid,text,text),public.print_record_qc(uuid,boolean,text),public.print_dispatch_order(uuid,text,text,text),public.print_adjust_stock(uuid,text,numeric,text,uuid) to authenticated;

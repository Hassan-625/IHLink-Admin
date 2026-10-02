create or replace function public.review_direct_bank_transfer(p_submission uuid,p_decision text,p_note text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.direct_transfer_submissions%rowtype;new_status text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if p_decision not in('approved','rejected') then raise exception 'Decision must be approved or rejected';end if;
 select * into s from public.direct_transfer_submissions where id=p_submission for update;
 if s.id is null then raise exception 'Submission not found';end if;
 if not (private.is_admin(array['super_admin'::public.user_role]) or private.business_staff_allowed(s.platform_code,'approve')) then raise exception 'Platform finance approval permission required';end if;
 if s.status not in('awaiting_verification','pending') then raise exception 'Submission has already been reviewed';end if;
 if p_decision='approved' then
  if s.platform_code='consult' then update public.consult_invoices set amount_paid=least(amount,coalesce(amount_paid,0)+s.amount),status=case when coalesce(amount_paid,0)+s.amount>=amount then 'paid' else 'partial' end,paid_at=case when coalesce(amount_paid,0)+s.amount>=amount then now() else paid_at end,payment_reference=s.customer_reference,updated_at=now() where id=s.invoice_id;
  elsif s.platform_code='engineering' then update public.engineering_invoices set amount_paid=least(amount,coalesce(amount_paid,0)+s.amount),status=case when coalesce(amount_paid,0)+s.amount>=amount then 'paid' else 'partial' end,updated_at=now() where id=s.invoice_id;
  elsif s.platform_code='print' then update public.print_invoices set amount_paid=least(amount,coalesce(amount_paid,0)+s.amount),status=case when coalesce(amount_paid,0)+s.amount>=amount then 'paid' else 'partial' end,updated_at=now() where id=s.invoice_id;
  elsif s.platform_code='host' then update public.host_invoices set status=case when s.amount>=amount then 'paid' else status end,paid_at=case when s.amount>=amount then now() else paid_at end,payment_reference=s.customer_reference,updated_at=now() where id=s.invoice_id;
  elsif s.platform_code in('fabrication','compute','academy','digital_business','business_centre') then update public.business_invoices set amount_paid=least(amount,coalesce(amount_paid,0)+s.amount),status=case when coalesce(amount_paid,0)+s.amount>=amount then 'paid' else 'partial' end,updated_at=now() where id=s.invoice_id;
  else raise exception 'Unsupported direct-transfer platform';
  end if;
  new_status='approved';
 else new_status='rejected';end if;
 update public.direct_transfer_submissions set status=new_status,admin_note=p_note,verified_by=auth.uid(),verified_at=now(),updated_at=now() where id=s.id;
 return jsonb_build_object('id',s.id,'status',new_status,'platform',s.platform_code,'invoice_id',s.invoice_id);
end $$;
revoke all on function public.review_direct_bank_transfer(uuid,text,text) from public,anon;
grant execute on function public.review_direct_bank_transfer(uuid,text,text) to authenticated;
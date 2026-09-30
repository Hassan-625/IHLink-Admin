create policy business_quote_customer_response on public.business_quotes for update to authenticated
using(status='issued' and exists(select 1 from public.business_orders o where o.id=order_id and o.user_id=auth.uid()))
with check(status in ('accepted','revision_requested','rejected') and exists(select 1 from public.business_orders o where o.id=order_id and o.user_id=auth.uid()));
create or replace function private.business_quote_response_guard() returns trigger language plpgsql security invoker set search_path='' as $$ declare unit text;begin
 select o.unit_code into unit from public.business_orders o where o.id=old.order_id;
 if current_user='authenticated' and not private.business_staff_allowed(unit,'edit') then
  if (to_jsonb(new)-'status') is distinct from (to_jsonb(old)-'status') or old.status<>'issued' or new.status not in ('accepted','revision_requested','rejected')
  or (old.valid_until is not null and old.valid_until<current_date) then raise exception 'Only a valid issued quote may receive a customer response';end if;
 end if;return new;end $$;
create trigger business_quote_response_guard before update on public.business_quotes for each row execute function private.business_quote_response_guard();
create or replace function private.business_invoice_quote_guard() returns trigger language plpgsql security invoker set search_path='' as $$ begin
 if current_user='authenticated' and new.status='issued' and not exists(select 1 from public.business_quotes q where q.order_id=new.order_id and q.status='accepted' and q.amount=new.amount and q.currency=new.currency and (q.valid_until is null or q.valid_until>=current_date)) then raise exception 'An accepted quote with the same amount and currency is required';end if;return new;end $$;
create trigger business_invoice_quote_guard before insert or update on public.business_invoices for each row execute function private.business_invoice_quote_guard();
create or replace function private.business_order_payment_guard() returns trigger language plpgsql security invoker set search_path='' as $$ begin
 if new.status in ('paid','in_progress','completed') and new.status is distinct from old.status and not exists(select 1 from public.business_invoices i where i.order_id=new.id and i.status='paid' and i.amount_paid=i.amount and i.amount>0) then raise exception 'Verified invoice payment is required before fulfilment';end if;return new;end $$;
create trigger business_order_payment_guard before update on public.business_orders for each row execute function private.business_order_payment_guard();

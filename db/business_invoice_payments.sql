alter table public.business_invoices add column if not exists amount_paid numeric not null default 0;
alter table public.academy_enrollments add column if not exists order_id uuid references public.business_orders(id);
create table public.business_payment_intents(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),unit_code text not null check(unit_code in ('fabrication','compute','academy','digital_business')),
 order_id uuid not null references public.business_orders(id),invoice_id uuid not null references public.business_invoices(id),virtual_account_id uuid not null references public.virtual_accounts(id),
 amount numeric not null check(amount>0 and amount=round(amount,2)),reference text not null unique,status text not null default 'pending' check(status in ('pending','paid','cancelled')),
 transaction_ref text unique,paid_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create unique index business_one_pending_invoice on public.business_payment_intents(invoice_id) where status='pending';
alter table public.business_payment_intents enable row level security;
grant select on public.business_payment_intents to authenticated;
create policy business_intent_owner on public.business_payment_intents for select to authenticated using(user_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.status='active'));
create policy business_intent_staff on public.business_payment_intents for select to authenticated using(private.business_staff_allowed(unit_code,'view'));
create unique index business_payment_provider_reference on public.business_payments(provider_reference) where provider_reference is not null;

create or replace function private.business_invoice_settlement_guard() returns trigger language plpgsql security invoker set search_path='' as $$ begin
 if current_user='authenticated' and ((new.status='paid' and (tg_op='INSERT' or old.status is distinct from 'paid'))
 or (tg_op='INSERT' and new.amount_paid<>0) or (tg_op='UPDATE' and new.amount_paid is distinct from old.amount_paid)) then raise exception 'Verified gateway settlement is required'; end if;
 if new.amount<=0 or new.amount<>round(new.amount,2) or new.amount_paid<0 or new.amount_paid>new.amount then raise exception 'Invalid invoice amount'; end if;
 if tg_op='UPDATE' and exists(select 1 from public.business_payment_intents i where i.invoice_id=old.id and i.status in ('pending','paid'))
 and (new.amount is distinct from old.amount or new.order_id is distinct from old.order_id or new.currency is distinct from old.currency) then raise exception 'Payment-linked invoice amounts and ownership are immutable'; end if;
 return new; end $$;

create or replace function public.create_business_payment_intent(p_user uuid,p_invoice uuid,p_virtual_account uuid)
returns public.business_payment_intents language plpgsql security definer set search_path='' as $$
declare inv public.business_invoices; ord public.business_orders; va public.virtual_accounts; intent public.business_payment_intents; due numeric; begin
 select * into inv from public.business_invoices where id=p_invoice for update;
 select * into ord from public.business_orders where id=inv.order_id;
 if inv.id is null or ord.user_id is distinct from p_user or inv.status not in ('issued','awaiting_payment') or inv.currency<>'NGN' then raise exception 'Invoice unavailable for payment'; end if;
 if not exists(select 1 from public.profiles p join public.customer_service_access a on a.user_id=p.id where p.id=p_user and p.status='active' and a.product=ord.unit_code and a.status='active') then raise exception 'Active platform access required'; end if;
 due:=inv.amount-inv.amount_paid;if due is null or due<=0 or due<>round(due,2) then raise exception 'No valid outstanding amount'; end if;
 select * into va from public.virtual_accounts where id=p_virtual_account for update;
 if va.user_id is distinct from p_user or va.platform_code is distinct from ord.unit_code or va.provider<>'billstack' or va.status<>'active' then raise exception 'Payment account ownership or platform mismatch'; end if;
 select * into intent from public.business_payment_intents where invoice_id=inv.id and status='pending';
 if intent.id is not null then if intent.amount<>due or intent.virtual_account_id<>va.id then raise exception 'Existing payment instruction requires reconciliation'; end if;return intent;end if;
 if exists(select 1 from public.business_payment_intents i where i.virtual_account_id=va.id and i.status='pending' and i.amount=due) then raise exception 'Another invoice has the same outstanding transfer amount. Reconcile that instruction first'; end if;
 insert into public.business_payment_intents(user_id,unit_code,order_id,invoice_id,virtual_account_id,amount,reference)
 values(p_user,ord.unit_code,ord.id,inv.id,va.id,due,'BIZ-'||upper(replace(gen_random_uuid()::text,'-',''))) returning * into intent;return intent;end $$;
revoke all on function public.create_business_payment_intent(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.create_business_payment_intent(uuid,uuid,uuid) to service_role;

create or replace function public.finalize_business_billstack_payment(p_intent uuid,p_transaction_ref text,p_amount numeric)
returns jsonb language plpgsql security definer set search_path='' as $$
declare intent public.business_payment_intents;inv public.business_invoices;ord public.business_orders;tx public.payment_transactions;begin
 if p_amount is null or p_amount<=0 or p_amount<>round(p_amount,2) or nullif(trim(p_transaction_ref),'') is null then raise exception 'Verified exact payment amount required'; end if;
 select * into intent from public.business_payment_intents where id=p_intent;if intent.id is null then raise exception 'Payment instruction not found';end if;
 select * into inv from public.business_invoices where id=intent.invoice_id for update;
 select * into intent from public.business_payment_intents where id=p_intent for update;
 select * into ord from public.business_orders where id=inv.order_id for update;
 select * into tx from public.payment_transactions where provider='billstack' and transaction_ref=p_transaction_ref for update;
 if intent.status='paid' then if intent.transaction_ref=p_transaction_ref and intent.amount=p_amount then return jsonb_build_object('status','already_paid','intent_id',intent.id);end if;raise exception 'Instruction already settled by a different transaction';end if;
 if intent.status<>'pending' or tx.id is null or tx.status not in ('verified','credited') or tx.credited_at is not null or tx.amount<>p_amount or tx.currency<>'NGN'
 or tx.user_id is distinct from intent.user_id or tx.platform_code is distinct from intent.unit_code or tx.virtual_account_id is distinct from intent.virtual_account_id then raise exception 'Verified transaction ownership, platform or replay validation failed';end if;
 if ord.id is distinct from intent.order_id or ord.user_id is distinct from intent.user_id or ord.unit_code is distinct from intent.unit_code or inv.status not in ('issued','awaiting_payment') or inv.currency<>'NGN'
 or p_amount<>intent.amount or p_amount<>(inv.amount-inv.amount_paid) then raise exception 'Invoice linkage or exact amount validation failed';end if;
 insert into public.business_payments(invoice_id,user_id,amount,currency,provider_reference,status,paid_at) values(inv.id,intent.user_id,p_amount,'NGN',p_transaction_ref,'paid',now());
 update public.business_invoices set amount_paid=amount_paid+p_amount,status='paid',updated_at=now() where id=inv.id;
 update public.business_orders set amount=inv.amount,status='paid',updated_at=now() where id=ord.id;
 update public.business_payment_intents set status='paid',transaction_ref=p_transaction_ref,paid_at=now(),updated_at=now() where id=intent.id;
 update public.payment_transactions set status='credited',credited_at=now(),updated_at=now() where id=tx.id;
 insert into public.business_notifications(user_id,unit_code,title,body) values(intent.user_id,intent.unit_code,'Payment verified','Invoice '||inv.invoice_number||' is paid. Your request is ready for authorized fulfilment.');
 return jsonb_build_object('status','paid','intent_id',intent.id,'invoice_id',inv.id);end $$;
revoke all on function public.finalize_business_billstack_payment(uuid,text,numeric) from public,anon,authenticated;
grant execute on function public.finalize_business_billstack_payment(uuid,text,numeric) to service_role;

create or replace function public.apply_academy_course(target_course uuid) returns uuid language plpgsql security invoker set search_path='' as $$
declare course public.academy_courses;request_id uuid;enrollment_id uuid;begin
 select * into course from public.academy_courses where id=target_course and is_active;
 if auth.uid() is null or course.id is null then raise exception 'Active course and authenticated account required';end if;
 insert into public.business_orders(user_id,unit_code,title,requirements,quantity,specifications) values(auth.uid(),'academy','Enrolment: '||course.title,'Course enrolment application for '||course.title,1,jsonb_build_object('course_id',course.id)) returning id into request_id;
 insert into public.academy_enrollments(course_id,user_id,status,progress,order_id) values(course.id,auth.uid(),'applied',0,request_id) returning id into enrollment_id;
 return enrollment_id;end $$;
revoke all on function public.apply_academy_course(uuid) from public,anon;
grant execute on function public.apply_academy_course(uuid) to authenticated;

create or replace function private.academy_enrollment_payment_guard() returns trigger language plpgsql security invoker set search_path='' as $$ declare fee numeric;begin
 if new.status in ('enrolled','active','completed') and (tg_op='INSERT' or new.status is distinct from old.status) then
 select c.fee into fee from public.academy_courses c where c.id=new.course_id;
 if fee is null then raise exception 'Confirm the course fee before activating enrolment';end if;
 if fee>0 and not exists(select 1 from public.business_invoices i where i.order_id=new.order_id and i.status='paid' and i.amount_paid=i.amount) then raise exception 'Verified course payment required';end if;end if;return new;end $$;
create trigger academy_enrollment_payment_guard before insert or update on public.academy_enrollments for each row execute function private.academy_enrollment_payment_guard();

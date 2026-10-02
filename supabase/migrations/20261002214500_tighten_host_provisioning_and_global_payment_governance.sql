create or replace function public.host_can_provision() returns boolean language sql stable security definer set search_path='' as $$
 select private.is_admin(array['super_admin'::public.user_role]) or private.has_product_access('host','edit')
$$;
revoke all on function public.host_can_provision() from public,anon;
grant execute on function public.host_can_provision() to authenticated;

create or replace function public.set_payment_bank_policy(p_bank_code text,p_enabled boolean,p_customer_enabled boolean,p_reason text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.payment_provider_banks%rowtype;
begin
 if not private.is_admin(array['super_admin'::public.user_role]) then raise exception 'Super Admin required';end if;
 update public.payment_provider_banks pb set enabled=p_enabled,customer_enabled=(p_customer_enabled and p_enabled),updated_at=now() from public.payment_providers pp where pb.provider_id=pp.id and pp.code='billstack' and pb.bank_code=upper(trim(p_bank_code)) returning pb.* into b;
 if b.id is null then raise exception 'Bank not found';end if;
 insert into public.payment_admin_audit(actor_id,operation,target_type,target_id,reason,details) values(auth.uid(),'bank_policy_updated','payment_provider_bank',b.id::text,p_reason,jsonb_build_object('bank_code',b.bank_code,'enabled',b.enabled,'customer_enabled',b.customer_enabled));
 return jsonb_build_object('bank_code',b.bank_code,'enabled',b.enabled,'customer_enabled',b.customer_enabled);
end $$;
revoke all on function public.set_payment_bank_policy(text,boolean,boolean,text) from public,anon;
grant execute on function public.set_payment_bank_policy(text,boolean,boolean,text) to authenticated;

create or replace function public.set_payment_fee(p_provider text,p_platform text,p_fee_code text,p_fee_type text,p_fee_value numeric,p_minimum numeric default null,p_maximum numeric default null,p_enabled boolean default true,p_customer_pays boolean default true,p_reason text default null) returns public.payment_fee_settings language plpgsql security definer set search_path='' as $$
declare r public.payment_fee_settings%rowtype;
begin
 if not private.is_admin(array['super_admin'::public.user_role]) then raise exception 'Super Admin required'; end if;
 if p_fee_type not in('fixed','percentage') or p_fee_value<0 then raise exception 'Invalid fee configuration'; end if;
 insert into public.payment_fee_settings(provider,platform_code,fee_code,fee_type,fee_value,minimum_fee,maximum_fee,enabled,customer_pays,updated_by,updated_at)
 values(lower(p_provider),lower(p_platform),p_fee_code,p_fee_type,p_fee_value,p_minimum,p_maximum,p_enabled,p_customer_pays,auth.uid(),now())
 on conflict(provider,platform_code,fee_code) do update set fee_type=excluded.fee_type,fee_value=excluded.fee_value,minimum_fee=excluded.minimum_fee,maximum_fee=excluded.maximum_fee,enabled=excluded.enabled,customer_pays=excluded.customer_pays,updated_by=auth.uid(),updated_at=now() returning * into r;
 insert into public.payment_admin_audit(actor_id,operation,target_type,target_id,reason,details) values(auth.uid(),'payment_fee_updated','payment_fee_setting',r.id,p_reason,jsonb_build_object('provider',r.provider,'platform_code',r.platform_code,'fee_code',r.fee_code,'fee_type',r.fee_type,'fee_value',r.fee_value,'minimum_fee',r.minimum_fee,'maximum_fee',r.maximum_fee,'enabled',r.enabled,'customer_pays',r.customer_pays));
 return r;
end $$;
revoke all on function public.set_payment_fee(text,text,text,text,numeric,numeric,numeric,boolean,boolean,text) from public,anon;
grant execute on function public.set_payment_fee(text,text,text,text,numeric,numeric,numeric,boolean,boolean,text) to authenticated;
create table public.datasub_referral_program(id boolean primary key default true check(id),enabled boolean not null default false,reward_amount numeric(14,2) not null default 0 check(reward_amount>=0),minimum_purchase numeric(14,2) not null default 0 check(minimum_purchase>=0),updated_by uuid references public.profiles(id),updated_at timestamptz not null default now());
insert into public.datasub_referral_program(id) values(true);
alter table public.datasub_referral_program enable row level security;
grant select on public.datasub_referral_program to authenticated;
create policy "Signed customers view referral terms" on public.datasub_referral_program for select to authenticated using(true);
create policy "Super administrators configure referral terms" on public.datasub_referral_program for update to authenticated using(private.is_admin(array['super_admin']::public.user_role[])) with check(private.is_admin(array['super_admin']::public.user_role[]));
create table public.datasub_referral_codes(user_id uuid primary key references public.profiles(id),code text not null unique default upper(replace(gen_random_uuid()::text,'-','')),created_at timestamptz not null default now());
alter table public.datasub_referral_codes enable row level security;
revoke all on public.datasub_referral_codes from anon,authenticated;grant select on public.datasub_referral_codes to authenticated;
create policy "Own referral code" on public.datasub_referral_codes for select to authenticated using(user_id=auth.uid());
create table public.datasub_referral_invitees(referred_user_id uuid primary key references public.profiles(id),referrer_user_id uuid not null references public.profiles(id),created_at timestamptz not null default now(),check(referred_user_id<>referrer_user_id));
create index datasub_referral_inviter_idx on public.datasub_referral_invitees(referrer_user_id);
alter table public.datasub_referral_invitees enable row level security;
revoke all on public.datasub_referral_invitees from anon,authenticated;grant select on public.datasub_referral_invitees to authenticated;
create policy "Own referral invitees" on public.datasub_referral_invitees for select to authenticated using(auth.uid() in(referred_user_id,referrer_user_id));
create function public.datasub_referral_code() returns text language plpgsql security definer set search_path='' as $$declare value text;begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and status='active') then raise exception 'Sign in to continue';end if;
 insert into public.datasub_referral_codes(user_id) values(auth.uid()) on conflict(user_id) do nothing;select code into value from public.datasub_referral_codes where user_id=auth.uid();return value;end;$$;
revoke all on function public.datasub_referral_code() from public,anon;grant execute on function public.datasub_referral_code() to authenticated;
create function public.datasub_claim_referral(p_code text) returns boolean language plpgsql security definer set search_path='' as $$declare inviter uuid;begin
 if auth.uid() is null or not exists(select 1 from auth.users u join public.profiles p on p.id=u.id where u.id=auth.uid() and u.email_confirmed_at is not null and p.status='active') then return false;end if;
 if exists(select 1 from public.datasub_transactions where user_id=auth.uid()) then return false;end if;
 select user_id into inviter from public.datasub_referral_codes where code=upper(trim(p_code));if inviter is null or inviter=auth.uid() or not exists(select 1 from public.profiles where id=inviter and status='active') then return false;end if;
 insert into public.datasub_referral_invitees(referred_user_id,referrer_user_id) values(auth.uid(),inviter) on conflict(referred_user_id) do nothing;return found;end;$$;
revoke all on function public.datasub_claim_referral(text) from public,anon;grant execute on function public.datasub_claim_referral(text) to authenticated;
-- Existing customer-created records cannot invent earnings or assign other customers.
drop policy "create own referral" on public.datasub_referrals;
create policy "create own referral" on public.datasub_referrals for insert to authenticated with check(referrer_user_id=auth.uid() and referred_user_id is null and commission=0 and status='pending');
revoke all on public.datasub_referral_program from anon,authenticated;grant select on public.datasub_referral_program to authenticated;
create table public.datasub_referral_rewards(id uuid primary key default gen_random_uuid(),referred_user_id uuid not null unique references public.profiles(id),referrer_user_id uuid not null references public.profiles(id),transaction_id uuid not null unique references public.datasub_transactions(id),amount numeric(14,2) not null check(amount>0),approved_by uuid not null references public.profiles(id),reason text not null,created_at timestamptz not null default now());
create index datasub_referral_reward_referrer_idx on public.datasub_referral_rewards(referrer_user_id,created_at desc);
alter table public.datasub_referral_rewards enable row level security;revoke all on public.datasub_referral_rewards from anon,authenticated;grant select on public.datasub_referral_rewards to authenticated;
create policy "Referrer and super administrator see earned rewards" on public.datasub_referral_rewards for select to authenticated using(referrer_user_id=auth.uid() or private.is_admin(array['super_admin']::public.user_role[]));
create policy "Super administrator reviews invitations" on public.datasub_referral_invitees for select to authenticated using(private.is_admin(array['super_admin']::public.user_role[]));
create function public.configure_datasub_referrals(p_enabled boolean,p_reward numeric,p_minimum numeric,p_reason text) returns void language plpgsql security definer set search_path='' as $$begin
 if not private.is_admin(array['super_admin']::public.user_role[]) then raise exception 'Super administrator access required';end if;
 if p_enabled is null or p_reward is null or p_minimum is null or p_reward<0 or p_minimum<0 or (p_enabled and p_reward<=0) or length(trim(coalesce(p_reason,'')))<3 then raise exception 'Enter valid programme terms and a reason';end if;
 update public.datasub_referral_program set enabled=p_enabled,reward_amount=p_reward,minimum_purchase=p_minimum,updated_by=auth.uid(),updated_at=now() where id;
 insert into public.activity_logs(user_id,action,entity_type,metadata) values(auth.uid(),'configure_datasub_referrals','datasub_referral_program',jsonb_build_object('enabled',p_enabled,'reward',p_reward,'minimum',p_minimum,'reason',p_reason));end;$$;
revoke all on function public.configure_datasub_referrals(boolean,numeric,numeric,text) from public,anon;grant execute on function public.configure_datasub_referrals(boolean,numeric,numeric,text) to authenticated;
create function public.approve_datasub_referral_reward(p_referred uuid,p_transaction uuid,p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare invite public.datasub_referral_invitees;purchase public.datasub_transactions;programme public.datasub_referral_program;reward public.datasub_referral_rewards;begin
 if not private.is_admin(array['super_admin']::public.user_role[]) then raise exception 'Super administrator access required';end if;
 if length(trim(coalesce(p_reason,'')))<3 then raise exception 'Enter a verification reason';end if;
 select * into invite from public.datasub_referral_invitees where referred_user_id=p_referred for update;if invite.referred_user_id is null then raise exception 'Invitation not found';end if;
 select * into reward from public.datasub_referral_rewards where referred_user_id=p_referred;if reward.id is not null then return jsonb_build_object('id',reward.id,'duplicate',true);end if;
 select * into programme from public.datasub_referral_program where id;if not programme.enabled or programme.reward_amount<=0 then raise exception 'Referral rewards are not active';end if;
 select * into purchase from public.datasub_transactions where id=p_transaction for update;
 if purchase.id is null or purchase.user_id<>p_referred or purchase.status::text<>'success' or purchase.created_at<invite.created_at or purchase.amount<programme.minimum_purchase or purchase.provider_cost is null or coalesce(purchase.selling_price,purchase.amount)-purchase.provider_cost<programme.reward_amount then raise exception 'Choose a verified successful purchase with enough actual profit for this reward';end if;
 if not exists(select 1 from public.profiles where id=invite.referrer_user_id and status='active') then raise exception 'The referring account is unavailable';end if;
 insert into public.datasub_referral_rewards(referred_user_id,referrer_user_id,transaction_id,amount,approved_by,reason) values(p_referred,invite.referrer_user_id,p_transaction,programme.reward_amount,auth.uid(),trim(p_reason)) returning * into reward;
 insert into public.datasub_wallets(user_id) values(invite.referrer_user_id) on conflict(user_id) do nothing;
 update public.datasub_wallets set referral_balance=referral_balance+reward.amount,updated_at=now() where user_id=invite.referrer_user_id;
 insert into public.activity_logs(user_id,action,entity_type,entity_id,metadata) values(auth.uid(),'approve_datasub_referral_reward','datasub_referral_reward',reward.id,jsonb_build_object('transaction',purchase.id,'amount',reward.amount,'reason',p_reason));return jsonb_build_object('id',reward.id,'amount',reward.amount,'duplicate',false);end;$$;
revoke all on function public.approve_datasub_referral_reward(uuid,uuid,text) from public,anon;grant execute on function public.approve_datasub_referral_reward(uuid,uuid,text) to authenticated;
create function public.move_datasub_referral_earnings() returns numeric language plpgsql security definer set search_path='' as $$declare value numeric;before_balance numeric;reference text;begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and status='active') then raise exception 'Sign in to continue';end if;
 select referral_balance,balance into value,before_balance from public.datasub_wallets where user_id=auth.uid() for update;
 if coalesce(value,0)<=0 then return 0;end if;
 update public.datasub_wallets set balance=balance+value,referral_balance=0,updated_at=now() where user_id=auth.uid();reference:='IHLREF-'||gen_random_uuid()::text;
 insert into public.wallet_ledger(user_id,entry_type,amount,reference,provider,direction,transaction_type,balance_before,balance_after,description) values(auth.uid(),'credit',value,reference,'ihlink_referral','credit','referral_reward',before_balance,before_balance+value,'Verified referral earnings moved to wallet');return value;end;$$;
revoke all on function public.move_datasub_referral_earnings() from public,anon;grant execute on function public.move_datasub_referral_earnings() to authenticated;

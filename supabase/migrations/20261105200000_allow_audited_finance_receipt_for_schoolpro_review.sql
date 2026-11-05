-- Allow a verified Finance/Super Admin receipt replacement to be used
-- for SchoolPro subscription review, while preserving customer-owned receipt
-- validation for ordinary submissions.
--
-- A replacement is accepted only when:
--   * the object exists in direct-transfer-proofs;
--   * its path is scoped to this submission's finance-resubmissions folder;
--   * a matching direct_transfer_resubmitted audit event records that exact path;
--   * the path's first segment matches the actor recorded in that audit event.
--
-- The finance_resubmit_direct_transfer RPC remains responsible for checking
-- the actor's active Finance/Super Admin role before creating the audit event.

create or replace function private.review_school_subscription_transfer(
  p_submission uuid,
  p_decision text,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  t public.direct_transfer_submissions%rowtype;
  i public.schoolpro_subscription_intents%rowtype;
  c public.schoolpro_subscription_catalog%rowtype;
  s public.schoolpro_subscriptions%rowtype;
  r timestamptz;
  receipt text;
begin
  if auth.uid() is null
     or not coalesce(private.is_active_account(), false)
     or not coalesce(private.is_admin(array['super_admin','finance']::public.user_role[]), false) then
    raise exception 'Company Finance approval permission required';
  end if;

  if p_decision is null
     or p_decision not in ('approved','rejected')
     or length(trim(coalesce(p_note,''))) < 3 then
    raise exception 'Review decision and verification note required';
  end if;

  select * into t
  from public.direct_transfer_submissions
  where id = p_submission
    and platform_code = 'schoolpro_subscription'
  for update;

  if t.id is null then
    raise exception 'Subscription proof unavailable';
  end if;

  if t.status = p_decision then
    return jsonb_build_object('id', t.id, 'status', t.status);
  end if;

  if t.status not in ('pending','awaiting_verification') then
    raise exception 'Proof already reviewed';
  end if;

  select * into i
  from public.schoolpro_subscription_intents
  where id = t.invoice_id
  for update;

  if i.id is null
     or i.status <> 'pending'
     or i.payment_method <> 'bank_transfer'
     or i.payer_user_id is distinct from t.user_id
     or i.amount is distinct from t.amount
     or i.billing_cycle <> 'annual' then
    raise exception 'Subscription proof does not match the pending instruction';
  end if;

  if p_decision = 'approved' then
    if t.proof_storage_path is null
       or not exists (
         select 1
         from storage.objects o
         where o.bucket_id = 'direct-transfer-proofs'
           and o.name = t.proof_storage_path
       )
       or not (
         t.proof_storage_path like t.user_id::text || '/%'
         or exists (
           select 1
           from public.audit_logs a
           where a.action = 'direct_transfer_resubmitted'
             and a.product = t.platform_code
             and a.target_type = 'direct_transfer'
             and a.target_id = t.id::text
             and a.actor_id::text = split_part(t.proof_storage_path, '/', 1)
             and a.metadata ->> 'new_proof_storage_path' = t.proof_storage_path
             and t.proof_storage_path like '%/finance-resubmissions/' || t.id::text || '/%'
         )
       ) then
      raise exception 'Saved customer receipt required';
    end if;

    perform 1
    from public.ihlink_bank_accounts
    where id = t.bank_account_id
    for update;

    if not found then
      raise exception 'Receiving account unavailable';
    end if;

    if exists (
      select 1
      from public.direct_transfer_submissions
      where id <> t.id
        and status in ('approved','verified')
        and bank_account_id = t.bank_account_id
        and lower(trim(customer_reference)) = lower(trim(t.customer_reference))
    ) then
      raise exception 'Bank reference already reconciled';
    end if;

    perform 1
    from public.schoolpro_schools
    where id = i.school_id
      and status <> 'suspended'
    for update;

    if not found then
      raise exception 'School requires review before activation';
    end if;

    select * into c
    from public.schoolpro_subscription_catalog
    where id = i.catalog_id
      and active;

    if c.id is null then
      raise exception 'Subscription plan unavailable';
    end if;

    select * into s
    from public.schoolpro_subscriptions
    where school_id = i.school_id
    for update;

    r := case
      when s.status = 'active' and s.amount > 0 and s.renews_at > now()
        then s.renews_at + interval '1 year'
      else now() + interval '1 year'
    end;

    insert into public.schoolpro_subscriptions(
      school_id, tier, billing_cycle, amount, status, starts_at, renews_at,
      managed_by_ihlink, updated_at
    )
    values (
      i.school_id, c.code, 'annual', i.amount, 'active', now(), r, true, now()
    )
    on conflict (school_id) do update
    set tier = excluded.tier,
        billing_cycle = 'annual',
        amount = excluded.amount,
        status = 'active',
        starts_at = coalesce(public.schoolpro_subscriptions.starts_at, now()),
        renews_at = r,
        managed_by_ihlink = true,
        updated_at = now()
    returning * into s;

    update public.schoolpro_schools
    set status = 'active', plan = c.code, updated_at = now()
    where id = i.school_id;

    receipt := 'DIRECT-' || t.id::text;

    update public.schoolpro_subscription_intents
    set status = 'paid',
        transaction_ref = receipt,
        paid_at = now(),
        updated_at = now()
    where id = i.id;

    insert into public.schoolpro_subscription_payments(
      school_id, subscription_id, payer_user_id, provider, reference, amount,
      status, transaction_ref, provider_payload, verified_at, credited_at
    )
    values (
      i.school_id, s.id, i.payer_user_id, 'bank_transfer', receipt, i.amount,
      'credited', receipt,
      jsonb_build_object(
        'submission_id', t.id,
        'bank_account_id', t.bank_account_id,
        'bank_reference', t.customer_reference,
        'verified_by', auth.uid()
      ),
      now(), now()
    );
  end if;

  update public.direct_transfer_submissions
  set status = p_decision,
      admin_note = trim(p_note),
      verified_by = auth.uid(),
      verified_at = now(),
      updated_at = now()
  where id = t.id;

  insert into public.audit_logs(
    actor_id, action, product, target_type, target_id, metadata
  )
  values (
    auth.uid(),
    'subscription_transfer_' || p_decision,
    'schoolpro',
    'direct_transfer',
    t.id::text,
    jsonb_build_object(
      'school_id', i.school_id,
      'intent_id', i.id,
      'amount', t.amount,
      'bank_reference', t.customer_reference,
      'finance_note', trim(p_note)
    )
  );

  return jsonb_build_object(
    'id', t.id,
    'status', p_decision,
    'school_id', i.school_id
  );
end
$function$;

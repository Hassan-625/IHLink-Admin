create or replace function public.finance_resubmit_direct_transfer(
  p_submission uuid,
  p_customer_reference text,
  p_proof_storage_path text,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.direct_transfer_submissions%rowtype;
  v_reference text := trim(coalesce(p_customer_reference, ''));
  v_note text := trim(coalesce(p_note, ''));
  v_old_reference text;
  v_old_proof_path text;
begin
  if auth.uid() is null or not coalesce(private.is_active_account(), false) then
    raise exception 'Active IHLink account required';
  end if;

  if not coalesce(private.is_admin(array['finance'::public.user_role]), false) then
    raise exception 'IHLink Finance permission required';
  end if;

  if v_reference = '' or length(v_reference) < 3 or length(v_reference) > 128 then
    raise exception 'A valid bank transaction reference (3–128 characters) is required';
  end if;
  if length(v_note) < 3 then
    raise exception 'Finance correction note must contain at least 3 characters';
  end if;

  select * into s
  from public.direct_transfer_submissions
  where id = p_submission
  for update;

  if s.id is null then
    raise exception 'Transfer submission not found';
  end if;
  if s.status not in ('awaiting_verification', 'pending') then
    raise exception 'Only pending transfer submissions can be corrected';
  end if;

  if p_proof_storage_path is null
     or p_proof_storage_path not like auth.uid()::text || '/finance-resubmissions/' || s.id::text || '/%'
     or not exists (
       select 1
       from storage.objects o
       where o.bucket_id = 'direct-transfer-proofs'
         and o.name = p_proof_storage_path
     ) then
    raise exception 'A newly uploaded Finance receipt is required';
  end if;

  if exists (
    select 1
    from public.direct_transfer_submissions d
    where d.id <> s.id
      and d.status in ('approved', 'verified')
      and d.bank_account_id = s.bank_account_id
      and lower(trim(d.customer_reference)) = lower(v_reference)
  ) then
    raise exception 'This bank transfer reference has already been reconciled';
  end if;

  v_old_reference := s.customer_reference;
  v_old_proof_path := s.proof_storage_path;

  update public.direct_transfer_submissions
  set customer_reference = v_reference,
      proof_storage_path = p_proof_storage_path,
      admin_note = concat_ws(E'\n', nullif(admin_note, ''), 'Finance resubmission: ' || v_note),
      updated_at = now()
  where id = s.id
    and status in ('awaiting_verification', 'pending');

  if not found then
    raise exception 'Transfer submission is no longer pending';
  end if;

  insert into public.audit_logs(actor_id, action, product, target_type, target_id, metadata)
  values (
    auth.uid(),
    'direct_transfer_resubmitted',
    s.platform_code,
    'direct_transfer',
    s.id::text,
    jsonb_build_object(
      'bank_account_id', s.bank_account_id,
      'amount', s.amount,
      'old_bank_reference', v_old_reference,
      'new_bank_reference', v_reference,
      'old_proof_storage_path', v_old_proof_path,
      'new_proof_storage_path', p_proof_storage_path,
      'finance_note', v_note,
      'status_remains_pending', true
    )
  );

  return jsonb_build_object(
    'id', s.id,
    'status', s.status,
    'platform', s.platform_code,
    'customer_reference', v_reference,
    'proof_storage_path', p_proof_storage_path
  );
end;
$$;

revoke all on function public.finance_resubmit_direct_transfer(uuid, text, text, text) from public, anon;
grant execute on function public.finance_resubmit_direct_transfer(uuid, text, text, text) to authenticated;

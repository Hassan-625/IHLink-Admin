alter table public.schoolpro_onboarding_requests add column if not exists school_id uuid references public.schoolpro_schools(id);
alter table public.schoolpro_onboarding_requests add column if not exists reviewed_by uuid references public.profiles(id);
alter table public.schoolpro_onboarding_requests add column if not exists reviewed_at timestamptz;
alter table public.schoolpro_onboarding_requests add column if not exists review_notes text;
create index if not exists schoolpro_onboarding_school_idx on public.schoolpro_onboarding_requests(school_id);
create index if not exists schoolpro_onboarding_reviewer_idx on public.schoolpro_onboarding_requests(reviewed_by);
drop policy "Users create onboarding requests" on public.schoolpro_onboarding_requests;
create policy "Users create onboarding requests" on public.schoolpro_onboarding_requests for insert to anon,authenticated
with check(status='submitted' and school_id is null and reviewed_by is null and reviewed_at is null and review_notes is null
and ((auth.uid() is null and user_id is null) or (user_id=auth.uid() and private.schoolpro_can_register())));
create or replace function public.review_schoolpro_onboarding(p_request uuid,p_action text,p_expected_status text,p_note text default null,p_tier text default 'starter')
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.schoolpro_onboarding_requests;sid uuid;new_status text;begin
 if auth.uid() is null or not private.is_admin(array['super_admin']::public.user_role[]) then raise exception 'Super administrator access required';end if;
 if p_action not in('review','approve','reject','provision','activate') then raise exception 'Choose a valid review action';end if;
 if length(trim(coalesce(p_note,'')))<3 then raise exception 'Enter a review or activation reason';end if;
 select * into r from public.schoolpro_onboarding_requests where id=p_request for update;
 if r.id is null then raise exception 'School request not found';end if;
 if r.status is distinct from p_expected_status then raise exception 'This request changed. Refresh before continuing';end if;
 if r.status='active' then raise exception 'This school is already activated';end if;
 if r.status='rejected' and p_action<>'review' then raise exception 'Review the rejected request before approval';end if;
 if r.school_id is not null and p_action in('reject','review','approve') then raise exception 'This request already has a workspace. Manage the school instead';end if;
 sid:=r.school_id;
 if p_action in('provision','activate') then
  if r.status not in('approved','provisioning') then raise exception 'Approve this school request first';end if;
  if r.user_id is null or not exists(select 1 from public.profiles where id=r.user_id and status='active') then raise exception 'An activated proprietor account must be linked before creating the workspace';end if;
  if sid is null then
   insert into public.schoolpro_schools(owner_id,name,code,plan,status)
   values(r.user_id,trim(r.school_name),'SP-'||upper(left(replace(r.id::text,'-',''),12)),'trial','trial') returning id into sid;
   insert into public.schoolpro_members(school_id,user_id,role) values(sid,r.user_id,'proprietor') on conflict(school_id,user_id) do nothing;
  else
   if not exists(select 1 from public.schoolpro_schools where id=sid and owner_id=r.user_id) then raise exception 'The linked school owner does not match this request';end if;
  end if;
 end if;
 new_status:=case p_action when 'review' then 'reviewing' when 'approve' then 'approved' when 'reject' then 'rejected' when 'provision' then 'provisioning' else 'active' end;
 if p_action='activate' then perform public.control_center_activate_schoolpro(sid,p_tier,p_note);end if;
 update public.schoolpro_onboarding_requests set status=new_status,school_id=sid,reviewed_by=auth.uid(),reviewed_at=now(),review_notes=trim(p_note),updated_at=now() where id=r.id;
 insert into public.activity_logs(user_id,action,entity_type,entity_id,metadata) values(auth.uid(),'schoolpro_onboarding_'||p_action,'schoolpro_onboarding_request',r.id,jsonb_build_object('school_id',sid,'before',r.status,'after',new_status,'reason',trim(p_note),'activation_source',case when p_action='activate' then 'authorized_control_center_override' else null end));
 return jsonb_build_object('id',r.id,'school_id',sid,'status',new_status);
end;$$;
revoke all on function public.review_schoolpro_onboarding(uuid,text,text,text,text) from public,anon;
grant execute on function public.review_schoolpro_onboarding(uuid,text,text,text,text) to authenticated;
create or replace function public.claim_schoolpro_onboarding()
returns integer language plpgsql security definer set search_path='' as $$
declare verified_email text;n integer;begin
 if auth.uid() is null or not private.schoolpro_can_register() then return 0;end if;
 select lower(email) into verified_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if verified_email is null then return 0;end if;
 update public.schoolpro_onboarding_requests set user_id=auth.uid(),updated_at=now()
 where user_id is null and school_id is null and status in('submitted','reviewing','approved') and lower(trim(email))=verified_email;
 get diagnostics n=row_count;return n;
end;$$;
revoke all on function public.claim_schoolpro_onboarding() from public,anon;
grant execute on function public.claim_schoolpro_onboarding() to authenticated;

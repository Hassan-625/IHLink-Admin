do $repair$
declare f record; definition text;
begin
 for f in select p.oid,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosrc like '%public.activity_logs%' loop
  definition:=pg_get_functiondef(f.oid);
  definition:=replace(definition,'public.activity_logs(user_id,action,entity_type,entity_id,metadata)','public.audit_logs(actor_id,action,target_type,target_id,metadata)');
  definition:=replace(definition,'public.activity_logs(user_id,action,entity_type,metadata)','public.audit_logs(actor_id,action,target_type,metadata)');
  definition:=replace(definition,'''schoolpro_onboarding_request'',r.id,','''schoolpro_onboarding_request'',r.id::text,');
  definition:=replace(definition,'''schoolpro_school'',p_school,','''schoolpro_school'',p_school::text,');
  definition:=replace(definition,'''datasub_referral_reward'',reward.id,','''datasub_referral_reward'',reward.id::text,');
  if definition like '%public.activity_logs%' then raise exception 'Unmapped audit call in %',f.proname; end if;
  execute definition;
 end loop;
end $repair$;
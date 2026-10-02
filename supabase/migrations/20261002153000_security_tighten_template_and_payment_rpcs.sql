-- Security audit: remove unintended anonymous execution and make QA acceptance evidence visible only to Super Admin.
revoke execute on function public.set_ihlink_default_template(uuid) from anon;
revoke execute on function public.my_payment_outcomes(text) from anon;
revoke execute on function public.render_ihlink_template(text,text,jsonb) from anon;
revoke execute on function public.resolve_ihlink_email_template(text,text,jsonb) from anon;
grant execute on function public.set_ihlink_default_template(uuid) to authenticated;
grant execute on function public.my_payment_outcomes(text) to authenticated;
grant execute on function public.render_ihlink_template(text,text,jsonb) to authenticated;
grant execute on function public.resolve_ihlink_email_template(text,text,jsonb) to authenticated;
drop policy if exists "Super admins can inspect QA acceptance runs" on public.qa_acceptance_runs;
create policy "Super admins can inspect QA acceptance runs" on public.qa_acceptance_runs for select to authenticated using (private.is_admin(array['super_admin']::public.user_role[]));
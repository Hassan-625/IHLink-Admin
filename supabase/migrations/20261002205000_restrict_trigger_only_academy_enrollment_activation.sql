revoke all on function public.activate_paid_academy_enrollment() from public, anon, authenticated;
grant execute on function public.activate_paid_academy_enrollment() to service_role;
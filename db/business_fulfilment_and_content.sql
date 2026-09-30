-- Hide untouched CMS seed placeholders; preserve records for later real content.
update public.site_content_blocks set is_visible=false
where section_key='managed-home' and eyebrow='Website Builder'
and page_key in ('academy','business_centre','compute','digital_business','fabrication','print')
and body in ('Managed content for IHLink Academy.','Managed content for the Business & Innovation Centre.','Managed content for IHLink AI & Compute.','Managed content for IHLink Digital Business Centre.','Managed content for IHLink 3D & Fabrication Lab.','Managed content for IHLink Print & Branding.')
and image_url is null and cta_label is null and cta_link is null;
-- Fulfilment and specialist job records advance in the same transaction.
create or replace function private.business_sync_fulfilment() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.status is distinct from old.status and new.status in ('reviewing','in_progress','completed') then
  if new.unit_code='fabrication' then update public.fabrication_jobs set status=new.status where order_id=new.id;
  elsif new.unit_code='compute' then update public.compute_jobs set status=new.status where order_id=new.id;
  end if;
 end if;return new;
end $$;
create trigger business_sync_fulfilment after update of status on public.business_orders for each row execute function private.business_sync_fulfilment();
create policy compute_usage_delete_permission on public.compute_usage_records as restrictive for delete to authenticated using(private.business_staff_allowed('compute','delete'));

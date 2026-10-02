create table if not exists public.academy_certificate_templates (
 id uuid primary key default gen_random_uuid(),
 name text not null default 'Academy Certificate',
 template_type text not null default 'certificate',
 storage_path text,
 original_filename text,
 mime_type text,
 logo_storage_path text,
 settings jsonb not null default '{}'::jsonb,
 field_mappings jsonb not null default '[]'::jsonb,
 is_active boolean not null default true,
 is_default boolean not null default false,
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.academy_certificate_templates enable row level security;
create policy "academy certificate templates admin manage" on public.academy_certificate_templates for all to authenticated using (private.is_admin(array['super_admin']::public.user_role[])) with check (private.is_admin(array['super_admin']::public.user_role[]));
create index if not exists academy_certificate_templates_active_idx on public.academy_certificate_templates(is_active,is_default);

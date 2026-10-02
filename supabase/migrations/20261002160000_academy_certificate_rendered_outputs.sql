alter table public.academy_certificates add column if not exists template_id uuid references public.academy_certificate_templates(id) on delete set null;
alter table public.academy_certificates add column if not exists output_storage_path text;
alter table public.academy_certificates add column if not exists rendered_at timestamptz;
alter table public.academy_certificates add column if not exists issued_by uuid references auth.users(id) on delete set null;
create unique index if not exists academy_certificates_one_per_enrollment_idx on public.academy_certificates(enrollment_id);
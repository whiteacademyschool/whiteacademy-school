-- White Academy CMS
-- Run this complete file once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.cms_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.cms_content (
  id uuid primary key default gen_random_uuid(),
  page_path text not null,
  content_key text not null,
  content_type text not null check (content_type in ('text', 'image', 'link', 'seo')),
  value text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page_path, content_key)
);

create or replace function public.is_cms_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.cms_admins
    where user_id = auth.uid()
  );
$$;

create or replace function public.set_cms_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cms_content_updated_at on public.cms_content;
create trigger cms_content_updated_at
before update on public.cms_content
for each row execute function public.set_cms_updated_at();

alter table public.cms_admins enable row level security;
alter table public.cms_content enable row level security;
alter table public.cms_content replica identity full;

drop policy if exists "Admin can view own CMS access" on public.cms_admins;
create policy "Admin can view own CMS access"
on public.cms_admins
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Website visitors can read CMS content" on public.cms_content;
create policy "Website visitors can read CMS content"
on public.cms_content
for select
to anon, authenticated
using (true);

drop policy if exists "CMS admin can insert content" on public.cms_content;
create policy "CMS admin can insert content"
on public.cms_content
for insert
to authenticated
with check (public.is_cms_admin());

drop policy if exists "CMS admin can update content" on public.cms_content;
create policy "CMS admin can update content"
on public.cms_content
for update
to authenticated
using (public.is_cms_admin())
with check (public.is_cms_admin());

drop policy if exists "CMS admin can delete content" on public.cms_content;
create policy "CMS admin can delete content"
on public.cms_content
for delete
to authenticated
using (public.is_cms_admin());

grant usage on schema public to anon, authenticated;
grant select on public.cms_content to anon, authenticated;
grant insert, update, delete on public.cms_content to authenticated;
grant select on public.cms_admins to authenticated;
grant execute on function public.is_cms_admin() to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cms-media',
  'cms-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view CMS media" on storage.objects;
create policy "Public can view CMS media"
on storage.objects
for select
to public
using (bucket_id = 'cms-media');

drop policy if exists "CMS admin can upload media" on storage.objects;
create policy "CMS admin can upload media"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'cms-media' and public.is_cms_admin());

drop policy if exists "CMS admin can update media" on storage.objects;
create policy "CMS admin can update media"
on storage.objects
for update
to authenticated
using (bucket_id = 'cms-media' and public.is_cms_admin())
with check (bucket_id = 'cms-media' and public.is_cms_admin());

drop policy if exists "CMS admin can delete media" on storage.objects;
create policy "CMS admin can delete media"
on storage.objects
for delete
to authenticated
using (bucket_id = 'cms-media' and public.is_cms_admin());

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'cms_content'
  ) then
    alter publication supabase_realtime add table public.cms_content;
  end if;
end;
$$;

-- After creating the single admin user in Authentication > Users, run:
-- insert into public.cms_admins (user_id)
-- select id from auth.users where email = 'admin@your-school-domain.com';

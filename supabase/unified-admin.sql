-- White Academy unified admin: staff directory
-- Applied to production through Supabase migrations.

create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  designation text not null default '',
  qualification text not null default '',
  photo_url text not null default '',
  photo_storage_path text not null default '',
  sort_order integer not null default 0,
  status text not null default 'published' check (status in ('draft', 'published')),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists staff_members_public_order_idx
on public.staff_members (status, sort_order, created_at);

drop trigger if exists staff_members_updated_at on public.staff_members;
create trigger staff_members_updated_at
before update on public.staff_members
for each row execute function public.set_cms_updated_at();

alter table public.staff_members enable row level security;

drop policy if exists "Visitors can read published staff" on public.staff_members;
create policy "Visitors can read published staff" on public.staff_members
for select to anon, authenticated
using (status = 'published' or public.is_cms_admin());

drop policy if exists "CMS admin can manage staff" on public.staff_members;
create policy "CMS admin can manage staff" on public.staff_members
for all to authenticated
using (public.is_cms_admin())
with check (public.is_cms_admin());

grant select on public.staff_members to anon, authenticated;
grant insert, update, delete on public.staff_members to authenticated;

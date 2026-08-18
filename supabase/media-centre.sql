-- White Academy Media Centre migration
-- Run this file once in Supabase SQL Editor after supabase/cms.sql.

create table if not exists public.event_albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null default '',
  event_date date,
  cover_image_url text not null default '',
  cover_storage_path text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.event_albums(id) on delete cascade,
  image_url text not null,
  storage_path text not null,
  caption text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.news_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text not null default '',
  content text not null default '',
  cover_image_url text not null default '',
  cover_storage_path text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.news_photos (
  id uuid primary key default gen_random_uuid(),
  news_id uuid not null references public.news_posts(id) on delete cascade,
  image_url text not null,
  storage_path text not null,
  caption text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists event_albums_public_order_idx on public.event_albums (status, event_date desc);
create index if not exists event_photos_album_order_idx on public.event_photos (album_id, sort_order, created_at);
create index if not exists news_posts_public_order_idx on public.news_posts (status, published_at desc);
create index if not exists news_photos_post_order_idx on public.news_photos (news_id, sort_order, created_at);

drop trigger if exists event_albums_updated_at on public.event_albums;
create trigger event_albums_updated_at before update on public.event_albums
for each row execute function public.set_cms_updated_at();

drop trigger if exists news_posts_updated_at on public.news_posts;
create trigger news_posts_updated_at before update on public.news_posts
for each row execute function public.set_cms_updated_at();

alter table public.event_albums enable row level security;
alter table public.event_photos enable row level security;
alter table public.news_posts enable row level security;
alter table public.news_photos enable row level security;

drop policy if exists "Visitors can read published event albums" on public.event_albums;
create policy "Visitors can read published event albums" on public.event_albums
for select to anon, authenticated using (status = 'published' or public.is_cms_admin());

drop policy if exists "Visitors can read published event photos" on public.event_photos;
create policy "Visitors can read published event photos" on public.event_photos
for select to anon, authenticated using (
  exists (select 1 from public.event_albums where id = album_id and (status = 'published' or public.is_cms_admin()))
);

drop policy if exists "Visitors can read published news" on public.news_posts;
create policy "Visitors can read published news" on public.news_posts
for select to anon, authenticated using (status = 'published' or public.is_cms_admin());

drop policy if exists "Visitors can read published news photos" on public.news_photos;
create policy "Visitors can read published news photos" on public.news_photos
for select to anon, authenticated using (
  exists (select 1 from public.news_posts where id = news_id and (status = 'published' or public.is_cms_admin()))
);

drop policy if exists "CMS admin can manage event albums" on public.event_albums;
create policy "CMS admin can manage event albums" on public.event_albums
for all to authenticated using (public.is_cms_admin()) with check (public.is_cms_admin());

drop policy if exists "CMS admin can manage event photos" on public.event_photos;
create policy "CMS admin can manage event photos" on public.event_photos
for all to authenticated using (public.is_cms_admin()) with check (public.is_cms_admin());

drop policy if exists "CMS admin can manage news" on public.news_posts;
create policy "CMS admin can manage news" on public.news_posts
for all to authenticated using (public.is_cms_admin()) with check (public.is_cms_admin());

drop policy if exists "CMS admin can manage news photos" on public.news_photos;
create policy "CMS admin can manage news photos" on public.news_photos
for all to authenticated using (public.is_cms_admin()) with check (public.is_cms_admin());

grant select on public.event_albums, public.event_photos, public.news_posts, public.news_photos to anon, authenticated;
grant insert, update, delete on public.event_albums, public.event_photos, public.news_posts, public.news_photos to authenticated;

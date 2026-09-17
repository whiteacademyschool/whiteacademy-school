create table if not exists public.disclosure_documents (
  id uuid primary key default gen_random_uuid(),
  document_key text not null unique,
  title text not null,
  description text not null default '',
  pdf_url text not null default '',
  pdf_storage_path text not null default '',
  sort_order integer not null default 0,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists disclosure_documents_updated_at on public.disclosure_documents;
create trigger disclosure_documents_updated_at
before update on public.disclosure_documents
for each row execute function public.set_cms_updated_at();

alter table public.disclosure_documents enable row level security;

drop policy if exists "Visitors can read disclosures" on public.disclosure_documents;
create policy "Visitors can read disclosures"
on public.disclosure_documents for select
using (true);

drop policy if exists "CMS admin can manage disclosures" on public.disclosure_documents;
create policy "CMS admin can manage disclosures"
on public.disclosure_documents for all
using (public.is_cms_admin())
with check (public.is_cms_admin());

grant select on public.disclosure_documents to anon;
grant select, insert, update, delete on public.disclosure_documents to authenticated;

insert into public.disclosure_documents (document_key, title, description, sort_order)
values
  ('cbse-affiliation-letter', 'CBSE Affiliation Letter', 'Official affiliation document issued for school recognition.', 1),
  ('grant-letter', 'Grant Letter', 'School grant letter and related approval documentation.', 2),
  ('building-certificate', 'Building Certificate', 'Campus building safety and structural compliance certificate.', 3),
  ('deo-certificate', 'DEO Certificate', 'District Education Officer certificate and verification record.', 4),
  ('fire-certificate', 'Fire Certificate', 'Fire safety certificate and inspection compliance document.', 5),
  ('noc', 'NOC', 'No Objection Certificate issued by the concerned authority.', 6),
  ('pta-certificate', 'PTA Certificate', 'Parent Teacher Association related certificate and details.', 7),
  ('smc-certificate', 'SMC Certificate', 'School Management Committee certificate and disclosure.', 8),
  ('trust-certificate', 'Trust Certificate', 'Trust registration and institutional foundation document.', 9),
  ('water-health-certificate', 'Water Health Certificate', 'Water quality and health safety verification certificate.', 10),
  ('academic-calendar', 'Academic Calendar', 'School academic calendar for the current academic session.', 11),
  ('fee-structure', 'Fee Structure', 'Approved fee details and school fee structure information.', 12),
  ('three-year-result', 'Three Year Result', 'Three year academic result summary and performance record.', 13)
on conflict (document_key) do update
set title = excluded.title,
    description = excluded.description,
    sort_order = excluded.sort_order;

update storage.buckets
set file_size_limit = 20971520,
    allowed_mime_types = array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml',
      'application/pdf'
    ]
where id = 'cms-media';

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'disclosure_documents'
  ) then
    alter publication supabase_realtime add table public.disclosure_documents;
  end if;
end
$$;

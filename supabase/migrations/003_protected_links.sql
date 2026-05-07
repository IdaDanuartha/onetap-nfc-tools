-- ============================================================
-- Migration: 003_protected_links.sql
-- Description: Password-protected NFC redirect links (A3)
-- ============================================================

create table if not exists public.protected_links (
  id             uuid primary key default uuid_generate_v4(),
  tag_id         text,
  original_url   text not null,
  is_protected   boolean not null default false,
  password_hash  text,
  token          text unique not null,
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger protected_links_updated_at
  before update on public.protected_links
  for each row execute procedure public.handle_updated_at();

create index if not exists protected_links_token_idx on public.protected_links(token);

alter table public.protected_links enable row level security;

-- Anyone can read (needed for the public redirect page)
create policy "Anyone can read protected_links by token"
  on public.protected_links for select
  using (true);

-- Only authenticated users can create links
create policy "Authenticated users can insert protected_links"
  on public.protected_links for insert
  to authenticated
  with check (created_by = auth.uid());

-- Only owners can update/delete
create policy "Owners can update protected_links"
  on public.protected_links for update
  to authenticated
  using (created_by = auth.uid());

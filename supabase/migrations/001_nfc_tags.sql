-- ============================================================
-- Migration: 001_nfc_tags.sql
-- Description: Create nfc_tags and activity_logs tables
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUM Types
-- ============================================================
create type nfc_tag_status as enum ('active', 'inactive', 'compromised');

create type activity_action as enum (
  'tag_registered',
  'tag_written',
  'tag_cleared',
  'tag_status_changed',
  'tag_scanned'
);

-- ============================================================
-- Table: nfc_tags
-- ============================================================
create table if not exists public.nfc_tags (
  id              uuid primary key default uuid_generate_v4(),
  serial_number   text not null unique,
  label           text,
  payload_data    jsonb default '{}'::jsonb,
  status          nfc_tag_status not null default 'inactive',
  last_scanned_at timestamptz,
  assigned_to     text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger nfc_tags_updated_at
  before update on public.nfc_tags
  for each row execute procedure public.handle_updated_at();

-- ============================================================
-- Table: activity_logs
-- ============================================================
create table if not exists public.activity_logs (
  id           uuid primary key default uuid_generate_v4(),
  action       activity_action not null,
  tag_id       uuid references public.nfc_tags(id) on delete set null,
  performed_by uuid references auth.users(id) on delete set null,
  metadata     jsonb default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

-- Enable RLS
alter table public.nfc_tags enable row level security;
alter table public.activity_logs enable row level security;

-- nfc_tags policies: authenticated users can read/write
create policy "Authenticated users can read nfc_tags"
  on public.nfc_tags for select
  to authenticated
  using (true);

create policy "Authenticated users can insert nfc_tags"
  on public.nfc_tags for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update nfc_tags"
  on public.nfc_tags for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete nfc_tags"
  on public.nfc_tags for delete
  to authenticated
  using (true);

-- activity_logs policies: authenticated users can read/insert (no delete/update)
create policy "Authenticated users can read activity_logs"
  on public.activity_logs for select
  to authenticated
  using (true);

create policy "Authenticated users can insert activity_logs"
  on public.activity_logs for insert
  to authenticated
  with check (performed_by = auth.uid());

-- ============================================================
-- Indexes for performance
-- ============================================================
create index if not exists nfc_tags_serial_number_idx on public.nfc_tags(serial_number);
create index if not exists nfc_tags_status_idx on public.nfc_tags(status);
create index if not exists nfc_tags_created_by_idx on public.nfc_tags(created_by);
create index if not exists activity_logs_performed_by_idx on public.activity_logs(performed_by);
create index if not exists activity_logs_tag_id_idx on public.activity_logs(tag_id);
create index if not exists activity_logs_created_at_idx on public.activity_logs(created_at desc);

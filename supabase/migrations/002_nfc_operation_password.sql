-- ============================================================
-- Migration: 002_nfc_operation_password.sql
-- Description: Store NFC operation password hash per user
-- ============================================================

create table if not exists public.nfc_operation_passwords (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  password_hash text not null,
  enabled      boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique(user_id)
);

-- Auto-update updated_at
create trigger nfc_op_password_updated_at
  before update on public.nfc_operation_passwords
  for each row execute procedure public.handle_updated_at();

-- Row Level Security
alter table public.nfc_operation_passwords enable row level security;

create policy "Users can manage their own NFC password"
  on public.nfc_operation_passwords
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================
-- Migration: 004_attendance.sql
-- Description: NFC Attendance system with Fonnte WA auto-send (A5)
-- ============================================================

create table if not exists public.attendance_tags (
  id               uuid primary key default uuid_generate_v4(),
  token            text unique not null,
  student_name     text not null,
  class_name       text not null,
  subject          text,
  teacher_phone    text not null,
  message_template text not null default '✅ *Absensi OneTap*

Siswa *{student_name}* hadir dalam kelas *{class_name}*
📅 {date}
🕐 {time} WIB',
  is_active        boolean not null default true,
  created_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger attendance_tags_updated_at
  before update on public.attendance_tags
  for each row execute procedure public.handle_updated_at();

create table if not exists public.attendance_logs (
  id           uuid primary key default uuid_generate_v4(),
  token        text not null,
  student_name text not null,
  class_name   text not null,
  tapped_at    timestamptz not null default now(),
  wa_sent      boolean not null default false,
  wa_error     text
);

create index if not exists attendance_tags_token_idx on public.attendance_tags(token);
create index if not exists attendance_logs_token_idx on public.attendance_logs(token);
create index if not exists attendance_logs_tapped_at_idx on public.attendance_logs(tapped_at desc);

alter table public.attendance_tags enable row level security;
alter table public.attendance_logs enable row level security;

-- Attendance tags: anyone can read (for public tap page)
create policy "Anyone can read attendance_tags"
  on public.attendance_tags for select using (true);

create policy "Authenticated users can manage attendance_tags"
  on public.attendance_tags for all
  to authenticated
  using (true) with check (true);

-- Attendance logs: anyone can insert (for tap page), authenticated can read
create policy "Anyone can insert attendance_logs"
  on public.attendance_logs for insert
  with check (true);

create policy "Authenticated users can read attendance_logs"
  on public.attendance_logs for select
  to authenticated
  using (true);

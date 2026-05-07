-- ============================================================
-- Migration: 005_linktree.sql
-- Description: Linktree feature for OneTap Landing Page (L3)
-- Run this in your Supabase SQL Editor
-- ============================================================

-- User profiles (extends auth.users)
create table if not exists public.users_profile (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     varchar(100) unique not null,
  display_name varchar(255),
  bio          text,
  avatar_url   text,
  plan         varchar(20) not null default 'free',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Linktree pages
create table if not exists public.linktree_pages (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        varchar(255),
  bio          text,
  theme_id     varchar(100) not null default 'pink',
  is_published boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Links in a linktree page
create table if not exists public.linktree_links (
  id          uuid primary key default uuid_generate_v4(),
  page_id     uuid not null references public.linktree_pages(id) on delete cascade,
  label       varchar(255) not null,
  url         text not null,
  icon        varchar(100),
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  click_count integer not null default 0,
  created_at  timestamptz not null default now()
);

-- Indexes
create index if not exists users_profile_username_idx on public.users_profile(username);
create index if not exists linktree_pages_user_id_idx on public.linktree_pages(user_id);
create index if not exists linktree_links_page_id_idx on public.linktree_links(page_id);

-- Updated at triggers
create trigger users_profile_updated_at
  before update on public.users_profile
  for each row execute procedure public.handle_updated_at();

create trigger linktree_pages_updated_at
  before update on public.linktree_pages
  for each row execute procedure public.handle_updated_at();

-- Row Level Security
alter table public.users_profile enable row level security;
alter table public.linktree_pages enable row level security;
alter table public.linktree_links enable row level security;

-- users_profile policies
create policy "Public profiles are viewable by everyone"
  on public.users_profile for select using (true);

create policy "Users can insert their own profile"
  on public.users_profile for insert
  to authenticated
  with check (id = auth.uid());

create policy "Users can update their own profile"
  on public.users_profile for update
  to authenticated
  using (id = auth.uid());

-- linktree_pages policies
create policy "Published pages are viewable by everyone"
  on public.linktree_pages for select
  using (is_published = true or auth.uid() = user_id);

create policy "Users can manage their own pages"
  on public.linktree_pages for all
  to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- linktree_links policies
create policy "Links on published pages are viewable"
  on public.linktree_links for select
  using (
    exists (
      select 1 from public.linktree_pages
      where id = page_id and (is_published = true or user_id = auth.uid())
    )
  );

create policy "Users can manage links on their pages"
  on public.linktree_links for all
  to authenticated
  using (
    exists (select 1 from public.linktree_pages where id = page_id and user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.linktree_pages where id = page_id and user_id = auth.uid())
  );

-- Function to increment click_count atomically
create or replace function public.increment_link_click(link_id uuid)
returns void language sql security definer as $$
  update public.linktree_links
  set click_count = click_count + 1
  where id = link_id;
$$;

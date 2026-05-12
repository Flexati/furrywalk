-- Schema iniziale per community walks.
-- Esegui in Supabase: SQL Editor → New query → incolla → Run.

create extension if not exists "pgcrypto";

create table if not exists walks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  description text,
  distance_km numeric(6,2),
  duration_min int,
  route_geojson jsonb,
  city text,
  difficulty text check (difficulty in ('easy','medium','hard')),
  photo_url text,
  likes int default 0,
  created_at timestamptz default now()
);

create index if not exists walks_city_idx on walks(city);
create index if not exists walks_created_idx on walks(created_at desc);

alter table walks enable row level security;

drop policy if exists "read public walks" on walks;
create policy "read public walks" on walks
  for select using (true);

drop policy if exists "insert own walks" on walks;
create policy "insert own walks" on walks
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own walks" on walks;
create policy "update own walks" on walks
  for update using (auth.uid() = user_id);

drop policy if exists "delete own walks" on walks;
create policy "delete own walks" on walks
  for delete using (auth.uid() = user_id);

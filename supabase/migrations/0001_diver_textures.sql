-- Seagrass Stories — P4 persistence: players + AI diver-texture history.
-- Run this in Supabase → SQL Editor (or via the Supabase CLI).
--
-- Storage: create a PUBLIC bucket named `diver-textures` in
-- Supabase → Storage (or it is created below). The server downloads each
-- Replicate image and uploads the bytes here, then stores the durable URL —
-- Replicate delivery URLs expire, this guarantees textures stay viewable.

-- ── players ──────────────────────────────────────────────────────────────
-- id = the anonymous Supabase auth uid (auth.users.id).
create table if not exists public.players (
  id                  uuid primary key references auth.users (id) on delete cascade,
  username            text not null default 'Diver',
  current_texture_id  uuid,
  last_seen           timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

-- ── diver_textures (per-player generation history) ───────────────────────
create table if not exists public.diver_textures (
  id            uuid primary key default gen_random_uuid(),
  player_id     uuid not null references public.players (id) on delete cascade,
  prompt        text not null,
  storage_path  text not null,        -- path inside the diver-textures bucket
  public_url    text not null,        -- durable URL served to the client
  created_at    timestamptz not null default now()
);

create index if not exists diver_textures_player_idx
  on public.diver_textures (player_id, created_at desc);

-- current_texture_id points at one of the player's textures
alter table public.players
  drop constraint if exists players_current_texture_fk;
alter table public.players
  add constraint players_current_texture_fk
  foreign key (current_texture_id) references public.diver_textures (id)
  on delete set null;

-- ── Row Level Security ───────────────────────────────────────────────────
-- Each anonymous player can only read/write their own row + textures.
alter table public.players        enable row level security;
alter table public.diver_textures enable row level security;

drop policy if exists "players: self read"   on public.players;
drop policy if exists "players: self write"  on public.players;
create policy "players: self read"  on public.players
  for select using (auth.uid() = id);
create policy "players: self write" on public.players
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "textures: self read"  on public.diver_textures;
drop policy if exists "textures: self write" on public.diver_textures;
create policy "textures: self read"  on public.diver_textures
  for select using (auth.uid() = player_id);
create policy "textures: self write" on public.diver_textures
  for all using (auth.uid() = player_id) with check (auth.uid() = player_id);

-- ── Storage bucket (public read) ─────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('diver-textures', 'diver-textures', true)
on conflict (id) do nothing;

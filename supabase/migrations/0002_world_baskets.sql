-- Seagrass Stories — multiplayer shared world: anchor baskets.
-- Run this in Supabase → SQL Editor (or via the Supabase CLI), AFTER 0001.
--
-- Baskets are the shared, persisted part of the world: any player can see them,
-- and the environment health is derived from the live count. Ephemeral state
-- (diver pose, emotes, suit textures) is synced over Realtime channels instead.

create table if not exists public.world_baskets (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references public.players (id) on delete cascade,
  x           double precision not null,
  y           double precision not null,
  z           double precision not null,
  created_at  timestamptz not null default now()
);

create index if not exists world_baskets_created_idx
  on public.world_baskets (created_at);

-- ── Row Level Security ───────────────────────────────────────────────────
-- Shared world: everyone (any signed-in anon player) can read all baskets;
-- a player may only insert/delete their own rows.
alter table public.world_baskets enable row level security;

drop policy if exists "baskets: read all"   on public.world_baskets;
drop policy if exists "baskets: insert own"  on public.world_baskets;
drop policy if exists "baskets: delete own"  on public.world_baskets;

create policy "baskets: read all" on public.world_baskets
  for select using (true);
create policy "baskets: insert own" on public.world_baskets
  for insert with check (auth.uid() = player_id);
create policy "baskets: delete own" on public.world_baskets
  for delete using (auth.uid() = player_id);

-- ── Realtime ─────────────────────────────────────────────────────────────
-- Publish row changes so clients get INSERT/DELETE events live.
alter publication supabase_realtime add table public.world_baskets;

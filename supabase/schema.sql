-- ================================================================
-- StockYard — database schema
-- Run this once in Supabase Dashboard -> SQL Editor -> New query -> Run
-- Safe to re-run: every statement is idempotent (create ... if not exists).
-- ================================================================

-- ── profiles ─────────────────────────────────────────────────────
-- One row per user, keyed to auth.users. Populated automatically on signup
-- (see trigger below) — never insert into this from the client.
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  email text,
  state text,
  rating numeric default 5.0,
  created_at timestamptz default now()
);

-- Auto-create a profile row whenever someone signs up.
-- AuthScreen's supabase.auth.signUp() passes full_name in options.data,
-- which lands in raw_user_meta_data here.
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── listings ─────────────────────────────────────────────────────
create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  head int,
  weight_avg int,
  price_per_cwt numeric,
  price_per_head numeric,
  category text,       -- Feeder, Stocker, Breeding, Slaughter
  sex text,             -- Steers, Heifers, Bulls, Cows, Mixed
  breed text,
  location_city text,
  location_state text,
  bvd_vaccinated boolean default false,
  brd_vaccinated boolean default false,
  weaned boolean default false,
  preconditioned boolean default false,
  delivery_available boolean default false,
  status text default 'active',   -- active, sold, expired
  views int default 0,
  created_at timestamptz default now()
);

-- ── favorites ────────────────────────────────────────────────────
create table if not exists favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  listing_id uuid references listings on delete cascade not null,
  created_at timestamptz default now(),
  unique (user_id, listing_id)
);

-- ── conversations + messages ─────────────────────────────────────
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings,
  buyer_id uuid references auth.users not null,
  seller_id uuid references auth.users not null,
  last_message text,
  last_message_at timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations on delete cascade not null,
  sender_id uuid references auth.users not null,
  body text not null,
  created_at timestamptz default now()
);

-- ── price_alerts ─────────────────────────────────────────────────
create table if not exists price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  category text,        -- Feeder, Live Cattle, All
  price_below numeric,
  price_above numeric,
  state text,
  active boolean default true,
  created_at timestamptz default now()
);

-- ── usda_price_cache ─────────────────────────────────────────────
-- Written by the usda-daily-sync edge function (service role, bypasses RLS).
-- Read directly by the app's useUsdaPrices() hook.
create table if not exists usda_price_cache (
  report_type text not null,
  report_date date not null,
  data jsonb not null,
  fetched_at timestamptz default now(),
  primary key (report_type, report_date)
);

-- ================================================================
-- Row Level Security
-- ================================================================

alter table profiles enable row level security;
alter table listings enable row level security;
alter table favorites enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table price_alerts enable row level security;
alter table usda_price_cache enable row level security;

-- profiles: publicly readable (needed for listing/favorite joins), only the
-- owner can edit their own row.
drop policy if exists "Profiles are publicly readable" on profiles;
create policy "Profiles are publicly readable" on profiles
  for select using (true);
drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- listings: anyone can see active listings; owners can also see/manage
-- their own listings regardless of status.
drop policy if exists "Active listings are public" on listings;
create policy "Active listings are public" on listings
  for select using (status = 'active' or auth.uid() = user_id);
drop policy if exists "Users can create own listings" on listings;
create policy "Users can create own listings" on listings
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own listings" on listings;
create policy "Users can update own listings" on listings
  for update using (auth.uid() = user_id);
drop policy if exists "Users can delete own listings" on listings;
create policy "Users can delete own listings" on listings
  for delete using (auth.uid() = user_id);

-- favorites: fully private to the owning user.
drop policy if exists "Users manage own favorites" on favorites;
create policy "Users manage own favorites" on favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- conversations: visible only to the two participants.
drop policy if exists "Participants can view conversation" on conversations;
create policy "Participants can view conversation" on conversations
  for select using (auth.uid() = buyer_id or auth.uid() = seller_id);
drop policy if exists "Participants can create conversation" on conversations;
create policy "Participants can create conversation" on conversations
  for insert with check (auth.uid() = buyer_id or auth.uid() = seller_id);
drop policy if exists "Participants can update conversation" on conversations;
create policy "Participants can update conversation" on conversations
  for update using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- messages: visible/insertable only by participants of the parent conversation.
drop policy if exists "Participants can view messages" on messages;
create policy "Participants can view messages" on messages
  for select using (
    exists (select 1 from conversations c
      where c.id = conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid()))
  );
drop policy if exists "Participants can send messages" on messages;
create policy "Participants can send messages" on messages
  for insert with check (
    auth.uid() = sender_id
    and exists (select 1 from conversations c
      where c.id = conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid()))
  );

-- price_alerts: fully private to the owning user.
drop policy if exists "Users manage own price alerts" on price_alerts;
create policy "Users manage own price alerts" on price_alerts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- usda_price_cache: public read-only. Writes come only from the edge
-- function's service-role key, which bypasses RLS entirely.
drop policy if exists "Price cache is publicly readable" on usda_price_cache;
create policy "Price cache is publicly readable" on usda_price_cache
  for select using (true);

-- ================================================================
-- RPC used by listing detail views (increments the view counter)
-- ================================================================
create or replace function increment_views(listing_id uuid)
returns void language sql as $$
  update listings set views = views + 1 where id = listing_id;
$$;

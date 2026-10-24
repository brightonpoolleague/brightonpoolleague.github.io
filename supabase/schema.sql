-- Brighton Pool League - Single Unified Supabase PostgreSQL Schema
-- Stores ALL Seasons, ALL Divisions (Premier League, Division 1, Division 2, Division 3),
-- Teams (with Captain PINs), Players, Fixtures, and League Settings in ONE database.

create extension if not exists "pgcrypto";

-- 1. League Settings (stores Master League Admin PIN)
create table if not exists public.league_settings (
  id text primary key default 'default',
  admin_pin text not null default '2026',
  updated_at timestamptz not null default now()
);

insert into public.league_settings (id, admin_pin)
values ('default', '2026')
on conflict (id) do nothing;

-- 2. Seasons (add new seasons anytime in the future within this same database)
create table if not exists public.seasons (
  id text primary key,
  name text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

insert into public.seasons (id, name, is_active)
values ('winter-2026-27', 'Winter 2026/27', true)
on conflict (id) do nothing;

-- 3. Teams (each team has a captain_pin managed by the League Admin)
create table if not exists public.teams (
  id text primary key,
  season_id text not null references public.seasons(id) on delete cascade,
  division text not null check (division in ('Premier League', 'Division 1', 'Division 2', 'Division 3')),
  name text not null,
  venue text not null,
  address text not null default '',
  captain_name text not null default '',
  captain_pin text not null default '1111',
  created_at timestamptz not null default now()
);

-- 4. Players (signed on to a team; a player is just their name)
create table if not exists public.players (
  id text primary key,
  team_id text not null references public.teams(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 5. Fixtures & Live Scorecards
create table if not exists public.fixtures (
  id text primary key,
  season_id text not null references public.seasons(id) on delete cascade,
  division text not null check (division in ('Premier League', 'Division 1', 'Division 2', 'Division 3')),
  match_date date not null,
  week_number integer not null default 1,
  home_team_id text not null references public.teams(id) on delete cascade,
  away_team_id text not null references public.teams(id) on delete cascade,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'submitted', 'approved')),
  lag_winner text check (lag_winner in ('home', 'away')),
  home_set1_locked boolean not null default false,
  away_set1_locked boolean not null default false,
  lineups jsonb not null default '{
    "set1": {"home": [null,null,null,null,null], "away": [null,null,null,null,null]},
    "set2": {"home": [null,null,null,null,null], "away": [null,null,null,null,null]},
    "set3": {"home": [null,null,null,null,null], "away": [null,null,null,null,null]}
  }'::jsonb,
  frames jsonb not null default '[]'::jsonb,
  home_captain_signed boolean not null default false,
  away_captain_signed boolean not null default false,
  submitted_at timestamptz,
  approved_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Enable Realtime on all tables
alter publication supabase_realtime add table public.seasons;
alter publication supabase_realtime add table public.teams;
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.fixtures;

-- Enable Row-Level Security
alter table public.league_settings enable row level security;
alter table public.seasons enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.fixtures enable row level security;

create policy "Allow public access to league_settings" on public.league_settings for all using (true) with check (true);
create policy "Allow public access to seasons" on public.seasons for all using (true) with check (true);
create policy "Allow public access to teams" on public.teams for all using (true) with check (true);
create policy "Allow public access to players" on public.players for all using (true) with check (true);
create policy "Allow public access to fixtures" on public.fixtures for all using (true) with check (true);

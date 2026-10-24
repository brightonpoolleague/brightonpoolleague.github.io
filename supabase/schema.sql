-- Brighton Pool League - Supabase PostgreSQL Schema & Row-Level Security
-- Run this script in your Supabase SQL Editor to set up the database.

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- 1. Seasons & Divisions
create table if not exists public.seasons (
  id text primary key,
  name text not null,
  is_active boolean not null default false,
  halfway_date date,
  created_at timestamptz not null default now()
);

-- 2. Teams
create table if not exists public.teams (
  id text primary key,
  season_id text not null references public.seasons(id) on delete cascade,
  division text not null check (division in ('Premier League', 'Division 1', 'Division 2', 'Division 3')),
  name text not null,
  venue text not null,
  address text not null default '',
  captain_name text not null default '',
  captain_email text,
  created_at timestamptz not null default now()
);

-- 3. Players (A player belongs to a team and is identified by their name)
create table if not exists public.players (
  id text primary key,
  team_id text not null references public.teams(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 4. User Roles / Profiles (maps Supabase Auth users to 'admin' or 'captain' + team_id)
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'captain', 'viewer')),
  team_id text references public.teams(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 5. Fixtures & Scorecards
-- Stores the fixture details, Set 1-3 lineups (slots 1..5 for home and away),
-- lag winner ('home' | 'away'), blind lineup submission locks, and all 15 frames as JSONB
-- plus denormalized frame scores for fast querying and realtime updates.
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
  home_captain_Signed boolean not null default false,
  away_captain_Signed boolean not null default false,
  submitted_at timestamptz,
  approved_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Enable Realtime on fixtures and teams/players
alter publication supabase_realtime add table public.fixtures;
alter publication supabase_realtime add table public.teams;
alter publication supabase_realtime add table public.players;

-- Row-Level Security (RLS)
alter table public.seasons enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.user_profiles enable row level security;
alter table public.fixtures enable row level security;

-- Helper functions for RLS
create or replace function public.is_league_admin()
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.user_profiles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.user_captain_team_id()
returns text
language sql
security definer
as $$
  select team_id from public.user_profiles
  where user_id = auth.uid() and role = 'captain'
  limit 1;
$$;

-- Read access for everyone (General Read-Only Users)
create policy "Public read seasons" on public.seasons for select using (true);
create policy "Public read teams" on public.teams for select using (true);
create policy "Public read players" on public.players for select using (true);
create policy "Public read fixtures" on public.fixtures for select using (true);
create policy "Users can read own profile" on public.user_profiles for select using (auth.uid() = user_id or public.is_league_admin());

-- League Admin full write access
create policy "Admin full access seasons" on public.seasons for all using (public.is_league_admin());
create policy "Admin full access teams" on public.teams for all using (public.is_league_admin());
create policy "Admin full access players" on public.players for all using (public.is_league_admin());
create policy "Admin full access profiles" on public.user_profiles for all using (public.is_league_admin());
create policy "Admin full access fixtures" on public.fixtures for all using (public.is_league_admin());

-- Team Captain write access: only their own fixtures and only when status != 'approved'
create policy "Captain can update own unapproved fixtures"
  on public.fixtures
  for update
  using (
    status <> 'approved'
    and (
      home_team_id = public.user_captain_team_id()
      or away_team_id = public.user_captain_team_id()
    )
  )
  with check (
    status in ('scheduled', 'live', 'submitted')
    and (
      home_team_id = public.user_captain_team_id()
      or away_team_id = public.user_captain_team_id()
    )
  );

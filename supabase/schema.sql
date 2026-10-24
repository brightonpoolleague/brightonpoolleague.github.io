-- Brighton Pool League - Single Unified Supabase PostgreSQL Schema
-- Stores ALL Seasons, ALL Divisions (Premier League, Division 1, Division 2, Division 3),
-- Teams, Players, Fixtures, and Server-Side Protected PINs in ONE database.

create extension if not exists "pgcrypto";

-- 1. Private League Settings (stores Master League Admin PIN - NO public read access!)
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

-- 3. Teams (public team info; PINs are stored separately in private team_pins table)
create table if not exists public.teams (
  id text primary key,
  season_id text not null references public.seasons(id) on delete cascade,
  division text not null check (division in ('Premier League', 'Division 1', 'Division 2', 'Division 3')),
  name text not null,
  venue text not null,
  address text not null default '',
  captain_name text not null default '',
  created_at timestamptz not null default now()
);

-- 4. Private Team Captain PINs (NO public read access so players cannot inspect PINs in DevTools!)
create table if not exists public.team_pins (
  team_id text primary key references public.teams(id) on delete cascade,
  captain_pin text not null default '1111',
  updated_at timestamptz not null default now()
);

-- 5. Players (signed on to a team; a player is just their name)
create table if not exists public.players (
  id text primary key,
  team_id text not null references public.teams(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 6. Fixtures & Live Scorecards
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

-- Enable Realtime on public tables
alter publication supabase_realtime add table public.seasons;
alter publication supabase_realtime add table public.teams;
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.fixtures;

-- Enable Row-Level Security
alter table public.league_settings enable row level security;
alter table public.team_pins enable row level security;
alter table public.seasons enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.fixtures enable row level security;

-- Notice: NO public policies on league_settings or team_pins!
-- They can ONLY be accessed via the server-side SECURITY DEFINER functions below.

create policy "Allow public access to seasons" on public.seasons for all using (true) with check (true);
create policy "Allow public access to teams" on public.teams for all using (true) with check (true);
create policy "Allow public access to players" on public.players for all using (true) with check (true);
create policy "Allow public access to fixtures" on public.fixtures for all using (true) with check (true);

-- ============================================================================
-- SERVER-SIDE PIN VERIFICATION & MANAGEMENT FUNCTIONS (RPC)
-- Runs inside Supabase PostgreSQL so PINs are never exposed to the public!
-- ============================================================================

-- 1. Verify Master League Admin PIN
create or replace function public.verify_admin_pin(p_pin text)
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.league_settings
    where id = 'default' and trim(admin_pin) = trim(p_pin)
  );
$$;

-- 2. Verify Team Captain PIN (or Master Admin PIN)
create or replace function public.verify_captain_pin(p_team_id text, p_pin text)
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.team_pins
    where team_id = p_team_id and trim(captain_pin) = trim(p_pin)
  ) or public.verify_admin_pin(p_pin);
$$;

-- 3. Fetch all Team PINs (ONLY returns rows if caller supplies the valid Master Admin PIN)
create or replace function public.get_all_team_pins(p_admin_pin text)
returns table(team_id text, captain_pin text)
language sql
security definer
as $$
  select tp.team_id, tp.captain_pin
  from public.team_pins tp
  where public.verify_admin_pin(p_admin_pin);
$$;

-- 4. Set or Update a Team's Captain PIN (requires valid Master Admin PIN)
create or replace function public.set_team_pin(p_admin_pin text, p_team_id text, p_new_pin text)
returns boolean
language plpgsql
security definer
as $$
begin
  if not public.verify_admin_pin(p_admin_pin) then
    return false;
  end if;

  insert into public.team_pins (team_id, captain_pin, updated_at)
  values (p_team_id, trim(p_new_pin), now())
  on conflict (team_id) do update
    set captain_pin = excluded.captain_pin,
        updated_at = now();

  return true;
end;
$$;

-- 5. Update the Master League Admin PIN (requires current valid Master Admin PIN)
create or replace function public.set_admin_pin(p_current_admin_pin text, p_new_admin_pin text)
returns boolean
language plpgsql
security definer
as $$
begin
  if not public.verify_admin_pin(p_current_admin_pin) then
    return false;
  end if;

  update public.league_settings
  set admin_pin = trim(p_new_admin_pin),
      updated_at = now()
  where id = 'default';

  return true;
end;
$$;

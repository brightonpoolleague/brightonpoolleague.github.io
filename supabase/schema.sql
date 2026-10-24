-- Brighton Pool League - Single Unified Supabase PostgreSQL Schema
-- Stores ALL Seasons, Dynamic Divisions per Season (defaulting to Premier League, Division 1, Division 2, Division 3),
-- Teams, Players, Fixtures, and Server-Side Protected PINs in ONE database.
-- All database permissions strictly mirror UI permissions via Row Level Security + RPCs.

create extension if not exists "pgcrypto";

-- 1. Private League Settings (stores Master League Admin PIN - NO public read/write access!)
create table if not exists public.league_settings (
  id text primary key default 'default',
  admin_pin text not null default '0000',
  updated_at timestamptz not null default now()
);

insert into public.league_settings (id, admin_pin)
values ('default', '0000')
on conflict (id) do nothing;

-- 2. Seasons (add new seasons & custom divisions anytime in the future within this same database)
create table if not exists public.seasons (
  id text primary key,
  name text not null,
  is_active boolean not null default false,
  divisions jsonb not null default '["Premier League", "Division 1", "Division 2", "Division 3"]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.seasons
  add column if not exists divisions jsonb not null default '["Premier League", "Division 1", "Division 2", "Division 3"]'::jsonb;

insert into public.seasons (id, name, is_active, divisions)
values (
  'winter-2026-27',
  'Winter 2026/27',
  true,
  '["Premier League", "Division 1", "Division 2", "Division 3"]'::jsonb
)
on conflict (id) do nothing;

-- 3. Teams (public team info; PINs are stored separately in private team_pins table)
create table if not exists public.teams (
  id text primary key,
  season_id text not null references public.seasons(id) on delete cascade,
  division text not null,
  name text not null,
  venue text not null,
  address text not null default '',
  captain_name text not null default '',
  created_at timestamptz not null default now()
);

-- Drop any legacy fixed division check constraint so Admins can add new divisions freely
alter table public.teams drop constraint if exists teams_division_check;

-- 4. Private Team Captain PINs (NO public read/write access so PINs are never exposed in DevTools!)
create table if not exists public.team_pins (
  team_id text primary key references public.teams(id) on delete cascade,
  captain_pin text not null default '11111111',
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
  division text not null,
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

alter table public.fixtures drop constraint if exists fixtures_division_check;

-- Enable Realtime on public tables (safe if already added)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'seasons'
  ) then
    alter publication supabase_realtime add table public.seasons;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'teams'
  ) then
    alter publication supabase_realtime add table public.teams;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'players'
  ) then
    alter publication supabase_realtime add table public.players;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'fixtures'
  ) then
    alter publication supabase_realtime add table public.fixtures;
  end if;
end
$$;

-- Enable Row-Level Security on ALL tables
alter table public.league_settings enable row level security;
alter table public.team_pins enable row level security;
alter table public.seasons enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.fixtures enable row level security;

-- Public tables are STRICTLY READ-ONLY (SELECT) for anonymous users.
-- All writes (INSERT / UPDATE / DELETE) MUST go through the PIN-verified RPC functions below!
-- Notice: league_settings and team_pins have NO public policies at all.
drop policy if exists "Allow public access to seasons" on public.seasons;
drop policy if exists "Allow public access to teams" on public.teams;
drop policy if exists "Allow public access to players" on public.players;
drop policy if exists "Allow public access to fixtures" on public.fixtures;
drop policy if exists "Allow public read-only access to seasons" on public.seasons;
drop policy if exists "Allow public read-only access to teams" on public.teams;
drop policy if exists "Allow public read-only access to players" on public.players;
drop policy if exists "Allow public read-only access to fixtures" on public.fixtures;

create policy "Allow public read-only access to seasons" on public.seasons for select using (true);
create policy "Allow public read-only access to teams" on public.teams for select using (true);
create policy "Allow public read-only access to players" on public.players for select using (true);
create policy "Allow public read-only access to fixtures" on public.fixtures for select using (true);

-- ============================================================================
-- SERVER-SIDE PIN VERIFICATION & ROLE-GATED WRITE FUNCTIONS (RPC)
-- Mirrors UI permissions 1-to-1 inside PostgreSQL:
--   • Public Viewer: Read-only
--   • Team Captain: Can ONLY update scorecard fields of their OWN team's
--                   unapproved fixtures (cannot edit other matches or approve)
--   • League Admin: Full control when valid Master Admin PIN is supplied
-- ============================================================================

-- 1. Verify Master League Admin PIN
create or replace function public.verify_admin_pin(p_pin text)
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.league_settings
    where id = 'default' and trim(admin_pin) = trim(coalesce(p_pin, ''))
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
    where team_id = p_team_id and trim(captain_pin) = trim(coalesce(p_pin, ''))
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
    raise exception 'Unauthorized: Invalid League Admin PIN';
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
    raise exception 'Unauthorized: Invalid current League Admin PIN';
  end if;

  update public.league_settings
  set admin_pin = trim(p_new_admin_pin),
      updated_at = now()
  where id = 'default';

  return true;
end;
$$;

-- 6. Captain Scorecard Save (Strictly restricted to the Captain's own team & unapproved matches)
create or replace function public.captain_save_fixture(
  p_fixture_id text,
  p_team_id text,
  p_pin text,
  p_status text,
  p_lag_winner text,
  p_home_set1_locked boolean,
  p_away_set1_locked boolean,
  p_lineups jsonb,
  p_frames jsonb,
  p_home_captain_signed boolean,
  p_away_captain_signed boolean,
  p_submitted_at timestamptz
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_fixture public.fixtures%rowtype;
begin
  -- Verify Captain PIN for the claimed team
  if not public.verify_captain_pin(p_team_id, p_pin) then
    raise exception 'Unauthorized: Invalid Captain PIN for this team';
  end if;

  -- Load the target fixture
  select * into v_fixture
  from public.fixtures
  where id = p_fixture_id;

  if not found then
    raise exception 'Fixture not found';
  end if;

  -- Ensure this Captain's team is actually the Home or Away team in this fixture
  if v_fixture.home_team_id <> p_team_id and v_fixture.away_team_id <> p_team_id then
    raise exception 'Forbidden: Team Captains can only update scorecards for their own team''s fixtures';
  end if;

  -- Ensure the fixture has not already been approved/locked by the League Admin
  if v_fixture.status = 'approved' then
    raise exception 'Forbidden: Approved fixtures are locked and can only be edited by the League Admin';
  end if;

  -- Ensure a Captain cannot set status to 'approved'
  if p_status not in ('scheduled', 'live', 'submitted') then
    raise exception 'Forbidden: Team Captains cannot mark a fixture as approved';
  end if;

  -- Perform scoped update of scorecard fields only
  update public.fixtures
  set status = p_status,
      lag_winner = p_lag_winner,
      home_set1_locked = p_home_set1_locked,
      away_set1_locked = p_away_set1_locked,
      lineups = p_lineups,
      frames = p_frames,
      home_captain_signed = p_home_captain_signed,
      away_captain_signed = p_away_captain_signed,
      submitted_at = p_submitted_at,
      updated_at = now()
  where id = p_fixture_id;

  return true;
end;
$$;

-- 7. Admin Scorecard Save / Approve / Reopen (Requires Master Admin PIN)
create or replace function public.admin_save_fixture(
  p_admin_pin text,
  p_fixture_id text,
  p_status text,
  p_lag_winner text,
  p_home_set1_locked boolean,
  p_away_set1_locked boolean,
  p_lineups jsonb,
  p_frames jsonb,
  p_home_captain_signed boolean,
  p_away_captain_signed boolean,
  p_submitted_at timestamptz,
  p_approved_at timestamptz
)
returns boolean
language plpgsql
security definer
as $$
begin
  if not public.verify_admin_pin(p_admin_pin) then
    raise exception 'Unauthorized: Invalid League Admin PIN';
  end if;

  update public.fixtures
  set status = p_status,
      lag_winner = p_lag_winner,
      home_set1_locked = p_home_set1_locked,
      away_set1_locked = p_away_set1_locked,
      lineups = p_lineups,
      frames = p_frames,
      home_captain_signed = p_home_captain_signed,
      away_captain_signed = p_away_captain_signed,
      submitted_at = p_submitted_at,
      approved_at = p_approved_at,
      updated_at = now()
  where id = p_fixture_id;

  return true;
end;
$$;

-- 8. Admin Upsert Season (with dynamic divisions per season)
create or replace function public.admin_upsert_season(
  p_admin_pin text,
  p_id text,
  p_name text,
  p_is_active boolean,
  p_divisions jsonb default '["Premier League", "Division 1", "Division 2", "Division 3"]'::jsonb
)
returns boolean
language plpgsql
security definer
as $$
begin
  if not public.verify_admin_pin(p_admin_pin) then
    raise exception 'Unauthorized: Invalid League Admin PIN';
  end if;

  if p_is_active then
    update public.seasons set is_active = false where id <> p_id;
  end if;

  insert into public.seasons (id, name, is_active, divisions)
  values (
    p_id,
    trim(p_name),
    p_is_active,
    coalesce(p_divisions, '["Premier League", "Division 1", "Division 2", "Division 3"]'::jsonb)
  )
  on conflict (id) do update
    set name = excluded.name,
        is_active = excluded.is_active,
        divisions = coalesce(p_divisions, public.seasons.divisions);

  return true;
end;
$$;

-- 9. Admin Upsert Team (+ optional Captain PIN)
create or replace function public.admin_upsert_team(
  p_admin_pin text,
  p_id text,
  p_season_id text,
  p_division text,
  p_name text,
  p_venue text,
  p_address text,
  p_captain_name text,
  p_captain_pin text default null
)
returns boolean
language plpgsql
security definer
as $$
begin
  if not public.verify_admin_pin(p_admin_pin) then
    raise exception 'Unauthorized: Invalid League Admin PIN';
  end if;

  insert into public.teams (id, season_id, division, name, venue, address, captain_name)
  values (p_id, p_season_id, p_division, trim(p_name), trim(p_venue), trim(coalesce(p_address, '')), trim(coalesce(p_captain_name, '')))
  on conflict (id) do update
    set division = excluded.division,
        name = excluded.name,
        venue = excluded.venue,
        address = excluded.address,
        captain_name = excluded.captain_name;

  if p_captain_pin is not null and length(trim(p_captain_pin)) > 0 then
    insert into public.team_pins (team_id, captain_pin, updated_at)
    values (p_id, trim(p_captain_pin), now())
    on conflict (team_id) do update
      set captain_pin = excluded.captain_pin,
          updated_at = now();
  end if;

  return true;
end;
$$;

-- 10. Admin Delete Team
create or replace function public.admin_delete_team(
  p_admin_pin text,
  p_team_id text
)
returns boolean
language plpgsql
security definer
as $$
begin
  if not public.verify_admin_pin(p_admin_pin) then
    raise exception 'Unauthorized: Invalid League Admin PIN';
  end if;

  delete from public.teams where id = p_team_id;
  return true;
end;
$$;

-- 11. Admin Upsert Player
create or replace function public.admin_upsert_player(
  p_admin_pin text,
  p_id text,
  p_team_id text,
  p_name text,
  p_active boolean default true
)
returns boolean
language plpgsql
security definer
as $$
begin
  if not public.verify_admin_pin(p_admin_pin) then
    raise exception 'Unauthorized: Invalid League Admin PIN';
  end if;

  insert into public.players (id, team_id, name, active)
  values (p_id, p_team_id, trim(p_name), p_active)
  on conflict (id) do update
    set team_id = excluded.team_id,
        name = excluded.name,
        active = excluded.active;

  return true;
end;
$$;

-- 12. Admin Delete Player
create or replace function public.admin_delete_player(
  p_admin_pin text,
  p_player_id text
)
returns boolean
language plpgsql
security definer
as $$
begin
  if not public.verify_admin_pin(p_admin_pin) then
    raise exception 'Unauthorized: Invalid League Admin PIN';
  end if;

  delete from public.players where id = p_player_id;
  return true;
end;
$$;

-- 13. Admin Create / Upsert Scheduled Fixture
create or replace function public.admin_upsert_fixture(
  p_admin_pin text,
  p_id text,
  p_season_id text,
  p_division text,
  p_match_date date,
  p_week_number integer,
  p_home_team_id text,
  p_away_team_id text,
  p_status text,
  p_lineups jsonb,
  p_frames jsonb
)
returns boolean
language plpgsql
security definer
as $$
begin
  if not public.verify_admin_pin(p_admin_pin) then
    raise exception 'Unauthorized: Invalid League Admin PIN';
  end if;

  insert into public.fixtures (
    id, season_id, division, match_date, week_number,
    home_team_id, away_team_id, status, lineups, frames, updated_at
  )
  values (
    p_id, p_season_id, p_division, p_match_date, p_week_number,
    p_home_team_id, p_away_team_id, p_status, p_lineups, p_frames, now()
  )
  on conflict (id) do update
    set division = excluded.division,
        match_date = excluded.match_date,
        week_number = excluded.week_number,
        home_team_id = excluded.home_team_id,
        away_team_id = excluded.away_team_id,
        status = excluded.status,
        lineups = excluded.lineups,
        frames = excluded.frames,
        updated_at = now();

  return true;
end;
$$;

-- 14. Admin Delete Fixture
create or replace function public.admin_delete_fixture(
  p_admin_pin text,
  p_fixture_id text
)
returns boolean
language plpgsql
security definer
as $$
begin
  if not public.verify_admin_pin(p_admin_pin) then
    raise exception 'Unauthorized: Invalid League Admin PIN';
  end if;

  delete from public.fixtures where id = p_fixture_id;
  return true;
end;
$$;

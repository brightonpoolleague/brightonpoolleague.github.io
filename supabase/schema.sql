-- Brighton Pool League - Single Unified Supabase PostgreSQL Schema
-- Stores ALL Seasons, Dynamic Divisions per Season (defaulting to Premier League, Division 1, Division 2, Division 3),
-- Teams, Players, Fixtures, and Server-Side Protected PINs in ONE database.
-- All database permissions strictly mirror UI permissions via Row Level Security + RPCs.

create extension if not exists "pgcrypto";

-- 1. Private League Settings (stores League Admin PIN - NO public read/write access!)
create table if not exists public.league_settings (
  id text primary key default 'default',
  admin_pin text not null default '000000',
  updated_at timestamptz not null default now()
);

insert into public.league_settings (id, admin_pin)
values ('default', '000000')
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
  table_number text not null default '',
  created_at timestamptz not null default now()
);

alter table public.teams add column if not exists table_number text not null default '';

-- Drop any legacy fixed division check constraint so Admins can add new divisions freely
alter table public.teams drop constraint if exists teams_division_check;

-- 4. Private Team PINs (NO public read/write access so PINs are never exposed in DevTools!)
create table if not exists public.team_pins (
  team_id text primary key references public.teams(id) on delete cascade,
  captain_pin text not null default '11111111',
  updated_at timestamptz not null default now()
);

-- Enforce unique Team PINs across all teams at the database level
create unique index if not exists idx_team_pins_unique_pin on public.team_pins (trim(captain_pin));

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
alter table public.fixtures alter column division drop not null;

-- Knockout and Cup Match Support (Winter Divisional Cups, Summer Cup & Summer Plate)
alter table public.fixtures add column if not exists match_type text not null default 'league';
alter table public.fixtures add column if not exists competition_name text;
alter table public.fixtures add column if not exists round text;
alter table public.fixtures add column if not exists play_all_frames boolean not null default false;
alter table public.fixtures add column if not exists knockout_format text default 'first_to_8';
alter table public.fixtures add column if not exists cup_name text;
alter table public.fixtures add column if not exists cup_round text;

-- Performance Indexes on Foreign Keys and Common Query Filters
create index if not exists idx_fixtures_season_id on public.fixtures(season_id);
create index if not exists idx_fixtures_match_date on public.fixtures(match_date);
create index if not exists idx_fixtures_status on public.fixtures(status);
create index if not exists idx_fixtures_teams on public.fixtures(home_team_id, away_team_id);
create index if not exists idx_teams_season_id on public.teams(season_id);
create index if not exists idx_players_team_id on public.players(team_id);

-- 7. Private Failed PIN Attempt Log (Used for automated brute-force rate-limiting)
create table if not exists public.pin_attempt_log (
  id bigserial primary key,
  identifier text not null,
  action text not null,
  attempted_at timestamptz not null default now()
);

create index if not exists idx_pin_attempt_log on public.pin_attempt_log(identifier, action, attempted_at);

-- 8. Private Unrevealed Set 1 Lineups (Keeps Set 1 running orders strictly secret in DevTools/Network until BOTH captains lock Set 1!)
create table if not exists public.fixture_private_lineups (
  fixture_id text primary key references public.fixtures(id) on delete cascade,
  home_set1 jsonb not null default '[null,null,null,null,null]'::jsonb,
  away_set1 jsonb not null default '[null,null,null,null,null]'::jsonb,
  updated_at timestamptz not null default now()
);

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
alter table public.pin_attempt_log enable row level security;
alter table public.fixture_private_lineups enable row level security;
alter table public.seasons enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.fixtures enable row level security;

-- Public tables are STRICTLY READ-ONLY (SELECT) for anonymous users.
-- All writes (INSERT / UPDATE / DELETE) MUST go through the PIN-verified RPC functions below!
-- Notice: league_settings, team_pins, pin_attempt_log, and fixture_private_lineups have NO public policies at all.
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

-- Notice: league_settings, team_pins, pin_attempt_log, and fixture_private_lineups have NO public policies.
-- Team PINs are strictly protected and only returned via get_all_team_pins(p_admin_pin)
-- when a valid League Admin PIN is provided.
drop policy if exists "Allow public read-only access to team_pins" on public.team_pins;

-- ============================================================================
-- SERVER-SIDE PIN VERIFICATION & ROLE-GATED WRITE FUNCTIONS (RPC)
-- Mirrors UI permissions 1-to-1 inside PostgreSQL:
--   • Public Viewer: Read-only
--   • Team Captain: Can ONLY update scorecard fields of their OWN team's
--                   unapproved/unsubmitted fixtures (cannot edit other matches or approve)
--   • League Admin: Full control when valid League Admin PIN is supplied
-- ============================================================================

-- ============================================================================
-- RATE LIMITING HELPERS & PIN VERIFICATION (BRUTE-FORCE SCRIPT PROTECTION)
-- Enforces a rate limit (max 20 failed attempts per 15 minutes per IP).
-- Adds an artificial 500ms delay on failed attempts to defeat fast dictionary attacks.
-- Internal helpers have PUBLIC/anon execute permissions revoked so attackers cannot reset counters.
-- ============================================================================

-- Extract client IP from Cloudflare or reverse proxy headers in Supabase
create or replace function public.get_request_client_ip()
returns text
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  v_headers json;
  v_ip text;
begin
  begin
    v_headers := current_setting('request.headers', true)::json;
    v_ip := coalesce(
      nullif(trim(v_headers->>'cf-connecting-ip'), ''),
      nullif(trim(split_part(v_headers->>'x-forwarded-for', ',', 1)), '')
    );
  exception when others then
    v_ip := null;
  end;

  return coalesce(v_ip, inet_client_addr()::text, 'unknown_client');
end;
$$;

-- Check whether the client IP has exceeded the failed PIN attempts threshold
create or replace function public.check_pin_rate_limit(p_action text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ip text;
  v_recent_failures int;
begin
  v_ip := public.get_request_client_ip();

  -- Periodically purge logs older than 1 hour to prevent table bloat
  delete from public.pin_attempt_log
  where attempted_at < now() - interval '1 hour';

  -- Count failed attempts in the last 15 minutes for this IP and action target
  select count(*) into v_recent_failures
  from public.pin_attempt_log
  where identifier = v_ip
    and action = p_action
    and attempted_at > now() - interval '15 minutes';

  -- Threshold: 20 failed attempts per 15 minutes
  if v_recent_failures >= 20 then
    raise exception 'Too many failed PIN attempts. Please wait 15 minutes before trying again.';
  end if;

  return v_ip;
end;
$$;

create or replace function public.record_failed_pin_attempt(p_ip text, p_action text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.pin_attempt_log (identifier, action, attempted_at)
  values (p_ip, p_action, now());

  -- Artificial 500ms delay on wrong PINs to eliminate rapid dictionary attacks
  perform pg_sleep(0.5);
end;
$$;

create or replace function public.clear_pin_rate_limit(p_ip text, p_action text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.pin_attempt_log
  where identifier = p_ip and action = p_action;
end;
$$;

-- Strictly revoke direct execution of internal rate-limiting helpers from public/anon/authenticated
revoke all on function public.get_request_client_ip() from public, anon, authenticated;
revoke all on function public.check_pin_rate_limit(text) from public, anon, authenticated;
revoke all on function public.record_failed_pin_attempt(text, text) from public, anon, authenticated;
revoke all on function public.clear_pin_rate_limit(text, text) from public, anon, authenticated;

-- 1. Verify League Admin PIN (with rate-limiting)
create or replace function public.verify_admin_pin(p_pin text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ip text;
  v_valid boolean;
begin
  v_ip := public.check_pin_rate_limit('admin');

  select exists (
    select 1 from public.league_settings
    where id = 'default' and trim(admin_pin) = trim(coalesce(p_pin, ''))
  ) into v_valid;

  if v_valid then
    perform public.clear_pin_rate_limit(v_ip, 'admin');
    return true;
  else
    perform public.record_failed_pin_attempt(v_ip, 'admin');
    return false;
  end if;
end;
$$;

-- 2. Verify Team PIN or League Admin PIN (with rate-limiting per team & IP)
create or replace function public.verify_captain_pin(p_team_id text, p_pin text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ip text;
  v_valid boolean;
  v_action text;
begin
  v_action := 'captain:' || coalesce(p_team_id, 'any');
  v_ip := public.check_pin_rate_limit(v_action);

  select exists (
    select 1 from public.team_pins
    where team_id = p_team_id and trim(captain_pin) = trim(coalesce(p_pin, ''))
  ) or exists (
    select 1 from public.league_settings
    where id = 'default' and trim(admin_pin) = trim(coalesce(p_pin, ''))
  ) into v_valid;

  if v_valid then
    perform public.clear_pin_rate_limit(v_ip, v_action);
    return true;
  else
    perform public.record_failed_pin_attempt(v_ip, v_action);
    return false;
  end if;
end;
$$;

-- 2b. Captain Login with PIN (identifies team purely from unique 6-digit PIN)
create or replace function public.login_captain_with_pin(p_pin text)
returns table(team_id text, team_name text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ip text;
  v_team_id text;
  v_team_name text;
begin
  v_ip := public.check_pin_rate_limit('captain_login');

  select tp.team_id, t.name
  into v_team_id, v_team_name
  from public.team_pins tp
  join public.teams t on t.id = tp.team_id
  where trim(tp.captain_pin) = trim(coalesce(p_pin, ''))
  limit 1;

  if v_team_id is not null then
    perform public.clear_pin_rate_limit(v_ip, 'captain_login');
    return query select v_team_id, v_team_name;
  else
    perform public.record_failed_pin_attempt(v_ip, 'captain_login');
    return;
  end if;
end;
$$;

-- 2c. Fetch own team's unrevealed Set 1 lineup (when Set 1 is not yet locked by both captains)
create or replace function public.get_my_private_set1_lineup(
  p_fixture_id text,
  p_team_id text,
  p_pin text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_fixture public.fixtures%rowtype;
  v_private public.fixture_private_lineups%rowtype;
begin
  if not public.verify_captain_pin(p_team_id, p_pin) then
    return '[null,null,null,null,null]'::jsonb;
  end if;

  select * into v_fixture from public.fixtures where id = p_fixture_id;
  if not found then
    return '[null,null,null,null,null]'::jsonb;
  end if;

  select * into v_private from public.fixture_private_lineups where fixture_id = p_fixture_id;
  if not found then
    if p_team_id = v_fixture.home_team_id then
      return coalesce(v_fixture.lineups->'set1'->'home', '[null,null,null,null,null]'::jsonb);
    elsif p_team_id = v_fixture.away_team_id then
      return coalesce(v_fixture.lineups->'set1'->'away', '[null,null,null,null,null]'::jsonb);
    end if;
    return '[null,null,null,null,null]'::jsonb;
  end if;

  if p_team_id = v_fixture.home_team_id then
    return v_private.home_set1;
  elsif p_team_id = v_fixture.away_team_id then
    return v_private.away_set1;
  end if;

  return '[null,null,null,null,null]'::jsonb;
end;
$$;

-- 3. Fetch all Team PINs (ONLY returns rows if caller supplies the valid League Admin PIN)
create or replace function public.get_all_team_pins(p_admin_pin text)
returns table(team_id text, captain_pin text)
language sql
security definer
set search_path = public, pg_temp
as $$
  select tp.team_id, tp.captain_pin
  from public.team_pins tp
  where public.verify_admin_pin(p_admin_pin);
$$;

-- 4. Set or Update a Team PIN (requires valid League Admin PIN and enforces uniqueness)
-- Note: Returns false instead of raising on invalid Admin PIN so pin_attempt_log commits!
create or replace function public.set_team_pin(p_admin_pin text, p_team_id text, p_new_pin text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.verify_admin_pin(p_admin_pin) then
    return false;
  end if;

  -- Prevent Team PIN from colliding with League Admin PIN
  if exists (
    select 1 from public.league_settings
    where id = 'default' and trim(admin_pin) = trim(coalesce(p_new_pin, ''))
  ) then
    raise exception 'This PIN matches the League Admin PIN. Team PINs must be unique.';
  end if;

  -- Enforce uniqueness across team PINs
  if exists (
    select 1 from public.team_pins
    where team_id <> p_team_id and trim(captain_pin) = trim(p_new_pin)
  ) then
    raise exception 'PIN "%" is already in use by another team. Team PINs must be unique.', p_new_pin;
  end if;

  insert into public.team_pins (team_id, captain_pin, updated_at)
  values (p_team_id, trim(p_new_pin), now())
  on conflict (team_id) do update
    set captain_pin = excluded.captain_pin,
        updated_at = now();

  return true;
end;
$$;

-- 5. League Admin PIN Management
-- Note: The League Admin PIN cannot be updated via website RPCs. It is managed strictly
-- in the Supabase Dashboard by the database owner to prevent any unauthorized takeover.
drop function if exists public.set_admin_pin(text, text);

-- 6. Captain Scorecard Save (Strictly restricted to the Captain's own team & unapproved/unsubmitted matches)
-- Uses row-level locking (FOR UPDATE) and side-aware JSON merging so two captains on separate
-- phones can enter Set 1 lineups or scores simultaneously without overwriting each other.
-- Keeps Set 1 lineups in private storage (fixture_private_lineups) and masks public.fixtures.lineups
-- with [null,null,null,null,null] until BOTH captains have locked Set 1!
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
  p_submitted_at timestamptz,
  p_edited_side text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_fixture public.fixtures%rowtype;
  v_private public.fixture_private_lineups%rowtype;
  v_null_slots jsonb := '[null,null,null,null,null]'::jsonb;
  v_real_home_s1 jsonb;
  v_real_away_s1 jsonb;
  v_public_home_s1 jsonb;
  v_public_away_s1 jsonb;
  v_public_home_s2 jsonb;
  v_public_away_s2 jsonb;
  v_public_home_s3 jsonb;
  v_public_away_s3 jsonb;
  v_merged_lineups jsonb;
  v_home_locked boolean;
  v_away_locked boolean;
  v_home_signed boolean;
  v_away_signed boolean;
  v_home_unlock_req boolean;
  v_away_unlock_req boolean;
  v_home_s2_locked boolean;
  v_away_s2_locked boolean;
  v_home_s3_locked boolean;
  v_away_s3_locked boolean;
  v_home_s2_unlock_req boolean;
  v_away_s2_unlock_req boolean;
  v_home_s3_unlock_req boolean;
  v_away_s3_unlock_req boolean;
  v_home_s2_pending boolean;
  v_away_s2_pending boolean;
  v_home_s3_pending boolean;
  v_away_s3_pending boolean;
  v_next_status text;
  v_next_frames jsonb;
  v_next_lag text;
begin
  -- Verify Team PIN for the claimed team (returns false instead of raising so pin_attempt_log commits!)
  if not public.verify_captain_pin(p_team_id, p_pin) then
    return false;
  end if;

  -- Lock the target fixture row to serialize simultaneous requests from Home & Away phones
  select * into v_fixture
  from public.fixtures
  where id = p_fixture_id
  for update;

  if not found then
    raise exception 'Fixture not found';
  end if;

  -- Ensure this Captain's team is actually the Home or Away team in this fixture
  if v_fixture.home_team_id <> p_team_id and v_fixture.away_team_id <> p_team_id then
    raise exception 'Forbidden: Team Captains can only update scorecards for their own team''s fixtures';
  end if;

  -- Ensure the fixture has not already been submitted or approved
  if v_fixture.status in ('submitted', 'approved') then
    raise exception 'Forbidden: Submitted or approved fixtures are locked and can only be edited by the League Admin';
  end if;

  -- Ensure a Captain cannot set status to 'approved'
  if p_status not in ('scheduled', 'live', 'submitted') then
    raise exception 'Forbidden: Team Captains cannot mark a fixture as approved';
  end if;

  -- Fetch or initialize private Set 1 lineup storage for this fixture
  select * into v_private
  from public.fixture_private_lineups
  where fixture_id = p_fixture_id
  for update;

  if not found then
    v_real_home_s1 := coalesce(v_fixture.lineups->'set1'->'home', v_null_slots);
    v_real_away_s1 := coalesce(v_fixture.lineups->'set1'->'away', v_null_slots);
  else
    v_real_home_s1 := coalesce(v_private.home_set1, v_fixture.lineups->'set1'->'home', v_null_slots);
    v_real_away_s1 := coalesce(v_private.away_set1, v_fixture.lineups->'set1'->'away', v_null_slots);
  end if;

  -- Side-aware merge to prevent two phones from overwriting each other's lineups/locks/signatures
  if p_edited_side = 'home' then
    v_home_locked := p_home_set1_locked;
    v_away_locked := v_fixture.away_set1_locked;
    v_home_signed := p_home_captain_signed;
    v_away_signed := v_fixture.away_captain_signed;
  elsif p_edited_side = 'away' then
    v_home_locked := v_fixture.home_set1_locked;
    v_away_locked := p_away_set1_locked;
    v_home_signed := v_fixture.home_captain_signed;
    v_away_signed := p_away_captain_signed;
  elsif p_edited_side = 'frames' then
    v_home_locked := v_fixture.home_set1_locked;
    v_away_locked := v_fixture.away_set1_locked;
    v_home_signed := v_fixture.home_captain_signed;
    v_away_signed := v_fixture.away_captain_signed;
  else
    v_home_locked := p_home_set1_locked;
    v_away_locked := p_away_set1_locked;
    v_home_signed := p_home_captain_signed;
    v_away_signed := p_away_captain_signed;
  end if;

  v_home_unlock_req := coalesce((v_fixture.lineups->'unlockRequested'->>'home')::boolean, false);
  v_away_unlock_req := coalesce((v_fixture.lineups->'unlockRequested'->>'away')::boolean, false);

  -- Enforce that a captain can ONLY modify lineups, Set 1 lock, and signature for their own team,
  -- and that once both captains have locked Set 1, unlocking requires BOTH captains to unlock.
  if p_team_id = v_fixture.home_team_id then
    if p_edited_side <> 'frames' and not (v_fixture.home_captain_signed or v_fixture.away_captain_signed) then
      v_home_unlock_req := coalesce((p_lineups->'unlockRequested'->>'home')::boolean, false);
      if not (v_fixture.home_set1_locked and v_fixture.away_set1_locked) then
        v_real_home_s1 := coalesce(p_lineups->'set1'->'home', v_real_home_s1);
      end if;
    end if;

    if v_fixture.home_set1_locked and v_fixture.away_set1_locked then
      if (v_home_unlock_req and v_away_unlock_req) or (not p_home_set1_locked and v_away_unlock_req) then
        v_home_locked := false;
        v_away_locked := false;
        v_home_unlock_req := false;
        v_away_unlock_req := false;
      else
        v_home_locked := true;
        v_away_locked := true;
      end if;
    else
      v_away_locked := v_fixture.away_set1_locked;
      if v_home_locked and v_away_locked then
        v_home_unlock_req := false;
        v_away_unlock_req := false;
      end if;
    end if;

    -- Merge Set 2 and Set 3 subs lock states and unlock requests
    -- Once locked, a captain cannot unilaterally unlock their own Set 2 / Set 3 substitutions
    v_home_s2_locked := coalesce((v_fixture.lineups->'subsLocked'->'set2'->>'home')::boolean, false)
      or coalesce((p_lineups->'subsLocked'->'set2'->>'home')::boolean, false);
    v_home_s3_locked := coalesce((v_fixture.lineups->'subsLocked'->'set3'->>'home')::boolean, false)
      or coalesce((p_lineups->'subsLocked'->'set3'->>'home')::boolean, false);
    v_home_s2_unlock_req := coalesce((p_lineups->'subsUnlockRequested'->'set2'->>'home')::boolean, false);
    v_home_s3_unlock_req := coalesce((p_lineups->'subsUnlockRequested'->'set3'->>'home')::boolean, false);
    v_home_s2_pending := coalesce((p_lineups->'subsPendingApproval'->'set2'->>'home')::boolean, false);
    v_home_s3_pending := coalesce((p_lineups->'subsPendingApproval'->'set3'->>'home')::boolean, false);

    if coalesce((v_fixture.lineups->'subsUnlockRequested'->'set2'->>'away')::boolean, false) and
       not coalesce((p_lineups->'subsLocked'->'set2'->>'away')::boolean, true) then
      v_away_s2_locked := false;
      v_away_s2_unlock_req := false;
    elsif coalesce((v_fixture.lineups->'subsPendingApproval'->'set2'->>'away')::boolean, false) and
          coalesce((p_lineups->'subsLocked'->'set2'->>'away')::boolean, false) then
      v_away_s2_locked := true;
      v_away_s2_pending := false;
      v_away_s2_unlock_req := false;
    else
      v_away_s2_locked := coalesce((v_fixture.lineups->'subsLocked'->'set2'->>'away')::boolean, false);
      v_away_s2_unlock_req := coalesce((v_fixture.lineups->'subsUnlockRequested'->'set2'->>'away')::boolean, false);
      v_away_s2_pending := coalesce((v_fixture.lineups->'subsPendingApproval'->'set2'->>'away')::boolean, false);
    end if;

    if coalesce((v_fixture.lineups->'subsUnlockRequested'->'set3'->>'away')::boolean, false) and
       not coalesce((p_lineups->'subsLocked'->'set3'->>'away')::boolean, true) then
      v_away_s3_locked := false;
      v_away_s3_unlock_req := false;
    elsif coalesce((v_fixture.lineups->'subsPendingApproval'->'set3'->>'away')::boolean, false) and
          coalesce((p_lineups->'subsLocked'->'set3'->>'away')::boolean, false) then
      v_away_s3_locked := true;
      v_away_s3_pending := false;
      v_away_s3_unlock_req := false;
    else
      v_away_s3_locked := coalesce((v_fixture.lineups->'subsLocked'->'set3'->>'away')::boolean, false);
      v_away_s3_unlock_req := coalesce((v_fixture.lineups->'subsUnlockRequested'->'set3'->>'away')::boolean, false);
      v_away_s3_pending := coalesce((v_fixture.lineups->'subsPendingApproval'->'set3'->>'away')::boolean, false);
    end if;

    v_public_home_s2 := case
      when p_edited_side = 'frames'
        or v_fixture.home_captain_signed
        or v_fixture.away_captain_signed
        or coalesce((v_fixture.lineups->'subsLocked'->'set2'->>'home')::boolean, false)
      then coalesce(v_fixture.lineups->'set2'->'home', p_lineups->'set2'->'home')
      else p_lineups->'set2'->'home'
    end;
    v_public_away_s2 := coalesce(v_fixture.lineups->'set2'->'away', p_lineups->'set2'->'away');
    v_public_home_s3 := case
      when p_edited_side = 'frames'
        or v_fixture.home_captain_signed
        or v_fixture.away_captain_signed
        or coalesce((v_fixture.lineups->'subsLocked'->'set3'->>'home')::boolean, false)
      then coalesce(v_fixture.lineups->'set3'->'home', p_lineups->'set3'->'home')
      else p_lineups->'set3'->'home'
    end;
    v_public_away_s3 := coalesce(v_fixture.lineups->'set3'->'away', p_lineups->'set3'->'away');
    v_away_signed := v_fixture.away_captain_signed;
  elsif p_team_id = v_fixture.away_team_id then
    if p_edited_side <> 'frames' and not (v_fixture.home_captain_signed or v_fixture.away_captain_signed) then
      v_away_unlock_req := coalesce((p_lineups->'unlockRequested'->>'away')::boolean, false);
      if not (v_fixture.home_set1_locked and v_fixture.away_set1_locked) then
        v_real_away_s1 := coalesce(p_lineups->'set1'->'away', v_real_away_s1);
      end if;
    end if;

    if v_fixture.home_set1_locked and v_fixture.away_set1_locked then
      if (v_home_unlock_req and v_away_unlock_req) or (not p_away_set1_locked and v_home_unlock_req) then
        v_home_locked := false;
        v_away_locked := false;
        v_home_unlock_req := false;
        v_away_unlock_req := false;
      else
        v_home_locked := true;
        v_away_locked := true;
      end if;
    else
      v_home_locked := v_fixture.home_set1_locked;
      if v_home_locked and v_away_locked then
        v_home_unlock_req := false;
        v_away_unlock_req := false;
      end if;
    end if;

    -- Merge Set 2 and Set 3 subs lock states and unlock requests
    -- Once locked, a captain cannot unilaterally unlock their own Set 2 / Set 3 substitutions
    v_away_s2_locked := coalesce((v_fixture.lineups->'subsLocked'->'set2'->>'away')::boolean, false)
      or coalesce((p_lineups->'subsLocked'->'set2'->>'away')::boolean, false);
    v_away_s3_locked := coalesce((v_fixture.lineups->'subsLocked'->'set3'->>'away')::boolean, false)
      or coalesce((p_lineups->'subsLocked'->'set3'->>'away')::boolean, false);
    v_away_s2_unlock_req := coalesce((p_lineups->'subsUnlockRequested'->'set2'->>'away')::boolean, false);
    v_away_s3_unlock_req := coalesce((p_lineups->'subsUnlockRequested'->'set3'->>'away')::boolean, false);
    v_away_s2_pending := coalesce((p_lineups->'subsPendingApproval'->'set2'->>'away')::boolean, false);
    v_away_s3_pending := coalesce((p_lineups->'subsPendingApproval'->'set3'->>'away')::boolean, false);

    if coalesce((v_fixture.lineups->'subsUnlockRequested'->'set2'->>'home')::boolean, false) and
       not coalesce((p_lineups->'subsLocked'->'set2'->>'home')::boolean, true) then
      v_home_s2_locked := false;
      v_home_s2_unlock_req := false;
    elsif coalesce((v_fixture.lineups->'subsPendingApproval'->'set2'->>'home')::boolean, false) and
          coalesce((p_lineups->'subsLocked'->'set2'->>'home')::boolean, false) then
      v_home_s2_locked := true;
      v_home_s2_pending := false;
      v_home_s2_unlock_req := false;
    else
      v_home_s2_locked := coalesce((v_fixture.lineups->'subsLocked'->'set2'->>'home')::boolean, false);
      v_home_s2_unlock_req := coalesce((v_fixture.lineups->'subsUnlockRequested'->'set2'->>'home')::boolean, false);
      v_home_s2_pending := coalesce((v_fixture.lineups->'subsPendingApproval'->'set2'->>'home')::boolean, false);
    end if;

    if coalesce((v_fixture.lineups->'subsUnlockRequested'->'set3'->>'home')::boolean, false) and
       not coalesce((p_lineups->'subsLocked'->'set3'->>'home')::boolean, true) then
      v_home_s3_locked := false;
      v_home_s3_unlock_req := false;
    elsif coalesce((v_fixture.lineups->'subsPendingApproval'->'set3'->>'home')::boolean, false) and
          coalesce((p_lineups->'subsLocked'->'set3'->>'home')::boolean, false) then
      v_home_s3_locked := true;
      v_home_s3_pending := false;
      v_home_s3_unlock_req := false;
    else
      v_home_s3_locked := coalesce((v_fixture.lineups->'subsLocked'->'set3'->>'home')::boolean, false);
      v_home_s3_unlock_req := coalesce((v_fixture.lineups->'subsUnlockRequested'->'set3'->>'home')::boolean, false);
      v_home_s3_pending := coalesce((v_fixture.lineups->'subsPendingApproval'->'set3'->>'home')::boolean, false);
    end if;

    v_public_home_s2 := coalesce(v_fixture.lineups->'set2'->'home', p_lineups->'set2'->'home');
    v_public_away_s2 := case
      when p_edited_side = 'frames'
        or v_fixture.home_captain_signed
        or v_fixture.away_captain_signed
        or coalesce((v_fixture.lineups->'subsLocked'->'set2'->>'away')::boolean, false)
      then coalesce(v_fixture.lineups->'set2'->'away', p_lineups->'set2'->'away')
      else p_lineups->'set2'->'away'
    end;
    v_public_home_s3 := coalesce(v_fixture.lineups->'set3'->'home', p_lineups->'set3'->'home');
    v_public_away_s3 := case
      when p_edited_side = 'frames'
        or v_fixture.home_captain_signed
        or v_fixture.away_captain_signed
        or coalesce((v_fixture.lineups->'subsLocked'->'set3'->>'away')::boolean, false)
      then coalesce(v_fixture.lineups->'set3'->'away', p_lineups->'set3'->'away')
      else p_lineups->'set3'->'away'
    end;
    v_home_signed := v_fixture.home_captain_signed;
  end if;

  -- Persist real Set 1 lineups in private table (never readable by anon/DevTools)
  insert into public.fixture_private_lineups (fixture_id, home_set1, away_set1, updated_at)
  values (p_fixture_id, v_real_home_s1, v_real_away_s1, now())
  on conflict (fixture_id) do update
    set home_set1 = excluded.home_set1,
        away_set1 = excluded.away_set1,
        updated_at = now();

  -- Blind Set 1 Secrecy: Only expose Set 1 player IDs in public.fixtures once BOTH captains have locked Set 1!
  if v_home_locked and v_away_locked then
    v_public_home_s1 := v_real_home_s1;
    v_public_away_s1 := v_real_away_s1;
    -- Cascade revealed Set 1 slots to Set 2 / Set 3 if Set 2 / Set 3 were still masked
    if v_public_home_s2 = v_null_slots then
      v_public_home_s2 := v_real_home_s1;
    end if;
    if v_public_away_s2 = v_null_slots then
      v_public_away_s2 := v_real_away_s1;
    end if;
    if v_public_home_s3 = v_null_slots then
      v_public_home_s3 := v_real_home_s1;
    end if;
    if v_public_away_s3 = v_null_slots then
      v_public_away_s3 := v_real_away_s1;
    end if;
  else
    v_public_home_s1 := v_null_slots;
    v_public_away_s1 := v_null_slots;
    v_public_home_s2 := v_null_slots;
    v_public_away_s2 := v_null_slots;
    v_public_home_s3 := v_null_slots;
    v_public_away_s3 := v_null_slots;
  end if;

  v_merged_lineups := jsonb_build_object(
    'set1', jsonb_build_object('home', v_public_home_s1, 'away', v_public_away_s1),
    'set2', jsonb_build_object('home', v_public_home_s2, 'away', v_public_away_s2),
    'set3', jsonb_build_object('home', v_public_home_s3, 'away', v_public_away_s3),
    'unlockRequested', jsonb_build_object('home', v_home_unlock_req, 'away', v_away_unlock_req),
    'subsLocked', jsonb_build_object(
      'set2', jsonb_build_object('home', v_home_s2_locked, 'away', v_away_s2_locked),
      'set3', jsonb_build_object('home', v_home_s3_locked, 'away', v_away_s3_locked)
    ),
    'subsUnlockRequested', jsonb_build_object(
      'set2', jsonb_build_object('home', v_home_s2_unlock_req, 'away', v_away_s2_unlock_req),
      'set3', jsonb_build_object('home', v_home_s3_unlock_req, 'away', v_away_s3_unlock_req)
    ),
    'subsPendingApproval', jsonb_build_object(
      'set2', jsonb_build_object('home', v_home_s2_pending, 'away', v_away_s2_pending),
      'set3', jsonb_build_object('home', v_home_s3_pending, 'away', v_away_s3_pending)
    )
  );

  -- Prevent frame/lag edits while either captain's signature is active
  if v_fixture.home_captain_signed or v_fixture.away_captain_signed then
    v_next_frames := v_fixture.frames;
    v_next_lag := v_fixture.lag_winner;
  else
    v_next_frames := p_frames;
    v_next_lag := p_lag_winner;
  end if;

  -- Determine match status: only live once both Set 1 lineups are locked (or frames have been scored/submitted)
  v_next_status := p_status;
  if v_next_status = 'submitted' and not (v_home_signed and v_away_signed) then
    v_next_status := 'live';
  elsif v_home_locked and v_away_locked and v_next_status = 'scheduled' then
    v_next_status := 'live';
  elsif not (v_home_locked and v_away_locked) and v_next_status = 'live' then
    if not exists (
      select 1 from jsonb_array_elements(coalesce(v_next_frames, v_fixture.frames, '[]'::jsonb)) f
      where (f->>'winner') is not null
    ) then
      v_next_status := 'scheduled';
    end if;
  end if;

  -- Perform scoped update of scorecard fields only
  update public.fixtures
  set status = v_next_status,
      lag_winner = v_next_lag,
      home_set1_locked = v_home_locked,
      away_set1_locked = v_away_locked,
      lineups = v_merged_lineups,
      frames = v_next_frames,
      home_captain_signed = v_home_signed,
      away_captain_signed = v_away_signed,
      submitted_at = case when v_next_status = 'submitted' then coalesce(p_submitted_at, now()) else null end,
      updated_at = now()
  where id = p_fixture_id;

  return true;
end;
$$;

-- 7. Admin Scorecard Save / Approve / Reopen (Requires League Admin PIN)
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
set search_path = public, pg_temp
as $$
begin
  if not public.verify_admin_pin(p_admin_pin) then
    return false;
  end if;

  -- Keep private Set 1 lineups synced when Admin edits lineups
  insert into public.fixture_private_lineups (fixture_id, home_set1, away_set1, updated_at)
  values (
    p_fixture_id,
    coalesce(p_lineups->'set1'->'home', '[null,null,null,null,null]'::jsonb),
    coalesce(p_lineups->'set1'->'away', '[null,null,null,null,null]'::jsonb),
    now()
  )
  on conflict (fixture_id) do update
    set home_set1 = excluded.home_set1,
        away_set1 = excluded.away_set1,
        updated_at = now();

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

-- 8. Drop legacy Season / Team / Player deletion RPCs (no longer used by the web portal)
drop function if exists public.admin_upsert_season(text, text, text, boolean, jsonb);

-- 9. Admin Upsert Team (+ optional Team PIN & Table Number)
create or replace function public.admin_upsert_team(
  p_admin_pin text,
  p_id text,
  p_season_id text,
  p_division text,
  p_name text,
  p_venue text,
  p_address text,
  p_captain_name text,
  p_captain_pin text default null,
  p_table_number text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.verify_admin_pin(p_admin_pin) then
    return false;
  end if;

  if p_captain_pin is not null and length(trim(p_captain_pin)) > 0 then
    if exists (
      select 1 from public.league_settings
      where id = 'default' and trim(admin_pin) = trim(p_captain_pin)
    ) then
      raise exception 'This PIN matches the League Admin PIN. Team PINs must be unique.';
    end if;

    if exists (
      select 1 from public.team_pins
      where team_id <> p_id and trim(captain_pin) = trim(p_captain_pin)
    ) then
      raise exception 'PIN "%" is already in use by another team. Team PINs must be unique.', p_captain_pin;
    end if;
  end if;

  insert into public.teams (id, season_id, division, name, venue, address, captain_name, table_number)
  values (p_id, p_season_id, p_division, trim(p_name), trim(p_venue), trim(coalesce(p_address, '')), trim(coalesce(p_captain_name, '')), trim(coalesce(p_table_number, '')))
  on conflict (id) do update
    set division = excluded.division,
        name = excluded.name,
        venue = excluded.venue,
        address = excluded.address,
        captain_name = excluded.captain_name,
        table_number = excluded.table_number;

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

drop function if exists public.admin_delete_team(text, text);

-- 10. Admin Upsert Player
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
set search_path = public, pg_temp
as $$
begin
  if not public.verify_admin_pin(p_admin_pin) then
    return false;
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

drop function if exists public.admin_delete_player(text, text);

-- 13. Admin Create / Upsert Scheduled Fixture (Supports both League & Knockout Cup matches)
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
  p_frames jsonb,
  p_match_type text default 'league',
  p_competition_name text default null,
  p_round text default null,
  p_play_all_frames boolean default false,
  p_knockout_format text default 'first_to_8',
  p_cup_name text default null,
  p_cup_round text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.verify_admin_pin(p_admin_pin) then
    return false;
  end if;

  insert into public.fixtures (
    id, season_id, division, match_date, week_number,
    home_team_id, away_team_id, status, lineups, frames,
    match_type, competition_name, round, play_all_frames, knockout_format, cup_name, cup_round,
    updated_at
  )
  values (
    p_id, p_season_id, p_division, p_match_date, p_week_number,
    p_home_team_id, p_away_team_id, p_status, p_lineups, p_frames,
    coalesce(p_match_type, 'league'),
    coalesce(p_competition_name, p_cup_name),
    coalesce(p_round, p_cup_round),
    coalesce(p_play_all_frames, false),
    coalesce(p_knockout_format, 'first_to_8'),
    coalesce(p_cup_name, p_competition_name),
    coalesce(p_cup_round, p_round),
    now()
  )
  on conflict (id) do update
    set division = excluded.division,
        match_date = excluded.match_date,
        week_number = excluded.week_number,
        home_team_id = excluded.home_team_id,
        away_team_id = excluded.away_team_id,
        status = excluded.status,
        match_type = excluded.match_type,
        competition_name = excluded.competition_name,
        round = excluded.round,
        play_all_frames = excluded.play_all_frames,
        knockout_format = excluded.knockout_format,
        cup_name = excluded.cup_name,
        cup_round = excluded.cup_round,
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
set search_path = public, pg_temp
as $$
begin
  if not public.verify_admin_pin(p_admin_pin) then
    return false;
  end if;

  delete from public.fixtures where id = p_fixture_id;
  return true;
end;
$$;

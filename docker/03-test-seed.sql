-- Grant permissions on all schema objects to PostgREST roles (RLS policies enforce access control)
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

-- Ensure known Admin PIN for E2E tests
insert into public.league_settings (id, admin_pin)
values ('default', '000000')
on conflict (id) do update set admin_pin = '000000';

-- Active Season
insert into public.seasons (id, name, is_active, divisions)
values (
  'winter-2026-27',
  'Winter 2026/27',
  true,
  '["Premier League", "Division 1", "Division 2", "Division 3"]'::jsonb
)
on conflict (id) do update
  set name = excluded.name,
      is_active = true,
      divisions = excluded.divisions;

-- Teams
insert into public.teams (id, season_id, division, name, venue, address, captain_name, table_number)
values
  ('t-prem-1', 'winter-2026-27', 'Premier League', 'King & Queen A', 'The King & Queen', '13-17 Marlborough Place, Brighton', 'Sam Carter', 'Table 1'),
  ('t-prem-2', 'winter-2026-27', 'Premier League', 'Castle Sharks', 'The Castle Club', 'Castle Street, Brighton', 'Liam Vance', 'Table 2'),
  ('t-prem-3', 'winter-2026-27', 'Premier League', 'Caroline Cueists', 'The Caroline of Brunswick', '39 Ditchling Road, Brighton', 'Chloe Mercer', 'Table 1'),
  ('t-prem-4', 'winter-2026-27', 'Premier League', 'Preston Park Potters', 'The Prestonville Arms', '64 Hamilton Road, Brighton', 'Noah Sterling', 'Table 1')
on conflict (id) do nothing;

-- Team PINs
insert into public.team_pins (team_id, captain_pin)
values
  ('t-prem-1', '111222'),
  ('t-prem-2', '333444'),
  ('t-prem-3', '555666'),
  ('t-prem-4', '777888')
on conflict (team_id) do update set captain_pin = excluded.captain_pin;

-- Players
insert into public.players (id, team_id, name, active)
values
  ('p-kq-1', 't-prem-1', 'Sam Carter', true),
  ('p-kq-2', 't-prem-1', 'Alex Turner', true),
  ('p-kq-3', 't-prem-1', 'Jamie Brooks', true),
  ('p-kq-4', 't-prem-1', 'Morgan Ellis', true),
  ('p-kq-5', 't-prem-1', 'Taylor Reed', true),
  ('p-kq-6', 't-prem-1', 'Jordan Hayes', true),

  ('p-cs-1', 't-prem-2', 'Liam Vance', true),
  ('p-cs-2', 't-prem-2', 'Ryan Cooper', true),
  ('p-cs-3', 't-prem-2', 'Dan Foster', true),
  ('p-cs-4', 't-prem-2', 'Ben Harper', true),
  ('p-cs-5', 't-prem-2', 'Luke Mason', true),
  ('p-cs-6', 't-prem-2', 'Owen Walsh', true),

  ('p-cc-1', 't-prem-3', 'Chloe Mercer', true),
  ('p-cc-2', 't-prem-3', 'Hannah Scott', true),
  ('p-cc-3', 't-prem-3', 'Grace Palmer', true),
  ('p-cc-4', 't-prem-3', 'Zoe Bennett', true),
  ('p-cc-5', 't-prem-3', 'Ruby Knight', true),
  ('p-cc-6', 't-prem-3', 'Eva Dixon', true),

  ('p-pp-1', 't-prem-4', 'Noah Sterling', true),
  ('p-pp-2', 't-prem-4', 'Ethan Webb', true),
  ('p-pp-3', 't-prem-4', 'Lucas Cole', true),
  ('p-pp-4', 't-prem-4', 'Mason Hunt', true),
  ('p-pp-5', 't-prem-4', 'Logan Shaw', true),
  ('p-pp-6', 't-prem-4', 'Caleb Ross', true)
on conflict (id) do nothing;

-- Fixture 1: Approved Match (King & Queen A 9 - 6 Castle Sharks)
insert into public.fixtures (
  id, season_id, division, match_date, week_number,
  home_team_id, away_team_id, status, lag_winner,
  home_set1_locked, away_set1_locked,
  lineups, frames,
  home_captain_signed, away_captain_signed,
  submitted_at, approved_at
)
values (
  'fix-approved-1',
  'winter-2026-27',
  'Premier League',
  '2026-10-19',
  1,
  't-prem-1',
  't-prem-2',
  'approved',
  'home',
  true,
  true,
  '{
    "set1": {"home": ["p-kq-1","p-kq-2","p-kq-3","p-kq-4","p-kq-5"], "away": ["p-cs-1","p-cs-2","p-cs-3","p-cs-4","p-cs-5"]},
    "set2": {"home": ["p-kq-1","p-kq-2","p-kq-3","p-kq-4","p-kq-5"], "away": ["p-cs-1","p-cs-2","p-cs-3","p-cs-4","p-cs-5"]},
    "set3": {"home": ["p-kq-1","p-kq-2","p-kq-3","p-kq-4","p-kq-5"], "away": ["p-cs-1","p-cs-2","p-cs-3","p-cs-4","p-cs-5"]}
  }'::jsonb,
  '[
    {"frameNumber":1,"setNumber":1,"gameInSet":1,"homeSlot":1,"awaySlot":1,"winner":"home","dish":true},
    {"frameNumber":2,"setNumber":1,"gameInSet":2,"homeSlot":2,"awaySlot":2,"winner":"home","dish":false},
    {"frameNumber":3,"setNumber":1,"gameInSet":3,"homeSlot":3,"awaySlot":3,"winner":"away","dish":false},
    {"frameNumber":4,"setNumber":1,"gameInSet":4,"homeSlot":4,"awaySlot":4,"winner":"home","dish":false},
    {"frameNumber":5,"setNumber":1,"gameInSet":5,"homeSlot":5,"awaySlot":5,"winner":"away","dish":false},
    {"frameNumber":6,"setNumber":2,"gameInSet":1,"homeSlot":1,"awaySlot":3,"winner":"home","dish":true},
    {"frameNumber":7,"setNumber":2,"gameInSet":2,"homeSlot":2,"awaySlot":4,"winner":"away","dish":false},
    {"frameNumber":8,"setNumber":2,"gameInSet":3,"homeSlot":3,"awaySlot":5,"winner":"home","dish":false},
    {"frameNumber":9,"setNumber":2,"gameInSet":4,"homeSlot":4,"awaySlot":2,"winner":"away","dish":true},
    {"frameNumber":10,"setNumber":2,"gameInSet":5,"homeSlot":5,"awaySlot":1,"winner":"home","dish":false},
    {"frameNumber":11,"setNumber":3,"gameInSet":1,"homeSlot":1,"awaySlot":4,"winner":"home","dish":false},
    {"frameNumber":12,"setNumber":3,"gameInSet":2,"homeSlot":2,"awaySlot":1,"winner":"away","dish":false},
    {"frameNumber":13,"setNumber":3,"gameInSet":3,"homeSlot":3,"awaySlot":2,"winner":"home","dish":false},
    {"frameNumber":14,"setNumber":3,"gameInSet":4,"homeSlot":4,"awaySlot":5,"winner":"away","dish":false},
    {"frameNumber":15,"setNumber":3,"gameInSet":5,"homeSlot":5,"awaySlot":3,"winner":"home","dish":false}
  ]'::jsonb,
  true,
  true,
  now() - interval '7 days',
  now() - interval '6 days'
)
on conflict (id) do nothing;

-- Fixture 2: Submitted Match awaiting Admin Approval (Caroline Cueists 8 - 7 Preston Park Potters)
insert into public.fixtures (
  id, season_id, division, match_date, week_number,
  home_team_id, away_team_id, status, lag_winner,
  home_set1_locked, away_set1_locked,
  lineups, frames,
  home_captain_signed, away_captain_signed,
  submitted_at
)
values (
  'fix-submitted-1',
  'winter-2026-27',
  'Premier League',
  '2026-10-26',
  2,
  't-prem-3',
  't-prem-4',
  'submitted',
  'away',
  true,
  true,
  '{
    "set1": {"home": ["p-cc-1","p-cc-2","p-cc-3","p-cc-4","p-cc-5"], "away": ["p-pp-1","p-pp-2","p-pp-3","p-pp-4","p-pp-5"]},
    "set2": {"home": ["p-cc-1","p-cc-2","p-cc-3","p-cc-4","p-cc-5"], "away": ["p-pp-1","p-pp-2","p-pp-3","p-pp-4","p-pp-5"]},
    "set3": {"home": ["p-cc-1","p-cc-2","p-cc-3","p-cc-4","p-cc-5"], "away": ["p-pp-1","p-pp-2","p-pp-3","p-pp-4","p-pp-5"]}
  }'::jsonb,
  '[
    {"frameNumber":1,"setNumber":1,"gameInSet":1,"homeSlot":1,"awaySlot":1,"winner":"home","dish":false},
    {"frameNumber":2,"setNumber":1,"gameInSet":2,"homeSlot":2,"awaySlot":2,"winner":"away","dish":false},
    {"frameNumber":3,"setNumber":1,"gameInSet":3,"homeSlot":3,"awaySlot":3,"winner":"home","dish":true},
    {"frameNumber":4,"setNumber":1,"gameInSet":4,"homeSlot":4,"awaySlot":4,"winner":"away","dish":false},
    {"frameNumber":5,"setNumber":1,"gameInSet":5,"homeSlot":5,"awaySlot":5,"winner":"home","dish":false},
    {"frameNumber":6,"setNumber":2,"gameInSet":1,"homeSlot":1,"awaySlot":3,"winner":"away","dish":false},
    {"frameNumber":7,"setNumber":2,"gameInSet":2,"homeSlot":2,"awaySlot":4,"winner":"home","dish":false},
    {"frameNumber":8,"setNumber":2,"gameInSet":3,"homeSlot":3,"awaySlot":5,"winner":"away","dish":false},
    {"frameNumber":9,"setNumber":2,"gameInSet":4,"homeSlot":4,"awaySlot":2,"winner":"home","dish":false},
    {"frameNumber":10,"setNumber":2,"gameInSet":5,"homeSlot":5,"awaySlot":1,"winner":"away","dish":false},
    {"frameNumber":11,"setNumber":3,"gameInSet":1,"homeSlot":1,"awaySlot":4,"winner":"home","dish":false},
    {"frameNumber":12,"setNumber":3,"gameInSet":2,"homeSlot":2,"awaySlot":1,"winner":"away","dish":false},
    {"frameNumber":13,"setNumber":3,"gameInSet":3,"homeSlot":3,"awaySlot":2,"winner":"home","dish":false},
    {"frameNumber":14,"setNumber":3,"gameInSet":4,"homeSlot":4,"awaySlot":5,"winner":"away","dish":false},
    {"frameNumber":15,"setNumber":3,"gameInSet":5,"homeSlot":5,"awaySlot":3,"winner":"home","dish":false}
  ]'::jsonb,
  true,
  true,
  now() - interval '1 hour'
)
on conflict (id) do nothing;

-- Fixture 3: Scheduled Match for Captain Lineup & Live Scoring E2E test
insert into public.fixtures (
  id, season_id, division, match_date, week_number,
  home_team_id, away_team_id, status
)
values (
  'fix-scheduled-1',
  'winter-2026-27',
  'Premier League',
  '2026-11-02',
  3,
  't-prem-1',
  't-prem-3',
  'scheduled'
)
on conflict (id) do nothing;

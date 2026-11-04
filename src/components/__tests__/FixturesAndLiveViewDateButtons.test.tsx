import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FixturesAndLiveView } from '../FixturesAndLiveView';
import { Fixture, Team } from '../../types/league';
import { createEmptyFrames, createEmptyLineups } from '../../utils/leagueEngine';

const mockUseLeague = vi.fn();
vi.mock('../../context/LeagueContext', () => ({
  useLeague: () => mockUseLeague(),
}));

describe('FixturesAndLiveView Date-based Scorecard Button Visibility', () => {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const teamA: Team = {
    id: 'team-a',
    seasonId: 'winter-2026-27',
    division: 'Premier League',
    name: 'Alpha Hawks',
    venue: 'Hawks Nest',
    address: '10 Marine Parade',
    captainName: 'Alice',
    captainPin: '111111',
  };

  const teamB: Team = {
    id: 'team-b',
    seasonId: 'winter-2026-27',
    division: 'Premier League',
    name: 'Beta Bears',
    venue: 'Bear Den',
    address: '20 Western Road',
    captainName: 'Bob',
    captainPin: '222222',
  };

  const futureFixture: Fixture = {
    id: 'fix-future',
    seasonId: 'winter-2026-27',
    division: 'Premier League',
    matchDate: '2099-12-31',
    weekNumber: 10,
    homeTeamId: 'team-a',
    awayTeamId: 'team-b',
    status: 'scheduled',
    frames: createEmptyFrames(),
    lineups: createEmptyLineups(),
    lagWinner: null,
    homeSet1Locked: false,
    awaySet1Locked: false,
    homeCaptainSigned: false,
    awayCaptainSigned: false,
    updatedAt: '2026-10-01T00:00:00Z',
  };

  const todayFixture: Fixture = {
    id: 'fix-today',
    seasonId: 'winter-2026-27',
    division: 'Premier League',
    matchDate: todayStr,
    weekNumber: 5,
    homeTeamId: 'team-a',
    awayTeamId: 'team-b',
    status: 'scheduled',
    frames: createEmptyFrames(),
    lineups: createEmptyLineups(),
    lagWinner: null,
    homeSet1Locked: false,
    awaySet1Locked: false,
    homeCaptainSigned: false,
    awayCaptainSigned: false,
    updatedAt: '2026-10-01T00:00:00Z',
  };

  const pastFixture: Fixture = {
    id: 'fix-past',
    seasonId: 'winter-2026-27',
    division: 'Premier League',
    matchDate: '2020-01-01',
    weekNumber: 1,
    homeTeamId: 'team-a',
    awayTeamId: 'team-b',
    status: 'approved',
    frames: createEmptyFrames(),
    lineups: createEmptyLineups(),
    lagWinner: 'home',
    homeSet1Locked: true,
    awaySet1Locked: true,
    homeCaptainSigned: true,
    awayCaptainSigned: true,
    updatedAt: '2020-01-01T23:00:00Z',
  };

  it('hides the scorecard button for upcoming future fixtures while showing it for today and past fixtures', () => {
    mockUseLeague.mockReturnValue({
      seasonName: 'Winter 2026/27',
      divisions: ['Premier League'],
      teams: [teamA, teamB],
      fixtures: [futureFixture, todayFixture, pastFixture],
      session: { role: 'viewer' },
      isCaptain: false,
      canManageLeague: false,
      approveFixture: vi.fn(),
    });

    const onSelectFixture = vi.fn();
    render(<FixturesAndLiveView onSelectFixture={onSelectFixture} />);

    const scorecardButtons = screen.getAllByRole('button', { name: /View Scorecard/i });
    expect(scorecardButtons).toHaveLength(2);
  });

  it('hides the Start Match button for captains on upcoming future fixtures in spotlight and list', () => {
    mockUseLeague.mockReturnValue({
      seasonName: 'Winter 2026/27',
      divisions: ['Premier League'],
      teams: [teamA, teamB],
      fixtures: [futureFixture],
      session: { role: 'captain', teamId: 'team-a', captainName: 'Alice' },
      isCaptain: true,
      canManageLeague: false,
      approveFixture: vi.fn(),
    });

    const onSelectFixture = vi.fn();
    render(<FixturesAndLiveView onSelectFixture={onSelectFixture} />);

    expect(screen.queryByRole('button', { name: /Start Match/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /View Scorecard/i })).not.toBeInTheDocument();
  });

  it('shows the Start Match button for captains when the fixture is today', () => {
    mockUseLeague.mockReturnValue({
      seasonName: 'Winter 2026/27',
      divisions: ['Premier League'],
      teams: [teamA, teamB],
      fixtures: [todayFixture],
      session: { role: 'captain', teamId: 'team-a', captainName: 'Alice' },
      isCaptain: true,
      canManageLeague: false,
      approveFixture: vi.fn(),
    });

    const onSelectFixture = vi.fn();
    render(<FixturesAndLiveView onSelectFixture={onSelectFixture} />);

    const startButtons = screen.getAllByRole('button', { name: /Start Match/i });
    expect(startButtons.length).toBeGreaterThanOrEqual(1);
  });
});

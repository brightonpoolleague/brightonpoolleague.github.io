import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlayerStatsView } from '../PlayerStatsView';
import { Fixture, Player, Team } from '../../types/league';
import { createEmptyFrames, createEmptyLineups } from '../../utils/leagueEngine';
import { PRIMARY_SPONSOR } from '../../data/sponsors';

const mockUseLeague = vi.fn();
vi.mock('../../context/LeagueContext', () => ({
  useLeague: () => mockUseLeague(),
}));

describe('PlayerStatsView Sponsor Branding', () => {
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

  const playerA: Player = {
    id: 'p-1',
    teamId: 'team-a',
    name: 'Jimmy White',
    active: true,
  };

  const fixture1: Fixture = {
    id: 'fix-1',
    seasonId: 'winter-2026-27',
    division: 'Premier League',
    matchDate: '2026-10-12',
    weekNumber: 1,
    homeTeamId: 'team-a',
    awayTeamId: 'team-b',
    status: 'approved',
    frames: createEmptyFrames().map((f, i) => ({
      ...f,
      homePlayerId: 'p-1',
      awayPlayerId: 'p-2',
      winner: 'home' as const,
      dish: i === 0,
    })),
    lineups: createEmptyLineups(),
    lagWinner: 'home',
    homeSet1Locked: true,
    awaySet1Locked: true,
    homeCaptainSigned: true,
    awayCaptainSigned: true,
    updatedAt: '2026-10-12T22:00:00Z',
  };

  it('renders sponsor badge and sponsor banner on player stats averages view', () => {
    mockUseLeague.mockReturnValue({
      seasonName: 'Winter 2026/27',
      divisions: ['Premier League'],
      teams: [teamA],
      players: [playerA],
      fixtures: [fixture1],
      session: { role: 'spectator', authenticated: false },
    });

    render(<PlayerStatsView />);

    expect(screen.getByText('Sponsored by')).toBeInTheDocument();
    expect(screen.getByText(PRIMARY_SPONSOR.role!)).toBeInTheDocument();
    expect(screen.getByText(PRIMARY_SPONSOR.tagline!)).toBeInTheDocument();
    const logos = screen.getAllByAltText(PRIMARY_SPONSOR.name);
    expect(logos.length).toBeGreaterThanOrEqual(2);
  });

  it('maintains sponsor branding when switching to dish leaderboard', () => {
    mockUseLeague.mockReturnValue({
      seasonName: 'Winter 2026/27',
      divisions: ['Premier League'],
      teams: [teamA],
      players: [playerA],
      fixtures: [fixture1],
      session: { role: 'spectator', authenticated: false },
    });

    render(<PlayerStatsView />);

    const dishBtn = screen.getByRole('button', { name: /Dish Leaderboard/i });
    fireEvent.click(dishBtn);

    expect(screen.getByRole('heading', { name: /Dish Leaderboard/i })).toBeInTheDocument();
    expect(screen.getByText('Sponsored by')).toBeInTheDocument();
    expect(screen.getByText(PRIMARY_SPONSOR.role!)).toBeInTheDocument();
    expect(screen.getByText(PRIMARY_SPONSOR.tagline!)).toBeInTheDocument();
  });
});

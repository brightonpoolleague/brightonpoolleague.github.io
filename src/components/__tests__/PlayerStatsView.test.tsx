import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlayerStatsView } from '../PlayerStatsView';
import { Fixture, Player, Team } from '../../types/league';
import { createEmptyFrames, createEmptyLineups } from '../../utils/leagueEngine';
import { PRIMARY_SPONSOR } from '../../data/sponsors';

const mockUseLeague = vi.fn();
vi.mock('../../context/LeagueContext', () => ({
  useLeague: () => mockUseLeague(),
}));

describe('PlayerStatsView Sponsor Branding & Player Stats Modal', () => {
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
    name: 'Beta Sharks',
    venue: 'Sharks Bar',
    address: '20 Kings Road',
    captainName: 'Bob',
    captainPin: '222222',
  };

  const playerA: Player = {
    id: 'p-1',
    teamId: 'team-a',
    name: 'Jimmy White',
    active: true,
  };

  const playerB: Player = {
    id: 'p-2',
    teamId: 'team-b',
    name: 'Steve Davis',
    active: true,
  };

  const lineups = createEmptyLineups();
  lineups.set1.home = ['p-1', null, null, null, null];
  lineups.set1.away = ['p-2', null, null, null, null];
  lineups.set2.home = ['p-1', null, null, null, null];
  lineups.set2.away = ['p-2', 'p-2', 'p-2', 'p-2', 'p-2'];

  const frames = createEmptyFrames();
  // Frame 1 (Set 1, Game 1: homeSlot 1 vs awaySlot 1): Jimmy White wins with a Dish
  frames[0] = {
    ...frames[0],
    winner: 'home',
    dish: true,
  };
  // Frame 6 (Set 2, Game 1: homeSlot 1 vs awaySlot 1): Jimmy White loses (no dish)
  frames[5] = {
    ...frames[5],
    winner: 'away',
    dish: false,
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
    frames,
    lineups,
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
      teams: [teamA, teamB],
      players: [playerA, playerB],
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
      teams: [teamA, teamB],
      players: [playerA, playerB],
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

  it('opens a modal showing frames won, lost, opponent played and dish status when clicking a player name', () => {
    mockUseLeague.mockReturnValue({
      seasonName: 'Winter 2026/27',
      divisions: ['Premier League'],
      teams: [teamA, teamB],
      players: [playerA, playerB],
      fixtures: [fixture1],
      session: { role: 'spectator', authenticated: false },
    });

    render(<PlayerStatsView />);

    const playerBtn = screen.getByRole('button', { name: 'Jimmy White' });
    fireEvent.click(playerBtn);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Jimmy White')).toBeInTheDocument();
    expect(within(dialog).getByText('Alpha Hawks')).toBeInTheDocument();

    // Shows opponent name and team for the frames played
    expect(within(dialog).getAllByText('vs Steve Davis')).toHaveLength(2);
    expect(within(dialog).getAllByText('Beta Sharks')).toHaveLength(2);

    // Shows Won / Lost badges and Dish / No Dish indicators
    expect(within(dialog).getAllByText('Won').length).toBeGreaterThanOrEqual(2);
    expect(within(dialog).getAllByText('Lost').length).toBeGreaterThanOrEqual(2);
    expect(within(dialog).getByText('Dish')).toBeInTheDocument();
    expect(within(dialog).queryByText('No Dish')).not.toBeInTheDocument();

    // Filter pills work inside the modal
    fireEvent.click(within(dialog).getByRole('button', { name: /Dishes\s*1/i }));
    expect(within(dialog).getAllByText('vs Steve Davis')).toHaveLength(1);
    expect(within(dialog).queryByText('No Dish')).not.toBeInTheDocument();

    // Close modal and open Steve Davis (who lost Frame 1 when Jimmy White dished) to verify Dish still shows on lost frames
    fireEvent.click(within(dialog).getByRole('button', { name: /Close player stats modal/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Steve Davis' }));
    const steveDialog = screen.getByRole('dialog');
    expect(within(steveDialog).getByText('Dish')).toBeInTheDocument();

    // Verify Print button calls window.print()
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    fireEvent.click(screen.getByRole('button', { name: /^Print$/i }));
    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });
});

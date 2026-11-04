import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LeagueTableView } from '../LeagueTableView';
import { Fixture, Team } from '../../types/league';
import { createEmptyFrames, createEmptyLineups } from '../../utils/leagueEngine';

const mockUseLeague = vi.fn();
vi.mock('../../context/LeagueContext', () => ({
  useLeague: () => mockUseLeague(),
}));

describe('LeagueTableView Responsive Columns', () => {
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

  // Match where Alpha Hawks win 9 frames to 6 against Beta Bears
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
      homePlayerId: 'p1',
      awayPlayerId: 'p2',
      winner: i < 9 ? ('home' as const) : ('away' as const),
    })),
    lineups: createEmptyLineups(),
    lagWinner: 'home',
    homeSet1Locked: true,
    awaySet1Locked: true,
    homeCaptainSigned: true,
    awayCaptainSigned: true,
    updatedAt: '2026-10-12T22:00:00Z',
  };

  it('renders FF and FA column headers without hiding them on mobile screens', () => {
    mockUseLeague.mockReturnValue({
      seasonName: 'Winter 2026/27',
      divisions: ['Premier League'],
      teams: [teamA, teamB],
      fixtures: [fixture1],
      session: { role: 'spectator', authenticated: false },
    });

    render(<LeagueTableView />);

    const ffHeader = screen.getByTitle('Frames Won');
    const faHeader = screen.getByTitle('Frames Lost');

    expect(ffHeader).toBeInTheDocument();
    expect(faHeader).toBeInTheDocument();
    expect(ffHeader.textContent?.trim()).toBe('FF');
    expect(faHeader.textContent?.trim()).toBe('FA');

    // Verify neither column header contains hidden sm:table-cell
    expect(ffHeader.className).not.toContain('hidden');
    expect(ffHeader.className).not.toContain('sm:table-cell');
    expect(faHeader.className).not.toContain('hidden');
    expect(faHeader.className).not.toContain('sm:table-cell');
  });

  it('renders FF and FA table data cells for each team row without hiding them on mobile screens', () => {
    mockUseLeague.mockReturnValue({
      seasonName: 'Winter 2026/27',
      divisions: ['Premier League'],
      teams: [teamA, teamB],
      fixtures: [fixture1],
      session: { role: 'spectator', authenticated: false },
    });

    render(<LeagueTableView />);

    // Row 1: Alpha Hawks (9 FF, 6 FA)
    const hawksRow = screen.getByText('Alpha Hawks').closest('tr');
    expect(hawksRow).not.toBeNull();

    const cells = hawksRow!.querySelectorAll('td');
    // Indices: 0: #, 1: Team & Venue, 2: P, 3: W, 4: L, 5: FF, 6: FA, 7: FD, 8: PTS, 9: Form
    const ffCell = cells[5];
    const faCell = cells[6];

    expect(ffCell.textContent?.trim()).toBe('9');
    expect(faCell.textContent?.trim()).toBe('6');

    // Verify neither data cell contains hidden or sm:table-cell
    expect(ffCell.className).not.toContain('hidden');
    expect(ffCell.className).not.toContain('sm:table-cell');
    expect(faCell.className).not.toContain('hidden');
    expect(faCell.className).not.toContain('sm:table-cell');

    // Row 2: Beta Bears (6 FF, 9 FA)
    const bearsRow = screen.getByText('Beta Bears').closest('tr');
    expect(bearsRow).not.toBeNull();

    const bearsCells = bearsRow!.querySelectorAll('td');
    const bearsFfCell = bearsCells[5];
    const bearsFaCell = bearsCells[6];

    expect(bearsFfCell.textContent?.trim()).toBe('6');
    expect(bearsFaCell.textContent?.trim()).toBe('9');

    expect(bearsFfCell.className).not.toContain('hidden');
    expect(bearsFfCell.className).not.toContain('sm:table-cell');
    expect(bearsFaCell.className).not.toContain('hidden');
    expect(bearsFaCell.className).not.toContain('sm:table-cell');
  });
});

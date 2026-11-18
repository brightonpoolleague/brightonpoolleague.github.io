import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MatchScorecardModal } from '../MatchScorecardModal';
import { Fixture, Player, Team } from '../../types/league';
import { createEmptyFrames, createEmptyLineups } from '../../utils/leagueEngine';

const mockSaveFixture = vi.fn().mockResolvedValue(undefined);
const mockApproveFixture = vi.fn().mockResolvedValue(undefined);
const mockRefreshSingleFixture = vi.fn().mockResolvedValue(undefined);

const teams: Team[] = [
  {
    id: 'team-home',
    seasonId: 'winter-2026-27',
    division: 'Premier League',
    name: 'Castle Lagers',
    venue: 'The Castle',
    address: '1 High St',
    captainName: 'Home Cap',
    captainPin: '111111',
  },
  {
    id: 'team-away',
    seasonId: 'winter-2026-27',
    division: 'Premier League',
    name: 'Romans B',
    venue: 'The Romans',
    address: '2 High St',
    captainName: 'Away Cap',
    captainPin: '222222',
  },
];

const players: Player[] = [
  { id: 'h1', teamId: 'team-home', name: 'Home One', active: true },
  { id: 'h2', teamId: 'team-home', name: 'Home Two', active: true },
  { id: 'h3', teamId: 'team-home', name: 'Home Three', active: true },
  { id: 'h4', teamId: 'team-home', name: 'Home Four', active: true },
  { id: 'h5', teamId: 'team-home', name: 'Home Five', active: true },
  { id: 'a1', teamId: 'team-away', name: 'Away One', active: true },
  { id: 'a2', teamId: 'team-away', name: 'Away Two', active: true },
  { id: 'a3', teamId: 'team-away', name: 'Away Three', active: true },
  { id: 'a4', teamId: 'team-away', name: 'Away Four', active: true },
  { id: 'a5', teamId: 'team-away', name: 'Away Five', active: true },
];

let mockLeagueState = {
  seasonName: 'Winter 2026/27',
  teams,
  players,
  fixtures: [] as Fixture[],
  session: { role: 'admin' as const, name: 'League Admin', pin: '000000' },
  canEditFixture: (f: Fixture) => f.status !== 'approved',
  canManageLeague: true,
  saveFixture: mockSaveFixture,
  approveFixture: mockApproveFixture,
  refreshSingleFixture: mockRefreshSingleFixture,
  isCloudConnected: false,
  isRealtimeConnected: true,
  isOnline: true,
  isSyncing: false,
  syncError: null as string | null,
  retryPendingSync: vi.fn(),
};

vi.mock('../../context/LeagueContext', () => ({
  useLeague: () => mockLeagueState,
}));

function buildFixture(status: 'submitted' | 'approved'): Fixture {
  const lineups = createEmptyLineups();
  lineups.set1.home = ['h1', 'h2', 'h3', 'h4', 'h5'];
  lineups.set1.away = ['a1', 'a2', 'a3', 'a4', 'a5'];
  lineups.set2.home = ['h1', 'h2', 'h3', 'h4', 'h5'];
  lineups.set2.away = ['a1', 'a2', 'a3', 'a4', 'a5'];
  lineups.set3.home = ['h1', 'h2', 'h3', 'h4', 'h5'];
  lineups.set3.away = ['a1', 'a2', 'a3', 'a4', 'a5'];

  const frames = createEmptyFrames().map((f) => ({
    ...f,
    winner: 'home' as const,
    dish: false,
  }));

  return {
    id: `fix-${status}`,
    seasonId: 'winter-2026-27',
    division: 'Premier League',
    matchDate: '2026-10-12',
    weekNumber: 1,
    homeTeamId: 'team-home',
    awayTeamId: 'team-away',
    status,
    lagWinner: 'home',
    homeSet1Locked: true,
    awaySet1Locked: true,
    lineups,
    frames,
    homeCaptainSigned: true,
    awayCaptainSigned: true,
    submittedAt: '2026-10-12T22:00:00Z',
    approvedAt: status === 'approved' ? '2026-10-12T23:00:00Z' : undefined,
    updatedAt: '2026-10-12T23:00:00Z',
  };
}

describe('MatchScorecardModal Admin Lock on Approved Scorecards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('disables frame, dish, lineup, lag and signature controls for admins when scorecard is approved', () => {
    const approvedFixture = buildFixture('approved');
    mockLeagueState = { ...mockLeagueState, fixtures: [approvedFixture] };

    render(<MatchScorecardModal fixture={approvedFixture} onClose={vi.fn()} />);

    // Switch to Live Scorecard view
    fireEvent.click(screen.getByRole('button', { name: /Live Scorecard/i }));

    // Lag and Lineup edit controls are hidden
    expect(screen.queryByRole('button', { name: /Change Lag Winner/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Change Lineup/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Approve$/i })).not.toBeInTheDocument();

    // Frame buttons & dish buttons are disabled
    const homeFrameBtn = screen.getByRole('button', { name: /Home One/i });
    expect(homeFrameBtn).toBeDisabled();
    fireEvent.click(homeFrameBtn);
    expect(mockSaveFixture).not.toHaveBeenCalled();

    const dishButtons = screen.getAllByRole('button', { name: /Dish \/ Reverse Dish/i });
    expect(dishButtons[0]).toBeDisabled();

    // Signature buttons are disabled
    expect(screen.getByRole('button', { name: /Home Captain/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Away Captain/i })).toBeDisabled();
  });

  it('allows admins to edit frames, dishes, lag and lineups when scorecard is submitted (awaiting approval)', () => {
    const submittedFixture = buildFixture('submitted');
    mockLeagueState = { ...mockLeagueState, fixtures: [submittedFixture] };

    render(<MatchScorecardModal fixture={submittedFixture} onClose={vi.fn()} />);

    // Switch to Live Scorecard view
    fireEvent.click(screen.getByRole('button', { name: /Live Scorecard/i }));

    // Lag, Lineup and Approve controls are available to admins
    expect(screen.getByRole('button', { name: /Change Lag Winner/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Change Lineup/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Approve$/i })).toBeInTheDocument();

    // Frame buttons & dish buttons are enabled and trigger saveFixture
    const awayFrameBtn = screen.getByRole('button', { name: /Away One/i });
    expect(awayFrameBtn).not.toBeDisabled();
    fireEvent.click(awayFrameBtn);
    expect(mockSaveFixture).toHaveBeenCalledTimes(1);

    const dishButtons = screen.getAllByRole('button', { name: /Dish \/ Reverse Dish/i });
    expect(dishButtons[0]).not.toBeDisabled();
  });
});

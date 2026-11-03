import { render, screen, fireEvent, act } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { MatchScorecardModal } from '../MatchScorecardModal';
import { Fixture } from '../../types/league';
import { ensureValidLineups } from '../../utils/leagueEngine';

const mockRefreshSingleFixture = vi.fn().mockResolvedValue(undefined);

let mockLeagueState = {
  teams: [
    {
      id: 'team-home',
      name: 'Home Team',
      shortName: 'HOM',
      division: 'Division 1',
      homeVenue: 'Venue A',
      squadPlayerIds: ['p1', 'p2'],
      captainPin: '123456',
    },
    {
      id: 'team-away',
      name: 'Away Team',
      shortName: 'AWY',
      division: 'Division 1',
      homeVenue: 'Venue B',
      squadPlayerIds: ['p3', 'p4'],
      captainPin: '654321',
    },
  ],
  players: [
    { id: 'p1', teamId: 'team-home', name: 'Player 1' },
    { id: 'p2', teamId: 'team-home', name: 'Player 2' },
    { id: 'p3', teamId: 'team-away', name: 'Player 3' },
    { id: 'p4', teamId: 'team-away', name: 'Player 4' },
  ],
  fixtures: [] as Fixture[],
  session: { role: 'viewer' as const },
  canEditFixture: vi.fn().mockReturnValue(false),
  canManageLeague: vi.fn().mockReturnValue(false),
  saveFixture: vi.fn().mockResolvedValue(true),
  approveFixture: vi.fn().mockResolvedValue(true),
  refreshSingleFixture: mockRefreshSingleFixture,
  isCloudConnected: true,
  isRealtimeConnected: true,
  isOnline: true,
  isSyncing: false,
  syncError: null as string | null,
  retryPendingSync: vi.fn(),
};

vi.mock('../../context/LeagueContext', () => ({
  useLeague: () => mockLeagueState,
}));

describe('MatchScorecardModal Sync & Resilience', () => {
  const mockFixture: Fixture = {
    id: 'fix-sync-test',
    seasonId: 's-1',
    division: 'Division 1',
    matchDate: '2026-11-03',
    homeTeamId: 'team-home',
    awayTeamId: 'team-away',
    status: 'live',
    lagWinner: null,
    homeSet1Locked: false,
    awaySet1Locked: false,
    homeCaptainSigned: false,
    awayCaptainSigned: false,
    lineups: ensureValidLineups({}),
    frames: [],
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockLeagueState = {
      ...mockLeagueState,
      isCloudConnected: true,
      isRealtimeConnected: true,
      isOnline: true,
      syncError: null,
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('performs an immediate single-fixture cloud query on mount', () => {
    render(<MatchScorecardModal fixture={mockFixture} onClose={vi.fn()} />);
    expect(mockRefreshSingleFixture).toHaveBeenCalledTimes(1);
    expect(mockRefreshSingleFixture).toHaveBeenCalledWith('fix-sync-test');
  });

  it('triggers refresh when the manual refresh button in header is clicked', async () => {
    render(<MatchScorecardModal fixture={mockFixture} onClose={vi.fn()} />);
    expect(mockRefreshSingleFixture).toHaveBeenCalledTimes(1);

    const refreshBtn = screen.getByRole('button', { name: 'Refresh scorecard' });
    expect(refreshBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(refreshBtn);
    });

    expect(mockRefreshSingleFixture).toHaveBeenCalledTimes(2);
    expect(mockRefreshSingleFixture).toHaveBeenLastCalledWith('fix-sync-test');
  });

  it('does NOT poll when connection is healthy and WebSocket is subscribed', () => {
    mockLeagueState.isCloudConnected = true;
    mockLeagueState.isRealtimeConnected = true;
    mockLeagueState.isOnline = true;
    mockLeagueState.syncError = null;

    render(<MatchScorecardModal fixture={mockFixture} onClose={vi.fn()} />);
    expect(mockRefreshSingleFixture).toHaveBeenCalledTimes(1); // initial mount only

    // Advance timer by 10 seconds
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    // Still only 1 call from initial mount (0 poll calls while healthy)
    expect(mockRefreshSingleFixture).toHaveBeenCalledTimes(1);
  });

  it('polls every 2.5 seconds when connection is degraded (isRealtimeConnected is false)', () => {
    mockLeagueState.isCloudConnected = true;
    mockLeagueState.isRealtimeConnected = false; // socket dropped or reconnecting
    mockLeagueState.isOnline = true;
    mockLeagueState.syncError = null;

    render(<MatchScorecardModal fixture={mockFixture} onClose={vi.fn()} />);
    expect(mockRefreshSingleFixture).toHaveBeenCalledTimes(1); // initial mount

    // Advance timer by 2.5 seconds
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(mockRefreshSingleFixture).toHaveBeenCalledTimes(2);

    // Advance timer by another 2.5 seconds
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(mockRefreshSingleFixture).toHaveBeenCalledTimes(3);
  });

  it('polls when syncError is present even if isRealtimeConnected is true', () => {
    mockLeagueState.isCloudConnected = true;
    mockLeagueState.isRealtimeConnected = true;
    mockLeagueState.isOnline = true;
    mockLeagueState.syncError = 'Failed to save lineup to cloud';

    render(<MatchScorecardModal fixture={mockFixture} onClose={vi.fn()} />);
    expect(mockRefreshSingleFixture).toHaveBeenCalledTimes(1); // initial mount

    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(mockRefreshSingleFixture).toHaveBeenCalledTimes(2);
  });
});

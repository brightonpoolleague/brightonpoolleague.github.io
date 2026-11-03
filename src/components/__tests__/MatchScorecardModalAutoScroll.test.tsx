import { render, act } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { MatchScorecardModal } from '../MatchScorecardModal';
import { Fixture, FrameData } from '../../types/league';
import { ensureValidLineups } from '../../utils/leagueEngine';

const mockRefreshSingleFixture = vi.fn().mockResolvedValue(undefined);

const createFrames = (completedCount: number): FrameData[] => {
  return Array.from({ length: 15 }, (_, i) => {
    const frameNumber = i + 1;
    const setNumber = Math.ceil(frameNumber / 5) as 1 | 2 | 3;
    const gameInSet = ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5;
    return {
      frameNumber,
      setNumber,
      gameInSet,
      homeSlot: gameInSet,
      awaySlot: gameInSet,
      winner: i < completedCount ? ('home' as const) : null,
      dish: false,
    };
  });
};

const mockLeagueState = {
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
  session: { role: 'captain' as const, teamId: 'team-home', name: 'Home Captain' },
  canEditFixture: vi.fn().mockReturnValue(true),
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

describe('MatchScorecardModal Set Completion Auto-Scroll', () => {
  let scrollToSpy: ReturnType<typeof vi.fn>;

  const baseFixture: Fixture = {
    id: 'fix-scroll-test',
    seasonId: 's-1',
    division: 'Division 1',
    matchDate: '2026-11-03',
    homeTeamId: 'team-home',
    awayTeamId: 'team-away',
    status: 'live',
    lagWinner: 'home',
    homeSet1Locked: true,
    awaySet1Locked: true,
    homeCaptainSigned: false,
    awayCaptainSigned: false,
    lineups: ensureValidLineups({}),
    frames: createFrames(4), // 4 of 5 recorded in Set 1
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    scrollToSpy = vi.fn();
    // In JSDOM, mock scrollTo on HTMLDivElement prototype
    HTMLDivElement.prototype.scrollTo = scrollToSpy as unknown as typeof HTMLDivElement.prototype.scrollTo;
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      value: 1200,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not scroll to bottom on initial render when set is incomplete', () => {
    render(<MatchScorecardModal fixture={baseFixture} onClose={vi.fn()} />);

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Should not have called scrollTo with top: 1200
    expect(scrollToSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ top: 1200 })
    );
  });

  it('does not auto-scroll to bottom on mount when match is already complete', () => {
    const completeFixture: Fixture = {
      ...baseFixture,
      frames: createFrames(15),
    };

    render(<MatchScorecardModal fixture={completeFixture} onClose={vi.fn()} />);

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(scrollToSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ top: 1200 })
    );
  });

  it('auto-scrolls to the bottom when the 5th frame of Set 1 is recorded', () => {
    const { rerender } = render(
      <MatchScorecardModal fixture={baseFixture} onClose={vi.fn()} />
    );

    act(() => {
      vi.advanceTimersByTime(100);
    });
    scrollToSpy.mockClear();

    // Re-render with 5th frame now recorded
    const updatedFixture: Fixture = {
      ...baseFixture,
      frames: createFrames(5),
    };
    rerender(
      <MatchScorecardModal fixture={updatedFixture} onClose={vi.fn()} />
    );

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(scrollToSpy).toHaveBeenCalledWith({
      top: 1200,
      behavior: 'smooth',
    });
  });
});

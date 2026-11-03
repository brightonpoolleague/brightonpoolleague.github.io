import { renderHook, act, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LeagueProvider, mergeBlindSet1Lineups, useLeague } from '../LeagueContext';
import { Fixture } from '../../types/league';
import { ensureValidLineups } from '../../utils/leagueEngine';
import * as supabaseModule from '../../lib/supabase';

const mockRpc = vi.fn();
const mockFrom = vi.fn();

vi.mock('../../lib/supabase', async () => {
  const actual = await vi.importActual('../../lib/supabase');
  return {
    ...actual,
    getSupabaseClient: vi.fn(),
  };
});

describe('LeagueContext Offline Mutation Queue & Concurrency Sync', () => {
  let realtimeListener: ((payload: unknown) => void) | null = null;
  const targetFixtureId = 'test-fix-d1-w1-1';

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    realtimeListener = null;

    // Seed captain session matching home team of test-fix-d1-w1-1
    localStorage.setItem(
      'bpl_session_v2',
      JSON.stringify({
        role: 'captain',
        teamId: 'team-kq-a',
        name: 'The King & Queen A',
        pin: '123456',
      })
    );

    mockRpc.mockReset();
    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === 'verify_captain_pin') {
        return Promise.resolve({ data: true, error: null });
      }
      return Promise.resolve({ data: true, error: null });
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Cloud offline' } }),
        gte: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Cloud offline' } }),
        }),
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Cloud offline' } }),
        }),
      }),
    });

    vi.mocked(supabaseModule.getSupabaseClient).mockReturnValue({
      from: mockFrom,
      rpc: mockRpc,
      channel: vi.fn().mockReturnValue({
        on: vi.fn().mockImplementation((_type, filter, cb) => {
          if (filter?.table === 'fixtures') {
            realtimeListener = cb;
          }
          return { on: vi.fn().mockReturnThis(), subscribe: vi.fn() };
        }),
        subscribe: vi.fn().mockImplementation((cb) => {
          if (cb) cb('SUBSCRIBED');
          return { unsubscribe: vi.fn() };
        }),
        track: vi.fn().mockResolvedValue(true),
      }),
      removeChannel: vi.fn().mockResolvedValue('ok'),
    } as unknown as ReturnType<typeof supabaseModule.getSupabaseClient>);
  });

  const wrapper = ({ children }: PropsWithChildren) => (
    <LeagueProvider>{children}</LeagueProvider>
  );

  it('optimistically saves fixture and queues mutation when cloud save fails due to network drop', async () => {
    // Simulate network offline error on captain_save_fixture
    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === 'verify_captain_pin') {
        return Promise.resolve({ data: true, error: null });
      }
      if (rpcName === 'captain_save_fixture') {
        return Promise.resolve({ data: null, error: { message: 'Network offline' } });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const { result } = renderHook(() => useLeague(), { wrapper });

    await waitFor(() => {
      expect(result.current.session.role).toBe('captain');
      expect(result.current.fixtures.length).toBeGreaterThan(0);
    });

    const baseFixture = result.current.fixtures.find((f) => f.id === targetFixtureId)!;
    expect(baseFixture).toBeDefined();

    const updatedFixture: Fixture = {
      ...baseFixture,
      homeSet1Locked: true,
      lineups: {
        ...baseFixture.lineups,
        set1: {
          ...baseFixture.lineups.set1,
          home: ['p1', 'p2', 'p3', 'p4', 'p5'],
        },
      },
    };

    await act(async () => {
      await result.current.saveFixture(updatedFixture, 'home');
    });

    // 1. Optimistic update is applied immediately to context
    const currentFix = result.current.fixtures.find((f) => f.id === targetFixtureId);
    expect(currentFix?.homeSet1Locked).toBe(true);
    expect(currentFix?.lineups.set1.home).toEqual(['p1', 'p2', 'p3', 'p4', 'p5']);

    // 2. Weak connection / sync error state is flagged for captain
    expect(result.current.syncError).toBe('Weak connection detected.');
  });

  it('automatically flushes queued mutation to Supabase when browser returns online', async () => {
    let saveFailedOnce = false;
    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === 'verify_captain_pin') {
        return Promise.resolve({ data: true, error: null });
      }
      if (rpcName === 'captain_save_fixture') {
        if (!saveFailedOnce) {
          saveFailedOnce = true;
          return Promise.resolve({ data: null, error: { message: 'Network offline' } });
        }
        return Promise.resolve({ data: true, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const { result } = renderHook(() => useLeague(), { wrapper });

    await waitFor(() => {
      expect(result.current.session.role).toBe('captain');
      expect(result.current.fixtures.length).toBeGreaterThan(0);
    });

    const baseFixture = result.current.fixtures.find((f) => f.id === targetFixtureId)!;

    const updatedFixture: Fixture = {
      ...baseFixture,
      homeSet1Locked: true,
      lineups: {
        ...baseFixture.lineups,
        set1: {
          ...baseFixture.lineups.set1,
          home: ['p1', 'p2', 'p3', 'p4', 'p5'],
        },
      },
    };

    await act(async () => {
      await result.current.saveFixture(updatedFixture, 'home');
    });

    expect(result.current.syncError).toBe('Weak connection detected.');

    // Trigger online event on window
    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('captain_save_fixture', expect.anything());
      expect(result.current.syncError).toBeNull();
      expect(result.current.isOnline).toBe(true);
    });
  });

  it('allows manual recovery via retryPendingSync', async () => {
    let saveFailedOnce = false;
    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === 'verify_captain_pin') {
        return Promise.resolve({ data: true, error: null });
      }
      if (rpcName === 'captain_save_fixture') {
        if (!saveFailedOnce) {
          saveFailedOnce = true;
          return Promise.resolve({ data: null, error: { message: 'Network offline' } });
        }
        return Promise.resolve({ data: true, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const { result } = renderHook(() => useLeague(), { wrapper });

    await waitFor(() => {
      expect(result.current.session.role).toBe('captain');
      expect(result.current.fixtures.length).toBeGreaterThan(0);
    });

    const baseFixture = result.current.fixtures.find((f) => f.id === targetFixtureId)!;

    const updatedFixture: Fixture = {
      ...baseFixture,
      homeSet1Locked: true,
    };

    await act(async () => {
      await result.current.saveFixture(updatedFixture, 'home');
    });

    expect(result.current.syncError).toBe('Weak connection detected.');

    // Manual retry
    await act(async () => {
      await result.current.retryPendingSync();
    });

    await waitFor(() => {
      expect(result.current.syncError).toBeNull();
    });
  });

  it('protects in-flight local saves from being overwritten by delayed incoming realtime events', async () => {
    let resolveSave: (val: unknown) => void;
    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === 'verify_captain_pin') {
        return Promise.resolve({ data: true, error: null });
      }
      if (rpcName === 'captain_save_fixture') {
        return new Promise((resolve) => {
          resolveSave = resolve;
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const { result } = renderHook(() => useLeague(), { wrapper });

    await waitFor(() => {
      expect(result.current.session.role).toBe('captain');
      expect(result.current.fixtures.length).toBeGreaterThan(0);
    });

    const baseFixture = result.current.fixtures.find((f) => f.id === targetFixtureId)!;

    const updatedFixture: Fixture = {
      ...baseFixture,
      homeSet1Locked: true,
      lineups: {
        ...baseFixture.lineups,
        set1: {
          ...baseFixture.lineups.set1,
          home: ['p1', 'p2', 'p3', 'p4', 'p5'],
        },
      },
    };

    // Start saving in the background
    let savePromise: Promise<void>;
    act(() => {
      savePromise = result.current.saveFixture(updatedFixture, 'home');
    });

    // Allow queuedTask microtask to initiate captain_save_fixture RPC call
    await new Promise((resolve) => setTimeout(resolve, 10));

    // While save is in-flight, an outdated realtime update arrives from the server
    const outdatedCloudRow = {
      id: targetFixtureId,
      home_set1_locked: false,
      away_set1_locked: false,
      home_team_id: baseFixture.homeTeamId,
      away_team_id: baseFixture.awayTeamId,
      division: baseFixture.division,
      match_date: baseFixture.matchDate,
      status: 'scheduled',
      lineups: ensureValidLineups({}),
      frames: [],
      updated_at: new Date(Date.now() - 5000).toISOString(),
    };

    act(() => {
      if (realtimeListener) {
        realtimeListener({ eventType: 'UPDATE', new: outdatedCloudRow });
      }
    });

    // Verify local state was NOT overwritten by the outdated incoming broadcast
    const fixDuringInFlight = result.current.fixtures.find((f) => f.id === targetFixtureId);
    expect(fixDuringInFlight?.homeSet1Locked).toBe(true);
    expect(fixDuringInFlight?.lineups.set1.home).toEqual(['p1', 'p2', 'p3', 'p4', 'p5']);

    // Complete the in-flight save
    await act(async () => {
      resolveSave!({ data: true, error: null });
      await savePromise;
    });

    const fixAfterDone = result.current.fixtures.find((f) => f.id === targetFixtureId);
    expect(fixAfterDone?.homeSet1Locked).toBe(true);
  });

  it('preserves secret blind lineup when opponent locks their lineup first', async () => {
    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === 'verify_captain_pin') {
        return Promise.resolve({ data: true, error: null });
      }
      return Promise.resolve({ data: true, error: null });
    });

    const { result } = renderHook(() => useLeague(), { wrapper });

    await waitFor(() => {
      expect(result.current.session.role).toBe('captain');
      expect(result.current.fixtures.length).toBeGreaterThan(0);
    });

    const baseFixture = result.current.fixtures.find((f) => f.id === targetFixtureId)!;

    // Captain has entered Home Set 1 lineup locally
    const myFixture: Fixture = {
      ...baseFixture,
      homeSet1Locked: true,
      lineups: {
        ...baseFixture.lineups,
        set1: {
          ...baseFixture.lineups.set1,
          home: ['p1', 'p2', 'p3', 'p4', 'p5'],
        },
      },
    };

    await act(async () => {
      await result.current.saveFixture(myFixture, 'home');
    });

    // Wait past the 300ms post-save quiet window so incoming realtime broadcast is accepted
    await new Promise((resolve) => setTimeout(resolve, 350));

    // An incoming update arrives: Away captain confirmed their lineup, but Home lineup in that payload
    // is redacted / empty because of blind rules
    const incomingRow = {
      id: targetFixtureId,
      home_set1_locked: false, // on cloud, Home lock was not yet visible to Away
      away_set1_locked: true,  // Away locked their side
      home_team_id: baseFixture.homeTeamId,
      away_team_id: baseFixture.awayTeamId,
      division: baseFixture.division,
      match_date: baseFixture.matchDate,
      status: 'scheduled',
      lineups: {
        set1: {
          home: [null, null, null, null, null],
          away: ['away1', 'away2', 'away3', 'away4', 'away5'],
        },
        set2: { home: [null, null, null, null, null], away: [null, null, null, null, null] },
        set3: { home: [null, null, null, null, null], away: [null, null, null, null, null] },
      },
      frames: [],
      updated_at: new Date().toISOString(),
    };

    act(() => {
      if (realtimeListener) {
        realtimeListener({ eventType: 'UPDATE', new: incomingRow });
      }
    });

    const fix = result.current.fixtures.find((f) => f.id === targetFixtureId);
    expect(fix?.homeSet1Locked).toBe(true);
    expect(fix?.awaySet1Locked).toBe(true);
    expect(fix?.lineups.set1.home).toEqual(['p1', 'p2', 'p3', 'p4', 'p5']);
    expect(fix?.lineups.set1.away).toEqual(['away1', 'away2', 'away3', 'away4', 'away5']);
  });

  it('does not resurrect stale player lineups or locked status when incoming fixture is reset or unlocked', async () => {
    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === 'verify_captain_pin') {
        return Promise.resolve({ data: true, error: null });
      }
      return Promise.resolve({ data: true, error: null });
    });

    const { result } = renderHook(() => useLeague(), { wrapper });

    await waitFor(() => {
      expect(result.current.session.role).toBe('captain');
      expect(result.current.fixtures.length).toBeGreaterThan(0);
    });

    const baseFixture = result.current.fixtures.find((f) => f.id === targetFixtureId)!;

    // Simulate existing fixture with locked lineup and player names
    const existingFixture: Fixture = {
      ...baseFixture,
      homeSet1Locked: true,
      lineups: {
        ...baseFixture.lineups,
        set1: {
          ...baseFixture.lineups.set1,
          home: ['p1', 'p2', 'p3', 'p4', 'p5'],
        },
      },
    };

    await act(async () => {
      await result.current.saveFixture(existingFixture, 'home');
    });

    await new Promise((resolve) => setTimeout(resolve, 350));

    // Admin resets the fixture: both sides unlocked with empty null lineups
    const resetCloudRow = {
      id: targetFixtureId,
      home_set1_locked: false,
      away_set1_locked: false,
      home_team_id: baseFixture.homeTeamId,
      away_team_id: baseFixture.awayTeamId,
      division: baseFixture.division,
      match_date: baseFixture.matchDate,
      status: 'scheduled',
      lineups: {
        set1: {
          home: [null, null, null, null, null],
          away: [null, null, null, null, null],
        },
        set2: { home: [null, null, null, null, null], away: [null, null, null, null, null] },
        set3: { home: [null, null, null, null, null], away: [null, null, null, null, null] },
      },
      frames: [],
      updated_at: new Date().toISOString(),
    };

    act(() => {
      if (realtimeListener) {
        realtimeListener({ eventType: 'UPDATE', new: resetCloudRow });
      }
    });

    const resetFix = result.current.fixtures.find((f) => f.id === targetFixtureId);
    expect(resetFix?.homeSet1Locked).toBe(false);
    expect(resetFix?.awaySet1Locked).toBe(false);
    expect(resetFix?.lineups.set1.home).toEqual([null, null, null, null, null]);
    expect(resetFix?.lineups.set1.away).toEqual([null, null, null, null, null]);
  });
});

describe('mergeBlindSet1Lineups pure helper', () => {
  it('returns incoming clean fixture when neither captain has locked Set 1', () => {
    const existing: Fixture = {
      id: 'fix-1',
      seasonId: 'season-1',
      division: 'Division 1',
      matchDate: '2026-10-12',
      weekNumber: 1,
      homeTeamId: 't1',
      awayTeamId: 't2',
      status: 'scheduled',
      lagWinner: null,
      homeSet1Locked: true,
      awaySet1Locked: false,
      lineups: {
        set1: {
          home: ['h1', 'h2', 'h3', 'h4', 'h5'],
          away: [null, null, null, null, null],
        },
        set2: { home: ['h1', 'h2', 'h3', 'h4', 'h5'], away: [null, null, null, null, null] },
        set3: { home: ['h1', 'h2', 'h3', 'h4', 'h5'], away: [null, null, null, null, null] },
      },
      frames: [],
      homeCaptainSigned: false,
      awayCaptainSigned: false,
      updatedAt: '2026-10-12T19:00:00Z',
    };

    const incomingReset: Fixture = {
      ...existing,
      homeSet1Locked: false,
      awaySet1Locked: false,
      lineups: {
        set1: {
          home: [null, null, null, null, null],
          away: [null, null, null, null, null],
        },
        set2: { home: [null, null, null, null, null], away: [null, null, null, null, null] },
        set3: { home: [null, null, null, null, null], away: [null, null, null, null, null] },
      },
    };

    const result = mergeBlindSet1Lineups(existing, incomingReset);
    expect(result.homeSet1Locked).toBe(false);
    expect(result.awaySet1Locked).toBe(false);
    expect(result.lineups.set1.home).toEqual([null, null, null, null, null]);
    expect(result.lineups.set1.away).toEqual([null, null, null, null, null]);
  });

  it('preserves secret home lineup when server masks home during blind reveal', () => {
    const existing: Fixture = {
      id: 'fix-1',
      seasonId: 'season-1',
      division: 'Division 1',
      matchDate: '2026-10-12',
      weekNumber: 1,
      homeTeamId: 't1',
      awayTeamId: 't2',
      status: 'scheduled',
      lagWinner: null,
      homeSet1Locked: true,
      awaySet1Locked: false,
      lineups: {
        set1: {
          home: ['h1', 'h2', 'h3', 'h4', 'h5'],
          away: [null, null, null, null, null],
        },
        set2: { home: ['h1', 'h2', 'h3', 'h4', 'h5'], away: [null, null, null, null, null] },
        set3: { home: ['h1', 'h2', 'h3', 'h4', 'h5'], away: [null, null, null, null, null] },
      },
      frames: [],
      homeCaptainSigned: false,
      awayCaptainSigned: false,
      updatedAt: '2026-10-12T19:00:00Z',
    };

    const incomingMasked: Fixture = {
      ...existing,
      homeSet1Locked: true,
      awaySet1Locked: false,
      lineups: {
        set1: {
          home: [null, null, null, null, null],
          away: [null, null, null, null, null],
        },
        set2: { home: [null, null, null, null, null], away: [null, null, null, null, null] },
        set3: { home: [null, null, null, null, null], away: [null, null, null, null, null] },
      },
    };

    const result = mergeBlindSet1Lineups(existing, incomingMasked);
    expect(result.homeSet1Locked).toBe(true);
    expect(result.lineups.set1.home).toEqual(['h1', 'h2', 'h3', 'h4', 'h5']);
  });
});

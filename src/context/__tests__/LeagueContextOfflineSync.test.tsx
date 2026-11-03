import { renderHook, act, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LeagueProvider, useLeague, STORAGE_KEYS } from '../LeagueContext';
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
      STORAGE_KEYS.SESSION,
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
});

import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LeagueProvider, useLeague, STORAGE_KEYS } from '../LeagueContext';
import { Fixture } from '../../types/league';
import { ensureValidLineups } from '../../utils/leagueEngine';
import * as supabaseModule from '../../lib/supabase';

// Mock Supabase client
const mockRpc = vi.fn();
const mockFrom = vi.fn();

vi.mock('../../lib/supabase', async () => {
  const actual = await vi.importActual('../../lib/supabase');
  return {
    ...actual,
    getSupabaseClient: vi.fn(),
  };
});

describe('LeagueContext Authentication & Auto-Logout', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    mockRpc.mockReset();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        gte: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    vi.mocked(supabaseModule.getSupabaseClient).mockReturnValue({
      from: mockFrom,
      rpc: mockRpc,
      channel: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockImplementation((cb) => {
          if (cb) cb('SUBSCRIBED');
          return { unsubscribe: vi.fn() };
        }),
        track: vi.fn().mockResolvedValue(true),
      }),
      removeChannel: vi.fn().mockResolvedValue('ok'),
    } as unknown as ReturnType<typeof supabaseModule.getSupabaseClient>);
  });

  it('automatically logs out captain to spectator when verify_captain_pin returns false on cloud refresh', async () => {
    // Seed localStorage with a captain session
    localStorage.setItem(
      STORAGE_KEYS.SESSION,
      JSON.stringify({
        role: 'captain',
        teamId: 'team-1',
        name: 'The Crown',
        pin: '123456',
      })
    );

    // Mock verify_captain_pin returning false (PIN changed by admin in DB)
    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === 'verify_captain_pin') {
        return Promise.resolve({ data: false, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LeagueProvider>{children}</LeagueProvider>
    );

    const { result } = renderHook(() => useLeague(), { wrapper });

    await waitFor(() => {
      expect(result.current.session.role).toBe('viewer');
    });

    const savedSession = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION) || '{}');
    expect(savedSession.role).toBe('viewer');
  });

  it('preserves captain session if verify_captain_pin encounters a network error', async () => {
    localStorage.setItem(
      STORAGE_KEYS.SESSION,
      JSON.stringify({
        role: 'captain',
        teamId: 'team-1',
        name: 'The Crown',
        pin: '123456',
      })
    );

    // Mock verify_captain_pin returning a network error
    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === 'verify_captain_pin') {
        return Promise.resolve({ data: null, error: { message: 'Failed to fetch', code: 'NETWORK_ERROR' } });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LeagueProvider>{children}</LeagueProvider>
    );

    const { result } = renderHook(() => useLeague(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSyncing).toBe(false);
    });

    // Session remains captain because it was a network failure, not an invalid PIN rejection
    expect(result.current.session.role).toBe('captain');
  });

  it('automatically logs out captain when saving a fixture and captain_save_fixture returns false', async () => {
    localStorage.setItem(
      STORAGE_KEYS.SESSION,
      JSON.stringify({
        role: 'captain',
        teamId: 'team-1',
        name: 'The Crown',
        pin: '123456',
      })
    );

    // Initial verify_captain_pin succeeds on mount
    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === 'verify_captain_pin') {
        return Promise.resolve({ data: true, error: null });
      }
      if (rpcName === 'captain_save_fixture') {
        // Rejected by server because PIN was changed!
        return Promise.resolve({ data: false, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LeagueProvider>{children}</LeagueProvider>
    );

    const { result } = renderHook(() => useLeague(), { wrapper });

    await waitFor(() => {
      expect(result.current.session.role).toBe('captain');
    });

    const mockFixture: Fixture = {
      id: 'fix-1',
      seasonId: 's-1',
      division: 'Division 1',
      matchDate: '2026-11-02',
      homeTeamId: 'team-1',
      awayTeamId: 'team-2',
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

    await act(async () => {
      await result.current.saveFixture(mockFixture, 'home');
    });

    await waitFor(() => {
      expect(result.current.session.role).toBe('viewer');
    });

    expect(result.current.syncError).toBeNull();
    const savedSession = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION) || '{}');
    expect(savedSession.role).toBe('viewer');
  });

  it('updates isRealtimeConnected when WebSocket connects and drops', async () => {
    let subscriberCallback: ((status: string) => void) | null = null;
    vi.mocked(supabaseModule.getSupabaseClient).mockReturnValue({
      from: mockFrom,
      rpc: mockRpc,
      channel: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockImplementation((cb) => {
          subscriberCallback = cb;
          if (cb) cb('SUBSCRIBED');
          return { unsubscribe: vi.fn() };
        }),
        track: vi.fn().mockResolvedValue(true),
      }),
      removeChannel: vi.fn().mockResolvedValue('ok'),
    } as unknown as ReturnType<typeof supabaseModule.getSupabaseClient>);

    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <LeagueProvider>{children}</LeagueProvider>
    );

    const { result } = renderHook(() => useLeague(), { wrapper });

    await waitFor(() => {
      expect(result.current.isRealtimeConnected).toBe(true);
    });

    act(() => {
      if (subscriberCallback) subscriberCallback('TIMED_OUT');
    });

    await waitFor(() => {
      expect(result.current.isRealtimeConnected).toBe(false);
    });
  });
  it('allows eligible player transfers and rejects transfers violating Rule 4b', async () => {
    const mockTeams = [
      { id: 't-1', seasonId: 'winter-2026-27', division: 'Premier League', name: 'Team Alpha', venue: 'Venue 1', address: 'Addr 1', captainName: 'Cap 1', captainPin: '111111' },
      { id: 't-2', seasonId: 'winter-2026-27', division: 'Premier League', name: 'Team Beta', venue: 'Venue 2', address: 'Addr 2', captainName: 'Cap 2', captainPin: '222222' },
    ];
    const mockPlayers = [
      { id: 'p-1', teamId: 't-1', name: 'Player One', active: true },
    ];

    localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(mockTeams));
    localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(mockPlayers));

    // Mock Supabase order to return offline so local storage is used
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Cloud offline' } }),
        gte: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Cloud offline' } }),
        }),
      }),
    });

    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <LeagueProvider>{children}</LeagueProvider>
    );

    const { result } = renderHook(() => useLeague(), { wrapper });

    await waitFor(() => {
      expect(result.current.players.length).toBeGreaterThan(0);
    });

    // Player One has 0 appearances for t-1, so Rule 4a permits transfer to t-2
    await act(async () => {
      await result.current.transferPlayer('p-1', 't-2');
    });

    const updatedPlayer = result.current.players.find((p) => p.id === 'p-1');
    expect(updatedPlayer?.teamId).toBe('t-2');
  });
  it('throws an error when transferring a player with appearances past the halfway date (Rule 4b)', async () => {
    const mockTeams = [
      { id: 't-1', seasonId: 'winter-2026-27', division: 'Premier League', name: 'Team Alpha', venue: 'Venue 1', address: 'Addr 1', captainName: 'Cap 1', captainPin: '111111' },
      { id: 't-2', seasonId: 'winter-2026-27', division: 'Premier League', name: 'Team Beta', venue: 'Venue 2', address: 'Addr 2', captainName: 'Cap 2', captainPin: '222222' },
    ];
    const mockPlayers = [
      { id: 'p-vet', teamId: 't-1', name: 'Veteran Player', active: true },
    ];
    const mockFixtures = [
      {
        id: 'f-old-1',
        seasonId: 'winter-2026-27',
        matchDate: '2020-01-01',
        homeTeamId: 't-1',
        awayTeamId: 't-2',
        status: 'approved',
        lineups: {
          set1: { home: ['p-vet', 'h2', 'h3', 'h4', 'h5'], away: ['a1', 'a2', 'a3', 'a4', 'a5'] },
          set2: { home: [null, null, null, null, null], away: [null, null, null, null, null] },
          set3: { home: [null, null, null, null, null], away: [null, null, null, null, null] },
        },
        frames: [],
      },
      {
        id: 'f-old-2',
        seasonId: 'winter-2026-27',
        matchDate: '2020-02-01',
        homeTeamId: 't-1',
        awayTeamId: 't-2',
        status: 'scheduled',
        lineups: {
          set1: { home: [null, null, null, null, null], away: [null, null, null, null, null] },
          set2: { home: [null, null, null, null, null], away: [null, null, null, null, null] },
          set3: { home: [null, null, null, null, null], away: [null, null, null, null, null] },
        },
        frames: [],
      },
    ];

    localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(mockTeams));
    localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(mockPlayers));
    localStorage.setItem(STORAGE_KEYS.FIXTURES, JSON.stringify(mockFixtures));

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Cloud offline' } }),
        gte: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Cloud offline' } }),
        }),
      }),
    });

    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <LeagueProvider>{children}</LeagueProvider>
    );

    const { result } = renderHook(() => useLeague(), { wrapper });

    await waitFor(() => {
      expect(result.current.players.length).toBeGreaterThan(0);
    });

    // p-vet made an appearance in 2020 and today is well past the halfway date (midpoint Jan 16, 2020)
    await expect(
      act(async () => {
        await result.current.transferPlayer('p-vet', 't-2');
      })
    ).rejects.toThrow(/Transfer restricted under Rule 4b/);

    // Player remains on t-1
    const p = result.current.players.find((pl) => pl.id === 'p-vet');
    expect(p?.teamId).toBe('t-1');
  });

  it('disallows team captains from editing or scoring fixtures when a team has folded, while permitting admins', async () => {
    const mockTeams = [
      { id: 't-1', seasonId: 'winter-2026-27', division: 'Premier League', name: 'Team Alpha', venue: 'Venue 1', address: 'Addr 1', captainName: 'Cap 1', captainPin: '111111' },
      { id: 't-2', seasonId: 'winter-2026-27', division: 'Premier League', name: 'Team Beta', venue: 'Venue 2', address: 'Addr 2', captainName: 'Cap 2', captainPin: '222222' },
    ];
    const mockFixtures: Partial<Fixture>[] = [
      {
        id: 'fix-scheduled-1',
        seasonId: 'winter-2026-27',
        division: 'Premier League',
        matchDate: '2026-11-01',
        homeTeamId: 't-1',
        awayTeamId: 't-2',
        status: 'scheduled',
      },
    ];

    localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(mockTeams));
    localStorage.setItem(STORAGE_KEYS.FIXTURES, JSON.stringify(mockFixtures));

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Cloud offline' } }),
        gte: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Cloud offline' } }),
        }),
      }),
    });

    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <LeagueProvider>{children}</LeagueProvider>
    );

    const { result } = renderHook(() => useLeague(), { wrapper });

    await waitFor(() => {
      expect(result.current.teams.length).toBeGreaterThan(0);
      expect(result.current.fixtures.length).toBeGreaterThan(0);
    });

    const activeFixture = result.current.fixtures[0];

    // Log in as home team captain
    act(() => {
      result.current.setRoleSession('captain', 't-1', 'Captain One', '111111');
    });

    // Active match is editable by the captain
    expect(result.current.canEditFixture(activeFixture)).toBe(true);

    // Fold the team
    await act(async () => {
      await result.current.foldTeam('t-1', '2026-10-01');
    });

    // Now fixture involves a folded team -> captain CANNOT edit
    expect(result.current.canEditFixture(activeFixture)).toBe(false);

    // Admin CAN still edit for case-by-case reviews (Rule 7c)
    act(() => {
      result.current.setRoleSession('admin', undefined, 'League Admin', '000000');
    });
    expect(result.current.canEditFixture(activeFixture)).toBe(true);
  });
  it('disallows captains from editing scorecards before the date of the match, while allowing on the day and after', async () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const mockTeams = [
      { id: 't-1', seasonId: 'winter-2026-27', division: 'Premier League', name: 'Team Alpha', venue: 'Venue 1', address: 'Addr 1', captainName: 'Cap 1', captainPin: '111111' },
      { id: 't-2', seasonId: 'winter-2026-27', division: 'Premier League', name: 'Team Beta', venue: 'Venue 2', address: 'Addr 2', captainName: 'Cap 2', captainPin: '222222' },
    ];

    const upcomingFixture: Fixture = {
      id: 'fix-future',
      seasonId: 'winter-2026-27',
      division: 'Premier League',
      matchDate: '2099-12-31',
      homeTeamId: 't-1',
      awayTeamId: 't-2',
      status: 'scheduled',
      frames: [],
      lineups: { set1: { home: [null, null, null, null, null], away: [null, null, null, null, null] }, set2: { home: [null, null, null, null, null], away: [null, null, null, null, null] }, set3: { home: [null, null, null, null, null], away: [null, null, null, null, null] } },
      lagWinner: null,
      homeSet1Locked: false,
      awaySet1Locked: false,
      homeCaptainSigned: false,
      awayCaptainSigned: false,
      updatedAt: '2026-10-01T00:00:00Z',
    };

    const todayFixture: Fixture = {
      ...upcomingFixture,
      id: 'fix-today',
      matchDate: todayStr,
    };

    const pastFixture: Fixture = {
      ...upcomingFixture,
      id: 'fix-past',
      matchDate: '2020-01-01',
    };

    localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(mockTeams));
    localStorage.setItem(STORAGE_KEYS.FIXTURES, JSON.stringify([upcomingFixture, todayFixture, pastFixture]));

    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <LeagueProvider>{children}</LeagueProvider>
    );

    const { result } = renderHook(() => useLeague(), { wrapper });

    await waitFor(() => {
      expect(result.current.teams.length).toBeGreaterThan(0);
    });

    // 1. Captain logged in
    act(() => {
      result.current.setRoleSession('captain', 't-1', 'Captain One', '111111');
    });

    // Future match is NOT editable by the captain
    expect(result.current.canEditFixture(upcomingFixture)).toBe(false);

    // Today's match IS editable
    expect(result.current.canEditFixture(todayFixture)).toBe(true);

    // Past match IS editable (after is fine)
    expect(result.current.canEditFixture(pastFixture)).toBe(true);

    // 2. Admin can edit any fixture including future ones
    act(() => {
      result.current.setRoleSession('admin', undefined, 'League Admin', '000000');
    });
    expect(result.current.canEditFixture(upcomingFixture)).toBe(true);
    expect(result.current.canEditFixture(todayFixture)).toBe(true);
    expect(result.current.canEditFixture(pastFixture)).toBe(true);
  });

  it('keeps admin logged in after loginAsAdminWithPin when window focus catchUp or admin actions run', async () => {
    const realAdminPin = '987654';

    mockRpc.mockImplementation((rpcName: string, args?: Record<string, unknown>) => {
      if (rpcName === 'verify_admin_pin') {
        return Promise.resolve({
          data: args?.p_pin === realAdminPin,
          error: null,
        });
      }
      if (rpcName === 'get_all_team_pins') {
        return Promise.resolve({
          data: args?.p_admin_pin === realAdminPin ? [{ team_id: 'team-1', captain_pin: '111111' }] : [],
          error: null,
        });
      }
      if (rpcName === 'admin_upsert_team' || rpcName === 'admin_save_fixture') {
        return Promise.resolve({
          data: args?.p_admin_pin === realAdminPin,
          error: null,
        });
      }
      return Promise.resolve({ data: true, error: null });
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LeagueProvider>{children}</LeagueProvider>
    );

    const { result } = renderHook(() => useLeague(), { wrapper });

    // Initially spectator
    expect(result.current.session.role).toBe('viewer');

    // Log in as Admin with real PIN (different from DEFAULT_ADMIN_PIN '000000')
    let loginRes: { success: boolean; error?: string } = { success: false };
    await act(async () => {
      loginRes = await result.current.loginAsAdminWithPin(realAdminPin);
    });
    expect(loginRes.success).toBe(true);
    expect(result.current.session.role).toBe('admin');
    expect(result.current.adminPin).toBe(realAdminPin);

    // Simulate >3s passing and window focus firing catchUp() inside the mount effect
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 5000);
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });

    // Admin must NOT be logged out by a stale closure adminPin ('000000')
    expect(result.current.session.role).toBe('admin');
    expect(mockRpc).toHaveBeenCalledWith('verify_admin_pin', {
      p_pin: realAdminPin,
    });
    expect(mockRpc).not.toHaveBeenCalledWith('verify_admin_pin', {
      p_pin: '000000',
    });

    // Perform an admin action (updateTeam & saveFixture) and ensure it uses realAdminPin and stays logged in
    await act(async () => {
      await result.current.updateTeam({
        id: 'team-1',
        seasonId: 'winter-2026-27',
        division: 'Premier League',
        name: 'The Crown',
        venue: 'Crown Inn',
        address: '1 High St',
        captainName: 'John',
        captainPin: '111111',
      });
    });

    expect(result.current.session.role).toBe('admin');
    expect(mockRpc).toHaveBeenCalledWith(
      'admin_upsert_team',
      expect.objectContaining({ p_admin_pin: realAdminPin })
    );

    vi.restoreAllMocks();
  });

  it('prevents admins from adding or renaming players who are already signed on to the same team or another team', async () => {
    localStorage.setItem(
      STORAGE_KEYS.TEAMS,
      JSON.stringify([
        {
          id: 'team-1',
          seasonId: 'winter-2026-27',
          division: 'Premier League',
          name: 'Castle Lagers',
          venue: 'The Castle',
          address: '1 High St',
          captainName: 'John',
          captainPin: '111111',
        },
        {
          id: 'team-2',
          seasonId: 'winter-2026-27',
          division: 'Premier League',
          name: 'Romans B',
          venue: 'The Romans',
          address: '2 High St',
          captainName: 'Jane',
          captainPin: '222222',
        },
      ])
    );
    localStorage.setItem(
      STORAGE_KEYS.PLAYERS,
      JSON.stringify([
        {
          id: 'p-1',
          teamId: 'team-1',
          name: 'John Smith',
          active: true,
        },
        {
          id: 'p-2',
          teamId: 'team-2',
          name: 'Jane Doe',
          active: true,
        },
      ])
    );

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LeagueProvider>{children}</LeagueProvider>
    );

    const { result } = renderHook(() => useLeague(), { wrapper });

    // Rejects adding a player already signed on to the same team (case-insensitive & whitespace normalised)
    await expect(
      result.current.addPlayer('team-1', '  john   smith ')
    ).rejects.toThrow(/already signed on to Castle Lagers/i);

    // Rejects adding a player already signed on to another team
    await expect(
      result.current.addPlayer('team-2', 'John Smith')
    ).rejects.toThrow(/already signed on to Castle Lagers/i);

    // Rejects renaming an existing player to a name already signed on to another team
    await expect(
      result.current.updatePlayer({
        id: 'p-2',
        teamId: 'team-2',
        name: 'John Smith',
        active: true,
      })
    ).rejects.toThrow(/already signed on to Castle Lagers/i);

    // Allows adding a brand new player
    await act(async () => {
      const added = await result.current.addPlayer('team-1', 'Alex Turner');
      expect(added.name).toBe('Alex Turner');
    });
  });

  it('automatically logs out admin to spectator if the admin PIN is invalidated on the server', async () => {
    localStorage.setItem(
      STORAGE_KEYS.SESSION,
      JSON.stringify({
        role: 'admin',
        name: 'League Admin',
        pin: '111222',
      })
    );
    localStorage.setItem(STORAGE_KEYS.ADMIN_PIN, JSON.stringify('111222'));

    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === 'verify_admin_pin') {
        return Promise.resolve({ data: false, error: null });
      }
      return Promise.resolve({ data: [], error: null });
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LeagueProvider>{children}</LeagueProvider>
    );

    const { result } = renderHook(() => useLeague(), { wrapper });

    await waitFor(() => {
      expect(result.current.session.role).toBe('viewer');
    });
  });
});

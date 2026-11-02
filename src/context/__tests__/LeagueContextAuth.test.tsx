import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LeagueProvider, useLeague } from '../LeagueContext';
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
      'bpl_session_v2',
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

    const savedSession = JSON.parse(localStorage.getItem('bpl_session_v2') || '{}');
    expect(savedSession.role).toBe('viewer');
  });

  it('preserves captain session if verify_captain_pin encounters a network error', async () => {
    localStorage.setItem(
      'bpl_session_v2',
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
      'bpl_session_v2',
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
    const savedSession = JSON.parse(localStorage.getItem('bpl_session_v2') || '{}');
    expect(savedSession.role).toBe('viewer');
  });
});

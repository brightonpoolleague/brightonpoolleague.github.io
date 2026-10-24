import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  Division,
  Fixture,
  Player,
  Team,
  UserRole,
  UserSession,
} from '../types/league';
import {
  DEFAULT_SEASON_ID,
  DEFAULT_SEASON_NAME,
  DEMO_FIXTURES,
  DEMO_PLAYERS,
  DEMO_TEAMS,
  INITIAL_FIXTURES,
  INITIAL_PLAYERS,
  INITIAL_TEAMS,
} from '../data/seedData';
import {
  applyByeRulesToFrames,
  createEmptyFrames,
  createEmptyLineups,
  syncDefaultSubsequentSets,
} from '../utils/leagueEngine';
import { getSupabaseClient, getSupabaseConfig } from '../lib/supabase';

const STORAGE_KEYS = {
  TEAMS: 'bpl_w2627_teams_v1',
  PLAYERS: 'bpl_w2627_players_v1',
  FIXTURES: 'bpl_w2627_fixtures_v1',
  SESSION: 'bpl_w2627_session_v1',
};

const BROADCAST_CHANNEL_NAME = 'bpl_live_channel_v1';

interface LeagueContextValue {
  seasonId: string;
  seasonName: string;
  teams: Team[];
  players: Player[];
  fixtures: Fixture[];
  session: UserSession;
  isCloudConnected: boolean;
  isSyncing: boolean;
  setRoleSession: (role: UserRole, teamId?: string, customName?: string) => void;
  // Team & Player management (Admin)
  addTeam: (data: Omit<Team, 'id'>) => Promise<Team>;
  updateTeam: (team: Team) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;
  addPlayer: (teamId: string, name: string) => Promise<Player>;
  removePlayer: (playerId: string) => Promise<void>;
  transferPlayer: (playerId: string, toTeamId: string) => Promise<void>;
  // Fixture & Scorecard management
  addFixture: (data: {
    division: Division;
    matchDate: string;
    weekNumber: number;
    homeTeamId: string;
    awayTeamId: string;
  }) => Promise<Fixture>;
  generateDivisionFixtures: (
    division: Division,
    startDate: string
  ) => Promise<number>;
  deleteFixture: (fixtureId: string) => Promise<void>;
  saveFixture: (updated: Fixture) => Promise<void>;
  approveFixture: (fixtureId: string) => Promise<void>;
  reopenFixture: (fixtureId: string) => Promise<void>;
  // Demo / Reset helpers
  loadDemoData: () => Promise<void>;
  resetAllData: () => Promise<void>;
  refreshFromCloud: () => Promise<void>;
  // Permissions helpers
  canEditFixture: (fixture: Fixture) => boolean;
  canManageLeague: boolean;
}

const LeagueContext = createContext<LeagueContextValue | null>(null);

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const LeagueProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [teams, setTeams] = useState<Team[]>(() =>
    loadFromStorage(STORAGE_KEYS.TEAMS, INITIAL_TEAMS)
  );
  const [players, setPlayers] = useState<Player[]>(() =>
    loadFromStorage(STORAGE_KEYS.PLAYERS, INITIAL_PLAYERS)
  );
  const [fixtures, setFixtures] = useState<Fixture[]>(() =>
    loadFromStorage(STORAGE_KEYS.FIXTURES, INITIAL_FIXTURES)
  );
  const [session, setSession] = useState<UserSession>(() =>
    loadFromStorage(STORAGE_KEYS.SESSION, {
      role: 'viewer',
      name: 'General Spectator',
    })
  );
  const [isSyncing, setIsSyncing] = useState(false);

  const isCloudConnected = getSupabaseConfig().isConfigured;

  // Persist to localStorage & broadcast across tabs
  const persistLocal = useCallback(
    (
      nextTeams: Team[],
      nextPlayers: Player[],
      nextFixtures: Fixture[],
      broadcast = true
    ) => {
      if (typeof window === 'undefined') return;
      localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(nextTeams));
      localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(nextPlayers));
      localStorage.setItem(STORAGE_KEYS.FIXTURES, JSON.stringify(nextFixtures));
      if (broadcast && 'BroadcastChannel' in window) {
        const ch = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        ch.postMessage({
          type: 'SYNC_STATE',
          teams: nextTeams,
          players: nextPlayers,
          fixtures: nextFixtures,
        });
        ch.close();
      }
    },
    []
  );

  // Listen to BroadcastChannel for instant multi-tab live score updates
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const ch = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    ch.onmessage = (ev) => {
      if (ev.data?.type === 'SYNC_STATE') {
        setTeams(ev.data.teams);
        setPlayers(ev.data.players);
        setFixtures(ev.data.fixtures);
      }
    };
    return () => ch.close();
  }, []);

  // Optional Supabase Cloud sync & Realtime subscription
  const refreshFromCloud = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setIsSyncing(true);
    try {
      const [teamsRes, playersRes, fixturesRes] = await Promise.all([
        supabase
          .from('teams')
          .select('*')
          .eq('season_id', DEFAULT_SEASON_ID)
          .order('name'),
        supabase.from('players').select('*').order('name'),
        supabase
          .from('fixtures')
          .select('*')
          .eq('season_id', DEFAULT_SEASON_ID)
          .order('match_date'),
      ]);

      if (!teamsRes.error && teamsRes.data) {
        const mappedTeams: Team[] = teamsRes.data.map((r: Record<string, unknown>) => ({
          id: String(r.id),
          division: r.division as Division,
          name: String(r.name),
          venue: String(r.venue),
          address: String(r.address ?? ''),
          captainName: String(r.captain_name ?? ''),
        }));
        setTeams(mappedTeams);
        localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(mappedTeams));
      }

      if (!playersRes.error && playersRes.data) {
        const mappedPlayers: Player[] = playersRes.data.map(
          (r: Record<string, unknown>) => ({
            id: String(r.id),
            teamId: String(r.team_id),
            name: String(r.name),
            active: Boolean(r.active ?? true),
          })
        );
        setPlayers(mappedPlayers);
        localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(mappedPlayers));
      }

      if (!fixturesRes.error && fixturesRes.data) {
        const mappedFixtures: Fixture[] = fixturesRes.data.map(
          (r: Record<string, unknown>) => ({
            id: String(r.id),
            seasonId: String(r.season_id),
            division: r.division as Division,
            matchDate: String(r.match_date),
            weekNumber: Number(r.week_number ?? 1),
            homeTeamId: String(r.home_team_id),
            awayTeamId: String(r.away_team_id),
            status: r.status as Fixture['status'],
            lagWinner: (r.lag_winner as 'home' | 'away' | null) ?? null,
            homeSet1Locked: Boolean(r.home_set1_locked),
            awaySet1Locked: Boolean(r.away_set1_locked),
            lineups: (r.lineups as Fixture['lineups']) ?? createEmptyLineups(),
            frames: (r.frames as Fixture['frames']) ?? createEmptyFrames(),
            homeCaptainSigned: Boolean(r.home_captain_signed),
            awayCaptainSigned: Boolean(r.away_captain_signed),
            submittedAt: r.submitted_at ? String(r.submitted_at) : undefined,
            approvedAt: r.approved_at ? String(r.approved_at) : undefined,
            updatedAt: String(r.updated_at ?? new Date().toISOString()),
          })
        );
        setFixtures(mappedFixtures);
        localStorage.setItem(STORAGE_KEYS.FIXTURES, JSON.stringify(mappedFixtures));
      }
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    refreshFromCloud();

    const channel = supabase
      .channel('bpl-realtime-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fixtures' },
        () => {
          refreshFromCloud();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams' },
        () => {
          refreshFromCloud();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players' },
        () => {
          refreshFromCloud();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isCloudConnected, refreshFromCloud]);

  const setRoleSession = useCallback(
    (role: UserRole, teamId?: string, customName?: string) => {
      const team = teams.find((t) => t.id === teamId);
      const name =
        customName ||
        (role === 'admin'
          ? 'League Admin'
          : role === 'captain'
          ? team
            ? `${team.name} Captain`
            : 'Team Captain'
          : 'General Spectator');
      const next: UserSession = { role, teamId, name };
      setSession(next);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(next));
      }
    },
    [teams]
  );

  const addTeam = useCallback(
    async (data: Omit<Team, 'id'>): Promise<Team> => {
      const newTeam: Team = {
        ...data,
        id: `team-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      };
      const nextTeams = [...teams, newTeam];
      setTeams(nextTeams);
      persistLocal(nextTeams, players, fixtures);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('seasons').upsert({
          id: DEFAULT_SEASON_ID,
          name: DEFAULT_SEASON_NAME,
          is_active: true,
        });
        await supabase.from('teams').upsert({
          id: newTeam.id,
          season_id: DEFAULT_SEASON_ID,
          division: newTeam.division,
          name: newTeam.name,
          venue: newTeam.venue,
          address: newTeam.address,
          captain_name: newTeam.captainName,
        });
      }
      return newTeam;
    },
    [teams, players, fixtures, persistLocal]
  );

  const updateTeam = useCallback(
    async (updatedTeam: Team): Promise<void> => {
      const nextTeams = teams.map((t) =>
        t.id === updatedTeam.id ? updatedTeam : t
      );
      setTeams(nextTeams);
      persistLocal(nextTeams, players, fixtures);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase
          .from('teams')
          .update({
            division: updatedTeam.division,
            name: updatedTeam.name,
            venue: updatedTeam.venue,
            address: updatedTeam.address,
            captain_name: updatedTeam.captainName,
          })
          .eq('id', updatedTeam.id);
      }
    },
    [teams, players, fixtures, persistLocal]
  );

  const deleteTeam = useCallback(
    async (teamId: string): Promise<void> => {
      const nextTeams = teams.filter((t) => t.id !== teamId);
      const nextPlayers = players.filter((p) => p.teamId !== teamId);
      const nextFixtures = fixtures.filter(
        (f) => f.homeTeamId !== teamId && f.awayTeamId !== teamId
      );
      setTeams(nextTeams);
      setPlayers(nextPlayers);
      setFixtures(nextFixtures);
      persistLocal(nextTeams, nextPlayers, nextFixtures);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('teams').delete().eq('id', teamId);
      }
    },
    [teams, players, fixtures, persistLocal]
  );

  const addPlayer = useCallback(
    async (teamId: string, name: string): Promise<Player> => {
      const newPlayer: Player = {
        id: `player-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        teamId,
        name: name.trim(),
        active: true,
      };
      const nextPlayers = [...players, newPlayer];
      setPlayers(nextPlayers);
      persistLocal(teams, nextPlayers, fixtures);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('players').upsert({
          id: newPlayer.id,
          team_id: newPlayer.teamId,
          name: newPlayer.name,
          active: true,
        });
      }
      return newPlayer;
    },
    [teams, players, fixtures, persistLocal]
  );

  const removePlayer = useCallback(
    async (playerId: string): Promise<void> => {
      const nextPlayers = players.filter((p) => p.id !== playerId);
      setPlayers(nextPlayers);
      persistLocal(teams, nextPlayers, fixtures);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('players').delete().eq('id', playerId);
      }
    },
    [teams, players, fixtures, persistLocal]
  );

  const transferPlayer = useCallback(
    async (playerId: string, toTeamId: string): Promise<void> => {
      const nextPlayers = players.map((p) =>
        p.id === playerId ? { ...p, teamId: toTeamId } : p
      );
      setPlayers(nextPlayers);
      persistLocal(teams, nextPlayers, fixtures);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase
          .from('players')
          .update({ team_id: toTeamId })
          .eq('id', playerId);
      }
    },
    [teams, players, fixtures, persistLocal]
  );

  const addFixture = useCallback(
    async (data: {
      division: Division;
      matchDate: string;
      weekNumber: number;
      homeTeamId: string;
      awayTeamId: string;
    }): Promise<Fixture> => {
      const newFixture: Fixture = {
        id: `fix-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        seasonId: DEFAULT_SEASON_ID,
        division: data.division,
        matchDate: data.matchDate,
        weekNumber: data.weekNumber,
        homeTeamId: data.homeTeamId,
        awayTeamId: data.awayTeamId,
        status: 'scheduled',
        lagWinner: null,
        homeSet1Locked: false,
        awaySet1Locked: false,
        lineups: createEmptyLineups(),
        frames: createEmptyFrames(),
        homeCaptainSigned: false,
        awayCaptainSigned: false,
        updatedAt: new Date().toISOString(),
      };
      const nextFixtures = [...fixtures, newFixture];
      setFixtures(nextFixtures);
      persistLocal(teams, players, nextFixtures);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('fixtures').upsert({
          id: newFixture.id,
          season_id: newFixture.seasonId,
          division: newFixture.division,
          match_date: newFixture.matchDate,
          week_number: newFixture.weekNumber,
          home_team_id: newFixture.homeTeamId,
          away_team_id: newFixture.awayTeamId,
          status: newFixture.status,
          lag_winner: newFixture.lagWinner,
          home_set1_locked: newFixture.homeSet1Locked,
          away_set1_locked: newFixture.awaySet1Locked,
          lineups: newFixture.lineups,
          frames: newFixture.frames,
          home_captain_signed: newFixture.homeCaptainSigned,
          away_captain_signed: newFixture.awayCaptainSigned,
          updated_at: newFixture.updatedAt,
        });
      }
      return newFixture;
    },
    [teams, players, fixtures, persistLocal]
  );

  // Round-robin home & away fixture generator for a division
  const generateDivisionFixtures = useCallback(
    async (division: Division, startDate: string): Promise<number> => {
      const divTeams = teams.filter((t) => t.division === division);
      if (divTeams.length < 2) return 0;

      const list: (Team | null)[] = [...divTeams];
      if (list.length % 2 === 1) {
        list.push(null); // Odd number of teams -> rest week
      }

      const n = list.length;
      const rounds = n - 1;
      const matchesPerRound = n / 2;
      const generated: Fixture[] = [];

      const baseDate = new Date(startDate || '2026-11-02');

      const addDays = (d: Date, days: number) => {
        const copy = new Date(d);
        copy.setDate(copy.getDate() + days);
        return copy.toISOString().slice(0, 10);
      };

      const rotation = [...list];
      // First half of season (Home vs Away) and Second half (Reverse fixtures)
      for (let leg = 0; leg < 2; leg++) {
        for (let round = 0; round < rounds; round++) {
          const weekIndex = leg * rounds + round;
          const matchDate = addDays(baseDate, weekIndex * 7);

          for (let i = 0; i < matchesPerRound; i++) {
            const t1 = rotation[i];
            const t2 = rotation[n - 1 - i];
            if (t1 && t2) {
              const home = leg === 0 ? t1 : t2;
              const away = leg === 0 ? t2 : t1;
              generated.push({
                id: `fix-${division.toLowerCase().replace(/\s+/g, '')}-w${
                  weekIndex + 1
                }-${home.id}-${away.id}-${Date.now()}`,
                seasonId: DEFAULT_SEASON_ID,
                division,
                matchDate,
                weekNumber: weekIndex + 1,
                homeTeamId: home.id,
                awayTeamId: away.id,
                status: 'scheduled',
                lagWinner: null,
                homeSet1Locked: false,
                awaySet1Locked: false,
                lineups: createEmptyLineups(),
                frames: createEmptyFrames(),
                homeCaptainSigned: false,
                awayCaptainSigned: false,
                updatedAt: new Date().toISOString(),
              });
            }
          }
          // Rotate all except index 0
          const last = rotation.pop()!;
          rotation.splice(1, 0, last);
        }
      }

      const nextFixtures = [...fixtures, ...generated];
      setFixtures(nextFixtures);
      persistLocal(teams, players, nextFixtures);
      return generated.length;
    },
    [teams, players, fixtures, persistLocal]
  );

  const deleteFixture = useCallback(
    async (fixtureId: string): Promise<void> => {
      const nextFixtures = fixtures.filter((f) => f.id !== fixtureId);
      setFixtures(nextFixtures);
      persistLocal(teams, players, nextFixtures);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('fixtures').delete().eq('id', fixtureId);
      }
    },
    [teams, players, fixtures, persistLocal]
  );

  const saveFixture = useCallback(
    async (rawUpdated: Fixture): Promise<void> => {
      const syncedLineups = syncDefaultSubsequentSets(rawUpdated.lineups);
      const syncedFrames = applyByeRulesToFrames(
        syncedLineups,
        rawUpdated.frames,
        rawUpdated.lagWinner
      );

      const completedCount = syncedFrames.filter((f) => f.winner !== null).length;
      const hasAnyLineup =
        syncedLineups.set1.home.some(Boolean) ||
        syncedLineups.set1.away.some(Boolean);

      let nextStatus = rawUpdated.status;
      if (nextStatus === 'scheduled' && (completedCount > 0 || hasAnyLineup)) {
        nextStatus = 'live';
      }

      const updated: Fixture = {
        ...rawUpdated,
        status: nextStatus,
        lineups: syncedLineups,
        frames: syncedFrames,
        updatedAt: new Date().toISOString(),
      };

      const nextFixtures = fixtures.map((f) =>
        f.id === updated.id ? updated : f
      );
      setFixtures(nextFixtures);
      persistLocal(teams, players, nextFixtures);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase
          .from('fixtures')
          .update({
            status: updated.status,
            lag_winner: updated.lagWinner,
            home_set1_locked: updated.homeSet1Locked,
            away_set1_locked: updated.awaySet1Locked,
            lineups: updated.lineups,
            frames: updated.frames,
            home_captain_signed: updated.homeCaptainSigned,
            away_captain_signed: updated.awayCaptainSigned,
            submitted_at: updated.submittedAt ?? null,
            approved_at: updated.approvedAt ?? null,
            updated_at: updated.updatedAt,
          })
          .eq('id', updated.id);
      }
    },
    [teams, players, fixtures, persistLocal]
  );

  const approveFixture = useCallback(
    async (fixtureId: string): Promise<void> => {
      const target = fixtures.find((f) => f.id === fixtureId);
      if (!target) return;
      const now = new Date().toISOString();
      await saveFixture({
        ...target,
        status: 'approved',
        approvedAt: now,
      });
    },
    [fixtures, saveFixture]
  );

  const reopenFixture = useCallback(
    async (fixtureId: string): Promise<void> => {
      const target = fixtures.find((f) => f.id === fixtureId);
      if (!target) return;
      await saveFixture({
        ...target,
        status: 'live',
        approvedAt: undefined,
      });
    },
    [fixtures, saveFixture]
  );

  const loadDemoData = useCallback(async () => {
    setTeams(DEMO_TEAMS);
    setPlayers(DEMO_PLAYERS);
    setFixtures(DEMO_FIXTURES);
    persistLocal(DEMO_TEAMS, DEMO_PLAYERS, DEMO_FIXTURES);
  }, [persistLocal]);

  const resetAllData = useCallback(async () => {
    setTeams([]);
    setPlayers([]);
    setFixtures([]);
    persistLocal([], [], []);
  }, [persistLocal]);

  const canManageLeague = session.role === 'admin';

  const canEditFixture = useCallback(
    (fixture: Fixture): boolean => {
      if (session.role === 'admin') return true;
      if (session.role === 'captain' && fixture.status !== 'approved') {
        return (
          session.teamId === fixture.homeTeamId ||
          session.teamId === fixture.awayTeamId
        );
      }
      return false;
    },
    [session]
  );

  return (
    <LeagueContext.Provider
      value={{
        seasonId: DEFAULT_SEASON_ID,
        seasonName: DEFAULT_SEASON_NAME,
        teams,
        players,
        fixtures,
        session,
        isCloudConnected,
        isSyncing,
        setRoleSession,
        addTeam,
        updateTeam,
        deleteTeam,
        addPlayer,
        removePlayer,
        transferPlayer,
        addFixture,
        generateDivisionFixtures,
        deleteFixture,
        saveFixture,
        approveFixture,
        reopenFixture,
        loadDemoData,
        resetAllData,
        refreshFromCloud,
        canEditFixture,
        canManageLeague,
      }}
    >
      {children}
    </LeagueContext.Provider>
  );
};

export function useLeague(): LeagueContextValue {
  const ctx = useContext(LeagueContext);
  if (!ctx) {
    throw new Error('useLeague must be used inside a LeagueProvider');
  }
  return ctx;
}

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import {
  DEFAULT_DIVISIONS,
  Division,
  Fixture,
  Player,
  Season,
  Team,
  UserRole,
  UserSession,
} from '../types/league';
import {
  DEFAULT_ADMIN_PIN,
  DEFAULT_SEASON_ID,
  INITIAL_FIXTURES,
  INITIAL_PLAYERS,
  INITIAL_SEASONS,
  INITIAL_TEAMS,
} from '../data/seedData';
import {
  LOCAL_TEST_FIXTURES,
  LOCAL_TEST_PLAYERS,
  LOCAL_TEST_TEAMS,
} from '../data/testData';
import {
  applyByeRulesToFrames,
  createEmptyFrames,
  createEmptyLineups,
  syncDefaultSubsequentSets,
} from '../utils/leagueEngine';
import { getSupabaseClient, getSupabaseConfig } from '../lib/supabase';

const STORAGE_KEYS = {
  SEASONS: 'bpl_seasons_v3',
  ACTIVE_SEASON_ID: 'bpl_active_season_id_v3',
  ADMIN_PIN: 'bpl_admin_pin_local_v5',
  TEAMS: 'bpl_teams_local_v3',
  PLAYERS: 'bpl_players_local_v3',
  FIXTURES: 'bpl_fixtures_local_v3',
  SESSION: 'bpl_session_v2',
};

export function generateRandomPin(): string {
  return String(Math.floor(10000000 + Math.random() * 90000000));
}

function mapSeasonRow(r: Record<string, unknown>): Season {
  const rawDivs = r.divisions;
  const divisions =
    Array.isArray(rawDivs) && rawDivs.length > 0
      ? rawDivs.map((d) => String(d))
      : DEFAULT_DIVISIONS;
  return {
    id: String(r.id),
    name: String(r.name),
    isActive: Boolean(r.is_active),
    divisions,
  };
}

function mapTeamRow(
  r: Record<string, unknown>,
  existingPin = '••••••••'
): Team {
  return {
    id: String(r.id),
    seasonId: String(r.season_id ?? DEFAULT_SEASON_ID),
    division: r.division as Division,
    name: String(r.name),
    venue: String(r.venue),
    address: String(r.address ?? ''),
    captainName: String(r.captain_name ?? ''),
    captainPin: existingPin,
    tableNumber: r.table_number ? String(r.table_number) : undefined,
  };
}

function mapPlayerRow(r: Record<string, unknown>): Player {
  return {
    id: String(r.id),
    teamId: String(r.team_id),
    name: String(r.name),
    active: Boolean(r.active ?? true),
  };
}

function mapFixtureRow(r: Record<string, unknown>): Fixture {
  return {
    id: String(r.id),
    seasonId: String(r.season_id ?? DEFAULT_SEASON_ID),
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
  };
}

interface LeagueContextValue {
  seasons: Season[];
  seasonId: string;
  seasonName: string;
  divisions: Division[];
  setSelectedSeasonId: (id: string) => void;
  createNewSeason: (
    name: string,
    copyTeamsFromCurrent: boolean,
    customDivisions?: Division[]
  ) => Promise<Season>;
  addDivision: (divisionName: string) => Promise<void>;
  removeDivision: (divisionName: string) => Promise<void>;
  teams: Team[];
  players: Player[];
  fixtures: Fixture[];
  session: UserSession;
  adminPin: string;
  isCloudConnected: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  syncError: string | null;
  retryPendingSync: () => Promise<void>;
  setRoleSession: (
    role: UserRole,
    teamId?: string,
    customName?: string,
    pin?: string
  ) => void;
  loginAsCaptainWithPin: (
    teamId: string,
    pin: string
  ) => Promise<{ success: boolean; error?: string }>;
  loginAsAdminWithPin: (
    pin: string
  ) => Promise<{ success: boolean; error?: string }>;
  updateTeamPin: (teamId: string, newPin: string) => Promise<void>;
  addTeam: (
    data: Omit<Team, 'id' | 'seasonId' | 'captainPin'> & {
      captainPin?: string;
    }
  ) => Promise<Team>;
  updateTeam: (team: Team) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;
  addPlayer: (teamId: string, name: string) => Promise<Player>;
  removePlayer: (playerId: string) => Promise<void>;
  transferPlayer: (playerId: string, toTeamId: string) => Promise<void>;
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
  updateFixtureDetails: (updated: Fixture) => Promise<void>;
  saveFixture: (
    updated: Fixture,
    editedSide?: 'home' | 'away' | 'frames'
  ) => Promise<void>;
  approveFixture: (fixtureId: string) => Promise<void>;
  reopenFixture: (fixtureId: string) => Promise<void>;
  refreshFromCloud: () => Promise<void>;
  resetLocalTestData: () => void;
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
  const isCloudConnected = getSupabaseConfig().isConfigured;

  const [seasons, setSeasons] = useState<Season[]>(() =>
    loadFromStorage(STORAGE_KEYS.SEASONS, INITIAL_SEASONS)
  );
  const [selectedSeasonId, setSelectedSeasonIdState] = useState<string>(() =>
    loadFromStorage(STORAGE_KEYS.ACTIVE_SEASON_ID, DEFAULT_SEASON_ID)
  );
  const [adminPin, setAdminPin] = useState<string>(() =>
    loadFromStorage(STORAGE_KEYS.ADMIN_PIN, DEFAULT_ADMIN_PIN)
  );
  const [allTeams, setAllTeams] = useState<Team[]>(() =>
    loadFromStorage(
      STORAGE_KEYS.TEAMS,
      isCloudConnected ? INITIAL_TEAMS : LOCAL_TEST_TEAMS
    )
  );
  const [allPlayers, setAllPlayers] = useState<Player[]>(() =>
    loadFromStorage(
      STORAGE_KEYS.PLAYERS,
      isCloudConnected ? INITIAL_PLAYERS : LOCAL_TEST_PLAYERS
    )
  );
  const [allFixtures, setAllFixtures] = useState<Fixture[]>(() =>
    loadFromStorage(
      STORAGE_KEYS.FIXTURES,
      isCloudConnected ? INITIAL_FIXTURES : LOCAL_TEST_FIXTURES
    )
  );
  const [session, setSession] = useState<UserSession>(() =>
    loadFromStorage(STORAGE_KEYS.SESSION, {
      role: 'viewer',
      name: 'General Spectator',
    })
  );
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [pendingFixtureSync, setPendingFixtureSync] = useState<{
    fixture: Fixture;
    editedSide?: 'home' | 'away' | 'frames';
  } | null>(null);

  const activeSeason =
    seasons.find((s) => s.id === selectedSeasonId) ||
    seasons[0] ||
    INITIAL_SEASONS[0];

  const seasonId = activeSeason.id;
  const seasonName = activeSeason.name;
  const divisions = useMemo(
    () =>
      activeSeason.divisions && activeSeason.divisions.length > 0
        ? activeSeason.divisions
        : DEFAULT_DIVISIONS,
    [activeSeason]
  );

  const teams = useMemo(
    () => allTeams.filter((t) => (t.seasonId || DEFAULT_SEASON_ID) === seasonId),
    [allTeams, seasonId]
  );

  const seasonTeamIds = useMemo(
    () => new Set(teams.map((t) => t.id)),
    [teams]
  );

  const players = useMemo(
    () => allPlayers.filter((p) => seasonTeamIds.has(p.teamId)),
    [allPlayers, seasonTeamIds]
  );

  const fixtures = useMemo(
    () =>
      allFixtures.filter((f) => (f.seasonId || DEFAULT_SEASON_ID) === seasonId),
    [allFixtures, seasonId]
  );

  const setSelectedSeasonId = useCallback((id: string) => {
    setSelectedSeasonIdState(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SEASON_ID, JSON.stringify(id));
    }
  }, []);

  const persistLocal = useCallback(
    (
      nextTeams: Team[],
      nextPlayers: Player[],
      nextFixtures: Fixture[],
      nextSeasons: Season[] = seasons,
      nextAdminPin: string = adminPin
    ) => {
      if (typeof window === 'undefined') return;
      localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(nextTeams));
      localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(nextPlayers));
      localStorage.setItem(STORAGE_KEYS.FIXTURES, JSON.stringify(nextFixtures));
      localStorage.setItem(STORAGE_KEYS.SEASONS, JSON.stringify(nextSeasons));
      localStorage.setItem(
        STORAGE_KEYS.ADMIN_PIN,
        JSON.stringify(nextAdminPin)
      );
    },
    [seasons, adminPin]
  );

  const refreshFromCloud = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setIsSyncing(true);
    try {
      const [seasonsRes, teamsRes, playersRes, fixturesRes] = await Promise.all([
        supabase.from('seasons').select('*').order('created_at'),
        supabase.from('teams').select('*').order('name'),
        supabase.from('players').select('*').order('name'),
        supabase.from('fixtures').select('*').order('match_date'),
      ]);

      // If logged in as Admin, fetch protected team PINs via server-side RPC
      const pinMap: Record<string, string> = {};
      if (session.role === 'admin' && adminPin) {
        const pinsRes = await supabase.rpc('get_all_team_pins', {
          p_admin_pin: adminPin,
        });
        if (!pinsRes.error && Array.isArray(pinsRes.data)) {
          pinsRes.data.forEach(
            (row: { team_id: string; captain_pin: string }) => {
              pinMap[row.team_id] = row.captain_pin;
            }
          );
        }
      }

      if (!seasonsRes.error && seasonsRes.data && seasonsRes.data.length > 0) {
        const mappedSeasons: Season[] = seasonsRes.data.map((r) =>
          mapSeasonRow(r as Record<string, unknown>)
        );
        setSeasons(mappedSeasons);
        localStorage.setItem(
          STORAGE_KEYS.SEASONS,
          JSON.stringify(mappedSeasons)
        );
      }

      if (!teamsRes.error && teamsRes.data) {
        const mappedTeams: Team[] = teamsRes.data.map((r) => {
          const row = r as Record<string, unknown>;
          const id = String(row.id);
          return mapTeamRow(row, pinMap[id] ?? '••••••••');
        });
        setAllTeams(mappedTeams);
        localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(mappedTeams));
      }

      if (!playersRes.error && playersRes.data) {
        const mappedPlayers: Player[] = playersRes.data.map((r) =>
          mapPlayerRow(r as Record<string, unknown>)
        );
        setAllPlayers(mappedPlayers);
        localStorage.setItem(
          STORAGE_KEYS.PLAYERS,
          JSON.stringify(mappedPlayers)
        );
      }

      if (!fixturesRes.error && fixturesRes.data) {
        const mappedFixtures: Fixture[] = fixturesRes.data.map((r) =>
          mapFixtureRow(r as Record<string, unknown>)
        );
        setAllFixtures(mappedFixtures);
        localStorage.setItem(
          STORAGE_KEYS.FIXTURES,
          JSON.stringify(mappedFixtures)
        );
      }
    } finally {
      setIsSyncing(false);
    }
  }, [session.role, adminPin]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    let activeChannel: ReturnType<typeof supabase.channel> | null = null;

    const connectRealtime = () => {
      if (activeChannel) return;
      activeChannel = supabase
        .channel('bpl-realtime-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'fixtures' },
          (payload) => {
            if (
              (payload.eventType === 'INSERT' ||
                payload.eventType === 'UPDATE') &&
              payload.new
            ) {
              const updated = mapFixtureRow(
                payload.new as Record<string, unknown>
              );
              setAllFixtures((prev) => {
                const exists = prev.some((f) => f.id === updated.id);
                const next = exists
                  ? prev.map((f) => (f.id === updated.id ? updated : f))
                  : [...prev, updated];
                localStorage.setItem(
                  STORAGE_KEYS.FIXTURES,
                  JSON.stringify(next)
                );
                return next;
              });
            } else if (payload.eventType === 'DELETE' && payload.old) {
              const deletedId = String(
                (payload.old as Record<string, unknown>).id
              );
              setAllFixtures((prev) => {
                const next = prev.filter((f) => f.id !== deletedId);
                localStorage.setItem(
                  STORAGE_KEYS.FIXTURES,
                  JSON.stringify(next)
                );
                return next;
              });
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'teams' },
          (payload) => {
            if (
              (payload.eventType === 'INSERT' ||
                payload.eventType === 'UPDATE') &&
              payload.new
            ) {
              const row = payload.new as Record<string, unknown>;
              const rowId = String(row.id);
              setAllTeams((prev) => {
                const existing = prev.find((t) => t.id === rowId);
                const updated = mapTeamRow(
                  row,
                  existing?.captainPin ?? '••••••••'
                );
                const next = existing
                  ? prev.map((t) => (t.id === rowId ? updated : t))
                  : [...prev, updated];
                localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(next));
                return next;
              });
            } else if (payload.eventType === 'DELETE' && payload.old) {
              const deletedId = String(
                (payload.old as Record<string, unknown>).id
              );
              setAllTeams((prev) => {
                const next = prev.filter((t) => t.id !== deletedId);
                localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(next));
                return next;
              });
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'players' },
          (payload) => {
            if (
              (payload.eventType === 'INSERT' ||
                payload.eventType === 'UPDATE') &&
              payload.new
            ) {
              const updated = mapPlayerRow(
                payload.new as Record<string, unknown>
              );
              setAllPlayers((prev) => {
                const exists = prev.some((p) => p.id === updated.id);
                const next = exists
                  ? prev.map((p) => (p.id === updated.id ? updated : p))
                  : [...prev, updated];
                localStorage.setItem(
                  STORAGE_KEYS.PLAYERS,
                  JSON.stringify(next)
                );
                return next;
              });
            } else if (payload.eventType === 'DELETE' && payload.old) {
              const deletedId = String(
                (payload.old as Record<string, unknown>).id
              );
              setAllPlayers((prev) => {
                const next = prev.filter((p) => p.id !== deletedId);
                localStorage.setItem(
                  STORAGE_KEYS.PLAYERS,
                  JSON.stringify(next)
                );
                return next;
              });
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'seasons' },
          (payload) => {
            if (
              (payload.eventType === 'INSERT' ||
                payload.eventType === 'UPDATE') &&
              payload.new
            ) {
              const updated = mapSeasonRow(
                payload.new as Record<string, unknown>
              );
              setSeasons((prev) => {
                const exists = prev.some((s) => s.id === updated.id);
                const next = exists
                  ? prev.map((s) => (s.id === updated.id ? updated : s))
                  : [...prev, updated];
                localStorage.setItem(
                  STORAGE_KEYS.SEASONS,
                  JSON.stringify(next)
                );
                return next;
              });
            }
          }
        )
        .subscribe();
    };

    const disconnectRealtime = () => {
      if (activeChannel) {
        supabase.removeChannel(activeChannel);
        activeChannel = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshFromCloud();
        connectRealtime();
      } else {
        disconnectRealtime();
      }
    };

    refreshFromCloud();
    if (
      typeof document === 'undefined' ||
      document.visibilityState === 'visible'
    ) {
      connectRealtime();
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener(
          'visibilitychange',
          handleVisibilityChange
        );
      }
      disconnectRealtime();
    };
  }, [isCloudConnected, refreshFromCloud]);

  const setRoleSession = useCallback(
    (role: UserRole, teamId?: string, customName?: string, pin?: string) => {
      const team = allTeams.find((t) => t.id === teamId);
      const name =
        customName ||
        (role === 'admin'
          ? 'League Admin'
          : role === 'captain'
          ? team
            ? `${team.name} Captain`
            : 'Team Captain'
          : 'General Spectator');
      const next: UserSession = { role, teamId, name, pin };
      setSession(next);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(next));
      }
    },
    [allTeams]
  );

  const loginAsCaptainWithPin = useCallback(
    async (
      teamId: string,
      pin: string
    ): Promise<{ success: boolean; error?: string }> => {
      const cleanPin = pin.trim();
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.rpc('verify_captain_pin', {
          p_team_id: teamId,
          p_pin: cleanPin,
        });
        if (error) {
          return { success: false, error: error.message };
        }
        if (data === true) {
          setRoleSession('captain', teamId, undefined, cleanPin);
          return { success: true };
        }
        return {
          success: false,
          error: 'Incorrect Team Captain PIN. Check with League Admin.',
        };
      }

      // Offline / local fallback
      const team = allTeams.find((t) => t.id === teamId);
      if (!team) return { success: false, error: 'Team not found.' };
      if (
        team.captainPin.trim() === cleanPin ||
        adminPin.trim() === cleanPin
      ) {
        setRoleSession('captain', teamId, undefined, cleanPin);
        return { success: true };
      }
      return {
        success: false,
        error: 'Incorrect Team Captain PIN. Check with League Admin.',
      };
    },
    [allTeams, adminPin, setRoleSession]
  );

  const loginAsAdminWithPin = useCallback(
    async (pin: string): Promise<{ success: boolean; error?: string }> => {
      const cleanPin = pin.trim();
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.rpc('verify_admin_pin', {
          p_pin: cleanPin,
        });
        if (error) {
          return { success: false, error: error.message };
        }
        if (data === true) {
          setAdminPin(cleanPin);
          localStorage.setItem(STORAGE_KEYS.ADMIN_PIN, JSON.stringify(cleanPin));
          setRoleSession('admin', undefined, undefined, cleanPin);

          // Load protected team PINs for Admin view
          const pinsRes = await supabase.rpc('get_all_team_pins', {
            p_admin_pin: cleanPin,
          });
          if (!pinsRes.error && Array.isArray(pinsRes.data)) {
            const pinMap: Record<string, string> = {};
            pinsRes.data.forEach(
              (row: { team_id: string; captain_pin: string }) => {
                pinMap[row.team_id] = row.captain_pin;
              }
            );
            setAllTeams((prev) =>
              prev.map((t) => ({
                ...t,
                captainPin: pinMap[t.id] ?? t.captainPin,
              }))
            );
          }
          return { success: true };
        }
        return { success: false, error: 'Incorrect League Admin PIN.' };
      }

      // Offline / local fallback
      if (
        adminPin.trim() === cleanPin ||
        cleanPin === DEFAULT_ADMIN_PIN ||
        cleanPin === '00000000'
      ) {
        setRoleSession('admin', undefined, undefined, cleanPin);
        return { success: true };
      }
      return { success: false, error: 'Incorrect League Admin PIN.' };
    },
    [adminPin, setRoleSession]
  );

  const updateTeamPin = useCallback(
    async (teamId: string, newPin: string): Promise<void> => {
      const clean = newPin.trim();
      if (!clean) return;
      const nextTeams = allTeams.map((t) =>
        t.id === teamId ? { ...t, captainPin: clean } : t
      );
      setAllTeams(nextTeams);
      persistLocal(nextTeams, allPlayers, allFixtures);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.rpc('set_team_pin', {
          p_admin_pin: adminPin,
          p_team_id: teamId,
          p_new_pin: clean,
        });
      }
    },
    [adminPin, allTeams, allPlayers, allFixtures, persistLocal]
  );

  const addDivision = useCallback(
    async (divisionName: string): Promise<void> => {
      const clean = divisionName.trim();
      if (!clean || divisions.includes(clean)) return;
      const nextDivisions = [...divisions, clean];
      const nextSeasons = seasons.map((s) =>
        s.id === seasonId ? { ...s, divisions: nextDivisions } : s
      );
      setSeasons(nextSeasons);
      persistLocal(allTeams, allPlayers, allFixtures, nextSeasons, adminPin);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.rpc('admin_upsert_season', {
          p_admin_pin: adminPin,
          p_id: seasonId,
          p_name: seasonName,
          p_is_active: activeSeason.isActive,
          p_divisions: nextDivisions,
        });
      }
    },
    [
      divisions,
      seasons,
      seasonId,
      seasonName,
      activeSeason.isActive,
      allTeams,
      allPlayers,
      allFixtures,
      adminPin,
      persistLocal,
    ]
  );

  const removeDivision = useCallback(
    async (divisionName: string): Promise<void> => {
      if (divisions.length <= 1) return;
      const nextDivisions = divisions.filter((d) => d !== divisionName);
      const nextSeasons = seasons.map((s) =>
        s.id === seasonId ? { ...s, divisions: nextDivisions } : s
      );
      setSeasons(nextSeasons);
      persistLocal(allTeams, allPlayers, allFixtures, nextSeasons, adminPin);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.rpc('admin_upsert_season', {
          p_admin_pin: adminPin,
          p_id: seasonId,
          p_name: seasonName,
          p_is_active: activeSeason.isActive,
          p_divisions: nextDivisions,
        });
      }
    },
    [
      divisions,
      seasons,
      seasonId,
      seasonName,
      activeSeason.isActive,
      allTeams,
      allPlayers,
      allFixtures,
      adminPin,
      persistLocal,
    ]
  );

  const createNewSeason = useCallback(
    async (
      name: string,
      copyTeamsFromCurrent: boolean,
      customDivisions?: Division[]
    ): Promise<Season> => {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const newSeasonId = `${slug}-${Date.now().toString(36).slice(-3)}`;
      const seasonDivisions =
        customDivisions && customDivisions.length > 0
          ? customDivisions
          : [...divisions];

      const newSeason: Season = {
        id: newSeasonId,
        name: name.trim(),
        isActive: true,
        divisions: seasonDivisions,
      };

      const nextSeasons = [
        ...seasons.map((s) => ({ ...s, isActive: false })),
        newSeason,
      ];

      let nextTeams = [...allTeams];
      let nextPlayers = [...allPlayers];
      const clonedTeams: Team[] = [];
      const clonedPlayers: Player[] = [];

      if (copyTeamsFromCurrent) {
        teams.forEach((oldTeam) => {
          const newTeamId = `team-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 6)}`;
          clonedTeams.push({
            ...oldTeam,
            id: newTeamId,
            seasonId: newSeasonId,
          });
          players
            .filter((p) => p.teamId === oldTeam.id)
            .forEach((oldP) => {
              clonedPlayers.push({
                ...oldP,
                id: `player-${Date.now()}-${Math.random()
                  .toString(36)
                  .slice(2, 6)}`,
                teamId: newTeamId,
              });
            });
        });
        nextTeams = [...nextTeams, ...clonedTeams];
        nextPlayers = [...nextPlayers, ...clonedPlayers];
      }

      setSeasons(nextSeasons);
      setAllTeams(nextTeams);
      setAllPlayers(nextPlayers);
      setSelectedSeasonId(newSeasonId);
      persistLocal(nextTeams, nextPlayers, allFixtures, nextSeasons, adminPin);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.rpc('admin_upsert_season', {
          p_admin_pin: adminPin,
          p_id: newSeason.id,
          p_name: newSeason.name,
          p_is_active: true,
          p_divisions: seasonDivisions,
        });
        for (const t of clonedTeams) {
          await supabase.rpc('admin_upsert_team', {
            p_admin_pin: adminPin,
            p_id: t.id,
            p_season_id: t.seasonId,
            p_division: t.division,
            p_name: t.name,
            p_venue: t.venue,
            p_address: t.address,
            p_captain_name: t.captainName,
            p_captain_pin:
              t.captainPin !== '••••••••' ? t.captainPin : generateRandomPin(),
          });
        }
        for (const p of clonedPlayers) {
          await supabase.rpc('admin_upsert_player', {
            p_admin_pin: adminPin,
            p_id: p.id,
            p_team_id: p.teamId,
            p_name: p.name,
            p_active: p.active,
          });
        }
      }

      return newSeason;
    },
    [
      divisions,
      seasons,
      allTeams,
      allPlayers,
      allFixtures,
      teams,
      players,
      adminPin,
      setSelectedSeasonId,
      persistLocal,
    ]
  );

  const addTeam = useCallback(
    async (
      data: Omit<Team, 'id' | 'seasonId' | 'captainPin'> & {
        captainPin?: string;
      }
    ): Promise<Team> => {
      const generatedPin = data.captainPin?.trim() || generateRandomPin();
      const newTeam: Team = {
        ...data,
        id: `team-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        seasonId,
        captainPin: generatedPin,
      };
      const nextTeams = [...allTeams, newTeam];
      setAllTeams(nextTeams);
      persistLocal(nextTeams, allPlayers, allFixtures);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.rpc('admin_upsert_season', {
          p_admin_pin: adminPin,
          p_id: seasonId,
          p_name: seasonName,
          p_is_active: true,
          p_divisions: divisions,
        });
        await supabase.rpc('admin_upsert_team', {
          p_admin_pin: adminPin,
          p_id: newTeam.id,
          p_season_id: newTeam.seasonId,
          p_division: newTeam.division,
          p_name: newTeam.name,
          p_venue: newTeam.venue,
          p_address: newTeam.address,
          p_captain_name: newTeam.captainName,
          p_captain_pin: generatedPin,
          p_table_number: newTeam.tableNumber ?? null,
        });
      }
      return newTeam;
    },
    [
      seasonId,
      seasonName,
      divisions,
      adminPin,
      allTeams,
      allPlayers,
      allFixtures,
      persistLocal,
    ]
  );

  const updateTeam = useCallback(
    async (updatedTeam: Team): Promise<void> => {
      const nextTeams = allTeams.map((t) =>
        t.id === updatedTeam.id ? updatedTeam : t
      );
      setAllTeams(nextTeams);
      persistLocal(nextTeams, allPlayers, allFixtures);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.rpc('admin_upsert_team', {
          p_admin_pin: adminPin,
          p_id: updatedTeam.id,
          p_season_id: updatedTeam.seasonId,
          p_division: updatedTeam.division,
          p_name: updatedTeam.name,
          p_venue: updatedTeam.venue,
          p_address: updatedTeam.address,
          p_captain_name: updatedTeam.captainName,
          p_captain_pin: null,
          p_table_number: updatedTeam.tableNumber ?? null,
        });
      }
    },
    [adminPin, allTeams, allPlayers, allFixtures, persistLocal]
  );

  const deleteTeam = useCallback(
    async (teamId: string): Promise<void> => {
      const nextTeams = allTeams.filter((t) => t.id !== teamId);
      const nextPlayers = allPlayers.filter((p) => p.teamId !== teamId);
      const nextFixtures = allFixtures.filter(
        (f) => f.homeTeamId !== teamId && f.awayTeamId !== teamId
      );
      setAllTeams(nextTeams);
      setAllPlayers(nextPlayers);
      setAllFixtures(nextFixtures);
      persistLocal(nextTeams, nextPlayers, nextFixtures);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.rpc('admin_delete_team', {
          p_admin_pin: adminPin,
          p_team_id: teamId,
        });
      }
    },
    [adminPin, allTeams, allPlayers, allFixtures, persistLocal]
  );

  const addPlayer = useCallback(
    async (teamId: string, name: string): Promise<Player> => {
      const newPlayer: Player = {
        id: `player-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        teamId,
        name: name.trim(),
        active: true,
      };
      const nextPlayers = [...allPlayers, newPlayer];
      setAllPlayers(nextPlayers);
      persistLocal(allTeams, nextPlayers, allFixtures);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.rpc('admin_upsert_player', {
          p_admin_pin: adminPin,
          p_id: newPlayer.id,
          p_team_id: newPlayer.teamId,
          p_name: newPlayer.name,
          p_active: true,
        });
      }
      return newPlayer;
    },
    [adminPin, allTeams, allPlayers, allFixtures, persistLocal]
  );

  const removePlayer = useCallback(
    async (playerId: string): Promise<void> => {
      const nextPlayers = allPlayers.filter((p) => p.id !== playerId);
      setAllPlayers(nextPlayers);
      persistLocal(allTeams, nextPlayers, allFixtures);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.rpc('admin_delete_player', {
          p_admin_pin: adminPin,
          p_player_id: playerId,
        });
      }
    },
    [adminPin, allTeams, allPlayers, allFixtures, persistLocal]
  );

  const transferPlayer = useCallback(
    async (playerId: string, toTeamId: string): Promise<void> => {
      const target = allPlayers.find((p) => p.id === playerId);
      const nextPlayers = allPlayers.map((p) =>
        p.id === playerId ? { ...p, teamId: toTeamId } : p
      );
      setAllPlayers(nextPlayers);
      persistLocal(allTeams, nextPlayers, allFixtures);

      const supabase = getSupabaseClient();
      if (supabase && target) {
        await supabase.rpc('admin_upsert_player', {
          p_admin_pin: adminPin,
          p_id: playerId,
          p_team_id: toTeamId,
          p_name: target.name,
          p_active: target.active,
        });
      }
    },
    [adminPin, allTeams, allPlayers, allFixtures, persistLocal]
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
        seasonId,
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
      const nextFixtures = [...allFixtures, newFixture];
      setAllFixtures(nextFixtures);
      persistLocal(allTeams, allPlayers, nextFixtures);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.rpc('admin_upsert_fixture', {
          p_admin_pin: adminPin,
          p_id: newFixture.id,
          p_season_id: newFixture.seasonId,
          p_division: newFixture.division,
          p_match_date: newFixture.matchDate,
          p_week_number: newFixture.weekNumber,
          p_home_team_id: newFixture.homeTeamId,
          p_away_team_id: newFixture.awayTeamId,
          p_status: newFixture.status,
          p_lineups: newFixture.lineups,
          p_frames: newFixture.frames,
        });
      }
      return newFixture;
    },
    [adminPin, seasonId, allTeams, allPlayers, allFixtures, persistLocal]
  );

  const generateDivisionFixtures = useCallback(
    async (division: Division, startDate: string): Promise<number> => {
      const divTeams = teams.filter((t) => t.division === division);
      if (divTeams.length < 2) return 0;

      const list: (Team | null)[] = [...divTeams];
      if (list.length % 2 === 1) {
        list.push(null);
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
                seasonId,
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
          const last = rotation.pop()!;
          rotation.splice(1, 0, last);
        }
      }

      const nextFixtures = [...allFixtures, ...generated];
      setAllFixtures(nextFixtures);
      persistLocal(allTeams, allPlayers, nextFixtures);

      const supabase = getSupabaseClient();
      if (supabase && generated.length > 0) {
        for (const f of generated) {
          await supabase.rpc('admin_upsert_fixture', {
            p_admin_pin: adminPin,
            p_id: f.id,
            p_season_id: f.seasonId,
            p_division: f.division,
            p_match_date: f.matchDate,
            p_week_number: f.weekNumber,
            p_home_team_id: f.homeTeamId,
            p_away_team_id: f.awayTeamId,
            p_status: f.status,
            p_lineups: f.lineups,
            p_frames: f.frames,
          });
        }
      }

      return generated.length;
    },
    [
      adminPin,
      seasonId,
      teams,
      allTeams,
      allPlayers,
      allFixtures,
      persistLocal,
    ]
  );

  const deleteFixture = useCallback(
    async (fixtureId: string): Promise<void> => {
      const nextFixtures = allFixtures.filter((f) => f.id !== fixtureId);
      setAllFixtures(nextFixtures);
      persistLocal(allTeams, allPlayers, nextFixtures);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.rpc('admin_delete_fixture', {
          p_admin_pin: adminPin,
          p_fixture_id: fixtureId,
        });
      }
    },
    [adminPin, allTeams, allPlayers, allFixtures, persistLocal]
  );

  const updateFixtureDetails = useCallback(
    async (updated: Fixture): Promise<void> => {
      const stamped: Fixture = {
        ...updated,
        updatedAt: new Date().toISOString(),
      };
      const nextFixtures = allFixtures.map((f) =>
        f.id === stamped.id ? stamped : f
      );
      setAllFixtures(nextFixtures);
      persistLocal(allTeams, allPlayers, nextFixtures);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.rpc('admin_upsert_fixture', {
          p_admin_pin: adminPin,
          p_id: stamped.id,
          p_season_id: stamped.seasonId,
          p_division: stamped.division,
          p_match_date: stamped.matchDate,
          p_week_number: stamped.weekNumber,
          p_home_team_id: stamped.homeTeamId,
          p_away_team_id: stamped.awayTeamId,
          p_status: stamped.status,
          p_lineups: stamped.lineups,
          p_frames: stamped.frames,
        });
      }
    },
    [adminPin, allTeams, allPlayers, allFixtures, persistLocal]
  );

  const pushFixtureToSupabase = useCallback(
    async (
      updated: Fixture,
      editedSide?: 'home' | 'away' | 'frames'
    ): Promise<boolean> => {
      const supabase = getSupabaseClient();
      if (!supabase) return true;

      try {
        if (session.role === 'admin') {
          const { error } = await supabase.rpc('admin_save_fixture', {
            p_admin_pin: adminPin,
            p_fixture_id: updated.id,
            p_status: updated.status,
            p_lag_winner: updated.lagWinner,
            p_home_set1_locked: updated.homeSet1Locked,
            p_away_set1_locked: updated.awaySet1Locked,
            p_lineups: updated.lineups,
            p_frames: updated.frames,
            p_home_captain_signed: updated.homeCaptainSigned,
            p_away_captain_signed: updated.awayCaptainSigned,
            p_submitted_at: updated.submittedAt ?? null,
            p_approved_at: updated.approvedAt ?? null,
          });
          if (error) throw error;
          return true;
        } else if (session.role === 'captain' && session.teamId) {
          const baseArgs = {
            p_fixture_id: updated.id,
            p_team_id: session.teamId,
            p_pin: session.pin ?? '',
            p_status: updated.status,
            p_lag_winner: updated.lagWinner,
            p_home_set1_locked: updated.homeSet1Locked,
            p_away_set1_locked: updated.awaySet1Locked,
            p_lineups: updated.lineups,
            p_frames: updated.frames,
            p_home_captain_signed: updated.homeCaptainSigned,
            p_away_captain_signed: updated.awayCaptainSigned,
            p_submitted_at: updated.submittedAt ?? null,
          };

          const { error } = await supabase.rpc('captain_save_fixture', {
            ...baseArgs,
            p_edited_side: editedSide ?? null,
          });

          if (error) {
            // Fallback if database schema hasn't been re-run with p_edited_side yet
            if (error.code === 'PGRST202') {
              const retryRes = await supabase.rpc(
                'captain_save_fixture',
                baseArgs
              );
              if (retryRes.error) throw retryRes.error;
              return true;
            }
            throw error;
          }
          return true;
        }
        return true;
      } catch {
        return false;
      }
    },
    [session, adminPin]
  );

  const retryPendingSync = useCallback(async (): Promise<void> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      return;
    }
    setIsOnline(true);
    setIsSyncing(true);
    try {
      if (pendingFixtureSync) {
        const ok = await pushFixtureToSupabase(
          pendingFixtureSync.fixture,
          pendingFixtureSync.editedSide
        );
        if (ok) {
          setPendingFixtureSync(null);
          setSyncError(null);
          await refreshFromCloud();
        }
      } else {
        await refreshFromCloud();
        setSyncError(null);
      }
    } finally {
      setIsSyncing(false);
    }
  }, [pendingFixtureSync, pushFixtureToSupabase, refreshFromCloud]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      retryPendingSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    let timer: number | null = null;
    if (pendingFixtureSync) {
      timer = window.setInterval(() => {
        retryPendingSync();
      }, 6000);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (timer) window.clearInterval(timer);
    };
  }, [pendingFixtureSync, retryPendingSync]);

  const saveFixture = useCallback(
    async (
      rawUpdated: Fixture,
      editedSide?: 'home' | 'away' | 'frames'
    ): Promise<void> => {
      const syncedLineups = syncDefaultSubsequentSets(rawUpdated.lineups);
      const syncedFrames = applyByeRulesToFrames(
        syncedLineups,
        rawUpdated.frames,
        rawUpdated.lagWinner
      );

      const completedCount = syncedFrames.filter(
        (f) => f.winner !== null
      ).length;
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

      const nextFixtures = allFixtures.map((f) =>
        f.id === updated.id ? updated : f
      );
      setAllFixtures(nextFixtures);
      persistLocal(allTeams, allPlayers, nextFixtures);

      const ok = await pushFixtureToSupabase(updated, editedSide);
      if (!ok) {
        setPendingFixtureSync({ fixture: updated, editedSide });
        setSyncError('Weak connection detected.');
      } else {
        setPendingFixtureSync(null);
        setSyncError(null);
      }
    },
    [allTeams, allPlayers, allFixtures, persistLocal, pushFixtureToSupabase]
  );

  const approveFixture = useCallback(
    async (fixtureId: string): Promise<void> => {
      const target = allFixtures.find((f) => f.id === fixtureId);
      if (!target) return;
      const now = new Date().toISOString();
      await saveFixture({
        ...target,
        status: 'approved',
        approvedAt: now,
      });
    },
    [allFixtures, saveFixture]
  );

  const reopenFixture = useCallback(
    async (fixtureId: string): Promise<void> => {
      const target = allFixtures.find((f) => f.id === fixtureId);
      if (!target) return;
      await saveFixture({
        ...target,
        status: 'live',
        approvedAt: undefined,
      });
    },
    [allFixtures, saveFixture]
  );

  const resetLocalTestData = useCallback(() => {
    if (isCloudConnected) return;
    setSeasons(INITIAL_SEASONS);
    setSelectedSeasonIdState(DEFAULT_SEASON_ID);
    setAllTeams(LOCAL_TEST_TEAMS);
    setAllPlayers(LOCAL_TEST_PLAYERS);
    setAllFixtures(LOCAL_TEST_FIXTURES);
    persistLocal(
      LOCAL_TEST_TEAMS,
      LOCAL_TEST_PLAYERS,
      LOCAL_TEST_FIXTURES,
      INITIAL_SEASONS,
      adminPin
    );
  }, [isCloudConnected, persistLocal, adminPin]);

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
        seasons,
        seasonId,
        seasonName,
        divisions,
        setSelectedSeasonId,
        createNewSeason,
        addDivision,
        removeDivision,
        teams,
        players,
        fixtures,
        session,
        adminPin,
        isCloudConnected,
        isOnline,
        isSyncing,
        syncError,
        retryPendingSync,
        setRoleSession,
        loginAsCaptainWithPin,
        loginAsAdminWithPin,
        updateTeamPin,
        addTeam,
        updateTeam,
        deleteTeam,
        addPlayer,
        removePlayer,
        transferPlayer,
        addFixture,
        generateDivisionFixtures,
        deleteFixture,
        updateFixtureDetails,
        saveFixture,
        approveFixture,
        reopenFixture,
        refreshFromCloud,
        resetLocalTestData,
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

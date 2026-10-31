import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  DEFAULT_DIVISIONS,
  Division,
  Fixture,
  KnockoutFormat,
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
  ensureValidFrames,
  ensureValidLineups,
  syncDefaultSubsequentSets,
} from '../utils/leagueEngine';
import { getSupabaseClient, getSupabaseConfig } from '../lib/supabase';

const STORAGE_KEYS = {
  SEASONS: 'bpl_seasons_v3',
  ADMIN_PIN: 'bpl_admin_pin_local_v5',
  TEAMS: 'bpl_teams_local_v3',
  PLAYERS: 'bpl_players_local_v3',
  FIXTURES: 'bpl_fixtures_local_v3',
  SESSION: 'bpl_session_v2',
};

export function generateRandomPin(existingPins: string[] = []): string {
  const existingSet = new Set(
    existingPins.map((p) => p.trim()).filter((p) => p && !p.includes('•'))
  );
  let pin = '';
  let attempts = 0;
  do {
    pin = String(Math.floor(100000 + Math.random() * 900000));
    attempts++;
  } while (existingSet.has(pin) && attempts < 1000);
  return pin;
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
  existingPin = ''
): Team {
  return {
    id: String(r.id),
    seasonId: String(r.season_id ?? DEFAULT_SEASON_ID),
    division: r.division as Division,
    name: String(r.name),
    venue: String(r.venue),
    address: String(r.address ?? ''),
    captainName: String(r.captain_name ?? ''),
    captainPin: existingPin.includes('•') ? '' : existingPin,
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
  const matchType = (r.match_type as Fixture['matchType']) ?? 'league';
  const compName = r.competition_name
    ? String(r.competition_name)
    : r.cup_name
    ? String(r.cup_name)
    : undefined;
  const roundName = r.round
    ? String(r.round)
    : r.cup_round
    ? String(r.cup_round)
    : undefined;

  return {
    id: String(r.id),
    seasonId: String(r.season_id ?? DEFAULT_SEASON_ID),
    division: r.division as Division,
    matchDate: String(r.match_date),
    weekNumber: Number(r.week_number ?? 1),
    homeTeamId: String(r.home_team_id),
    awayTeamId: String(r.away_team_id),
    matchType,
    competitionName: compName,
    round: roundName,
    playAllFrames: Boolean(r.play_all_frames ?? (r.knockout_format === 'play_all_15')),
    knockoutFormat: (r.knockout_format as Fixture['knockoutFormat']) ?? (r.play_all_frames ? 'play_all_15' : 'first_to_8'),
    cupName: compName,
    cupRound: roundName,
    status: r.status as Fixture['status'],
    lagWinner: (r.lag_winner as 'home' | 'away' | null) ?? null,
    homeSet1Locked: Boolean(r.home_set1_locked),
    awaySet1Locked: Boolean(r.away_set1_locked),
    lineups: ensureValidLineups(r.lineups),
    frames: ensureValidFrames(r.frames),
    homeCaptainSigned: Boolean(r.home_captain_signed),
    awayCaptainSigned: Boolean(r.away_captain_signed),
    submittedAt: r.submitted_at ? String(r.submitted_at) : undefined,
    approvedAt: r.approved_at ? String(r.approved_at) : undefined,
    updatedAt: String(r.updated_at ?? new Date().toISOString()),
  };
}

// Preserves locally-known Set 1 lineups on a captain's own browser while the server masks
// public.fixtures.lineups.set1 with [null,null,null,null,null] prior to both sides locking Set 1.
function mergeBlindSet1Lineups(
  existing: Fixture | undefined,
  incoming: Fixture
): Fixture {
  if (!existing) return incoming;
  if (incoming.homeSet1Locked && incoming.awaySet1Locked) {
    return incoming;
  }
  const incHomeS1 = incoming.lineups.set1.home;
  const incAwayS1 = incoming.lineups.set1.away;
  const exHomeS1 = existing.lineups.set1.home;
  const exAwayS1 = existing.lineups.set1.away;

  const keepHome =
    incHomeS1.every((s) => s === null) && exHomeS1.some((s) => s !== null);
  const keepAway =
    incAwayS1.every((s) => s === null) && exAwayS1.some((s) => s !== null);

  if (!keepHome && !keepAway) return incoming;

  const mergedLineups = structuredClone(incoming.lineups);
  if (keepHome) {
    mergedLineups.set1.home = [...exHomeS1];
    if (mergedLineups.set2.home.every((s) => s === null)) {
      mergedLineups.set2.home = [...existing.lineups.set2.home];
    }
    if (mergedLineups.set3.home.every((s) => s === null)) {
      mergedLineups.set3.home = [...existing.lineups.set3.home];
    }
  }
  if (keepAway) {
    mergedLineups.set1.away = [...exAwayS1];
    if (mergedLineups.set2.away.every((s) => s === null)) {
      mergedLineups.set2.away = [...existing.lineups.set2.away];
    }
    if (mergedLineups.set3.away.every((s) => s === null)) {
      mergedLineups.set3.away = [...existing.lineups.set3.away];
    }
  }
  return {
    ...incoming,
    lineups: mergedLineups,
  };
}

interface LeagueContextValue {
  seasonName: string;
  divisions: Division[];
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
    pin: string,
    teamId?: string
  ) => Promise<{ success: boolean; team?: Team; error?: string }>;
  loginAsAdminWithPin: (
    pin: string
  ) => Promise<{ success: boolean; error?: string }>;
  updateTeamPin: (
    teamId: string,
    newPin: string
  ) => Promise<{ success: boolean; error?: string }>;
  updateTeam: (team: Team) => Promise<void>;
  addPlayer: (teamId: string, name: string) => Promise<Player>;
  updatePlayer: (player: Player) => Promise<void>;
  transferPlayer: (playerId: string, toTeamId: string) => Promise<void>;
  addFixture: (data: {
    division?: Division;
    matchDate: string;
    weekNumber?: number;
    homeTeamId: string;
    awayTeamId: string;
    matchType?: Fixture['matchType'];
    competitionName?: string;
    round?: string;
    playAllFrames?: boolean;
    knockoutFormat?: KnockoutFormat;
    cupName?: string;
    cupRound?: string;
  }) => Promise<Fixture>;
  deleteFixture: (fixtureId: string) => Promise<void>;
  updateFixtureDetails: (updated: Fixture) => Promise<void>;
  saveFixture: (
    updated: Fixture,
    editedSide?: 'home' | 'away' | 'frames'
  ) => Promise<void>;
  approveFixture: (fixtureId: string) => Promise<void>;
  reopenFixture: (fixtureId: string) => Promise<void>;
  refreshSingleFixture: (fixtureId: string) => Promise<void>;
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
  const [allFixtures, setAllFixtures] = useState<Fixture[]>(() => {
    const raw = loadFromStorage(
      STORAGE_KEYS.FIXTURES,
      isCloudConnected ? INITIAL_FIXTURES : LOCAL_TEST_FIXTURES
    );
    return raw.map((f: Fixture) => {
      const validFrames = ensureValidFrames(f.frames);
      const validLineups = ensureValidLineups(f.lineups);
      let status = f.status;
      if (
        status === 'live' &&
        !(f.homeSet1Locked && f.awaySet1Locked) &&
        validFrames.filter((frame) => frame.winner !== null).length === 0
      ) {
        status = 'scheduled';
      }
      return {
        ...f,
        status,
        frames: validFrames,
        lineups: validLineups,
      };
    });
  });
  const [session, setSession] = useState<UserSession>(() => {
    const raw = loadFromStorage<UserSession>(STORAGE_KEYS.SESSION, {
      role: 'viewer',
      name: 'General Spectator',
    });
    if (raw.role === 'captain' && raw.name && raw.name.endsWith(' Captain')) {
      return { ...raw, name: raw.name.replace(/ Captain$/i, '') };
    }
    return raw;
  });
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [pendingFixtureSync, setPendingFixtureSync] = useState<{
    fixture: Fixture;
    editedSide?: 'home' | 'away' | 'frames';
  } | null>(null);
  const inFlightFixtureSavesRef = useRef<Map<string, number>>(new Map());
  const fixtureSaveQueueRef = useRef<Map<string, Promise<boolean>>>(new Map());
  const lastLocalFixtureSaveAtRef = useRef<Map<string, number>>(new Map());

  const activeSeason =
    seasons.find((s) => s.isActive) ||
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

  // Server-side `updated_at` high-water mark for fixtures, used for incremental catch-up fetches
  const fixturesHighWaterRef = useRef<number | null>(null);
  const lastFullRefreshAtRef = useRef<number>(0);

  const advanceFixturesHighWater = (rows: Record<string, unknown>[]) => {
    for (const r of rows) {
      const ts = Date.parse(String(r.updated_at ?? ''));
      if (
        !Number.isNaN(ts) &&
        (fixturesHighWaterRef.current === null || ts > fixturesHighWaterRef.current)
      ) {
        fixturesHighWaterRef.current = ts;
      }
    }
  };

  const refreshFromCloud = useCallback(
    async (options?: { silent?: boolean }) => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const isSilent = options?.silent ?? false;
      if (!isSilent) {
        setIsSyncing(true);
      }
      try {
      const [seasonsRes, teamsRes, playersRes, fixturesRes] = await Promise.all([
        supabase.from('seasons').select('*').order('created_at'),
        supabase.from('teams').select('*').order('name'),
        supabase.from('players').select('*').order('name'),
        supabase.from('fixtures').select('*').order('match_date'),
      ]);

      // If logged in as Admin, fetch protected team PINs via server-side RPC (requires League Admin PIN)
      const pinMap: Record<string, string> = {};
      if (session.role === 'admin' && adminPin) {
        const pinsRes = await supabase.rpc('get_all_team_pins', {
          p_admin_pin: adminPin,
        });
        if (!pinsRes.error && Array.isArray(pinsRes.data)) {
          pinsRes.data.forEach(
            (row: { team_id: string; captain_pin: string }) => {
              if (row.team_id && row.captain_pin) {
                pinMap[row.team_id] = row.captain_pin;
              }
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
        setAllTeams((prev) => {
          const mappedTeams: Team[] = teamsRes.data.map((r) => {
            const row = r as Record<string, unknown>;
            const id = String(row.id);
            const prevTeam = prev.find((t) => t.id === id);
            const resolvedPin =
              pinMap[id] ||
              (prevTeam && prevTeam.captainPin && !prevTeam.captainPin.includes('•')
                ? prevTeam.captainPin
                : '') ||
              '';
            return mapTeamRow(row, resolvedPin);
          });
          localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(mappedTeams));
          return mappedTeams;
        });
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
        setAllFixtures((prev) => {
          const prevById = new Map(prev.map((f) => [f.id, f]));
          const next = mappedFixtures.map((updated) =>
            mergeBlindSet1Lineups(prevById.get(updated.id), updated)
          );
          localStorage.setItem(STORAGE_KEYS.FIXTURES, JSON.stringify(next));
          return next;
        });
        advanceFixturesHighWater(fixturesRes.data as Record<string, unknown>[]);
        lastFullRefreshAtRef.current = Date.now();
      }
    } finally {
      if (!isSilent) {
        setIsSyncing(false);
      }
    }
  }, [session.role, adminPin]);

  // Lightweight catch-up: fetch only fixtures changed since the last sync (usually a handful of
  // rows) instead of re-downloading the whole season. Falls back to a full refresh if we have
  // no high-water mark yet, or if the last full refresh is stale (to pick up rare admin edits
  // to teams/players/seasons, or deleted fixtures, missed while disconnected).
  const refreshChangedFixtures = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const FULL_REFRESH_MAX_AGE_MS = 30 * 60 * 1000;
    if (
      fixturesHighWaterRef.current === null ||
      Date.now() - lastFullRefreshAtRef.current > FULL_REFRESH_MAX_AGE_MS
    ) {
      await refreshFromCloudRef.current({ silent: true });
      return;
    }
    // Small overlap guards against transactions that committed slightly out of order
    const since = new Date(fixturesHighWaterRef.current - 30_000).toISOString();
    try {
      const { data, error } = await supabase
        .from('fixtures')
        .select('*')
        .gte('updated_at', since);
      if (error || !data) return;
      advanceFixturesHighWater(data as Record<string, unknown>[]);
      if (data.length === 0) return;
      const changed = data.map((r) => mapFixtureRow(r as Record<string, unknown>));
      const changedById = new Map(changed.map((f) => [f.id, f]));
      setAllFixtures((prev) => {
        const next = prev.map((f) => {
          const updated = changedById.get(f.id);
          return updated ? mergeBlindSet1Lineups(f, updated) : f;
        });
        const existingIds = new Set(prev.map((f) => f.id));
        for (const f of changed) {
          if (!existingIds.has(f.id)) next.push(f);
        }
        localStorage.setItem(STORAGE_KEYS.FIXTURES, JSON.stringify(next));
        return next;
      });
    } catch {
      // Quiet fail on network fluctuation; next trigger will retry
    }
  }, []);

  const refreshSingleFixture = useCallback(async (fixtureId: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('fixtures')
        .select('*')
        .eq('id', fixtureId)
        .single();
      if (!error && data) {
        const updated = mapFixtureRow(data as Record<string, unknown>);
        setAllFixtures((prev) => {
          const next = prev.map((f) =>
            f.id === updated.id ? mergeBlindSet1Lineups(f, updated) : f
          );
          localStorage.setItem(STORAGE_KEYS.FIXTURES, JSON.stringify(next));
          return next;
        });
      }
    } catch {
      // Quiet fail if network fluctuation
    }
  }, []);

  // Keep a stable reference so the realtime effect below doesn't tear down and rebuild the
  // WebSocket subscription every time session/adminPin changes refreshFromCloud's identity.
  const refreshFromCloudRef = useRef(refreshFromCloud);
  useEffect(() => {
    refreshFromCloudRef.current = refreshFromCloud;
  }, [refreshFromCloud]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const refreshFromCloud = (options?: { silent?: boolean }) =>
      refreshFromCloudRef.current(options);

    let activeChannel: ReturnType<typeof supabase.channel> | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let isReconnecting = false;
    let hasSubscribedOnce = false;
    // Increments per connection so late callbacks from torn-down channels are ignored
    let connectionId = 0;
    let isSubscribed = false;
    let lastCatchUpAt = 0;

    // Quietly fetch changed fixtures (see refreshChangedFixtures), but collapse bursts of triggers
    // (tab visible + focus + reconnect all fire together when a phone is unlocked) into one fetch.
    const catchUp = () => {
      const now = Date.now();
      if (now - lastCatchUpAt < 3000) return;
      lastCatchUpAt = now;
      refreshChangedFixtures();
    };

    // Called when the user returns to the app or the device comes back online.
    // - Live socket already listening: just catch up on anything missed.
    // - No socket: connect; the SUBSCRIBED handler catches up once it's actually listening,
    //   so nothing broadcast between the fetch and the subscription can slip through.
    // - Socket mid-connect: do nothing; SUBSCRIBED will handle it.
    const resumeLive = () => {
      if (!activeChannel) {
        connectRealtime();
      } else if (isSubscribed) {
        catchUp();
      }
    };

    const disconnectRealtime = async () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      isSubscribed = false;
      if (activeChannel) {
        const chan = activeChannel;
        activeChannel = null;
        try {
          await supabase.removeChannel(chan);
        } catch {
          // Ignore teardown errors
        }
      }
    };

    const scheduleReconnect = (status: string, err?: unknown) => {
      if (isReconnecting) return;
      isReconnecting = true;
      console.warn(`[Realtime] Socket dropped or timed out (${status}), reconnecting in 2s...`, err);
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      reconnectTimeout = setTimeout(async () => {
        try {
          await disconnectRealtime();
          if (
            typeof document === 'undefined' ||
            document.visibilityState === 'visible'
          ) {
            connectRealtime();
          }
        } finally {
          isReconnecting = false;
        }
      }, 2000);
    };

    const connectRealtime = () => {
      if (activeChannel) return;
      const myConnectionId = ++connectionId;
      activeChannel = supabase
        // Unique topic per connection: supabase.channel() returns any existing channel with the
        // same topic, so reusing a fixed name could hand back a channel that is still being torn
        // down (e.g. StrictMode double-mount or effect re-run), leaving us silently unsubscribed.
        .channel(
          `bpl-realtime-changes-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'fixtures' },
          (payload) => {
            console.log(`[Realtime] fixtures ${payload.eventType} received`);
            if (
              (payload.eventType === 'INSERT' ||
                payload.eventType === 'UPDATE') &&
              payload.new
            ) {
              const updated = mapFixtureRow(
                payload.new as Record<string, unknown>
              );
              const inFlight =
                inFlightFixtureSavesRef.current.get(updated.id) ?? 0;
              const lastSavedAt =
                lastLocalFixtureSaveAtRef.current.get(updated.id) ?? 0;
              if (inFlight > 0 || Date.now() - lastSavedAt < 300) {
                return;
              }
              setAllFixtures((prev) => {
                const exists = prev.some((f) => f.id === updated.id);
                const next = exists
                  ? prev.map((f) =>
                      f.id === updated.id ? mergeBlindSet1Lineups(f, updated) : f
                    )
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
                  existing?.captainPin ?? ''
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
        // NOTE: Do NOT subscribe to `team_pins` here. It is intentionally private (RLS with no
        // public policy, not in the supabase_realtime publication), and including it makes the
        // Realtime server reject the ENTIRE postgres_changes subscription while the client still
        // reports SUBSCRIBED — silently killing all live updates. PINs are fetched via RPC instead.
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
        // Surface server-side postgres_changes errors: the client reports SUBSCRIBED even when
        // the Realtime server rejects the database-change bindings, so log them explicitly.
        .on('system', {}, (msg: { status?: string; message?: string }) => {
          if (msg?.status === 'error') {
            console.error('[Realtime] Server rejected subscription:', msg.message);
          }
        })
        .subscribe((status, err) => {
          if (myConnectionId !== connectionId) return; // stale channel
          if (status === 'SUBSCRIBED') {
            console.log('[Realtime] Live WebSocket connected and listening');
            isSubscribed = true;
            // After a reconnect, quietly catch up on any changes broadcast while we were offline
            if (hasSubscribedOnce) {
              catchUp();
            }
            hasSubscribedOnce = true;
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            isSubscribed = false;
            scheduleReconnect(status, err);
          }
          // Note: Never reconnect on 'CLOSED' because 'CLOSED' is naturally triggered by removeChannel/unsubscribe
        });
    };

    // Only drop the socket after the tab has been hidden for a while. Disconnecting on every
    // brief tab switch made the client tear the WebSocket down and then immediately try to
    // reuse it mid-teardown ("WebSocket is closed before the connection is established").
    const HIDDEN_DISCONNECT_DELAY_MS = 60 * 1000;
    let hiddenDisconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (hiddenDisconnectTimer) {
          clearTimeout(hiddenDisconnectTimer);
          hiddenDisconnectTimer = null;
        }
        resumeLive();
      } else if (!hiddenDisconnectTimer) {
        hiddenDisconnectTimer = setTimeout(() => {
          hiddenDisconnectTimer = null;
          disconnectRealtime();
        }, HIDDEN_DISCONNECT_DELAY_MS);
      }
    };

    const handleFocus = () => {
      resumeLive();
    };

    const handleOnline = () => {
      resumeLive();
    };

    lastCatchUpAt = Date.now();
    refreshFromCloud({ silent: true });
    if (
      typeof document === 'undefined' ||
      document.visibilityState === 'visible'
    ) {
      connectRealtime();
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('focus', handleFocus);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('focus', handleFocus);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener(
          'visibilitychange',
          handleVisibilityChange
        );
      }
      if (hiddenDisconnectTimer) {
        clearTimeout(hiddenDisconnectTimer);
      }
      disconnectRealtime();
    };
  }, [isCloudConnected, refreshChangedFixtures]);

  const setRoleSession = useCallback(
    (role: UserRole, teamId?: string, customName?: string, pin?: string) => {
      const team = allTeams.find((t) => t.id === teamId);
      const name =
        customName ||
        (role === 'admin'
          ? 'League Admin'
          : role === 'captain'
          ? team
            ? team.name
            : 'Team Captain'
          : 'General Spectator');
      const next: UserSession = { role, teamId, name, pin };
      setSession(next);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(next));
        if (role === 'viewer' && isCloudConnected) {
          localStorage.removeItem(STORAGE_KEYS.ADMIN_PIN);
          setAdminPin('');
          setAllTeams((prev) => {
            const scrubbed = prev.map((t) => ({ ...t, captainPin: '' }));
            localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(scrubbed));
            return scrubbed;
          });
        }
      }
    },
    [allTeams, isCloudConnected]
  );

  const loginAsCaptainWithPin = useCallback(
    async (
      pin: string,
      optionalTeamId?: string
    ): Promise<{ success: boolean; team?: Team; error?: string }> => {
      const cleanPin = pin.trim();
      if (!cleanPin) {
        return { success: false, error: 'Please enter your 6-digit Team PIN.' };
      }

      const supabase = getSupabaseClient();
      if (supabase) {
        // Direct lookup by unique PIN via dedicated RPC
        const { data, error } = await supabase.rpc('login_captain_with_pin', {
          p_pin: cleanPin,
        });

        if (!error && Array.isArray(data) && data.length > 0) {
          const matchedTeamId = String(data[0].team_id);
          const matchedTeam = allTeams.find((t) => t.id === matchedTeamId);
          setRoleSession(
            'captain',
            matchedTeamId,
            matchedTeam?.name ?? data[0].team_name,
            cleanPin
          );
          return { success: true, team: matchedTeam };
        }

        // Backward compatibility if optional teamId was supplied:
        if (optionalTeamId) {
          const { data: vData, error: vError } = await supabase.rpc('verify_captain_pin', {
            p_team_id: optionalTeamId,
            p_pin: cleanPin,
          });
          if (vData === true) {
            const team = allTeams.find((t) => t.id === optionalTeamId);
            setRoleSession('captain', optionalTeamId, team?.name, cleanPin);
            return { success: true, team };
          }
          if (vError) return { success: false, error: vError.message };
        } else if (
          error &&
          (error.code === '42883' || error.message?.includes('does not exist'))
        ) {
          // Fallback if login_captain_with_pin RPC hasn't been added to remote DB yet
          const localMatch = allTeams.find(
            (t) =>
              t.captainPin &&
              !t.captainPin.includes('•') &&
              t.captainPin.trim() === cleanPin
          );
          if (localMatch) {
            setRoleSession('captain', localMatch.id, localMatch.name, cleanPin);
            return { success: true, team: localMatch };
          }

          // Verify against registered teams
          for (const t of allTeams) {
            const vRes = await supabase.rpc('verify_captain_pin', {
              p_team_id: t.id,
              p_pin: cleanPin,
            });
            if (!vRes.error && vRes.data === true) {
              setRoleSession('captain', t.id, t.name, cleanPin);
              return { success: true, team: t };
            }
          }
        }

        return {
          success: false,
          error:
            error?.message && !error.message.includes('does not exist')
              ? error.message
              : 'Incorrect Team PIN. Check with League Admin.',
        };
      }

      // Offline / local fallback
      const team = optionalTeamId
        ? allTeams.find(
            (t) => t.id === optionalTeamId && t.captainPin.trim() === cleanPin
          )
        : allTeams.find(
            (t) => t.captainPin && t.captainPin.trim() === cleanPin
          );

      if (team) {
        setRoleSession('captain', team.id, team.name, cleanPin);
        return { success: true, team };
      }

      return {
        success: false,
        error: 'Incorrect Team PIN. Check with League Admin.',
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
    async (
      teamId: string,
      newPin: string
    ): Promise<{ success: boolean; error?: string }> => {
      const clean = newPin.trim();
      if (!clean) return { success: false, error: 'PIN cannot be empty.' };

      // Enforce unique PINs: cannot match admin PIN
      if (
        (adminPin && clean === adminPin.trim()) ||
        clean === DEFAULT_ADMIN_PIN ||
        clean === '00000000'
      ) {
        return {
          success: false,
          error: 'This PIN matches the League Admin PIN. Team PINs must be unique.',
        };
      }

      // Enforce unique PINs across teams
      const duplicate = allTeams.find(
        (t) =>
          t.id !== teamId &&
          t.captainPin &&
          !t.captainPin.includes('•') &&
          t.captainPin.trim() === clean
      );
      if (duplicate) {
        return {
          success: false,
          error: `PIN "${clean}" is already in use by "${duplicate.name}". Each team must have a unique PIN.`,
        };
      }

      const nextTeams = allTeams.map((t) =>
        t.id === teamId ? { ...t, captainPin: clean } : t
      );
      setAllTeams(nextTeams);
      persistLocal(nextTeams, allPlayers, allFixtures);

      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.rpc('set_team_pin', {
          p_admin_pin: adminPin,
          p_team_id: teamId,
          p_new_pin: clean,
        });
        if (error) {
          return { success: false, error: error.message };
        }
        if (data === false) {
          return {
            success: false,
            error: 'Unauthorized: Invalid League Admin PIN.',
          };
        }
      }

      return { success: true };
    },
    [adminPin, allTeams, allPlayers, allFixtures, persistLocal]
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

  const updatePlayer = useCallback(
    async (updatedPlayer: Player): Promise<void> => {
      const cleanName = updatedPlayer.name.trim();
      if (!cleanName) return;
      const nextPlayers = allPlayers.map((p) =>
        p.id === updatedPlayer.id ? { ...p, name: cleanName } : p
      );
      setAllPlayers(nextPlayers);
      persistLocal(allTeams, nextPlayers, allFixtures);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.rpc('admin_upsert_player', {
          p_admin_pin: adminPin,
          p_id: updatedPlayer.id,
          p_team_id: updatedPlayer.teamId,
          p_name: cleanName,
          p_active: updatedPlayer.active,
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
      division?: Division;
      matchDate: string;
      weekNumber?: number;
      homeTeamId: string;
      awayTeamId: string;
      matchType?: Fixture['matchType'];
      competitionName?: string;
      round?: string;
      playAllFrames?: boolean;
      knockoutFormat?: KnockoutFormat;
      cupName?: string;
      cupRound?: string;
    }): Promise<Fixture> => {
      const matchType = data.matchType ?? 'league';
      const compName = data.competitionName || data.cupName;
      const roundName = data.round || data.cupRound;
      const koFormat = data.knockoutFormat ?? (data.playAllFrames ? 'play_all_15' : 'first_to_8');
      const playAll = Boolean(data.playAllFrames || koFormat === 'play_all_15');
      const fixtureDiv = data.division || (matchType === 'knockout' ? 'Knockout' : 'Division 1');

      const newFixture: Fixture = {
        id: `fix-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        seasonId,
        division: fixtureDiv,
        matchDate: data.matchDate,
        weekNumber: data.weekNumber ?? 1,
        homeTeamId: data.homeTeamId,
        awayTeamId: data.awayTeamId,
        matchType,
        competitionName: compName,
        round: roundName,
        playAllFrames: matchType === 'knockout' ? playAll : false,
        knockoutFormat: matchType === 'knockout' ? koFormat : undefined,
        cupName: compName,
        cupRound: roundName,
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
          p_match_type: newFixture.matchType ?? 'league',
          p_competition_name: newFixture.competitionName ?? null,
          p_round: newFixture.round ?? null,
          p_play_all_frames: Boolean(newFixture.playAllFrames),
          p_knockout_format: newFixture.knockoutFormat ?? 'first_to_8',
          p_cup_name: newFixture.cupName ?? null,
          p_cup_round: newFixture.cupRound ?? null,
        });
      }
      return newFixture;
    },
    [adminPin, seasonId, allTeams, allPlayers, allFixtures, persistLocal]
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
          p_match_type: stamped.matchType ?? 'league',
          p_competition_name: stamped.competitionName ?? null,
          p_round: stamped.round ?? null,
          p_play_all_frames: Boolean(stamped.playAllFrames),
          p_knockout_format: stamped.knockoutFormat ?? 'first_to_8',
          p_cup_name: stamped.cupName ?? null,
          p_cup_round: stamped.cupRound ?? null,
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
          const { data: adminOk, error } = await supabase.rpc('admin_save_fixture', {
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
          if (error || adminOk === false) throw error || new Error('Unauthorized');
          return true;
        } else if (session.role === 'captain' && session.teamId) {
          let pushStatus = updated.status;
          if (pushStatus === 'submitted' && (!updated.homeCaptainSigned || !updated.awayCaptainSigned)) {
            pushStatus = 'live';
          }
          const baseArgs = {
            p_fixture_id: updated.id,
            p_team_id: session.teamId,
            p_pin: session.pin ?? '',
            p_status: pushStatus,
            p_lag_winner: updated.lagWinner,
            p_home_set1_locked: updated.homeSet1Locked,
            p_away_set1_locked: updated.awaySet1Locked,
            p_lineups: updated.lineups,
            p_frames: updated.frames,
            p_home_captain_signed: updated.homeCaptainSigned,
            p_away_captain_signed: updated.awayCaptainSigned,
            p_submitted_at: updated.submittedAt ?? null,
          };

          const { data: capOk, error } = await supabase.rpc('captain_save_fixture', {
            ...baseArgs,
            p_edited_side: editedSide ?? null,
          });

          if (error || capOk === false) {
            if (capOk === false) throw new Error('Unauthorized');
            // Fallback if database schema hasn't been re-run with p_edited_side yet
            if (error?.code === 'PGRST202') {
              const retryRes = await supabase.rpc(
                'captain_save_fixture',
                baseArgs
              );
              if (retryRes.error || retryRes.data === false) {
                throw retryRes.error || new Error('Unauthorized');
              }
              return true;
            }
            throw error || new Error('Failed to save fixture');
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
      const fixtureId = rawUpdated.id;
      inFlightFixtureSavesRef.current.set(
        fixtureId,
        (inFlightFixtureSavesRef.current.get(fixtureId) ?? 0) + 1
      );

      const syncedLineups = syncDefaultSubsequentSets(
        ensureValidLineups(rawUpdated.lineups)
      );
      const bothSet1Locked = Boolean(
        rawUpdated.homeSet1Locked && rawUpdated.awaySet1Locked
      );
      const syncedFrames = applyByeRulesToFrames(
        syncedLineups,
        ensureValidFrames(rawUpdated.frames),
        rawUpdated.lagWinner,
        bothSet1Locked
      );

      const completedCount = syncedFrames.filter(
        (f) => f.winner !== null
      ).length;

      let nextStatus = rawUpdated.status;
      let homeSigned = Boolean(rawUpdated.homeCaptainSigned);
      let awaySigned = Boolean(rawUpdated.awayCaptainSigned);

      if (nextStatus === 'submitted') {
        // Prevent stale submission from overwriting an unsigned state from the other captain
        const existing = allFixtures.find((f) => f.id === rawUpdated.id);
        if (existing) {
          if (!existing.homeCaptainSigned) homeSigned = false;
          if (!existing.awayCaptainSigned) awaySigned = false;
        }
        if (!homeSigned || !awaySigned) {
          nextStatus = 'live';
        }
      } else if (nextStatus === 'scheduled' && (bothSet1Locked || completedCount > 0)) {
        nextStatus = 'live';
      } else if (
        nextStatus === 'live' &&
        !bothSet1Locked &&
        completedCount === 0
      ) {
        nextStatus = 'scheduled';
      }

      const optimisticUpdated: Fixture = {
        ...rawUpdated,
        status: nextStatus,
        homeCaptainSigned: homeSigned,
        awayCaptainSigned: awaySigned,
        lineups: syncedLineups,
        frames: syncedFrames,
        updatedAt: new Date().toISOString(),
      };

      const nextFixtures = allFixtures.map((f) =>
        f.id === optimisticUpdated.id ? optimisticUpdated : f
      );
      setAllFixtures(nextFixtures);
      persistLocal(allTeams, allPlayers, nextFixtures);

      const prevQueue =
        fixtureSaveQueueRef.current.get(fixtureId) ?? Promise.resolve(true);

      const queuedTask = prevQueue
        .catch(() => true)
        .then(async () => {
          let toPush = optimisticUpdated;
          if (toPush.status === 'submitted') {
            const supabase = getSupabaseClient();
            if (supabase) {
              try {
                const { data: cloudRow } = await supabase
                  .from('fixtures')
                  .select('home_captain_signed, away_captain_signed')
                  .eq('id', fixtureId)
                  .single();
                if (
                  cloudRow &&
                  (!cloudRow.home_captain_signed ||
                    !cloudRow.away_captain_signed)
                ) {
                  toPush = {
                    ...toPush,
                    homeCaptainSigned: Boolean(cloudRow.home_captain_signed),
                    awayCaptainSigned: Boolean(cloudRow.away_captain_signed),
                    status: 'live',
                  };
                  setAllFixtures((prev) => {
                    const reverted = prev.map((f) =>
                      f.id === fixtureId ? toPush : f
                    );
                    localStorage.setItem(
                      STORAGE_KEYS.FIXTURES,
                      JSON.stringify(reverted)
                    );
                    return reverted;
                  });
                }
              } catch {
                // fallback
              }
            }
          }
          const ok = await pushFixtureToSupabase(toPush, editedSide);
          if (!ok) {
            setPendingFixtureSync({ fixture: toPush, editedSide });
            setSyncError('Weak connection detected.');
          } else {
            setPendingFixtureSync(null);
            setSyncError(null);
          }
          return ok;
        })
        .finally(() => {
          const remaining =
            (inFlightFixtureSavesRef.current.get(fixtureId) ?? 1) - 1;
          if (remaining <= 0) {
            inFlightFixtureSavesRef.current.delete(fixtureId);
          } else {
            inFlightFixtureSavesRef.current.set(fixtureId, remaining);
          }
          lastLocalFixtureSaveAtRef.current.set(fixtureId, Date.now());
        });

      fixtureSaveQueueRef.current.set(fixtureId, queuedTask);
      await queuedTask;
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
        homeCaptainSigned: false,
        awayCaptainSigned: false,
      });
    },
    [allFixtures, saveFixture]
  );

  const resetLocalTestData = useCallback(() => {
    if (isCloudConnected) return;
    setSeasons(INITIAL_SEASONS);
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
      if (
        session.role === 'captain' &&
        fixture.status !== 'approved' &&
        fixture.status !== 'submitted'
      ) {
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
        seasonName,
        divisions,
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
        updateTeam,
        addPlayer,
        updatePlayer,
        transferPlayer,
        addFixture,
        deleteFixture,
        updateFixtureDetails,
        saveFixture,
        approveFixture,
        reopenFixture,
        refreshSingleFixture,
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

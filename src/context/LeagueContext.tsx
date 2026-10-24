import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import {
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
  DEMO_FIXTURES,
  DEMO_PLAYERS,
  DEMO_TEAMS,
  INITIAL_FIXTURES,
  INITIAL_PLAYERS,
  INITIAL_SEASONS,
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
  SEASONS: 'bpl_seasons_v2',
  ACTIVE_SEASON_ID: 'bpl_active_season_id_v2',
  ADMIN_PIN: 'bpl_admin_pin_v2',
  TEAMS: 'bpl_teams_v2',
  PLAYERS: 'bpl_players_v2',
  FIXTURES: 'bpl_fixtures_v2',
  SESSION: 'bpl_session_v2',
};

const BROADCAST_CHANNEL_NAME = 'bpl_live_channel_v2';

export function generateRandomPin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

interface LeagueContextValue {
  seasons: Season[];
  seasonId: string;
  seasonName: string;
  setSelectedSeasonId: (id: string) => void;
  createNewSeason: (
    name: string,
    copyTeamsFromCurrent: boolean
  ) => Promise<Season>;
  teams: Team[];
  players: Player[];
  fixtures: Fixture[];
  session: UserSession;
  adminPin: string;
  isCloudConnected: boolean;
  isSyncing: boolean;
  setRoleSession: (role: UserRole, teamId?: string, customName?: string) => void;
  loginAsCaptainWithPin: (teamId: string, pin: string) => boolean;
  loginAsAdminWithPin: (pin: string) => boolean;
  updateAdminPin: (newPin: string) => Promise<void>;
  updateTeamPin: (teamId: string, newPin: string) => Promise<void>;
  // Team & Player management (Admin)
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
    loadFromStorage(STORAGE_KEYS.TEAMS, INITIAL_TEAMS)
  );
  const [allPlayers, setAllPlayers] = useState<Player[]>(() =>
    loadFromStorage(STORAGE_KEYS.PLAYERS, INITIAL_PLAYERS)
  );
  const [allFixtures, setAllFixtures] = useState<Fixture[]>(() =>
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

  const activeSeason =
    seasons.find((s) => s.id === selectedSeasonId) ||
    seasons[0] ||
    INITIAL_SEASONS[0];

  const seasonId = activeSeason.id;
  const seasonName = activeSeason.name;

  // Filter teams, players, and fixtures to the currently selected season
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
      nextAdminPin: string = adminPin,
      broadcast = true
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
      if (broadcast && 'BroadcastChannel' in window) {
        const ch = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        ch.postMessage({
          type: 'SYNC_STATE',
          teams: nextTeams,
          players: nextPlayers,
          fixtures: nextFixtures,
          seasons: nextSeasons,
          adminPin: nextAdminPin,
        });
        ch.close();
      }
    },
    [seasons, adminPin]
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const ch = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    ch.onmessage = (ev) => {
      if (ev.data?.type === 'SYNC_STATE') {
        setAllTeams(ev.data.teams);
        setAllPlayers(ev.data.players);
        setAllFixtures(ev.data.fixtures);
        if (ev.data.seasons) setSeasons(ev.data.seasons);
        if (ev.data.adminPin) setAdminPin(ev.data.adminPin);
      }
    };
    return () => ch.close();
  }, []);

  const refreshFromCloud = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setIsSyncing(true);
    try {
      const [settingsRes, seasonsRes, teamsRes, playersRes, fixturesRes] =
        await Promise.all([
          supabase
            .from('league_settings')
            .select('*')
            .eq('id', 'default')
            .maybeSingle(),
          supabase.from('seasons').select('*').order('created_at'),
          supabase.from('teams').select('*').order('name'),
          supabase.from('players').select('*').order('name'),
          supabase.from('fixtures').select('*').order('match_date'),
        ]);

      if (!settingsRes.error && settingsRes.data?.admin_pin) {
        const pin = String(settingsRes.data.admin_pin);
        setAdminPin(pin);
        localStorage.setItem(STORAGE_KEYS.ADMIN_PIN, JSON.stringify(pin));
      }

      if (!seasonsRes.error && seasonsRes.data && seasonsRes.data.length > 0) {
        const mappedSeasons: Season[] = seasonsRes.data.map(
          (r: Record<string, unknown>) => ({
            id: String(r.id),
            name: String(r.name),
            isActive: Boolean(r.is_active),
          })
        );
        setSeasons(mappedSeasons);
        localStorage.setItem(
          STORAGE_KEYS.SEASONS,
          JSON.stringify(mappedSeasons)
        );
      }

      if (!teamsRes.error && teamsRes.data) {
        const mappedTeams: Team[] = teamsRes.data.map(
          (r: Record<string, unknown>) => ({
            id: String(r.id),
            seasonId: String(r.season_id ?? DEFAULT_SEASON_ID),
            division: r.division as Division,
            name: String(r.name),
            venue: String(r.venue),
            address: String(r.address ?? ''),
            captainName: String(r.captain_name ?? ''),
            captainPin: String(r.captain_pin ?? '1111'),
          })
        );
        setAllTeams(mappedTeams);
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
        setAllPlayers(mappedPlayers);
        localStorage.setItem(
          STORAGE_KEYS.PLAYERS,
          JSON.stringify(mappedPlayers)
        );
      }

      if (!fixturesRes.error && fixturesRes.data) {
        const mappedFixtures: Fixture[] = fixturesRes.data.map(
          (r: Record<string, unknown>) => ({
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
          })
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
        () => refreshFromCloud()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams' },
        () => refreshFromCloud()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players' },
        () => refreshFromCloud()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'seasons' },
        () => refreshFromCloud()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isCloudConnected, refreshFromCloud]);

  const setRoleSession = useCallback(
    (role: UserRole, teamId?: string, customName?: string) => {
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
      const next: UserSession = { role, teamId, name };
      setSession(next);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(next));
      }
    },
    [allTeams]
  );

  const loginAsCaptainWithPin = useCallback(
    (teamId: string, pin: string): boolean => {
      const team = allTeams.find((t) => t.id === teamId);
      if (!team) return false;
      if (
        team.captainPin.trim() === pin.trim() ||
        adminPin.trim() === pin.trim()
      ) {
        setRoleSession('captain', teamId);
        return true;
      }
      return false;
    },
    [allTeams, adminPin, setRoleSession]
  );

  const loginAsAdminWithPin = useCallback(
    (pin: string): boolean => {
      if (adminPin.trim() === pin.trim()) {
        setRoleSession('admin');
        return true;
      }
      return false;
    },
    [adminPin, setRoleSession]
  );

  const updateAdminPin = useCallback(
    async (newPin: string): Promise<void> => {
      const clean = newPin.trim();
      if (!clean) return;
      setAdminPin(clean);
      persistLocal(allTeams, allPlayers, allFixtures, seasons, clean);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('league_settings').upsert({
          id: 'default',
          admin_pin: clean,
          updated_at: new Date().toISOString(),
        });
      }
    },
    [allTeams, allPlayers, allFixtures, seasons, persistLocal]
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
        await supabase
          .from('teams')
          .update({ captain_pin: clean })
          .eq('id', teamId);
      }
    },
    [allTeams, allPlayers, allFixtures, persistLocal]
  );

  const createNewSeason = useCallback(
    async (name: string, copyTeamsFromCurrent: boolean): Promise<Season> => {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const newSeasonId = `${slug}-${Date.now().toString(36).slice(-3)}`;
      const newSeason: Season = {
        id: newSeasonId,
        name: name.trim(),
        isActive: true,
      };

      const nextSeasons = [
        ...seasons.map((s) => ({ ...s, isActive: false })),
        newSeason,
      ];

      let nextTeams = [...allTeams];
      let nextPlayers = [...allPlayers];

      if (copyTeamsFromCurrent) {
        const clonedTeams: Team[] = [];
        const clonedPlayers: Player[] = [];
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
        await supabase.from('seasons').upsert({
          id: newSeason.id,
          name: newSeason.name,
          is_active: true,
        });
      }

      return newSeason;
    },
    [
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
      const newTeam: Team = {
        ...data,
        id: `team-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        seasonId,
        captainPin: data.captainPin?.trim() || generateRandomPin(),
      };
      const nextTeams = [...allTeams, newTeam];
      setAllTeams(nextTeams);
      persistLocal(nextTeams, allPlayers, allFixtures);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('seasons').upsert({
          id: seasonId,
          name: seasonName,
          is_active: true,
        });
        await supabase.from('teams').upsert({
          id: newTeam.id,
          season_id: newTeam.seasonId,
          division: newTeam.division,
          name: newTeam.name,
          venue: newTeam.venue,
          address: newTeam.address,
          captain_name: newTeam.captainName,
          captain_pin: newTeam.captainPin,
        });
      }
      return newTeam;
    },
    [seasonId, seasonName, allTeams, allPlayers, allFixtures, persistLocal]
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
        await supabase
          .from('teams')
          .update({
            division: updatedTeam.division,
            name: updatedTeam.name,
            venue: updatedTeam.venue,
            address: updatedTeam.address,
            captain_name: updatedTeam.captainName,
            captain_pin: updatedTeam.captainPin,
          })
          .eq('id', updatedTeam.id);
      }
    },
    [allTeams, allPlayers, allFixtures, persistLocal]
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
        await supabase.from('teams').delete().eq('id', teamId);
      }
    },
    [allTeams, allPlayers, allFixtures, persistLocal]
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
        await supabase.from('players').upsert({
          id: newPlayer.id,
          team_id: newPlayer.teamId,
          name: newPlayer.name,
          active: true,
        });
      }
      return newPlayer;
    },
    [allTeams, allPlayers, allFixtures, persistLocal]
  );

  const removePlayer = useCallback(
    async (playerId: string): Promise<void> => {
      const nextPlayers = allPlayers.filter((p) => p.id !== playerId);
      setAllPlayers(nextPlayers);
      persistLocal(allTeams, nextPlayers, allFixtures);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('players').delete().eq('id', playerId);
      }
    },
    [allTeams, allPlayers, allFixtures, persistLocal]
  );

  const transferPlayer = useCallback(
    async (playerId: string, toTeamId: string): Promise<void> => {
      const nextPlayers = allPlayers.map((p) =>
        p.id === playerId ? { ...p, teamId: toTeamId } : p
      );
      setAllPlayers(nextPlayers);
      persistLocal(allTeams, nextPlayers, allFixtures);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase
          .from('players')
          .update({ team_id: toTeamId })
          .eq('id', playerId);
      }
    },
    [allTeams, allPlayers, allFixtures, persistLocal]
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
    [seasonId, allTeams, allPlayers, allFixtures, persistLocal]
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
      return generated.length;
    },
    [seasonId, teams, allTeams, allPlayers, allFixtures, persistLocal]
  );

  const deleteFixture = useCallback(
    async (fixtureId: string): Promise<void> => {
      const nextFixtures = allFixtures.filter((f) => f.id !== fixtureId);
      setAllFixtures(nextFixtures);
      persistLocal(allTeams, allPlayers, nextFixtures);

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('fixtures').delete().eq('id', fixtureId);
      }
    },
    [allTeams, allPlayers, allFixtures, persistLocal]
  );

  const saveFixture = useCallback(
    async (rawUpdated: Fixture): Promise<void> => {
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
    [allTeams, allPlayers, allFixtures, persistLocal]
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

  const loadDemoData = useCallback(async () => {
    const demoTeamsForSeason = DEMO_TEAMS.map((t) => ({ ...t, seasonId }));
    const demoFixturesForSeason = DEMO_FIXTURES.map((f) => ({
      ...f,
      seasonId,
    }));
    setAllTeams(demoTeamsForSeason);
    setAllPlayers(DEMO_PLAYERS);
    setAllFixtures(demoFixturesForSeason);
    persistLocal(demoTeamsForSeason, DEMO_PLAYERS, demoFixturesForSeason);
  }, [seasonId, persistLocal]);

  const resetAllData = useCallback(async () => {
    const remainingTeams = allTeams.filter((t) => t.seasonId !== seasonId);
    const removedTeamIds = new Set(
      allTeams.filter((t) => t.seasonId === seasonId).map((t) => t.id)
    );
    const remainingPlayers = allPlayers.filter(
      (p) => !removedTeamIds.has(p.teamId)
    );
    const remainingFixtures = allFixtures.filter(
      (f) => f.seasonId !== seasonId
    );
    setAllTeams(remainingTeams);
    setAllPlayers(remainingPlayers);
    setAllFixtures(remainingFixtures);
    persistLocal(remainingTeams, remainingPlayers, remainingFixtures);
  }, [seasonId, allTeams, allPlayers, allFixtures, persistLocal]);

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
        setSelectedSeasonId,
        createNewSeason,
        teams,
        players,
        fixtures,
        session,
        adminPin,
        isCloudConnected,
        isSyncing,
        setRoleSession,
        loginAsCaptainWithPin,
        loginAsAdminWithPin,
        updateAdminPin,
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

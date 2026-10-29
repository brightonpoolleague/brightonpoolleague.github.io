import {
  Division,
  Fixture,
  FrameData,
  LeagueTableRow,
  MatchLineups,
  Player,
  PlayerStatsRow,
  SlotPlayerId,
  Team,
} from '../types/league';

export const HOME_SLOT_ORDER: Record<1 | 2 | 3, [1, 2, 3, 4, 5]> = {
  1: [1, 2, 3, 4, 5],
  2: [1, 2, 3, 4, 5],
  3: [1, 2, 3, 4, 5],
};

// Matches static/sets.png and the physical scorecard:
// Set 1: 1, 2, 3, 4, 5
// Set 2: 3, 4, 5, 2, 1
// Set 3: 4, 1, 2, 5, 3
export const AWAY_SLOT_ORDER: Record<1 | 2 | 3, [1 | 2 | 3 | 4 | 5, 1 | 2 | 3 | 4 | 5, 1 | 2 | 3 | 4 | 5, 1 | 2 | 3 | 4 | 5, 1 | 2 | 3 | 4 | 5]> = {
  1: [1, 2, 3, 4, 5],
  2: [3, 4, 5, 2, 1],
  3: [4, 1, 2, 5, 3],
};

export function createEmptyFrames(): FrameData[] {
  const frames: FrameData[] = [];
  let frameNumber = 1;
  ([1, 2, 3] as const).forEach((setNumber) => {
    const homeOrder = HOME_SLOT_ORDER[setNumber];
    const awayOrder = AWAY_SLOT_ORDER[setNumber];
    for (let i = 0; i < 5; i++) {
      frames.push({
        frameNumber,
        setNumber,
        gameInSet: (i + 1) as 1 | 2 | 3 | 4 | 5,
        homeSlot: homeOrder[i],
        awaySlot: awayOrder[i],
        winner: null,
        dish: false,
      });
      frameNumber++;
    }
  });
  return frames;
}

export function createEmptyLineups(): MatchLineups {
  return {
    set1: {
      home: [null, null, null, null, null],
      away: [null, null, null, null, null],
    },
    set2: {
      home: [null, null, null, null, null],
      away: [null, null, null, null, null],
    },
    set3: {
      home: [null, null, null, null, null],
      away: [null, null, null, null, null],
    },
  };
}

/**
 * Ensures a fixture always has a valid array of exactly 15 frames.
 * If rawFrames is empty, undefined, or missing frames, initializes from createEmptyFrames()
 * while preserving any recorded frame winners and dish flags.
 */
export function ensureValidFrames(rawFrames: unknown): FrameData[] {
  const empty = createEmptyFrames();
  if (!Array.isArray(rawFrames) || rawFrames.length === 0) {
    return empty;
  }
  const frameMap = new Map<number, FrameData>();
  rawFrames.forEach((f) => {
    if (f && typeof f === 'object' && typeof (f as FrameData).frameNumber === 'number') {
      frameMap.set((f as FrameData).frameNumber, f as FrameData);
    }
  });
  return empty.map((baseFrame) => {
    const existing = frameMap.get(baseFrame.frameNumber);
    if (!existing) return baseFrame;
    return {
      ...baseFrame,
      winner: existing.winner ?? null,
      dish: Boolean(existing.dish),
    };
  });
}

/**
 * Ensures a fixture always has valid lineups for set1, set2, and set3.
 */
export function ensureValidLineups(rawLineups: unknown): MatchLineups {
  const empty = createEmptyLineups();
  if (!rawLineups || typeof rawLineups !== 'object') {
    return empty;
  }
  const typed = rawLineups as Partial<MatchLineups>;
  return {
    set1: {
      home:
        Array.isArray(typed.set1?.home) && typed.set1.home.length === 5
          ? (typed.set1.home as MatchLineups['set1']['home'])
          : empty.set1.home,
      away:
        Array.isArray(typed.set1?.away) && typed.set1.away.length === 5
          ? (typed.set1.away as MatchLineups['set1']['away'])
          : empty.set1.away,
    },
    set2: {
      home:
        Array.isArray(typed.set2?.home) && typed.set2.home.length === 5
          ? (typed.set2.home as MatchLineups['set2']['home'])
          : empty.set2.home,
      away:
        Array.isArray(typed.set2?.away) && typed.set2.away.length === 5
          ? (typed.set2.away as MatchLineups['set2']['away'])
          : empty.set2.away,
    },
    set3: {
      home:
        Array.isArray(typed.set3?.home) && typed.set3.home.length === 5
          ? (typed.set3.home as MatchLineups['set3']['home'])
          : empty.set3.home,
      away:
        Array.isArray(typed.set3?.away) && typed.set3.away.length === 5
          ? (typed.set3.away as MatchLineups['set3']['away'])
          : empty.set3.away,
    },
    unlockRequested: typed.unlockRequested ?? { home: false, away: false },
    subsLocked: typed.subsLocked ?? { set2: {}, set3: {} },
    subsUnlockRequested: typed.subsUnlockRequested ?? { set2: {}, set3: {} },
  };
}

/**
 * Determines which side ('home' | 'away' | null) breaks on a given frame (1..15).
 * Rule 6: Player 1 lags in Frame 1. Breaks alternate between teams:
 * lag winner gets 8 breaks (odd frames), opponent gets 7 breaks (even frames).
 */
export function getFrameBreaker(
  lagWinner: 'home' | 'away' | null,
  frameNumber: number
): 'home' | 'away' | null {
  if (!lagWinner) return null;
  const isOddFrame = frameNumber % 2 === 1;
  if (isOddFrame) return lagWinner;
  return lagWinner === 'home' ? 'away' : 'home';
}

export function getSetKey(setNumber: 1 | 2 | 3): 'set1' | 'set2' | 'set3' {
  return `set${setNumber}`;
}

export function getFramePlayers(
  lineups: MatchLineups,
  frame: FrameData
): { homePlayerId: SlotPlayerId; awayPlayerId: SlotPlayerId } {
  const setKey = getSetKey(frame.setNumber);
  const homePlayerId = lineups[setKey].home[frame.homeSlot - 1] ?? null;
  const awayPlayerId = lineups[setKey].away[frame.awaySlot - 1] ?? null;
  return { homePlayerId, awayPlayerId };
}

/**
 * Applies Section 9 BYE rules automatically:
 * - Any player facing a BYE is automatically awarded the win.
 * - In the event of a BYE vs BYE, the team winning the lag is awarded the win.
 */
export function applyByeRulesToFrames(
  lineups: MatchLineups,
  frames: FrameData[],
  lagWinner: 'home' | 'away' | null
): FrameData[] {
  return frames.map((frame) => {
    const { homePlayerId, awayPlayerId } = getFramePlayers(lineups, frame);
    if (homePlayerId === 'BYE' && awayPlayerId === 'BYE') {
      return {
        ...frame,
        winner: lagWinner ?? frame.winner,
        dish: false,
      };
    }
    if (homePlayerId && homePlayerId !== 'BYE' && awayPlayerId === 'BYE') {
      return {
        ...frame,
        winner: 'home',
        dish: false,
      };
    }
    if (awayPlayerId && awayPlayerId !== 'BYE' && homePlayerId === 'BYE') {
      return {
        ...frame,
        winner: 'away',
        dish: false,
      };
    }
    return frame;
  });
}

/**
 * Validates lineup selection for a set and side according to League Format Sections 1, 4, 5, 9:
 * - A player cannot appear multiple times in the same set.
 * - For Set 2 and Set 3, if a slot is changed compared to the previous set,
 *   the incoming player must NOT have played in the previous set (prevents shuffling order).
 * - BYE is only allowed in positions 4 and 5 (slots index 3 and 4).
 */
export function getEligiblePlayersForSlot(
  teamPlayers: Player[],
  lineups: MatchLineups,
  setNumber: 1 | 2 | 3,
  side: 'home' | 'away',
  slotIndex: number // 0..4
): { player: Player; disabledReason?: string }[] {
  const setKey = getSetKey(setNumber);
  const currentSetSlots = lineups[setKey][side];
  const prevSetSlots =
    setNumber === 2
      ? lineups.set1[side]
      : setNumber === 3
      ? lineups.set2[side]
      : null;

  return teamPlayers
    .filter((p) => p.active)
    .map((player) => {
      // Check if already in another slot in this same set
      const otherSlotIdx = currentSetSlots.findIndex(
        (id, idx) => idx !== slotIndex && id === player.id
      );
      if (otherSlotIdx !== -1) {
        return {
          player,
          disabledReason: `Already in slot ${otherSlotIdx + 1} for Set ${setNumber}`,
        };
      }

      // Check substitution rule for Set 2 and Set 3 (Section 5d):
      // A player who played in the previous set can ONLY stay in their exact same slot,
      // they cannot move into a different slot as a "substitute".
      if (prevSetSlots) {
        const prevSlotIdx = prevSetSlots.findIndex((id) => id === player.id);
        if (prevSlotIdx !== -1 && prevSlotIdx !== slotIndex) {
          return {
            player,
            disabledReason: `Played in slot ${prevSlotIdx + 1} in Set ${
              setNumber - 1
            } (cannot change order)`,
          };
        }
      }

      return { player };
    });
}

/**
 * Propagates Set 1 lineup to Set 2 & Set 3 for any slots that haven't been filled yet,
 * and propagates Set 2 changes to Set 3 if Set 3 hasn't been customized yet.
 */
export function syncDefaultSubsequentSets(lineups: MatchLineups): MatchLineups {
  const next: MatchLineups = {
    set1: {
      home: [...lineups.set1.home] as MatchLineups['set1']['home'],
      away: [...lineups.set1.away] as MatchLineups['set1']['away'],
    },
    set2: {
      home: [...lineups.set2.home] as MatchLineups['set2']['home'],
      away: [...lineups.set2.away] as MatchLineups['set2']['away'],
    },
    set3: {
      home: [...lineups.set3.home] as MatchLineups['set3']['home'],
      away: [...lineups.set3.away] as MatchLineups['set3']['away'],
    },
    ...(lineups.unlockRequested
      ? { unlockRequested: { ...lineups.unlockRequested } }
      : {}),
    ...(lineups.subsLocked
      ? {
          subsLocked: {
            set2: { ...lineups.subsLocked.set2 },
            set3: { ...lineups.subsLocked.set3 },
          },
        }
      : {}),
    ...(lineups.subsUnlockRequested
      ? {
          subsUnlockRequested: {
            set2: { ...lineups.subsUnlockRequested.set2 },
            set3: { ...lineups.subsUnlockRequested.set3 },
          },
        }
      : {}),
  };

  (['home', 'away'] as const).forEach((side) => {
    for (let i = 0; i < 5; i++) {
      if (next.set2[side][i] === null && next.set1[side][i] !== null) {
        next.set2[side][i] = next.set1[side][i];
      }
      if (next.set3[side][i] === null && next.set2[side][i] !== null) {
        next.set3[side][i] = next.set2[side][i];
      }
    }
  });

  return next;
}

export interface SubSummary {
  slot: number; // 1..5
  inPlayerId: SlotPlayerId;
  outPlayerId: SlotPlayerId;
}

/**
 * Checks if a player in a specific set, side, and slot index was substituted
 * in from the previous set (or differs from Set 1 starting lineup).
 */
export function isSlotSubstituted(
  lineups: MatchLineups,
  setNumber: 1 | 2 | 3,
  side: 'home' | 'away',
  slotIdx: number
): boolean {
  if (setNumber === 1) return false;
  const current = lineups[`set${setNumber}` as 'set2' | 'set3']?.[side]?.[slotIdx];
  if (!current || current === 'BYE') return false;
  const set1 = lineups.set1?.[side]?.[slotIdx];
  if (current !== set1) return true;
  if (setNumber === 3) {
    const set2 = lineups.set2?.[side]?.[slotIdx];
    if (current !== set2) return true;
  }
  return false;
}

/**
 * Returns all substitutions made for a specific set (2 or 3) compared to the previous set.
 */
export function getSubstitutionsMade(
  lineups: MatchLineups,
  setNumber: 2 | 3,
  side: 'home' | 'away'
): SubSummary[] {
  const currentSlots = lineups[`set${setNumber}` as 'set2' | 'set3']?.[side] || [];
  const prevSlots =
    setNumber === 2 ? lineups.set1?.[side] || [] : lineups.set2?.[side] || [];
  const subs: SubSummary[] = [];

  for (let i = 0; i < 5; i++) {
    const curr = currentSlots[i];
    const prev = prevSlots[i];
    if (curr && prev && curr !== prev) {
      subs.push({
        slot: i + 1,
        inPlayerId: curr,
        outPlayerId: prev,
      });
    }
  }
  return subs;
}

/**
 * Checks if a team has confirmed and locked their substitutions for Set 2 or Set 3.
 */
export function isSubsLocked(
  lineups: MatchLineups,
  setNumber: 1 | 2 | 3,
  side: 'home' | 'away'
): boolean {
  if (setNumber === 1) return false;
  const setKey = `set${setNumber}` as 'set2' | 'set3';
  return Boolean(lineups.subsLocked?.[setKey]?.[side]);
}

/**
 * Checks if a team has an outstanding request to unlock/change their substitutions for Set 2 or Set 3.
 */
export function isSubsUnlockRequested(
  lineups: MatchLineups,
  setNumber: 1 | 2 | 3,
  side: 'home' | 'away'
): boolean {
  if (setNumber === 1) return false;
  const setKey = `set${setNumber}` as 'set2' | 'set3';
  return Boolean(lineups.subsUnlockRequested?.[setKey]?.[side]);
}

export function isKnockoutFixture(fixture: Fixture): boolean {
  return fixture.matchType === 'knockout' || fixture.matchType === 'cup';
}

/**
 * Calculates frame totals and League Points for a match (Section 2 of league-format.md):
 * - Match win = 2 points
 * - Every 3 frames won = 1 point
 * - Max points = 7 (15-0 -> 7-0, 8-7 -> 4-2, etc.)
 *
 * In Knockout fixtures (e.g. Divisional Cups, Summer Cup, Summer Plate):
 * - Match concludes as soon as one team reaches 8 frames (knockout format)
 * - Fixture does not award league points
 */
export function calculateMatchScore(fixture: Fixture): {
  homeFrames: number;
  awayFrames: number;
  completedFrames: number;
  homePoints: number;
  awayPoints: number;
  isDecided: boolean;
  isKnockout: boolean;
  playAllFrames: boolean;
  matchWinner: 'home' | 'away' | null;
  setScores: {
    set1: { home: number; away: number };
    set2: { home: number; away: number };
    set3: { home: number; away: number };
  };
} {
  let homeFrames = 0;
  let awayFrames = 0;
  const setScores = {
    set1: { home: 0, away: 0 },
    set2: { home: 0, away: 0 },
    set3: { home: 0, away: 0 },
  };

  fixture.frames.forEach((f) => {
    const key = getSetKey(f.setNumber);
    if (f.winner === 'home') {
      homeFrames++;
      setScores[key].home++;
    } else if (f.winner === 'away') {
      awayFrames++;
      setScores[key].away++;
    }
  });

  const completedFrames = homeFrames + awayFrames;
  const isKnockout = isKnockoutFixture(fixture);
  const playAllFrames = Boolean(
    fixture.playAllFrames || fixture.knockoutFormat === 'play_all_15'
  );
  const isDecided =
    isKnockout && !playAllFrames
      ? homeFrames >= 8 || awayFrames >= 8
      : completedFrames === 15;

  const matchWinner: 'home' | 'away' | null = isDecided
    ? homeFrames > awayFrames
      ? 'home'
      : awayFrames > homeFrames
      ? 'away'
      : null
    : null;

  // Knockout matches do not award league points
  const homeWinBonus = !isKnockout && isDecided && homeFrames > awayFrames ? 2 : 0;
  const awayWinBonus = !isKnockout && isDecided && awayFrames > homeFrames ? 2 : 0;

  const homePoints = isKnockout ? 0 : homeWinBonus + Math.floor(homeFrames / 3);
  const awayPoints = isKnockout ? 0 : awayWinBonus + Math.floor(awayFrames / 3);

  return {
    homeFrames,
    awayFrames,
    completedFrames,
    homePoints,
    awayPoints,
    isDecided,
    isKnockout,
    playAllFrames,
    matchWinner,
    setScores,
  };
}

/**
 * Computes League Table for a division following Section 8a of league-format.md:
 * i. Total Points
 * ii. Frame difference (Frames For - Frames Against)
 * iii. Head-to-head record (1. Total points won in H2H, 2. Frame difference in H2H)
 * iv. Record against highest-placed team in the league, repeating down the table.
 */
export function computeLeagueTable(
  division: Division,
  teams: Team[],
  fixtures: Fixture[],
  includeLiveAndSubmitted = true
): LeagueTableRow[] {
  const divTeams = teams.filter((t) => t.division === division);
  const validStatuses = includeLiveAndSubmitted
    ? ['live', 'submitted', 'approved']
    : ['approved'];

  const divFixtures = fixtures.filter(
    (f) =>
      f.division === division &&
      validStatuses.includes(f.status) &&
      !isKnockoutFixture(f)
  );

  // Pairwise record map: h2h[teamA][teamB] = { points, frameDiff }
  const h2h: Record<string, Record<string, { points: number; frameDiff: number }>> = {};
  const rowsMap: Record<string, LeagueTableRow> = {};

  divTeams.forEach((team) => {
    h2h[team.id] = {};
    rowsMap[team.id] = {
      team,
      played: 0,
      won: 0,
      lost: 0,
      framesFor: 0,
      framesAgainst: 0,
      frameDiff: 0,
      points: 0,
      form: [],
    };
  });

  // Sort fixtures chronologically for accurate form guide
  const sortedFixtures = [...divFixtures].sort((a, b) =>
    a.matchDate.localeCompare(b.matchDate)
  );

  sortedFixtures.forEach((fix) => {
    const score = calculateMatchScore(fix);
    if (score.completedFrames === 0) return;

    const homeRow = rowsMap[fix.homeTeamId];
    const awayRow = rowsMap[fix.awayTeamId];
    if (!homeRow || !awayRow) return;

    const isMatchDecided = score.completedFrames === 15;

    if (isMatchDecided) {
      homeRow.played++;
      awayRow.played++;
      if (score.homeFrames > score.awayFrames) {
        homeRow.won++;
        awayRow.lost++;
        homeRow.form.push('W');
        awayRow.form.push('L');
      } else {
        awayRow.won++;
        homeRow.lost++;
        awayRow.form.push('W');
        homeRow.form.push('L');
      }
    }

    homeRow.framesFor += score.homeFrames;
    homeRow.framesAgainst += score.awayFrames;
    homeRow.frameDiff = homeRow.framesFor - homeRow.framesAgainst;
    homeRow.points += score.homePoints;

    awayRow.framesFor += score.awayFrames;
    awayRow.framesAgainst += score.homeFrames;
    awayRow.frameDiff = awayRow.framesFor - awayRow.framesAgainst;
    awayRow.points += score.awayPoints;

    if (!h2h[fix.homeTeamId][fix.awayTeamId]) {
      h2h[fix.homeTeamId][fix.awayTeamId] = { points: 0, frameDiff: 0 };
    }
    if (!h2h[fix.awayTeamId][fix.homeTeamId]) {
      h2h[fix.awayTeamId][fix.homeTeamId] = { points: 0, frameDiff: 0 };
    }

    h2h[fix.homeTeamId][fix.awayTeamId].points += score.homePoints;
    h2h[fix.homeTeamId][fix.awayTeamId].frameDiff +=
      score.homeFrames - score.awayFrames;

    h2h[fix.awayTeamId][fix.homeTeamId].points += score.awayPoints;
    h2h[fix.awayTeamId][fix.homeTeamId].frameDiff +=
      score.awayFrames - score.homeFrames;
  });

  const rows = Object.values(rowsMap);

  // Preliminary sort by Points, then Frame Diff
  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.frameDiff !== a.frameDiff) return b.frameDiff - a.frameDiff;
    return a.team.name.localeCompare(b.team.name);
  });

  // Full tie-breaker pass (Section 8a.iii)
  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.frameDiff !== a.frameDiff) return b.frameDiff - a.frameDiff;

    // 1. Head-to-head record (points won, then frame diff)
    const aVsB = h2h[a.team.id]?.[b.team.id] ?? { points: 0, frameDiff: 0 };
    const bVsA = h2h[b.team.id]?.[a.team.id] ?? { points: 0, frameDiff: 0 };
    if (bVsA.points !== aVsB.points) return bVsA.points - aVsB.points;
    if (bVsA.frameDiff !== aVsB.frameDiff) return bVsA.frameDiff - aVsB.frameDiff;

    // 2 & 3. Record against highest-placed team in the league, repeating down the table
    for (const refRow of rows) {
      if (refRow.team.id === a.team.id || refRow.team.id === b.team.id) continue;
      const aVsRef = h2h[a.team.id]?.[refRow.team.id] ?? { points: 0, frameDiff: 0 };
      const bVsRef = h2h[b.team.id]?.[refRow.team.id] ?? { points: 0, frameDiff: 0 };
      if (bVsRef.points !== aVsRef.points) return bVsRef.points - aVsRef.points;
      if (bVsRef.frameDiff !== aVsRef.frameDiff)
        return bVsRef.frameDiff - aVsRef.frameDiff;
    }

    return a.team.name.localeCompare(b.team.name);
  });

  return rows;
}

/**
 * Computes Player Averages Table and Dish Leaderboard following Section 8b & 8c:
 * 8b (Averages):
 *  i. Total wins
 *  ii. Overall win percentage
 *  iii. Total number of dishes made
 *  iv. 1. Head-to-head record, 2. Whose team finished highest in the league
 * 8c (Dish Table):
 *  i. Total number of dishes + reverse dishes made over the season
 *  ii. Awarded to the player highest in the averages table
 */
export function computePlayerStats(
  division: Division | 'ALL',
  teams: Team[],
  players: Player[],
  fixtures: Fixture[],
  includeLiveAndSubmitted = true
): {
  averagesTable: PlayerStatsRow[];
  dishTable: PlayerStatsRow[];
} {
  const teamsById: Record<string, Team> = {};
  teams.forEach((t) => {
    teamsById[t.id] = t;
  });

  const validStatuses = includeLiveAndSubmitted
    ? ['live', 'submitted', 'approved']
    : ['approved'];

  const filteredFixtures = fixtures.filter(
    (f) =>
      (division === 'ALL' || f.division === division) &&
      validStatuses.includes(f.status) &&
      !isKnockoutFixture(f)
  );

  // Compute team rankings per division for tie-breaker 8b.iv.2
  const teamRankById: Record<string, number> = {};
  (
    ['Premier League', 'Division 1', 'Division 2', 'Division 3'] as Division[]
  ).forEach((div) => {
    const table = computeLeagueTable(div, teams, fixtures, includeLiveAndSubmitted);
    table.forEach((row, idx) => {
      teamRankById[row.team.id] = idx + 1;
    });
  });

  const statsMap: Record<string, PlayerStatsRow> = {};
  const playerH2H: Record<string, Record<string, number>> = {};
  const playerMatchIds: Record<string, Set<string>> = {};
  const playersById: Record<string, Player> = {};

  players.forEach((player) => {
    playersById[player.id] = player;
    playerMatchIds[player.id] = new Set();
    const team = teamsById[player.teamId];
    if (!team) return;
    if (division !== 'ALL' && team.division !== division) return;

    statsMap[player.id] = {
      player,
      team,
      division: team.division,
      played: 0,
      won: 0,
      lost: 0,
      winPercentage: 0,
      dishes: 0,
      matchesPlayed: 0,
    };
    playerH2H[player.id] = {};
  });

  // Track distinct matches played per player for their team this season (Rules Section 5a/5b).
  // A match is counted if it was played/in-progress and the player participated (in lineup or played frames) for their team.
  const eligibleFixtures = fixtures.filter((f) =>
    validStatuses.includes(f.status)
  );

  eligibleFixtures.forEach((fix) => {
    const hasStarted =
      fix.status === 'submitted' ||
      fix.status === 'approved' ||
      fix.frames.some((f) => Boolean(f.winner));
    if (!hasStarted) return;

    const homeParticipants = new Set<string>();
    const awayParticipants = new Set<string>();

    (['set1', 'set2', 'set3'] as const).forEach((setKey) => {
      fix.lineups[setKey]?.home.forEach((id) => {
        if (id && id !== 'BYE') homeParticipants.add(id);
      });
      fix.lineups[setKey]?.away.forEach((id) => {
        if (id && id !== 'BYE') awayParticipants.add(id);
      });
    });

    fix.frames.forEach((frame) => {
      const { homePlayerId, awayPlayerId } = getFramePlayers(fix.lineups, frame);
      if (homePlayerId && homePlayerId !== 'BYE') homeParticipants.add(homePlayerId);
      if (awayPlayerId && awayPlayerId !== 'BYE') awayParticipants.add(awayPlayerId);
    });

    homeParticipants.forEach((pId) => {
      const p = playersById[pId];
      if (p && p.teamId === fix.homeTeamId) {
        playerMatchIds[pId]?.add(fix.id);
      }
    });

    awayParticipants.forEach((pId) => {
      const p = playersById[pId];
      if (p && p.teamId === fix.awayTeamId) {
        playerMatchIds[pId]?.add(fix.id);
      }
    });
  });

  filteredFixtures.forEach((fix) => {
    fix.frames.forEach((frame) => {
      if (!frame.winner) return;
      const { homePlayerId, awayPlayerId } = getFramePlayers(fix.lineups, frame);

      const homeStats =
        homePlayerId && homePlayerId !== 'BYE' ? statsMap[homePlayerId] : null;
      const awayStats =
        awayPlayerId && awayPlayerId !== 'BYE' ? statsMap[awayPlayerId] : null;

      if (homeStats) {
        homeStats.played++;
        if (frame.winner === 'home') {
          homeStats.won++;
          if (frame.dish) homeStats.dishes++;
        } else {
          homeStats.lost++;
        }
      }

      if (awayStats) {
        awayStats.played++;
        if (frame.winner === 'away') {
          awayStats.won++;
          if (frame.dish) awayStats.dishes++;
        } else {
          awayStats.lost++;
        }
      }

      if (homeStats && awayStats && homePlayerId && awayPlayerId) {
        if (frame.winner === 'home') {
          playerH2H[homePlayerId][awayPlayerId] =
            (playerH2H[homePlayerId][awayPlayerId] ?? 0) + 1;
        } else if (frame.winner === 'away') {
          playerH2H[awayPlayerId][homePlayerId] =
            (playerH2H[awayPlayerId][homePlayerId] ?? 0) + 1;
        }
      }
    });
  });

  const allStats = Object.values(statsMap).map((row) => ({
    ...row,
    winPercentage: row.played > 0 ? (row.won / row.played) * 100 : 0,
    matchesPlayed: playerMatchIds[row.player.id]?.size ?? 0,
  }));

  const averagesComparator = (a: PlayerStatsRow, b: PlayerStatsRow): number => {
    // i. Total wins
    if (b.won !== a.won) return b.won - a.won;
    // ii. Overall win percentage
    if (Math.abs(b.winPercentage - a.winPercentage) > 0.0001) {
      return b.winPercentage - a.winPercentage;
    }
    // iii. Total number of dishes made
    if (b.dishes !== a.dishes) return b.dishes - a.dishes;
    // iv.1. Head-to-head record
    const aWinsVsB = playerH2H[a.player.id]?.[b.player.id] ?? 0;
    const bWinsVsA = playerH2H[b.player.id]?.[a.player.id] ?? 0;
    if (bWinsVsA !== aWinsVsB) return bWinsVsA - aWinsVsB;
    // iv.2. Whose team finished highest in the league
    const aTeamRank = teamRankById[a.team.id] ?? 999;
    const bTeamRank = teamRankById[b.team.id] ?? 999;
    if (aTeamRank !== bTeamRank) return aTeamRank - bTeamRank;

    return a.player.name.localeCompare(b.player.name);
  };

  const averagesTable = [...allStats]
    .filter((r) => r.played > 0)
    .sort(averagesComparator);

  const avgRankMap: Record<string, number> = {};
  averagesTable.forEach((r, idx) => {
    avgRankMap[r.player.id] = idx + 1;
  });

  // Section 8c: Players Dish Table
  // i. Total number of dishes (including reverse dishes) made over the season
  // ii. If tied, awarded to the player highest in the averages table
  const dishTable = [...allStats]
    .filter((r) => r.dishes > 0 || r.played > 0)
    .sort((a, b) => {
      if (b.dishes !== a.dishes) return b.dishes - a.dishes;
      const aAvgRank = avgRankMap[a.player.id] ?? 9999;
      const bAvgRank = avgRankMap[b.player.id] ?? 9999;
      if (aAvgRank !== bAvgRank) return aAvgRank - bAvgRank;
      return averagesComparator(a, b);
    });

  return { averagesTable, dishTable };
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

export function formatMatchDate(dateStr: string): string {
  if (!dateStr) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr.trim());
  if (!match) return dateStr;
  const year = Number(match[1]);
  const monthIdx = Number(match[2]) - 1;
  const day = Number(match[3]);
  const monthName = MONTH_NAMES[monthIdx];
  if (!monthName || !day) return dateStr;
  return `${day}${getOrdinalSuffix(day)} ${monthName} ${year}`;
}

export type MatchTimeframe = 'past' | 'today' | 'upcoming';

export function getMatchTimeframe(dateStr: string, status?: string): MatchTimeframe {
  if (status === 'approved' || status === 'submitted') {
    return 'past';
  }
  if (!dateStr) return 'upcoming';

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Try YYYY-MM-DD
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr.trim());
  if (match) {
    const fixtureDateStr = `${match[1]}-${match[2]}-${match[3]}`;
    if (fixtureDateStr === todayStr) return 'today';
    if (fixtureDateStr < todayStr) return 'past';
    return 'upcoming';
  }

  // Try DD/MM/YYYY or DD-MM-YYYY
  const ukMatch = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/.exec(dateStr.trim());
  if (ukMatch) {
    const fixtureDateStr = `${ukMatch[3]}-${ukMatch[2].padStart(2, '0')}-${ukMatch[1].padStart(2, '0')}`;
    if (fixtureDateStr === todayStr) return 'today';
    if (fixtureDateStr < todayStr) return 'past';
    return 'upcoming';
  }

  // Fallback using Date parser
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    const fixtureDateStr = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
    if (fixtureDateStr === todayStr) return 'today';
    if (fixtureDateStr < todayStr) return 'past';
    return 'upcoming';
  }

  return 'upcoming';
}

/**
 * Checks whether a scorecard has missing captain signatures or incomplete frames
 * before admin approval. Returns an array of human-readable warning strings.
 * If empty, the scorecard is fully completed and signed.
 */
export function getScorecardApprovalWarnings(fixture: Fixture): string[] {
  const warnings: string[] = [];
  const score = calculateMatchScore(fixture);

  // 1. Check frame completion
  if (score.isKnockout && !score.playAllFrames) {
    // First to 8 frames (Standard Knockout)
    if (score.homeFrames < 8 && score.awayFrames < 8) {
      warnings.push(
        `The match is not finished yet. Neither team has reached 8 frames (currently ${score.homeFrames}–${score.awayFrames}).`
      );
    }
  } else {
    // 15-frame matches (League match or Play-All-15 Knockout)
    if (score.completedFrames < 15) {
      warnings.push(
        `Not all frames have been played (${score.completedFrames} of 15 completed).`
      );
    }
  }

  // 2. Check captain signatures
  if (!fixture.homeCaptainSigned && !fixture.awayCaptainSigned) {
    warnings.push('Neither team captain has signed the scorecard.');
  } else if (!fixture.homeCaptainSigned) {
    warnings.push('The Home captain has not signed the scorecard.');
  } else if (!fixture.awayCaptainSigned) {
    warnings.push('The Away captain has not signed the scorecard.');
  }

  return warnings;
}


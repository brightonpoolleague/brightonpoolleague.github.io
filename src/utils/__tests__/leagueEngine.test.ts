import { describe, expect, it } from 'vitest';
import {
  AWAY_SLOT_ORDER,
  HOME_SLOT_ORDER,
  applyByeRulesToFrames,
  calculateMatchScore,
  computeLeagueTable,
  computePlayerStats,
  createEmptyFrames,
  createEmptyLineups,
  ensureValidFrames,
  ensureValidLineups,
  formatMatchDate,
  getEligiblePlayersForSlot,
  getFrameBreaker,
  getFramePlayers,
  getMatchTimeframe,
  getOrdinalSuffix,
  getScorecardApprovalWarnings,
  getSubstitutionsMade,
  isKnockoutFixture,
  isSlotSubstituted,
  isSubsLocked,
  isSubsPendingApproval,
  isSubsUnlockRequested,
  syncDefaultSubsequentSets,
} from '../leagueEngine';
import { Fixture, MatchLineups, Player, Team } from '../../types/league';

const makeTeam = (overrides: Partial<Team> & { id: string; name: string }): Team => ({
  seasonId: 'winter-2026-27',
  division: 'Premier League',
  venue: 'The Cue Club',
  address: '100 Marine Parade',
  captainName: 'Captain',
  captainPin: '123456',
  ...overrides,
});

const makePlayer = (
  overrides: Partial<Player> & { id: string; teamId: string; name: string }
): Player => ({
  active: true,
  ...overrides,
});

const makeFixture = (
  overrides: Partial<Fixture> & {
    id: string;
    homeTeamId: string;
    awayTeamId: string;
  }
): Fixture => ({
  seasonId: 'winter-2026-27',
  division: 'Premier League',
  matchDate: '2026-11-02',
  weekNumber: 1,
  status: 'approved',
  lagWinner: 'home',
  homeSet1Locked: true,
  awaySet1Locked: true,
  lineups: createEmptyLineups(),
  frames: createEmptyFrames(),
  homeCaptainSigned: true,
  awayCaptainSigned: true,
  updatedAt: '2026-11-02T20:00:00Z',
  ...overrides,
});

describe('leagueEngine - Frame & Lineup Initialization', () => {
  it('generates 15 frames across 3 sets with official scorecard slot rotations', () => {
    const frames = createEmptyFrames();
    expect(frames).toHaveLength(15);

    // Set 1: Home [1,2,3,4,5] vs Away [1,2,3,4,5]
    const set1 = frames.filter((f) => f.setNumber === 1);
    expect(set1.map((f) => f.homeSlot)).toEqual([1, 2, 3, 4, 5]);
    expect(set1.map((f) => f.awaySlot)).toEqual([1, 2, 3, 4, 5]);

    // Set 2: Home [1,2,3,4,5] vs Away [3,4,5,2,1]
    const set2 = frames.filter((f) => f.setNumber === 2);
    expect(set2.map((f) => f.homeSlot)).toEqual(HOME_SLOT_ORDER[2]);
    expect(set2.map((f) => f.awaySlot)).toEqual(AWAY_SLOT_ORDER[2]);
    expect(set2.map((f) => f.awaySlot)).toEqual([3, 4, 5, 2, 1]);

    // Set 3: Home [1,2,3,4,5] vs Away [4,1,2,5,3]
    const set3 = frames.filter((f) => f.setNumber === 3);
    expect(set3.map((f) => f.homeSlot)).toEqual(HOME_SLOT_ORDER[3]);
    expect(set3.map((f) => f.awaySlot)).toEqual(AWAY_SLOT_ORDER[3]);
    expect(set3.map((f) => f.awaySlot)).toEqual([4, 1, 2, 5, 3]);
  });

  it('ensureValidFrames normalizes missing or partial frames to 15 while keeping winners and dishes', () => {
    expect(ensureValidFrames(null)).toHaveLength(15);
    expect(ensureValidFrames([])).toHaveLength(15);

    const partial = [{ frameNumber: 1, winner: 'home', dish: true }];
    const normalized = ensureValidFrames(partial);
    expect(normalized).toHaveLength(15);
    expect(normalized[0].winner).toBe('home');
    expect(normalized[0].dish).toBe(true);
    expect(normalized[1].winner).toBeNull();
    expect(normalized[1].dish).toBe(false);
  });

  it('ensureValidLineups normalizes corrupted lineups and cascades Set 1/Set 2 to Set 3', () => {
    const empty = ensureValidLineups(null);
    expect(empty.set1.home).toEqual([null, null, null, null, null]);

    const partial = ensureValidLineups({
      set1: {
        home: ['p1', 'p2', 'p3', 'p4', 'p5'],
        away: ['a1', 'a2', 'a3', 'a4', 'a5'],
      },
      set2: {
        home: ['p1', 'p6', 'p3', 'p4', 'p5'],
        away: ['a1', 'a2', 'a3', 'a4', 'a5'],
      },
    });
    // Set 3 should cascade from Set 2
    expect(partial.set3.home).toEqual(['p1', 'p6', 'p3', 'p4', 'p5']);
    expect(partial.set3.away).toEqual(['a1', 'a2', 'a3', 'a4', 'a5']);
  });
});

describe('leagueEngine - Lag & Break Rotation (Rule 6)', () => {
  it('assigns odd frames to lag winner and even frames to opponent', () => {
    expect(getFrameBreaker(null, 1)).toBeNull();
    expect(getFrameBreaker('home', 1)).toBe('home');
    expect(getFrameBreaker('home', 2)).toBe('away');
    expect(getFrameBreaker('home', 15)).toBe('home');

    expect(getFrameBreaker('away', 1)).toBe('away');
    expect(getFrameBreaker('away', 2)).toBe('home');
    expect(getFrameBreaker('away', 15)).toBe('away');
  });
});

describe('leagueEngine - Section 9 BYE Rules', () => {
  it('does not auto-award BYE frames before both Set 1 lineups are locked', () => {
    const lineups = createEmptyLineups();
    lineups.set1.home = ['h1', 'h2', 'h3', 'h4', 'BYE'];
    lineups.set1.away = ['a1', 'a2', 'a3', 'a4', 'a5'];

    const frames = applyByeRulesToFrames(lineups, createEmptyFrames(), 'home', false);
    // Frame 5 (Set 1, slot 5 vs slot 5) must remain unscored while unlocked
    expect(frames[4].winner).toBeNull();
  });

  it('auto-awards frames against a BYE and awards BYE vs BYE to lag winner once Set 1 is locked', () => {
    const lineups = syncDefaultSubsequentSets({
      set1: {
        home: ['h1', 'h2', 'h3', 'h4', 'BYE'],
        away: ['a1', 'a2', 'a3', 'a4', 'BYE'],
      },
      set2: {
        home: [null, null, null, null, null],
        away: [null, null, null, null, null],
      },
      set3: {
        home: [null, null, null, null, null],
        away: [null, null, null, null, null],
      },
    });

    const frames = applyByeRulesToFrames(lineups, createEmptyFrames(), 'away', true);
    // Frame 5: Home slot 5 (BYE) vs Away slot 5 (BYE) -> awarded to lagWinner ('away')
    expect(frames[4].winner).toBe('away');
    expect(frames[4].dish).toBe(false);

    // Frame 8 (Set 2, game 3): Home slot 3 ('h3') vs Away slot 5 ('BYE') -> Home wins
    expect(frames[7].homeSlot).toBe(3);
    expect(frames[7].awaySlot).toBe(5);
    expect(frames[7].winner).toBe('home');

    // Frame 10 (Set 2, game 5): Home slot 5 ('BYE') vs Away slot 1 ('a1') -> Away wins
    expect(frames[9].homeSlot).toBe(5);
    expect(frames[9].awaySlot).toBe(1);
    expect(frames[9].winner).toBe('away');
  });
});

describe('leagueEngine - Lineup Eligibility & Substitutions (Rule 5)', () => {
  const roster: Player[] = [
    makePlayer({ id: 'p1', teamId: 't1', name: 'Player 1' }),
    makePlayer({ id: 'p2', teamId: 't1', name: 'Player 2' }),
    makePlayer({ id: 'p3', teamId: 't1', name: 'Player 3' }),
    makePlayer({ id: 'p4', teamId: 't1', name: 'Player 4' }),
    makePlayer({ id: 'p5', teamId: 't1', name: 'Player 5' }),
    makePlayer({ id: 'p6', teamId: 't1', name: 'Sub Player 6' }),
    makePlayer({ id: 'p7', teamId: 't1', name: 'Inactive Player', active: false }),
  ];

  it('prevents selecting an inactive player or a player already assigned in the same set', () => {
    const lineups = createEmptyLineups();
    lineups.set1.home = ['p1', 'p2', null, null, null];

    const options = getEligiblePlayersForSlot(roster, lineups, 1, 'home', 2);
    // Inactive player p7 is excluded completely
    expect(options.find((o) => o.player.id === 'p7')).toBeUndefined();

    // p1 is already in slot 1
    const p1Opt = options.find((o) => o.player.id === 'p1');
    expect(p1Opt?.disabledReason).toContain('Already in slot 1');

    // p3 is eligible
    const p3Opt = options.find((o) => o.player.id === 'p3');
    expect(p3Opt?.disabledReason).toBeUndefined();
  });

  it('prevents players who played in Set 1 from moving to a different slot in Set 2 (Rule 5d)', () => {
    const lineups: MatchLineups = {
      set1: {
        home: ['p1', 'p2', 'p3', 'p4', 'p5'],
        away: [null, null, null, null, null],
      },
      set2: {
        // p2 has been subbed out of Slot 2 for p6, so p2 is not currently in Set 2
        home: ['p1', 'p6', 'p3', 'p4', 'p5'],
        away: [null, null, null, null, null],
      },
      set3: {
        home: [null, null, null, null, null],
        away: [null, null, null, null, null],
      },
    };

    // Checking slot index 0 (Slot 1) in Set 2:
    const slot1Options = getEligiblePlayersForSlot(roster, lineups, 2, 'home', 0);
    // p1 played in Slot 1 in Set 1 -> allowed to stay in Slot 1
    expect(slot1Options.find((o) => o.player.id === 'p1')?.disabledReason).toBeUndefined();
    // p2 played in Slot 2 in Set 1 -> cannot move into Slot 1 in Set 2
    expect(slot1Options.find((o) => o.player.id === 'p2')?.disabledReason).toContain(
      'Played in slot 2 in Set 1'
    );
  });

  it('tracks substitutions and lock/approval states across sets', () => {
    const lineups = createEmptyLineups();
    lineups.set1.home = ['p1', 'p2', 'p3', 'p4', 'p5'];
    lineups.set2.home = ['p1', 'p6', 'p3', 'p4', 'p5'];
    lineups.subsLocked = { set2: { home: true }, set3: {} };
    lineups.subsUnlockRequested = { set2: { away: true }, set3: {} };
    lineups.subsPendingApproval = { set2: {}, set3: { home: true } };

    const subs = getSubstitutionsMade(lineups, 2, 'home');
    expect(subs).toEqual([{ slot: 2, inPlayerId: 'p6', outPlayerId: 'p2' }]);

    expect(isSubsLocked(lineups, 2, 'home')).toBe(true);
    expect(isSubsLocked(lineups, 1, 'home')).toBe(false);
    expect(isSlotSubstituted(lineups, 2, 'home', 1)).toBe(true);
    expect(isSlotSubstituted(lineups, 2, 'home', 0)).toBe(false);
    expect(isSubsUnlockRequested(lineups, 2, 'away')).toBe(true);
    expect(isSubsPendingApproval(lineups, 3, 'home')).toBe(true);
  });
});

describe('leagueEngine - Match Score & Points Calculation (Section 2)', () => {
  it('awards 2 points for match win plus 1 point per 3 frames won (max 7 points)', () => {
    const frames = createEmptyFrames().map((f, i) => ({
      ...f,
      winner: (i < 8 ? 'home' : 'away') as 'home' | 'away',
    }));
    const fix = makeFixture({ id: 'f1', homeTeamId: 't1', awayTeamId: 't2', frames });
    const score = calculateMatchScore(fix);

    // 8-7 result: Home gets 2 (win) + floor(8/3)=2 -> 4 pts; Away gets 0 + floor(7/3)=2 -> 2 pts
    expect(score.homeFrames).toBe(8);
    expect(score.awayFrames).toBe(7);
    expect(score.isDecided).toBe(true);
    expect(score.matchWinner).toBe('home');
    expect(score.homePoints).toBe(4);
    expect(score.awayPoints).toBe(2);
  });

  it('awards 7-0 points for a 15-0 whitewash', () => {
    const frames = createEmptyFrames().map((f) => ({ ...f, winner: 'home' as const }));
    const fix = makeFixture({ id: 'f2', homeTeamId: 't1', awayTeamId: 't2', frames });
    const score = calculateMatchScore(fix);

    expect(score.homePoints).toBe(7);
    expect(score.awayPoints).toBe(0);
  });

  it('handles knockout fixtures (first to 8 frames, 0 league points)', () => {
    const frames = createEmptyFrames().map((f, i) => ({
      ...f,
      winner: i < 8 ? ('away' as const) : null,
    }));
    const fix = makeFixture({
      id: 'ko1',
      homeTeamId: 't1',
      awayTeamId: 't2',
      matchType: 'knockout',
      frames,
    });

    expect(isKnockoutFixture(fix)).toBe(true);
    const score = calculateMatchScore(fix);
    expect(score.isDecided).toBe(true);
    expect(score.matchWinner).toBe('away');
    expect(score.homePoints).toBe(0);
    expect(score.awayPoints).toBe(0);
  });
});

describe('leagueEngine - League Table & Tiebreakers (Section 8a)', () => {
  const tA = makeTeam({ id: 'tA', name: 'Alpha' });
  const tB = makeTeam({ id: 'tB', name: 'Bravo' });
  const tC = makeTeam({ id: 'tC', name: 'Charlie' });

  const makeResultFixture = (
    id: string,
    homeId: string,
    awayId: string,
    homeWins: number,
    date = '2026-11-02'
  ): Fixture => {
    const frames = createEmptyFrames().map((f, idx) => ({
      ...f,
      winner: (idx < homeWins ? 'home' : 'away') as 'home' | 'away',
    }));
    return makeFixture({
      id,
      homeTeamId: homeId,
      awayTeamId: awayId,
      matchDate: date,
      frames,
    });
  };

  it('ranks teams by total points, then frame difference, then head-to-head', () => {
    // Both tA and tB beat tC 9-6 (5 pts each, +3 diff)
    // In H2H, tB beats tA 8-7 (tB gets 4 pts, tA gets 2 pts), and tA beats tC again to equalize points & frameDiff
    const fixtures: Fixture[] = [
      makeResultFixture('m1', 'tB', 'tA', 8, '2026-11-02'), // tB 8-7 tA
      makeResultFixture('m2', 'tA', 'tB', 8, '2026-11-09'), // tA 8-7 tB -> now equal on points (6) and diff (0)
      makeResultFixture('m3', 'tA', 'tC', 10, '2026-11-16'), // tA 10-5 tC -> tA +5 diff, +5 pts
      makeResultFixture('m4', 'tB', 'tC', 9, '2026-11-23'), // tB 9-6 tC -> tB +3 diff, +5 pts
    ];

    const table = computeLeagueTable('Premier League', [tA, tB, tC], fixtures);
    expect(table).toHaveLength(3);
    // Both tA and tB have 11 points, but tA has +5 frameDiff vs tB +3 frameDiff
    expect(table[0].team.id).toBe('tA');
    expect(table[0].points).toBe(11);
    expect(table[0].frameDiff).toBe(5);
    expect(table[1].team.id).toBe('tB');
    expect(table[1].points).toBe(11);
    expect(table[1].frameDiff).toBe(3);
    expect(table[2].team.id).toBe('tC');
  });

  it('resolves identical points and overall frame difference via head-to-head record', () => {
    // tA vs tB: tB wins 9-6 (tB: 5pts, +3; tA: 2pts, -3)
    // tA vs tC: tA wins 12-3 (tA: 6pts, +9; tC: 1pt, -9) -> tA total: 8pts, +6 diff
    // tB vs tC: tB wins 9-6 (tB: 5pts, +3) -> wait: let's make tA and tB equal on total points AND total frameDiff!
    // Match 1: tB beats tA 8-7 (tB: 4pts, +1 diff; tA: 2pts, -1 diff)
    // Match 2: tA beats tC 9-6 (tA: 5pts, +3 diff -> total 7pts, +2 diff)
    // Match 3: tC beats tB 8-7 (tB gets 2pts, -1 diff -> total 6pts)...
    // Let's use 4 teams so tA and tB have identical points and identical frameDiff, with tB winning H2H vs tA!
    const tD = makeTeam({ id: 'tD', name: 'Delta' });
    const fixtures: Fixture[] = [
      // H2H: tB beats tA 8-7 (tB: 4pts, +1; tA: 2pts, -1)
      makeResultFixture('f1', 'tB', 'tA', 8, '2026-11-02'),
      // tA beats tC 11-4 (tA: 5pts, +7 -> total: 7pts, +6 diff)
      makeResultFixture('f2', 'tA', 'tC', 11, '2026-11-09'),
      // tB loses to tD 4-11? No, tB needs 3 pts and +5 diff -> not possible in 1 match, so give tB two matches:
      // Simpler:
      // Match 1: tB beats tA 9-6 (tB: 5pts, +3; tA: 2pts, -3)
      // Match 2: tA beats tC 9-6 (tA: 5pts, +3 -> tA total: 7pts, 0 diff)
      // Match 3: tD beats tB 9-6 (tB: 2pts, -3 -> tB total: 7pts, 0 diff)
      // Now both tA and tB have 7 points and 0 frameDiff! In H2H, tB beat tA 9-6!
    ];
    const h2hFixtures: Fixture[] = [
      makeResultFixture('h1', 'tB', 'tA', 9, '2026-11-02'),
      makeResultFixture('h2', 'tA', 'tC', 9, '2026-11-09'),
      makeResultFixture('h3', 'tD', 'tB', 9, '2026-11-16'),
    ];
    void fixtures;

    const table = computeLeagueTable(
      'Premier League',
      [tA, tB, tC, tD],
      h2hFixtures
    );
    const rowA = table.find((r) => r.team.id === 'tA')!;
    const rowB = table.find((r) => r.team.id === 'tB')!;
    expect(rowA.points).toBe(7);
    expect(rowB.points).toBe(7);
    expect(rowA.frameDiff).toBe(0);
    expect(rowB.frameDiff).toBe(0);
    // tB must rank above tA due to H2H victory
    expect(table.indexOf(rowB)).toBeLessThan(table.indexOf(rowA));
  });
});

describe('leagueEngine - Player Stats & Dish Leaderboard (Section 8b & 8c)', () => {
  it('computes player averages, win percentage, dishes, and tie-breakers accurately', () => {
    const t1 = makeTeam({ id: 't1', name: 'Sharks' });
    const t2 = makeTeam({ id: 't2', name: 'Jets' });
    const players: Player[] = [
      makePlayer({ id: 'h1', teamId: 't1', name: 'Alice' }),
      makePlayer({ id: 'h2', teamId: 't1', name: 'Bob' }),
      makePlayer({ id: 'h3', teamId: 't1', name: 'Charlie' }),
      makePlayer({ id: 'h4', teamId: 't1', name: 'Dave' }),
      makePlayer({ id: 'h5', teamId: 't1', name: 'Eve' }),
      makePlayer({ id: 'a1', teamId: 't2', name: 'Frank' }),
      makePlayer({ id: 'a2', teamId: 't2', name: 'Grace' }),
      makePlayer({ id: 'a3', teamId: 't2', name: 'Heidi' }),
      makePlayer({ id: 'a4', teamId: 't2', name: 'Ivan' }),
      makePlayer({ id: 'a5', teamId: 't2', name: 'Judy' }),
    ];

    const lineups = syncDefaultSubsequentSets({
      set1: {
        home: ['h1', 'h2', 'h3', 'h4', 'h5'],
        away: ['a1', 'a2', 'a3', 'a4', 'a5'],
      },
      set2: {
        home: [null, null, null, null, null],
        away: [null, null, null, null, null],
      },
      set3: {
        home: [null, null, null, null, null],
        away: [null, null, null, null, null],
      },
    });

    const frames = createEmptyFrames().map((f) => {
      // Alice (homeSlot 1) wins all 3 of her frames with 2 dishes
      if (f.homeSlot === 1) {
        return { ...f, winner: 'home' as const, dish: f.setNumber <= 2 };
      }
      // Bob (homeSlot 2) wins all 3 of his frames with 0 dishes
      if (f.homeSlot === 2) {
        return { ...f, winner: 'home' as const, dish: false };
      }
      return { ...f, winner: 'away' as const, dish: false };
    });

    const fix = makeFixture({
      id: 'fix-stats',
      homeTeamId: 't1',
      awayTeamId: 't2',
      lineups,
      frames,
    });

    const { averagesTable, dishTable } = computePlayerStats(
      'Premier League',
      [t1, t2],
      players,
      [fix]
    );

    // Alice (h1), Bob (h2), and Judy (a5) all have 3 wins (100%).
    // Alice has 2 dishes so she ranks #1 in both tables.
    // Judy (a5) and Bob (h2) are tied on wins (3), win% (100%), dishes (0), and H2H (0),
    // so tie-breaker 8b.iv.2 ranks Judy (#2) above Bob (#3) because Jets (t2) won the match 9-6!
    expect(averagesTable[0].player.id).toBe('h1');
    expect(averagesTable[0].won).toBe(3);
    expect(averagesTable[0].winPercentage).toBe(100);
    expect(averagesTable[0].dishes).toBe(2);
    expect(averagesTable[0].matchesPlayed).toBe(1);

    expect(averagesTable[1].player.id).toBe('a5');
    expect(averagesTable[1].won).toBe(3);
    expect(averagesTable[2].player.id).toBe('h2');
    expect(averagesTable[2].won).toBe(3);

    expect(dishTable[0].player.id).toBe('h1');
    expect(dishTable[0].dishes).toBe(2);
  });
});

describe('leagueEngine - Date Helpers & Approval Warnings', () => {
  it('formats dates with accurate English ordinal suffixes', () => {
    expect(getOrdinalSuffix(1)).toBe('st');
    expect(getOrdinalSuffix(2)).toBe('nd');
    expect(getOrdinalSuffix(3)).toBe('rd');
    expect(getOrdinalSuffix(4)).toBe('th');
    expect(getOrdinalSuffix(11)).toBe('th');
    expect(getOrdinalSuffix(12)).toBe('th');
    expect(getOrdinalSuffix(13)).toBe('th');
    expect(getOrdinalSuffix(21)).toBe('st');
    expect(getOrdinalSuffix(22)).toBe('nd');
    expect(getOrdinalSuffix(23)).toBe('rd');
    expect(getOrdinalSuffix(31)).toBe('st');

    expect(formatMatchDate('2026-11-02')).toBe('2nd November 2026');
    expect(formatMatchDate('2026-10-31')).toBe('31st October 2026');
  });

  it('identifies past, today, and upcoming match timeframes', () => {
    expect(getMatchTimeframe('2020-01-01', 'scheduled')).toBe('past');
    expect(getMatchTimeframe('2099-12-31', 'scheduled')).toBe('upcoming');
    expect(getMatchTimeframe('2099-12-31', 'approved')).toBe('past');
  });

  it('flags missing frames and captain signatures in getScorecardApprovalWarnings', () => {
    const incompleteFix = makeFixture({
      id: 'warn-1',
      homeTeamId: 't1',
      awayTeamId: 't2',
      homeCaptainSigned: false,
      awayCaptainSigned: false,
    });
    const warnings = getScorecardApprovalWarnings(incompleteFix);
    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toContain('Not all frames have been played (0 of 15 completed)');
    expect(warnings[1]).toContain('Neither team captain has signed');

    const completedFrames = createEmptyFrames().map((f) => ({
      ...f,
      winner: 'home' as const,
    }));
    const readyFix = makeFixture({
      id: 'ready-1',
      homeTeamId: 't1',
      awayTeamId: 't2',
      frames: completedFrames,
      homeCaptainSigned: true,
      awayCaptainSigned: true,
    });
    expect(getScorecardApprovalWarnings(readyFix)).toEqual([]);
  });

  it('maps frame player IDs accurately for each set', () => {
    const lineups = createEmptyLineups();
    lineups.set2.home = ['h1', 'h2', 'h3', 'h4', 'h5'];
    lineups.set2.away = ['a1', 'a2', 'a3', 'a4', 'a5'];
    const frames = createEmptyFrames();
    // Frame 6 is Set 2, Game 1: Home Slot 1 vs Away Slot 3
    const players = getFramePlayers(lineups, frames[5]);
    expect(players).toEqual({ homePlayerId: 'h1', awayPlayerId: 'a3' });
  });
});

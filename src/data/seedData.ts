import { Fixture, FrameData, MatchLineups, Player, Team } from '../types/league';
import { AWAY_SLOT_ORDER, HOME_SLOT_ORDER } from '../utils/leagueEngine';

export const DEFAULT_SEASON_ID = 'winter-2026-27';
export const DEFAULT_SEASON_NAME = 'Winter 2026/27';

// Starts empty for the upcoming Winter 2026/27 season so League Admin can add all teams, players, and fixtures manually.
export const INITIAL_TEAMS: Team[] = [];
export const INITIAL_PLAYERS: Player[] = [];
export const INITIAL_FIXTURES: Fixture[] = [];

// Optional small sandbox/demo dataset that an Admin can load with 1 click to test scoring & tables, and clear anytime.
function buildFramesFromWinners(
  winners: ('home' | 'away' | null)[],
  dishes: number[] = [],
  reverseDishes: number[] = []
): FrameData[] {
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
        winner: winners[frameNumber - 1] ?? null,
        dish: dishes.includes(frameNumber),
        reverseDish: reverseDishes.includes(frameNumber),
      });
      frameNumber++;
    }
  });
  return frames;
}

export const DEMO_TEAMS: Team[] = [
  {
    id: 'demo-team-home',
    division: 'Division 1',
    name: 'Wilmy Lions (Demo)',
    venue: 'Longman of Wilmington',
    address: 'Brighton',
    captainName: 'Lewes Pollington',
  },
  {
    id: 'demo-team-away',
    division: 'Division 1',
    name: 'LA Pool Club (Demo)',
    venue: 'LA Pool Club',
    address: 'Brighton Marina',
    captainName: 'Hamed Eslami',
  },
];

export const DEMO_PLAYERS: Player[] = [
  { id: 'demo-p-1', teamId: 'demo-team-home', name: 'Harry Craker', active: true },
  { id: 'demo-p-2', teamId: 'demo-team-home', name: 'Bayley Pollington', active: true },
  { id: 'demo-p-3', teamId: 'demo-team-home', name: 'Lewes Pollington', active: true },
  { id: 'demo-p-4', teamId: 'demo-team-home', name: 'Ellis Clarke', active: true },
  { id: 'demo-p-5', teamId: 'demo-team-home', name: 'JJ Minty', active: true },
  { id: 'demo-p-6', teamId: 'demo-team-home', name: 'Alfie Craker', active: true },

  { id: 'demo-p-7', teamId: 'demo-team-away', name: 'Duane Cammock', active: true },
  { id: 'demo-p-8', teamId: 'demo-team-away', name: 'Craig Jakubowski', active: true },
  { id: 'demo-p-9', teamId: 'demo-team-away', name: 'Macca', active: true },
  { id: 'demo-p-10', teamId: 'demo-team-away', name: 'Hamed Eslami', active: true },
];

const DEMO_LINEUPS: MatchLineups = {
  set1: {
    home: ['demo-p-1', 'demo-p-2', 'demo-p-3', 'demo-p-4', 'demo-p-5'],
    away: ['demo-p-7', 'demo-p-8', 'demo-p-9', 'demo-p-10', 'BYE'],
  },
  set2: {
    home: ['demo-p-1', 'demo-p-2', 'demo-p-3', 'demo-p-4', 'demo-p-6'],
    away: ['demo-p-7', 'demo-p-8', 'demo-p-9', 'demo-p-10', 'BYE'],
  },
  set3: {
    home: ['demo-p-1', 'demo-p-2', 'demo-p-3', 'demo-p-5', 'demo-p-6'],
    away: ['demo-p-7', 'demo-p-8', 'demo-p-9', 'demo-p-10', 'BYE'],
  },
};

export const DEMO_FIXTURES: Fixture[] = [
  {
    id: 'demo-fixture-1',
    seasonId: DEFAULT_SEASON_ID,
    division: 'Division 1',
    matchDate: '2026-11-02',
    weekNumber: 1,
    homeTeamId: 'demo-team-home',
    awayTeamId: 'demo-team-away',
    status: 'submitted',
    lagWinner: 'away',
    homeSet1Locked: true,
    awaySet1Locked: true,
    lineups: DEMO_LINEUPS,
    frames: buildFramesFromWinners(
      [
        'home',
        'away',
        'away',
        'home',
        'home',
        'away',
        'away',
        'home',
        'home',
        'away',
        'away',
        'away',
        'home',
        'home',
        'away',
      ],
      [3, 9],
      [11]
    ),
    homeCaptainSigned: true,
    awayCaptainSigned: true,
    submittedAt: '2026-11-02T22:45:00Z',
    updatedAt: '2026-11-02T22:45:00Z',
  },
];

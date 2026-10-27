import {
  Division,
  Fixture,
  FrameData,
  MatchLineups,
  Player,
  SlotPlayerId,
  Team,
} from '../types/league';
import { createEmptyFrames, createEmptyLineups } from '../utils/leagueEngine';
import { DEFAULT_SEASON_ID } from './seedData';

export const LOCAL_TEST_TEAMS: Team[] = [
  // Division 1
  {
    id: 'team-kq-a',
    seasonId: DEFAULT_SEASON_ID,
    division: 'Division 1',
    name: 'King & Queen A',
    venue: 'The King & Queen',
    address: '13–17 Marlborough Place, Brighton BN1 1UB',
    captainName: 'Dave Mercer',
    captainPin: '11111111',
    tableNumber: 'Table 1',
  },
  {
    id: 'team-cob-a',
    seasonId: DEFAULT_SEASON_ID,
    division: 'Division 1',
    name: 'Caroline of Brunswick A',
    venue: 'Caroline of Brunswick',
    address: '39 Ditchling Road, Brighton BN1 4SB',
    captainName: 'Sam Hollis',
    captainPin: '22222222',
    tableNumber: 'Table 1',
  },
  {
    id: 'team-castle-a',
    seasonId: DEFAULT_SEASON_ID,
    division: 'Division 1',
    name: 'Castle Club A',
    venue: 'Castle Snooker & Pool Club',
    address: '20–21 Castle Street, Brighton BN1 2HD',
    captainName: 'Liam Vance',
    captainPin: '33333333',
    tableNumber: 'Table 1',
  },
  {
    id: 'team-hollingbury-a',
    seasonId: DEFAULT_SEASON_ID,
    division: 'Division 1',
    name: 'Hollingbury Golf Club',
    venue: 'Hollingbury Park Golf Club',
    address: 'Ditchling Road, Brighton BN1 7HS',
    captainName: 'Mark Tarrant',
    captainPin: '44444444',
  },

  // Division 2
  {
    id: 'team-kq-b',
    seasonId: DEFAULT_SEASON_ID,
    division: 'Division 2',
    name: 'King & Queen B',
    venue: 'The King & Queen',
    address: '13–17 Marlborough Place, Brighton BN1 1UB',
    captainName: 'Chris Barker',
    captainPin: '55555555',
    tableNumber: 'Table 2',
  },
  {
    id: 'team-sportsman',
    seasonId: DEFAULT_SEASON_ID,
    division: 'Division 2',
    name: 'The Sportsman',
    venue: 'The Sportsman Pub',
    address: 'Withdean Stadium, Tongdean Lane, Brighton BN1 5JD',
    captainName: 'Tom Weller',
    captainPin: '66666666',
  },
  {
    id: 'team-newoak',
    seasonId: DEFAULT_SEASON_ID,
    division: 'Division 2',
    name: 'The New Oak',
    venue: 'The New Oak',
    address: '85 County Oak Avenue, Brighton BN1 8LU',
    captainName: 'Benny Cole',
    captainPin: '77777777',
  },
  {
    id: 'team-fiveways',
    seasonId: DEFAULT_SEASON_ID,
    division: 'Division 2',
    name: 'The Fiveways',
    venue: 'The Fiveways Hotel',
    address: '291 Ditchling Road, Brighton BN1 6JH',
    captainName: 'Ollie Reed',
    captainPin: '88888888',
  },
];

const SQUAD_NAMES: Record<string, string[]> = {
  'team-kq-a': [
    'Dave Mercer',
    'Callum Price',
    'Jack Thornton',
    'Ryan Goble',
    'Matty Finch',
    'Dan West',
  ],
  'team-cob-a': [
    'Sam Hollis',
    'Alex Kemp',
    'Jamie Brooks',
    'Toby Marsh',
    'Connor Shaw',
    'Will Perry',
  ],
  'team-castle-a': [
    'Liam Vance',
    'Nathan Cross',
    'Harry Sterling',
    'Kieran Bell',
    'Zac Palmer',
    'Josh Dunn',
  ],
  'team-hollingbury-a': [
    'Mark Tarrant',
    'Steve Harding',
    'Paul Gillingham',
    'Robbie Yates',
    'Gavin Frost',
    'Neil Abbott',
  ],
  'team-kq-b': [
    'Chris Barker',
    'Luke Mears',
    'Danny Evans',
    'Joe Newman',
    'Max Cooper',
    'Jake Ellis',
  ],
  'team-sportsman': [
    'Tom Weller',
    'Nick Slater',
    'Brad Knight',
    'Andy Page',
    'Craig Moran',
    'Simon Hunt',
  ],
  'team-newoak': [
    'Benny Cole',
    'Shane Fletcher',
    'Dean Walsh',
    'Ricky Stone',
    'Carl Gregory',
    'Wayne Jarvis',
  ],
  'team-fiveways': [
    'Ollie Reed',
    'Charlie Moss',
    'George Lindfield',
    'Leo Tucker',
    'Mitch Hayward',
    'Archie May',
  ],
};

export const LOCAL_TEST_PLAYERS: Player[] = Object.entries(SQUAD_NAMES).flatMap(
  ([teamId, names]) =>
    names.map((name, idx) => ({
      id: `${teamId}-p${idx + 1}`,
      teamId,
      name,
      active: true,
    }))
);

function getTeamLineupSlots(
  teamId: string,
  subSlotInSet3 = false
): {
  s1: [SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId];
  s2: [SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId];
  s3: [SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId];
} {
  const s1: [SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId] = [
    `${teamId}-p1`,
    `${teamId}-p2`,
    `${teamId}-p3`,
    `${teamId}-p4`,
    `${teamId}-p5`,
  ];
  const s2: [SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId] = [
    ...s1,
  ];
  const s3: [SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId] = subSlotInSet3
    ? [
        `${teamId}-p1`,
        `${teamId}-p2`,
        `${teamId}-p3`,
        `${teamId}-p4`,
        `${teamId}-p6`,
      ]
    : [...s1];
  return { s1, s2, s3 };
}

function buildMatchData(
  homeTeamId: string,
  awayTeamId: string,
  winners: ('home' | 'away' | null)[],
  dishFrames: number[] = []
): { lineups: MatchLineups; frames: FrameData[] } {
  const home = getTeamLineupSlots(homeTeamId, true);
  const away = getTeamLineupSlots(awayTeamId, false);

  const lineups: MatchLineups = {
    set1: { home: home.s1, away: away.s1 },
    set2: { home: home.s2, away: away.s2 },
    set3: { home: home.s3, away: away.s3 },
  };

  const frames = createEmptyFrames().map((f, idx) => {
    const w = winners[idx] ?? null;
    return {
      ...f,
      winner: w,
      dish: w !== null && dishFrames.includes(f.frameNumber),
    };
  });

  return { lineups, frames };
}

function buildCompletedFixture(params: {
  id: string;
  division: Division;
  weekNumber: number;
  matchDate: string;
  homeTeamId: string;
  awayTeamId: string;
  lagWinner: 'home' | 'away';
  status: 'approved' | 'submitted';
  winners: ('home' | 'away')[];
  dishFrames?: number[];
}): Fixture {
  const { lineups, frames } = buildMatchData(
    params.homeTeamId,
    params.awayTeamId,
    params.winners,
    params.dishFrames ?? []
  );

  return {
    id: params.id,
    seasonId: DEFAULT_SEASON_ID,
    division: params.division,
    matchDate: params.matchDate,
    weekNumber: params.weekNumber,
    homeTeamId: params.homeTeamId,
    awayTeamId: params.awayTeamId,
    status: params.status,
    lagWinner: params.lagWinner,
    homeSet1Locked: true,
    awaySet1Locked: true,
    lineups,
    frames,
    homeCaptainSigned: true,
    awayCaptainSigned: true,
    submittedAt: `${params.matchDate}T22:45:00Z`,
    approvedAt:
      params.status === 'approved' ? `${params.matchDate}T23:15:00Z` : undefined,
    updatedAt: `${params.matchDate}T23:15:00Z`,
  };
}

export const LOCAL_TEST_FIXTURES: Fixture[] = [
  // =========================================================================
  // WEEK 1 — Completed & Approved Matches (Populates Standings & Averages)
  // =========================================================================
  buildCompletedFixture({
    id: 'test-fix-d1-w1-1',
    division: 'Division 1',
    weekNumber: 1,
    matchDate: '2026-10-12',
    homeTeamId: 'team-kq-a',
    awayTeamId: 'team-cob-a',
    lagWinner: 'home',
    status: 'approved',
    // King & Queen A wins 9–6 (5 league pts vs 2 league pts)
    winners: [
      'home', 'away', 'home', 'home', 'away', // Set 1: 3-2
      'away', 'home', 'home', 'away', 'home', // Set 2: 3-2
      'home', 'away', 'home', 'away', 'home', // Set 3: 3-2
    ],
    dishFrames: [1, 7, 12],
  }),
  buildCompletedFixture({
    id: 'test-fix-d1-w1-2',
    division: 'Division 1',
    weekNumber: 1,
    matchDate: '2026-10-12',
    homeTeamId: 'team-castle-a',
    awayTeamId: 'team-hollingbury-a',
    lagWinner: 'away',
    status: 'approved',
    // Castle Club A wins 11–4 (5 league pts vs 1 league pt)
    winners: [
      'home', 'home', 'away', 'home', 'home', // Set 1: 4-1
      'home', 'away', 'home', 'home', 'away', // Set 2: 3-2
      'home', 'home', 'away', 'home', 'home', // Set 3: 4-1
    ],
    dishFrames: [2, 6, 11, 14],
  }),
  buildCompletedFixture({
    id: 'test-fix-d2-w1-1',
    division: 'Division 2',
    weekNumber: 1,
    matchDate: '2026-10-12',
    homeTeamId: 'team-kq-b',
    awayTeamId: 'team-sportsman',
    lagWinner: 'home',
    status: 'approved',
    // The Sportsman wins 8–7 away (4 league pts vs 2 league pts)
    winners: [
      'home', 'away', 'home', 'away', 'home', // Set 1: 3-2
      'away', 'home', 'away', 'home', 'away', // Set 2: 2-3
      'home', 'away', 'away', 'home', 'away', // Set 3: 2-3
    ],
    dishFrames: [4, 15],
  }),
  buildCompletedFixture({
    id: 'test-fix-d2-w1-2',
    division: 'Division 2',
    weekNumber: 1,
    matchDate: '2026-10-12',
    homeTeamId: 'team-newoak',
    awayTeamId: 'team-fiveways',
    lagWinner: 'home',
    status: 'approved',
    // The New Oak wins 10–5 (5 league pts vs 1 league pt)
    winners: [
      'home', 'home', 'away', 'home', 'away', // Set 1: 3-2
      'home', 'home', 'home', 'away', 'home', // Set 2: 4-1
      'away', 'home', 'home', 'away', 'home', // Set 3: 3-2
    ],
    dishFrames: [1, 8],
  }),

  // =========================================================================
  // WEEK 2 — Mix of Live, Submitted (Awaiting Admin Approval), & Approved
  // =========================================================================

  // 1) LIVE MATCH IN PROGRESS (7–6 in Set 3 — ready to tap Frame 14 & 15!)
  (() => {
    const { lineups, frames } = buildMatchData(
      'team-cob-a',
      'team-castle-a',
      [
        'home', 'away', 'home', 'away', 'home', // Set 1: 3-2
        'away', 'away', 'home', 'away', 'home', // Set 2: 2-3 (Total 5-5)
        'home', 'away', 'home', null, null,     // Set 3: 2-1 so far (Total 7-6, Frame 14 & 15 left!)
      ],
      [3, 9, 11]
    );
    return {
      id: 'test-fix-d1-w2-live',
      seasonId: DEFAULT_SEASON_ID,
      division: 'Division 1',
      matchDate: '2026-10-19',
      weekNumber: 2,
      homeTeamId: 'team-cob-a',
      awayTeamId: 'team-castle-a',
      status: 'live',
      lagWinner: 'home',
      homeSet1Locked: true,
      awaySet1Locked: true,
      lineups,
      frames,
      homeCaptainSigned: false,
      awayCaptainSigned: false,
      updatedAt: '2026-10-19T21:50:00Z',
    } satisfies Fixture;
  })(),

  // 2) SUBMITTED MATCH (8–7, both captains signed — ready for Admin Approval!)
  buildCompletedFixture({
    id: 'test-fix-d1-w2-submitted',
    division: 'Division 1',
    weekNumber: 2,
    matchDate: '2026-10-19',
    homeTeamId: 'team-hollingbury-a',
    awayTeamId: 'team-kq-a',
    lagWinner: 'away',
    status: 'submitted',
    // King & Queen A wins 8–7 away
    winners: [
      'away', 'home', 'away', 'home', 'away', // Set 1: 2-3
      'home', 'away', 'home', 'away', 'home', // Set 2: 3-2
      'away', 'home', 'away', 'home', 'away', // Set 3: 2-3
    ],
    dishFrames: [5, 10],
  }),

  // 3) LIVE MATCH IN BLIND SET 1 ENTRY (Home locked Set 1, Away ready to enter & lock!)
  (() => {
    const lineups = createEmptyLineups();
    const homeSlots = getTeamLineupSlots('team-sportsman');
    lineups.set1.home = homeSlots.s1;
    lineups.set2.home = homeSlots.s2;
    lineups.set3.home = homeSlots.s3;
    return {
      id: 'test-fix-d2-w2-blind-set1',
      seasonId: DEFAULT_SEASON_ID,
      division: 'Division 2',
      matchDate: '2026-10-19',
      weekNumber: 2,
      homeTeamId: 'team-sportsman',
      awayTeamId: 'team-newoak',
      status: 'scheduled',
      lagWinner: 'home',
      homeSet1Locked: true,
      awaySet1Locked: false,
      lineups,
      frames: createEmptyFrames(),
      homeCaptainSigned: false,
      awayCaptainSigned: false,
      updatedAt: '2026-10-19T20:05:00Z',
    } satisfies Fixture;
  })(),

  // 4) APPROVED MATCH IN DIVISION 2 WEEK 2
  buildCompletedFixture({
    id: 'test-fix-d2-w2-approved',
    division: 'Division 2',
    weekNumber: 2,
    matchDate: '2026-10-19',
    homeTeamId: 'team-fiveways',
    awayTeamId: 'team-kq-b',
    lagWinner: 'home',
    status: 'approved',
    // King & Queen B wins 9–6 away
    winners: [
      'away', 'home', 'away', 'away', 'home', // Set 1: 2-3
      'home', 'away', 'away', 'home', 'away', // Set 2: 2-3
      'away', 'home', 'away', 'home', 'away', // Set 3: 2-3
    ],
    dishFrames: [3, 13],
  }),

  // =========================================================================
  // WEEK 3 — Scheduled Matches (Ready to test starting from scratch)
  // =========================================================================
  {
    id: 'test-fix-d1-w3-1',
    seasonId: DEFAULT_SEASON_ID,
    division: 'Division 1',
    matchDate: '2026-10-26',
    weekNumber: 3,
    homeTeamId: 'team-kq-a',
    awayTeamId: 'team-castle-a',
    status: 'scheduled',
    lagWinner: null,
    homeSet1Locked: false,
    awaySet1Locked: false,
    lineups: createEmptyLineups(),
    frames: createEmptyFrames(),
    homeCaptainSigned: false,
    awayCaptainSigned: false,
    updatedAt: '2026-10-26T18:00:00Z',
  },
  {
    id: 'test-fix-d1-w3-2',
    seasonId: DEFAULT_SEASON_ID,
    division: 'Division 1',
    matchDate: '2026-10-26',
    weekNumber: 3,
    homeTeamId: 'team-cob-a',
    awayTeamId: 'team-hollingbury-a',
    status: 'scheduled',
    lagWinner: null,
    homeSet1Locked: false,
    awaySet1Locked: false,
    lineups: createEmptyLineups(),
    frames: createEmptyFrames(),
    homeCaptainSigned: false,
    awayCaptainSigned: false,
    updatedAt: '2026-10-26T18:00:00Z',
  },
  {
    id: 'test-fix-d2-w3-1',
    seasonId: DEFAULT_SEASON_ID,
    division: 'Division 2',
    matchDate: '2026-10-26',
    weekNumber: 3,
    homeTeamId: 'team-kq-b',
    awayTeamId: 'team-newoak',
    status: 'scheduled',
    lagWinner: null,
    homeSet1Locked: false,
    awaySet1Locked: false,
    lineups: createEmptyLineups(),
    frames: createEmptyFrames(),
    homeCaptainSigned: false,
    awayCaptainSigned: false,
    updatedAt: '2026-10-26T18:00:00Z',
  },
  {
    id: 'test-fix-d2-w3-2',
    seasonId: DEFAULT_SEASON_ID,
    division: 'Division 2',
    matchDate: '2026-10-26',
    weekNumber: 3,
    homeTeamId: 'team-sportsman',
    awayTeamId: 'team-fiveways',
    status: 'scheduled',
    lagWinner: null,
    homeSet1Locked: false,
    awaySet1Locked: false,
    lineups: createEmptyLineups(),
    frames: createEmptyFrames(),
    homeCaptainSigned: false,
    awayCaptainSigned: false,
    updatedAt: '2026-10-26T18:00:00Z',
  },
];

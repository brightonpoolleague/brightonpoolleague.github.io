export type Division = string;

export const DEFAULT_DIVISIONS: Division[] = [
  'Premier League',
  'Division 1',
  'Division 2',
  'Division 3',
];

export const DIVISIONS: Division[] = DEFAULT_DIVISIONS;

export type UserRole = 'viewer' | 'captain' | 'admin';

export interface UserSession {
  role: UserRole;
  teamId?: string;
  name: string;
  pin?: string;
}

export interface Season {
  id: string;
  name: string;
  isActive: boolean;
  divisions?: Division[];
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  active: boolean;
}

export interface Team {
  id: string;
  seasonId: string;
  division: Division;
  name: string;
  venue: string;
  address: string;
  captainName: string;
  captainPin: string;
  tableNumber?: string;
}

// 'BYE' represents a missing player (No Player / BYE) in position 4 or 5
export type SlotPlayerId = string | 'BYE' | null;

export interface MatchLineups {
  set1: {
    home: [SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId];
    away: [SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId];
  };
  set2: {
    home: [SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId];
    away: [SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId];
  };
  set3: {
    home: [SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId];
    away: [SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId];
  };
  unlockRequested?: {
    home?: boolean;
    away?: boolean;
  };
}

export type FrameWinner = 'home' | 'away' | null;

export interface FrameData {
  frameNumber: number; // 1 to 15
  setNumber: 1 | 2 | 3;
  gameInSet: 1 | 2 | 3 | 4 | 5;
  homeSlot: 1 | 2 | 3 | 4 | 5;
  awaySlot: 1 | 2 | 3 | 4 | 5;
  winner: FrameWinner;
  dish: boolean;
}

export type FixtureStatus = 'scheduled' | 'live' | 'submitted' | 'approved';
export type MatchType = 'league' | 'knockout' | 'cup';

export interface Fixture {
  id: string;
  seasonId: string;
  division: Division;
  matchDate: string; // YYYY-MM-DD
  weekNumber: number;
  homeTeamId: string;
  awayTeamId: string;
  matchType?: MatchType;
  competitionName?: string; // e.g. "Division 1 Cup", "Summer Cup", "Summer Plate"
  round?: string; // e.g. "Preliminary Round", "Quarter-Final", "Semi-Final", "Final"
  cupName?: string; // backward-compat alias
  cupRound?: string; // backward-compat alias
  status: FixtureStatus;
  lagWinner: 'home' | 'away' | null;
  homeSet1Locked: boolean;
  awaySet1Locked: boolean;
  lineups: MatchLineups;
  frames: FrameData[];
  homeCaptainSigned: boolean;
  awayCaptainSigned: boolean;
  submittedAt?: string;
  approvedAt?: string;
  updatedAt: string;
}

export interface LeagueTableRow {
  team: Team;
  played: number;
  won: number;
  lost: number;
  framesFor: number;
  framesAgainst: number;
  frameDiff: number;
  points: number;
  form: ('W' | 'L')[];
}

export interface PlayerStatsRow {
  player: Player;
  team: Team;
  division: Division;
  played: number;
  won: number;
  lost: number;
  winPercentage: number;
  dishes: number;
}

import { DEFAULT_DIVISIONS, Fixture, Player, Season, Team } from '../types/league';

export const DEFAULT_SEASON_ID = 'winter-2026-27';
export const DEFAULT_SEASON_NAME = 'Winter 2026/27';
export const DEFAULT_ADMIN_PIN = '00000000';

export const INITIAL_SEASONS: Season[] = [
  {
    id: DEFAULT_SEASON_ID,
    name: DEFAULT_SEASON_NAME,
    isActive: true,
    divisions: DEFAULT_DIVISIONS,
  },
];

export const INITIAL_TEAMS: Team[] = [];
export const INITIAL_PLAYERS: Player[] = [];
export const INITIAL_FIXTURES: Fixture[] = [];

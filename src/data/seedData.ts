import { Fixture, Player, Season, Team } from '../types/league';

export const DEFAULT_SEASON_ID = 'winter-2026-27';
export const DEFAULT_SEASON_NAME = 'Winter 2026/27';
export const DEFAULT_ADMIN_PIN = '0000';

export const INITIAL_SEASONS: Season[] = [
  {
    id: DEFAULT_SEASON_ID,
    name: DEFAULT_SEASON_NAME,
    isActive: true,
  },
];

export const INITIAL_TEAMS: Team[] = [];
export const INITIAL_PLAYERS: Player[] = [];
export const INITIAL_FIXTURES: Fixture[] = [];

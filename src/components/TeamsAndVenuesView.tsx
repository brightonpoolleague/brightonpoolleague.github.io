import React, { useMemo, useState } from 'react';
import {
  Building2,
  ExternalLink,
  Eye,
  EyeOff,
  Layers,
  MapPin,
  Search,
  Shield,
  Sparkles,
  Table as TableIcon,
  Users,
} from 'lucide-react';
import { Division, Team } from '../types/league';
import { useLeague } from '../context/LeagueContext';

export const TeamsAndVenuesView: React.FC = () => {
  const { seasonName, divisions, teams, players, session } = useLeague();

  const isCaptain = session.role === 'captain' && Boolean(session.teamId);
  const myTeam = isCaptain ? teams.find((t) => t.id === session.teamId) : null;
  const mySquad = myTeam
    ? players.filter((p) => p.teamId === myTeam.id && p.active)
    : [];

  const [showMyTeamVenue, setShowMyTeamVenue] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem('bpl_show_my_team_venue');
    return stored !== 'false';
  });

  const toggleMyTeamVenue = () => {
    setShowMyTeamVenue((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('bpl_show_my_team_venue', String(next));
      }
      return next;
    });
  };

  const [selectedDivision, setSelectedDivision] = useState<Division | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewStyle, setViewStyle] = useState<'venue' | 'team'>('venue');

  // Filter teams by division & search query
  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      if (selectedDivision !== 'ALL' && team.division !== selectedDivision) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = team.name.toLowerCase().includes(query);
        const matchesVenue = team.venue.toLowerCase().includes(query);
        const matchesCaptain = team.captainName.toLowerCase().includes(query);
        const matchesAddress = team.address.toLowerCase().includes(query);
        const matchesTable = (team.tableNumber || '').toLowerCase().includes(query);
        const matchesDivision = team.division.toLowerCase().includes(query);
        return (
          matchesName ||
          matchesVenue ||
          matchesCaptain ||
          matchesAddress ||
          matchesTable ||
          matchesDivision
        );
      }
      return true;
    });
  }, [teams, selectedDivision, searchQuery]);

  // Group filtered teams by venue
  const venuesMap = useMemo(() => {
    const map = new Map<
      string,
      {
        venue: string;
        address: string;
        teams: Team[];
      }
    >();

    filteredTeams.forEach((team) => {
      const key = team.venue.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          venue: team.venue.trim(),
          address: team.address.trim(),
          teams: [team],
        });
      } else {
        const existing = map.get(key)!;
        existing.teams.push(team);
        if (!existing.address && team.address) {
          existing.address = team.address.trim();
        }
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.venue.localeCompare(b.venue)
    );
  }, [filteredTeams]);

  // Compute unique venues count across all teams in this season
  const totalVenuesCount = useMemo(() => {
    const unique = new Set(teams.map((t) => t.venue.trim().toLowerCase()));
    return unique.size;
  }, [teams]);

  return (
    <div className="space-y-5">
      {/* Header & Stats Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <Building2 className="w-3.5 h-3.5" />
              {seasonName} Season
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5">
              Teams &amp; Venues
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
              Directory of all league teams, home venues, table assignments, and
              team captains for the {seasonName} season.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <strong>{teams.length}</strong> Teams
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <strong>{totalVenuesCount}</strong> Venues
            </span>
          </div>
        </div>

        {/* Division Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedDivision('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              selectedDivision === 'ALL'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            All Divisions ({teams.length})
          </button>
          {divisions.map((div) => {
            const count = teams.filter((t) => t.division === div).length;
            return (
              <button
                key={div}
                type="button"
                onClick={() => setSelectedDivision(div)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                  selectedDivision === div
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span>{div}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedDivision === div
                      ? 'bg-emerald-800 text-emerald-100'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Layout Toggle Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1 border-t border-slate-800/80">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by team, venue, table, captain or street..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewStyle('venue')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewStyle === 'venue'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Group by Venue</span>
            </button>
            <button
              type="button"
              onClick={() => setViewStyle('team')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewStyle === 'team'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Teams List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Team Captain Spotlight: My Team & Venue */}
      {isCaptain && myTeam && (() => {
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${myTeam.venue}, ${myTeam.address || 'Brighton'}`
        )}`;

        if (!showMyTeamVenue) {
          return (
            <div
              onClick={toggleMyTeamVenue}
              className="cursor-pointer bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 text-xs transition shadow-md group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 font-bold text-xs border border-emerald-500/30 shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  MY TEAM &amp; VENUE
                </span>
                <span className="text-slate-300 truncate font-semibold">
                  <span className="text-white font-bold">{myTeam.name}</span>
                  <span className="text-slate-500 mx-1.5 font-normal">•</span>
                  <span className="text-slate-300">{myTeam.venue}</span>
                  {myTeam.tableNumber && (
                    <span className="text-amber-300 ml-1.5 font-bold">({myTeam.tableNumber})</span>
                  )}
                </span>
                <span className="text-slate-600 hidden sm:inline">•</span>
                <span className="text-slate-400 hidden sm:inline">
                  {myTeam.division} • {mySquad.length} Players
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-emerald-400 group-hover:text-emerald-300 text-xs font-bold shrink-0">
                <Eye className="w-3.5 h-3.5" />
                <span>Show Details</span>
              </div>
            </div>
          );
        }

        return (
          <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border-2 border-emerald-500/50 rounded-2xl p-3.5 sm:p-5 shadow-xl space-y-3.5">
            {/* Top Row: Tag, Division, Table, and Hide button */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/40">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  MY TEAM &amp; VENUE
                </span>
                <span className="text-slate-400 font-semibold">
                  {myTeam.division}
                </span>
                {myTeam.tableNumber && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold">
                      <TableIcon className="w-3 h-3" />
                      {myTeam.tableNumber}
                    </span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={toggleMyTeamVenue}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold border border-slate-700/80 transition shadow-sm"
                title="Hide My Team & Venue spotlight"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Hide</span>
              </button>
            </div>

            {/* Middle: Team & Venue info grid */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Left col: Team & Captain */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-base sm:text-xl text-white">
                    {myTeam.name}
                  </h3>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                    Your Team
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Team Captain: <strong className="text-white">{myTeam.captainName || 'TBD'}</strong>
                  </span>
                </div>
              </div>

              {/* Right col: Home Venue & Directions */}
              <div className="space-y-2 flex flex-col justify-between">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="font-bold text-white text-sm sm:text-base truncate">
                        {myTeam.venue}
                      </div>
                      {myTeam.address && (
                        <div className="text-xs text-slate-400 leading-snug">
                          {myTeam.address}
                        </div>
                      )}
                    </div>
                  </div>

                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition shrink-0"
                    title="Get directions on Google Maps"
                  >
                    <span>Directions</span>
                    <ExternalLink className="w-3 h-3 text-emerald-400" />
                  </a>
                </div>
              </div>
            </div>

            {/* Registered Squad Section: show all players! */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 sm:p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  Registered Squad ({mySquad.length} Players)
                </span>
              </div>

              {mySquad.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {mySquad.map((player) => {
                    const isCap =
                      player.name.trim().toLowerCase() ===
                      (myTeam.captainName || '').trim().toLowerCase();
                    return (
                      <span
                        key={player.id}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border ${
                          isCap
                            ? 'bg-amber-500/20 text-amber-200 border-amber-500/40 font-bold'
                            : 'bg-slate-900 text-slate-200 border-slate-800 font-medium'
                        }`}
                      >
                        <span>{player.name}</span>
                        {isCap && (
                          <span className="text-[10px] bg-amber-500/30 text-amber-300 px-1 py-0.2 rounded font-black">
                            CAPTAIN
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No players registered yet.</p>
              )}
            </div>
          </div>
        );
      })()}

      {/* Content Area */}
      {filteredTeams.length === 0 ? (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-8 text-center text-sm text-slate-400 space-y-1.5">
          <p className="font-semibold text-slate-300">No teams or venues found.</p>
          <p className="text-xs text-slate-500">
            {searchQuery
              ? `No results matching "${searchQuery}". Try a different keyword.`
              : `No teams registered under ${selectedDivision} for this season.`}
          </p>
        </div>
      ) : viewStyle === 'venue' ? (
        /* VIEW 1: GROUPED BY VENUE */
        <div className="space-y-4">
          {venuesMap.map((venueGroup) => {
            const hasMultipleTeams = venueGroup.teams.length > 1;
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${venueGroup.venue}, ${venueGroup.address || 'Brighton'}`
            )}`;

            return (
              <div
                key={venueGroup.venue}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 transition hover:border-slate-700 shadow-sm"
              >
                {/* Venue Header */}
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="truncate">{venueGroup.venue}</span>
                      </h3>
                      {hasMultipleTeams && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                          {venueGroup.teams.length} Home Teams
                        </span>
                      )}
                    </div>
                    {venueGroup.address && (
                      <p className="text-xs text-slate-400 mt-0.5 pl-6">
                        {venueGroup.address}
                      </p>
                    )}
                  </div>

                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-medium transition shrink-0"
                    title="Open address in Google Maps"
                  >
                    <span>Directions</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                </div>

                {/* Teams playing at this venue */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {venueGroup.teams.map((team) => {
                    const squad = players.filter((p) => p.teamId === team.id && p.active);
                    const isMyTeam = isCaptain && team.id === myTeam?.id;

                    return (
                      <div
                        key={team.id}
                        className={`bg-slate-950/80 border rounded-xl p-3.5 space-y-3 flex flex-col justify-between ${
                          isMyTeam
                            ? 'border-emerald-500/50 shadow-md shadow-emerald-950/20 ring-1 ring-emerald-500/30'
                            : 'border-slate-800/80'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                                {team.division}
                              </span>
                              {isMyTeam && (
                                <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                  Your Team
                                </span>
                              )}
                            </div>
                            {team.tableNumber ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold">
                                <TableIcon className="w-3 h-3" />
                                {team.tableNumber}
                              </span>
                            ) : null}
                          </div>

                          <h4 className="font-bold text-white text-base">
                            {team.name}
                          </h4>

                          <div className="flex items-center gap-1.5 text-xs text-slate-300">
                            <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>
                              Captain:{' '}
                              <strong className="text-white">
                                {team.captainName || 'TBD'}
                              </strong>
                            </span>
                          </div>
                        </div>

                        {/* All Registered Players */}
                        <div className="pt-2.5 border-t border-slate-800/60 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span className="font-semibold text-slate-300">
                              Registered Players ({squad.length})
                            </span>
                          </div>
                          {squad.length > 0 ? (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {squad.map((p) => {
                                const isCap =
                                  p.name.trim().toLowerCase() ===
                                  (team.captainName || '').trim().toLowerCase();
                                return (
                                  <span
                                    key={p.id}
                                    className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border ${
                                      isCap
                                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 font-semibold'
                                        : 'bg-slate-900 text-slate-300 border-slate-800'
                                    }`}
                                  >
                                    <span>{p.name}</span>
                                    {isCap && (
                                      <span className="text-[9px] text-amber-400 font-bold">
                                        (C)
                                      </span>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-500 italic">
                              No players registered yet.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VIEW 2: ALL TEAMS DIRECTORY GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredTeams.map((team) => {
            const squad = players.filter((p) => p.teamId === team.id && p.active);
            const isMyTeam = isCaptain && team.id === myTeam?.id;
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${team.venue}, ${team.address || 'Brighton'}`
            )}`;

            return (
              <div
                key={team.id}
                className={`bg-slate-900 border rounded-2xl p-4 space-y-3 flex flex-col justify-between transition hover:border-slate-700 ${
                  isMyTeam
                    ? 'border-emerald-500/50 shadow-md shadow-emerald-950/20 ring-1 ring-emerald-500/30'
                    : 'border-slate-800'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                        {team.division}
                      </span>
                      {isMyTeam && (
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          Your Team
                        </span>
                      )}
                    </div>
                    {team.tableNumber && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold">
                        <TableIcon className="w-3 h-3" />
                        {team.tableNumber}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-white text-base leading-tight">
                      {team.name}
                    </h3>
                  </div>

                  <div className="space-y-1 pt-1 text-xs text-slate-300">
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-white">{team.venue}</div>
                        {team.address && (
                          <div className="text-[11px] text-slate-400 leading-snug">
                            {team.address}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1">
                      <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>
                        Captain:{' '}
                        <strong className="text-white">
                          {team.captainName || 'TBD'}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* All Registered Players */}
                <div className="pt-2.5 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 text-[11px]">
                      Registered Squad ({squad.length})
                    </span>
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[11px] font-medium transition"
                    >
                      <span>Map</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  </div>

                  {squad.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {squad.map((p) => {
                        const isCap =
                          p.name.trim().toLowerCase() ===
                          (team.captainName || '').trim().toLowerCase();
                        return (
                          <span
                            key={p.id}
                            className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border ${
                              isCap
                                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 font-semibold'
                                : 'bg-slate-950 text-slate-300 border-slate-800'
                            }`}
                          >
                            <span>{p.name}</span>
                            {isCap && (
                              <span className="text-[9px] text-amber-400 font-bold">
                                (C)
                              </span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">
                      No players registered yet.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

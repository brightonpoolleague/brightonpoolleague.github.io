import React, { useMemo, useState } from 'react';
import {
  Building2,
  ExternalLink,
  Layers,
  MapPin,
  Search,
  Shield,
  Table as TableIcon,
  Users,
} from 'lucide-react';
import { Division, Team } from '../types/league';
import { useLeague } from '../context/LeagueContext';

export const TeamsAndVenuesView: React.FC = () => {
  const { seasonName, divisions, teams, players, session } = useLeague();

  const isCaptain = session.role === 'captain' && Boolean(session.teamId);
  const myTeam = isCaptain ? teams.find((t) => t.id === session.teamId) : null;

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
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

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold whitespace-nowrap shadow-sm">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <strong>{teams.length}</strong> Teams
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold whitespace-nowrap shadow-sm">
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
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
              selectedDivision === 'ALL'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>All Divisions</span>
            <span
              className={`min-w-[1.25rem] h-4 inline-flex items-center justify-center px-1 rounded-full text-[10px] font-bold leading-none ${
                selectedDivision === 'ALL'
                  ? 'bg-emerald-800 text-emerald-100'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {teams.length}
            </span>
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
                  className={`min-w-[1.25rem] h-4 inline-flex items-center justify-center px-1 rounded-full text-[10px] font-bold leading-none ${
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

      {/* Content Area */}
      {filteredTeams.length === 0 ? (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-8 text-center text-sm text-slate-400">
          {searchQuery.trim() ? (
            <p>
              No teams or venues match &ldquo;<strong className="text-white">{searchQuery.trim()}</strong>&rdquo;.
            </p>
          ) : (
            <p>
              No teams registered under{' '}
              {selectedDivision === 'ALL' ? 'all divisions' : selectedDivision}{' '}
              for this season.
            </p>
          )}
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
                <div className="flex flex-wrap items-start justify-between gap-2.5 border-b border-slate-800/80 pb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 min-w-0">
                      <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="truncate">{venueGroup.venue}</span>
                    </h3>
                    {venueGroup.address && (
                      <p className="text-xs text-slate-400 mt-1 pl-6">
                        {venueGroup.address}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {hasMultipleTeams && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs font-medium whitespace-nowrap shadow-sm">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{venueGroup.teams.length} Teams</span>
                      </span>
                    )}
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
                                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 leading-none">
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
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 leading-none">
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

import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Camera,
  Search,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { Division } from '../types/league';
import { useLeague } from '../context/LeagueContext';
import { computePlayerStats } from '../utils/leagueEngine';
import { ExportTableModal } from './ExportTableModal';

export const PlayerStatsView: React.FC = () => {
  const { seasonName, divisions, teams, players, fixtures, session } = useLeague();

  const isCaptain = session.role === 'captain' && Boolean(session.teamId);
  const myTeam = isCaptain ? teams.find((t) => t.id === session.teamId) : null;
  const myTeamDivision = myTeam?.division;

  const [selectedDivision, setSelectedDivision] = useState<Division | 'ALL'>(() => {
    if (myTeamDivision && divisions.includes(myTeamDivision)) {
      return myTeamDivision;
    }
    return divisions[0] || 'Premier League';
  });
  const [activeBoard, setActiveBoard] = useState<'averages' | 'dishes'>(
    'averages'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [includeLive, setIncludeLive] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('bpl_include_live_unapproved') === 'true';
    } catch {
      return false;
    }
  });

  const toggleIncludeLive = () => {
    setIncludeLive((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('bpl_include_live_unapproved', String(next));
          window.dispatchEvent(new CustomEvent('bpl_include_live_unapproved_change'));
        } catch {
          // ignore
        }
      }
      return next;
    });
  };

  useEffect(() => {
    const handleSync = () => {
      try {
        const stored = localStorage.getItem('bpl_include_live_unapproved');
        setIncludeLive(stored === 'true');
      } catch {
        // ignore
      }
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('bpl_include_live_unapproved_change', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('bpl_include_live_unapproved_change', handleSync);
    };
  }, []);

  // Auto-switch to captain's division when visiting or switching captain teams
  useEffect(() => {
    if (myTeamDivision && divisions.includes(myTeamDivision)) {
      setSelectedDivision(myTeamDivision);
    }
  }, [session.teamId, myTeamDivision, divisions]);

  useEffect(() => {
    if (divisions.length > 0 && selectedDivision !== 'ALL' && !divisions.includes(selectedDivision)) {
      setSelectedDivision(divisions[0]);
    }
  }, [divisions, selectedDivision]);

  const [showExportModal, setShowExportModal] = useState(false);

  // Player averages are strictly per division (never across All Divisions)
  const defaultDiv = myTeamDivision && divisions.includes(myTeamDivision)
    ? myTeamDivision
    : divisions[0] || 'Premier League';

  const effectiveDivision =
    activeBoard === 'averages' && selectedDivision === 'ALL'
      ? defaultDiv
      : selectedDivision;

  const { averagesTable, dishTable } = computePlayerStats(
    effectiveDivision,
    teams,
    players,
    fixtures,
    includeLive
  );

  const list = (activeBoard === 'averages' ? averagesTable : dishTable).filter(
    (row) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        row.player.name.toLowerCase().includes(q) ||
        row.team.name.toLowerCase().includes(q)
      );
    }
  );

  return (
    <div className="space-y-5">
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <BarChart3 className="w-3.5 h-3.5" />
              {seasonName} Individual Leaderboards
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5">
              {activeBoard === 'averages'
                ? `${effectiveDivision} Player Stats`
                : `${effectiveDivision === 'ALL' ? 'All Divisions' : effectiveDivision} Dish Leaderboard`}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white text-xs font-bold transition shadow-sm"
              title={
                activeBoard === 'dishes'
                  ? 'Export Dish Leaderboard'
                  : 'Export Player Stats'
              }
            >
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export</span>
            </button>

            <button
              type="button"
              onClick={toggleIncludeLive}
              aria-pressed={includeLive}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-sm ${
                includeLive
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40'
                  : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title={
                includeLive
                  ? 'Currently including live & unapproved matches'
                  : 'Currently showing approved matches only'
              }
            >
              <span
                className={`w-6 h-3.5 rounded-full transition-colors flex items-center p-0.5 ${
                  includeLive ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />
              </span>
              <span>Include Live &amp; Unapproved</span>
            </button>
          </div>
        </div>

        {/* Board Switcher (Averages vs Dish Table) + Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setActiveBoard('averages');
                if (selectedDivision === 'ALL') {
                  setSelectedDivision(defaultDiv);
                }
              }}
              className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                activeBoard === 'averages'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              Player Averages
            </button>
            <button
              type="button"
              onClick={() => setActiveBoard('dishes')}
              className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                activeBoard === 'dishes'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Dish Leaderboard
            </button>
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search player or team..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Division Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {divisions.map((div) => {
            const isSelected = effectiveDivision === div;
            return (
              <button
                key={div}
                type="button"
                onClick={() => setSelectedDivision(div)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  isSelected
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {div}
              </button>
            );
          })}
          {activeBoard === 'dishes' && (
            <button
              type="button"
              onClick={() => setSelectedDivision('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedDivision === 'ALL'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              All Divisions
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {list.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            {searchQuery.trim() ? (
              <p>
                No players match &ldquo;<strong className="text-white">{searchQuery.trim()}</strong>&rdquo;.
              </p>
            ) : (
              <p>
                No player statistics recorded for{' '}
                {selectedDivision === 'ALL' ? 'all divisions' : selectedDivision}{' '}
                yet.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-950/90 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-3 text-center w-10">#</th>
                  <th className="py-3 px-3 text-left">Player &amp; Team</th>
                  <th className="py-3 px-2 text-center" title="Frames Played">
                    P
                  </th>
                  <th className="py-3 px-2 text-center" title="Frames Won">
                    W
                  </th>
                  <th className="py-3 px-2 text-center" title="Frames Lost">
                    L
                  </th>
                  <th className="py-3 px-2.5 text-center" title="Win Percentage">
                    Win %
                  </th>
                  <th
                    className="py-3 px-2.5 text-center font-bold text-emerald-400"
                    title="Dishes (including Reverse Dishes)"
                  >
                    Dishes
                  </th>
                  <th
                    className="py-3 px-3 text-center hidden md:table-cell"
                    title="Cup SF/Final Eligibility (min 4 matches played for team)"
                  >
                    Cup Eligible
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((row, idx) => {
                  const pos = idx + 1;
                  const cupEligible = (row.matchesPlayed ?? 0) >= 4;
                  return (
                    <tr
                      key={row.player.id}
                      className="border-b border-slate-800/70 hover:bg-slate-800/40 transition"
                    >
                      <td className="py-3 px-3 text-center font-bold">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                            pos === 1
                              ? 'bg-amber-500 text-slate-950 font-black'
                              : pos <= 3
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'text-slate-400'
                          }`}
                        >
                          {pos}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">
                          {row.player.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {row.team.name} •{' '}
                          <span className="text-emerald-400">
                            {row.division}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center tabular-nums text-slate-300">
                        {row.played}
                      </td>
                      <td className="py-3 px-2 text-center tabular-nums font-bold text-emerald-400">
                        {row.won}
                      </td>
                      <td className="py-3 px-2 text-center tabular-nums text-slate-400">
                        {row.lost}
                      </td>
                      <td className="py-3 px-2.5 text-center tabular-nums font-semibold text-white">
                        {row.winPercentage.toFixed(1)}%
                      </td>
                      <td className="py-3 px-2.5 text-center tabular-nums font-black text-emerald-300 bg-slate-950/40">
                        {row.dishes}
                      </td>
                      <td className="py-3 px-3 text-center hidden md:table-cell">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            cupEligible
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                          title={`${row.matchesPlayed ?? 0} match${
                            (row.matchesPlayed ?? 0) === 1 ? '' : 'es'
                          } played for ${row.team.name} this season (minimum 4 required for Cup SF/Final)`}
                        >
                          {cupEligible
                            ? '✓ Yes (4+)'
                            : `${row.matchesPlayed ?? 0}/4 matches`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Export Table Image Modal */}
      <ExportTableModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        modalTitle={
          activeBoard === 'dishes'
            ? 'Export Dish Leaderboard'
            : 'Export Player Stats'
        }
        title={activeBoard === 'dishes' ? 'Dish Leaderboard' : 'Player Stats'}
        divisionName={
          activeBoard === 'dishes' && effectiveDivision === 'ALL'
            ? undefined
            : effectiveDivision
        }
        seasonName={seasonName}
        badgeText={
          activeBoard === 'dishes' && effectiveDivision === 'ALL'
            ? 'All Divisions'
            : includeLive
            ? 'Live Standings'
            : 'Approved Only'
        }
        columns={
          activeBoard === 'dishes'
            ? [
                { header: 'Player & Team', align: 'left' },
                { header: 'P', align: 'center' },
                { header: 'W', align: 'center' },
                { header: 'L', align: 'center' },
                { header: 'Win %', align: 'center' },
                { header: 'Dishes', align: 'center' },
              ]
            : [
                { header: 'Player & Team', align: 'left' },
                { header: 'P', align: 'center' },
                { header: 'W', align: 'center' },
                { header: 'L', align: 'center' },
                { header: 'Dishes', align: 'center' },
                { header: 'Win %', align: 'center' },
              ]
        }
        rows={list.map((r, i) => ({
          rank: i + 1,
          primaryText: r.player.name,
          secondaryText: `${r.team.name} (${r.team.division})`,
          values:
            activeBoard === 'dishes'
              ? [
                  r.played,
                  r.won,
                  r.lost,
                  `${r.winPercentage.toFixed(1)}%`,
                  r.dishes,
                ]
              : [
                  r.played,
                  r.won,
                  r.lost,
                  r.dishes,
                  `${r.winPercentage.toFixed(1)}%`,
                ],
        }))}
        fileBaseName={`${seasonName}-${effectiveDivision}-${activeBoard}`}
      />
    </div>
  );
};

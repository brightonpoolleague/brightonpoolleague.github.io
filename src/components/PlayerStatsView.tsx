import React, { useState } from 'react';
import { BarChart3, Search, ShieldCheck, Sparkles, Trophy } from 'lucide-react';
import { Division } from '../types/league';
import { useLeague } from '../context/LeagueContext';
import { computePlayerStats } from '../utils/leagueEngine';

export const PlayerStatsView: React.FC = () => {
  const { seasonName, divisions, teams, players, fixtures } = useLeague();
  const [selectedDivision, setSelectedDivision] = useState<Division | 'ALL'>(
    'ALL'
  );
  const [activeBoard, setActiveBoard] = useState<'averages' | 'dishes'>(
    'averages'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [includeLive, setIncludeLive] = useState(true);

  const { averagesTable, dishTable } = computePlayerStats(
    selectedDivision,
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
              Player Averages &amp; Dish Table
            </h1>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setIncludeLive(true)}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                includeLive
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Include Live
            </button>
            <button
              type="button"
              onClick={() => setIncludeLive(false)}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition ${
                !includeLive
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Approved Only
            </button>
          </div>
        </div>

        {/* Board Switcher (Averages vs Dish Table) + Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveBoard('averages')}
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
          {divisions.map((div) => (
            <button
              key={div}
              type="button"
              onClick={() => setSelectedDivision(div)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedDivision === div
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {div}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {list.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            No player statistics recorded for this filter yet.
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
                    title="Cup SF/Final Eligibility (min 4 games played)"
                  >
                    Cup Eligible
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((row, idx) => {
                  const pos = idx + 1;
                  const cupEligible = row.played >= 4;
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
                        >
                          {cupEligible ? '✓ Yes (4+)' : `${row.played}/4 gms`}
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
    </div>
  );
};

import React, { useState } from 'react';
import { Award, Info, ShieldCheck, Trophy } from 'lucide-react';
import { Division, DIVISIONS } from '../types/league';
import { useLeague } from '../context/LeagueContext';
import { computeLeagueTable } from '../utils/leagueEngine';

export const LeagueTableView: React.FC = () => {
  const { seasonName, teams, fixtures } = useLeague();
  const [selectedDivision, setSelectedDivision] =
    useState<Division>('Premier League');
  const [includeLive, setIncludeLive] = useState<boolean>(true);

  const rows = computeLeagueTable(
    selectedDivision,
    teams,
    fixtures,
    includeLive
  );

  return (
    <div className="space-y-5">
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <Trophy className="w-3.5 h-3.5" />
              {seasonName} Standings
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5">
              League Tables
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
              Live Standings
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

        {/* Division Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {DIVISIONS.map((div) => {
            const count = teams.filter((t) => t.division === div).length;
            return (
              <button
                key={div}
                type="button"
                onClick={() => setSelectedDivision(div)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-2 ${
                  selectedDivision === div
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span>{div}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] ${
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
      </div>

      {/* Table Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            No teams registered in <strong>{selectedDivision}</strong> yet.
            League Admins can add teams in the Admin tab.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-950/90 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-3 text-center w-10">#</th>
                  <th className="py-3 px-3 text-left">Team &amp; Venue</th>
                  <th className="py-3 px-2.5 text-center" title="Matches Played">
                    P
                  </th>
                  <th className="py-3 px-2.5 text-center" title="Matches Won">
                    W
                  </th>
                  <th className="py-3 px-2.5 text-center" title="Matches Lost">
                    L
                  </th>
                  <th
                    className="py-3 px-2.5 text-center hidden sm:table-cell"
                    title="Frames Won"
                  >
                    FF
                  </th>
                  <th
                    className="py-3 px-2.5 text-center hidden sm:table-cell"
                    title="Frames Lost"
                  >
                    FA
                  </th>
                  <th
                    className="py-3 px-2.5 text-center"
                    title="Frame Difference"
                  >
                    FD
                  </th>
                  <th
                    className="py-3 px-3 text-center font-black text-emerald-400"
                    title="Total Points"
                  >
                    PTS
                  </th>
                  <th className="py-3 px-3 text-center hidden md:table-cell">
                    Form
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const pos = idx + 1;
                  const isTopTwo = pos <= 2;
                  return (
                    <tr
                      key={row.team.id}
                      className={`border-b border-slate-800/70 hover:bg-slate-800/40 transition ${
                        pos === 1 ? 'bg-emerald-950/20' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center font-bold">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                            pos === 1
                              ? 'bg-amber-500 text-slate-950 font-black'
                              : isTopTwo
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'text-slate-400'
                          }`}
                        >
                          {pos}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          {row.team.name}
                          {pos === 1 && (
                            <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[200px] sm:max-w-xs">
                          {row.team.venue}
                        </div>
                      </td>
                      <td className="py-3 px-2.5 text-center tabular-nums text-slate-300">
                        {row.played}
                      </td>
                      <td className="py-3 px-2.5 text-center tabular-nums text-emerald-400 font-semibold">
                        {row.won}
                      </td>
                      <td className="py-3 px-2.5 text-center tabular-nums text-slate-400">
                        {row.lost}
                      </td>
                      <td className="py-3 px-2.5 text-center tabular-nums text-slate-300 hidden sm:table-cell">
                        {row.framesFor}
                      </td>
                      <td className="py-3 px-2.5 text-center tabular-nums text-slate-400 hidden sm:table-cell">
                        {row.framesAgainst}
                      </td>
                      <td
                        className={`py-3 px-2.5 text-center tabular-nums font-semibold ${
                          row.frameDiff > 0
                            ? 'text-emerald-400'
                            : row.frameDiff < 0
                            ? 'text-red-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {row.frameDiff > 0
                          ? `+${row.frameDiff}`
                          : row.frameDiff}
                      </td>
                      <td className="py-3 px-3 text-center tabular-nums font-black text-base text-white bg-slate-950/40">
                        {row.points}
                      </td>
                      <td className="py-3 px-3 text-center hidden md:table-cell">
                        <div className="inline-flex items-center gap-1">
                          {row.form.slice(-5).map((res, i) => (
                            <span
                              key={i}
                              className={`w-5 h-5 rounded text-[10px] font-black flex items-center justify-center ${
                                res === 'W'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
                              }`}
                            >
                              {res}
                            </span>
                          ))}
                          {row.form.length === 0 && (
                            <span className="text-slate-600 text-xs">–</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Points & Tie-Break Rules Box */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 space-y-1.5">
        <div className="font-bold text-slate-200 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-emerald-400" />
          Official League Points &amp; Sorting Rules (Section 2 &amp; Section 8a)
        </div>
        <p>
          • <strong>Points:</strong> 2 points for a match win + 1 point for every
          3 frames won (maximum 7 points per match: 15–0 = 7–0, 12–3 = 6–1, 9–6 =
          5–2, 8–7 = 4–2).
        </p>
        <p>
          • <strong>Sorting &amp; Tie-Breakers:</strong> 1) Total Points → 2)
          Frame Difference (FF - FA) → 3) Head-to-Head Record (Points, then Frame
          Diff) → 4) Record against the highest-placed team in the division.
        </p>
      </div>
    </div>
  );
};

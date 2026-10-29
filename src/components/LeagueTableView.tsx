import React, { useEffect, useRef, useState } from 'react';
import { Award, Camera, Info, Sparkles, Trophy } from 'lucide-react';
import { Division } from '../types/league';
import { useLeague } from '../context/LeagueContext';
import { computeLeagueTable, getOrdinalSuffix } from '../utils/leagueEngine';
import { ExportTableModal } from './ExportTableModal';

export const LeagueTableView: React.FC = () => {
  const { seasonName, divisions, teams, fixtures, session } = useLeague();

  const isCaptain = session.role === 'captain' && Boolean(session.teamId);
  const myTeam = isCaptain ? teams.find((t) => t.id === session.teamId) : null;
  const myTeamDivision = myTeam?.division;

  const [selectedDivision, setSelectedDivision] = useState<Division>(() => {
    if (myTeamDivision && divisions.includes(myTeamDivision)) {
      return myTeamDivision;
    }
    return divisions[0] || 'Premier League';
  });
  const [includeLive, setIncludeLive] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);

  const myTeamRowRef = useRef<HTMLTableRowElement | null>(null);

  // Auto-switch to captain's division when visiting or switching captain teams
  useEffect(() => {
    if (myTeamDivision && divisions.includes(myTeamDivision)) {
      setSelectedDivision(myTeamDivision);
    }
  }, [session.teamId, myTeamDivision, divisions]);

  useEffect(() => {
    if (divisions.length > 0 && !divisions.includes(selectedDivision)) {
      setSelectedDivision(divisions[0]);
    }
  }, [divisions, selectedDivision]);

  const rows = computeLeagueTable(
    selectedDivision,
    teams,
    fixtures,
    includeLive
  );

  const myRowIndex = rows.findIndex((r) => r.team.id === session.teamId);
  const myTeamRow = myRowIndex !== -1 ? rows[myRowIndex] : null;
  const myTeamPos = myRowIndex !== -1 ? myRowIndex + 1 : null;

  // Auto-scroll to captain's team row when on the matching division table
  useEffect(() => {
    if (myTeam && selectedDivision === myTeamDivision && myTeamRowRef.current) {
      const timer = setTimeout(() => {
        myTeamRowRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [selectedDivision, myTeamDivision, myTeam?.id]);

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

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white text-xs font-bold transition shadow-sm"
              title="Export League Table"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export</span>
            </button>

            <button
              type="button"
              onClick={() => setIncludeLive((prev) => !prev)}
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
              <span>Include Live &amp; Unapproved Matches</span>
            </button>
          </div>
        </div>

        {/* Division Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {divisions.map((div) => {
            const count = teams.filter((t) => t.division === div).length;
            const isMyDiv = isCaptain && myTeamDivision === div;
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
                <div className="flex items-center gap-1.5">
                  {isMyDiv && (
                    <span
                      className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"
                      title="Your Team's Division"
                    />
                  )}
                  <span>{div}</span>
                </div>
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

      {/* Team Captain Spotlight: Standing Banner */}
      {isCaptain && myTeam && myTeamRow && myTeamPos && selectedDivision === myTeamDivision && (
        <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border-2 border-emerald-500/50 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex flex-col items-center justify-center text-emerald-300 shrink-0 shadow-inner">
              <span className="text-[10px] font-bold uppercase leading-none text-emerald-400">Pos</span>
              <span className="text-base font-black leading-none mt-0.5">#{myTeamPos}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white font-extrabold text-sm sm:text-base line-clamp-2 leading-snug">
                  {myTeam.name}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-400/50 shadow-[0_0_8px_rgba(52,211,153,0.3)] animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Your Team
                </span>
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                Currently <strong className="text-emerald-400">{myTeamPos}{getOrdinalSuffix(myTeamPos)}</strong> in {selectedDivision} • <strong className="text-white">{myTeamRow.points} pts</strong> ({myTeamRow.won}W - {myTeamRow.lost}L • {myTeamRow.frameDiff > 0 ? `+${myTeamRow.frameDiff}` : myTeamRow.frameDiff} FD)
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              myTeamRowRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
              });
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-xs font-bold border border-emerald-500/40 transition shadow-sm shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Highlight in Table</span>
          </button>
        </div>
      )}

      {/* Switch back to Captain's own division notice if viewing other divisions */}
      {isCaptain && myTeam && myTeamDivision && selectedDivision !== myTeamDivision && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 text-xs shadow-md">
          <div className="flex items-center gap-2 text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              Your team <strong className="text-white">{myTeam.name}</strong> plays in <strong className="text-emerald-400">{myTeamDivision}</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedDivision(myTeamDivision)}
            className="px-3 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition shrink-0"
          >
            View {myTeamDivision} Table
          </button>
        </div>
      )}

      {/* Table Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            No teams registered in <strong>{selectedDivision}</strong> yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-950/90 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-2 sm:py-3 sm:px-3 text-center w-8 sm:w-10">#</th>
                  <th className="py-2.5 px-2 sm:py-3 sm:px-3 text-left">Team &amp; Venue</th>
                  <th className="py-2.5 px-1.5 sm:py-3 sm:px-2.5 text-center" title="Matches Played">
                    P
                  </th>
                  <th className="py-2.5 px-1.5 sm:py-3 sm:px-2.5 text-center" title="Matches Won">
                    W
                  </th>
                  <th className="py-2.5 px-1.5 sm:py-3 sm:px-2.5 text-center" title="Matches Lost">
                    L
                  </th>
                  <th
                    className="py-2.5 px-1.5 sm:py-3 sm:px-2.5 text-center hidden sm:table-cell"
                    title="Frames Won"
                  >
                    FF
                  </th>
                  <th
                    className="py-2.5 px-1.5 sm:py-3 sm:px-2.5 text-center hidden sm:table-cell"
                    title="Frames Lost"
                  >
                    FA
                  </th>
                  <th
                    className="py-2.5 px-1.5 sm:py-3 sm:px-2.5 text-center"
                    title="Frame Difference"
                  >
                    FD
                  </th>
                  <th
                    className="py-2.5 px-2 sm:py-3 sm:px-3 text-center font-black text-emerald-400"
                    title="Total Points"
                  >
                    PTS
                  </th>
                  <th className="py-2.5 px-2 sm:py-3 sm:px-3 text-center hidden md:table-cell">
                    Form
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const pos = idx + 1;
                  const isTopTwo = pos <= 2;
                  const isMyTeam = isCaptain && row.team.id === session.teamId;

                  return (
                    <tr
                      key={row.team.id}
                      ref={isMyTeam ? myTeamRowRef : null}
                      className={`border-b border-slate-800/70 transition ${
                        isMyTeam
                          ? 'bg-gradient-to-r from-emerald-950/80 via-emerald-900/40 to-slate-900 border-l-4 border-l-emerald-400 border-y border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.18)] relative'
                          : pos === 1
                          ? 'bg-emerald-950/20 hover:bg-slate-800/40'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-2.5 px-2 sm:py-3 sm:px-3 text-center font-bold">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                            isMyTeam
                              ? 'bg-emerald-500 text-slate-950 font-black ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900 shadow-[0_0_12px_rgba(16,185,129,0.6)] animate-pulse'
                              : pos === 1
                              ? 'bg-amber-500 text-slate-950 font-black'
                              : isTopTwo
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'text-slate-400'
                          }`}
                        >
                          {pos}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 sm:py-3 sm:px-3 min-w-[125px] sm:min-w-0">
                        <div className="font-bold text-white flex items-center gap-1.5 leading-snug">
                          <span className={isMyTeam ? 'text-emerald-200 font-black' : ''}>
                            {row.team.name}
                          </span>
                          {pos === 1 && (
                            <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          {isMyTeam && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-400/50 shadow-[0_0_8px_rgba(52,211,153,0.3)] animate-pulse shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                              Your Team
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400 line-clamp-1 max-w-[150px] sm:max-w-xs">
                            {row.team.venue}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-1.5 sm:py-3 sm:px-2.5 text-center tabular-nums text-slate-300">
                        {row.played}
                      </td>
                      <td className="py-2.5 px-1.5 sm:py-3 sm:px-2.5 text-center tabular-nums text-emerald-400 font-semibold">
                        {row.won}
                      </td>
                      <td className="py-2.5 px-1.5 sm:py-3 sm:px-2.5 text-center tabular-nums text-slate-400">
                        {row.lost}
                      </td>
                      <td className="py-2.5 px-1.5 sm:py-3 sm:px-2.5 text-center tabular-nums text-slate-300 hidden sm:table-cell">
                        {row.framesFor}
                      </td>
                      <td className="py-2.5 px-1.5 sm:py-3 sm:px-2.5 text-center tabular-nums text-slate-400 hidden sm:table-cell">
                        {row.framesAgainst}
                      </td>
                      <td
                        className={`py-2.5 px-1.5 sm:py-3 sm:px-2.5 text-center tabular-nums font-semibold ${
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
                      <td
                        className={`py-2.5 px-2 sm:py-3 sm:px-3 text-center tabular-nums font-black text-base ${
                          isMyTeam
                            ? 'text-emerald-300 bg-emerald-950/60 font-black'
                            : 'text-white bg-slate-950/40'
                        }`}
                      >
                        {row.points}
                      </td>
                      <td className="py-2.5 px-2 sm:py-3 sm:px-3 text-center hidden md:table-cell">
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
      {/* Export Table Image Modal */}
      <ExportTableModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        modalTitle="Export League Table"
        title="League Table"
        divisionName={selectedDivision}
        seasonName={seasonName}
        badgeText={includeLive ? 'Live Standings' : 'Approved Standings'}
        columns={[
          { header: 'Team & Venue', align: 'left' },
          { header: 'P', align: 'center' },
          { header: 'W', align: 'center' },
          { header: 'L', align: 'center' },
          { header: 'FF', align: 'center' },
          { header: 'FA', align: 'center' },
          { header: 'FD', align: 'center' },
          { header: 'PTS', align: 'center' },
        ]}
        rows={rows.map((r, i) => ({
          rank: i + 1,
          primaryText: r.team.name,
          secondaryText:
            r.team.venue +
            (r.team.tableNumber
              ? r.team.tableNumber.toLowerCase().startsWith('table')
                ? ` (${r.team.tableNumber})`
                : ` (Table ${r.team.tableNumber})`
              : ''),
          values: [
            r.played,
            r.won,
            r.lost,
            r.framesFor,
            r.framesAgainst,
            r.frameDiff > 0 ? `+${r.frameDiff}` : r.frameDiff,
            r.points,
          ],
        }))}
        fileBaseName={`${seasonName}-${selectedDivision}-league-table`}
      />
    </div>
  );
};

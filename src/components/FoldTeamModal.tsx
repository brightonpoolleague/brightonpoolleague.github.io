import React, { useMemo, useRef, useState } from 'react';
import { AlertTriangle, Calendar, Info, X } from 'lucide-react';
import { Fixture, Team } from '../types/league';
import {
  formatMatchDate,
  getSeasonHalfwayDate,
  isKnockoutFixture,
} from '../utils/leagueEngine';

interface FoldTeamModalProps {
  team: Team;
  fixtures: Fixture[];
  teams: Team[];
  onClose: () => void;
  onConfirmFold: (teamId: string, foldDate: string) => Promise<void>;
}

export const FoldTeamModal: React.FC<FoldTeamModalProps> = ({
  team,
  fixtures,
  teams,
  onClose,
  onConfirmFold,
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [foldDate, setFoldDate] = useState<string>(todayStr);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const teamsById = useMemo(() => {
    const map = new Map<string, Team>();
    teams.forEach((t) => map.set(t.id, t));
    return map;
  }, [teams]);

  const divFixtures = useMemo(
    () => fixtures.filter((f) => f.division === team.division && !isKnockoutFixture(f)),
    [fixtures, team.division]
  );

  const halfwayInfo = useMemo(
    () => getSeasonHalfwayDate(divFixtures, foldDate),
    [divFixtures, foldDate]
  );

  const { halfwayDate } = halfwayInfo;
  const isFirstHalf = !halfwayDate || foldDate <= halfwayDate;

  // Filter fixtures involving this team
  const teamFixtures = useMemo(
    () =>
      fixtures
        .filter(
          (f) =>
            (f.homeTeamId === team.id || f.awayTeamId === team.id) &&
            !isKnockoutFixture(f)
        )
        .sort((a, b) => a.matchDate.localeCompare(b.matchDate)),
    [fixtures, team.id]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foldDate) return;
    setIsSubmitting(true);
    try {
      await onConfirmFold(team.id, foldDate);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenPicker = () => {
    try {
      dateInputRef.current?.showPicker?.();
    } catch {
      dateInputRef.current?.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-4 sm:p-5 shadow-2xl space-y-3.5 my-auto max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                League Rule 7 • Fold Team
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white leading-snug">
                Fold {team.name}
              </h2>
              <p className="text-xs text-slate-400">
                {team.division} • {team.venue}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Rule 7 Explanation Banner */}
        <div
          className={`p-2.5 sm:p-3 rounded-xl border text-xs space-y-1 shrink-0 ${
            isFirstHalf
              ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
              : 'bg-sky-950/40 border-sky-500/40 text-sky-200'
          }`}
        >
          <div className="flex items-center gap-1.5 font-bold">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>
              {isFirstHalf
                ? 'Rule 7a Applies: First Half Fold'
                : 'Rule 7b Applies: Second Half Fold'}
            </span>
          </div>
          <p className="leading-relaxed text-[11px] sm:text-xs">
            {isFirstHalf ? (
              <>
                Because this team folded in the first half of the season (on or before{' '}
                <strong className="text-white">
                  {halfwayDate ? formatMatchDate(halfwayDate) : 'halfway date'}
                </strong>
                ), <strong className="underline">all results will be expunged</strong>.
                Frames, points and form will be removed from the league table and player stats.
              </>
            ) : (
              <>
                Because this team folded in the second half of the season (after{' '}
                <strong className="text-white">
                  {halfwayDate ? formatMatchDate(halfwayDate) : 'halfway date'}
                </strong>
                ), <strong className="underline">first-half results will stand</strong> and{' '}
                <strong className="underline">all second-half results will be expunged</strong>.
              </>
            )}
          </p>
        </div>

        {/* Fold Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 space-y-3">
          {/* Date Picker Input */}
          <div className="shrink-0">
            <label htmlFor="fold-date-input" className="block text-xs font-bold text-slate-300 mb-1">
              Date Team Folded / Withdrew
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={handleOpenPicker}
                aria-label="Open Calendar"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-emerald-400 transition"
                title="Open Calendar"
              >
                <Calendar className="w-4 h-4 text-emerald-400" />
              </button>
              <input
                ref={dateInputRef}
                id="fold-date-input"
                type="date"
                required
                value={foldDate}
                onChange={(e) => setFoldDate(e.target.value)}
                onClick={handleOpenPicker}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white [color-scheme:dark] cursor-pointer transition shadow-sm"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-1 pt-1 text-[11px]">
              <span className="text-emerald-400 font-semibold truncate">
                Selected: {formatMatchDate(foldDate)}
              </span>
              <div className="flex items-center gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => setFoldDate(todayStr)}
                  className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Today
                </button>
                {halfwayDate && (
                  <button
                    type="button"
                    onClick={() => setFoldDate(halfwayDate)}
                    className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title={`Set date to division halfway date (${formatMatchDate(halfwayDate)})`}
                  >
                    Halfway Date
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Fixtures Impact Preview */}
          <div className="flex-1 flex flex-col min-h-0 space-y-1.5">
            <div className="flex items-center justify-between text-xs shrink-0">
              <span className="font-bold text-slate-300">
                Fixtures Impact Preview ({teamFixtures.length})
              </span>
              <span className="text-[11px] text-slate-500">
                Case-by-case review (Rule 7c)
              </span>
            </div>

            <div className="flex-1 max-h-36 sm:max-h-40 overflow-y-auto space-y-1.5 pr-1 border border-slate-800 rounded-xl p-2 bg-slate-950/60">
              {teamFixtures.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-2">
                  No fixtures scheduled for this team.
                </p>
              ) : (
                teamFixtures.map((fix) => {
                  const isHome = fix.homeTeamId === team.id;
                  const opponentId = isHome ? fix.awayTeamId : fix.homeTeamId;
                  const opponent = teamsById.get(opponentId);
                  const hasResult =
                    fix.status === 'approved' ||
                    fix.status === 'submitted' ||
                    fix.frames.some((f) => f.winner !== null);
                  const isMatchFirstHalf =
                    halfwayDate && fix.matchDate && fix.matchDate <= halfwayDate;
                  const willExpunge = hasResult && (isFirstHalf || !isMatchFirstHalf);

                  return (
                    <div
                      key={fix.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800/80 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-white truncate">
                          {isHome ? 'Home vs ' : 'Away vs '}
                          {opponent?.name || 'Unknown'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {formatMatchDate(fix.matchDate)} • {fix.status}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          !hasResult
                            ? 'bg-slate-800 text-slate-400 border border-slate-700'
                            : willExpunge
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-600/50'
                            : 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/50'
                        }`}
                      >
                        {!hasResult
                          ? 'Cancelled (Unplayed)'
                          : willExpunge
                          ? isFirstHalf
                            ? 'Result Expunged (Rule 7a)'
                            : 'Result Expunged (Rule 7b)'
                          : 'Result Stands (First Half)'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-amber-950/30"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {isSubmitting ? 'Folding Team...' : 'Confirm Fold & Expunge'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

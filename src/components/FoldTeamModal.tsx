import React, { useMemo, useState } from 'react';
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
  onConfirmFold: (teamId: string, foldDate: string, reason?: string) => Promise<void>;
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
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      await onConfirmFold(team.id, foldDate, reason.trim() || undefined);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-5 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                League Rule 7 • Fold Team
              </span>
              <h2 className="text-lg font-bold text-white leading-snug">
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
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Rule 7 Explanation Banner */}
        <div
          className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
            isFirstHalf
              ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
              : 'bg-sky-950/40 border-sky-500/40 text-sky-200'
          }`}
        >
          <div className="flex items-center gap-1.5 font-bold">
            <Info className="w-4 h-4 shrink-0" />
            <span>
              {isFirstHalf
                ? 'Rule 7a Applies: First Half Fold'
                : 'Rule 7b Applies: Second Half Fold'}
            </span>
          </div>
          <p className="leading-relaxed">
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="fold-date-input" className="block text-xs font-bold text-slate-300 mb-1">
              Date Team Folded / Withdrew
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="fold-date-input"
                type="date"
                required
                value={foldDate}
                onChange={(e) => setFoldDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
            {halfwayDate && (
              <p className="text-[11px] text-slate-500 mt-1">
                Division halfway point:{' '}
                <strong className="text-slate-400">
                  {formatMatchDate(halfwayDate)}
                </strong>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Reason for Withdrawal (Optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Venue closure, player shortage, withdrawn by captain"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Fixtures Impact Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">
                Fixtures Impact Preview ({teamFixtures.length})
              </span>
              <span className="text-[11px] text-slate-500">
                Case-by-case review (Rule 7c)
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-slate-800 rounded-xl p-2 bg-slate-950/60">
              {teamFixtures.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-2">
                  No fixtures scheduled for this team.
                </p>
              ) : (
                teamFixtures.map((fix) => {
                  const isHome = fix.homeTeamId === team.id;
                  const opponentId = isHome ? fix.awayTeamId : fix.homeTeamId;
                  const opponent = teamsById.get(opponentId);
                  const isMatchFirstHalf =
                    halfwayDate && fix.matchDate && fix.matchDate <= halfwayDate;
                  const willExpunge = isFirstHalf || !isMatchFirstHalf;

                  return (
                    <div
                      key={fix.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800/80 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-white truncate">
                          {isHome ? 'vs' : '@'} {opponent?.name || 'Unknown'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {formatMatchDate(fix.matchDate)} • {fix.status}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          willExpunge
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-600/50'
                            : 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/50'
                        }`}
                      >
                        {willExpunge
                          ? isFirstHalf
                            ? 'Expunged (Rule 7a)'
                            : 'Expunged (Rule 7b)'
                          : 'Stands (First Half)'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-amber-950/30"
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

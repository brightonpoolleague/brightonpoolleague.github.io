import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Sparkles,
  Trophy,
  User,
  X,
} from 'lucide-react';
import { PlayerStatsRow } from '../types/league';
import {
  formatMatchDate,
  PlayerFrameHistoryItem,
} from '../utils/leagueEngine';

interface PlayerStatsDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  statsRow: PlayerStatsRow | null;
  rank?: number;
  frames: PlayerFrameHistoryItem[];
}

export const PlayerStatsDetailModal: React.FC<PlayerStatsDetailModalProps> = ({
  isOpen,
  onClose,
  statsRow,
  rank,
  frames,
}) => {
  const [filter, setFilter] = useState<'all' | 'won' | 'lost' | 'dishes'>('all');

  useEffect(() => {
    setFilter('all');
  }, [statsRow?.player.id, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !statsRow) return null;

  const filteredFrames = frames.filter((f) => {
    if (filter === 'won') return f.result === 'win';
    if (filter === 'lost') return f.result === 'loss';
    if (filter === 'dishes') return f.dish;
    return true;
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="player-stats-modal-title"
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              {rank === 1 ? (
                <Trophy className="w-5 h-5 text-amber-400" />
              ) : (
                <User className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="player-stats-modal-title"
                  className="text-lg sm:text-xl font-black text-white truncate"
                >
                  {statsRow.player.name}
                </h2>
                {rank !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      rank === 1
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : rank <= 3
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    #{rank}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 mt-0.5 truncate">
                <span className="font-semibold text-slate-200">
                  {statsRow.team.name}
                </span>
                {statsRow.formerTeams && statsRow.formerTeams.length > 0 && (
                  <span className="text-slate-500">
                    {' '}
                    (ex-{statsRow.formerTeams.map((t) => t.name).join(', ')})
                  </span>
                )}{' '}
                •{' '}
                <span className="text-emerald-400 font-medium">
                  {statsRow.division}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close player stats modal"
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary Stat Cards */}
        <div className="p-3.5 sm:p-5 border-b border-slate-800/80 space-y-3 bg-slate-900/60">
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-1.5 py-2 sm:p-2.5 text-center min-w-0">
              <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
                Played
              </div>
              <div className="text-xs sm:text-lg font-black text-white tabular-nums mt-0.5">
                {statsRow.played}
              </div>
            </div>
            <div className="bg-slate-950/80 border border-emerald-500/20 rounded-xl px-1.5 py-2 sm:p-2.5 text-center min-w-0">
              <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-400 truncate">
                Won
              </div>
              <div className="text-xs sm:text-lg font-black text-emerald-400 tabular-nums mt-0.5">
                {statsRow.won}
              </div>
            </div>
            <div className="bg-slate-950/80 border border-rose-500/20 rounded-xl px-1.5 py-2 sm:p-2.5 text-center min-w-0">
              <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-rose-400 truncate">
                Lost
              </div>
              <div className="text-xs sm:text-lg font-black text-rose-300 tabular-nums mt-0.5">
                {statsRow.lost}
              </div>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-1 py-2 sm:p-2.5 text-center min-w-0">
              <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
                Win %
              </div>
              <div className="text-xs sm:text-lg font-black text-white tabular-nums mt-0.5 whitespace-nowrap">
                {statsRow.winPercentage.toFixed(1)}%
              </div>
            </div>
            <div className="bg-slate-950/80 border border-amber-500/20 rounded-xl px-1.5 py-2 sm:p-2.5 text-center min-w-0">
              <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-400 truncate">
                Dishes
              </div>
              <div className="text-xs sm:text-lg font-black text-amber-300 tabular-nums mt-0.5">
                {statsRow.dishes}
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {(
              [
                { id: 'all', label: `All Frames (${frames.length})` },
                { id: 'won', label: `Won (${statsRow.won})` },
                { id: 'lost', label: `Lost (${statsRow.lost})` },
                { id: 'dishes', label: `Dishes (${statsRow.dishes})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  filter === tab.id
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Frame History List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
          {filteredFrames.length === 0 ? (
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-6 text-center text-xs text-slate-400">
              No frames match this filter.
            </div>
          ) : (
            filteredFrames.map((item, idx) => (
              <div
                key={`${item.fixtureId}-${item.frameNumber}-${idx}`}
                className="bg-slate-950/70 border border-slate-800/80 hover:border-slate-700/80 rounded-xl p-3 sm:p-3.5 flex items-center gap-3 transition"
              >
                <span
                  className={`w-12 py-1 rounded-lg font-black text-[11px] text-center uppercase tracking-wider shrink-0 border ${
                    item.result === 'win'
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  }`}
                >
                  {item.result === 'win' ? 'Won' : 'Lost'}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs sm:text-sm font-bold text-white truncate">
                      vs {item.opponentName}
                    </div>
                    {(item.dish || item.opponentDish) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold shrink-0">
                        <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                        <span>Dish</span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-300 font-medium truncate mt-0.5">
                    {item.opponentTeamName}
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
                      {formatMatchDate(item.matchDate)}
                    </span>
                    <span>•</span>
                    <span>
                      Set {item.setNumber}, Frame #{item.frameNumber}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

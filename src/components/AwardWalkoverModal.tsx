import React, { useState, useMemo } from 'react';
import {
  Award,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  X,
  Users,
} from 'lucide-react';
import {
  Fixture,
  Player,
  SlotPlayerId,
  Team,
} from '../types/league';
import {
  awardWalkoverToFixture,
  formatMatchDate,
} from '../utils/leagueEngine';

export interface AwardWalkoverModalProps {
  fixture: Fixture;
  isOpen: boolean;
  onClose: () => void;
  onConfirmWalkover: (updatedFixture: Fixture) => Promise<void>;
  teamsById: Record<string, Team>;
  players: Player[];
}

export const AwardWalkoverModal: React.FC<AwardWalkoverModalProps> = ({
  fixture,
  isOpen,
  onClose,
  onConfirmWalkover,
  teamsById,
  players,
}) => {
  const [winningSide, setWinningSide] = useState<'home' | 'away'>('home');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showAdvancedSets, setShowAdvancedSets] = useState<boolean>(false);

  // Set 1 player selections (slots 1..5)
  const [set1Slots, setSet1Slots] = useState<[SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId]>([
    null,
    null,
    null,
    null,
    null,
  ]);

  // Set 2 & Set 3 player selections (initialized from Set 1, or custom overrides)
  const [set2Custom, setSet2Custom] = useState<[SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId] | null>(null);
  const [set3Custom, setSet3Custom] = useState<[SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId] | null>(null);

  const homeTeam = teamsById[fixture.homeTeamId];
  const awayTeam = teamsById[fixture.awayTeamId];

  const winningTeam = winningSide === 'home' ? homeTeam : awayTeam;
  const defaultingTeam = winningSide === 'home' ? awayTeam : homeTeam;

  // Registered active players for the winning team
  const winningSquad = useMemo(() => {
    if (!winningTeam) return [];
    return players
      .filter((p) => p.teamId === winningTeam.id && p.active)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [players, winningTeam]);

  // Derive Set 2 and Set 3 from custom overrides or auto-fill from Set 1
  const effectiveSet2 = useMemo(() => {
    if (set2Custom) return set2Custom;
    return [...set1Slots] as [SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId];
  }, [set2Custom, set1Slots]);

  const effectiveSet3 = useMemo(() => {
    if (set3Custom) return set3Custom;
    return [...set1Slots] as [SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId];
  }, [set3Custom, set1Slots]);

  // When admin updates a slot in Set 1:
  // If custom sets are not explicitly detached, it auto-fills the corresponding slot in Set 2 and Set 3
  const handleSet1Change = (slotIdx: number, playerId: string) => {
    const val: SlotPlayerId = playerId === '' ? null : playerId;
    const next1: [SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId] = [...set1Slots];

    // Disallow selecting the same player twice: clear any previous slot holding this player
    if (val) {
      for (let i = 0; i < 5; i++) {
        if (i !== slotIdx && next1[i] === val) {
          next1[i] = null;
        }
      }
    }
    next1[slotIdx] = val;
    setSet1Slots(next1);

    if (set2Custom) {
      const next2 = [...set2Custom] as [SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId];
      next2[slotIdx] = val;
      setSet2Custom(next2);
    }

    if (set3Custom) {
      const next3 = [...set3Custom] as [SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId];
      next3[slotIdx] = val;
      setSet3Custom(next3);
    }
  };

  const handleSet2Change = (slotIdx: number, playerId: string) => {
    const val: SlotPlayerId = playerId === '' ? null : playerId;
    const base = set2Custom ? [...set2Custom] : [...set1Slots];

    // Disallow selecting the same player twice in Set 2
    if (val) {
      for (let i = 0; i < 5; i++) {
        if (i !== slotIdx && base[i] === val) {
          base[i] = null;
        }
      }
    }
    base[slotIdx] = val;
    setSet2Custom(base as [SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId]);
  };

  const handleSet3Change = (slotIdx: number, playerId: string) => {
    const val: SlotPlayerId = playerId === '' ? null : playerId;
    const base = set3Custom ? [...set3Custom] : [...set1Slots];

    // Disallow selecting the same player twice in Set 3
    if (val) {
      for (let i = 0; i < 5; i++) {
        if (i !== slotIdx && base[i] === val) {
          base[i] = null;
        }
      }
    }
    base[slotIdx] = val;
    setSet3Custom(base as [SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId, SlotPlayerId]);
  };

  // When changing winning team, reset selected slots
  const handleSelectWinningSide = (side: 'home' | 'away') => {
    if (side === winningSide) return;
    setWinningSide(side);
    setSet1Slots([null, null, null, null, null]);
    setSet2Custom(null);
    setSet3Custom(null);
  };

  // Compile all 15 frame player IDs for Rule 8c
  const all15PlayerIds = useMemo((): SlotPlayerId[] => {
    return [
      ...set1Slots,
      ...effectiveSet2,
      ...effectiveSet3,
    ];
  }, [set1Slots, effectiveSet2, effectiveSet3]);

  // Count frame allocation per squad player
  const playerFrameCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    all15PlayerIds.forEach((pId) => {
      if (pId && pId !== 'BYE') {
        counts[pId] = (counts[pId] || 0) + 1;
      }
    });
    return counts;
  }, [all15PlayerIds]);

  const totalAllocatedFrames = Object.values(playerFrameCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  const isScheduled = fixture.status === 'scheduled';
  const set1FilledCount = set1Slots.filter((id) => Boolean(id) && id !== 'BYE').length;
  const has5Set1Players = set1FilledCount === 5;
  const uniqueSet1Count = new Set(set1Slots.filter((id) => Boolean(id) && id !== 'BYE')).size;
  const has5UniqueSet1Players = has5Set1Players && uniqueSet1Count === 5;
  const hasEnoughSquadPlayers = winningSquad.length >= 5;
  const all15Assigned = all15PlayerIds.length === 15 && all15PlayerIds.every((id) => Boolean(id) && id !== 'BYE');

  const canConfirm = isScheduled && hasEnoughSquadPlayers && has5UniqueSet1Players && all15Assigned;

  const handleConfirm = async () => {
    if (!canConfirm || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const updated = awardWalkoverToFixture(
        fixture,
        winningSide,
        all15PlayerIds
      );
      await onConfirmWalkover(updated);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-6 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Award Walkover (Rule 8)
              </h3>
              <p className="text-xs text-slate-400">
                {homeTeam?.name ?? 'Home'} vs {awayTeam?.name ?? 'Away'} •{' '}
                {formatMatchDate(fixture.matchDate)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-1.5 rounded-lg hover:bg-slate-800"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Select Winning Team */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
            1. Select Non-Offending (Winning) Team
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleSelectWinningSide('home')}
              className={`p-3.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                winningSide === 'home'
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-white ring-1 ring-emerald-500/30'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Home Team
                </span>
                {winningSide === 'home' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
              </div>
              <span className="text-sm font-bold text-white">
                {homeTeam?.name}
              </span>
              <span className="text-[11px] text-emerald-300">
                Awarded 15–0 Win • Maximum 7 Points
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectWinningSide('away')}
              className={`p-3.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                winningSide === 'away'
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-white ring-1 ring-emerald-500/30'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Away Team
                </span>
                {winningSide === 'away' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
              </div>
              <span className="text-sm font-bold text-white">
                {awayTeam?.name}
              </span>
              <span className="text-[11px] text-emerald-300">
                Awarded 15–0 Win • Maximum 7 Points
              </span>
            </button>
          </div>
        </div>

        {/* Walkover Rule Notice */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
          <div className="flex justify-between items-center text-slate-300">
            <span>Winning Team:</span>
            <span className="font-bold text-emerald-400">
              {winningTeam?.name} (15–0 • 7 Points)
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span>Defaulting / Conceding Team:</span>
            <span className="font-bold text-rose-400">
              {defaultingTeam?.name} (0–15 • 0 Points)
            </span>
          </div>
        </div>

        {/* 2. Rule 8c: Player Frame Win Allocation */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                2. Select 5 Starting Players (Rule 8c)
              </label>
              <span className="text-[11px] font-semibold text-emerald-400">
                {totalAllocatedFrames} / 15 frames allocated
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Select the 5 starting players for <strong>{winningTeam?.name}</strong>.
              Selecting these 5 players automatically populates Sets 2 and 3 (3 frame wins per player).
              You can then expand Sets 2 &amp; 3 to make individual frame substitutions if desired.
            </p>
          </div>

          {/* Set 1: Starting 5 Selection */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
            <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>Starting 5 Players (Auto-fills all 3 sets)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4].map((slotIdx) => (
                <div key={slotIdx} className="space-y-1">
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase">
                    Slot {slotIdx + 1}
                  </label>
                  <select
                    value={set1Slots[slotIdx] ?? ''}
                    onChange={(e) => handleSet1Change(slotIdx, e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                  >
                    <option value="" className="text-slate-500">
                      Select...
                    </option>
                    {winningSquad.map((player) => {
                      const otherSlotIdx = set1Slots.findIndex(
                        (id, idx) => idx !== slotIdx && id === player.id
                      );
                      const isAlreadySelected = otherSlotIdx !== -1;
                      return (
                        <option
                          key={player.id}
                          value={player.id}
                          disabled={isAlreadySelected}
                        >
                          {player.name}
                          {isAlreadySelected ? ` (Slot ${otherSlotIdx + 1})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Allocation summary badges */}
          {Object.keys(playerFrameCounts).length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">
                Wins awarded:
              </span>
              {Object.entries(playerFrameCounts).map(([pId, count]) => {
                const player = winningSquad.find((p) => p.id === pId);
                return (
                  <span
                    key={pId}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium"
                  >
                    <span>{player?.name ?? pId}</span>
                    <strong className="text-white font-bold">({count})</strong>
                  </span>
                );
              })}
            </div>
          )}

          {/* Collapsible: Customise Sets 2 and 3 */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvancedSets((prev) => !prev)}
              className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-semibold transition"
            >
              {showAdvancedSets ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
              <span>
                {showAdvancedSets
                  ? 'Hide Custom Sets 2 & 3'
                  : 'Customise Sets 2 & 3 (Optional substitutions)'}
              </span>
            </button>

            {showAdvancedSets && (
              <div className="mt-2.5 space-y-3 p-3 rounded-xl bg-slate-950 border border-slate-800 animate-in fade-in duration-150">
                {/* Set 2 */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-300">
                    Set 2 (Frames 6–10)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                    {[0, 1, 2, 3, 4].map((slotIdx) => (
                      <div key={slotIdx} className="space-y-0.5">
                        <label className="block text-[9px] text-slate-400 uppercase">
                          Frame {slotIdx + 6}
                        </label>
                        <select
                          value={effectiveSet2[slotIdx] ?? ''}
                          onChange={(e) => handleSet2Change(slotIdx, e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                        >
                          <option value="" className="text-slate-500">
                            Select...
                          </option>
                          {winningSquad.map((player) => {
                            const otherSlotIdx = effectiveSet2.findIndex(
                              (id, idx) => idx !== slotIdx && id === player.id
                            );
                            const isAlreadySelected = otherSlotIdx !== -1;
                            return (
                              <option
                                key={player.id}
                                value={player.id}
                                disabled={isAlreadySelected}
                              >
                                {player.name}
                                {isAlreadySelected ? ` (Frame ${otherSlotIdx + 6})` : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Set 3 */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <span className="text-[11px] font-bold text-slate-300">
                    Set 3 (Frames 11–15)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                    {[0, 1, 2, 3, 4].map((slotIdx) => (
                      <div key={slotIdx} className="space-y-0.5">
                        <label className="block text-[9px] text-slate-400 uppercase">
                          Frame {slotIdx + 11}
                        </label>
                        <select
                          value={effectiveSet3[slotIdx] ?? ''}
                          onChange={(e) => handleSet3Change(slotIdx, e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                        >
                          <option value="" className="text-slate-500">
                            Select...
                          </option>
                          {winningSquad.map((player) => {
                            const otherSlotIdx = effectiveSet3.findIndex(
                              (id, idx) => idx !== slotIdx && id === player.id
                            );
                            const isAlreadySelected = otherSlotIdx !== -1;
                            return (
                              <option
                                key={player.id}
                                value={player.id}
                                disabled={isAlreadySelected}
                              >
                                {player.name}
                                {isAlreadySelected ? ` (Frame ${otherSlotIdx + 11})` : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Validation Feedback Alerts */}
        {!isScheduled ? (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>
              Walkovers can only be awarded to scheduled fixtures that have not yet been played.
            </span>
          </div>
        ) : !hasEnoughSquadPlayers ? (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>
              {winningTeam?.name} only has {winningSquad.length} registered active squad player(s). At least 5 registered players are required to award a walkover.
            </span>
          </div>
        ) : !has5Set1Players ? (
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              Please select all 5 starting players in Set 1 ({set1FilledCount} of 5 selected).
            </span>
          </div>
        ) : !has5UniqueSet1Players ? (
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              The 5 starting players in Set 1 must each be distinct squad players.
            </span>
          </div>
        ) : !all15Assigned ? (
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              All 15 frames must have a player assigned.
            </span>
          </div>
        ) : null}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm || isSubmitting}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-emerald-900/30"
          >
            <Award className="w-4 h-4" />
            <span>{isSubmitting ? 'Awarding...' : 'Confirm Walkover'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

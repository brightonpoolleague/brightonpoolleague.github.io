import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  EyeOff,
  FileSpreadsheet,
  Lock,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Unlock,
  Users,
  WifiOff,
  X,
} from 'lucide-react';
import {
  Fixture,
  SlotPlayerId,
} from '../types/league';
import {
  calculateMatchScore,
  ensureValidFrames,
  ensureValidLineups,
  formatMatchDate,
  getEligiblePlayersForSlot,
  getFrameBreaker,
  getFramePlayers,
  getScorecardApprovalWarnings,
  getSetKey,
  isKnockoutFixture,
  syncDefaultSubsequentSets,
} from '../utils/leagueEngine';
import { useLeague } from '../context/LeagueContext';

interface MatchScorecardModalProps {
  fixture: Fixture;
  onClose: () => void;
}

export const MatchScorecardModal: React.FC<MatchScorecardModalProps> = ({
  fixture,
  onClose,
}) => {
  const {
    teams,
    players,
    session,
    canEditFixture,
    canManageLeague,
    saveFixture,
    approveFixture,
    reopenFixture,
    refreshFromCloud,
    refreshSingleFixture,
    isOnline,
    isSyncing,
    syncError,
    retryPendingSync,
  } = useLeague();

  const [activeSet, setActiveSet] = useState<1 | 2 | 3>(1);
  const [viewMode, setViewMode] = useState<'mobile' | 'paper'>('mobile');
  const [showLineupEditor, setShowLineupEditor] = useState<boolean>(
    !fixture.homeSet1Locked || !fixture.awaySet1Locked
  );
  const [subOutSlotBySide, setSubOutSlotBySide] = useState<{
    home: number | '';
    away: number | '';
  }>({ home: '', away: '' });
  const [subInPlayerBySide, setSubInPlayerBySide] = useState<{
    home: string;
    away: string;
  }>({ home: '', away: '' });

  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await refreshFromCloud({ silent: false });
    } finally {
      setTimeout(() => setIsManualRefreshing(false), 500);
    }
  };

  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: React.ReactNode;
    confirmLabel: string;
    variant?: 'danger' | 'warning';
    onConfirm: () => void;
  } | null>(null);

  const handleApproveScorecard = () => {
    const warnings = getScorecardApprovalWarnings(fixture);
    if (warnings.length > 0) {
      setConfirmDialog({
        title: 'Approve Incomplete Scorecard?',
        message: (
          <div className="space-y-2">
            <p className="text-slate-300">
              This scorecard is not yet complete:
            </p>
            <ul className="list-disc pl-4 space-y-1 text-amber-300 font-medium">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
            <p className="text-slate-400 text-xs pt-1">
              Are you sure you want to approve this official scorecard anyway?
            </p>
          </div>
        ),
        confirmLabel: 'Approve Scorecard',
        variant: 'warning',
        onConfirm: () => approveFixture(fixture.id),
      });
    } else {
      approveFixture(fixture.id);
    }
  };

  const homeTeam = teams.find((t) => t.id === fixture.homeTeamId);
  const awayTeam = teams.find((t) => t.id === fixture.awayTeamId);
  if (!homeTeam || !awayTeam) return null;

  const homeSquad = players.filter((p) => p.teamId === homeTeam.id && p.active);
  const awaySquad = players.filter((p) => p.teamId === awayTeam.id && p.active);

  // Guarantee that frames and lineups are strictly complete and never empty arrays
  const frames = useMemo(
    () => ensureValidFrames(fixture.frames),
    [fixture.frames]
  );
  const lineups = useMemo(
    () => ensureValidLineups(fixture.lineups),
    [fixture.lineups]
  );

  const editable = canEditFixture(fixture);

  // Self-heal: If fixture was loaded with an empty frames array, immediately persist the full 15 frames
  useEffect(() => {
    if (
      (!Array.isArray(fixture.frames) || fixture.frames.length !== 15) &&
      editable
    ) {
      saveFixture({
        ...fixture,
        frames: ensureValidFrames(fixture.frames),
        lineups: ensureValidLineups(fixture.lineups),
      });
    }
  }, [fixture.id, fixture.frames, editable, saveFixture]);

  const canSignHome =
    canManageLeague ||
    (editable &&
      session.role === 'captain' &&
      session.teamId === fixture.homeTeamId);
  const canSignAway =
    canManageLeague ||
    (editable &&
      session.role === 'captain' &&
      session.teamId === fixture.awayTeamId);
  const canEditSide = (side: 'home' | 'away'): boolean =>
    side === 'home' ? canSignHome : canSignAway;
  const score = calculateMatchScore({ ...fixture, frames, lineups });

  const getPlayerName = (playerId: SlotPlayerId, hidden = false): string => {
    if (hidden) return 'Hidden (Folded Scorecard)';
    if (!playerId) return 'Unassigned';
    if (playerId === 'BYE') return 'No Player (BYE)';
    return players.find((p) => p.id === playerId)?.name ?? 'Unknown Player';
  };

  // Blind Set 1 ("Folded Paper") visibility logic:
  // Until both Set 1 lineups are locked, hide the opponent's Set 1 slots unless viewing that side in the editor or Admin
  const bothSet1Locked = fixture.homeSet1Locked && fixture.awaySet1Locked;

  const isKnockout = isKnockoutFixture(fixture);
  const playAllFrames = Boolean(
    fixture.playAllFrames || fixture.knockoutFormat === 'play_all_15'
  );
  const isKnockoutDecided = isKnockout
    ? playAllFrames
      ? frames.every((f) => f.winner !== null)
      : score.homeFrames >= 8 || score.awayFrames >= 8
    : false;
  const allFramesComplete = frames.every((f) => f.winner !== null);
  const isMatchComplete = isKnockout ? isKnockoutDecided : allFramesComplete;

  const knockoutTitle =
    fixture.competitionName ||
    fixture.cupName ||
    (fixture.division ? `${fixture.division} Cup` : 'Knockout Cup');
  const knockoutRound = fixture.round || fixture.cupRound;
  const knockoutDisplay = knockoutRound
    ? `${knockoutTitle} (${knockoutRound})`
    : knockoutTitle;

  // Frame results can only be recorded once both Set 1 lineups are locked
  // and both players for that frame have been assigned (player or BYE).
  // In Knockout matches with first-to-8 rules, unplayed frames are locked once either team reaches 8 frames.
  const canRecordFrame = (frameNumber: number): boolean => {
    if (!editable || !bothSet1Locked) return false;
    const frame = frames.find((f) => f.frameNumber === frameNumber);
    if (!frame) return false;
    // In first-to-8 knockout matches, once a team has reached 8 frames, unrecorded frames cannot be played
    if (isKnockout && !playAllFrames && isKnockoutDecided && !frame.winner) {
      return false;
    }
    const { homePlayerId, awayPlayerId } = getFramePlayers(
      lineups,
      frame
    );
    return Boolean(homePlayerId) && Boolean(awayPlayerId);
  };

  const handleAdminQuickLockBoth = async () => {
    if (!canManageLeague) return;
    const nextLineups = structuredClone(lineups);
    const fillMissing = (side: 'home' | 'away') => {
      const squad = side === 'home' ? homeSquad : awaySquad;
      const current = nextLineups.set1[side];
      for (let i = 0; i < 5; i++) {
        if (!current[i]) {
          const used = new Set(current.filter(Boolean));
          const available = squad.find((p) => !used.has(p.id));
          current[i] = available ? available.id : i >= 3 ? 'BYE' : null;
        }
      }
    };
    fillMissing('home');
    fillMissing('away');

    const updatedLineups = syncDefaultSubsequentSets(nextLineups);
    await saveFixture(
      {
        ...fixture,
        lineups: updatedLineups,
        frames,
        homeSet1Locked: true,
        awaySet1Locked: true,
      },
      'home'
    );
  };

  const handleLagChange = async (winner: 'home' | 'away') => {
    if (!editable) return;
    await saveFixture(
      {
        ...fixture,
        lagWinner: fixture.lagWinner === winner ? null : winner,
      },
      'frames'
    );
  };

  const handleSlotChange = async (
    setNumber: 1 | 2 | 3,
    side: 'home' | 'away',
    slotIndex: number,
    value: SlotPlayerId
  ) => {
    if (!editable || !canEditSide(side)) return;
    const setKey = getSetKey(setNumber);
    const nextLineups = structuredClone(fixture.lineups);
    nextLineups[setKey][side][slotIndex] = value;

    // If editing Set 1 or Set 2, also cascade to subsequent sets if they were still matching or null
    if (setNumber === 1) {
      if (
        nextLineups.set2[side][slotIndex] === null ||
        nextLineups.set2[side][slotIndex] === fixture.lineups.set1[side][slotIndex]
      ) {
        nextLineups.set2[side][slotIndex] = value;
      }
      if (
        nextLineups.set3[side][slotIndex] === null ||
        nextLineups.set3[side][slotIndex] === fixture.lineups.set1[side][slotIndex]
      ) {
        nextLineups.set3[side][slotIndex] = value;
      }
    } else if (setNumber === 2) {
      if (
        nextLineups.set3[side][slotIndex] === null ||
        nextLineups.set3[side][slotIndex] === fixture.lineups.set2[side][slotIndex]
      ) {
        nextLineups.set3[side][slotIndex] = value;
      }
    }

    await saveFixture(
      {
        ...fixture,
        lineups: nextLineups,
      },
      side
    );
  };

  const isSet1LineupComplete = (side: 'home' | 'away'): boolean =>
    fixture.lineups.set1[side].every((slot) => Boolean(slot));

  const handleToggleLockSet1 = async (side: 'home' | 'away') => {
    if (!editable || !canEditSide(side)) return;

    // Once both captains have locked Set 1, both teams have seen the running order.
    // Neither captain can unilaterally unlock Set 1 unless BOTH captains unlock (or Admin overrides).
    if (bothSet1Locked && !canManageLeague) {
      const otherSide = side === 'home' ? 'away' : 'home';
      const myUnlockReq = Boolean(fixture.lineups.unlockRequested?.[side]);
      const otherUnlockReq = Boolean(
        fixture.lineups.unlockRequested?.[otherSide]
      );

      if (otherUnlockReq) {
        // Both captains have now agreed to unlock Set 1
        await saveFixture(
          {
            ...fixture,
            homeSet1Locked: false,
            awaySet1Locked: false,
            lineups: {
              ...fixture.lineups,
              unlockRequested: { home: false, away: false },
            },
          },
          side
        );
      } else {
        // Request (or cancel request) to unlock Set 1; stays locked until the other captain also unlocks
        await saveFixture(
          {
            ...fixture,
            lineups: {
              ...fixture.lineups,
              unlockRequested: {
                ...fixture.lineups.unlockRequested,
                [side]: !myUnlockReq,
              },
            },
          },
          side
        );
      }
      return;
    }

    if (side === 'home') {
      const nextLocked = !fixture.homeSet1Locked;
      if (nextLocked && !isSet1LineupComplete('home')) return;
      await saveFixture(
        {
          ...fixture,
          homeSet1Locked: nextLocked,
          lineups: {
            ...fixture.lineups,
            unlockRequested: { home: false, away: false },
          },
        },
        'home'
      );
    } else {
      const nextLocked = !fixture.awaySet1Locked;
      if (nextLocked && !isSet1LineupComplete('away')) return;
      await saveFixture(
        {
          ...fixture,
          awaySet1Locked: nextLocked,
          lineups: {
            ...fixture.lineups,
            unlockRequested: { home: false, away: false },
          },
        },
        'away'
      );
    }
  };

  const handleFrameWinner = async (
    frameNumber: number,
    winner: 'home' | 'away'
  ) => {
    if (!canRecordFrame(frameNumber)) return;
    const nextFrames = frames.map((f) => {
      if (f.frameNumber !== frameNumber) return f;
      const toggledWinner = f.winner === winner ? null : winner;
      return {
        ...f,
        winner: toggledWinner,
        dish: toggledWinner ? f.dish : false,
      };
    });
    await saveFixture(
      {
        ...fixture,
        frames: nextFrames,
      },
      'frames'
    );
  };

  const handleToggleDish = async (frameNumber: number) => {
    if (!canRecordFrame(frameNumber)) return;
    const nextFrames = frames.map((f) => {
      if (f.frameNumber !== frameNumber || !f.winner) return f;
      return { ...f, dish: !f.dish };
    });
    await saveFixture(
      {
        ...fixture,
        frames: nextFrames,
      },
      'frames'
    );
  };

  const handleToggleSign = async (side: 'home' | 'away') => {
    if (!editable) return;
    if (!isMatchComplete) return;
    if (side === 'home' && !canSignHome) return;
    if (side === 'away' && !canSignAway) return;
    const nextHomeSigned =
      side === 'home' ? !fixture.homeCaptainSigned : fixture.homeCaptainSigned;
    const nextAwaySigned =
      side === 'away' ? !fixture.awayCaptainSigned : fixture.awayCaptainSigned;

    const bothSigned = nextHomeSigned && nextAwaySigned;
    await saveFixture(
      {
        ...fixture,
        homeCaptainSigned: nextHomeSigned,
        awayCaptainSigned: nextAwaySigned,
        status:
          bothSigned && isMatchComplete
            ? 'submitted'
            : fixture.status === 'submitted' && !bothSigned
            ? 'live'
            : fixture.status,
        submittedAt:
          bothSigned && isMatchComplete
            ? new Date().toISOString()
            : fixture.submittedAt,
      },
      side
    );
  };

  const renderLineupSelector = (setNumber: 1 | 2 | 3, side: 'home' | 'away') => {
    const team = side === 'home' ? homeTeam : awayTeam;
    const otherTeam = side === 'home' ? awayTeam : homeTeam;
    const squad = side === 'home' ? homeSquad : awaySquad;
    const setKey = getSetKey(setNumber);
    const currentSlots = fixture.lineups[setKey][side];
    const sideEditable = canEditSide(side);
    const isSet1Locked =
      setNumber === 1 &&
      (side === 'home' ? fixture.homeSet1Locked : fixture.awaySet1Locked);
    const set1Complete = isSet1LineupComplete(side);
    const set1FilledCount = fixture.lineups.set1[side].filter(Boolean).length;
    const hideSideSlots =
      setNumber === 1 && !bothSet1Locked && !sideEditable;

    const otherSide = side === 'home' ? 'away' : 'home';
    const myUnlockReq = Boolean(fixture.lineups.unlockRequested?.[side]);
    const otherUnlockReq = Boolean(
      fixture.lineups.unlockRequested?.[otherSide]
    );

    const prevSetSlots =
      setNumber === 2
        ? fixture.lineups.set1[side]
        : setNumber === 3
        ? fixture.lineups.set2[side]
        : null;

    const selectedSubOutSlot = subOutSlotBySide[side];
    const selectedSubInPlayer = subInPlayerBySide[side];
    const subOutSlotIdx =
      selectedSubOutSlot === '' ? null : Number(selectedSubOutSlot);
    const subInCandidates =
      setNumber > 1 && subOutSlotIdx !== null
        ? getEligiblePlayersForSlot(
            squad,
            fixture.lineups,
            setNumber,
            side,
            subOutSlotIdx
          ).filter(({ player }) => player.id !== currentSlots[subOutSlotIdx])
        : [];
    const canSubInBye =
      setNumber > 1 &&
      subOutSlotIdx !== null &&
      currentSlots[subOutSlotIdx] !== 'BYE';

    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
              {side === 'home' ? 'Home Team' : 'Away Team'} • Set {setNumber}{' '}
              {setNumber === 1 ? 'Running Order' : 'Substitutions'}
            </span>
            <h4 className="font-bold text-white text-sm">{team.name}</h4>
          </div>
          {setNumber === 1 && sideEditable ? (
            <button
              type="button"
              disabled={!isSet1Locked && !set1Complete}
              onClick={() => handleToggleLockSet1(side)}
              title={
                !isSet1Locked && !set1Complete
                  ? 'Select a player (or BYE) in all 5 slots before locking Set 1'
                  : undefined
              }
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${
                bothSet1Locked && !canManageLeague
                  ? otherUnlockReq
                    ? 'bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 shadow'
                    : myUnlockReq
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                  : isSet1Locked
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : set1Complete
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {bothSet1Locked && !canManageLeague ? (
                otherUnlockReq ? (
                  <>
                    <Unlock className="w-3.5 h-3.5" /> Confirm Unlock (2/2)
                  </>
                ) : myUnlockReq ? (
                  <>
                    <Clock className="w-3.5 h-3.5" /> Unlock Requested (1/2)
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" /> Locked In • Request Unlock
                  </>
                )
              ) : isSet1Locked ? (
                <>
                  <Lock className="w-3.5 h-3.5" /> Locked In
                </>
              ) : set1Complete ? (
                <>
                  <Unlock className="w-3.5 h-3.5" /> Lock Set 1
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" /> Select All 5 ({set1FilledCount}/5)
                </>
              )}
            </button>
          ) : setNumber === 1 ? (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                myUnlockReq
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : isSet1Locked
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {myUnlockReq ? (
                <>
                  <Unlock className="w-3.5 h-3.5" /> Requested Unlock
                </>
              ) : isSet1Locked ? (
                <>
                  <Lock className="w-3.5 h-3.5" /> Locked In
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5" /> Awaiting Lock
                </>
              )}
            </span>
          ) : null}
        </div>

        {setNumber === 1 && bothSet1Locked && (myUnlockReq || otherUnlockReq) && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 text-[11px] text-amber-200 flex items-center justify-between gap-2">
            <span>
              {myUnlockReq
                ? `Unlock requested — Set 1 stays locked until ${otherTeam.name} captain also clicks unlock.`
                : `${otherTeam.name} captain requested to unlock Set 1. Click "Confirm Unlock (2/2)" to unlock both lineups.`}
            </span>
          </div>
        )}

        {hideSideSlots ? (
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 text-center space-y-1.5">
            <EyeOff className="w-5 h-5 text-slate-500 mx-auto" />
            <p className="text-xs font-semibold text-slate-300">
              {isSet1Locked
                ? `${team.name} Set 1 Lineup is Locked & Hidden`
                : `Awaiting ${team.name} Captain Set 1 Entry`}
            </p>
            <p className="text-[11px] text-slate-500">
              Running order remains hidden (&ldquo;Folded Scorecard&rdquo;) until both captains lock in Set 1.
            </p>
          </div>
        ) : setNumber === 1 ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((slotIdx) => {
              const slotNum = (slotIdx + 1) as 1 | 2 | 3 | 4 | 5;
              const selectedId = currentSlots[slotIdx];
              const eligible = getEligiblePlayersForSlot(
                squad,
                fixture.lineups,
                1,
                side,
                slotIdx
              );

              return (
                <div key={slotNum} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 text-xs font-bold flex items-center justify-center text-slate-300 shrink-0">
                    {slotNum}
                  </span>
                  <select
                    disabled={!sideEditable || isSet1Locked}
                    value={selectedId ?? ''}
                    onChange={(e) =>
                      handleSlotChange(
                        1,
                        side,
                        slotIdx,
                        (e.target.value || null) as SlotPlayerId
                      )
                    }
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500 disabled:opacity-60"
                  >
                    <option value="">
                      -- Select Position {slotNum} Player --
                    </option>
                    <option value="BYE">No Player (BYE)</option>
                    {eligible.map(({ player, disabledReason }) => (
                      <option
                        key={player.id}
                        value={player.id}
                        disabled={Boolean(disabledReason)}
                      >
                        {player.name}
                        {disabledReason ? ` (${disabledReason})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        ) : (
          /* Set 2 & Set 3 Guided Substitution Experience */
          <div className="space-y-3">
            {sideEditable && (
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-2.5">
                <div className="text-xs font-bold text-emerald-400">
                  Make a Set {setNumber} Substitution
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Who do you want to take out?
                    </label>
                    <select
                      value={selectedSubOutSlot}
                      onChange={(e) => {
                        const val =
                          e.target.value === '' ? '' : Number(e.target.value);
                        setSubOutSlotBySide((prev) => ({
                          ...prev,
                          [side]: val,
                        }));
                        setSubInPlayerBySide((prev) => ({
                          ...prev,
                          [side]: '',
                        }));
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">-- Select player to take out --</option>
                      {[0, 1, 2, 3, 4].map((idx) => {
                        const slotNum = idx + 1;
                        const currId = currentSlots[idx];
                        const prevId = prevSetSlots ? prevSetSlots[idx] : null;
                        const wasSubbed =
                          prevId && currId && prevId !== currId;
                        return (
                          <option key={slotNum} value={idx}>
                            {getPlayerName(currId)} (Pos #{slotNum}
                            {wasSubbed
                              ? ` • subbed for ${getPlayerName(prevId)}`
                              : ''}
                            )
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Who do you want to put in?
                    </label>
                    <select
                      disabled={subOutSlotIdx === null}
                      value={selectedSubInPlayer}
                      onChange={(e) =>
                        setSubInPlayerBySide((prev) => ({
                          ...prev,
                          [side]: e.target.value,
                        }))
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                    >
                      <option value="">
                        {subOutSlotIdx === null
                          ? '-- Choose who to take out first --'
                          : '-- Select replacement player --'}
                      </option>
                      {subInCandidates.map(({ player, disabledReason }) => {
                        const isOriginalPrevPlayer =
                          subOutSlotIdx !== null &&
                          prevSetSlots?.[subOutSlotIdx] === player.id;
                        return (
                          <option
                            key={player.id}
                            value={player.id}
                            disabled={Boolean(disabledReason)}
                          >
                            {player.name}
                            {isOriginalPrevPlayer
                              ? ` (Restore Set ${setNumber - 1} player)`
                              : disabledReason
                              ? ` (${disabledReason})`
                              : ''}
                          </option>
                        );
                      })}
                      {canSubInBye && (
                        <option value="BYE">No Player (BYE)</option>
                      )}
                    </select>
                  </div>
                </div>

                {subOutSlotIdx !== null && selectedSubInPlayer !== '' && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-800/80">
                    <span className="text-[11px] text-slate-300">
                      Placing{' '}
                      <strong className="text-emerald-400">
                        {getPlayerName(selectedSubInPlayer as SlotPlayerId)}
                      </strong>{' '}
                      into{' '}
                      <strong className="text-white">
                        Position #{subOutSlotIdx + 1}
                      </strong>{' '}
                      (for {getPlayerName(currentSlots[subOutSlotIdx])})
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        await handleSlotChange(
                          setNumber,
                          side,
                          subOutSlotIdx,
                          selectedSubInPlayer as SlotPlayerId
                        );
                        setSubOutSlotBySide((prev) => ({
                          ...prev,
                          [side]: '',
                        }));
                        setSubInPlayerBySide((prev) => ({
                          ...prev,
                          [side]: '',
                        }));
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
                    >
                      Make Substitution
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Current Set 2 / Set 3 Running Order Summary */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Set {setNumber} Running Order (Positions 1–5)
              </div>
              {[0, 1, 2, 3, 4].map((slotIdx) => {
                const slotNum = (slotIdx + 1) as 1 | 2 | 3 | 4 | 5;
                const selectedId = currentSlots[slotIdx];
                const prevPlayerId = prevSetSlots
                  ? prevSetSlots[slotIdx]
                  : null;
                const isSubbed =
                  Boolean(prevPlayerId) &&
                  Boolean(selectedId) &&
                  prevPlayerId !== selectedId;

                return (
                  <div
                    key={slotNum}
                    className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border text-xs ${
                      isSubbed
                        ? 'bg-amber-500/10 border-amber-500/30 text-white'
                        : 'bg-slate-950/80 border-slate-800/80 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 text-xs font-bold flex items-center justify-center text-slate-300 shrink-0">
                        {slotNum}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-white truncate">
                          {getPlayerName(selectedId)}
                        </div>
                        {isSubbed && (
                          <div className="text-[10px] text-amber-300 truncate">
                            Subbed in for {getPlayerName(prevPlayerId)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isSubbed && (
                        <>
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            SUB
                          </span>
                          {sideEditable && (
                            <button
                              type="button"
                              onClick={() =>
                                handleSlotChange(
                                  setNumber,
                                  side,
                                  slotIdx,
                                  prevPlayerId
                                )
                              }
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold border border-slate-700"
                              title="Undo substitution and restore previous set player"
                            >
                              Undo
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const setFrames = frames.filter((f) => f.setNumber === activeSet);

  const showSignOff =
    isMatchComplete ||
    fixture.status === 'submitted' ||
    fixture.status === 'approved';

  const renderSignOffCard = () => (
    <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-white">
            Captain Sign-Off & Result Submission
          </h4>
          <p className="text-xs text-slate-400">
            {isKnockout
              ? `${knockoutDisplay} match decided (${playAllFrames ? 'all 15 frames recorded' : 'first to 8 frames'}) — final score ${homeTeam.name} ${score.homeFrames}–${score.awayFrames} ${awayTeam.name}. Both captains sign to submit the knockout result.`
              : `All 15 frames recorded — final score ${homeTeam.name} ${score.homeFrames}–${score.awayFrames} ${awayTeam.name}. Both captains sign to submit the result.`}
          </p>
        </div>
        {fixture.status === 'approved' && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
            <ShieldCheck className="w-4 h-4" /> Officially Approved
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          disabled={!canSignHome}
          onClick={() => handleToggleSign('home')}
          className={`flex items-center justify-between p-3 rounded-xl border text-left transition ${
            fixture.homeCaptainSigned
              ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200'
              : canSignHome
              ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
              : 'bg-slate-950/60 border-slate-800/60 text-slate-500 opacity-75 cursor-not-allowed'
          }`}
        >
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">
              Home Captain Signature
            </div>
            <div className="font-bold text-sm">
              {homeTeam.captainName || homeTeam.name}
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700">
            {fixture.homeCaptainSigned
              ? '✓ Signed'
              : canSignHome
              ? 'Tap to Sign'
              : 'Home Captain Only'}
          </span>
        </button>

        <button
          type="button"
          disabled={!canSignAway}
          onClick={() => handleToggleSign('away')}
          className={`flex items-center justify-between p-3 rounded-xl border text-left transition ${
            fixture.awayCaptainSigned
              ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200'
              : canSignAway
              ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
              : 'bg-slate-950/60 border-slate-800/60 text-slate-500 opacity-75 cursor-not-allowed'
          }`}
        >
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">
              Away Captain Signature
            </div>
            <div className="font-bold text-sm">
              {awayTeam.captainName || awayTeam.name}
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700">
            {fixture.awayCaptainSigned
              ? '✓ Signed'
              : canSignAway
              ? 'Tap to Sign'
              : 'Away Captain Only'}
          </span>
        </button>
      </div>

      {canManageLeague && (
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-slate-400">League Admin Controls:</span>
          <div className="flex items-center gap-2">
            {fixture.status !== 'approved' ? (
              <button
                type="button"
                onClick={handleApproveScorecard}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow"
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve Official Scorecard
              </button>
            ) : (
              <button
                type="button"
                onClick={() => reopenFixture(fixture.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold"
              >
                <Unlock className="w-3.5 h-3.5" />
                Reopen Scorecard for Editing
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-3 sm:px-6 py-3 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt="Brighton Pool League"
            className="w-8 h-8 object-contain shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {isKnockout ? (
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                  🏆 {knockoutDisplay}
                  <span className="text-amber-500/80 font-normal">
                    • {playAllFrames ? 'All 15 Frames' : 'First to 8'}
                  </span>
                </span>
              ) : (
                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                  {fixture.division} • {formatMatchDate(fixture.matchDate)}
                </span>
              )}
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  fixture.status === 'live'
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
                    : fixture.status === 'submitted'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : fixture.status === 'approved'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {fixture.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate">
              {homeTeam.venue}
              {homeTeam.tableNumber ? ` (${homeTeam.tableNumber})` : ''} •{' '}
              {formatMatchDate(fixture.matchDate)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('mobile')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                viewMode === 'mobile'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Live Scorecard</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('paper')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                viewMode === 'paper'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Result Scorecard</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isManualRefreshing}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Refresh scorecard and latest scores from cloud"
          >
            <RefreshCw
              className={`w-4 h-4 ${isManualRefreshing ? 'animate-spin text-emerald-400' : ''}`}
            />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Live Scoreboard Banner */}
      <div className="bg-gradient-to-b from-emerald-950/60 to-slate-900 border-b border-slate-800 px-4 py-3 shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 items-center gap-2">
            {/* Home Team */}
            <div className="text-left">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Home
              </div>
              <div className="font-bold text-sm sm:text-lg text-white leading-tight">
                {homeTeam.name}
              </div>
              <div className="text-[11px] text-emerald-400 font-medium mt-0.5 truncate">
                {isKnockout
                  ? isKnockoutDecided && score.matchWinner === 'home'
                    ? '🏆 Winner'
                    : knockoutDisplay
                  : `${score.homePoints} League Pts`}
              </div>
            </div>

            {/* Center Score */}
            <div className="flex flex-col items-center justify-center">
              <div className="flex items-center gap-2 sm:gap-4 bg-slate-950/90 border border-slate-800 px-3 sm:px-5 py-1.5 rounded-2xl shadow-inner">
                <span
                  className={`text-2xl sm:text-3xl font-black tabular-nums ${
                    score.homeFrames > score.awayFrames
                      ? 'text-emerald-400'
                      : 'text-white'
                  }`}
                >
                  {score.homeFrames}
                </span>
                <span className="text-xs font-bold text-slate-500 uppercase">
                  vs
                </span>
                <span
                  className={`text-2xl sm:text-3xl font-black tabular-nums ${
                    score.awayFrames > score.homeFrames
                      ? 'text-emerald-400'
                      : 'text-white'
                  }`}
                >
                  {score.awayFrames}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                {isKnockout ? (
                  <span className="text-amber-400 font-semibold text-center">
                    {isKnockoutDecided
                      ? `🏆 Match Decided: ${score.matchWinner === 'home' ? homeTeam.name : score.matchWinner === 'away' ? awayTeam.name : 'Tie'} (${knockoutDisplay})`
                      : playAllFrames
                      ? `${knockoutDisplay} • Play All 15 Frames`
                      : `${knockoutDisplay} • First to 8 Frames`}
                  </span>
                ) : (
                  <>
                    <span>
                      S1: {score.setScores.set1.home}-{score.setScores.set1.away}
                    </span>
                    <span>•</span>
                    <span>
                      S2: {score.setScores.set2.home}-{score.setScores.set2.away}
                    </span>
                    <span>•</span>
                    <span>
                      S3: {score.setScores.set3.home}-{score.setScores.set3.away}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Away Team */}
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Away
              </div>
              <div className="font-bold text-sm sm:text-lg text-white leading-tight">
                {awayTeam.name}
              </div>
              <div className="text-[11px] text-emerald-400 font-medium mt-0.5 truncate">
                {isKnockout
                  ? isKnockoutDecided && score.matchWinner === 'away'
                    ? '🏆 Winner'
                    : knockoutDisplay
                  : `${score.awayPoints} League Pts`}
              </div>
            </div>
          </div>

          {/* Lag Winner Bar */}
          {viewMode === 'mobile' ? (
            <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">
                  Frame 1 Lag Winner (8 Breaks):
                </span>
                <button
                  type="button"
                  disabled={!editable}
                  onClick={() => handleLagChange('home')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition ${
                    fixture.lagWinner === 'home'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50'
                  }`}
                >
                  {homeTeam.name}
                </button>
                <button
                  type="button"
                  disabled={!editable}
                  onClick={() => handleLagChange('away')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition ${
                    fixture.lagWinner === 'away'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50'
                  }`}
                >
                  {awayTeam.name}
                </button>
              </div>

              {(canSignHome || canSignAway) && (
                <button
                  type="button"
                  onClick={() => setShowLineupEditor((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium border border-slate-700"
                >
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  {showLineupEditor
                    ? activeSet === 1
                      ? 'Done Editing Lineup'
                      : 'Done Making Subs'
                    : activeSet === 1
                    ? 'Edit Lineup'
                    : 'Make Subs'}
                </button>
              )}
            </div>
          ) : (
            <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs text-slate-400">
              <span>
                Frame 1 Lag Winner:{' '}
                <strong className="text-white">
                  {fixture.lagWinner === 'home'
                    ? `${homeTeam.name} (8 breaks)`
                    : fixture.lagWinner === 'away'
                    ? `${awayTeam.name} (8 breaks)`
                    : 'Not Selected'}
                </strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto space-y-4 pb-12">
          {(!isOnline || syncError) && (
            <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-200">
              <div className="flex items-center gap-2">
                {!isOnline ? (
                  <WifiOff className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <span className="font-medium text-slate-200">
                  {!isOnline
                    ? 'You are currently offline.'
                    : 'Weak connection detected.'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => retryPendingSync()}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-semibold shrink-0 transition disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`}
                />
                <span>{isSyncing ? 'Retrying...' : 'Retry'}</span>
              </button>
            </div>
          )}

          {!editable && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs text-slate-300">
              <span>
                Viewing live scorecard in <strong>Read-Only Mode</strong>.
                {fixture.status === 'approved'
                  ? ' This match has been officially approved by the League Admin.'
                  : ' Log in as Team Captain or League Admin to enter scores.'}
              </span>
            </div>
          )}

          {viewMode === 'mobile' ? (
            <>
              {/* Set Tabs (Set 1, Set 2, Set 3) */}
              <div className="grid grid-cols-3 gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
                {([1, 2, 3] as const).map((setNum) => {
                  const sKey = getSetKey(setNum);
                  const sScore = score.setScores[sKey];
                  return (
                    <button
                      key={setNum}
                      type="button"
                      onClick={() => setActiveSet(setNum)}
                      className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
                        activeSet === setNum
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>Set {setNum}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[11px] ${
                          activeSet === setNum
                            ? 'bg-emerald-800 text-emerald-100'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {sScore.home}–{sScore.away}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Blind Set 1 ("Folded Paper") or Set 2/3 Substitutions Editor */}
              {showLineupEditor && (canSignHome || canSignAway) && (
                <div className="space-y-3 bg-slate-900/50 border border-slate-800/80 rounded-2xl p-3 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        {activeSet === 1 ? (
                          <>
                            <EyeOff className="w-4 h-4 text-emerald-400" />
                            Set 1 Blind Lineup Entry ("Folded Scorecard")
                          </>
                        ) : (
                          <>
                            <Users className="w-4 h-4 text-emerald-400" />
                            Set {activeSet} Substitutions
                          </>
                        )}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {activeSet === 1
                          ? 'Each captain selects and locks their own team’s 1–5 running order. Lineups are revealed once both teams lock Set 1.'
                          : 'Substitutes take the exact slot number of the player they replace and cannot have played in the previous set.'}
                      </p>
                    </div>
                  </div>

                  {(() => {
                    const editableSides = (['home', 'away'] as const).filter(
                      (s) => canEditSide(s)
                    );
                    const opponentSide =
                      editableSides.length === 1
                        ? editableSides[0] === 'home'
                          ? 'away'
                          : 'home'
                        : null;
                    const opponentTeam =
                      opponentSide === 'home' ? homeTeam : awayTeam;
                    const opponentLocked =
                      opponentSide === 'home'
                        ? fixture.homeSet1Locked
                        : fixture.awaySet1Locked;

                    return (
                      <>
                        <div
                          className={`grid grid-cols-1 gap-3 ${
                            editableSides.length > 1 ? 'md:grid-cols-2' : ''
                          }`}
                        >
                          {editableSides.map((s) => (
                            <React.Fragment key={s}>
                              {renderLineupSelector(activeSet, s)}
                            </React.Fragment>
                          ))}
                        </div>

                        {activeSet === 1 && opponentSide && (
                          <div className="flex items-center gap-2 text-xs text-slate-400 px-1">
                            {opponentLocked ? (
                              <Lock className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                            )}
                            <span>
                              {opponentTeam.name}:{' '}
                              <strong
                                className={
                                  opponentLocked
                                    ? 'text-emerald-300'
                                    : 'text-slate-300'
                                }
                              >
                                {opponentLocked
                                  ? 'Lineup locked in'
                                  : 'Awaiting lineup'}
                              </strong>
                            </span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* 5 Frame Cards for Active Set */}
              {activeSet === 1 && (
                <div
                  className={`rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs border ${
                    bothSet1Locked
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {bothSet1Locked ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <span className="leading-snug">
                      {bothSet1Locked ? (
                        <>
                          <strong>Both Set 1 lineups locked in!</strong> Match running order revealed &amp; frame scoring active.
                        </>
                      ) : fixture.homeSet1Locked && !fixture.awaySet1Locked ? (
                        <>
                          <strong className="text-white">{homeTeam.name}</strong> locked in (1/2). Waiting for <strong className="text-white">{awayTeam.name}</strong> captain to lock Set 1.
                        </>
                      ) : !fixture.homeSet1Locked && fixture.awaySet1Locked ? (
                        <>
                          <strong className="text-white">{awayTeam.name}</strong> locked in (1/2). Waiting for <strong className="text-white">{homeTeam.name}</strong> captain to lock Set 1.
                        </>
                      ) : (
                        <>
                          Both captains must lock Set 1 before the running order is revealed and frame scores can be set (0/2 locked in).
                        </>
                      )}
                    </span>
                  </div>
                  {canManageLeague && !bothSet1Locked && (
                    <button
                      type="button"
                      onClick={handleAdminQuickLockBoth}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs whitespace-nowrap shadow transition"
                    >
                      Admin: Lock Both &amp; Begin
                    </button>
                  )}
                </div>
              )}
              <div className="space-y-2.5">
                {setFrames.map((frame) => {
                  const { homePlayerId, awayPlayerId } = getFramePlayers(
                    lineups,
                    frame
                  );
                  const breaker = getFrameBreaker(
                    fixture.lagWinner,
                    frame.frameNumber
                  );
                  const hideHome =
                    frame.setNumber === 1 && !bothSet1Locked && !canSignHome;
                  const hideAway =
                    frame.setNumber === 1 && !bothSet1Locked && !canSignAway;

                  const isByeFrame =
                    homePlayerId === 'BYE' || awayPlayerId === 'BYE';

                  return (
                    <div
                      key={frame.frameNumber}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4 transition hover:border-slate-700"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                        <span className="font-bold uppercase tracking-wider text-slate-300">
                          Set {frame.setNumber} • Game {frame.gameInSet}{' '}
                          <span className="text-slate-500">
                            (Frame #{frame.frameNumber})
                          </span>
                        </span>
                        <div className="flex items-center gap-2">
                          {isKnockout && !playAllFrames && isKnockoutDecided && !frame.winner && (
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-semibold text-[10px]">
                              Not required (Decided at 8)
                            </span>
                          )}
                          {isByeFrame && (
                            <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                              Auto BYE Rule
                            </span>
                          )}
                          {frame.dish && (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                              ★ DISH
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {/* Home Player Button */}
                        <button
                          type="button"
                          disabled={!canRecordFrame(frame.frameNumber)}
                          onClick={() =>
                            handleFrameWinner(frame.frameNumber, 'home')
                          }
                          className={`flex items-center justify-between p-3 rounded-xl border text-left transition ${
                            frame.winner === 'home'
                              ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-sm'
                              : frame.winner === 'away'
                              ? 'bg-slate-950/60 border-slate-800/80 text-slate-400'
                              : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 text-xs font-bold flex items-center justify-center text-slate-300 shrink-0">
                              {frame.homeSlot}
                            </span>
                            {breaker === 'home' && (
                              <span
                                className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black shrink-0"
                                title="Breaks in this frame (X)"
                              >
                                X BREAK
                              </span>
                            )}
                            <span className="font-bold text-sm truncate">
                              {getPlayerName(homePlayerId, hideHome)}
                            </span>
                          </div>
                          <span
                            className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center shrink-0 ${
                              frame.winner === 'home'
                                ? 'bg-emerald-500 text-slate-950'
                                : frame.winner === 'away'
                                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {frame.winner === 'home'
                              ? 'W'
                              : frame.winner === 'away'
                              ? 'L'
                              : '–'}
                          </span>
                        </button>

                        {/* Away Player Button */}
                        <button
                          type="button"
                          disabled={!canRecordFrame(frame.frameNumber)}
                          onClick={() =>
                            handleFrameWinner(frame.frameNumber, 'away')
                          }
                          className={`flex items-center justify-between p-3 rounded-xl border text-left transition ${
                            frame.winner === 'away'
                              ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-sm'
                              : frame.winner === 'home'
                              ? 'bg-slate-950/60 border-slate-800/80 text-slate-400'
                              : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 text-xs font-bold flex items-center justify-center text-slate-300 shrink-0">
                              {frame.awaySlot}
                            </span>
                            {breaker === 'away' && (
                              <span
                                className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black shrink-0"
                                title="Breaks in this frame (X)"
                              >
                                X BREAK
                              </span>
                            )}
                            <span className="font-bold text-sm truncate">
                              {getPlayerName(awayPlayerId, hideAway)}
                            </span>
                          </div>
                          <span
                            className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center shrink-0 ${
                              frame.winner === 'away'
                                ? 'bg-emerald-500 text-slate-950'
                                : frame.winner === 'home'
                                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {frame.winner === 'away'
                              ? 'W'
                              : frame.winner === 'home'
                              ? 'L'
                              : '–'}
                          </span>
                        </button>
                      </div>

                      {/* Dish toggle when a winner is recorded */}
                      {frame.winner && !isByeFrame && canRecordFrame(frame.frameNumber) && (
                        <div className="mt-2.5 pt-2 border-t border-slate-800/70 flex items-center justify-end gap-2">
                          <span className="text-[11px] text-slate-400 mr-auto">
                            Did the frame winner dish / reverse dish?
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleDish(frame.frameNumber)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold border transition ${
                              frame.dish
                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            {frame.dish
                              ? '✓ Dish Recorded (Yes)'
                              : 'Mark Dish / Reverse Dish'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Classic Paper Result Card View (replicates the physical Brighton Pool League Result Card) */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 text-center">
                <div className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                  City of Brighton and Hove Pool League
                </div>
                <div className="text-base font-black text-white mt-0.5">
                  {isKnockout
                    ? `${knockoutDisplay} Scorecard — ${homeTeam.name} vs ${awayTeam.name}`
                    : `Official Result Scorecard — ${homeTeam.name} vs ${awayTeam.name}`}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                      <th className="py-2 px-2 text-left">Set</th>
                      <th className="py-2 px-2 text-center">Break</th>
                      <th className="py-2 px-2 text-center">#</th>
                      <th className="py-2 px-3 text-left">Home Player</th>
                      <th className="py-2 px-2 text-center">W/L</th>
                      <th className="py-2 px-2 text-center">W/L</th>
                      <th className="py-2 px-3 text-left">Away Player</th>
                      <th className="py-2 px-2 text-center">#</th>
                      <th className="py-2 px-2 text-center">Break</th>
                      <th className="py-2 px-2 text-center">Dish</th>
                    </tr>
                  </thead>
                  <tbody>
                    {frames.map((frame) => {
                      const { homePlayerId, awayPlayerId } = getFramePlayers(
                        lineups,
                        frame
                      );
                      const breaker = getFrameBreaker(
                        fixture.lagWinner,
                        frame.frameNumber
                      );
                      const isFirstInSet = frame.gameInSet === 1;
                      const isLastInSet = frame.gameInSet === 5;
                      const hideHome =
                        frame.setNumber === 1 && !bothSet1Locked && !canSignHome;
                      const hideAway =
                        frame.setNumber === 1 && !bothSet1Locked && !canSignAway;

                      return (
                        <tr
                          key={frame.frameNumber}
                          className={`border-b ${
                            isLastInSet
                              ? 'border-slate-700'
                              : 'border-slate-800/60'
                          } hover:bg-slate-800/30`}
                        >
                          <td className="py-2 px-2 font-bold text-emerald-400">
                            {isFirstInSet ? `Set ${frame.setNumber}` : ''}
                          </td>
                          <td className="py-2 px-2 text-center font-black text-amber-400">
                            {breaker === 'home' ? 'X' : ''}
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-slate-400">
                            {frame.homeSlot}
                          </td>
                          <td className="py-2 px-3 font-medium text-white">
                            {getPlayerName(homePlayerId, hideHome)}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              disabled={!canRecordFrame(frame.frameNumber)}
                              onClick={() =>
                                handleFrameWinner(frame.frameNumber, 'home')
                              }
                              className={`w-6 h-6 rounded font-black ${
                                frame.winner === 'home'
                                  ? 'bg-emerald-500 text-slate-950'
                                  : frame.winner === 'away'
                                  ? 'text-red-400'
                                  : 'bg-slate-800 text-slate-500'
                              }`}
                            >
                              {frame.winner === 'home'
                                ? 'W'
                                : frame.winner === 'away'
                                ? 'L'
                                : '·'}
                            </button>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              disabled={!canRecordFrame(frame.frameNumber)}
                              onClick={() =>
                                handleFrameWinner(frame.frameNumber, 'away')
                              }
                              className={`w-6 h-6 rounded font-black ${
                                frame.winner === 'away'
                                  ? 'bg-emerald-500 text-slate-950'
                                  : frame.winner === 'home'
                                  ? 'text-red-400'
                                  : 'bg-slate-800 text-slate-500'
                              }`}
                            >
                              {frame.winner === 'away'
                                ? 'W'
                                : frame.winner === 'home'
                                ? 'L'
                                : '·'}
                            </button>
                          </td>
                          <td className="py-2 px-3 font-medium text-white">
                            {getPlayerName(awayPlayerId, hideAway)}
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-slate-400">
                            {frame.awaySlot}
                          </td>
                          <td className="py-2 px-2 text-center font-black text-amber-400">
                            {breaker === 'away' ? 'X' : ''}
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-emerald-400">
                            {frame.dish ? 'Yes' : ''}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-950 font-black text-sm text-white">
                      <td colSpan={4} className="py-3 px-3 text-right">
                        {isKnockout
                          ? `${knockoutDisplay} Result (${playAllFrames ? 'All 15' : 'First to 8'}):`
                          : 'Result (Total 15):'}
                      </td>
                      <td className="py-3 px-2 text-center text-emerald-400 text-base">
                        {score.homeFrames}
                      </td>
                      <td className="py-3 px-2 text-center text-emerald-400 text-base">
                        {score.awayFrames}
                      </td>
                      <td colSpan={4} className="py-3 px-3 text-xs text-slate-400 font-normal">
                        {isKnockout
                          ? isKnockoutDecided
                            ? `Knockout Winner: ${score.matchWinner === 'home' ? homeTeam.name : score.matchWinner === 'away' ? awayTeam.name : 'Tie'}`
                            : playAllFrames
                            ? `${knockoutDisplay} • All 15 frames to be played`
                            : `${knockoutDisplay} • First team to 8 frames wins match`
                          : `Points: ${homeTeam.name} (${score.homePoints} pts) – ${awayTeam.name} (${score.awayPoints} pts)`}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Captain Signatures & League Admin Approval Card (bottom) */}
          {showSignOff && renderSignOffCard()}
        </div>
      </div>

      {/* Admin Confirmation Modal for Incomplete Scorecard Approval */}
      {confirmDialog && (
        <div
          className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setConfirmDialog(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                  confirmDialog.variant === 'warning'
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    : 'bg-red-500/15 border-red-500/30 text-red-400'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="text-base font-bold text-white">
                  {confirmDialog.title}
                </h3>
                <div className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {confirmDialog.message}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold shadow transition ${
                  confirmDialog.variant === 'warning'
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    : 'bg-red-600 hover:bg-red-500 text-white'
                }`}
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

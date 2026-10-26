import React, { useState } from 'react';
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
  X,
} from 'lucide-react';
import {
  Fixture,
  SlotPlayerId,
} from '../types/league';
import {
  calculateMatchScore,
  formatMatchDate,
  getEligiblePlayersForSlot,
  getFrameBreaker,
  getFramePlayers,
  getSetKey,
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
    syncError,
    retryPendingSync,
  } = useLeague();

  const [activeSet, setActiveSet] = useState<1 | 2 | 3>(1);
  const [viewMode, setViewMode] = useState<'mobile' | 'paper'>('mobile');
  const [showLineupEditor, setShowLineupEditor] = useState<boolean>(
    !fixture.homeSet1Locked || !fixture.awaySet1Locked
  );
  // Allows captains sharing a single device at the pub to switch sides during blind Set 1 entry
  const [activeDeviceSide, setActiveDeviceSide] = useState<'home' | 'away'>(
    session.teamId === fixture.awayTeamId ? 'away' : 'home'
  );

  const homeTeam = teams.find((t) => t.id === fixture.homeTeamId);
  const awayTeam = teams.find((t) => t.id === fixture.awayTeamId);
  if (!homeTeam || !awayTeam) return null;

  const homeSquad = players.filter((p) => p.teamId === homeTeam.id && p.active);
  const awaySquad = players.filter((p) => p.teamId === awayTeam.id && p.active);

  const editable = canEditFixture(fixture);
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
  const score = calculateMatchScore(fixture);

  const getPlayerName = (playerId: SlotPlayerId, hidden = false): string => {
    if (hidden) return 'Hidden (Folded Sheet)';
    if (!playerId) return 'Unassigned';
    if (playerId === 'BYE') return 'BYE (No Player)';
    return players.find((p) => p.id === playerId)?.name ?? 'Unknown Player';
  };

  // Blind Set 1 ("Folded Paper") visibility logic:
  // Until both Set 1 lineups are locked, hide the opponent's Set 1 slots unless viewing that side in the editor or Admin
  const bothSet1Locked = fixture.homeSet1Locked && fixture.awaySet1Locked;

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
    if (!editable) return;
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

  const handleToggleLockSet1 = async (side: 'home' | 'away') => {
    if (!editable) return;
    if (side === 'home') {
      await saveFixture(
        {
          ...fixture,
          homeSet1Locked: !fixture.homeSet1Locked,
        },
        'home'
      );
    } else {
      await saveFixture(
        {
          ...fixture,
          awaySet1Locked: !fixture.awaySet1Locked,
        },
        'away'
      );
    }
  };

  const handleFrameWinner = async (
    frameNumber: number,
    winner: 'home' | 'away'
  ) => {
    if (!editable) return;
    const nextFrames = fixture.frames.map((f) => {
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
    if (!editable) return;
    const nextFrames = fixture.frames.map((f) => {
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
          bothSigned && score.completedFrames === 15
            ? 'submitted'
            : fixture.status === 'submitted' && !bothSigned
            ? 'live'
            : fixture.status,
        submittedAt:
          bothSigned && score.completedFrames === 15
            ? new Date().toISOString()
            : fixture.submittedAt,
      },
      side
    );
  };

  const renderLineupSelector = (setNumber: 1 | 2 | 3, side: 'home' | 'away') => {
    const team = side === 'home' ? homeTeam : awayTeam;
    const squad = side === 'home' ? homeSquad : awaySquad;
    const setKey = getSetKey(setNumber);
    const currentSlots = fixture.lineups[setKey][side];
    const isSet1Locked =
      setNumber === 1 &&
      (side === 'home' ? fixture.homeSet1Locked : fixture.awaySet1Locked);

    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
              {side === 'home' ? 'Home Team' : 'Away Team'} • Set {setNumber}{' '}
              {setNumber === 1 ? 'Running Order' : 'Substitutions'}
            </span>
            <h4 className="font-bold text-white text-sm">{team.name}</h4>
          </div>
          {setNumber === 1 && editable && (
            <button
              type="button"
              onClick={() => handleToggleLockSet1(side)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                isSet1Locked
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
              }`}
            >
              {isSet1Locked ? (
                <>
                  <Lock className="w-3.5 h-3.5" /> Locked In
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5" /> Lock Set 1
                </>
              )}
            </button>
          )}
        </div>

        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((slotIdx) => {
            const slotNum = (slotIdx + 1) as 1 | 2 | 3 | 4 | 5;
            const selectedId = currentSlots[slotIdx];
            const eligible = getEligiblePlayersForSlot(
              squad,
              fixture.lineups,
              setNumber,
              side,
              slotIdx
            );
            const canSelectBye = slotNum === 4 || slotNum === 5;
            const prevPlayerId =
              setNumber === 2
                ? fixture.lineups.set1[side][slotIdx]
                : setNumber === 3
                ? fixture.lineups.set2[side][slotIdx]
                : null;
            const isSubbed =
              setNumber > 1 &&
              prevPlayerId &&
              selectedId &&
              prevPlayerId !== selectedId;

            return (
              <div key={slotNum} className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 text-xs font-bold flex items-center justify-center text-slate-300 shrink-0">
                  {slotNum}
                </span>
                <select
                  disabled={!editable || isSet1Locked}
                  value={selectedId ?? ''}
                  onChange={(e) =>
                    handleSlotChange(
                      setNumber,
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
                  {canSelectBye && (
                    <option value="BYE">
                      BYE (No Player - Pos {slotNum})
                    </option>
                  )}
                </select>
                {isSubbed && (
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                    SUB
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const setFrames = fixture.frames.filter((f) => f.setNumber === activeSet);

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
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                {fixture.division} • Week {fixture.weekNumber}
              </span>
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
              {homeTeam.venue} • {formatMatchDate(fixture.matchDate)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <a
            href="https://www.epa.org.uk/stopclock/epa/index.php"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700"
            title="EPA Official Shot Clock (10:30 PM rule)"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Shot Clock</span>
          </a>

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
              <span className="hidden sm:inline">Live Cards</span>
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
              <span className="hidden sm:inline">Result Card</span>
            </button>
          </div>

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
              <div className="text-[11px] text-emerald-400 font-medium mt-0.5">
                {score.homePoints} League Pts
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
              <div className="text-[11px] text-emerald-400 font-medium mt-0.5">
                {score.awayPoints} League Pts
              </div>
            </div>
          </div>

          {/* Lag Winner Bar */}
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

            <button
              type="button"
              onClick={() => setShowLineupEditor((v) => !v)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium border border-slate-700"
            >
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              {showLineupEditor
                ? 'Hide Lineup / Subs Picker'
                : `Edit Set ${activeSet} Lineups / Subs`}
            </button>
          </div>
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto space-y-4 pb-12">
          {syncError && (
            <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{syncError}</span>
              </div>
              <button
                type="button"
                onClick={() => retryPendingSync()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-semibold shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Sync
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
              {showLineupEditor && (
                <div className="space-y-3 bg-slate-900/50 border border-slate-800/80 rounded-2xl p-3 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        {activeSet === 1 ? (
                          <>
                            <EyeOff className="w-4 h-4 text-emerald-400" />
                            Set 1 Blind Lineup Entry ("Folded Score Sheet")
                          </>
                        ) : (
                          <>
                            <Users className="w-4 h-4 text-emerald-400" />
                            Set {activeSet} Player Lineups & Substitutions
                          </>
                        )}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {activeSet === 1
                          ? 'Home captain enters 1–5, then folds/locks before Away captain enters 1–5.'
                          : 'Substitutes take the exact slot number of the player they replace and cannot have played in the previous set.'}
                      </p>
                    </div>

                    {activeSet === 1 && !bothSet1Locked && (
                      <div className="flex rounded-lg bg-slate-950 p-0.5 border border-slate-800 text-xs">
                        <button
                          type="button"
                          onClick={() => setActiveDeviceSide('home')}
                          className={`px-2.5 py-1 rounded-md font-semibold ${
                            activeDeviceSide === 'home'
                              ? 'bg-emerald-600 text-white'
                              : 'text-slate-400'
                          }`}
                        >
                          Home Entry
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveDeviceSide('away')}
                          className={`px-2.5 py-1 rounded-md font-semibold ${
                            activeDeviceSide === 'away'
                              ? 'bg-emerald-600 text-white'
                              : 'text-slate-400'
                          }`}
                        >
                          Away Entry
                        </button>
                      </div>
                    )}
                  </div>

                  {activeSet === 1 && !bothSet1Locked && !canManageLeague ? (
                    <div>{renderLineupSelector(1, activeDeviceSide)}</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {renderLineupSelector(activeSet, 'home')}
                      {renderLineupSelector(activeSet, 'away')}
                    </div>
                  )}
                </div>
              )}

              {/* 5 Frame Cards for Active Set */}
              <div className="space-y-2.5">
                {setFrames.map((frame) => {
                  const { homePlayerId, awayPlayerId } = getFramePlayers(
                    fixture.lineups,
                    frame
                  );
                  const breaker = getFrameBreaker(
                    fixture.lagWinner,
                    frame.frameNumber
                  );
                  const hideHome =
                    frame.setNumber === 1 &&
                    !bothSet1Locked &&
                    !fixture.homeSet1Locked &&
                    !canManageLeague;
                  const hideAway =
                    frame.setNumber === 1 &&
                    !bothSet1Locked &&
                    !fixture.awaySet1Locked &&
                    !canManageLeague;

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
                          disabled={!editable}
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
                          disabled={!editable}
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
                      {frame.winner && !isByeFrame && editable && (
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
                  Official Result Card — {homeTeam.name} vs {awayTeam.name}
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
                    {fixture.frames.map((frame) => {
                      const { homePlayerId, awayPlayerId } = getFramePlayers(
                        fixture.lineups,
                        frame
                      );
                      const breaker = getFrameBreaker(
                        fixture.lagWinner,
                        frame.frameNumber
                      );
                      const isFirstInSet = frame.gameInSet === 1;
                      const isLastInSet = frame.gameInSet === 5;

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
                            {getPlayerName(homePlayerId)}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              disabled={!editable}
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
                              disabled={!editable}
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
                            {getPlayerName(awayPlayerId)}
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
                        Result (Total 15):
                      </td>
                      <td className="py-3 px-2 text-center text-emerald-400 text-base">
                        {score.homeFrames}
                      </td>
                      <td className="py-3 px-2 text-center text-emerald-400 text-base">
                        {score.awayFrames}
                      </td>
                      <td colSpan={4} className="py-3 px-3 text-xs text-slate-400 font-normal">
                        Points: {homeTeam.name} ({score.homePoints} pts) –{' '}
                        {awayTeam.name} ({score.awayPoints} pts)
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Captain Signatures & League Admin Approval Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-white">
                  Captain Sign-Off & Result Submission
                </h4>
                <p className="text-xs text-slate-400">
                  Both captains sign off when all 15 frames are complete ({score.completedFrames}/15 recorded).
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
                <span className="text-xs text-slate-400">
                  League Admin Controls:
                </span>
                <div className="flex items-center gap-2">
                  {fixture.status !== 'approved' ? (
                    <button
                      type="button"
                      onClick={() => approveFixture(fixture.id)}
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
        </div>
      </div>
    </div>
  );
};

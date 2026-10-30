import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  EyeOff,
  FileSpreadsheet,
  Loader2,
  Lock,
  Pencil,
  PenLine,
  RefreshCw,
  RotateCcw,
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
  MatchLineups,
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
  getSubstitutionsMade,
  isKnockoutFixture,
  isSlotSubstituted,
  isSubsLocked,
  isSubsUnlockRequested,
  isSubsPendingApproval,
  syncDefaultSubsequentSets,
} from '../utils/leagueEngine';
import { useLeague } from '../context/LeagueContext';
import { ExportScorecardModal } from './ExportScorecardModal';

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
    seasons,
    fixtures,
    session,
    canEditFixture,
    canManageLeague,
    saveFixture,
    approveFixture,
    reopenFixture,
    isOnline,
    isSyncing,
    syncError,
    retryPendingSync,
  } = useLeague();

  const isLoggedIn = session.role === 'captain' || session.role === 'admin';
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isFirstMount = useRef<boolean>(true);
  const [activeSet, setActiveSet] = useState<1 | 2 | 3>(1);
  const [viewMode, setViewMode] = useState<'mobile' | 'paper'>(() =>
    isLoggedIn ? 'mobile' : 'paper'
  );
  const [showExportModal, setShowExportModal] = useState<boolean>(false);

  const handleSwitchSet = (targetSet: 1 | 2 | 3) => {
    setActiveSet(targetSet);
    setSubOutSlotBySide({ home: '', away: '' });
    setSubInPlayerBySide({ home: '', away: '' });
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    // Ensures scrolling to top succeeds even after Set 1 banners unmount and layout shifts
    const timer = setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 40);
    return () => clearTimeout(timer);
  }, [activeSet]);

  useEffect(() => {
    if (!isLoggedIn) {
      setViewMode('paper');
    }
  }, [fixture.id, isLoggedIn]);

  // Prevent background page from scrolling or leaking touch gestures while scorecard is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalOverscroll = document.body.style.overscrollBehavior;
    const originalTouchAction = document.body.style.touchAction;

    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.overscrollBehavior = originalOverscroll;
      document.body.style.touchAction = originalTouchAction;
    };
  }, []);
  const [showLineupEditorBySet, setShowLineupEditorBySet] = useState<
    Record<1 | 2 | 3, boolean>
  >({
    1: !fixture.homeSet1Locked || !fixture.awaySet1Locked,
    2: false,
    3: false,
  });
  const showLineupEditor = showLineupEditorBySet[activeSet];
  const setShowLineupEditor = useCallback(
    (
      value: boolean | ((prev: boolean) => boolean),
      targetSet?: 1 | 2 | 3
    ) => {
      setShowLineupEditorBySet((prev) => {
        const setKey = targetSet ?? activeSet;
        const currentVal = prev[setKey];
        const nextVal = typeof value === 'function' ? value(currentVal) : value;
        return {
          ...prev,
          [setKey]: nextVal,
        };
      });
    },
    [activeSet]
  );
  const [isChangingLagWinner, setIsChangingLagWinner] = useState(false);
  const [subOutSlotBySide, setSubOutSlotBySide] = useState<{
    home: number | '';
    away: number | '';
  }>({ home: '', away: '' });
  const [subInPlayerBySide, setSubInPlayerBySide] = useState<{
    home: string;
    away: string;
  }>({ home: '', away: '' });

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

  const isSignedByAny =
    Boolean(fixture.homeCaptainSigned || fixture.awayCaptainSigned);
  const isSignedByBoth =
    Boolean(fixture.homeCaptainSigned && fixture.awayCaptainSigned);
  const prevSignedByBothRef = useRef<boolean>(isSignedByBoth);
  const isMatchLockedBySignature = !canManageLeague && isSignedByAny;

  const canSignHome =
    canManageLeague ||
    (session.role === 'captain' &&
      session.teamId === fixture.homeTeamId &&
      fixture.status !== 'submitted' &&
      fixture.status !== 'approved');
  const canSignAway =
    canManageLeague ||
    (session.role === 'captain' &&
      session.teamId === fixture.awayTeamId &&
      fixture.status !== 'submitted' &&
      fixture.status !== 'approved');
  const canEditSide = (side: 'home' | 'away'): boolean => {
    if (isMatchLockedBySignature) return false;
    return side === 'home' ? canSignHome : canSignAway;
  };

  const mySide: 'home' | 'away' | null =
    session.role === 'captain'
      ? session.teamId === fixture.homeTeamId
        ? 'home'
        : session.teamId === fixture.awayTeamId
        ? 'away'
        : null
      : null;
  const otherSide: 'home' | 'away' | null =
    mySide === 'home' ? 'away' : mySide === 'away' ? 'home' : null;
  const otherTeamName =
    otherSide === 'home'
      ? homeTeam.name
      : otherSide === 'away'
      ? awayTeam.name
      : 'Opponent';
  const myTeamName =
    mySide === 'home'
      ? homeTeam.name
      : mySide === 'away'
      ? awayTeam.name
      : 'Your Team';

  const changesLockedMessage = useMemo(() => {
    if (
      !isSignedByAny ||
      fixture.status === 'submitted' ||
      fixture.status === 'approved'
    ) {
      return null;
    }

    if (isSignedByBoth) {
      return 'To make changes, both captains must unsign';
    }

    // Exactly 1 captain has signed
    const homeSigned = Boolean(fixture.homeCaptainSigned);
    const awaySigned = Boolean(fixture.awayCaptainSigned);

    if (mySide === 'home') {
      if (homeSigned) {
        // I have signed, waiting for away
        return `Waiting for ${awayTeam.name} captain to sign (to make changes, you must unsign)`;
      } else {
        // Away signed, waiting for me
        return `Waiting for you to sign (to make changes, ${awayTeam.name} captain must unsign)`;
      }
    }

    if (mySide === 'away') {
      if (awaySigned) {
        // I have signed, waiting for home
        return `Waiting for ${homeTeam.name} captain to sign (to make changes, you must unsign)`;
      } else {
        // Home signed, waiting for me
        return `Waiting for you to sign (to make changes, ${homeTeam.name} captain must unsign)`;
      }
    }

    // Admin or neutral viewing
    if (homeSigned) {
      return `Waiting for ${awayTeam.name} captain to sign (to make changes, ${homeTeam.name} captain must unsign)`;
    } else {
      return `Waiting for ${homeTeam.name} captain to sign (to make changes, ${awayTeam.name} captain must unsign)`;
    }
  }, [
    isSignedByAny,
    isSignedByBoth,
    fixture.status,
    fixture.homeCaptainSigned,
    fixture.awayCaptainSigned,
    mySide,
    homeTeam.name,
    awayTeam.name,
  ]);

  // Automatically open the lineup editor and switch to Set 1 if either captain requests changes
  useEffect(() => {
    const hasUnlockRequest = Boolean(
      fixture.lineups.unlockRequested?.home ||
      fixture.lineups.unlockRequested?.away
    );
    if (hasUnlockRequest) {
      setShowLineupEditorBySet((prev) => ({ ...prev, 1: true }));
      setActiveSet(1);
    }
  }, [
    fixture.lineups.unlockRequested?.home,
    fixture.lineups.unlockRequested?.away,
  ]);

  // Auto-close lineup editor if a captain signs
  useEffect(() => {
    if (isSignedByAny) {
      setShowLineupEditorBySet({ 1: false, 2: false, 3: false });
    }
  }, [isSignedByAny]);

  // When substitutions are approved and locked for my side in Set 2 or Set 3, close the make subs box
  const prevSubsLockedRef = useRef(fixture.lineups.subsLocked);
  useEffect(() => {
    if (!mySide) return;
    ([2, 3] as const).forEach((setNum) => {
      const setKey = `set${setNum}` as 'set2' | 'set3';
      const prevLocked = Boolean(prevSubsLockedRef.current?.[setKey]?.[mySide]);
      const currLocked = Boolean(fixture.lineups.subsLocked?.[setKey]?.[mySide]);
      if (!prevLocked && currLocked) {
        setShowLineupEditorBySet((prev) => ({ ...prev, [setNum]: false }));
      }
    });
    prevSubsLockedRef.current = fixture.lineups.subsLocked;
  }, [
    mySide,
    fixture.lineups.subsLocked?.set2?.home,
    fixture.lineups.subsLocked?.set2?.away,
    fixture.lineups.subsLocked?.set3?.home,
    fixture.lineups.subsLocked?.set3?.away,
  ]);

  // Race condition protection: if the Finish & Submit dialog is open but a captain unsigns, cancel dialog immediately
  useEffect(() => {
    if (
      confirmDialog &&
      confirmDialog.confirmLabel === 'Finish & Submit Match' &&
      (!fixture.homeCaptainSigned || !fixture.awayCaptainSigned)
    ) {
      setConfirmDialog({
        title: 'Submission Cancelled',
        message: (
          <div className="space-y-2 text-slate-300">
            <p>
              A captain unsigned the match while the submission prompt was open.
            </p>
            <p className="text-amber-300 text-xs font-semibold">
              Both captains must be signed before the match can be submitted.
            </p>
          </div>
        ),
        confirmLabel: 'OK',
        variant: 'warning',
        onConfirm: () => {},
      });
    }
  }, [fixture.homeCaptainSigned, fixture.awayCaptainSigned, confirmDialog]);

  const score = calculateMatchScore({ ...fixture, frames, lineups });

  const getPlayerName = (playerId: SlotPlayerId, hidden = false): string => {
    if (hidden) return '';
    if (!playerId) return '';
    if (playerId === 'BYE') return 'No Player (BYE)';
    return players.find((p) => p.id === playerId)?.name ?? '';
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
  // When a captain signs, further changes by captains are locked.
  // In Knockout matches with first-to-8 rules, unplayed frames are locked once either team reaches 8 frames.
  const canRecordFrame = (frameNumber: number): boolean => {
    if (!editable || !bothSet1Locked || isMatchLockedBySignature) return false;
    const frame = frames.find((f) => f.frameNumber === frameNumber);
    if (!frame) return false;
    // In first-to-8 knockout matches, once a team has reached 8 frames, unrecorded frames cannot be played
    if (isKnockout && !playAllFrames && isKnockoutDecided && !frame.winner) {
      return false;
    }
    // If substitutions are pending approval for this set, frames cannot be recorded until approved
    if (
      frame.setNumber > 1 &&
      (isSubsPendingApproval(lineups, frame.setNumber, 'home') ||
        isSubsPendingApproval(lineups, frame.setNumber, 'away'))
    ) {
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

    setShowLineupEditor(false, 1);
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
    if (!editable || isMatchLockedBySignature) return;
    await saveFixture(
      {
        ...fixture,
        lagWinner: winner,
      },
      'frames'
    );
  };

  const getLagBreakCount = (side: 'home' | 'away'): string | null => {
    if (!fixture.lagWinner) return null;
    const isWinner = fixture.lagWinner === side;
    if (isKnockout && !playAllFrames) {
      return isWinner ? '(Breaks 1st)' : '(Breaks 2nd)';
    }
    return isWinner ? '(8 breaks)' : '(7 breaks)';
  };

  const handleSlotChange = async (
    setNumber: 1 | 2 | 3,
    side: 'home' | 'away',
    slotIndex: number,
    value: SlotPlayerId
  ) => {
    if (!editable || !canEditSide(side)) return;
    if (
      setNumber > 1 &&
      isSubsLocked(fixture.lineups, setNumber, side) &&
      !canManageLeague
    ) {
      return;
    }
    const setKey = getSetKey(setNumber);
    const nextLineups = structuredClone(fixture.lineups);

    // Rule 9: BYE is only allowed in positions 4 and 5 (cascading from position 5 downwards).
    // Positions 1-3 can NEVER be a BYE.
    if (value === 'BYE') {
      if (slotIndex < 3) return; // Disallow BYE in positions 1, 2, 3
      nextLineups[setKey][side][slotIndex] = 'BYE';
      if (slotIndex === 3) {
        // Position 4 can only be BYE if Position 5 is also BYE (team of 3)
        nextLineups[setKey][side][4] = 'BYE';
      }
    } else {
      nextLineups[setKey][side][slotIndex] = value;
      // If a real player is assigned to Position 5, Position 4 cannot remain a BYE
      if (slotIndex === 4 && nextLineups[setKey][side][3] === 'BYE' && value !== null) {
        nextLineups[setKey][side][3] = null;
      }
    }

    // If editing Set 1 or Set 2, also cascade to subsequent sets if they were still matching or null
    if (setNumber === 1) {
      for (let i = 0; i < 5; i++) {
        const val = nextLineups.set1[side][i];
        if (
          nextLineups.set2[side][i] === null ||
          nextLineups.set2[side][i] === fixture.lineups.set1[side][i]
        ) {
          nextLineups.set2[side][i] = val;
        }
        if (
          nextLineups.set3[side][i] === null ||
          nextLineups.set3[side][i] === fixture.lineups.set1[side][i]
        ) {
          nextLineups.set3[side][i] = val;
        }
      }
    } else if (setNumber === 2) {
      const s3Locked = Boolean(fixture.lineups.subsLocked?.set3?.[side]);
      const s3Pending = Boolean(fixture.lineups.subsPendingApproval?.set3?.[side]);
      if (!s3Locked && !s3Pending) {
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
      if (nextLocked) {
        setShowLineupEditor(false, 1);
      }
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
      if (nextLocked) {
        setShowLineupEditor(false, 1);
      }
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

  const handleConfirmSubs = async (
    setNumber: 2 | 3,
    side: 'home' | 'away'
  ) => {
    if (!editable || !canEditSide(side)) return;
    const setKey = `set${setNumber}` as 'set2' | 'set3';
    const nextLineups = structuredClone(fixture.lineups);
    if (!nextLineups.subsPendingApproval) {
      nextLineups.subsPendingApproval = { set2: {}, set3: {} };
    }
    if (!nextLineups.subsPendingApproval[setKey]) {
      nextLineups.subsPendingApproval[setKey] = {};
    }
    nextLineups.subsPendingApproval[setKey]![side] = true;

    if (nextLineups.subsUnlockRequested?.[setKey]) {
      nextLineups.subsUnlockRequested[setKey]![side] = false;
    }

    // If confirming Set 2 subs, cascade to Set 3 if Set 3 has not been customized/locked
    if (setNumber === 2) {
      const s3Locked = Boolean(nextLineups.subsLocked?.set3?.[side]);
      const s3Pending = Boolean(nextLineups.subsPendingApproval?.set3?.[side]);
      if (!s3Locked && !s3Pending) {
        nextLineups.set3[side] = [...nextLineups.set2[side]] as MatchLineups['set3']['home'];
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

  const handleCancelSubsPendingApproval = async (
    setNumber: 2 | 3,
    side: 'home' | 'away'
  ) => {
    if (!editable || !canEditSide(side)) return;
    const setKey = `set${setNumber}` as 'set2' | 'set3';
    const nextLineups = structuredClone(fixture.lineups);
    if (nextLineups.subsPendingApproval?.[setKey]) {
      nextLineups.subsPendingApproval[setKey]![side] = false;
    }
    // Revert the slots back to the previous set
    const prevSlots =
      setNumber === 2
        ? fixture.lineups.set1[side]
        : fixture.lineups.set2[side];
    nextLineups[setKey][side] = [...prevSlots] as MatchLineups['set2']['home'];

    // If cancelling Set 2 subs, also revert Set 3 if Set 3 was not customized/locked
    if (setNumber === 2) {
      const s3Locked = Boolean(nextLineups.subsLocked?.set3?.[side]);
      const s3Pending = Boolean(nextLineups.subsPendingApproval?.set3?.[side]);
      if (!s3Locked && !s3Pending) {
        nextLineups.set3[side] = [...prevSlots] as MatchLineups['set3']['home'];
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

  const handleApproveSubs = async (
    setNumber: 2 | 3,
    sideToApprove: 'home' | 'away'
  ) => {
    const setKey = `set${setNumber}` as 'set2' | 'set3';
    const nextLineups = structuredClone(fixture.lineups);
    if (!nextLineups.subsLocked) {
      nextLineups.subsLocked = { set2: {}, set3: {} };
    }
    if (!nextLineups.subsLocked[setKey]) {
      nextLineups.subsLocked[setKey] = {};
    }
    nextLineups.subsLocked[setKey]![sideToApprove] = true;

    if (!nextLineups.subsPendingApproval) {
      nextLineups.subsPendingApproval = { set2: {}, set3: {} };
    }
    if (!nextLineups.subsPendingApproval[setKey]) {
      nextLineups.subsPendingApproval[setKey] = {};
    }
    nextLineups.subsPendingApproval[setKey]![sideToApprove] = false;

    // If approving Set 2 subs, cascade to Set 3 if Set 3 has not been customized/locked
    if (setNumber === 2) {
      const s3Locked = Boolean(nextLineups.subsLocked?.set3?.[sideToApprove]);
      const s3Pending = Boolean(nextLineups.subsPendingApproval?.set3?.[sideToApprove]);
      if (!s3Locked && !s3Pending) {
        nextLineups.set3[sideToApprove] = [...nextLineups.set2[sideToApprove]] as MatchLineups['set3']['home'];
      }
    }

    setShowLineupEditorBySet((prev) => ({ ...prev, [setNumber]: false }));
    await saveFixture(
      {
        ...fixture,
        lineups: nextLineups,
      },
      mySide || sideToApprove
    );
  };

  const handleRequestSubsUnlock = async (
    setNumber: 2 | 3,
    side: 'home' | 'away'
  ) => {
    if (!editable || !canEditSide(side)) return;
    const setKey = `set${setNumber}` as 'set2' | 'set3';
    const nextLineups = structuredClone(fixture.lineups);
    if (!nextLineups.subsUnlockRequested) {
      nextLineups.subsUnlockRequested = { set2: {}, set3: {} };
    }
    if (!nextLineups.subsUnlockRequested[setKey]) {
      nextLineups.subsUnlockRequested[setKey] = {};
    }
    nextLineups.subsUnlockRequested[setKey]![side] = true;

    await saveFixture(
      {
        ...fixture,
        lineups: nextLineups,
      },
      side
    );
  };

  const handleCancelSubsUnlockRequest = async (
    setNumber: 2 | 3,
    side: 'home' | 'away'
  ) => {
    if (!editable || !canEditSide(side)) return;
    const setKey = `set${setNumber}` as 'set2' | 'set3';
    const nextLineups = structuredClone(fixture.lineups);
    if (nextLineups.subsUnlockRequested?.[setKey]) {
      nextLineups.subsUnlockRequested[setKey]![side] = false;
    }

    await saveFixture(
      {
        ...fixture,
        lineups: nextLineups,
      },
      side
    );
  };

  const handleAllowSubsUnlock = async (
    setNumber: 2 | 3,
    sideToUnlock: 'home' | 'away'
  ) => {
    const setKey = `set${setNumber}` as 'set2' | 'set3';
    const nextLineups = structuredClone(fixture.lineups);
    if (!nextLineups.subsLocked) {
      nextLineups.subsLocked = { set2: {}, set3: {} };
    }
    if (!nextLineups.subsLocked[setKey]) {
      nextLineups.subsLocked[setKey] = {};
    }
    nextLineups.subsLocked[setKey]![sideToUnlock] = false;

    if (nextLineups.subsUnlockRequested?.[setKey]) {
      nextLineups.subsUnlockRequested[setKey]![sideToUnlock] = false;
    }

    setShowLineupEditor(true, setNumber);
    await saveFixture(
      {
        ...fixture,
        lineups: nextLineups,
      },
      mySide || sideToUnlock
    );
  };

  const handleAdminUnlockSubs = async (
    setNumber: 2 | 3,
    side: 'home' | 'away'
  ) => {
    if (!canManageLeague) return;
    const setKey = `set${setNumber}` as 'set2' | 'set3';
    const nextLineups = structuredClone(fixture.lineups);
    if (nextLineups.subsLocked?.[setKey]) {
      nextLineups.subsLocked[setKey]![side] = false;
    }
    if (nextLineups.subsUnlockRequested?.[setKey]) {
      nextLineups.subsUnlockRequested[setKey]![side] = false;
    }
    if (nextLineups.subsPendingApproval?.[setKey]) {
      nextLineups.subsPendingApproval[setKey]![side] = false;
    }
    await saveFixture(
      {
        ...fixture,
        lineups: nextLineups,
      },
      side
    );
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
    if (fixture.status === 'submitted' || fixture.status === 'approved') return;
    if (!isMatchComplete && !canManageLeague) return;
    if (side === 'home' && !canSignHome) return;
    if (side === 'away' && !canSignAway) return;
    const nextHomeSigned =
      side === 'home' ? !fixture.homeCaptainSigned : fixture.homeCaptainSigned;
    const nextAwaySigned =
      side === 'away' ? !fixture.awayCaptainSigned : fixture.awayCaptainSigned;

    await saveFixture(
      {
        ...fixture,
        homeCaptainSigned: nextHomeSigned,
        awayCaptainSigned: nextAwaySigned,
      },
      side
    );
  };

  const handleFinishMatch = () => {
    // Guard against race conditions: verify both signatures exist
    const current = fixtures.find((f) => f.id === fixture.id) || fixture;
    if (!current.homeCaptainSigned || !current.awayCaptainSigned) {
      return;
    }

    setConfirmDialog({
      title: 'Finish & Submit Match Result?',
      message: (
        <div className="space-y-3">
          <p className="text-slate-200">
            Submit the official match result between{' '}
            <strong className="text-white">{homeTeam.name}</strong> ({score.homeFrames}) and{' '}
            <strong className="text-white">{awayTeam.name}</strong> ({score.awayFrames})?
          </p>
          <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              Once this match has been submitted, changes can only be made by league admins. If you need to make changes before submitting, both captains need to unsign.
            </span>
          </div>
        </div>
      ),
      confirmLabel: 'Finish & Submit Match',
      variant: 'warning',
      onConfirm: async () => {
        // Guard against race condition: ensure both captains are still signed at the moment of submission
        const latest = fixtures.find((f) => f.id === fixture.id) || fixture;
        if (!latest.homeCaptainSigned || !latest.awayCaptainSigned) {
          setConfirmDialog({
            title: 'Cannot Submit Match',
            message: (
              <div className="space-y-2 text-slate-300">
                <p>
                  Submission cancelled: One of the captains has unsigned the match.
                </p>
                <p className="text-amber-300 text-xs font-semibold">
                  Both captains must have their signature recorded to submit the match.
                </p>
              </div>
            ),
            confirmLabel: 'OK',
            variant: 'warning',
            onConfirm: () => {},
          });
          return;
        }

        await saveFixture({
          ...latest,
          status: 'submitted',
          submittedAt: new Date().toISOString(),
        });
      },
    });
  };

  // Auto-prompt finish match modal for both captains as soon as the 2nd captain signs
  useEffect(() => {
    const wasSignedByBoth = prevSignedByBothRef.current;
    prevSignedByBothRef.current = isSignedByBoth;

    if (
      !wasSignedByBoth &&
      isSignedByBoth &&
      fixture.status !== 'submitted' &&
      fixture.status !== 'approved' &&
      (canSignHome || canSignAway || canManageLeague)
    ) {
      handleFinishMatch();
    }
  }, [
    isSignedByBoth,
    fixture.status,
    canSignHome,
    canSignAway,
    canManageLeague,
    handleFinishMatch,
  ]);

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
    const hideSideSlots = !bothSet1Locked && !sideEditable;

    const otherSide = side === 'home' ? 'away' : 'home';
    const myUnlockReq = Boolean(fixture.lineups.unlockRequested?.[side]);
    const otherUnlockReq = Boolean(
      fixture.lineups.unlockRequested?.[otherSide]
    );

    const isSubsConfirmedAndLocked =
      setNumber > 1 && isSubsLocked(fixture.lineups, setNumber, side);
    const mySubsUnlockReq =
      setNumber > 1 && isSubsUnlockRequested(fixture.lineups, setNumber, side);
    const isPendingApproval =
      setNumber > 1 && isSubsPendingApproval(fixture.lineups, setNumber, side);
    const subsMade =
      setNumber > 1
        ? getSubstitutionsMade(fixture.lineups, setNumber as 2 | 3, side)
        : [];

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
      currentSlots[subOutSlotIdx] !== 'BYE' &&
      subOutSlotIdx >= 3;

    const isLocked =
      setNumber === 1 ? isSet1Locked : isSubsConfirmedAndLocked;

    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-3">
        {/* Team Card Header */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
              {side === 'home' ? 'Home Team' : 'Away Team'} • Set {setNumber}{' '}
              {setNumber === 1 ? 'Lineup' : 'Substitutions'}
            </span>
            <h4 className="font-bold text-white text-sm">{team.name}</h4>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {setNumber === 1 ? (
              isSet1Locked ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Lineup Confirmed</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Awaiting Lineup</span>
                </span>
              )
            ) : isPendingApproval ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Awaiting Approval</span>
              </span>
            ) : isSubsConfirmedAndLocked ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Lineup Confirmed</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                <Users className="w-3.5 h-3.5" />
                <span>
                  {subsMade.length > 0
                    ? `${subsMade.length} sub${subsMade.length > 1 ? 's' : ''}`
                    : 'No subs'}
                </span>
              </span>
            )}
          </div>
        </div>

        {hideSideSlots ? (
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 text-center space-y-1.5">
            <EyeOff className="w-5 h-5 text-slate-500 mx-auto" />
            <p className="text-xs font-semibold text-slate-300">
              {isSet1Locked
                ? `${team.name} Set 1 Lineup is Confirmed & Hidden`
                : `Awaiting ${team.name} Captain Set 1 Entry`}
            </p>
            <p className="text-[11px] text-slate-500">
              Running order remains hidden until both captains confirm their Set 1 lineups.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* If side is editable and confirmed/locked: render the Confirmed & Locked card */}
            {sideEditable && isLocked && (
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">
                      Set {setNumber} {setNumber === 1 ? 'Lineup' : 'Substitutions'} Confirmed
                    </span>
                  </div>
                  {canManageLeague && (
                    <button
                      type="button"
                      onClick={() =>
                        setNumber === 1
                          ? handleToggleLockSet1(side)
                          : handleAdminUnlockSubs(setNumber as 2 | 3, side)
                      }
                      className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold border border-amber-500/30"
                    >
                      Admin: Unlock
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-300">
                  {setNumber === 1 ? (
                    bothSet1Locked ? (
                      <>Lineup confirmed. Both teams confirmed Set 1 &mdash; running order revealed.</>
                    ) : (
                      <>Lineup confirmed. Waiting for {otherTeam.name} captain to confirm their Set 1 lineup.</>
                    )
                  ) : subsMade.length > 0 ? (
                    <>
                      <strong className="text-emerald-300">
                        {subsMade.length} substitution{subsMade.length > 1 ? 's' : ''} confirmed:
                      </strong>{' '}
                      {subsMade
                        .map(
                          (s) =>
                            `${getPlayerName(s.inPlayerId)} in for ${getPlayerName(s.outPlayerId)} (Pos #${s.slot})`
                        )
                        .join(', ')}
                      .
                    </>
                  ) : (
                    <>Confirmed with no substitutions made (lineup unchanged from Set {setNumber - 1}).</>
                  )}
                </p>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  {setNumber === 1 ? (
                    bothSet1Locked && !canManageLeague ? (
                      myUnlockReq ? (
                        <div className="flex items-center justify-between w-full gap-2">
                          <span className="text-[11px] text-amber-300 flex items-center gap-1.5">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Waiting for {otherTeam.name} captain to allow changes...
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleLockSet1(side)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700"
                          >
                            Cancel Request
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleLockSet1(side)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
                        >
                          <Unlock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Request to Change Lineup</span>
                        </button>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleLockSet1(side)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
                      >
                        <Pencil className="w-3.5 h-3.5 text-slate-400" />
                        <span>Change Lineup</span>
                      </button>
                    )
                  ) : (
                    mySubsUnlockReq ? (
                      <div className="flex items-center justify-between w-full gap-2">
                        <span className="text-[11px] text-amber-300 flex items-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Waiting for {otherTeam.name} captain to allow changes...
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCancelSubsUnlockRequest(setNumber as 2 | 3, side)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700"
                        >
                          Cancel Request
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRequestSubsUnlock(setNumber as 2 | 3, side)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
                      >
                        <Unlock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Request to Change Subs</span>
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            {/* If side is editable and NOT locked: render the Editing / Selection card */}
            {sideEditable && !isLocked && (
              setNumber === 1 ? (
                /* Set 1 Lineup Selection Box */
                <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-2.5">
                  <div className="text-xs font-bold text-emerald-400">
                    Select 1–5 Running Order
                  </div>

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

                      // Rule 9: BYE is only allowed in positions 4 and 5 (cascading from 5 downwards).
                      const canSlotBeBye = slotIdx >= 3;

                      return (
                        <div key={slotNum} className="flex items-center gap-2 min-w-0">
                          <span className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 text-xs font-bold flex items-center justify-center text-slate-300 shrink-0">
                            {slotNum}
                          </span>
                          <select
                            value={selectedId ?? ''}
                            onChange={(e) =>
                              handleSlotChange(
                                1,
                                side,
                                slotIdx,
                                (e.target.value || null) as SlotPlayerId
                              )
                            }
                            className="flex-1 min-w-0 max-w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 truncate"
                          >
                            <option value="">
                              -- Select Position {slotNum} Player --
                            </option>
                            {canSlotBeBye && (
                              <option value="BYE">No Player (BYE)</option>
                            )}
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

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={!set1Complete}
                      onClick={() => handleToggleLockSet1(side)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm</span>
                    </button>
                  </div>
                </div>
              ) : isPendingApproval ? (
                /* Set 2 / Set 3 Pending Approval Card */
                <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5">
                  <div className="flex items-center justify-between w-full gap-2">
                    <span className="text-[11px] text-amber-300 flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Waiting for {otherTeam.name} captain to approve substitutions...
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCancelSubsPendingApproval(setNumber as 2 | 3, side)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition"
                    >
                      Cancel Request
                    </button>
                  </div>
                </div>
              ) : (
                /* Set 2 & Set 3 Substitution Box */
                <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-2.5">
                  <div className="text-xs font-bold text-emerald-400">
                    Make a Set {setNumber} Substitution
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="min-w-0">
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
                        className="w-full min-w-0 max-w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 truncate"
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

                    <div className="min-w-0">
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
                        className="w-full min-w-0 max-w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50 truncate"
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
              )
            )}

            {/* Running Order Summary (shown when Set 1 is locked or for Set 2/3) */}
            {(setNumber > 1 || isSet1Locked || !sideEditable) && (
              <div className="space-y-2">
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
                      setNumber > 1 &&
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
                              {sideEditable && !isSubsConfirmedAndLocked && !isPendingApproval && (
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

                {setNumber > 1 && sideEditable && !isSubsConfirmedAndLocked && !isPendingApproval && subsMade.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleConfirmSubs(setNumber as 2 | 3, side)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const setFrames = frames.filter((f) => f.setNumber === activeSet);

  const showSignOff =
    isLoggedIn &&
    (isMatchComplete ||
      fixture.status === 'submitted' ||
      fixture.status === 'approved');



  const renderLineupChangeRequestBanner = () => {
    if (
      !bothSet1Locked ||
      !otherSide ||
      !fixture.lineups.unlockRequested?.[otherSide]
    ) {
      return null;
    }

    return (
      <div className="bg-amber-500/15 border-2 border-amber-500/50 rounded-2xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-200 shadow-lg animate-in fade-in duration-200">
        <div className="flex items-center gap-2.5 min-w-0">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
          <div>
            <strong className="text-white block text-sm font-bold">
              {otherTeamName} captain requested to change their Set 1 lineup
            </strong>
            <span className="text-slate-300 text-xs">
              Lineups are locked once confirmed. Click &ldquo;Allow Lineup Changes&rdquo; to unlock both teams for editing.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {mySide && (
            <button
              type="button"
              onClick={() => handleToggleLockSet1(mySide)}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4 text-slate-950" />
              <span>Allow Lineup Changes</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderSubsUnlockRequestBanner = () => {
    if (
      activeSet <= 1 ||
      !bothSet1Locked ||
      !otherSide ||
      !isSubsUnlockRequested(fixture.lineups, activeSet, otherSide)
    ) {
      return null;
    }

    return (
      <div className="bg-amber-500/15 border-2 border-amber-500/50 rounded-2xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-200 shadow-lg animate-in fade-in duration-200">
        <div className="flex items-center gap-2.5 min-w-0">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
          <div>
            <strong className="text-white block text-sm font-bold">
              {otherTeamName} captain requested to change their Set {activeSet} substitutions
            </strong>
            <span className="text-slate-300 text-xs">
              Substitutions are locked once confirmed. Click &ldquo;Allow Substitution Changes&rdquo; to unlock their substitutions for editing.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleAllowSubsUnlock(activeSet as 2 | 3, otherSide)}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4 text-slate-950" />
            <span>Allow Substitution Changes</span>
          </button>
        </div>
      </div>
    );
  };

  const renderSubsApprovalRequestBanner = () => {
    if (
      activeSet <= 1 ||
      !bothSet1Locked ||
      !otherSide ||
      !isSubsPendingApproval(fixture.lineups, activeSet, otherSide)
    ) {
      return null;
    }

    const otherSubs = getSubstitutionsMade(
      fixture.lineups,
      activeSet as 2 | 3,
      otherSide
    );

    return (
      <div className="bg-amber-500/15 border-2 border-amber-500/50 rounded-2xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-200 shadow-lg animate-in fade-in duration-200">
        <div className="flex items-center gap-2.5 min-w-0">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
          <div>
            <strong className="text-white block text-sm font-bold">
              {otherTeamName} captain made Set {activeSet} substitution{otherSubs.length > 1 ? 's' : ''}
            </strong>
            <span className="text-slate-300 text-xs">
              {otherSubs.length > 0 ? (
                otherSubs
                  .map(
                    (s) =>
                      `${getPlayerName(s.inPlayerId)} in for ${getPlayerName(s.outPlayerId)} (Pos #${s.slot})`
                  )
                  .join(', ')
              ) : (
                'Lineup unchanged'
              )}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleApproveSubs(activeSet as 2 | 3, otherSide)}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4 text-slate-950" />
            <span>Approve Substitutions</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col overflow-hidden overscroll-none touch-none"
      onTouchMove={(e) => {
        // Prevent background scrolling if touch didn't originate inside the scroll container
        if (
          scrollContainerRef.current &&
          !scrollContainerRef.current.contains(e.target as Node)
        ) {
          if (e.cancelable) {
            e.preventDefault();
          }
        }
      }}
    >
      {/* Top Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-3 sm:px-6 py-3 flex items-center justify-between gap-2 shrink-0 touch-none select-none">
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
                {fixture.status === 'submitted' ? 'Awaiting Approval' : fixture.status}
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
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Logged-In User Session Bar */}
      {isLoggedIn && (
        <div className="bg-slate-950/95 border-b border-slate-800/80 px-3 sm:px-6 py-1.5 flex items-center justify-between gap-2 text-xs shrink-0 select-none">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shrink-0 border bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
              {session.role === 'admin' ? 'Admin' : 'Captain'}
            </span>
            <span className="text-slate-400 text-[11px] shrink-0">
              Logged in:
            </span>
            <span className="font-extrabold text-white text-xs truncate">
              {session.name.replace(/ Captain$/i, '')}
            </span>
          </div>
        </div>
      )}

      {/* Live Scoreboard Banner */}
      <div className="bg-gradient-to-b from-emerald-950/60 to-slate-900 border-b border-slate-800 px-4 py-3 shrink-0 touch-none select-none">
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
        </div>
      </div>


      {/* Main Scrollable Content */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overscroll-contain [overflow-anchor:none] px-3 sm:px-6 py-4 touch-pan-y"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
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
                      onClick={() => handleSwitchSet(setNum)}
                      className={`py-2 px-2 sm:px-3 rounded-lg text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 sm:gap-2 ${
                        activeSet === setNum
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>Set {setNum}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] ${
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

              {/* Action buttons below Set Tabs (Change Lag Winner on Set 1 & Select Lineup / Make Subs) */}
              {((activeSet === 1 && bothSet1Locked && editable && !isMatchLockedBySignature && fixture.lagWinner && !isChangingLagWinner) ||
                (!showLineupEditor &&
                  (canSignHome || canSignAway) &&
                  !isSignedByAny &&
                  fixture.status !== 'submitted' &&
                  fixture.status !== 'approved' &&
                  (activeSet === 1 || bothSet1Locked))) && (
                <div className="flex items-center justify-end gap-2 text-xs py-0.5">
                  {activeSet === 1 && bothSet1Locked && editable && !isMatchLockedBySignature && fixture.lagWinner && !isChangingLagWinner && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsChangingLagWinner(true);
                        setShowLineupEditor(false, 1);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800 shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Change Lag Winner</span>
                    </button>
                  )}

                  {!showLineupEditor &&
                    (canSignHome || canSignAway) &&
                    !isSignedByAny &&
                    fixture.status !== 'submitted' &&
                    fixture.status !== 'approved' &&
                    (activeSet === 1 || bothSet1Locked) &&
                    (() => {
                      const isMySet1Locked =
                        mySide === 'home'
                          ? Boolean(fixture.homeSet1Locked)
                          : mySide === 'away'
                          ? Boolean(fixture.awaySet1Locked)
                          : Boolean(bothSet1Locked);

                      const mySubsCount =
                        activeSet > 1
                          ? mySide
                            ? getSubstitutionsMade(
                                fixture.lineups,
                                activeSet as 2 | 3,
                                mySide
                              ).length
                            : getSubstitutionsMade(
                                fixture.lineups,
                                activeSet as 2 | 3,
                                'home'
                              ).length +
                              getSubstitutionsMade(
                                fixture.lineups,
                                activeSet as 2 | 3,
                                'away'
                              ).length
                          : 0;

                      const actionButtonLabel =
                        activeSet === 1
                          ? isMySet1Locked
                            ? 'Change Lineup'
                            : 'Select Lineup'
                          : mySubsCount > 0
                          ? 'Change Subs'
                          : 'Make Subs';

                      return (
                        <button
                          type="button"
                          onClick={() => {
                            setShowLineupEditor(true);
                            setIsChangingLagWinner(false);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition shadow-sm bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800"
                        >
                          <Users className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{actionButtonLabel}</span>
                        </button>
                      );
                    })()}
                </div>
              )}

              {/* Set 1 Lag Winner Prompt Box (shown when both lineups confirmed and unselected, or when Change Lag Winner is clicked; collapsed when lineup box is open) */}
              {activeSet === 1 && bothSet1Locked && !showLineupEditor && (!fixture.lagWinner || isChangingLagWinner) && (
                <div className="bg-amber-500/15 border-2 border-amber-500/40 rounded-xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-200 shadow-md animate-in fade-in duration-200">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <strong className="text-white block text-sm font-bold">
                        Who won the lag to break first?
                      </strong>
                      <span className="text-slate-300 text-xs">
                        Select which team broke in Frame 1 so break badges appear across all frames.
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {editable && !isMatchLockedBySignature && (
                      <>
                        <button
                          type="button"
                          onClick={async () => {
                            await handleLagChange('home');
                            setIsChangingLagWinner(false);
                          }}
                          className={`px-3.5 py-1.5 rounded-lg font-bold text-xs transition shadow flex items-center gap-1.5 ${
                            fixture.lagWinner === 'home'
                              ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{homeTeam.name}</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await handleLagChange('away');
                            setIsChangingLagWinner(false);
                          }}
                          className={`px-3.5 py-1.5 rounded-lg font-bold text-xs transition shadow flex items-center gap-1.5 ${
                            fixture.lagWinner === 'away'
                              ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{awayTeam.name}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Set 1 Lineup Change Request Banner (appears below buttons and below Who Won the Lag box) */}
              {activeSet === 1 && renderLineupChangeRequestBanner()}

              {/* Set 2 / Set 3 Subs Approval Request Banner (when Make Subs box is EXPANDED: above the editor) */}
              {activeSet > 1 && showLineupEditor && renderSubsApprovalRequestBanner()}

              {/* Set 2 / Set 3 Subs Unlock Request Banner (when Make Subs box is EXPANDED: above the editor) */}
              {activeSet > 1 && showLineupEditor && renderSubsUnlockRequestBanner()}

              {/* Blind Set 1 or Set 2/3 Substitutions Editor */}
              {showLineupEditor &&
                !isSignedByAny &&
                (canSignHome || canSignAway) &&
                (activeSet === 1 || bothSet1Locked) &&
                (() => {
                  const hasConfirmedSet1 =
                    mySide === 'home'
                      ? Boolean(fixture.homeSet1Locked)
                      : mySide === 'away'
                      ? Boolean(fixture.awaySet1Locked)
                      : Boolean(bothSet1Locked || canManageLeague);
                  const canCloseLineupEditor = activeSet > 1 || hasConfirmedSet1;

                  return (
                    <div className="relative space-y-3 bg-slate-900/50 border border-slate-800/80 rounded-2xl p-3 sm:p-4">
                      {canCloseLineupEditor && (
                        <button
                          type="button"
                          onClick={() => setShowLineupEditor(false)}
                          className="absolute top-3 right-3 p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition shadow-sm z-10"
                          title="Close"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}

                      <div className={canCloseLineupEditor ? 'pr-10' : ''}>
                        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                          {activeSet === 1 ? (
                            <>
                              <Users className="w-4 h-4 text-emerald-400" />
                              Set 1 Lineup
                            </>
                          ) : (
                            <>
                              <Users className="w-4 h-4 text-emerald-400" />
                              Set {activeSet} Substitutions
                            </>
                          )}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {activeSet === 1
                            ? 'Each captain selects and confirms their own team’s 1–5 running order. Lineups are revealed once both teams confirm Set 1.'
                            : 'Substitutes take the exact slot number of the player they replace and cannot have played in the previous set.'}
                        </p>
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
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
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
                                      ? 'Lineup Confirmed'
                                      : 'Awaiting Lineup'}
                                  </strong>
                                </span>
                              </div>
                            )}


                          </>
                        );
                      })()}
                    </div>
                  );
                })()}

              {/* Lineup Confirmation Status Banner */}
              {(activeSet === 1 || !bothSet1Locked) && (
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
                    ) : fixture.homeSet1Locked || fixture.awaySet1Locked ? (
                      <Loader2 className="w-4 h-4 text-amber-400 shrink-0 animate-spin" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <span className="leading-snug">
                      {bothSet1Locked ? (
                        <>
                          <strong>Both Set 1 lineups confirmed!</strong> Match running order revealed &amp; frame scoring active.
                        </>
                      ) : fixture.homeSet1Locked && !fixture.awaySet1Locked ? (
                        <>
                          <strong className="text-white">{homeTeam.name}</strong> lineup confirmed (1/2). Waiting for <strong className="text-white">{awayTeam.name}</strong> captain to confirm.
                        </>
                      ) : !fixture.homeSet1Locked && fixture.awaySet1Locked ? (
                        <>
                          <strong className="text-white">{awayTeam.name}</strong> lineup confirmed (1/2). Waiting for <strong className="text-white">{homeTeam.name}</strong> captain to confirm.
                        </>
                      ) : (
                        <>
                          Both captains must confirm their Set 1 lineup before the running order is revealed and frame scores can be set (0/2 confirmed).
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
                      Admin: Confirm Both &amp; Begin
                    </button>
                  )}
                </div>
              )}

              {/* Set 2 / Set 3 Subs Approval Request Banner (when Make Subs box is COLLAPSED) */}
              {activeSet > 1 && !showLineupEditor && renderSubsApprovalRequestBanner()}

              {/* Set 2 / Set 3 Subs Unlock Request Banner (when Make Subs box is COLLAPSED) */}
              {activeSet > 1 && !showLineupEditor && renderSubsUnlockRequestBanner()}

              {/* Set 2 / Set 3 Approved Substitutions Notification Message */}
              {activeSet > 1 &&
                bothSet1Locked &&
                (['home', 'away'] as const).map((side) => {
                  if (!isSubsLocked(fixture.lineups, activeSet, side)) return null;
                  const subs = getSubstitutionsMade(
                    fixture.lineups,
                    activeSet as 2 | 3,
                    side
                  );
                  if (subs.length === 0) return null;
                  const teamName = side === 'home' ? homeTeam.name : awayTeam.name;
                  return (
                    <div
                      key={side}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-2.5 text-xs text-slate-200"
                    >
                      <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <strong className="text-emerald-300 font-bold">
                          {teamName} made Set {activeSet} substitution
                          {subs.length > 1 ? 's' : ''}:
                        </strong>{' '}
                        <span className="text-white">
                          {subs
                            .map(
                              (s) =>
                                `${getPlayerName(s.inPlayerId)} in for ${getPlayerName(
                                  s.outPlayerId
                                )} (Pos #${s.slot})`
                            )
                            .join(', ')}
                        </span>
                      </div>
                    </div>
                  );
                })}

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
                  const hideHome = !bothSet1Locked && !canSignHome;
                  const hideAway = !bothSet1Locked && !canSignAway;

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
                          {frame.dish && (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-[10px]">
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
                            {isSlotSubstituted(
                              lineups,
                              frame.setNumber,
                              'home',
                              frame.homeSlot - 1
                            ) &&
                              !hideHome && (
                                <span
                                  className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black shrink-0"
                                  title="Substitute in this set"
                                >
                                  SUB
                                </span>
                              )}
                            {breaker === 'home' && (
                              <span
                                className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black shrink-0"
                                title="Breaks in this frame"
                              >
                                BREAK
                              </span>
                            )}
                            <span className="font-bold text-sm truncate">
                              {hideHome ? (
                                isLoggedIn ? (
                                  <span title="Hidden" className="inline-flex items-center">
                                    <EyeOff className="w-4 h-4 text-slate-500" />
                                  </span>
                                ) : null
                              ) : (
                                getPlayerName(homePlayerId)
                              )}
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
                            {isSlotSubstituted(
                              lineups,
                              frame.setNumber,
                              'away',
                              frame.awaySlot - 1
                            ) &&
                              !hideAway && (
                                <span
                                  className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black shrink-0"
                                  title="Substitute in this set"
                                >
                                  SUB
                                </span>
                              )}
                            {breaker === 'away' && (
                              <span
                                className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black shrink-0"
                                title="Breaks in this frame"
                              >
                                BREAK
                              </span>
                            )}
                            <span className="font-bold text-sm truncate">
                              {hideAway ? (
                                isLoggedIn ? (
                                  <span title="Hidden" className="inline-flex items-center">
                                    <EyeOff className="w-4 h-4 text-slate-500" />
                                  </span>
                                ) : null
                              ) : (
                                getPlayerName(awayPlayerId)
                              )}
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
                      {frame.winner && !isByeFrame && (() => {
                        const winnerName =
                          frame.winner === 'home'
                            ? getPlayerName(homePlayerId)
                            : getPlayerName(awayPlayerId);
                        const isUsable =
                          editable && !isMatchLockedBySignature && bothSet1Locked;

                        return (
                          <div className="mt-2.5 pt-2 border-t border-slate-800/70 flex items-center justify-end text-xs">
                            <button
                              type="button"
                              disabled={!isUsable}
                              onClick={() => isUsable && handleToggleDish(frame.frameNumber)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition border ${
                                frame.dish
                                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                                  : 'bg-slate-950 border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-600'
                              } ${
                                !isUsable
                                  ? 'opacity-60 cursor-not-allowed hover:text-slate-300 hover:border-slate-700/80'
                                  : ''
                              }`}
                              title={
                                !isUsable
                                  ? isMatchLockedBySignature
                                    ? 'Match is signed. Both captains must unsign to edit dish status.'
                                    : !editable
                                    ? 'Scorecard is in read-only mode'
                                    : 'Lineups must be confirmed first'
                                  : frame.dish
                                  ? 'Click to remove dish'
                                  : `Click if ${winnerName} cleared the table from the break (Dish / Reverse Dish)`
                              }
                            >
                              <Sparkles
                                className={`w-3.5 h-3.5 ${
                                  frame.dish ? 'text-amber-300' : 'text-slate-400'
                                }`}
                              />
                              <span>
                                {frame.dish
                                  ? '★ Dish Recorded'
                                  : 'Dish / Reverse Dish'}
                              </span>
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Set Navigation */}
              <div className="pt-2 flex items-center justify-between gap-3">
                {activeSet > 1 ? (
                  <button
                    type="button"
                    onClick={() => handleSwitchSet((activeSet - 1) as 1 | 2 | 3)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-bold text-xs sm:text-sm transition shadow-sm"
                  >
                    <ChevronLeft className="w-4 h-4 text-emerald-400" />
                    <span>Previous: Set {activeSet - 1}</span>
                  </button>
                ) : (
                  <div />
                )}

                {activeSet < 3 && (
                  <button
                    type="button"
                    onClick={() => handleSwitchSet((activeSet + 1) as 1 | 2 | 3)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md transition ml-auto"
                  >
                    <span>Next: Set {activeSet + 1}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </>
          ) : (
            /* Classic Paper Result Card View (replicates the physical Brighton Pool League Result Card) */
            <div className="space-y-3">
              {renderLineupChangeRequestBanner()}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="bg-slate-950 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-slate-800 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-emerald-400 truncate">
                    City of Brighton and Hove Pool League
                  </div>
                  <div className="text-xs sm:text-base font-black text-white mt-0.5 truncate">
                    {isKnockout
                      ? `${knockoutDisplay} Scorecard — ${homeTeam.name} vs ${awayTeam.name}`
                      : `Official Result Scorecard — ${homeTeam.name} vs ${awayTeam.name}`}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowExportModal(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] sm:text-xs font-bold border border-slate-700 transition shrink-0 shadow-sm"
                  title="Export Scorecard"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Export</span>
                </button>
              </div>

              <div className="w-full overflow-hidden sm:overflow-x-auto">
                <table className="w-full table-fixed text-[11px] sm:text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[10px] sm:text-xs font-semibold">
                      <th className="w-[8%] sm:w-[7%] py-1.5 sm:py-2 px-0.5 sm:px-2 text-left">Set</th>
                      <th className="w-[5%] sm:w-[5%] py-1.5 sm:py-2 px-0.5 text-center" title="Break">
                        <span className="sm:hidden">B</span>
                        <span className="hidden sm:inline">Break</span>
                      </th>
                      <th className="w-[5%] sm:w-[5%] py-1.5 sm:py-2 px-0.5 text-center font-mono">#</th>
                      <th className="w-[26%] sm:w-[28%] py-1.5 sm:py-2 px-1 sm:px-2 text-left">
                        <span className="sm:hidden">Home</span>
                        <span className="hidden sm:inline">Home Player</span>
                      </th>
                      <th className="w-[7%] sm:w-[6%] py-1.5 sm:py-2 px-0.5 text-center">W/L</th>
                      <th className="w-[7%] sm:w-[6%] py-1.5 sm:py-2 px-0.5 text-center">W/L</th>
                      <th className="w-[26%] sm:w-[28%] py-1.5 sm:py-2 px-1 sm:px-2 text-left">
                        <span className="sm:hidden">Away</span>
                        <span className="hidden sm:inline">Away Player</span>
                      </th>
                      <th className="w-[5%] sm:w-[5%] py-1.5 sm:py-2 px-0.5 text-center font-mono">#</th>
                      <th className="w-[5%] sm:w-[5%] py-1.5 sm:py-2 px-0.5 text-center" title="Break">
                        <span className="sm:hidden">B</span>
                        <span className="hidden sm:inline">Break</span>
                      </th>
                      <th className="w-[6%] sm:w-[6%] py-1.5 sm:py-2 px-0.5 sm:px-1 text-center" title="Dish">
                        <span className="sm:hidden">★</span>
                        <span className="hidden sm:inline">Dish</span>
                      </th>
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
                      const hideHome = !bothSet1Locked && !canSignHome;
                      const hideAway = !bothSet1Locked && !canSignAway;

                      return (
                        <tr
                          key={frame.frameNumber}
                          className={`border-b ${
                            isLastInSet
                              ? 'border-slate-700 bg-slate-950/20'
                              : 'border-slate-800/60'
                          } hover:bg-slate-800/30`}
                        >
                          <td className="py-1.5 sm:py-2 px-0.5 sm:px-2 font-bold text-emerald-400 truncate">
                            {isFirstInSet ? (
                              <>
                                <span className="sm:hidden">S{frame.setNumber}</span>
                                <span className="hidden sm:inline">Set {frame.setNumber}</span>
                              </>
                            ) : ''}
                          </td>
                          <td className="py-1.5 sm:py-2 px-0.5 text-center font-black text-amber-400">
                            {breaker === 'home' ? 'X' : ''}
                          </td>
                          <td className="py-1.5 sm:py-2 px-0.5 text-center font-mono text-slate-400">
                            {frame.homeSlot}
                          </td>
                          <td className="py-1.5 sm:py-2 px-1 sm:px-2 font-medium text-white truncate">
                            {hideHome ? (
                              isLoggedIn ? (
                                <span title="Hidden" className="inline-flex items-center align-middle">
                                  <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                                </span>
                              ) : null
                            ) : (
                              <span title={getPlayerName(homePlayerId)}>
                                {getPlayerName(homePlayerId)}
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 sm:py-2 px-0.5 text-center">
                            <button
                              type="button"
                              disabled={!canRecordFrame(frame.frameNumber)}
                              onClick={() =>
                                handleFrameWinner(frame.frameNumber, 'home')
                              }
                              className={`w-5 h-5 sm:w-6 sm:h-6 rounded text-[10px] sm:text-xs font-black inline-flex items-center justify-center transition mx-auto ${
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
                          <td className="py-1.5 sm:py-2 px-0.5 text-center">
                            <button
                              type="button"
                              disabled={!canRecordFrame(frame.frameNumber)}
                              onClick={() =>
                                handleFrameWinner(frame.frameNumber, 'away')
                              }
                              className={`w-5 h-5 sm:w-6 sm:h-6 rounded text-[10px] sm:text-xs font-black inline-flex items-center justify-center transition mx-auto ${
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
                          <td className="py-1.5 sm:py-2 px-1 sm:px-2 font-medium text-white truncate">
                            {hideAway ? (
                              isLoggedIn ? (
                                <span title="Hidden" className="inline-flex items-center align-middle">
                                  <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                                </span>
                              ) : null
                            ) : (
                              <span title={getPlayerName(awayPlayerId)}>
                                {getPlayerName(awayPlayerId)}
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 sm:py-2 px-0.5 text-center font-mono text-slate-400">
                            {frame.awaySlot}
                          </td>
                          <td className="py-1.5 sm:py-2 px-0.5 text-center font-black text-amber-400">
                            {breaker === 'away' ? 'X' : ''}
                          </td>
                          <td className="py-1.5 sm:py-2 px-0.5 sm:px-1 text-center text-xs font-bold text-emerald-400">
                            {editable &&
                            frame.winner &&
                            canRecordFrame(frame.frameNumber) ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleDish(frame.frameNumber)
                                }
                                className={`px-1 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold transition ${
                                  frame.dish
                                    ? 'bg-emerald-600 text-white border border-emerald-500 shadow-sm'
                                    : 'text-transparent hover:text-slate-400 hover:bg-slate-800/80 min-w-4 min-h-4'
                                }`}
                                title={frame.dish ? 'Click to remove dish' : 'Click to record dish'}
                              >
                                {frame.dish ? (
                                  <>
                                    <span className="sm:hidden">★</span>
                                    <span className="hidden sm:inline">★ Dish</span>
                                  </>
                                ) : (
                                  ''
                                )}
                              </button>
                            ) : frame.dish ? (
                              <span className="text-emerald-400 font-bold">
                                <span className="sm:hidden">★</span>
                                <span className="hidden sm:inline">★ Dish</span>
                              </span>
                            ) : (
                              ''
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    {/* Frames Won Row */}
                    <tr className="bg-slate-950 font-black text-xs sm:text-sm text-white border-t border-slate-800">
                      <td colSpan={4} className="py-2.5 sm:py-3 px-1 sm:px-3 text-right">
                        <span className="hidden sm:inline">
                          {isKnockout
                            ? `${knockoutDisplay} Frames:`
                            : 'Frames Won:'}
                        </span>
                        <span className="sm:hidden text-xs font-bold text-slate-300">
                          Frames:
                        </span>
                      </td>
                      <td className="py-2.5 sm:py-3 px-0.5 text-center text-emerald-400 text-sm sm:text-base font-black">
                        {score.homeFrames}
                      </td>
                      <td className="py-2.5 sm:py-3 px-0.5 text-center text-emerald-400 text-sm sm:text-base font-black">
                        {score.awayFrames}
                      </td>
                      <td colSpan={4} className="py-2.5 sm:py-3 px-1 sm:px-2 text-xs text-slate-400 font-normal">
                        {isKnockout && (
                          isKnockoutDecided
                            ? `🏆 ${score.matchWinner === 'home' ? homeTeam.name : score.matchWinner === 'away' ? awayTeam.name : 'Tie'}`
                            : playAllFrames
                            ? 'All 15 frames'
                            : 'First to 8 wins'
                        )}
                      </td>
                    </tr>

                    {/* League Points Banner (Full Width, never cut off) */}
                    {!isKnockout && (
                      <tr className="bg-slate-950/90 border-t border-slate-800/70">
                        <td colSpan={10} className="py-2.5 px-3">
                          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                              Points:
                            </span>
                            <span className="font-bold text-white">
                              {homeTeam.name}:{' '}
                              <span className="text-emerald-400 font-black">
                                {score.homePoints} pts
                              </span>
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="font-bold text-white">
                              {awayTeam.name}:{' '}
                              <span className="text-emerald-400 font-black">
                                {score.awayPoints} pts
                              </span>
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tfoot>
                </table>
              </div>
            </div>
            </div>
          )}


        </div>
      </div>

      {/* Fixed Bottom Captain Sign-Off & Finish Match Section (appears once match is complete for logged-in captains/admin) */}
      {showSignOff && (
        <div className="bg-slate-900/95 border-t border-slate-800 shadow-2xl px-3 sm:px-6 py-2.5 shrink-0 shadow-md">
          <div className="max-w-4xl mx-auto space-y-2">
            {/* Prominent Match Completion Prompt (appears when all 15 frames are complete, before submission) */}
            {fixture.status !== 'submitted' && fixture.status !== 'approved' && (
              <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-amber-500/20 border-2 border-emerald-500/50 rounded-2xl p-3 sm:p-3.5 flex items-center justify-center gap-3 text-center shadow-lg ring-1 ring-emerald-500/30 animate-in fade-in duration-200">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                  <PenLine className="w-4 h-4 text-emerald-300" />
                </div>
                <div className="space-y-0.5 text-left sm:text-center">
                  <div className="text-xs sm:text-sm font-black text-white tracking-wide uppercase flex items-center gap-1.5 justify-start sm:justify-center">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>
                      {isSignedByBoth
                        ? 'Scorecard Signed — Ready to Submit'
                        : 'Please Sign & Submit the Scorecard'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    {isSignedByBoth
                      ? 'Both captains have signed. Click Finish Match below to submit the official result.'
                      : 'Both captains must sign below to confirm the result before finishing the match.'}
                  </div>
                </div>
              </div>
            )}

            {/* Review Scorecard / Make Changes Toggle Button (only before submission) */}
            {fixture.status !== 'submitted' && fixture.status !== 'approved' && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() =>
                    setViewMode(viewMode === 'mobile' ? 'paper' : 'mobile')
                  }
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold transition shadow-sm"
                >
                  {viewMode === 'mobile' ? (
                    <>
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Review Scorecard</span>
                    </>
                  ) : (
                    <>
                      <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Make Changes</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Dynamic Changes Locked Message */}
            {changesLockedMessage && (
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-amber-300 font-semibold bg-amber-500/10 border border-amber-500/30 rounded-lg py-1 px-2.5 text-center">
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{changesLockedMessage}</span>
              </div>
            )}

            {fixture.status === 'submitted' && (
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-amber-300 font-semibold bg-amber-500/10 border border-amber-500/30 rounded-lg py-1 px-2.5 text-center">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Awaiting league admin approval</span>
              </div>
            )}

            {fixture.status === 'approved' && (
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-300 font-semibold bg-emerald-500/10 border border-emerald-500/30 rounded-lg py-1 px-2.5 text-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Officially Approved by League Admin</span>
              </div>
            )}

            {/* Captain Signatures Row */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {/* Home Captain */}
              <button
                type="button"
                disabled={!canSignHome}
                onClick={() => handleToggleSign('home')}
                className={`flex items-center justify-between gap-1.5 p-2 sm:px-3 sm:py-2 rounded-xl border text-left transition ${
                  fixture.homeCaptainSigned
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200'
                    : canSignHome
                    ? 'bg-slate-950 border-slate-700 hover:border-emerald-500 text-slate-200 hover:bg-slate-800 cursor-pointer shadow-sm'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-500 cursor-not-allowed opacity-75'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider truncate">
                    Home Captain
                  </div>
                  <div className="font-semibold text-white truncate text-[11px] sm:text-xs">
                    {homeTeam.captainName || homeTeam.name}
                  </div>
                </div>
                <span
                  className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md shrink-0 whitespace-nowrap ${
                    fixture.homeCaptainSigned
                      ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                      : canSignHome
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {fixture.homeCaptainSigned
                    ? canSignHome && fixture.status !== 'submitted' && fixture.status !== 'approved'
                      ? '✓ Signed (Unsign)'
                      : '✓ Signed'
                    : canSignHome
                    ? 'Sign'
                    : 'Pending'}
                </span>
              </button>

              {/* Away Captain */}
              <button
                type="button"
                disabled={!canSignAway}
                onClick={() => handleToggleSign('away')}
                className={`flex items-center justify-between gap-1.5 p-2 sm:px-3 sm:py-2 rounded-xl border text-left transition ${
                  fixture.awayCaptainSigned
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200'
                    : canSignAway
                    ? 'bg-slate-950 border-slate-700 hover:border-emerald-500 text-slate-200 hover:bg-slate-800 cursor-pointer shadow-sm'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-500 cursor-not-allowed opacity-75'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider truncate">
                    Away Captain
                  </div>
                  <div className="font-semibold text-white truncate text-[11px] sm:text-xs">
                    {awayTeam.captainName || awayTeam.name}
                  </div>
                </div>
                <span
                  className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md shrink-0 whitespace-nowrap ${
                    fixture.awayCaptainSigned
                      ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                      : canSignAway
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {fixture.awayCaptainSigned
                    ? canSignAway && fixture.status !== 'submitted' && fixture.status !== 'approved'
                      ? '✓ Signed (Unsign)'
                      : '✓ Signed'
                    : canSignAway
                    ? 'Sign'
                    : 'Pending'}
                </span>
              </button>
            </div>

            {/* Attached Finish Match Button once both have signed */}
            {isSignedByBoth && fixture.status !== 'submitted' && fixture.status !== 'approved' && (
              <button
                type="button"
                disabled={!canSignHome && !canSignAway && !canManageLeague}
                onClick={handleFinishMatch}
                className="w-full inline-flex items-center justify-center gap-2 py-2 sm:py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm shadow-md transition disabled:opacity-50 animate-in fade-in slide-in-from-top-1 duration-150"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Finish Match</span>
              </button>
            )}

            {/* League Admin Controls */}
            {canManageLeague && fixture.status === 'submitted' && (
              <button
                type="button"
                onClick={handleApproveScorecard}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve Official Scorecard</span>
              </button>
            )}
            {canManageLeague && fixture.status === 'approved' && (
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={() => reopenFixture(fixture.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold transition"
                >
                  <Unlock className="w-3 h-3" />
                  <span>Reopen Scorecard</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}


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

      {/* Export Result Scorecard Modal */}
      {showExportModal && (
        <ExportScorecardModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          fixture={fixture}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          seasonName={
            seasons.find((s) => s.id === fixture.seasonId)?.name ||
            'Brighton & Hove Pool League'
          }
          players={players}
        />
      )}
    </div>
  );
};

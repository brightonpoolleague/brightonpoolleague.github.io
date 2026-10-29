import React, { useEffect, useRef, useState } from 'react';
import {
  Download,
  Share2,
  X,
  Loader2,
  Check,
  Camera,
  CheckCircle2,
  Trophy,
} from 'lucide-react';
import { toPng, toBlob } from 'html-to-image';
import {
  Fixture,
  Player,
  Team,
  SlotPlayerId,
} from '../types/league';
import {
  calculateMatchScore,
  ensureValidFrames,
  ensureValidLineups,
  formatMatchDate,
  getFrameBreaker,
  getFramePlayers,
  isKnockoutFixture,
} from '../utils/leagueEngine';

interface ExportScorecardModalProps {
  isOpen: boolean;
  onClose: () => void;
  fixture: Fixture;
  homeTeam: Team;
  awayTeam: Team;
  seasonName: string;
  players: Player[];
}

export const ExportScorecardModal: React.FC<ExportScorecardModalProps> = ({
  isOpen,
  onClose,
  fixture,
  homeTeam,
  awayTeam,
  seasonName,
  players,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<'png' | 'share' | null>(null);
  const [fitScale, setFitScale] = useState<number>(1);
  const [cardHeight, setCardHeight] = useState<number>(850);
  const [canNativeShare, setCanNativeShare] = useState<boolean>(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.canShare === 'function') {
      try {
        const dummyFile = new File([''], 'test.png', { type: 'image/png' });
        setCanNativeShare(navigator.canShare({ files: [dummyFile] }));
      } catch {
        setCanNativeShare(false);
      }
    } else {
      setCanNativeShare(false);
    }
  }, []);

  const frames = ensureValidFrames(fixture.frames);
  const lineups = ensureValidLineups(fixture.lineups);
  const score = calculateMatchScore(fixture);
  const isKnockout = isKnockoutFixture(fixture);
  const competitionTitle =
    fixture.competitionName ||
    fixture.cupName ||
    (isKnockout ? 'Knockout Cup' : fixture.division);

  const getPlayerName = (id: SlotPlayerId) => {
    if (!id) return '–';
    if (id === 'BYE') return 'BYE';
    return players.find((p) => p.id === id)?.name || 'Unknown';
  };

  useEffect(() => {
    if (!isOpen) return;

    const computeFitScale = () => {
      if (!containerRef.current || !cardRef.current) return;
      const cWidth = containerRef.current.clientWidth;
      const cHeight = containerRef.current.clientHeight;
      const unscaledHeight = cardRef.current.offsetHeight || 850;
      setCardHeight(unscaledHeight);

      const padX = window.innerWidth < 640 ? 16 : 32;
      const padY = window.innerWidth < 640 ? 16 : 32;

      const availWidth = Math.max(100, cWidth - padX);
      const availHeight = Math.max(100, cHeight - padY);

      const scaleX = availWidth / 840;
      const scaleY = availHeight / unscaledHeight;
      const bestScale = Math.min(1, scaleX, scaleY);
      setFitScale(bestScale);
    };

    computeFitScale();
    const timer = setTimeout(computeFitScale, 80);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      ro = new ResizeObserver(() => computeFitScale());
      ro.observe(containerRef.current);
    }
    window.addEventListener('resize', computeFitScale);

    return () => {
      clearTimeout(timer);
      if (ro) ro.disconnect();
      window.removeEventListener('resize', computeFitScale);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    const originalOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.overscrollBehavior = originalOverscroll;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getCleanFileName = () => {
    const homeClean = homeTeam.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const awayClean = awayTeam.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `bpl-scorecard-${homeClean}-vs-${awayClean}-${fixture.matchDate}.png`;
  };

  const handleDownload = async () => {
    if (!cardRef.current || isDownloading || isSharing) return;
    setIsDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        backgroundColor: '#020617',
        cacheBust: true,
        style: { margin: '0', transform: 'none' },
      });

      const link = document.createElement('a');
      link.download = getCleanFileName();
      link.href = dataUrl;
      link.click();

      setDownloadSuccess('png');
      setTimeout(() => setDownloadSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to generate scorecard image:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current || isSharing || isDownloading) return;
    setIsSharing(true);
    try {
      const blob = await toBlob(cardRef.current, {
        pixelRatio: 2,
        backgroundColor: '#020617',
        cacheBust: true,
        style: { margin: '0', transform: 'none' },
      });

      if (!blob) throw new Error('Could not create image blob');

      const fileName = getCleanFileName();
      const file = new File([blob], fileName, { type: 'image/png' });

      if (
        typeof navigator !== 'undefined' &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: `${homeTeam.name} vs ${awayTeam.name} - Scorecard`,
          text: `Brighton Pool League Official Result: ${homeTeam.name} (${score.homeFrames}) - (${score.awayFrames}) ${awayTeam.name}`,
        });
        setDownloadSuccess('share');
        setTimeout(() => setDownloadSuccess(null), 3000);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        // User cancelled share dialog - do not treat as error or download
        return;
      }
      console.error('Share failed:', err);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 overscroll-none touch-manipulation select-none"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full max-h-[96vh] sm:max-h-[92vh] flex flex-col shadow-2xl overflow-hidden overscroll-contain select-text"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar */}
        <div className="p-3.5 sm:px-6 sm:py-4 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-white text-sm sm:text-base leading-tight">
                Export Result Scorecard
              </h3>
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

        {/* Action Buttons Bar */}
        <div className="bg-slate-950/60 border-b border-slate-800/80 px-4 sm:px-6 py-3 flex items-center justify-end gap-2 shrink-0">
          {canNativeShare && (
            <button
              type="button"
              onClick={handleShare}
              disabled={isSharing || isDownloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow disabled:opacity-50"
            >
              {isSharing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : downloadSuccess === 'share' ? (
                <Check className="w-3.5 h-3.5 text-emerald-200" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
              <span>{downloadSuccess === 'share' ? 'Shared!' : isSharing ? 'Sharing...' : 'Share'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownload}
            disabled={isSharing || isDownloading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold transition disabled:opacity-50"
          >
            {isDownloading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : downloadSuccess === 'png' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Download className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>{downloadSuccess === 'png' ? 'Saved PNG!' : isDownloading ? 'Generating...' : 'Download PNG'}</span>
          </button>
        </div>

        {/* Scaled Preview Area */}
        <div
          ref={containerRef}
          className="flex-1 min-h-0 p-2 sm:p-5 bg-slate-950/40 flex items-center justify-center overflow-hidden"
        >
          <div
            style={{
              width: `${840 * fitScale}px`,
              height: cardHeight ? `${cardHeight * fitScale}px` : 'auto',
              maxWidth: '100%',
              maxHeight: '100%',
            }}
            className="relative transition-all duration-150 shrink-0"
          >
            <div
              style={{
                transform: `scale(${fitScale})`,
                transformOrigin: 'top left',
                width: '840px',
                position: 'absolute',
                top: 0,
                left: 0,
              }}
              className="rounded-xl overflow-hidden shadow-2xl border border-slate-800"
            >
              {/* Graphic Card to Export (840px fixed width for sharp 2x image) */}
              <div
                ref={cardRef}
                style={{ width: '840px', margin: 0 }}
                className="bg-slate-950 text-slate-100 p-6 space-y-4"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={`${import.meta.env.BASE_URL}logo.png`}
                      alt="Brighton Pool League"
                      className="w-12 h-12 object-contain"
                    />
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                        Brighton &amp; Hove Pool League
                      </div>
                      <h2 className="text-xl font-black text-white tracking-tight">
                        Official Result Scorecard
                      </h2>
                    </div>
                  </div>

                  <div className="text-right text-xs text-slate-400">
                    <div className="font-semibold text-slate-200">{seasonName}</div>
                    <div className="text-[11px] text-emerald-400 font-bold">{competitionTitle}</div>
                    <div className="text-[10px] text-slate-400">
                      {homeTeam.venue}
                      {homeTeam.tableNumber ? ` (${homeTeam.tableNumber})` : ''} •{' '}
                      {formatMatchDate(fixture.matchDate)}
                    </div>
                  </div>
                </div>

                {/* Scoreboard Banner */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                  {/* Home Team */}
                  <div className="w-5/12 text-left">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Home
                    </div>
                    <div className="text-lg font-black text-white truncate">
                      {homeTeam.name}
                    </div>
                    <div className="text-xs text-emerald-400 font-bold mt-0.5">
                      {isKnockout
                        ? score.matchWinner === 'home'
                          ? '🏆 Winner'
                          : ''
                        : `${score.homePoints} League Points`}
                    </div>
                  </div>

                  {/* Big Score Box */}
                  <div className="w-2/12 text-center flex flex-col items-center justify-center">
                    <div className="px-4 py-1.5 rounded-xl bg-slate-950 border border-slate-700/80 shadow-inner flex items-center gap-2">
                      <span className="text-2xl font-black text-white">{score.homeFrames}</span>
                      <span className="text-slate-500 font-black">-</span>
                      <span className="text-2xl font-black text-white">{score.awayFrames}</span>
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                      {fixture.status === 'approved'
                        ? 'Official Result'
                        : fixture.status === 'submitted'
                        ? 'Awaiting Approval'
                        : 'Frames'}
                    </div>
                  </div>

                  {/* Away Team */}
                  <div className="w-5/12 text-right">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Away
                    </div>
                    <div className="text-lg font-black text-white truncate">
                      {awayTeam.name}
                    </div>
                    <div className="text-xs text-emerald-400 font-bold mt-0.5">
                      {isKnockout
                        ? score.matchWinner === 'away'
                          ? '🏆 Winner'
                          : ''
                        : `${score.awayPoints} League Points`}
                    </div>
                  </div>
                </div>

                {/* 15 Frames Paper Scorecard Table */}
                <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/90">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <th className="py-2 px-2.5 text-left w-14">Set</th>
                        <th className="py-2 px-2 text-center w-10">Break</th>
                        <th className="py-2 px-2 text-center w-8">#</th>
                        <th className="py-2 px-3 text-left">Home Player</th>
                        <th className="py-2 px-2 text-center w-10">W/L</th>
                        <th className="py-2 px-2 text-center w-10">W/L</th>
                        <th className="py-2 px-3 text-left">Away Player</th>
                        <th className="py-2 px-2 text-center w-8">#</th>
                        <th className="py-2 px-2 text-center w-10">Break</th>
                        <th className="py-2 px-2.5 text-center w-14">Dish</th>
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

                        return (
                          <tr
                            key={frame.frameNumber}
                            className={`border-b ${
                              isLastInSet
                                ? 'border-slate-700 bg-slate-950/20'
                                : 'border-slate-800/60'
                            }`}
                          >
                            <td className="py-1.5 px-2.5 font-bold text-emerald-400">
                              {isFirstInSet ? `Set ${frame.setNumber}` : ''}
                            </td>
                            <td className="py-1.5 px-2 text-center font-black text-amber-400">
                              {breaker === 'home' ? 'X' : ''}
                            </td>
                            <td className="py-1.5 px-2 text-center font-mono text-slate-400">
                              {frame.homeSlot}
                            </td>
                            <td className="py-1.5 px-3 font-medium text-white truncate max-w-[150px]">
                              {getPlayerName(homePlayerId)}
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              <span
                                className={`w-5 h-5 rounded inline-flex items-center justify-center font-black text-[10px] ${
                                  frame.winner === 'home'
                                    ? 'bg-emerald-500 text-slate-950'
                                    : frame.winner === 'away'
                                    ? 'text-red-400'
                                    : 'text-slate-600'
                                }`}
                              >
                                {frame.winner === 'home'
                                  ? 'W'
                                  : frame.winner === 'away'
                                  ? 'L'
                                  : '·'}
                              </span>
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              <span
                                className={`w-5 h-5 rounded inline-flex items-center justify-center font-black text-[10px] ${
                                  frame.winner === 'away'
                                    ? 'bg-emerald-500 text-slate-950'
                                    : frame.winner === 'home'
                                    ? 'text-red-400'
                                    : 'text-slate-600'
                                }`}
                              >
                                {frame.winner === 'away'
                                  ? 'W'
                                  : frame.winner === 'home'
                                  ? 'L'
                                  : '·'}
                              </span>
                            </td>
                            <td className="py-1.5 px-3 font-medium text-white truncate max-w-[150px]">
                              {getPlayerName(awayPlayerId)}
                            </td>
                            <td className="py-1.5 px-2 text-center font-mono text-slate-400">
                              {frame.awaySlot}
                            </td>
                            <td className="py-1.5 px-2 text-center font-black text-amber-400">
                              {breaker === 'away' ? 'X' : ''}
                            </td>
                            <td className="py-1.5 px-2.5 text-center font-bold text-emerald-400 text-[10px]">
                              {frame.dish ? '★ DISH' : ''}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      {/* Frames Won Row */}
                      <tr className="bg-slate-950 font-black text-xs text-white border-t border-slate-800">
                        <td colSpan={4} className="py-2.5 px-3 text-right">
                          {isKnockout
                            ? `${competitionTitle} Frames:`
                            : 'Frames Won:'}
                        </td>
                        <td className="py-2.5 px-2 text-center text-emerald-400 text-sm font-black">
                          {score.homeFrames}
                        </td>
                        <td className="py-2.5 px-2 text-center text-emerald-400 text-sm font-black">
                          {score.awayFrames}
                        </td>
                        <td colSpan={4} className="py-2.5 px-3 text-xs text-slate-400 font-normal">
                          {isKnockout && score.matchWinner && (
                            <span>Knockout Winner: {score.matchWinner === 'home' ? homeTeam.name : awayTeam.name}</span>
                          )}
                        </td>
                      </tr>

                      {/* Match Points Row */}
                      {!isKnockout && (
                        <tr className="bg-slate-950/90 border-t border-slate-800/70">
                          <td colSpan={10} className="py-2 px-3">
                            <div className="flex items-center justify-center gap-4 text-xs">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                League Points:
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

                {/* Captain Sign-off & Verification */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">
                        Home Captain
                      </div>
                      <div className="font-bold text-white text-xs">
                        {homeTeam.captainName || 'Home Captain'}
                      </div>
                    </div>
                    {fixture.homeCaptainSigned ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" /> Signed
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">Unsigned</span>
                    )}
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">
                        Away Captain
                      </div>
                      <div className="font-bold text-white text-xs">
                        {awayTeam.captainName || 'Away Captain'}
                      </div>
                    </div>
                    {fixture.awayCaptainSigned ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" /> Signed
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">Unsigned</span>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <Trophy className="w-3 h-3 text-amber-400" />
                    <span>City of Brighton and Hove Pool League</span>
                  </div>
                  <div className="text-emerald-400 font-semibold">
                    brightonpoolleague.com
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

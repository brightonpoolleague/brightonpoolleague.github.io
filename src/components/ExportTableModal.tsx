import React, { useEffect, useRef, useState } from 'react';
import {
  Download,
  Share2,
  X,
  Loader2,
  Check,
  Trophy,
  Sparkles,
  Camera,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { toPng, toBlob } from 'html-to-image';

export interface ExportTableColumn {
  header: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface ExportTableRow {
  rank: number;
  primaryText: string;
  secondaryText?: string;
  values: (string | number)[];
  highlight?: boolean;
}

interface ExportTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  divisionName?: string;
  seasonName: string;
  badgeText?: string;
  columns: ExportTableColumn[];
  rows: ExportTableRow[];
  fileBaseName: string;
}

export const ExportTableModal: React.FC<ExportTableModalProps> = ({
  isOpen,
  onClose,
  title,
  divisionName,
  seasonName,
  badgeText,
  columns,
  rows,
  fileBaseName,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<'png' | 'share' | null>(null);
  const [fitScale, setFitScale] = useState<number>(1);
  const [cardHeight, setCardHeight] = useState<number>(750);
  const [zoomMode, setZoomMode] = useState<'fit' | 'actual'>('fit');

  useEffect(() => {
    if (!isOpen) return;

    const computeFitScale = () => {
      if (!containerRef.current || !cardRef.current) return;
      const cWidth = containerRef.current.clientWidth;
      const cHeight = containerRef.current.clientHeight;
      const unscaledHeight = cardRef.current.offsetHeight || 750;
      setCardHeight(unscaledHeight);

      // Safe margin: 16px on mobile, 32px on desktop
      const padX = window.innerWidth < 640 ? 16 : 32;
      const padY = window.innerWidth < 640 ? 16 : 32;

      const availWidth = Math.max(100, cWidth - padX);
      const availHeight = Math.max(100, cHeight - padY);

      const scaleX = availWidth / 800;
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
  }, [isOpen, rows.length]);

  const currentScale = zoomMode === 'fit' ? fitScale : 1;

  if (!isOpen) return null;

  const getCleanFileName = () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    const clean = fileBaseName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `${clean}-${dateStr}.png`;
  };

  const handleDownload = async () => {
    if (!cardRef.current || isGenerating) return;
    setIsGenerating(true);
    try {
      const options = {
        pixelRatio: 2,
        backgroundColor: '#020617', // slate-950
        cacheBust: true,
        style: {
          margin: '0',
          transform: 'none',
        },
      };

      const dataUrl = await toPng(cardRef.current, options);

      const link = document.createElement('a');
      link.download = getCleanFileName();
      link.href = dataUrl;
      link.click();

      setDownloadSuccess('png');
      setTimeout(() => setDownloadSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to generate image:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current || isGenerating) return;
    setIsGenerating(true);
    try {
      const blob = await toBlob(cardRef.current, {
        pixelRatio: 2,
        backgroundColor: '#020617',
        cacheBust: true,
        style: {
          margin: '0',
          transform: 'none',
        },
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
          title: `${title} - Brighton & Hove Pool League`,
          text: `${title} (${seasonName})`,
        });
        setDownloadSuccess('share');
        setTimeout(() => setDownloadSuccess(null), 3000);
      } else {
        // Fallback to PNG download
        await handleDownload();
      }
    } catch (err) {
      console.error('Share failed, falling back to download:', err);
      await handleDownload();
    } finally {
      setIsGenerating(false);
    }
  };

  const canNativeShare =
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function';

  const generatedDateStr = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[96vh] sm:max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="p-3.5 sm:px-6 sm:py-4 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-white text-sm sm:text-base leading-tight">
                Export Image
              </h3>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                High-resolution ready to share on WhatsApp, Facebook, or print
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

        {/* Modal Actions Bar */}
        <div className="bg-slate-950/60 border-b border-slate-800/80 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 shrink-0">
          {/* Zoom toggle button */}
          <button
            type="button"
            onClick={() => setZoomMode((m) => (m === 'fit' ? 'actual' : 'fit'))}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700/80 transition"
            title={zoomMode === 'fit' ? 'Zoom to 100% full size' : 'Fit whole image in preview box'}
          >
            {zoomMode === 'fit' ? (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Fit ({Math.round(fitScale * 100)}%)</span>
              </>
            ) : (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>100% (Scroll)</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            {canNativeShare && (
              <button
                type="button"
                onClick={handleShare}
                disabled={isGenerating}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow disabled:opacity-50"
              >
                {isGenerating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : downloadSuccess === 'share' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-200" />
                ) : (
                  <Share2 className="w-3.5 h-3.5" />
                )}
                <span>{downloadSuccess === 'share' ? 'Shared!' : 'Share'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownload}
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold transition disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : downloadSuccess === 'png' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Download className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>{downloadSuccess === 'png' ? 'Saved PNG!' : 'Download PNG'}</span>
            </button>
          </div>
        </div>

        {/* Scaled Preview Area: fits cleanly on mobile without scrolling */}
        <div
          ref={containerRef}
          className={`flex-1 min-h-0 p-2 sm:p-5 bg-slate-950/40 flex items-center justify-center ${
            zoomMode === 'actual' ? 'overflow-auto' : 'overflow-hidden'
          }`}
        >
          <div
            style={{
              width: `${800 * currentScale}px`,
              height: cardHeight ? `${cardHeight * currentScale}px` : 'auto',
              maxWidth: zoomMode === 'actual' ? 'none' : '100%',
              maxHeight: zoomMode === 'actual' ? 'none' : '100%',
            }}
            className="relative transition-all duration-150 shrink-0"
          >
            <div
              style={{
                transform: `scale(${currentScale})`,
                transformOrigin: 'top left',
                width: '800px',
                position: 'absolute',
                top: 0,
                left: 0,
              }}
              className="rounded-xl overflow-hidden shadow-2xl border border-slate-800"
            >
              {/* The Actual Rendered Graphic (Width 800px for high-res retina output) */}
              <div
                ref={cardRef}
                style={{ width: '800px', margin: 0 }}
                className="bg-slate-950 text-slate-100 p-7 space-y-5"
              >
                {/* Graphic Card Header - Centered */}
                <div className="flex flex-col items-center text-center border-b border-slate-800 pb-5 space-y-2">
                  <img
                    src={`${import.meta.env.BASE_URL}logo.png`}
                    alt="BPL Crest"
                    className="w-16 h-16 object-contain"
                  />
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-widest text-emerald-400">
                      Brighton &amp; Hove Pool League
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tight mt-0.5">
                      {divisionName ? `${divisionName} - ${title}` : title}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs text-slate-400">
                    <span className="font-semibold text-slate-300">{seasonName}</span>
                    {badgeText && (
                      <>
                        <span className="text-slate-600">•</span>
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-black text-emerald-300 uppercase tracking-wider">
                          {badgeText}
                        </span>
                      </>
                    )}
                    <span className="text-slate-600">•</span>
                    <span>As of {generatedDateStr}</span>
                  </div>
                </div>

                {/* Graphic Card Table */}
                <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/90">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <th className="py-2.5 px-3 text-center w-10">#</th>
                        <th className="py-2.5 px-3 text-left">
                          {columns[0]?.header || 'Entry'}
                        </th>
                        {columns.slice(1).map((col, idx) => (
                          <th
                            key={idx}
                            className={`py-2.5 px-2.5 text-${
                              col.align || 'center'
                            } ${col.className || ''}`}
                          >
                            {col.header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => {
                        const isTop3 = row.rank <= 3;
                        return (
                          <tr
                            key={idx}
                            className={`border-b border-slate-800/60 ${
                              row.highlight
                                ? 'bg-emerald-950/20'
                                : idx % 2 === 0
                                ? 'bg-slate-950/40'
                                : 'bg-slate-900/40'
                            }`}
                          >
                            {/* Rank with Gold / Silver / Bronze badge */}
                            <td className="py-2.5 px-3 text-center font-bold">
                              {row.rank === 1 ? (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] shadow">
                                  1
                                </span>
                              ) : row.rank === 2 ? (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-300 text-slate-950 font-black text-[11px] shadow">
                                  2
                                </span>
                              ) : row.rank === 3 ? (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-700 text-amber-100 font-black text-[11px] shadow">
                                  3
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs">
                                  {row.rank}
                                </span>
                              )}
                            </td>

                            {/* Primary & Secondary Label */}
                            <td className="py-2.5 px-3 text-left">
                              <div className="font-bold text-white text-xs">
                                {row.primaryText}
                              </div>
                              {row.secondaryText && (
                                <div className="text-[10px] text-slate-400">
                                  {row.secondaryText}
                                </div>
                              )}
                            </td>

                            {/* Values */}
                            {row.values.map((val, vIdx) => (
                              <td
                                key={vIdx}
                                className={`py-2.5 px-2.5 text-${
                                  columns[vIdx + 1]?.align || 'center'
                                } font-semibold ${
                                  vIdx === row.values.length - 1
                                    ? 'text-emerald-400 font-black text-sm'
                                    : 'text-slate-300'
                                }`}
                              >
                                {val}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Graphic Card Footer - Centered */}
                <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-3 border-t border-slate-800">
                  <span className="font-semibold text-slate-400">
                    Brighton &amp; Hove Pool League
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="font-semibold text-emerald-400">
                    brightonpoolleague.com
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

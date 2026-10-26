import React, { useRef, useState } from 'react';
import {
  Download,
  Share2,
  X,
  Loader2,
  Check,
  Trophy,
  Sparkles,
  Camera,
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
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<'png' | 'share' | null>(null);

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
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="p-4 sm:px-6 sm:py-4 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Camera className="w-4 h-4" />
            </div>
            <h3 className="font-black text-white text-sm sm:text-base">
              Export &amp; Share
            </h3>
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
        <div className="bg-slate-950/60 border-b border-slate-800/80 px-4 sm:px-6 py-3 flex items-center justify-end gap-2">
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

        {/* Scrollable Preview Area */}
        <div className="flex-1 overflow-auto p-3 sm:p-6 bg-slate-950/40">
          <div className="overflow-x-auto pb-4">
            {/* The Actual Rendered Graphic (Width 820px for high-res retina output) */}
            <div
              ref={cardRef}
              style={{ width: '820px' }}
              className="bg-slate-950 text-slate-100 rounded-2xl border-2 border-slate-800 p-6 mx-auto shadow-2xl space-y-5"
            >
              {/* Graphic Card Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3.5">
                  <img
                    src={`${import.meta.env.BASE_URL}logo.png`}
                    alt="BPL Crest"
                    className="w-12 h-12 object-contain shrink-0"
                  />
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
                      Brighton &amp; Hove Pool League
                    </div>
                    <h2 className="text-xl font-black text-white">
                      {divisionName ? `${divisionName} - ${title}` : title}
                    </h2>
                    <div className="text-xs text-slate-400 font-semibold">
                      {seasonName}
                    </div>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  {badgeText && (
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-black text-emerald-300 uppercase tracking-wider">
                      {badgeText}
                    </span>
                  )}
                  <div className="text-[10px] font-medium text-slate-400">
                    As of {generatedDateStr}
                  </div>
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

              {/* Graphic Card Footer */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                <div className="font-semibold text-slate-400">
                  Brighton &amp; Hove Pool League
                </div>
                <div className="font-medium text-emerald-400">
                  brightonpoolleague.com
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

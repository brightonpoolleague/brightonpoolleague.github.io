import React from 'react';
import { Sponsor, PRIMARY_SPONSOR } from '../data/sponsors';

interface SponsorComponentProps {
  sponsor?: Sponsor;
  className?: string;
}

/**
 * Compact sponsor badge suitable for view headers and subtitles.
 */
export const SponsorBadge: React.FC<SponsorComponentProps> = ({
  sponsor = PRIMARY_SPONSOR,
  className = '',
}) => {
  if (!sponsor) return null;

  const content = (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-950/80 border border-slate-800 text-xs shadow-sm hover:border-slate-700 transition ${className}`}
      title={`${sponsor.role || 'Sponsored by'} ${sponsor.name}`}
    >
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Sponsored by
      </span>
      <div className="w-5 h-5 rounded bg-white p-0.5 flex items-center justify-center shrink-0 shadow-xs">
        <img
          src={`${import.meta.env.BASE_URL}${sponsor.logo.replace(/^\//, '')}`}
          alt={sponsor.name}
          className="max-h-full max-w-full object-contain"
        />
      </div>
      <span className="font-black text-white text-xs">{sponsor.name}</span>
    </div>
  );

  if (sponsor.url) {
    return (
      <a
        href={sponsor.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block"
      >
        {content}
      </a>
    );
  }

  return content;
};

/**
 * Full sponsor banner card suitable for table and leaderboard footers.
 */
export const SponsorBanner: React.FC<SponsorComponentProps> = ({
  sponsor = PRIMARY_SPONSOR,
  className = '',
}) => {
  if (!sponsor) return null;

  return (
    <div
      className={`bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md ${className}`}
    >
      <div className="flex items-center gap-3.5 text-center sm:text-left">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-md border border-slate-700/40">
          <img
            src={`${import.meta.env.BASE_URL}${sponsor.logo.replace(/^\//, '')}`}
            alt={sponsor.name}
            className="max-h-full max-w-full object-contain"
          />
        </div>
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
            {sponsor.role || 'Official League Sponsor'}
          </div>
          <h4 className="text-base sm:text-lg font-black text-white leading-tight">
            {sponsor.name}
          </h4>
          {sponsor.tagline && (
            <p className="text-xs text-slate-400 mt-0.5">
              {sponsor.tagline}
            </p>
          )}
        </div>
      </div>

      {sponsor.url && (
        <a
          href={sponsor.url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition shrink-0"
        >
          Visit Sponsor
        </a>
      )}
    </div>
  );
};

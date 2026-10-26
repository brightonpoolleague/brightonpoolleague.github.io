import React from 'react';
import { WifiOff, AlertTriangle, RefreshCw } from 'lucide-react';
import { useLeague } from '../context/LeagueContext';

export const NetworkStatusBanner: React.FC = () => {
  const { isOnline, syncError, isSyncing, retryPendingSync } = useLeague();

  if (isOnline && !syncError) {
    return null;
  }

  const isOffline = !isOnline;

  return (
    <aside
      aria-label="Network Connection Status"
      className={`sticky top-16 z-20 border-b backdrop-blur-md px-3 sm:px-6 py-2 transition-all ${
        isOffline
          ? 'bg-amber-950/90 border-amber-500/50 text-amber-200 shadow-lg shadow-black/20'
          : 'bg-amber-950/80 border-amber-500/40 text-amber-200'
      }`}
    >
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          {isOffline ? (
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          )}

          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
            <span
              className={`font-black text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full border ${
                isOffline
                  ? 'bg-red-500/20 text-red-300 border-red-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}
            >
              {isOffline ? 'Offline' : 'Weak Connection'}
            </span>

            <span className="font-medium text-slate-200">
              {isOffline
                ? 'You are currently offline.'
                : 'Weak connection detected.'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => retryPendingSync()}
          disabled={isSyncing}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 active:bg-amber-500/40 border border-amber-500/40 text-amber-200 text-xs font-semibold shrink-0 transition disabled:opacity-50"
          title="Retry connection"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`}
          />
          <span>{isSyncing ? 'Retrying...' : 'Retry'}</span>
        </button>
      </div>
    </aside>
  );
};

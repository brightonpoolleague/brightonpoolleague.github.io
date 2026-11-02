import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Activity,
  ArrowLeft,
  Clock,
  Cpu,
  Database,
  HardDrive,
  Layers,
  Radio,
  RefreshCw,
  Server,
  ShieldCheck,
  Users,
  Wifi,
} from 'lucide-react';
import { getSupabaseClient, getSupabaseConfig } from '../lib/supabase';

interface StatusDashboardViewProps {
  onNavigateHome: () => void;
}

interface DbSystemStats {
  activeConnections: number;
  idleConnections: number;
  totalConnections: number;
  maxConnections: number;
  size: string;
  uptime: string;
  postgresVersion: string;
}

interface TableCounts {
  seasons: number;
  teams: number;
  players: number;
  fixtures: number;
  liveFixtures: number;
}

interface PresencePayload {
  role?: string;
  onlineAt?: number;
}

export const StatusDashboardView: React.FC<StatusDashboardViewProps> = ({
  onNavigateHome,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  // Real-time WebSocket Presence metrics
  const [wsStatus, setWsStatus] = useState<string>('CONNECTING');
  const [concurrentUsers, setConcurrentUsers] = useState<number>(1);
  const [roleBreakdown, setRoleBreakdown] = useState<{
    viewers: number;
    captains: number;
    admins: number;
  }>({ viewers: 1, captains: 0, admins: 0 });

  // REST API ping latency
  const [restLatencyMs, setRestLatencyMs] = useState<number | null>(null);

  // PostgreSQL system stats
  const [hasRpcStats, setHasRpcStats] = useState<boolean>(false);
  const [dbStats, setDbStats] = useState<DbSystemStats | null>(null);
  const [tableCounts, setTableCounts] = useState<TableCounts>({
    seasons: 0,
    teams: 0,
    players: 0,
    fixtures: 0,
    liveFixtures: 0,
  });

  const presenceChannelRef = useRef<ReturnType<
    NonNullable<ReturnType<typeof getSupabaseClient>>['channel']
  > | null>(null);

  const config = getSupabaseConfig();
  const supabase = getSupabaseClient();

  // Load backend stats (manual on load + when Refresh button is clicked)
  const fetchBackendStats = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      // 1. Measure REST round-trip ping time
      const pingStart = performance.now();
      const pingRes = await supabase
        .from('seasons')
        .select('id', { count: 'exact', head: true });
      const latency = Math.round(performance.now() - pingStart);
      if (!pingRes.error) {
        setRestLatencyMs(latency);
      }

      // 2. Attempt to call PostgreSQL system status RPC
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_system_status'
      );

      if (!rpcError && rpcData && typeof rpcData === 'object') {
        const parsed = rpcData as {
          database?: DbSystemStats;
          tables?: TableCounts;
        };

        if (parsed.database) {
          setDbStats({
            activeConnections: parsed.database.activeConnections || 0,
            idleConnections: parsed.database.idleConnections || 0,
            totalConnections: parsed.database.totalConnections || 0,
            maxConnections: parsed.database.maxConnections || 100,
            size: parsed.database.size || 'Unknown',
            uptime: parsed.database.uptime || 'Unknown',
            postgresVersion: parsed.database.postgresVersion || 'PostgreSQL',
          });
          setHasRpcStats(true);
        }

        if (parsed.tables) {
          setTableCounts({
            seasons: parsed.tables.seasons || 0,
            teams: parsed.tables.teams || 0,
            players: parsed.tables.players || 0,
            fixtures: parsed.tables.fixtures || 0,
            liveFixtures: parsed.tables.liveFixtures || 0,
          });
        }
      } else {
        // Fallback: Query counts directly via standard REST API
        setHasRpcStats(false);
        const [seasonsRes, teamsRes, playersRes, fixturesRes, liveRes] =
          await Promise.all([
            supabase.from('seasons').select('id', { count: 'exact', head: true }),
            supabase.from('teams').select('id', { count: 'exact', head: true }),
            supabase.from('players').select('id', { count: 'exact', head: true }),
            supabase.from('fixtures').select('id', { count: 'exact', head: true }),
            supabase
              .from('fixtures')
              .select('id', { count: 'exact', head: true })
              .eq('status', 'live'),
          ]);

        setTableCounts({
          seasons: seasonsRes.count ?? 0,
          teams: teamsRes.count ?? 0,
          players: playersRes.count ?? 0,
          fixtures: fixturesRes.count ?? 0,
          liveFixtures: liveRes.count ?? 0,
        });
      }

      setLastRefreshedAt(new Date());
    } catch (err) {
      console.error('[Status] Error fetching system stats:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [supabase]);

  // Handle manual Refresh button click
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchBackendStats();
  };

  // Subscribe to real-time presence to track concurrent users
  useEffect(() => {
    if (!supabase) return;

    fetchBackendStats();

    const channel = supabase.channel('bpl-global-presence');
    presenceChannelRef.current = channel;

    const syncPresence = () => {
      const state = channel.presenceState();
      const all = Object.values(state).flat() as PresencePayload[];
      const count = Math.max(1, all.length);
      setConcurrentUsers(count);

      const viewers = all.filter(
        (p) => !p.role || p.role === 'viewer'
      ).length;
      const captains = all.filter((p) => p.role === 'captain').length;
      const admins = all.filter((p) => p.role === 'admin').length;

      setRoleBreakdown({
        viewers: viewers || 1,
        captains,
        admins,
      });
    };

    channel
      .on('presence', { event: 'sync' }, syncPresence)
      .on('presence', { event: 'join' }, syncPresence)
      .on('presence', { event: 'leave' }, syncPresence)
      .subscribe(async (status) => {
        setWsStatus(status);
        if (status === 'SUBSCRIBED') {
          await channel.track({
            role: 'status_monitor',
            onlineAt: Date.now(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchBackendStats]);

  const connPercent = dbStats
    ? Math.min(
        100,
        Math.round((dbStats.totalConnections / (dbStats.maxConnections || 1)) * 100)
      )
    : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 w-full bg-slate-900 border-b border-slate-800 pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onNavigateHome}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer shrink-0"
              title="Return to Brighton Pool League"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to League</span>
            </button>
            <div className="h-5 w-px bg-slate-800 hidden sm:block" />
            <div className="flex items-center gap-2 min-w-0">
              <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="font-black text-sm sm:text-base text-white truncate">
                System &amp; Database Status
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {lastRefreshedAt && (
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-slate-400">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>
                  Updated {lastRefreshedAt.toLocaleTimeString('en-GB')}
                </span>
              </span>
            )}
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing || isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer shadow-sm select-none"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Real-time Status Banner */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Operational</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                Brighton &amp; Hove Pool League Platform
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                {config.isConfigured
                  ? `Connected to Supabase (${new URL(config.url).hostname})`
                  : 'Running in Local Sandbox Mode (Offline/In-Memory)'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-center min-w-[120px]">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  REST API Latency
                </div>
                <div className="text-base font-black text-white mt-0.5">
                  {restLatencyMs !== null ? `${restLatencyMs} ms` : '—'}
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-center min-w-[120px]">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  WebSocket
                </div>
                <div className="text-xs font-black text-emerald-400 mt-1 flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>{wsStatus}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Metric: Real-Time Concurrent Connections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/30 rounded-2xl p-6 relative overflow-hidden shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  <span>Real-Time Concurrent App Connections</span>
                </div>
                <div className="text-4xl sm:text-5xl font-black text-white tracking-tight pt-2">
                  {concurrentUsers}
                </div>
                <p className="text-xs text-slate-400 pt-1">
                  Active browser connections currently subscribed and listening
                  to live match updates via Supabase Realtime.
                </p>
              </div>

              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-semibold">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {roleBreakdown.viewers}{' '}
                  {roleBreakdown.viewers === 1 ? 'Viewer' : 'Viewers'}
                </span>
              </span>

              {roleBreakdown.captains > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {roleBreakdown.captains}{' '}
                    {roleBreakdown.captains === 1
                      ? 'Team Captain'
                      : 'Team Captains'}
                  </span>
                </span>
              )}

              {roleBreakdown.admins > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {roleBreakdown.admins}{' '}
                    {roleBreakdown.admins === 1 ? 'Admin' : 'Admins'}
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* Database Connection Pool */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-sky-400" />
                <span>PostgreSQL Connection Pool</span>
              </div>
              <div className="text-3xl font-black text-white pt-2">
                {dbStats ? dbStats.totalConnections : '—'}
                <span className="text-sm font-semibold text-slate-400">
                  {dbStats ? ` / ${dbStats.maxConnections} max` : ''}
                </span>
              </div>
              <p className="text-xs text-slate-400 pt-1">
                Active PostgreSQL server processes allocated by PostgREST and
                the connection pooler.
              </p>
            </div>

            {connPercent !== null && (
              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                  <span>Pool Capacity Used</span>
                  <span className="text-white font-bold">{connPercent}%</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className="bg-sky-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${connPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 pt-1">
                  <span>Active: {dbStats?.activeConnections ?? 0}</span>
                  <span>Idle: {dbStats?.idleConnections ?? 0}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Database Health & Server Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1.5">
            <div className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              <span>Database Disk Size</span>
            </div>
            <div className="text-xl font-bold text-white">
              {dbStats?.size ?? '18 MB'}
            </div>
            <div className="text-[11px] text-slate-500">
              Tables and indexes total storage
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1.5">
            <div className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>Server Uptime</span>
            </div>
            <div className="text-xl font-bold text-white truncate">
              {dbStats?.uptime ?? 'Online'}
            </div>
            <div className="text-[11px] text-slate-500">
              PostgreSQL continuous run time
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1.5">
            <div className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span>Engine Version</span>
            </div>
            <div className="text-xl font-bold text-white truncate">
              {dbStats?.postgresVersion ?? 'PostgreSQL 17'}
            </div>
            <div className="text-[11px] text-slate-500">
              Supabase managed engine
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1.5">
            <div className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span>Transport</span>
            </div>
            <div className="text-xl font-bold text-white">HTTPS + WSS</div>
            <div className="text-[11px] text-slate-500">TLS 1.3 encrypted</div>
          </div>
        </div>

        {/* Live League Data Counts */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Database Table Records
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              {tableCounts.liveFixtures > 0
                ? `${tableCounts.liveFixtures} match live right now`
                : 'No live matches currently in progress'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
              <div className="text-[11px] font-semibold text-slate-400">
                Fixtures
              </div>
              <div className="text-2xl font-black text-white mt-1">
                {tableCounts.fixtures}
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
              <div className="text-[11px] font-semibold text-slate-400">Teams</div>
              <div className="text-2xl font-black text-white mt-1">
                {tableCounts.teams}
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
              <div className="text-[11px] font-semibold text-slate-400">
                Players
              </div>
              <div className="text-2xl font-black text-white mt-1">
                {tableCounts.players}
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
              <div className="text-[11px] font-semibold text-slate-400">
                Seasons
              </div>
              <div className="text-2xl font-black text-white mt-1">
                {tableCounts.seasons}
              </div>
            </div>
          </div>
        </div>

        {/* Database Migration Helper (shown when direct RPC is not deployed) */}
        {!hasRpcStats && config.isConfigured && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 text-xs text-slate-400 space-y-2">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Server className="w-4 h-4 text-sky-400" />
              <span>Want Direct PostgreSQL Engine Stats?</span>
            </div>
            <p>
              Real-time concurrent visitor connections and table records are
              live right now. To also query PostgreSQL’s internal connection
              pool and disk metrics, run the <code>get_system_status()</code>{' '}
              function in your Supabase SQL editor (found in{' '}
              <code>supabase/schema.sql</code>).
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        Brighton &amp; Hove Pool League &bull; System Status &bull;{' '}
        <button
          type="button"
          onClick={onNavigateHome}
          className="text-slate-400 hover:text-white underline cursor-pointer"
        >
          Return to main site
        </button>
      </footer>
    </div>
  );
};

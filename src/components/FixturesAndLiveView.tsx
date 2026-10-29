import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  History,
  MapPin,
  PlayCircle,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import { Division, Fixture } from '../types/league';
import { useLeague } from '../context/LeagueContext';
import {
  calculateMatchScore,
  formatMatchDate,
  getMatchTimeframe,
  getScorecardApprovalWarnings,
  isKnockoutFixture,
} from '../utils/leagueEngine';

interface FixturesAndLiveViewProps {
  onSelectFixture: (fixture: Fixture) => void;
  onGoToAdmin?: () => void;
}

type StatusFilter =
  | 'mine'
  | 'all'
  | 'live'
  | 'scheduled'
  | 'past'
  | 'submitted'
  | 'approved';

export const FixturesAndLiveView: React.FC<FixturesAndLiveViewProps> = ({
  onSelectFixture,
  onGoToAdmin,
}) => {
  const {
    seasonName,
    divisions,
    teams,
    fixtures,
    session,
    canEditFixture,
    canManageLeague,
    approveFixture,
  } = useLeague();

  const isCaptain = session.role === 'captain' && Boolean(session.teamId);

  const [selectedDivision, setSelectedDivision] = useState<
    Division | 'ALL' | 'KNOCKOUT'
  >('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    isCaptain ? 'mine' : 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [showMyNextMatch, setShowMyNextMatch] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem('bpl_show_my_next_match');
    return stored !== 'false';
  });

  const toggleMyNextMatch = () => {
    setShowMyNextMatch((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('bpl_show_my_next_match', String(next));
      }
      return next;
    });
  };

  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: React.ReactNode;
    confirmLabel: string;
    variant?: 'danger' | 'warning';
    onConfirm: () => void;
  } | null>(null);

  const handleApproveFixture = (fix: Fixture) => {
    const warnings = getScorecardApprovalWarnings(fix);
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
        onConfirm: () => approveFixture(fix.id),
      });
    } else {
      approveFixture(fix.id);
    }
  };

  useEffect(() => {
    if (isCaptain) {
      setStatusFilter('mine');
    } else {
      setStatusFilter((prev) => (prev === 'mine' ? 'all' : prev));
    }
  }, [isCaptain, session.teamId]);

  const teamsById = Object.fromEntries(teams.map((t) => [t.id, t]));
  const myTeam = isCaptain && session.teamId ? teamsById[session.teamId] : null;

  const myMatches = useMemo(() => {
    if (!isCaptain || !session.teamId) return [];
    return fixtures
      .filter(
        (f) =>
          f.homeTeamId === session.teamId || f.awayTeamId === session.teamId
      )
      .sort((a, b) => a.matchDate.localeCompare(b.matchDate));
  }, [fixtures, isCaptain, session.teamId]);

  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  // "My Next Match" is strictly date-based:
  // 1. Earliest fixture on or after today that is not yet completed/approved (whether scheduled or live today)
  // 2. Earliest fixture on or after today (if all upcoming are approved)
  // 3. Earliest unapproved fixture from earlier in the season (e.g. postponed or pending submission)
  // 4. Fallback to the season's latest fixture
  const myNextMatch = useMemo(() => {
    if (myMatches.length === 0) return null;

    const upcomingUnapproved = myMatches.find(
      (f) => f.matchDate >= todayStr && f.status !== 'approved'
    );
    if (upcomingUnapproved) return upcomingUnapproved;

    const upcomingAny = myMatches.find((f) => f.matchDate >= todayStr);
    if (upcomingAny) return upcomingAny;

    const pastUnapproved = myMatches.find((f) => f.status !== 'approved');
    if (pastUnapproved) return pastUnapproved;

    return myMatches[myMatches.length - 1];
  }, [myMatches, todayStr]);

  const uniqueFixtureDates = useMemo(() => {
    const dateSet = new Set<string>();
    for (const f of fixtures) {
      if (!f.matchDate) continue;
      if (selectedDivision === 'KNOCKOUT') {
        if (!isKnockoutFixture(f)) continue;
      } else if (selectedDivision !== 'ALL') {
        if (f.division !== selectedDivision || isKnockoutFixture(f)) {
          continue;
        }
      }
      dateSet.add(f.matchDate);
    }
    return Array.from(dateSet).sort((a, b) => a.localeCompare(b));
  }, [fixtures, selectedDivision]);

  const filtered = fixtures
    .filter((f) => {
      if (selectedDivision === 'KNOCKOUT') {
        if (!isKnockoutFixture(f)) return false;
      } else if (selectedDivision !== 'ALL') {
        if (f.division !== selectedDivision || isKnockoutFixture(f)) {
          return false;
        }
      }
      if (dateFilter !== 'ALL' && f.matchDate !== dateFilter) {
        return false;
      }
      if (statusFilter === 'mine') {
        return (
          f.homeTeamId === session.teamId || f.awayTeamId === session.teamId
        );
      }
      if (statusFilter === 'scheduled') {
        const tf = getMatchTimeframe(f.matchDate, f.status);
        if (tf === 'past' || f.status !== 'scheduled') {
          return false;
        }
      } else if (statusFilter === 'past') {
        const tf = getMatchTimeframe(f.matchDate, f.status);
        if (tf !== 'past' || f.status !== 'scheduled') {
          return false;
        }
      } else if (statusFilter !== 'all' && f.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const home = teamsById[f.homeTeamId];
        const away = teamsById[f.awayTeamId];
        const homeName = (home?.name ?? '').toLowerCase();
        const awayName = (away?.name ?? '').toLowerCase();
        const venue = (home?.venue ?? '').toLowerCase();
        const table = (home?.tableNumber ?? '').toLowerCase();
        const division = (f.division ?? '').toLowerCase();
        const weekStr = `week ${f.weekNumber} wk ${f.weekNumber} w${f.weekNumber}`;
        const dateStr = `${f.matchDate} ${formatMatchDate(f.matchDate)}`.toLowerCase();
        const statusStr = (f.status ?? '').toLowerCase();
        const isKnockout = isKnockoutFixture(f);
        const knockoutTitle = f.competitionName || f.cupName || '';
        const knockoutRound = f.round || f.cupRound || '';
        const knockoutStr = `${isKnockout ? 'knockout cup plate' : 'league'} ${knockoutTitle} ${knockoutRound}`.toLowerCase();

        const matches =
          homeName.includes(q) ||
          awayName.includes(q) ||
          venue.includes(q) ||
          table.includes(q) ||
          division.includes(q) ||
          weekStr.includes(q) ||
          dateStr.includes(q) ||
          statusStr.includes(q) ||
          knockoutStr.includes(q);

        if (!matches) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const order = { live: 0, submitted: 1, scheduled: 2, approved: 3 };
      if (order[a.status] !== order[b.status]) {
        return order[a.status] - order[b.status];
      }
      return a.matchDate.localeCompare(b.matchDate);
    });

  const liveCount = fixtures.filter((f) => f.status === 'live').length;
  const pendingApprovalCount = fixtures.filter(
    (f) => f.status === 'submitted'
  ).length;

  const statusTabs: { id: StatusFilter; label: string }[] = [
    ...(isCaptain ? [{ id: 'mine' as const, label: 'My Matches' }] : []),
    { id: 'all', label: 'All Matches' },
    { id: 'live', label: 'Live Now' },
    { id: 'scheduled', label: 'Upcoming' },
    { id: 'past', label: 'Past Date' },
    { id: 'submitted', label: 'Submitted Scorecards' },
    { id: 'approved', label: 'Approved Results' },
  ];

  return (
    <div className="space-y-5">
      {/* Header & Filters */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <Radio className="w-3.5 h-3.5" />
              {seasonName} Season
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5">
              Live Scoring &amp; Season Fixtures
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {liveCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                {liveCount} Live Match{liveCount > 1 ? 'es' : ''}
              </span>
            )}
            {canManageLeague && pendingApprovalCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
                <ShieldAlert className="w-3.5 h-3.5" />
                {pendingApprovalCount} Awaiting Approval
              </span>
            )}
          </div>
        </div>

        {/* Division & Knockout Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedDivision('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              selectedDivision === 'ALL'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            All Matches
          </button>
          {divisions.map((div) => (
            <button
              key={div}
              type="button"
              onClick={() => setSelectedDivision(div)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedDivision === div
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {div}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelectedDivision('KNOCKOUT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap inline-flex items-center gap-1 transition ${
              selectedDivision === 'KNOCKOUT'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'bg-slate-950 text-amber-400 hover:text-amber-300 border border-slate-800 hover:border-amber-500/50'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Knockouts</span>
          </button>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === tab.id
                  ? 'bg-slate-800 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Date Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-2.5 min-w-0">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by team, venue, table, division or date..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-9 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition shadow-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Date Filter Dropdown & Native Picker */}
          <div className="flex items-center gap-1.5 w-full sm:w-64 sm:flex-shrink-0 min-w-0">
            <div className="relative flex-1 min-w-0">
              <Calendar className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-7 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition shadow-sm appearance-none cursor-pointer truncate"
              >
                <option value="ALL">All Dates</option>
                {dateFilter !== 'ALL' && !uniqueFixtureDates.includes(dateFilter) && (
                  <option value={dateFilter}>
                    {formatMatchDate(dateFilter)}
                  </option>
                )}
                {uniqueFixtureDates.map((date) => (
                  <option key={date} value={date}>
                    {formatMatchDate(date)}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Native Calendar Picker */}
            <div
              className="relative flex-shrink-0"
              title="Pick specific date from calendar"
            >
              <input
                type="date"
                value={dateFilter === 'ALL' ? '' : dateFilter}
                onChange={(e) => setDateFilter(e.target.value || 'ALL')}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div
                className={`p-2 rounded-xl border text-xs transition flex items-center justify-center ${
                  dateFilter !== 'ALL'
                    ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Calendar className="w-4 h-4" />
              </div>
            </div>

            {dateFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setDateFilter('ALL')}
                className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition flex-shrink-0"
                title="Reset date filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Team Captain Spotlight: My Next Match */}
      {isCaptain && myTeam && myNextMatch && (() => {
        const nextScore = calculateMatchScore(myNextMatch);
        const home = teamsById[myNextMatch.homeTeamId];
        const away = teamsById[myNextMatch.awayTeamId];

        if (!showMyNextMatch) {
          return (
            <div
              onClick={toggleMyNextMatch}
              className="cursor-pointer bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 text-xs transition shadow-md group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  MY NEXT MATCH
                </span>
                <span className="text-slate-300 truncate font-semibold">
                  <span className="text-white font-bold">{home?.name}</span>
                  <span className="text-slate-500 mx-1.5 font-normal">vs</span>
                  <span className="text-white font-bold">{away?.name}</span>
                </span>
                <span className="text-slate-600 hidden sm:inline">•</span>
                <span className="text-slate-400 hidden sm:inline">
                  {myNextMatch.division} • {formatMatchDate(myNextMatch.matchDate)}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-emerald-400 group-hover:text-emerald-300 text-xs font-bold shrink-0">
                <Eye className="w-3.5 h-3.5" />
                <span>Show Match</span>
              </div>
            </div>
          );
        }

        return (
          <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border-2 border-emerald-500/50 rounded-2xl p-3.5 sm:p-5 shadow-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/40">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  MY NEXT MATCH
                </span>
                <span className="text-slate-400 font-semibold flex items-center gap-1">
                  {isKnockoutFixture(myNextMatch) ? (
                    <span className="text-amber-400 font-bold flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      {myNextMatch.competitionName ||
                        myNextMatch.cupName ||
                        (myNextMatch.division
                          ? `${myNextMatch.division} Knockout`
                          : 'Knockout')}
                      {myNextMatch.round || myNextMatch.cupRound
                        ? ` (${myNextMatch.round || myNextMatch.cupRound})`
                        : ''}
                    </span>
                  ) : (
                    myNextMatch.division
                  )}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-300 font-medium">
                  {formatMatchDate(myNextMatch.matchDate)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                    myNextMatch.status === 'live'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
                      : myNextMatch.status === 'submitted'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : myNextMatch.status === 'approved'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {myNextMatch.status === 'live'
                    ? isKnockoutFixture(myNextMatch)
                      ? 'LIVE NOW (First to 8)'
                      : `LIVE NOW (${nextScore.completedFrames}/15)`
                    : myNextMatch.status === 'scheduled'
                    ? isKnockoutFixture(myNextMatch)
                      ? 'Upcoming Knockout'
                      : 'Upcoming Match'
                    : myNextMatch.status === 'submitted'
                    ? 'Submitted • Awaiting Approval'
                    : 'Approved Result'}
                </span>

                <button
                  type="button"
                  onClick={toggleMyNextMatch}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold border border-slate-700/80 transition shadow-sm"
                  title="Hide My Next Match spotlight"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Hide</span>
                </button>
              </div>
            </div>

            <div
              onClick={() => onSelectFixture(myNextMatch)}
              className="cursor-pointer bg-slate-950/90 border border-slate-800 rounded-xl p-3 sm:p-4 grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:gap-2 hover:border-emerald-500/50 transition shadow-inner"
            >
              <div className="text-left min-w-0 pr-1 sm:pr-2">
                <div className="font-bold text-xs sm:text-base text-white line-clamp-2 leading-snug">
                  {home?.name}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  {home?.id === myTeam.id && (
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shrink-0">
                      Your Team
                    </span>
                  )}
                  <span className="text-[11px] text-slate-400">
                    Home {nextScore.completedFrames > 0 && `• ${nextScore.homePoints} pts`}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center px-1 shrink-0">
                {nextScore.completedFrames > 0 || myNextMatch.status !== 'scheduled' ? (
                  <div className="flex items-center gap-1 sm:gap-1.5 font-black text-base sm:text-2xl text-white tabular-nums">
                    <span
                      className={
                        nextScore.homeFrames > nextScore.awayFrames
                          ? 'text-emerald-400'
                          : ''
                      }
                    >
                      {nextScore.homeFrames}
                    </span>
                    <span className="text-slate-600">–</span>
                    <span
                      className={
                        nextScore.awayFrames > nextScore.homeFrames
                          ? 'text-emerald-400'
                          : ''
                      }
                    >
                      {nextScore.awayFrames}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-emerald-400 px-1.5 sm:px-2 py-1 rounded bg-slate-900 border border-slate-800 shrink-0">
                    20:00
                  </span>
                )}
              </div>

              <div className="text-right min-w-0 pl-1 sm:pl-2">
                <div className="font-bold text-xs sm:text-base text-white line-clamp-2 leading-snug">
                  {away?.name}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1.5 mt-1">
                  <span className="text-[11px] text-slate-400">
                    Away {nextScore.completedFrames > 0 && `• ${nextScore.awayPoints} pts`}
                  </span>
                  {away?.id === myTeam.id && (
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shrink-0">
                      Your Team
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
              <div className="flex items-center gap-1.5 text-xs text-slate-300 truncate">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">
                  {home?.venue}
                  {home?.tableNumber ? ` (${home.tableNumber})` : ''}
                  {home?.address ? ` • ${home.address}` : ''}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onSelectFixture(myNextMatch)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow"
              >
                <PlayCircle className="w-4 h-4" />
                Scorecard
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })()}

      {/* Empty State when Season has no fixtures yet */}
      {fixtures.length === 0 ? (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-10 text-center max-w-2xl mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
            <Calendar className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg sm:text-xl font-bold text-white">
              {seasonName} Fixtures Not Published Yet
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
              Fixtures for {seasonName} will appear here once published by the
              League Admin.
            </p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-8 text-center text-sm text-slate-400 space-y-2">
          {searchQuery.trim() || dateFilter !== 'ALL' ? (
            <>
              <p>
                No fixtures match
                {searchQuery.trim() && (
                  <span>
                    {' '}&ldquo;
                    <strong className="text-white">{searchQuery}</strong>&rdquo;
                  </span>
                )}
                {dateFilter !== 'ALL' && (
                  <span>
                    {' '}on <strong>{formatMatchDate(dateFilter)}</strong>
                  </span>
                )}
                {selectedDivision !== 'ALL' && (
                  <span>
                    {' '}in <strong>{selectedDivision}</strong>
                  </span>
                )}
                {statusFilter !== 'all' && <span> ({statusFilter})</span>}.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setDateFilter('ALL');
                  setSelectedDivision('ALL');
                  setStatusFilter(isCaptain ? 'mine' : 'all');
                }}
                className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:underline font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset all filters
              </button>
            </>
          ) : (
            <p>No fixtures match your selected division and status filters.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {searchQuery.trim() && (
            <div className="text-xs text-slate-400 font-medium px-1 flex items-center justify-between">
              <span>
                Found <strong className="text-white">{filtered.length}</strong>{' '}
                fixture{filtered.length === 1 ? '' : 's'} matching &ldquo;
                <strong className="text-white">{searchQuery}</strong>&rdquo;
              </span>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-emerald-400 hover:underline font-semibold"
              >
                Clear search
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filtered.map((fix) => {
            const home = teamsById[fix.homeTeamId];
            const away = teamsById[fix.awayTeamId];
            if (!home || !away) return null;

            const score = calculateMatchScore(fix);
            const isEditable = canEditFixture(fix);
            const isMyTeamMatch =
              session.teamId === fix.homeTeamId ||
              session.teamId === fix.awayTeamId;
            const timeframe = getMatchTimeframe(fix.matchDate, fix.status);

            return (
              <div
                key={fix.id}
                className={`bg-slate-900 border rounded-2xl p-3 sm:p-4 flex flex-col justify-between gap-3 transition hover:border-slate-700 ${
                  fix.status === 'live'
                    ? 'border-red-500/40 shadow-lg shadow-red-950/20'
                    : timeframe === 'today'
                    ? 'border-emerald-500/40 shadow-lg shadow-emerald-950/20'
                    : isMyTeamMatch
                    ? 'border-emerald-500/40'
                    : timeframe === 'upcoming'
                    ? 'border-sky-500/20 hover:border-sky-500/40'
                    : 'border-slate-800 opacity-95'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    {isKnockoutFixture(fix) ? (
                      <span className="font-bold text-amber-400 flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5 text-amber-400" />
                        {fix.competitionName ||
                          fix.cupName ||
                          (fix.division
                            ? `${fix.division} Knockout`
                            : 'Knockout')}
                        {fix.round || fix.cupRound
                          ? ` (${fix.round || fix.cupRound})`
                          : ''}
                      </span>
                    ) : (
                      <span className="font-bold text-emerald-400">
                        {fix.division}
                      </span>
                    )}
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400">
                      {formatMatchDate(fix.matchDate)}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                      fix.status === 'live'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
                        : fix.status === 'submitted'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : fix.status === 'approved'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : timeframe === 'today'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                        : timeframe === 'upcoming'
                        ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {fix.status === 'live' ? (
                      <>
                        <Radio className="w-2.5 h-2.5" />
                        {isKnockoutFixture(fix)
                          ? fix.knockoutFormat === 'play_all_15'
                            ? `LIVE (${score.completedFrames}/15)`
                            : 'LIVE (First to 8)'
                          : `LIVE (${score.completedFrames}/15)`}
                      </>
                    ) : fix.status === 'approved' ? (
                      <>
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Approved
                      </>
                    ) : fix.status === 'submitted' ? (
                      <>
                        <Clock className="w-2.5 h-2.5" />
                        Submitted
                      </>
                    ) : timeframe === 'today' ? (
                      <>
                        <Calendar className="w-2.5 h-2.5" />
                        Match Today
                      </>
                    ) : timeframe === 'upcoming' ? (
                      <>
                        <Clock className="w-2.5 h-2.5" />
                        Upcoming
                      </>
                    ) : (
                      <>
                        <History className="w-2.5 h-2.5" />
                        Past Date
                      </>
                    )}
                  </span>
                </div>

                <div
                  onClick={() => onSelectFixture(fix)}
                  className="cursor-pointer bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 sm:p-3.5 grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:gap-2 hover:border-slate-700 transition"
                >
                  <div className="text-left min-w-0 pr-1 sm:pr-2">
                    <div className="font-bold text-xs sm:text-base text-white line-clamp-2 leading-snug">
                      {home.name}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {isKnockoutFixture(fix)
                        ? score.isDecided && score.matchWinner === 'home'
                          ? '🏆 Winner'
                          : 'Home'
                        : `Home • ${score.homePoints} pts`}
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center px-1 shrink-0">
                    {score.completedFrames > 0 || fix.status !== 'scheduled' ? (
                      <div className="flex items-center gap-1 sm:gap-1.5 font-black text-base sm:text-lg text-white tabular-nums">
                        <span
                          className={
                            score.homeFrames > score.awayFrames
                              ? 'text-emerald-400'
                              : ''
                          }
                        >
                          {score.homeFrames}
                        </span>
                        <span className="text-slate-600">–</span>
                        <span
                          className={
                            score.awayFrames > score.homeFrames
                              ? 'text-emerald-400'
                              : ''
                          }
                        >
                          {score.awayFrames}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-slate-400 px-1.5 sm:px-2 py-1 rounded bg-slate-900 border border-slate-800 shrink-0">
                        20:00
                      </span>
                    )}
                  </div>

                  <div className="text-right min-w-0 pl-1 sm:pl-2">
                    <div className="font-bold text-xs sm:text-base text-white line-clamp-2 leading-snug">
                      {away.name}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {isKnockoutFixture(fix)
                        ? score.isDecided && score.matchWinner === 'away'
                          ? '🏆 Winner'
                          : 'Away'
                        : `Away • ${score.awayPoints} pts`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">
                      {home.venue}
                      {home.tableNumber ? ` (${home.tableNumber})` : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {canManageLeague && fix.status === 'submitted' && (
                      <button
                        type="button"
                        onClick={() => handleApproveFixture(fix)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onSelectFixture(fix)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        isEditable
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      {isEditable ? 'Scorecard' : 'View Scorecard'}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* Admin Confirmation Modal for Incomplete Scorecard Approval */}
      {confirmDialog && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
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

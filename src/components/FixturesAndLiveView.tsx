import React, { useEffect, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  MapPin,
  PlayCircle,
  Radio,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { Division, Fixture } from '../types/league';
import { useLeague } from '../context/LeagueContext';
import { calculateMatchScore, formatMatchDate } from '../utils/leagueEngine';

interface FixturesAndLiveViewProps {
  onSelectFixture: (fixture: Fixture) => void;
  onGoToAdmin?: () => void;
}

type StatusFilter =
  | 'mine'
  | 'all'
  | 'live'
  | 'scheduled'
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

  const [selectedDivision, setSelectedDivision] = useState<Division | 'ALL'>(
    'ALL'
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    isCaptain ? 'mine' : 'all'
  );

  useEffect(() => {
    if (isCaptain) {
      setStatusFilter('mine');
    } else {
      setStatusFilter((prev) => (prev === 'mine' ? 'all' : prev));
    }
  }, [isCaptain, session.teamId]);

  const teamsById = Object.fromEntries(teams.map((t) => [t.id, t]));
  const myTeam = isCaptain && session.teamId ? teamsById[session.teamId] : null;

  const myMatches =
    isCaptain && session.teamId
      ? fixtures
          .filter(
            (f) =>
              f.homeTeamId === session.teamId || f.awayTeamId === session.teamId
          )
          .sort((a, b) => a.matchDate.localeCompare(b.matchDate))
      : [];

  const myNextMatch =
    myMatches.find((f) => f.status === 'live') ||
    myMatches.find((f) => f.status === 'scheduled') ||
    myMatches.find((f) => f.status === 'submitted') ||
    (myMatches.length > 0 ? myMatches[myMatches.length - 1] : null);

  const filtered = fixtures
    .filter((f) => {
      if (selectedDivision !== 'ALL' && f.division !== selectedDivision) {
        return false;
      }
      if (statusFilter === 'mine') {
        return (
          f.homeTeamId === session.teamId || f.awayTeamId === session.teamId
        );
      }
      if (statusFilter !== 'all' && f.status !== statusFilter) {
        return false;
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
    { id: 'submitted', label: 'Submitted Cards' },
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

        {/* Division Pills */}
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
            All Divisions
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
      </div>

      {/* Team Captain Spotlight: My Next Match */}
      {isCaptain && myTeam && myNextMatch && (() => {
        const nextScore = calculateMatchScore(myNextMatch);
        const home = teamsById[myNextMatch.homeTeamId];
        const away = teamsById[myNextMatch.awayTeamId];

        return (
          <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border-2 border-emerald-500/50 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/40">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  MY NEXT MATCH
                </span>
                <span className="text-slate-400 font-semibold">
                  {myNextMatch.division} • Week {myNextMatch.weekNumber}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-300 font-medium">
                  {formatMatchDate(myNextMatch.matchDate)}
                </span>
              </div>

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
                  ? `LIVE NOW (${nextScore.completedFrames}/15)`
                  : myNextMatch.status === 'scheduled'
                  ? 'Upcoming Match'
                  : myNextMatch.status === 'submitted'
                  ? 'Submitted • Awaiting Approval'
                  : 'Approved Result'}
              </span>
            </div>

            <div
              onClick={() => onSelectFixture(myNextMatch)}
              className="cursor-pointer bg-slate-950/90 border border-slate-800 rounded-xl p-4 grid grid-cols-7 items-center gap-2 hover:border-emerald-500/50 transition shadow-inner"
            >
              <div className="col-span-3 text-left min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-bold text-sm sm:text-base text-white truncate">
                    {home?.name}
                  </span>
                  {home?.id === myTeam.id && (
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                      Your Team
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Home {nextScore.completedFrames > 0 && `• ${nextScore.homePoints} pts`}
                </div>
              </div>

              <div className="col-span-1 flex flex-col items-center justify-center">
                {nextScore.completedFrames > 0 || myNextMatch.status !== 'scheduled' ? (
                  <div className="flex items-center gap-1.5 font-black text-lg sm:text-2xl text-white tabular-nums">
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
                  <span className="text-xs font-bold text-emerald-400 px-2 py-1 rounded bg-slate-900 border border-slate-800">
                    20:00
                  </span>
                )}
              </div>

              <div className="col-span-3 text-right min-w-0">
                <div className="flex items-center justify-end gap-1.5 min-w-0">
                  {away?.id === myTeam.id && (
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                      Your Team
                    </span>
                  )}
                  <span className="font-bold text-sm sm:text-base text-white truncate">
                    {away?.name}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Away {nextScore.completedFrames > 0 && `• ${nextScore.awayPoints} pts`}
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
                {myNextMatch.status === 'live'
                  ? 'Continue Scoring Live'
                  : myNextMatch.status === 'scheduled'
                  ? 'Enter Lineup / Start Match'
                  : 'Open Scorecard'}
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
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-8 text-center text-sm text-slate-400">
          No fixtures match your selected division and status filters.
        </div>
      ) : (
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

            return (
              <div
                key={fix.id}
                className={`bg-slate-900 border rounded-2xl p-4 flex flex-col justify-between gap-3 transition hover:border-slate-700 ${
                  fix.status === 'live'
                    ? 'border-red-500/40 shadow-lg shadow-red-950/20'
                    : isMyTeamMatch
                    ? 'border-emerald-500/40'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-400">
                      {fix.division}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400">
                      Wk {fix.weekNumber} ({formatMatchDate(fix.matchDate)})
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      fix.status === 'live'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
                        : fix.status === 'submitted'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : fix.status === 'approved'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {fix.status === 'live'
                      ? `LIVE (${score.completedFrames}/15)`
                      : fix.status}
                  </span>
                </div>

                <div
                  onClick={() => onSelectFixture(fix)}
                  className="cursor-pointer bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 grid grid-cols-7 items-center gap-2"
                >
                  <div className="col-span-3 text-left min-w-0">
                    <div className="font-bold text-sm sm:text-base text-white truncate">
                      {home.name}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Home • {score.homePoints} pts
                    </div>
                  </div>

                  <div className="col-span-1 flex flex-col items-center justify-center">
                    {score.completedFrames > 0 || fix.status !== 'scheduled' ? (
                      <div className="flex items-center gap-1.5 font-black text-base sm:text-lg text-white tabular-nums">
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
                      <span className="text-xs font-bold text-slate-400 px-2 py-1 rounded bg-slate-900">
                        20:00
                      </span>
                    )}
                  </div>

                  <div className="col-span-3 text-right min-w-0">
                    <div className="font-bold text-sm sm:text-base text-white truncate">
                      {away.name}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Away • {score.awayPoints} pts
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
                        onClick={() => approveFixture(fix.id)}
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
                      {isEditable ? 'Score Sheet' : 'View Card'}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  Crown,
  ExternalLink,
  FileText,
  Flame,
  HeartHandshake,
  Info,
  Layers,
  LayoutGrid,
  List,
  MapPin,
  Medal,
  MessageSquare,
  Scale,
  Search,
  Shield,
  Shuffle,
  Snowflake,
  Sparkles,
  Sun,
  Timer,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useLeague } from '../context/LeagueContext';

type HonourSubTab =
  | 'league'
  | 'knockout'
  | 'captains-cup'
  | 'singles'
  | 'ladies-singles'
  | 'doubles'
  | 'mixed-doubles'
  | 'averages'
  | 'ladies-averages'
  | 'top-dish';

export const DocsAndRulesView: React.FC = () => {
  const { seasonName } = useLeague();
  const [section, setSection] = useState<
    'competitions' | 'honours' | 'format' | 'rules' | 'cofc'
  >('competitions');
  const [honourTab, setHonourTab] = useState<HonourSubTab>('league');
  const [compFilter, setCompFilter] = useState<
    | 'all'
    | 'open-singles'
    | 'open-doubles'
    | 'ladies-singles'
    | 'mixed-doubles'
    | 'captains-cup'
  >('all');
  const [honourViewMode, setHonourViewMode] = useState<'cards' | 'table'>('cards');
  const [honourSearch, setHonourSearch] = useState<string>('');
  const [seasonFilter, setSeasonFilter] = useState<'all' | 'winter' | 'summer'>('all');

  const renderTable = (
    headers: string[],
    rows: (string | number)[][]
  ): React.ReactNode => {
    const seasonLower = seasonFilter.toLowerCase();
    const seasonMatchedRows =
      seasonFilter === 'all'
        ? rows
        : rows.filter((r) => String(r[0]).toLowerCase().includes(seasonLower));

    const q = honourSearch.trim().toLowerCase();
    const filteredRows = q
      ? seasonMatchedRows.filter((r) => r.some((c) => String(c).toLowerCase().includes(q)))
      : seasonMatchedRows;

    const isTeamOrPair =
      headers[1]?.toLowerCase().includes('winners') ||
      ['league', 'knockout', 'doubles', 'mixed-doubles'].includes(honourTab);
    const winnerLabel = isTeamOrPair ? 'Winners' : 'Winner';
    const runnerUpLabel = isTeamOrPair ? 'Runners-up' : 'Runner-up';

    const renderSeasonBadge = (seasonText: string | number) => {
      const text = String(seasonText);
      const match = text.match(/^(Summer|Winter)\s+(\d{4}(?:\/\d{2})?)(?:\s+(.*))?$/i);
      if (match) {
        const [, seasonType, year, extra] = match;
        const isSummer = seasonType.toLowerCase() === 'summer';
        const shortYear = year.replace(/^20(\d\d)\/(\d\d)$/, "'$1/$2").replace(/^20(\d\d)$/, "'$1");
        return (
          <div className="flex flex-col items-start gap-0.5 min-w-0 max-w-full">
            <span
              className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md font-bold text-[10px] sm:text-[11px] shrink-0 max-w-full ${
                isSummer
                  ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                  : 'bg-sky-500/10 border border-sky-500/30 text-sky-300'
              }`}
            >
              {isSummer ? (
                <Sun className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400 shrink-0" />
              ) : (
                <Snowflake className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-sky-400 shrink-0" />
              )}
              <span className="sm:hidden whitespace-nowrap">{seasonType} {shortYear}</span>
              <span className="hidden sm:inline whitespace-nowrap">{seasonType} {year}</span>
            </span>
            {extra && (
              <span className="text-[10px] sm:text-xs text-slate-400 font-medium leading-tight break-words">
                {extra}
              </span>
            )}
          </div>
        );
      }
      return <span className="font-semibold text-slate-300 text-[11px] sm:text-xs break-words">{text}</span>;
    };

    if (filteredRows.length === 0) {
      return (
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-6 text-center text-xs text-slate-400">
          No records match '{honourSearch}'.
        </div>
      );
    }

    if (honourViewMode === 'cards') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {filteredRows.map((r, idx) => (
            <div
              key={idx}
              className="bg-slate-950/70 border border-slate-800/80 hover:border-slate-700/80 rounded-xl p-3.5 space-y-2 transition-all"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800/60 pb-1.5 font-medium">
                {renderSeasonBadge(r[0])}
              </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-xs shrink-0 mt-0.5">
                      🏆
                    </span>
                    <div className="leading-tight">
                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{winnerLabel}</div>
                      <div className="font-bold text-white text-xs sm:text-sm">{r[1]}</div>
                    </div>
                  </div>

                  {r[2] !== undefined && (
                    <div className="flex items-start gap-2 pt-1 border-t border-slate-800/40">
                      {typeof r[2] === 'number' ? (
                        <div className="flex items-center gap-1.5 text-amber-300 text-xs font-semibold ml-7">
                          <Flame className="w-3.5 h-3.5 text-amber-400" />
                          <span>{r[2]} Dishes</span>
                        </div>
                      ) : (
                        <>
                          <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 text-xs shrink-0 mt-0.5">
                            🥈
                          </span>
                          <div className="leading-tight">
                            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{runnerUpLabel}</div>
                            <div className="text-slate-300 text-xs">{r[2]}</div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      );
    }

    // Leaderboard Table View
    const colCount = headers.length;
    const isTopDish = headers.some((h) => h.toLowerCase().includes('dishes'));

    return (
      <div className="overflow-x-auto border border-slate-800 rounded-xl">
        <table className="w-full table-fixed text-xs sm:text-sm border-collapse">
          <colgroup>
            {colCount === 2 ? (
              <>
                <col className="w-[38%] sm:w-[30%]" />
                <col className="w-[62%] sm:w-[70%]" />
              </>
            ) : isTopDish ? (
              <>
                <col className="w-[35%] sm:w-[25%]" />
                <col className="w-[43%] sm:w-[50%]" />
                <col className="w-[22%] sm:w-[25%]" />
              </>
            ) : (
              <>
                <col className="w-[34%] sm:w-[26%]" />
                <col className="w-[33%] sm:w-[37%]" />
                <col className="w-[33%] sm:w-[37%]" />
              </>
            )}
          </colgroup>
          <thead>
            <tr className="bg-slate-950 text-slate-300 border-b border-slate-800 text-left">
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="py-2 px-2 sm:py-2.5 sm:px-3 font-bold text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-400 break-words"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r, idx) => (
              <tr
                key={idx}
                className="border-b border-slate-800/70 last:border-b-0 hover:bg-slate-800/30 transition-colors"
              >
                {r.map((cell, cIdx) => (
                  <td
                    key={cIdx}
                    className={`py-2 px-2 sm:py-2.5 sm:px-3 text-[11px] sm:text-xs align-top ${
                      cIdx === 0
                        ? 'pr-1.5 sm:pr-3 overflow-hidden'
                        : cIdx === 1
                        ? 'pl-1.5 sm:pl-3'
                        : ''
                    }`}
                  >
                    {cIdx === 0 ? (
                      renderSeasonBadge(cell)
                    ) : cIdx === 1 ? (
                      <div className="flex items-start gap-1 sm:gap-1.5 min-w-0">
                        <span className="text-[10px] sm:text-xs shrink-0 mt-0.5">🏆</span>
                        <span className="text-white font-bold break-words min-w-0 leading-tight sm:leading-normal">
                          {cell}
                        </span>
                      </div>
                    ) : cIdx === 2 && typeof cell === 'string' ? (
                      <div className="flex items-start gap-1 sm:gap-1.5 min-w-0">
                        <span className="text-[10px] sm:text-xs shrink-0 mt-0.5">🥈</span>
                        <span className="text-slate-300 break-words min-w-0 leading-tight sm:leading-normal">
                          {cell}
                        </span>
                      </div>
                    ) : cIdx === 2 && typeof cell === 'number' ? (
                      <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold text-[10px] sm:text-xs whitespace-nowrap">
                        <Flame className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400 shrink-0" />
                        <span>{cell} <span className="hidden sm:inline">dishes</span></span>
                      </span>
                    ) : (
                      <span className="break-words">{cell}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <Info className="w-3.5 h-3.5" />
            League Info &amp; History
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5">
            League Information, Rules &amp; Records
          </h1>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {(
            [
              { id: 'competitions', label: 'Competitions', icon: Trophy },
              { id: 'honours', label: 'Roll of Honour', icon: Trophy },
              { id: 'format', label: 'League Format', icon: FileText },
              { id: 'rules', label: 'League Rules', icon: Scale },
              { id: 'cofc', label: 'Champion of Champions', icon: Crown },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  section === item.id
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 text-xs sm:text-sm text-slate-300 space-y-6 leading-relaxed">
        {/* ================================================================ */}
        {/* 1. LEAGUE FORMAT (content/docs/league-format.md)                 */}
        {/* ================================================================ */}
        {section === 'format' && (
          <div className="space-y-6">
            {/* Hero Header */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Official Match Guidelines</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    League Format
                  </h2>
                  <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
                    Official 15-frame match structure, points scoring, lagging, substitutions and digital scorecard protocol for the Brighton Pool League.
                  </p>
                </div>
              </div>

              {/* Quick Highlights Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
                <div className="flex items-start gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                  <Layers className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">15 Frames Total</div>
                    <div className="text-xs text-slate-400">3 sets of 5 singles frame games per match.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                  <Clock className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">8:00 PM Sharp</div>
                    <div className="text-xs text-slate-400">1 hour max per set; matches finish before 11:00 PM.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                  <Users className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">Rolling Squad</div>
                    <div className="text-xs text-slate-400">Up to 15 players per match; substitutions before Sets 2 and 3.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                  <Award className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">7 Max Points</div>
                    <div className="text-xs text-slate-400">2 points for match win + 1 point for every 3 frames won.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 1. Overview */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800/80">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  1. Overview
                </h3>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    a
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    All matches consist of <strong>3 sets</strong> of <strong>5 singles frame games</strong> (15 games in total).
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    b
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    Player substitutions are allowed <strong>before the start of the 2nd and 3rd sets</strong> (up to 15 different players can play in one match).
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    c
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    The same player can play in each of the 3 sets (maximum of 3 games).
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    d
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    The same player <strong>cannot</strong> play multiple times in the same set (e.g. a player cannot play all 3 games in Set 1 and then leave).
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Points */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800/80">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Coins className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  2. Points
                </h3>
              </div>

              {/* Points Summary Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3.5 flex flex-col">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Match Win</span>
                  <span className="text-xl font-black text-white mt-0.5">2 Points</span>
                  <span className="text-[11px] text-slate-400 mt-1">Awarded to the match winner</span>
                </div>
                <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3.5 flex flex-col">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Frame Bonus</span>
                  <span className="text-xl font-black text-white mt-0.5">1 Point</span>
                  <span className="text-[11px] text-slate-400 mt-1">For every 3 frames won</span>
                </div>
                <div className="bg-slate-900/80 border border-emerald-500/30 rounded-xl p-3.5 flex flex-col bg-emerald-500/5">
                  <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Maximum Available</span>
                  <span className="text-xl font-black text-emerald-400 mt-0.5">7 Points</span>
                  <span className="text-[11px] text-slate-400 mt-1">2 for win + 5 for all 15 frames</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    a
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    Each match win is worth <strong>2 points</strong>.
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    b
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    In a match, every 3 frames won is worth <strong>1 point</strong>.
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    c
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    The maximum number of points a team can earn from a single match is <strong>7 points</strong> (2 for the win + 5 for winning all 15 frames).
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/50 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                      d
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-white">The possible outcomes are:</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {[
                      { score: '15–0', win: '7 points', loss: '0 points' },
                      { score: '14–1', win: '6 points', loss: '0 points' },
                      { score: '13–2', win: '6 points', loss: '0 points' },
                      { score: '12–3', win: '6 points', loss: '1 point' },
                      { score: '11–4', win: '5 points', loss: '1 point' },
                      { score: '10–5', win: '5 points', loss: '1 point' },
                      { score: '9–6', win: '5 points', loss: '2 points' },
                      { score: '8–7', win: '4 points', loss: '2 points' },
                    ].map((row, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between gap-2"
                      >
                        <span className="font-extrabold text-white text-xs sm:text-sm tracking-wide">
                          {row.score}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold whitespace-nowrap">
                            {row.win}
                          </span>
                          <span className="text-slate-600">/</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-medium whitespace-nowrap">
                            {row.loss}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Timekeeping */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800/80">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  3. Timekeeping
                </h3>
              </div>

              {/* Time Milestones Banner */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3 flex flex-col">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Start Time</span>
                  <span className="text-base font-extrabold text-emerald-400 mt-0.5">8:00 PM Sharp</span>
                  <span className="text-[11px] text-slate-400 mt-1">Prompt match start</span>
                </div>
                <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3 flex flex-col">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Set Limit</span>
                  <span className="text-base font-extrabold text-white mt-0.5">Max 1 Hour</span>
                  <span className="text-[11px] text-slate-400 mt-1">10:00 PM Set 3 target</span>
                </div>
                <div className="bg-slate-900/80 border border-amber-500/30 rounded-xl p-3 flex flex-col bg-amber-500/5">
                  <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Shot Clock</span>
                  <span className="text-base font-extrabold text-amber-400 mt-0.5">10:30 PM</span>
                  <span className="text-[11px] text-slate-400 mt-1">If Set 3, Frame 3 not started</span>
                </div>
                <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3 flex flex-col">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Curfew</span>
                  <span className="text-base font-extrabold text-rose-400 mt-0.5">11:00 PM</span>
                  <span className="text-[11px] text-slate-400 mt-1">Match must conclude</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    a
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    Matches should start at <strong>8:00 PM sharp</strong>.
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    b
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    Captains are responsible for ensuring matches start on time, maintaining the flow of play through each set and finishing the match before <strong>11:00 PM</strong>.
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    c
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    Captains should allow a <strong>maximum of 1 hour per set</strong>. If the 3rd set has not started by 10:00 PM, both captains must ensure play is speeded up.
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      d
                    </span>
                    <div className="text-xs sm:text-sm text-slate-200 leading-relaxed pt-0.5">
                      Captains are advised to introduce a <strong>shot clock</strong> at <strong>10:30 PM</strong> if the 3rd game (in the 3rd set) has not yet started.
                    </div>
                  </div>
                  <a
                    href="https://www.epa.org.uk/stopclock/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold whitespace-nowrap transition-colors self-start sm:self-auto shrink-0"
                  >
                    <Timer className="w-3.5 h-3.5" />
                    <span>EPA Shot Clock</span>
                    <ExternalLink className="w-3 h-3 ml-0.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* 4. Completing the Scorecard */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800/80">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  4. Completing the Scorecard
                </h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    a
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    Both captains open the fixture in the app and log in with their <strong>6-digit Captain PIN</strong> to edit the live scorecard.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    b
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    <strong>Blind Set 1 Lineup Entry:</strong> Each captain selects their 5 players from their squad dropdown for positions <strong>1–5</strong> (their running order in the first set). Selections remain hidden from opponents until both captains tap <strong>Confirm Lineup</strong>, revealing both teams' lineups simultaneously.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    c
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    <strong>Lag &amp; Break Determination:</strong> Player 1 from each team lags. Tap the winning side (<strong>Home</strong> or <strong>Away</strong>) on the scorecard. The app automatically assigns the break for all 15 frames across all 3 sets (8 breaks to the lag winner and 7 to their opponent).
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    d
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    <strong>Home Team Playing Order:</strong> The home team’s playing order remains in positions <strong>1–5</strong> across all sets.
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/50 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      e
                    </span>
                    <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                      <strong>Away Team Playing Order:</strong> The away team’s playing order rotates each set so that opponents always differ, as shown below:
                    </div>
                  </div>

                  {/* Away Rotation Matrix Table */}
                  <div className="max-w-lg mx-auto sm:mx-0 pt-1">
                    <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/90 shadow-sm">
                      <table className="w-full text-xs sm:text-sm border-collapse text-left">
                        <thead>
                          <tr className="bg-slate-900 text-slate-200 border-b border-slate-800 text-[11px] uppercase tracking-wider">
                            <th className="py-2.5 px-3.5 font-bold border-r border-slate-800 text-center">
                              Set 1
                            </th>
                            <th className="py-2.5 px-3.5 font-bold border-r border-slate-800 text-center">
                              Set 2
                            </th>
                            <th className="py-2.5 px-3.5 font-bold text-center">
                              Set 3
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70">
                          {[
                            { s1: ['1', 'Player A'], s2: ['3', 'Player C'], s3: ['4', 'Player D'] },
                            { s1: ['2', 'Player B'], s2: ['4', 'Player D'], s3: ['1', 'Player A'] },
                            { s1: ['3', 'Player C'], s2: ['5', 'Player E'], s3: ['2', 'Player B'] },
                            { s1: ['4', 'Player D'], s2: ['2', 'Player B'], s3: ['5', 'Player E'] },
                            { s1: ['5', 'Player E'], s2: ['1', 'Player A'], s3: ['3', 'Player C'] },
                          ].map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                              <td className="py-2.5 px-3.5 border-r border-slate-800">
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-400 font-bold text-xs mr-2">
                                  {row.s1[0]}
                                </span>
                                <span className="text-white font-medium">{row.s1[1]}</span>
                              </td>
                              <td className="py-2.5 px-3.5 border-r border-slate-800">
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-400 font-bold text-xs mr-2">
                                  {row.s2[0]}
                                </span>
                                <span className="text-white font-medium">{row.s2[1]}</span>
                              </td>
                              <td className="py-2.5 px-3.5">
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-400 font-bold text-xs mr-2">
                                  {row.s3[0]}
                                </span>
                                <span className="text-white font-medium">{row.s3[1]}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    f
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    <strong>Subsequent Sets:</strong> Set 1 player selections automatically cascade into Sets 2 and 3. If no substitutions are made, captains do not need to re-enter names.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    g
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    <strong>Substitutions:</strong> If making changes, tap <strong>Make Subs</strong> before the set starts, select the replacement player from the squad list and tap <strong>Confirm Subs</strong>. The opposing captain will be prompted to approve the change before play continues.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    h
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    <strong>Recording Frame Results:</strong> After each frame, tap the player who won the frame on the scorecard. The running match score and set totals update live automatically.
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      i
                    </span>
                    <div className="text-xs sm:text-sm text-slate-200 leading-relaxed pt-0.5">
                      <strong>Dishes &amp; Reverse Dishes:</strong> If a game is won in a single visit, tap the <strong>Dish</strong> button on that frame:
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 pl-9">
                    <div className="bg-slate-950/70 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2.5">
                      <Flame className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-xs text-slate-300">
                        A <strong className="text-white">dish</strong> is a clearance in one visit from the break.
                      </div>
                    </div>
                    <div className="bg-slate-950/70 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2.5">
                      <Flame className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-xs text-slate-300">
                        A <strong className="text-white">reverse dish</strong> occurs when your opponent fails to pot from the break (or commits a foul break) and you clear up in one visit.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Substitutions */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800/80">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Shuffle className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  5. Substitutions
                </h3>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    a
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    Before the 2nd and 3rd sets begin, captains may substitute as many players as they wish.
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    b
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    Substitutes take the <strong>same position</strong> as the player they replace (e.g. if Player 1 is replaced in Set 3, the substitute plays second in that set).
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    c
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    A player may be substituted out in Set 2 and substituted back in for Set 3.
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    d
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    Substituted players must <strong>not</strong> have played in the previous set (to prevent simply changing the playing order).
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    e
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    To make substitutions in the app, tap <strong>Make Subs</strong> before the set starts, select the substitute from your squad list and tap <strong>Confirm Subs</strong> for the opposing captain to approve.
                  </div>
                </div>
              </div>
            </div>

            {/* 6. Lagging */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800/80">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Coins className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  6. Lagging
                </h3>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    a
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    Only <strong>Player 1</strong> from each team lags — this determines the breaking order for the rest of the match.
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    b
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    Breaks alternate between teams: the team that breaks first gets <strong>8 breaks</strong>, while their opponents get <strong>7</strong>.
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    c
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    Tap the lag winner on the digital scorecard to automatically assign break indicators for every frame across all 3 sets.
                  </div>
                </div>
              </div>
            </div>

            {/* 7. End of the Match */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800/80">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  7. End of the Match
                </h3>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    a
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    Verify that all <strong>15 frames</strong> and any <strong>dish / reverse dish</strong> awards have been recorded correctly on the scorecard.
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    b
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    Both captains must sign off at the bottom of the scorecard by tapping <strong>Sign</strong>.
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    c
                  </span>
                  <div className="text-xs sm:text-sm text-slate-200 leading-relaxed pt-0.5">
                    Once both captains have signed, tap <strong>Finish &amp; Submit Match</strong> to finalise the match result. League tables and player statistics update live automatically with no need to take a photo or post to WhatsApp or social media.
                  </div>
                </div>
              </div>
            </div>

            {/* 8. League Tables */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800/80">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Trophy className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  8. League Tables
                </h3>
              </div>

              {/* a. Teams Table */}
              <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-4 space-y-3">
                <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-bold flex items-center justify-center">a</span>
                  <span>The teams' league table is sorted as follows:</span>
                </div>
                <div className="space-y-2 pl-7">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="font-semibold text-emerald-400">i.</span>
                    <span>Total Points</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="font-semibold text-emerald-400">ii.</span>
                    <span>Frame difference (Total frames won minus total frames lost)</span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <div className="text-xs font-semibold text-slate-200">
                      <span className="text-emerald-400 mr-2">iii.</span>
                      In the event of teams finishing the season with the same record:
                    </div>
                    <div className="space-y-1.5 pl-5 text-xs text-slate-300">
                      <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/60">
                        <strong className="text-white">1. Head-to-head record:</strong> a) Total points won (both games combined), b) Frame difference (both games combined).
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/60">
                        <strong className="text-white">2.</strong> If that is also tied, then each team’s record against the highest-placed team in the league: a) Total points won (both games combined), b) Frame difference (both games combined).
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/60">
                        <strong className="text-white">3.</strong> If that is also tied, then this will be repeated down the league table until the teams can be separated.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* b. Players Averages */}
              <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-4 space-y-3">
                <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-bold flex items-center justify-center">b</span>
                  <span>The players' averages table is sorted as follows:</span>
                </div>
                <div className="space-y-2 pl-7">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="font-semibold text-emerald-400">i.</span>
                    <span>Total wins</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="font-semibold text-emerald-400">ii.</span>
                    <span>Overall win percentage</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="font-semibold text-emerald-400">iii.</span>
                    <span>Total number of dishes made</span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <div className="text-xs font-semibold text-slate-200">
                      <span className="text-emerald-400 mr-2">iv.</span>
                      If the averages winner cannot be determined, then the following is used to determine the winner:
                    </div>
                    <div className="space-y-1.5 pl-5 text-xs text-slate-300">
                      <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/60">
                        <strong className="text-white">1.</strong> Head-to-head record
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/60">
                        <strong className="text-white">2.</strong> If that is still tied, then determined by whose team finished highest in the league
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/60">
                        <strong className="text-white">3.</strong> If players are in the same team – then a single-frame shoot-out will be played on finals night.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* c. Dishes Table */}
              <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-4 space-y-3">
                <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-bold flex items-center justify-center">c</span>
                  <span>The players' dish table is sorted as follows:</span>
                </div>
                <div className="space-y-2 pl-7">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="font-semibold text-emerald-400">i.</span>
                    <span>Total number of dishes + reverse dishes made over the season</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="font-semibold text-emerald-400">ii.</span>
                    <span>If the overall winner cannot be determined as it is tied, then awarded to the player highest in the averages table</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 9. Additional Information for Teams Without 5 Players */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800/80">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  9. Additional Information for Teams Without 5 Players
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800 text-xs font-bold text-white">
                    1) Team with Only 4 Players
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300">a. Select BYE in position 5 from the lineup dropdown.</p>
                  <p className="text-xs sm:text-sm text-slate-300">b. Any player facing a BYE is automatically awarded the win.</p>
                </div>

                <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800 text-xs font-bold text-white">
                    2) Both Teams with Only 4 Players
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300">a. Both teams select BYE in position 5 from the lineup dropdown.</p>
                  <p className="text-xs sm:text-sm text-slate-300">b. Any player facing a BYE is automatically awarded the win.</p>
                  <p className="text-xs sm:text-sm text-slate-300">
                    c. The team that wins the lag is awarded the win in <strong>Set 1 (5 vs 5)</strong>.
                  </p>
                </div>

                <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800 text-xs font-bold text-white">
                    3) Team with Only 3 Players
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300">a. Select BYE in positions 4 and 5 from the lineup dropdown.</p>
                  <p className="text-xs sm:text-sm text-slate-300">b. Any player facing a BYE is automatically awarded the win.</p>
                </div>

                <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800 text-xs font-bold text-white">
                    4) Team of 4 vs Team of 3
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300">a. The team of 3 selects BYE in positions 4 and 5.</p>
                  <p className="text-xs sm:text-sm text-slate-300">b. The team of 4 selects BYE in position 5.</p>
                  <p className="text-xs sm:text-sm text-slate-300">c. Any player facing a BYE is automatically awarded the win.</p>
                  <p className="text-xs sm:text-sm text-slate-300">
                    d. The team that wins the lag is awarded the win in <strong>Set 1 (5 vs 5)</strong>.
                  </p>
                </div>

                <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 space-y-2 md:col-span-2">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800 text-xs font-bold text-white">
                    5) Team of 3 vs Team of 3
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300">
                    a. Both teams select BYE in positions 4 and 5 from the lineup dropdown.
                  </p>
                  <p className="text-xs sm:text-sm text-slate-300">b. Any player facing a BYE is automatically awarded the win.</p>
                  <p className="text-xs sm:text-sm text-slate-300">
                    c. The team that wins the lag is awarded the wins in <strong>Set 1 (5 vs 5)</strong> and <strong>(4 vs 4)</strong> and the win in <strong>Set 3 (5 vs 4)</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* 2. LEAGUE RULES (content/docs/league-rules.md)                   */}
        {/* ================================================================ */}
        {section === 'rules' && (
          <div className="space-y-6">
            {/* Hero Header */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
                    <Scale className="w-3.5 h-3.5" />
                    <span>League Constitution &amp; Governance</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    League Rules
                  </h2>
                  <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
                    By registering a team with the league, you agree to abide by the following rules. All regulations are enforced by the Brighton Pool League committee.
                  </p>
                </div>
              </div>

              {/* Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-800/80">
                <div className="flex items-start gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                  <HeartHandshake className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">Zero Tolerance Policy</div>
                    <div className="text-xs text-slate-400">Strict adherence to UK Equality Act 2010 standards across all venues.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                  <UserCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">Registered Players</div>
                    <div className="text-xs text-slate-400">Only registered players are eligible; non-registered players forfeit the match.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                  <Award className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">Cup Eligibility</div>
                    <div className="text-xs text-slate-400">Minimum 4 league matches required to participate in Cup Semi-Finals and Finals.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 1. Code of Conduct */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800/80">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  1. Code of Conduct
                </h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    a
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    All players are expected to uphold the values of the Brighton league and to conduct themselves in a respectful and accepting manner – without any forms of abuse or discrimination.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    b
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    Venues are required to uphold the values of the Brighton league, with the safety and welfare of players of paramount consideration.
                  </div>
                </div>

                {/* Equality Act Box */}
                <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 space-y-2.5">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      c
                    </span>
                    <div className="text-xs sm:text-sm text-slate-200 leading-relaxed pt-0.5">
                      In line with the UK Equality Act 2010, the Brighton league has zero tolerance for discrimination across any of the protected characteristics:
                    </div>
                  </div>
                  <div className="space-y-2 pl-9">
                    <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/60 text-xs text-slate-300">
                      <strong className="text-white">i.</strong> Age, Disability, Gender Reassignment, Marriage and Civil Partnership, Pregnancy and Maternity, Race, Religion or Belief, Sex and Sexual Orientation.
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/60 text-xs text-slate-300">
                      <strong className="text-white">ii.</strong> Discrimination is classed as Direct, Indirect, Harassment or Victimisation.
                    </div>
                  </div>
                </div>

                {/* Disciplinary Action */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/50 space-y-2.5">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      d
                    </span>
                    <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                      All reported instances where these standards have not been met will result in an investigation by the committee on a case-by-case basis:
                    </div>
                  </div>
                  <div className="space-y-2 pl-9">
                    <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/60 text-xs text-slate-300">
                      <strong className="text-white">i.</strong> The league reserves the right to ban any individual or venue that breaks these rules and may pass all relevant information to the police for further investigation.
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/60 text-xs text-slate-300">
                      <strong className="text-white">ii.</strong> Teams and venues that are banned will not be refunded their team registrations.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Registered Players */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800/80">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  2. Registered Players
                </h3>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    a
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    Only players registered with the league are eligible to play in matches.
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
                  <span className="w-6 h-6 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    b
                  </span>
                  <div className="text-xs sm:text-sm text-slate-200 leading-relaxed pt-0.5">
                    If a team fields an unregistered player, their opponent will be awarded the win.
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    c
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    All captains must register their full squad before the registration window closes.
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    d
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    The registration window closes approximately two weeks before the season starts.
                  </div>
                </div>
              </div>
            </div>

            {/* 3. New Signings */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800/80">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  3. New Signings
                </h3>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    a
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    New players who are not registered with another team may be signed at any point during the season.
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    b
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    Captains <strong>must</strong> notify the league of all new signings.
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    c
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    New signings must be registered with the league before playing (see Section 1).
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Player Transfers */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800/80">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  4. Player Transfers
                </h3>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    a
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    Players registered with another team but who have <strong>not made any appearances</strong> for that team may be transferred at any time during the season.
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    b
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    Players who <strong>have made at least one appearance</strong> for another team may only be transferred during the <strong>first half of the season</strong>.
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    c
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    The halfway point of the season is determined <strong>by date</strong>, not by games played (to account for postponed matches).
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    d
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    All player transfers must be registered with the league before playing (see Section 1).
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Cup Semi-Finals & Finals */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800/80">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <Trophy className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  5. Cup Semi-Finals &amp; Finals
                </h3>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <span className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    a
                  </span>
                  <div className="text-xs sm:text-sm text-slate-200 leading-relaxed pt-0.5">
                    Players may only participate in Cup Semi-Finals or Finals if they have played <strong>a minimum of four (4) matches</strong> for that team during the season.
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    b
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    Matches played for another team (prior to a transfer) do <strong>not</strong> count towards the four-match requirement.
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
                  <span className="w-6 h-6 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    c
                  </span>
                  <div className="text-xs sm:text-sm text-slate-200 leading-relaxed pt-0.5">
                    If a player takes part in a Semi-Final or Final without meeting the eligibility criteria, their opponent will be awarded the win.
                  </div>
                </div>
              </div>
            </div>

            {/* 6. New Teams */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800/80">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  6. New Teams
                </h3>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    a
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    New teams entering the league will start in the <strong>lowest division</strong>.
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    b
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    The only exception is if the league determines it is in the league’s best interest for the new team to start in a <strong>higher division</strong>. This will be decided by the league.
                  </div>
                </div>
              </div>
            </div>

            {/* 7. Teams Folding */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800/80">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  7. Teams Folding
                </h3>
              </div>

              {/* First vs Second Half Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3.5 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                    First Half Folding
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 pt-1">
                    <strong>a.</strong> If a team folds in the <strong>first half</strong> of the season, all results will be <strong>expunged</strong>.
                  </div>
                </div>
                <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3.5 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                    Second Half Folding
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 pt-1">
                    <strong>b.</strong> If a team folds in the <strong>second half</strong> of the season, first-half results will stand and all second-half results will be <strong>expunged</strong>.
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    c
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    Each situation of a team folding will be reviewed by the league on a <strong>case-by-case basis</strong>.
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    d
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    The league may impose <strong>player or team bans</strong> and/or <strong>relegations</strong> as appropriate.
                  </div>
                </div>
              </div>
            </div>

            {/* 8. Walkovers */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800/80">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  8. Walkovers
                </h3>
              </div>

              {/* Walkover Score Highlight Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5 flex flex-col">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Non-Offending Team</span>
                  <span className="text-xl font-black text-white mt-0.5">15–0 Win</span>
                  <span className="text-xs text-emerald-300 font-medium mt-1">Awarded maximum 7 points (2 win + 5 bonus)</span>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Defaulting Team</span>
                  <span className="text-xl font-black text-slate-300 mt-0.5">0–15 Frame Score</span>
                  <span className="text-xs text-slate-400 font-medium mt-1">Awarded 0 points; subject to committee review</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    a
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    If a team concedes or is unable to fulfill a fixture, a <strong>walkover</strong> is awarded.
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    b
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    The non-offending team is awarded a <strong>15–0 win</strong> and maximum league points (<strong>7 points</strong>: 2 points for the match win plus 5 bonus points for winning all 15 frames).
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <span className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    c
                  </span>
                  <div className="text-xs sm:text-sm text-slate-200 leading-relaxed pt-0.5">
                    The winning team captain must notify the <strong>league admin</strong> which of their registered squad players are to be awarded the wins for the <strong>15 individual frames</strong>, ensuring their player statistics and individual averages reflect the walkover correctly.
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    d
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    The defaulting team receives <strong>0 points</strong> and a 0–15 frame score for that match. Repeated walkovers or failure to fulfill fixtures will be referred to the league committee and may result in disciplinary action or team expulsion under Section 7.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* 3. CHAMPION OF CHAMPIONS (content/docs/champion-of-champions.md) */}
        {/* ================================================================ */}
        {section === 'cofc' && (
          <div className="space-y-6">
            {/* Hero Header */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider">
                    <Crown className="w-3.5 h-3.5" />
                    <span>National EPA Competition</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    Champion of Champions
                  </h2>
                  <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
                    The Champion of Champions event is usually played in November each year and aims to find the top open singles player, the top ladies singles player and the top team from all local pool leagues across the country. Further information can be found on the EPA website{' '}
                    <a
                      href="https://www.epa.org.uk/cofc/#gsc.tab=0"
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-400 underline font-semibold hover:text-amber-300"
                    >
                      here
                    </a>
                    .
                  </p>
                </div>

                <div className="shrink-0">
                  <a
                    href="https://www.epa.org.uk/cofc/#gsc.tab=0"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs transition-colors shadow-sm"
                  >
                    <span>Official EPA Tournament</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
                <div className="flex items-start gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                  <Users className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">Up to 4 Teams</div>
                    <div className="text-xs text-slate-400">Can represent Brighton in the team championship.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                  <Medal className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">2 Singles Spots</div>
                    <div className="text-xs text-slate-400">Allocated to each qualified Brighton team.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                  <Award className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">Men’s &amp; Ladies’</div>
                    <div className="text-xs text-slate-400">Spots cover Open and Ladies' singles categories.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                  <Calendar className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">November Annual</div>
                    <div className="text-xs text-slate-400">National competition played each November.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 1. Overview */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800/80">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <Crown className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  1. Overview
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    •
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    The <strong>Brighton League</strong> can be represented by up to <strong>four (4) teams</strong> in the Champion of Champions.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    •
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Each team representing the Brighton League is allocated <strong>two (2) singles spots</strong>.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    •
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    These singles spots are for entry into either the <strong>Men’s Singles</strong> or <strong>Ladies’ Singles</strong> competitions.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    •
                  </span>
                  <div className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    Any team wishing to represent Brighton <strong>must obtain league approval</strong> before submitting their entry form.
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Allocation of Singles Spots */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800/80">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <Medal className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  2. Allocation of Singles Spots
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-slate-300">
                The Brighton League will allocate singles spots based on the following <strong>ranking system</strong>:
              </p>

              {/* Ranking Ladder Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                {[
                  { rank: 1, title: 'Winter Open Singles', season: 'winter' },
                  { rank: 2, title: 'Winter Ladies Singles', season: 'winter' },
                  { rank: 3, title: 'Winter Premier League Averages', season: 'winter' },
                  { rank: 4, title: 'Summer Open Singles', season: 'summer' },
                  { rank: 5, title: 'Summer Ladies Singles', season: 'summer' },
                  { rank: 6, title: 'Summer Premier League Averages', season: 'summer' },
                ].map((item) => (
                  <div
                    key={item.rank}
                    className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-slate-700/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={
                          'w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center shrink-0 border ' +
                          (item.rank === 1
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : item.rank === 2
                            ? 'bg-slate-400/20 text-slate-200 border-slate-400/40'
                            : item.rank === 3
                            ? 'bg-amber-700/20 text-amber-500 border-amber-700/40'
                            : 'bg-slate-800 text-slate-400 border-slate-700')
                        }
                      >
                        #{item.rank}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-white">
                        {item.title}
                      </span>
                    </div>
                    {item.season === 'summer' ? (
                      <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : (
                      <Snowflake className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Declined or Unfilled Spots */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800/80">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <Shuffle className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  3. Declined or Unfilled Spots
                </h3>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    If a <strong>winner</strong> declines a singles spot, it will be passed down the list in ranking order.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    If the league reaches the <strong>bottom of the list</strong> and has been unable to fill the singles spots, allocation restarts from the <strong>top of the list</strong>, offering spots to <strong>runners-up</strong> or <strong>2nd in the averages</strong>.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
                    If runners-up decline a spot and the league again reaches the bottom of the list, allocation restarts from the top and offers the spots to <strong>losing semi-finalists</strong> (starting with the player who finished higher in the <strong>Winter Averages</strong>) or <strong>3rd in the averages</strong>.
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Additional Spots */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800/80">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <Info className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  4. Additional Spots
                </h3>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    •
                  </span>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    There is a <strong>possibility of a 7th and an 8th singles spot</strong> (if four teams represent the Brighton League).
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    •
                  </span>
                  <div className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    These additional allocations are <strong>currently under review</strong>, with further information to be provided at a later date.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {section === 'competitions' && (
          <div className="space-y-6">
            {/* Header intro & overview */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Season {seasonName || 'Winter 2026/27'} Competitions</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    Individual & Pairs Tournaments
                  </h3>
                  <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
                    Official format, rules, match arrangement windows and handicap matrices for all Winter 2026/27 competitions. All finals culminate on Presentation Night.
                  </p>
                </div>
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col items-start sm:items-end justify-center min-w-[200px] shrink-0">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    <span>Grand Finals Night</span>
                  </div>
                  <div className="text-base sm:text-lg font-bold text-white mt-1">
                    Monday, 5th April 2027
                  </div>
                  <div className="text-xs text-amber-400/90 font-medium mt-0.5">
                    Presentation & Trophy Night
                  </div>
                </div>
              </div>

              {/* General Rules Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
                <div className="flex items-start gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                  <BookOpen className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">International Rules</div>
                    <div className="text-xs text-slate-400">Standard International 8-Ball rules apply across all competitions.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                  <MapPin className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">Brighton Venues</div>
                    <div className="text-xs text-slate-400">Drawn home player/pair must host at an approved Brighton league venue.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                  <Shuffle className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">Random Draw</div>
                    <div className="text-xs text-slate-400">Each round is drawn completely at random with no seeding.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                  <Award className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">Trophies & Prizes</div>
                    <div className="text-xs text-slate-400">Prize money and trophies awarded to winners and runners-up.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* How to Enter Callout */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>How to Enter</span>
                    <span className="text-[11px] font-semibold text-amber-400 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">Entries Open</span>
                  </div>
                  <div className="text-xs sm:text-sm text-slate-300 mt-0.5">
                    To enter any of these competitions, please contact <strong className="text-amber-400 font-semibold">Cliona Saunders-Cooney</strong>.
                  </div>
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-semibold text-slate-300 shrink-0 self-start sm:self-auto">
                <Coins className="w-3.5 h-3.5 text-emerald-400" />
                <span>£10 Entry per event</span>
              </div>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {[
                { id: 'all', label: 'All Competitions' },
                { id: 'open-singles', label: 'Open Singles' },
                { id: 'open-doubles', label: 'Open Doubles' },
                { id: 'ladies-singles', label: 'Ladies Singles' },
                { id: 'mixed-doubles', label: 'Mixed Doubles' },
                { id: 'captains-cup', label: 'Captains Cup' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCompFilter(tab.id as typeof compFilter)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    compFilter === tab.id
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Competitions Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 1. Open Singles */}
              {(compFilter === 'all' || compFilter === 'open-singles') && (
                <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-7 flex flex-col justify-between hover:border-slate-700/80 transition-all">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                          <Trophy className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                            Individual Championship
                          </div>
                          <h4 className="text-xl font-black text-white">Open Singles</h4>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                          <Coins className="w-3.5 h-3.5" />
                          £10 Entry
                        </span>
                        <span className="text-[11px] text-slate-400 mt-1">per player</span>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-300">
                      The flagship individual knockout championship open to all registered league players across every division.
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                        <div className="text-slate-400 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>Match Format</span>
                        </div>
                        <div className="text-white font-bold mt-1 text-sm">Race to 5</div>
                        <div className="text-[11px] text-slate-400">All the way through</div>
                      </div>
                      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                        <div className="text-slate-400 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-sky-400" />
                          <span>Round Window</span>
                        </div>
                        <div className="text-white font-bold mt-1 text-sm">3 Weeks</div>
                        <div className="text-[11px] text-slate-400">To arrange & play</div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-800/60">
                      <div className="text-xs font-semibold text-slate-300">Key Rules & Details:</div>
                      <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                        <li><span className="text-slate-200">International Rules</span> played across every match.</li>
                        <li><span className="text-slate-200">Random draw</span> conducted before each round (no seeding).</li>
                        <li><span className="text-slate-200">Home advantage</span>: first drawn player chooses and hosts at a registered Brighton league venue.</li>
                        <li><span className="text-slate-200">Grand Finals</span> to be contested on Presentation Night (Monday, 5th April 2027).</li>
                        <li><span className="text-slate-200">Honours</span>: Winner & runner-up receive trophies and prize money.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Open Doubles */}
              {(compFilter === 'all' || compFilter === 'open-doubles') && (
                <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-7 flex flex-col justify-between hover:border-slate-700/80 transition-all">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                          <Users className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-sky-400 uppercase tracking-wider">
                            Pairs Championship
                          </div>
                          <h4 className="text-xl font-black text-white">Open Doubles</h4>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                          <Coins className="w-3.5 h-3.5" />
                          £10 Entry
                        </span>
                        <span className="text-[11px] text-slate-400 mt-1">per pair</span>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-300">
                      Open pairs Scotch Doubles tournament contested by any two registered league players regardless of division or gender.
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                        <div className="text-slate-400 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                          <span>Match Format</span>
                        </div>
                        <div className="text-white font-bold mt-1 text-sm">Race to 5</div>
                        <div className="text-[11px] text-slate-400">Scotch alternate shots</div>
                      </div>
                      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                        <div className="text-slate-400 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Round Window</span>
                        </div>
                        <div className="text-white font-bold mt-1 text-sm">3–4 Weeks</div>
                        <div className="text-[11px] text-slate-400">Dependent on entries</div>
                      </div>
                    </div>

                    {/* Scotch Rule Highlight */}
                    <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-3 text-xs text-sky-200 flex items-start gap-2.5">
                      <MessageSquare className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-white">Scotch Format & Coaching Rule: </span>
                        Partners take alternate shots throughout each visit. Talking / tactical discussion is permitted <em>only before the first shot</em> of a pair's visit. No consultation once that first shot is struck.
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-800/60">
                      <div className="text-xs font-semibold text-slate-300">Key Rules & Details:</div>
                      <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                        <li><span className="text-slate-200">International Rules</span> apply throughout.</li>
                        <li><span className="text-slate-200">Random draw</span> each round with no seeding.</li>
                        <li><span className="text-slate-200">Home pair</span> must arrange and host match at a Brighton league venue.</li>
                        <li><span className="text-slate-200">Grand Finals</span> on Presentation Night (5th April 2027).</li>
                        <li><span className="text-slate-200">Trophies & prize money</span> for winners and runners-up.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Ladies Singles */}
              {(compFilter === 'all' || compFilter === 'ladies-singles') && (
                <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-7 flex flex-col justify-between hover:border-slate-700/80 transition-all">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                          <Crown className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-pink-400 uppercase tracking-wider">
                            Ladies Championship
                          </div>
                          <h4 className="text-xl font-black text-white">Ladies Singles</h4>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                          <Coins className="w-3.5 h-3.5" />
                          £10 Entry
                        </span>
                        <span className="text-[11px] text-slate-400 mt-1">per player</span>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-300">
                      The premier women's knockout tournament open to all registered female league players across all divisions.
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                        <div className="text-slate-400 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                          <span>Match Format</span>
                        </div>
                        <div className="text-white font-bold mt-1 text-sm">Race to 5</div>
                        <div className="text-[11px] text-slate-400">All the way through</div>
                      </div>
                      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                        <div className="text-slate-400 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-sky-400" />
                          <span>Round Window</span>
                        </div>
                        <div className="text-white font-bold mt-1 text-sm">4 Weeks</div>
                        <div className="text-[11px] text-slate-400">To arrange & play</div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-800/60">
                      <div className="text-xs font-semibold text-slate-300">Key Rules & Details:</div>
                      <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                        <li><span className="text-slate-200">International Rules</span> played across every match.</li>
                        <li><span className="text-slate-200">Random draw</span> conducted before each round.</li>
                        <li><span className="text-slate-200">Generous 4-week match window</span> to ensure smooth scheduling.</li>
                        <li><span className="text-slate-200">Home player</span> must host at an approved Brighton league venue.</li>
                        <li><span className="text-slate-200">Grand Finals</span> on Presentation Night (5th April 2027) with trophies and prize money.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Mixed Doubles */}
              {(compFilter === 'all' || compFilter === 'mixed-doubles') && (
                <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-7 flex flex-col justify-between hover:border-slate-700/80 transition-all">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                          <Users className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
                            Mixed Pairs
                          </div>
                          <h4 className="text-xl font-black text-white">Mixed Doubles</h4>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                          <Coins className="w-3.5 h-3.5" />
                          £10 Entry
                        </span>
                        <span className="text-[11px] text-slate-400 mt-1">per pair</span>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-300">
                      Scotch doubles competition contested by mixed-gender pairings (one female & one male player).
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                        <div className="text-slate-400 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                          <span>Match Format</span>
                        </div>
                        <div className="text-white font-bold mt-1 text-sm">Race to 5</div>
                        <div className="text-[11px] text-slate-400">Scotch alternate shots</div>
                      </div>
                      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                        <div className="text-slate-400 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Round Window</span>
                        </div>
                        <div className="text-white font-bold mt-1 text-sm">3–4 Weeks</div>
                        <div className="text-[11px] text-slate-400">Dependent on entries</div>
                      </div>
                    </div>

                    {/* Scotch Rule Highlight */}
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-xs text-purple-200 flex items-start gap-2.5">
                      <MessageSquare className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-white">Scotch Format & Coaching Rule: </span>
                        Partners take alternate shots throughout each visit. Talking / discussion is allowed <em>only before the first shot</em> of a pair's visit. No consultation once the first shot is taken.
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-800/60">
                      <div className="text-xs font-semibold text-slate-300">Key Rules & Details:</div>
                      <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                        <li><span className="text-slate-200">International Rules</span> apply throughout.</li>
                        <li><span className="text-slate-200">Pairing requirement</span>: One male and one female registered player per team.</li>
                        <li><span className="text-slate-200">Random draw</span> each round with no seeding.</li>
                        <li><span className="text-slate-200">Home pair</span> must host at a Brighton league venue.</li>
                        <li><span className="text-slate-200">Grand Finals</span> on Presentation Night (5th April 2027) with trophies & prize money.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Captains Cup */}
              {(compFilter === 'all' || compFilter === 'captains-cup') && (
                <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-7 flex flex-col justify-between hover:border-slate-700/80 transition-all lg:col-span-2">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                          <Crown className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                            Handicapped Invitational
                          </div>
                          <h4 className="text-xl sm:text-2xl font-black text-white">Captains Cup</h4>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                            <Coins className="w-3.5 h-3.5" />
                            £10 Entry
                          </span>
                          <span className="text-[11px] text-slate-400 mt-1">per captain</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-300 max-w-3xl">
                      Exclusive competition contested by registered team captains across all four tiers of the Brighton Pool League, featuring a divisional handicap system to balance competition across the divisions.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                        <div className="text-slate-400 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>Base Format</span>
                        </div>
                        <div className="text-white font-bold mt-1 text-sm">Race to 5</div>
                        <div className="text-[11px] text-slate-400">With divisional handicap start</div>
                      </div>
                      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                        <div className="text-slate-400 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-sky-400" />
                          <span>Round Window</span>
                        </div>
                        <div className="text-white font-bold mt-1 text-sm">4 Weeks</div>
                        <div className="text-[11px] text-slate-400">To arrange & play</div>
                      </div>
                      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                        <div className="text-slate-400 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Grand Finals</span>
                        </div>
                        <div className="text-white font-bold mt-1 text-sm">5th April 2027</div>
                        <div className="text-[11px] text-slate-400">Presentation Night</div>
                      </div>
                    </div>

                    {/* Handicap Matrix Table */}
                    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                        <Scale className="w-4 h-4" />
                        <span>Divisional Handicap System (Race to 5)</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="bg-slate-900/90 border border-rose-500/30 rounded-lg p-3">
                          <div className="text-rose-400 font-bold text-xs uppercase">Premier Division</div>
                          <div className="text-lg font-black text-white mt-0.5">-1 Start</div>
                          <div className="text-[11px] text-slate-400 mt-1">Must win 6 frames to reach 5</div>
                        </div>
                        <div className="bg-slate-900/90 border border-sky-500/30 rounded-lg p-3">
                          <div className="text-sky-400 font-bold text-xs uppercase">Division 1</div>
                          <div className="text-lg font-black text-white mt-0.5">Scratch (0)</div>
                          <div className="text-[11px] text-slate-400 mt-1">Must win 5 frames to reach 5</div>
                        </div>
                        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-lg p-3">
                          <div className="text-emerald-400 font-bold text-xs uppercase">Division 2</div>
                          <div className="text-lg font-black text-white mt-0.5">+1 Start</div>
                          <div className="text-[11px] text-slate-400 mt-1">Must win 4 frames to reach 5</div>
                        </div>
                        <div className="bg-slate-900/90 border border-amber-500/30 rounded-lg p-3">
                          <div className="text-amber-400 font-bold text-xs uppercase">Division 3</div>
                          <div className="text-lg font-black text-white mt-0.5">+2 Start</div>
                          <div className="text-[11px] text-slate-400 mt-1">Must win 3 frames to reach 5</div>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-400 leading-relaxed bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/60">
                        <strong className="text-slate-300">How it works in practice:</strong> The match score begins at each player's starting handicap mark. The first captain whose cumulative frame count reaches 5 wins the match. For example, if a Premier captain plays a Division 3 captain, the match scoreboard begins at <span className="text-white font-mono">-1 vs 2</span>.
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-800/60">
                      <div className="text-xs font-semibold text-slate-300">Key Rules & Details:</div>
                      <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                        <li><span className="text-slate-200">International Rules</span> apply throughout all rounds.</li>
                        <li><span className="text-slate-200">Random draw</span> each round with no divisional seeding or protection.</li>
                        <li><span className="text-slate-200">Home captain</span> must arrange and host at a registered Brighton league venue.</li>
                        <li><span className="text-slate-200">Grand Finals</span> on Presentation Night (Monday, 5th April 2027) with trophies & prize money.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* 5. ROLL OF HONOUR (content/docs/roll-of-honour/*.md)             */}
        {/* ================================================================ */}
        {section === 'honours' && (
          <div className="space-y-6">
            {/* Header showcase banner */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 sm:p-6 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Hall of Fame</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Roll of Honour
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
                    Brighton &amp; Hove Pool League records, division winners, cup triumphs and individual honours.
                  </p>
                </div>

                {/* Toolbar: Season Filter, Search & View Mode Switcher */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-wrap">
                  {/* Season Filter (All / Winter / Summer) */}
                  <div className="flex items-center bg-slate-950 border border-slate-800 p-1 rounded-xl self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setSeasonFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        seasonFilter === 'all'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeasonFilter('winter')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        seasonFilter === 'winter'
                          ? 'bg-sky-500 text-slate-950 shadow font-extrabold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Snowflake className="w-3.5 h-3.5" />
                      <span>Winter</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeasonFilter('summer')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        seasonFilter === 'summer'
                          ? 'bg-amber-500 text-slate-950 shadow font-extrabold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5" />
                      <span>Summer</span>
                    </button>
                  </div>

                  {/* Search */}
                  <div className="relative flex-1 sm:flex-initial">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={honourSearch}
                      onChange={(e) => setHonourSearch(e.target.value)}
                      placeholder="Search player, team or season..."
                      className="w-full sm:w-64 pl-9 pr-8 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                    />
                    {honourSearch && (
                      <button
                        type="button"
                        onClick={() => setHonourSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* View Mode */}
                  <div className="flex items-center bg-slate-950 border border-slate-800 p-1 rounded-xl self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setHonourViewMode('cards')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        honourViewMode === 'cards'
                          ? 'bg-amber-500 text-slate-950 shadow font-extrabold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>Cards</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setHonourViewMode('table')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        honourViewMode === 'table'
                          ? 'bg-amber-500 text-slate-950 shadow font-extrabold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>Table</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Category pills */}
            <div className="flex flex-wrap gap-1.5 border-b border-slate-800 pb-3">
              {(
                [
                  { id: 'league', label: 'League', icon: Trophy },
                  { id: 'knockout', label: 'Knockout', icon: Award },
                  { id: 'captains-cup', label: 'Captains Cup', icon: Crown },
                  { id: 'singles', label: 'Singles', icon: Medal },
                  { id: 'ladies-singles', label: 'Ladies Singles', icon: Crown },
                  { id: 'doubles', label: 'Doubles', icon: Users },
                  { id: 'mixed-doubles', label: 'Mixed Doubles', icon: Users },
                  { id: 'averages', label: 'Averages', icon: Flame },
                  { id: 'ladies-averages', label: 'Ladies Averages', icon: Crown },
                  { id: 'top-dish', label: 'Top Dish', icon: Sparkles },
                ] as const
              ).map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setHonourTab(t.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      honourTab === t.id
                        ? 'bg-emerald-600 text-white shadow'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {honourTab === 'league' && (
              <div className="space-y-5">
                <h2 className="text-lg font-black text-white">
                  League Roll of Honour
                </h2>
                <div className="space-y-2">
                  <h3 className="font-bold text-emerald-400 text-sm">
                    Premier League
                  </h3>
                  {renderTable(
                    ['Season', 'Winners 🏆', 'Runners-up'],
                    [
                      ['Summer 2026', 'LA Z', 'Castle Unpredictables'],
                      ['Winter 2025/26', 'LA Z', 'Romans Lagers'],
                      ['Summer 2025', 'LA Z', 'Castle Lagers'],
                      ['Winter 2024/25', 'Harbour Club Lagers', 'Castle Z Blood'],
                      ['Winter 2023/24', 'Castle Lagers', 'Castle Z Blood'],
                      ['Winter 2022/23', 'Castle Lagers', 'Castle Z Blood'],
                      ['Winter 2021/22', 'Castle Anthill', 'Castle Z'],
                      ['Winter 2017/18', 'Castle Z', 'Castle Anthill'],
                      ['Winter 2016/17', 'Castle Anthill', 'Castle Fokkers'],
                      ['Winter 2015/16', 'Castle Fokkers', 'Castle Anthill'],
                      ['Winter 2014/15', 'Rileys Fokkers', 'Castle XXX'],
                    ]
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-emerald-400 text-sm">
                    Division 1
                  </h3>
                  {renderTable(
                    ['Season', 'Winners 🏆', 'Runners-up'],
                    [
                      ['Summer 2026', 'LA Pool Club', 'Breaking Bad'],
                      ['Winter 2025/26', 'LA Mavericks', 'LA Pool Club'],
                      ['Summer 2025', 'Mileoakey Cokey', 'LA Pool Club'],
                      ['Winter 2024/25', 'Castle Unpredictables', 'Goldstone BHA'],
                      ['Winter 2023/24', 'HPT B', 'Mile Oak Gentlemen'],
                      ['Winter 2021/22', 'Mile Oak', 'Castle Pockets'],
                      ['Winter 2017/18', 'Castle Reds', 'Labour Club'],
                      ['Winter 2016/17', 'Moulsecoomb Social Club', 'Hove Park Tavern B'],
                      ['Winter 2015/16', 'Castle Goodfellas', 'Castle Cannons'],
                      ['Winter 2014/15', 'Hove Park Tavern B', 'Pocket Rocket SC'],
                      ['Winter 2013/14', 'Hikers Rest A', 'Romans'],
                    ]
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-emerald-400 text-sm">
                    Division 2
                  </h3>
                  {renderTable(
                    ['Season', 'Winners 🏆', 'Runners-up'],
                    [
                      ['Summer 2026', 'LA Rack and Rollers', 'Give Us a Break'],
                      ['Winter 2025/26', 'Castle IncrediBalls', 'LA Breakers'],
                      ['Winter 2017/18', 'Mile Oak X', 'Hove Park Tavern RLC'],
                      ['Winter 2016/17', 'Mile Oak Old Boys', 'Mile Oak M'],
                      ['Winter 2015/16', 'Hove Park Tavern L', 'Gather Inn'],
                    ]
                  )}
                </div>
              </div>
            )}

            {honourTab === 'knockout' && (
              <div className="space-y-3">
                <h2 className="text-lg font-black text-white">
                  Knockout Roll of Honour
                </h2>
                {renderTable(
                  ['Competition', 'Winners 🏆', 'Runners-up'],
                  [
                    ['Summer 2026 Cup', 'LA Mavericks', 'Classtle'],
                    ['Summer 2026 Plate', 'LA Z', 'Castle BHA'],
                    ['Winter 2025/26 Premier League Cup', 'Romans Lagers', 'Classtle'],
                    ['Winter 2025/26 Division 1 Cup', 'Aldrington Returnz', 'LA Mavericks'],
                    ['Winter 2025/26 Division 2 Cup', 'Give Us A Cue', 'Castle IncrediBalls'],
                    ['Summer 2025 Cup', 'LA Z', 'Castle Lagers'],
                    ['Summer 2025 Plate', 'Classtle', 'Castle Commitmints'],
                    ['Winter 2024/25 Premier League Cup', 'Romans B', 'Harbour Club Lagers'],
                    ['Winter 2024/25 Division 1 Cup', 'Castle Unpredictables', 'Castle Kings'],
                    ['Summer 2024 Cup', 'Castle Lagers', 'Castle Wet Bandits'],
                    ['Summer 2024 Plate', 'HPT C', 'Romans N'],
                    ['Winter 2023/24 Premier League Cup', 'Castle Z Blood', 'Castle Lagers'],
                    ['Winter 2023/24 Division 1 Cup', 'HPT B', 'HPT C'],
                    ['Summer 2023 Cup', 'Romans Ints', 'Romans PLC'],
                    ['Summer 2023 Plate', 'Castle 433', 'Bear Old Boys'],
                    ['Summer 2022 Cup', 'Castle Lagers', 'Castle Z'],
                    ['Summer 2022 Plate', 'Mile Oak Old Boys', 'HPT C'],
                    ['Summer 2017 Cup', 'Castle Anthill', 'HPT Ints'],
                    ['Summer 2016 Cup', 'Castle Anthill', 'Aldrington Z'],
                    ['Summer 2015 Cup', 'Castle Anthill', 'HPT Z'],
                  ]
                )}
              </div>
            )}

            {honourTab === 'captains-cup' && (
              <div className="space-y-3">
                <h2 className="text-lg font-black text-white">
                  Captains Cup Roll of Honour
                </h2>
                {renderTable(
                  ['Season', 'Winner 🏆', 'Runner-up'],
                  [['Summer 2026', 'Shane Humphrey', 'Josh Manderson']]
                )}
              </div>
            )}

            {honourTab === 'singles' && (
              <div className="space-y-3">
                <h2 className="text-lg font-black text-white">
                  Singles Roll of Honour
                </h2>
                {renderTable(
                  ['Season', 'Winner 🏆', 'Runner-up'],
                  [
                    ['Summer 2026', 'Connor Anderson', 'Pete Hazell'],
                    ['Winter 2025/26', 'Chris Kingham', 'Greg Lewis'],
                    ['Summer 2025', 'Pete Hazell', 'Jake Paas'],
                    ['Winter 2024/25', 'Ben Middleton', 'Jake Paas'],
                    ['Summer 2024', 'Lee Martin', 'Connor Anderson'],
                    ['Winter 2023/24', 'Chris Dolding', 'Connor Anderson'],
                    ['Winter 2022/23', 'Jake Paas', 'Pete Hazell'],
                    ['Winter 2021/22', 'Pete Hazell', 'Jake Paas'],
                    ['Winter 2019/20', 'Ben Middleton', 'Chris Dolding'],
                    ['Summer 2019', 'Jon Sanders', 'Chris Dolding'],
                    ['Winter 2018/19', 'Darren Welfare', 'Greg Lewis'],
                    ['Summer 2018', 'Jake Paas', 'Dan Booker'],
                    ['Winter 2017/18', 'Ben Welfare', 'Dean Torode'],
                    ['Summer 2017', 'Jamie Lashmar', 'Connor Anderson'],
                    ['Winter 2016/17', 'Jon Sanders', 'Dean Torode'],
                    ['Winter 2015/16', 'Allan Roberts', 'Dean Torode'],
                    ['Winter 2014/15', 'Greg Lewis', 'Dean Torode'],
                    ['Winter 2013/14', 'Jon Sanders', 'John Gillard'],
                    ['Winter 2012/13', 'Jon Sanders', 'Dan Stirling'],
                    ['Winter 2011/12', 'Greg Lewis', 'Jon Sanders'],
                    ['Winter 2010/11', 'Paul Nicholas', 'Paul Bailey'],
                    ['Winter 2009/10', 'Paul McNeil', 'John Cairns'],
                    ['Winter 2008/09', 'Kelly Dahr', 'James Constable'],
                    ['Winter 2007/08', 'Darren Welfare', 'Clive Rayson'],
                    ['Winter 2006/07', 'Morray Dolan', 'John Cairns'],
                    ['Winter 2005/06', 'Morray Dolan', 'Damian Campsey'],
                    ['Winter 2004/05', 'Damian Campsey', 'Pete Ashman'],
                    ['Winter 2003/04', 'Morray Dolan', 'Pete Ashman'],
                    ['Winter 2002/03', 'Paul McNeil', 'Darren Welfare'],
                    ['Winter 2001/02', 'Paul McNeil', 'Shaun Southon'],
                    ['Winter 2000/01', 'Alan Burchell', 'Paul McNeil'],
                    ['Winter 1999/00', 'Paul Nicholas', 'Shaun Southon'],
                  ]
                )}
              </div>
            )}

            {honourTab === 'ladies-singles' && (
              <div className="space-y-3">
                <h2 className="text-lg font-black text-white">
                  Ladies Singles Roll of Honour
                </h2>
                {renderTable(
                  ['Season', 'Winner 🏆', 'Runner-up'],
                  [
                    ['Summer 2026', 'Cliona Saunders-Cooney', 'Laura Boyle'],
                    ['Winter 2025/26', 'Laura Boyle', 'Kelsie Hyland-Rochester'],
                    ['Summer 2025', 'Julie Hitchen', 'Laura Boyle'],
                    ['Winter 2024/25', 'Mikala Gurd', 'Laura Boyle'],
                    ['Summer 2024', 'Julie Hitchen', 'Chloe Bowyer'],
                  ]
                )}
              </div>
            )}

            {honourTab === 'doubles' && (
              <div className="space-y-3">
                <h2 className="text-lg font-black text-white">
                  Doubles Roll of Honour
                </h2>
                {renderTable(
                  ['Season', 'Winners 🏆', 'Runners-up'],
                  [
                    ['Summer 2026', 'Ben Middleton & Mikey Booker', 'Teige Dillon & Ellis Wilson'],
                    ['Winter 2025/26', 'Ben Middleton & Mikey Booker', 'Pete Hazell & Connor Anderson'],
                    ['Summer 2025', 'Chris Kingham & Jon Sanders', 'Ben Middleton & Mikey Booker'],
                    ['Winter 2024/25', 'Mark Hedayat & Rich Hamill', 'Pete Hazell & Connor Anderson'],
                    ['Summer 2024', 'Mark Hedayat & Rich Hamill', 'Jake Paas & Mikey Booker'],
                    ['Winter 2023/24', 'Pete Hazell & Connor Anderson', 'Lee Martin & Jack Fielder'],
                    ['Winter 2022/23', 'Dean Torode & Greg Lewis', 'Allan Roberts & Ben Middleton'],
                    ['Winter 2019/20', 'Greg Lewis & John Gillard', 'Lee Butler & Rob Boulton'],
                    ['Winter 2018/19', 'Lee Joseph & Anthony Potter', 'Allan Roberts & Chris Dolding'],
                    ['Summer 2018', 'Darren Welfare & Ben Welfare', 'Martin Portelli & Josh Manderson'],
                    ['Winter 2017/18', 'Darren Welfare & Ben Welfare', 'Ben Middleton & Jamie Lashmar'],
                    ['Summer 2017', 'Ben Middleton & Jamie Lashmar', 'Lee Butler & Rob Boulton'],
                    ['Winter 2015/16', 'Lee Shepherd & Steve Owen', 'Greg Lewis & Damian Campsey'],
                    ['Winter 2014/15', 'Damian Campsey & Greg Lewis', 'Darren Welfare & Ben Welfare'],
                    ['Winter 2013/14', 'Dan Stirling & Olly Stewart', 'Ronnie Beard & Brett Robertson'],
                  ]
                )}
              </div>
            )}

            {honourTab === 'mixed-doubles' && (
              <div className="space-y-3">
                <h2 className="text-lg font-black text-white">
                  Mixed Doubles Roll of Honour
                </h2>
                {renderTable(
                  ['Season', 'Winners 🏆', 'Runners-up'],
                  [
                    ['Summer 2026', 'Stacey Champ-Hancock & Ben Middleton', 'Julie Hitchen & Paul Hitchen'],
                    ['Winter 2025/26', 'Stacey Champ-Hancock & Ben Middleton', 'Linda Edwards & Curtis Lambert'],
                    ['Summer 2025', 'Julie Hitchen & Paul Hitchen', 'Pinky McNeil & Paul McNeil'],
                  ]
                )}
              </div>
            )}

            {honourTab === 'averages' && (
              <div className="space-y-5">
                <h2 className="text-lg font-black text-white">
                  Averages Roll of Honour
                </h2>
                <div className="space-y-2">
                  <h3 className="font-bold text-emerald-400 text-sm">
                    Premier League
                  </h3>
                  {renderTable(
                    ['Season', 'Winner 🏆'],
                    [
                      ['Summer 2026', 'Chris Kingham'],
                      ['Winter 2025/26', 'Jon Sanders'],
                      ['Summer 2025', 'Greg Lewis'],
                      ['Winter 2024/25', 'Jon Sanders'],
                      ['Summer 2024', 'Pete Hazell'],
                      ['Winter 2023/24', 'Ben Middleton'],
                      ['Summer 2023', 'Jon Sanders'],
                      ['Winter 2022/23', 'Jake Paas'],
                      ['Winter 2021/22', 'Mikey Booker'],
                      ['Winter 2017/18', 'Lee Martin'],
                      ['Winter 2016/17', 'Greg Lewis'],
                      ['Winter 2015/16', 'Morray Dolan'],
                      ['Winter 2014/15', 'Darren Welfare'],
                    ]
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-emerald-400 text-sm">
                    Division 1
                  </h3>
                  {renderTable(
                    ['Season', 'Winner 🏆'],
                    [
                      ['Summer 2026', 'Curtis Lambert'],
                      ['Winter 2025/26', 'Dan Stoner'],
                      ['Summer 2025', 'Craig Williams'],
                      ['Winter 2024/25', 'Terry Haworth'],
                      ['Winter 2023/24', 'Shane Humphrey'],
                      ['Winter 2021/22', 'Alex Martinez'],
                      ['Winter 2017/18', 'Matt Bujok'],
                      ['Winter 2016/17', 'Colin Seaman'],
                      ['Winter 2015/16', 'Kieren Harding'],
                      ['Winter 2014/15', 'Dan Booker'],
                      ['Winter 2013/14', 'Kieren Harding'],
                    ]
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-emerald-400 text-sm">
                    Division 2
                  </h3>
                  {renderTable(
                    ['Season', 'Winner 🏆'],
                    [
                      ['Summer 2026', 'Dawid Konior'],
                      ['Winter 2025/26', 'Ash Kianifard'],
                      ['Winter 2017/18', 'Chris Else'],
                      ['Winter 2016/17', 'Rob Boulton'],
                      ['Winter 2015/16', 'Marcia Williams'],
                    ]
                  )}
                </div>
              </div>
            )}

            {honourTab === 'ladies-averages' && (
              <div className="space-y-5">
                <h2 className="text-lg font-black text-white">
                  Ladies Averages Roll of Honour
                </h2>
                <div className="space-y-2">
                  <h3 className="font-bold text-emerald-400 text-sm">
                    Premier League
                  </h3>
                  {renderTable(
                    ['Season', 'Winner 🏆'],
                    [
                      ['Summer 2026', 'Laura Boyle'],
                      ['Winter 2025/26', 'Laura Boyle'],
                    ]
                  )}
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-emerald-400 text-sm">
                    Division 1
                  </h3>
                  {renderTable(
                    ['Season', 'Winner 🏆'],
                    [
                      ['Summer 2026', 'Cliona Saunders-Cooney'],
                      ['Winter 2025/26', 'Cliona Saunders-Cooney'],
                    ]
                  )}
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-emerald-400 text-sm">
                    Division 2
                  </h3>
                  {renderTable(
                    ['Season', 'Winner 🏆'],
                    [
                      ['Summer 2026', 'Sasha Smith'],
                      ['Winter 2025/26', 'Linda Edwards'],
                    ]
                  )}
                </div>
              </div>
            )}

            {honourTab === 'top-dish' && (
              <div className="space-y-5">
                <h2 className="text-lg font-black text-white">
                  Top Dish Roll of Honour
                </h2>
                <div className="space-y-2">
                  <h3 className="font-bold text-emerald-400 text-sm">
                    Premier League
                  </h3>
                  {renderTable(
                    ['Season', 'Winner 🏆', 'Dishes'],
                    [
                      ['Summer 2026', 'Mikey Booker', 11],
                      ['Winter 2025/26', 'Jon Sanders', 11],
                      ['Summer 2025', 'Pete Hazell', 12],
                      ['Winter 2024/25', 'Mikey Booker', 8],
                    ]
                  )}
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-emerald-400 text-sm">
                    Division 1
                  </h3>
                  {renderTable(
                    ['Season', 'Winner 🏆', 'Dishes'],
                    [
                      ['Summer 2026', 'Curtis Lambert', 6],
                      ['Winter 2025/26', 'Will Ashman', 8],
                      ['Summer 2025', 'Dan Stoner', 6],
                      ['Winter 2024/25', 'Terry Haworth', 4],
                    ]
                  )}
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-emerald-400 text-sm">
                    Division 2
                  </h3>
                  {renderTable(
                    ['Season', 'Winner 🏆', 'Dishes'],
                    [
                      ['Summer 2026', 'Dawid Konior', 4],
                      ['Winter 2025/26', 'Avi Razvan', 3],
                    ]
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

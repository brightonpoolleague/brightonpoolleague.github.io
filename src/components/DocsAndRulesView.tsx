import React, { useState } from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  Clock,
  Coins,
  Crown,
  FileText,
  Flame,
  Info,
  LayoutGrid,
  List,
  Medal,
  Search,
  X,
  MapPin,
  MessageSquare,
  Scale,
  Shuffle,
  Sparkles,
  Trophy,
  Users,
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

  const renderTable = (
    headers: string[],
    rows: (string | number)[][]
  ): React.ReactNode => {
    const q = honourSearch.trim().toLowerCase();
    const filteredRows = q
      ? rows.filter((r) => r.some((c) => String(c).toLowerCase().includes(q)))
      : rows;

    if (filteredRows.length === 0) {
      return (
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-6 text-center text-xs text-slate-400 space-y-2">
          <div>No records found matching <span className="text-white font-semibold">"{honourSearch}"</span> in this category.</div>
          <button
            type="button"
            onClick={() => setHonourSearch('')}
            className="text-emerald-400 hover:text-emerald-300 font-semibold underline text-xs cursor-pointer"
          >
            Clear search
          </button>
        </div>
      );
    }

    if (honourViewMode === 'cards') {
      const isFiltered = !!q;
      const spotlightRow = !isFiltered && filteredRows.length > 0 ? filteredRows[0] : null;
      const cardRows = !isFiltered && filteredRows.length > 0 ? filteredRows.slice(1) : filteredRows;

      return (
        <div className="space-y-3">
          {/* Reigning Champion Spotlight */}
          {spotlightRow && (
            <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-950 p-4 sm:p-5 shadow-lg shadow-amber-500/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-[11px] font-black uppercase tracking-wider text-amber-300">
                      <Trophy className="w-3 h-3" />
                      Reigning Champion
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      {spotlightRow[0]}
                    </span>
                  </div>
                  <div className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                    <span>{spotlightRow[1]}</span>
                  </div>
                </div>

                {spotlightRow[2] !== undefined && (
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {typeof spotlightRow[2] === 'number' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold text-xs sm:text-sm">
                        <Flame className="w-4 h-4 text-amber-400" />
                        <span>{spotlightRow[2]} Dishes</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 text-xs">
                        <span className="text-slate-400 font-medium">Runner-up:</span>
                        <strong className="text-slate-200">{spotlightRow[2]}</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {cardRows.map((r, idx) => (
              <div
                key={idx}
                className="bg-slate-950/70 border border-slate-800/80 hover:border-slate-700/80 rounded-xl p-3.5 space-y-2 transition-all"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800/60 pb-1.5 font-medium">
                  <span className="font-semibold text-slate-300">{r[0]}</span>
                  {idx === 0 && isFiltered && (
                    <span className="text-amber-400 font-bold text-[10px] uppercase tracking-wider">Latest</span>
                  )}
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-xs shrink-0 mt-0.5">
                      🏆
                    </span>
                    <div className="leading-tight">
                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Winner</div>
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
                            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Runner-up</div>
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
        </div>
      );
    }

    // Leaderboard Table View
    return (
      <div className="overflow-x-auto border border-slate-800 rounded-xl">
        <table className="w-full text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="bg-slate-950 text-slate-300 border-b border-slate-800 text-left">
              {headers.map((h, i) => (
                <th key={i} className="py-2.5 px-3 font-bold text-[11px] uppercase tracking-wider text-slate-400">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r, idx) => (
              <tr
                key={idx}
                className={`border-b border-slate-800/70 last:border-b-0 hover:bg-slate-800/30 transition-colors ${
                  idx === 0 && !q ? 'bg-amber-500/[0.04]' : ''
                }`}
              >
                {r.map((cell, cIdx) => (
                  <td
                    key={cIdx}
                    className={`py-2 px-3 ${
                      cIdx === 0
                        ? 'text-slate-400 font-semibold whitespace-nowrap'
                        : cIdx === 1
                        ? 'text-white font-bold'
                        : 'text-slate-300'
                    }`}
                  >
                    {cIdx === 1 ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-xs">🏆</span>
                        <span>{cell}</span>
                      </span>
                    ) : cIdx === 2 && typeof cell === 'string' ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-xs">🥈</span>
                        <span>{cell}</span>
                      </span>
                    ) : cIdx === 2 && typeof cell === 'number' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold text-xs">
                        <Flame className="w-3 h-3 text-amber-400" />
                        <span>{cell} dishes</span>
                      </span>
                    ) : (
                      cell
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
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-lg sm:text-xl font-black text-white">
                League Format
              </h2>
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-bold text-emerald-400">
                1. Overview
              </h3>
              <ul className="space-y-1.5 list-none">
                <li>
                  <strong>a.</strong> All matches consist of{' '}
                  <strong>3 sets</strong> of{' '}
                  <strong>5 singles frame games</strong> (15 games in total).
                </li>
                <li>
                  <strong>b.</strong> Player substitutions are allowed{' '}
                  <strong>before the start of the 2nd and 3rd sets</strong> (up
                  to 15 different players can play in one match).
                </li>
                <li>
                  <strong>c.</strong> The same player can play in each of the 3
                  sets (maximum of 3 games).
                </li>
                <li>
                  <strong>d.</strong> The same player <strong>cannot</strong>{' '}
                  play multiple times in the same set (e.g., a player cannot
                  play all 3 games in Set 1 and then leave).
                </li>
              </ul>
            </div>

            <div className="space-y-2 border-t border-slate-800/80 pt-4">
              <h3 className="text-base font-bold text-emerald-400">
                2. Points
              </h3>
              <ul className="space-y-1.5 list-none">
                <li>
                  <strong>a.</strong> Each match win is worth{' '}
                  <strong>2 points</strong>.
                </li>
                <li>
                  <strong>b.</strong> In a match, every 3 frames won is worth{' '}
                  <strong>1 point</strong>.
                </li>
                <li>
                  <strong>c.</strong> The maximum number of points a team can
                  earn from a single match is <strong>7 points</strong> (2 for
                  the win + 5 for winning all 15 frames).
                </li>
                <li>
                  <strong>d.</strong> The possible outcomes are:
                  <ul className="list-disc list-inside pl-4 mt-1.5 space-y-1 text-slate-200">
                    <li>
                      <strong>15–0</strong>: 7 points to the winner, 0 points to
                      the loser
                    </li>
                    <li>
                      <strong>14–1</strong>: 6 points to the winner, 0 points to
                      the loser
                    </li>
                    <li>
                      <strong>13–2</strong>: 6 points to the winner, 0 points to
                      the loser
                    </li>
                    <li>
                      <strong>12–3</strong>: 6 points to the winner, 1 point to
                      the loser
                    </li>
                    <li>
                      <strong>11–4</strong>: 5 points to the winner, 1 point to
                      the loser
                    </li>
                    <li>
                      <strong>10–5</strong>: 5 points to the winner, 1 point to
                      the loser
                    </li>
                    <li>
                      <strong>9–6</strong>: 5 points to the winner, 2 points to
                      the loser
                    </li>
                    <li>
                      <strong>8–7</strong>: 4 points to the winner, 2 points to
                      the loser
                    </li>
                  </ul>
                </li>
              </ul>
            </div>

            <div className="space-y-2 border-t border-slate-800/80 pt-4">
              <h3 className="text-base font-bold text-emerald-400">
                3. Time Keeping
              </h3>
              <ul className="space-y-1.5 list-none">
                <li>
                  <strong>a.</strong> Matches should start at{' '}
                  <strong>8:00 PM sharp</strong>.
                </li>
                <li>
                  <strong>b.</strong> Captains are responsible for ensuring
                  matches start on time, maintaining the flow of play through
                  each set, and finishing the match before{' '}
                  <strong>11:00 PM</strong>.
                </li>
                <li>
                  <strong>c.</strong> Captains should allow a{' '}
                  <strong>maximum of 1 hour per set</strong>. If the 3rd set has
                  not started by 10:00 PM, both captains must ensure play is
                  speeded up.
                </li>
                <li>
                  <strong>d.</strong> <strong>Shot clocks</strong> are advised
                  to be introduced at <strong>10:30 PM</strong> if the 3rd game
                  (in the 3rd set) has not yet started. The shot clock can be
                  found{' '}
                  <a
                    href="https://www.epa.org.uk/stopclock/epa/index.php"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 underline font-semibold"
                  >
                    here
                  </a>
                  .
                </li>
              </ul>
            </div>

            <div className="space-y-2 border-t border-slate-800/80 pt-4">
              <h3 className="text-base font-bold text-emerald-400">
                4. Completing the Scorecard
              </h3>
              <ul className="space-y-1.5 list-none">
                <li>
                  <strong>a.</strong> The <strong>home captain</strong> writes
                  their players’ full names against numbers{' '}
                  <strong>1–5</strong> (running order in the first set).
                </li>
                <li>
                  <strong>b.</strong> Fold the paper in half (to hide what has
                  been written) and pass it to the <strong>away captain</strong>
                  , who writes their players’ full names against{' '}
                  <strong>1–5</strong> (their running order in the first set).
                </li>
                <li>
                  <strong>c.</strong> Mark an <strong>“X”</strong> next to the
                  player who will break first.
                </li>
                <li>
                  <strong>d.</strong> The{' '}
                  <strong>home team’s playing order</strong> remains the same
                  for all sets.
                </li>
                <li>
                  <strong>e.</strong> The{' '}
                  <strong>away team’s playing order</strong> changes each set so
                  that opponents always differ, as shown below:
                </li>
              </ul>
              <div className="py-2 max-w-lg">
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-xs sm:text-sm border-collapse text-left">
                    <thead>
                      <tr className="bg-slate-950 text-slate-300 border-b border-slate-800">
                        <th className="py-2.5 px-3 font-bold text-center border-r border-slate-800">
                          Set 1
                        </th>
                        <th className="py-2.5 px-3 font-bold text-center border-r border-slate-800">
                          Set 2
                        </th>
                        <th className="py-2.5 px-3 font-bold text-center">
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
                        <tr key={idx} className="hover:bg-slate-800/30">
                          <td className="py-2 px-3 border-r border-slate-800">
                            <span className="inline-block w-5 font-bold text-emerald-400">
                              {row.s1[0]}
                            </span>
                            <span className="text-white font-medium">{row.s1[1]}</span>
                          </td>
                          <td className="py-2 px-3 border-r border-slate-800">
                            <span className="inline-block w-5 font-bold text-emerald-400">
                              {row.s2[0]}
                            </span>
                            <span className="text-white font-medium">{row.s2[1]}</span>
                          </td>
                          <td className="py-2 px-3">
                            <span className="inline-block w-5 font-bold text-emerald-400">
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
              <ul className="space-y-1.5 list-none">
                <li>
                  <strong>f.</strong> Since substitutions are allowed in Sets 2
                  and 3, captains should not complete player names for the next
                  set unless no substitutions are being made.
                </li>
                <li>
                  <strong>g.</strong> You do not need to write players’ full
                  names for each set they play — initials are fine, provided
                  they are unique within the team.
                </li>
                <li>
                  <strong>h.</strong> When introducing a substitute for the
                  first time, write their <strong>full name</strong>.
                </li>
                <li>
                  <strong>i.</strong> After each game, record the result with{' '}
                  <strong>W</strong> or <strong>L</strong> (you do not need to
                  write 1–0).
                </li>
                <li>
                  <strong>j.</strong> Record each game that is won by a{' '}
                  <strong>dish</strong> or <strong>reverse dish</strong>:
                  <ul className="list-disc list-inside pl-4 mt-1 space-y-1">
                    <li>
                      A <strong>dish</strong> is a clearance in one visit from
                      the break.
                    </li>
                    <li>
                      A <strong>reverse dish</strong> occurs when your opponent
                      fails to pot from the break (or foul breaks) and you clear
                      up in one visit.
                    </li>
                  </ul>
                </li>
              </ul>
            </div>

            <div className="space-y-2 border-t border-slate-800/80 pt-4">
              <h3 className="text-base font-bold text-emerald-400">
                5. Substitutions
              </h3>
              <ul className="space-y-1.5 list-none">
                <li>
                  <strong>a.</strong> Before the 2nd and 3rd sets begin,
                  captains may substitute as many players as they wish.
                </li>
                <li>
                  <strong>b.</strong> Substitutes take the{' '}
                  <strong>same position</strong> as the player they replace
                  (e.g., if Player 1 is replaced in Set 3, the substitute plays
                  second in that set).
                </li>
                <li>
                  <strong>c.</strong> A player may be substituted out in Set 2
                  and substituted back in for Set 3.
                </li>
                <li>
                  <strong>d.</strong> Substituted players must{' '}
                  <strong>not</strong> have played in the previous set (to
                  prevent simply changing the playing order).
                </li>
              </ul>
            </div>

            <div className="space-y-2 border-t border-slate-800/80 pt-4">
              <h3 className="text-base font-bold text-emerald-400">
                6. Lagging
              </h3>
              <ul className="space-y-1.5 list-none">
                <li>
                  <strong>a.</strong> Only <strong>Player 1</strong> from each
                  team lags — this determines the breaking order for the rest of
                  the match.
                </li>
                <li>
                  <strong>b.</strong> Breaks alternate between teams: the team
                  that breaks first gets <strong>8 breaks</strong>, while their
                  opponents get <strong>7</strong>.
                </li>
              </ul>
            </div>

            <div className="space-y-2 border-t border-slate-800/80 pt-4">
              <h3 className="text-base font-bold text-emerald-400">
                7. End of the Match
              </h3>
              <ul className="space-y-1.5 list-none">
                <li>
                  <strong>a.</strong> Record the number of games each team has
                  won at the bottom of the scorecard (the total should be{' '}
                  <strong>15</strong>).
                </li>
                <li>
                  <strong>b.</strong> The <strong>winning captain</strong> must
                  take a clear photo of the completed scorecard and either post it
                  on Facebook or send it to the captains’ WhatsApp group{' '}
                  <strong>before 10:00 AM the following day</strong>.
                </li>
              </ul>
            </div>

            <div className="space-y-3 border-t border-slate-800/80 pt-4">
              <h3 className="text-base font-bold text-emerald-400">
                8. League Tables
              </h3>
              <div className="space-y-2">
                <p>
                  <strong>a.</strong> The teams league table is sorted as
                  follows:
                </p>
                <ul className="list-disc list-inside pl-4 space-y-1">
                  <li>
                    <strong>i.</strong> Total Points
                  </li>
                  <li>
                    <strong>ii.</strong> Frame difference (Total frames won
                    minus total frames lost)
                  </li>
                  <li>
                    <strong>iii.</strong> In the event of teams finishing the
                    season with the same record:
                    <ul className="list-disc list-inside pl-6 mt-1 space-y-1">
                      <li>
                        <strong>1. Head-to-head record:</strong> a) Total points
                        won (both games combined), b) Frame difference (both
                        games combined).
                      </li>
                      <li>
                        <strong>2.</strong> If that is also tied, then each
                        team’s record against the highest placed team in the
                        league: a) Total points won (both games combined), b)
                        Frame difference (both games combined).
                      </li>
                      <li>
                        <strong>3.</strong> If that is also tied, then this will
                        be repeated down the league table until the teams can be
                        separated.
                      </li>
                    </ul>
                  </li>
                </ul>
              </div>

              <div className="space-y-2 pt-2">
                <p>
                  <strong>b.</strong> The players averages table is sorted as
                  follows:
                </p>
                <ul className="list-disc list-inside pl-4 space-y-1">
                  <li>
                    <strong>i.</strong> Total wins
                  </li>
                  <li>
                    <strong>ii.</strong> Overall win percentage
                  </li>
                  <li>
                    <strong>iii.</strong> Total number of dishes made
                  </li>
                  <li>
                    <strong>iv.</strong> If the averages winner cannot be
                    determined, then the following is used to determine the
                    winner:
                    <ul className="list-disc list-inside pl-6 mt-1 space-y-1">
                      <li>
                        <strong>1.</strong> Head-to-head record
                      </li>
                      <li>
                        <strong>2.</strong> If that is still tied, then
                        determined by whose team finished highest in the league
                      </li>
                      <li>
                        <strong>3.</strong> If players are in the same team –
                        then a single frame shoot out will be played on finals
                        night
                      </li>
                    </ul>
                  </li>
                </ul>
              </div>

              <div className="space-y-2 pt-2">
                <p>
                  <strong>c.</strong> The players dish table is sorted as
                  follows:
                </p>
                <ul className="list-disc list-inside pl-4 space-y-1">
                  <li>
                    <strong>i.</strong> Total number of dishes + reverse dishes
                    made over the season
                  </li>
                  <li>
                    <strong>ii.</strong> If the overall winner cannot be
                    determined as it is tied, then awarded to the player highest
                    in the averages table
                  </li>
                </ul>
              </div>
            </div>

            <div className="space-y-3 border-t border-slate-800/80 pt-4">
              <h3 className="text-base font-bold text-emerald-400">
                9. Additional Information for Teams Without 5 Players
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
                  <h4 className="font-bold text-white">
                    1) Team with Only 4 Players
                  </h4>
                  <p>a. Enter BYE in position 5 on the scorecard.</p>
                  <p>
                    b. Any player facing a BYE is automatically awarded the win.
                  </p>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
                  <h4 className="font-bold text-white">
                    2) Both Teams with Only 4 Players
                  </h4>
                  <p>a. Both teams enter BYE in position 5 on the scorecard.</p>
                  <p>
                    b. Any player facing a BYE is automatically awarded the win.
                  </p>
                  <p>
                    c. The team that wins the lag is awarded the win in{' '}
                    <strong>Set 1 (5 vs 5)</strong>.
                  </p>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
                  <h4 className="font-bold text-white">
                    3) Team with Only 3 Players
                  </h4>
                  <p>a. Enter BYE in positions 4 and 5.</p>
                  <p>
                    b. Any player facing a BYE is automatically awarded the win.
                  </p>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
                  <h4 className="font-bold text-white">
                    4) Team of 4 vs Team of 3
                  </h4>
                  <p>a. The team of 3 enters BYE in positions 4 and 5.</p>
                  <p>b. The team of 4 enters BYE in position 5.</p>
                  <p>
                    c. Any player facing a BYE is automatically awarded the win.
                  </p>
                  <p>
                    d. The team that wins the lag is awarded the win in{' '}
                    <strong>Set 1 (5 vs 5)</strong>.
                  </p>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1 md:col-span-2">
                  <h4 className="font-bold text-white">
                    5) Team of 3 vs Team of 3
                  </h4>
                  <p>
                    a. Both teams enter BYE in positions 4 and 5 on the
                    scorecard.
                  </p>
                  <p>
                    b. Any player facing a BYE is automatically awarded the win.
                  </p>
                  <p>
                    c. The team that wins the lag is awarded the wins in{' '}
                    <strong>Set 1 (5 vs 5)</strong> and{' '}
                    <strong>(4 vs 4)</strong>, and the win in{' '}
                    <strong>Set 3 (5 vs 4)</strong>.
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
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-lg sm:text-xl font-black text-white">
                League Rules
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                By registering a team with the league, you agree to abide by the
                following rules.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-bold text-emerald-400">
                1. Code of Conduct
              </h3>
              <ul className="space-y-1.5 list-none">
                <li>
                  <strong>a.</strong> All players are expected to uphold the
                  values of the Brighton league, and to conduct themselves in a
                  respectful &amp; accepting manner – without any forms of abuse
                  or discrimination.
                </li>
                <li>
                  <strong>b.</strong> Venues are required to uphold the values
                  of the Brighton league, with the safety &amp; welfare of
                  players as of paramount consideration.
                </li>
                <li>
                  <strong>c.</strong> In line with the UK equality act, the
                  Brighton league has zero tolerance of discrimination across
                  any of the protected characteristics:
                  <ul className="list-disc list-inside pl-4 mt-1 space-y-1">
                    <li>
                      <strong>i.</strong> Age, Disability, Gender Reassignment,
                      Marriage &amp; Civil Partnership, Pregnancy &amp;
                      Maternity, Race, Religion or Belief, Sex and Sexual
                      orientation.
                    </li>
                    <li>
                      <strong>ii.</strong> Discrimination is classed as Direct,
                      Indirect, Harassment or Victimisation.
                    </li>
                  </ul>
                </li>
                <li>
                  <strong>d.</strong> All reported instances where these
                  standards have not been met, will result in an investigation
                  by the committee, on a case-by-case basis:
                  <ul className="list-disc list-inside pl-4 mt-1 space-y-1">
                    <li>
                      <strong>i.</strong> The league reserves the right to ban
                      any individual or venue that break these rules &amp; may
                      pass all relevant information to the police for further
                      investigation.
                    </li>
                    <li>
                      <strong>ii.</strong> Teams / venues who are banned, will
                      not be refunded for team registrations.
                    </li>
                  </ul>
                </li>
              </ul>
            </div>

            <div className="space-y-2 border-t border-slate-800/80 pt-4">
              <h3 className="text-base font-bold text-emerald-400">
                2. Registered Players
              </h3>
              <ul className="space-y-1.5 list-none">
                <li>
                  <strong>a.</strong> Only players registered with the league
                  are eligible to play in matches.
                </li>
                <li>
                  <strong>b.</strong> If a team fields an unregistered player,
                  their opponent will be awarded the win.
                </li>
                <li>
                  <strong>c.</strong> All captains must register their full
                  squad before the registration window closes.
                </li>
                <li>
                  <strong>d.</strong> The registration window closes
                  approximately two weeks before the season starts.
                </li>
              </ul>
            </div>

            <div className="space-y-2 border-t border-slate-800/80 pt-4">
              <h3 className="text-base font-bold text-emerald-400">
                3. New Signings
              </h3>
              <ul className="space-y-1.5 list-none">
                <li>
                  <strong>a.</strong> New players who are not registered with
                  another team may be signed at any point during the season.
                </li>
                <li>
                  <strong>b.</strong> Captains <strong>must</strong> notify the
                  league of all new signings.
                </li>
                <li>
                  <strong>c.</strong> New signings must be registered with the
                  league before playing (see Section 1).
                </li>
              </ul>
            </div>

            <div className="space-y-2 border-t border-slate-800/80 pt-4">
              <h3 className="text-base font-bold text-emerald-400">
                4. Player Transfers
              </h3>
              <ul className="space-y-1.5 list-none">
                <li>
                  <strong>a.</strong> Players registered with another team but
                  who have <strong>not made any appearances</strong> for that
                  team may be transferred at any time during the season.
                </li>
                <li>
                  <strong>b.</strong> Players who{' '}
                  <strong>have made at least one appearance</strong> for another
                  team may only be transferred during the{' '}
                  <strong>first half of the season</strong>.
                </li>
                <li>
                  <strong>c.</strong> The halfway point of the season is
                  determined <strong>by date</strong>, not by games played (to
                  account for postponed matches).
                </li>
                <li>
                  <strong>d.</strong> All player transfers must be registered
                  with the league before playing (see Section 1).
                </li>
              </ul>
            </div>

            <div className="space-y-2 border-t border-slate-800/80 pt-4">
              <h3 className="text-base font-bold text-emerald-400">
                5. Cup Semi-Finals &amp; Finals
              </h3>
              <ul className="space-y-1.5 list-none">
                <li>
                  <strong>a.</strong> Players may only participate in Cup
                  Semi-Finals or Finals if they have played{' '}
                  <strong>a minimum of four (4) matches</strong> for that team
                  during the season.
                </li>
                <li>
                  <strong>b.</strong> Matches played for another team (prior to a
                  transfer) do <strong>not</strong> count towards the four-match
                  requirement.
                </li>
                <li>
                  <strong>c.</strong> If a player takes part in a Semi-Final or
                  Final without meeting the eligibility criteria, their opponent
                  will be awarded the win.
                </li>
              </ul>
            </div>

            <div className="space-y-2 border-t border-slate-800/80 pt-4">
              <h3 className="text-base font-bold text-emerald-400">
                6. New Teams
              </h3>
              <ul className="space-y-1.5 list-none">
                <li>
                  <strong>a.</strong> New teams entering the league will start
                  in the <strong>lowest division</strong>.
                </li>
                <li>
                  <strong>b.</strong> The only exception is if the league
                  determines it is in the league’s best interest for the new
                  team to start in a <strong>higher division</strong>. This will
                  be decided by the league.
                </li>
              </ul>
            </div>

            <div className="space-y-2 border-t border-slate-800/80 pt-4">
              <h3 className="text-base font-bold text-emerald-400">
                7. Teams Folding
              </h3>
              <ul className="space-y-1.5 list-none">
                <li>
                  <strong>a.</strong> If a team folds in the{' '}
                  <strong>first half</strong> of the season, all results will be{' '}
                  <strong>expunged</strong>.
                </li>
                <li>
                  <strong>b.</strong> If a team folds in the{' '}
                  <strong>second half</strong> of the season, first-half results
                  will stand and all second-half results will be{' '}
                  <strong>expunged</strong>.
                </li>
                <li>
                  <strong>c.</strong> Each situation of a team folding will be
                  reviewed by the league on a <strong>case-by-case basis</strong>
                  .
                </li>
                <li>
                  <strong>d.</strong> The league may impose{' '}
                  <strong>player or team bans</strong> and/or{' '}
                  <strong>relegations</strong> as appropriate.
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* 3. CHAMPION OF CHAMPIONS (content/docs/champion-of-champions.md) */}
        {/* ================================================================ */}
        {section === 'cofc' && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-lg sm:text-xl font-black text-white">
                Champions of Champions
              </h2>
              <p className="mt-2 text-slate-300">
                The Champion of Champions event is usually played in November
                each year and aims to find the top open singles player, the top
                ladies singles player and the top team from all local pool
                leagues across the country. Further information can be found on
                the EPA website{' '}
                <a
                  href="https://www.epa.org.uk/cofc/#gsc.tab=0"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 underline font-semibold"
                >
                  here
                </a>
                .
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-bold text-emerald-400">
                1. Overview
              </h3>
              <ul className="list-disc list-inside space-y-1.5">
                <li>
                  The <strong>Brighton League</strong> can be represented by up
                  to <strong>four (4) teams</strong> in the Champions of
                  Champions.
                </li>
                <li>
                  Each team representing the Brighton League is allocated{' '}
                  <strong>two (2) singles spots</strong>.
                </li>
                <li>
                  These singles spots are for entry into either the{' '}
                  <strong>Men’s Singles</strong> or{' '}
                  <strong>Ladies Singles</strong> competitions.
                </li>
                <li>
                  Any team wishing to represent Brighton{' '}
                  <strong>must obtain league approval</strong> before submitting
                  their entry form.
                </li>
              </ul>
            </div>

            <div className="space-y-2 border-t border-slate-800/80 pt-4">
              <h3 className="text-base font-bold text-emerald-400">
                2. Allocation of Singles Spots
              </h3>
              <p>
                The Brighton League will allocate singles spots based on the
                following <strong>ranking system</strong>:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-white font-semibold pl-2">
                <li>Winter Open Singles</li>
                <li>Winter Ladies Singles</li>
                <li>Winter Premier League Averages</li>
                <li>Summer Open Singles</li>
                <li>Summer Ladies Singles</li>
                <li>Summer Premier League Averages</li>
              </ol>
            </div>

            <div className="space-y-2 border-t border-slate-800/80 pt-4">
              <h3 className="text-base font-bold text-emerald-400">
                3. Declined or Unfilled Spots
              </h3>
              <ul className="list-disc list-inside space-y-1.5">
                <li>
                  If a <strong>winner</strong> declines a singles spot, it will
                  be passed down the list in ranking order.
                </li>
                <li>
                  If the league reaches the{' '}
                  <strong>bottom of the list</strong> and has been unable to
                  fill the singles spots, allocation restarts from the{' '}
                  <strong>top of the list</strong>, offering spots to{' '}
                  <strong>runners-up</strong> or{' '}
                  <strong>2nd in the averages</strong>.
                </li>
                <li>
                  If runners-up decline a spot and the league again reaches the
                  bottom of the list, allocation restarts from the top and
                  offers the spots to <strong>losing semi-finalists</strong>{' '}
                  (starting with the player who finished higher in the{' '}
                  <strong>Winter Averages</strong>) or{' '}
                  <strong>3rd in the averages</strong>.
                </li>
              </ul>
            </div>

            <div className="space-y-2 border-t border-slate-800/80 pt-4">
              <h3 className="text-base font-bold text-emerald-400">
                4. Additional Spots
              </h3>
              <ul className="list-disc list-inside space-y-1.5">
                <li>
                  There is a{' '}
                  <strong>possibility of a 7th and 8th singles spot</strong> (if
                  four teams represent the Brighton League).
                </li>
                <li>
                  These additional allocations are{' '}
                  <strong>currently under review</strong>, with further
                  information to be provided at a later date.
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* 4. COMPETITIONS (content/docs/competitions/*.md)                 */}
        {/* ================================================================ */}
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
                    Official format, rules, match arrangement windows, and handicap matrices for all Winter 2026/27 competitions. All finals culminate on Presentation Night.
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
                    Brighton &amp; Hove Pool League championship records, division winners, cup triumphs, and individual honours spanning more than 40 years.
                  </p>
                </div>

                {/* Toolbar: Search & View Mode Switcher */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={honourSearch}
                      onChange={(e) => setHonourSearch(e.target.value)}
                      placeholder="Search player, team, season..."
                      className="w-full sm:w-56 pl-9 pr-8 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
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
                  { id: 'knockout', label: 'Knockout Cups', icon: Award },
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

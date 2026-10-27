import React, { useState } from 'react';
import { BookOpen, Crown, FileText, Scale, Trophy } from 'lucide-react';
import { useLeague } from '../context/LeagueContext';

type HonourSubTab =
  | 'league'
  | 'knockout'
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
    'format' | 'rules' | 'cofc' | 'competitions' | 'honours'
  >('format');
  const [honourTab, setHonourTab] = useState<HonourSubTab>('league');

  const renderTable = (
    headers: string[],
    rows: (string | number)[][]
  ): React.ReactNode => (
    <div className="overflow-x-auto border border-slate-800 rounded-xl">
      <table className="w-full text-xs sm:text-sm border-collapse">
        <thead>
          <tr className="bg-slate-950 text-slate-300 border-b border-slate-800 text-left">
            {headers.map((h, i) => (
              <th key={i} className="py-2.5 px-3 font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr
              key={idx}
              className="border-b border-slate-800/70 last:border-b-0 hover:bg-slate-800/30"
            >
              {r.map((cell, cIdx) => (
                <td
                  key={cIdx}
                  className={`py-2 px-3 ${
                    cIdx === 0
                      ? 'text-slate-400 font-medium whitespace-nowrap'
                      : cIdx === 1
                      ? 'text-white font-semibold'
                      : 'text-slate-300'
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <BookOpen className="w-3.5 h-3.5" />
            League Handbook &amp; History
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5">
            Rules, Format &amp; Roll of Honour
          </h1>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {(
            [
              { id: 'format', label: 'League Format', icon: FileText },
              { id: 'rules', label: 'League Rules', icon: Scale },
              { id: 'cofc', label: 'Champion of Champions', icon: Crown },
              { id: 'competitions', label: 'Competitions', icon: Trophy },
              { id: 'honours', label: 'Roll of Honour', icon: Trophy },
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
                  <strong>a minimum of four (4) games</strong> for that team
                  during the season.
                </li>
                <li>
                  <strong>b.</strong> Games played for another team (prior to a
                  transfer) do <strong>not</strong> count towards the four-game
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
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 sm:p-12 text-center max-w-xl mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
              <Trophy className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg sm:text-xl font-black text-white">
                {seasonName || 'Winter 2026/27'} Competitions Not Published Yet
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                Details, formats, and entry dates for this season's Singles, Doubles, and Cup competitions have not been published yet.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Announcements will be made once competition entries open</span>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* 5. ROLL OF HONOUR (content/docs/roll-of-honour/*.md)             */}
        {/* ================================================================ */}
        {section === 'honours' && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-1.5 border-b border-slate-800 pb-3">
              {(
                [
                  { id: 'league', label: 'League' },
                  { id: 'knockout', label: 'Knockout Cups' },
                  { id: 'singles', label: 'Singles' },
                  { id: 'ladies-singles', label: 'Ladies Singles' },
                  { id: 'doubles', label: 'Doubles' },
                  { id: 'mixed-doubles', label: 'Mixed Doubles' },
                  { id: 'averages', label: 'Averages' },
                  { id: 'ladies-averages', label: 'Ladies Averages' },
                  { id: 'top-dish', label: 'Top Dish' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setHonourTab(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    honourTab === t.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
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

            {honourTab === 'singles' && (
              <div className="space-y-3">
                <h2 className="text-lg font-black text-white">
                  Singles Roll of Honour
                </h2>
                {renderTable(
                  ['Season', 'Winner 🏆', 'Runner-up'],
                  [
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
                    ['Winter 2025/26', 'Stacey Hancock & Ben Middleton', 'Linda Edwards & Curtis Lambert'],
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
                    [['Winter 2025/26', 'Laura Boyle']]
                  )}
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-emerald-400 text-sm">
                    Division 1
                  </h3>
                  {renderTable(
                    ['Season', 'Winner 🏆'],
                    [['Winter 2025/26', 'Cliona Saunders-Cooney']]
                  )}
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-emerald-400 text-sm">
                    Division 2
                  </h3>
                  {renderTable(
                    ['Season', 'Winner 🏆'],
                    [['Winter 2025/26', 'Linda Edwards']]
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
                    [['Winter 2025/26', 'Avi Razvan', 3]]
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

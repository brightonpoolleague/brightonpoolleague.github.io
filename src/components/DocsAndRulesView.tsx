import React, { useState } from 'react';
import { BookOpen, Crown, FileText, Scale, Trophy } from 'lucide-react';

export const DocsAndRulesView: React.FC = () => {
  const [section, setSection] = useState<
    'format' | 'rules' | 'cofc' | 'competitions' | 'honours'
  >('format');

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

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 text-xs sm:text-sm text-slate-300 space-y-5 leading-relaxed">
        {section === 'format' && (
          <div className="space-y-4">
            <h2 className="text-lg font-black text-white">
              League Format (Effective from 19th May 2025)
            </h2>
            <div className="space-y-2">
              <h3 className="font-bold text-emerald-400">1. Overview</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  All matches consist of <strong>3 sets</strong> of{' '}
                  <strong>5 singles frame games</strong> (15 games in total).
                </li>
                <li>
                  Player substitutions are allowed{' '}
                  <strong>before the start of the 2nd and 3rd sets</strong> (up
                  to 15 different players can play in one match).
                </li>
                <li>
                  The same player can play in each of the 3 sets (maximum of 3
                  games), and cannot play multiple times in the same set.
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-emerald-400">2. Points</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Each match win is worth <strong>2 points</strong>.
                </li>
                <li>
                  Every 3 frames won is worth <strong>1 point</strong> (maximum
                  7 points: 15–0 = 7–0, 14–1 = 6–0, 13–2 = 6–0, 12–3 = 6–1,
                  11–4 = 5–1, 10–5 = 5–1, 9–6 = 5–2, 8–7 = 4–2).
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-emerald-400">
                3. Time Keeping &amp; Shot Clock
              </h3>
              <p>
                Matches start at <strong>8:00 PM sharp</strong> and should
                finish before 11:00 PM. Shot clocks are advised at{' '}
                <strong>10:30 PM</strong> if the 3rd game in Set 3 has not yet
                started (
                <a
                  href="https://www.epa.org.uk/stopclock/epa/index.php"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 underline"
                >
                  Open EPA Shot Clock
                </a>
                ).
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-emerald-400">
                4. Playing Order &amp; Substitutions
              </h3>
              <p>
                Home team playing order remains <code>1, 2, 3, 4, 5</code> in
                all sets. Away team playing order rotates each set so opponents
                always differ:
              </p>
              <img
                src={`${import.meta.env.BASE_URL}sets.png`}
                alt="Away Set Playing Order"
                className="rounded-xl border border-slate-800 max-w-xs bg-white p-2"
              />
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-emerald-400">
                5. Teams with 3 or 4 Players (BYE Rules)
              </h3>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>4 Players:</strong> Enter <code>BYE</code> in position
                  5. Any player facing a BYE is automatically awarded the win.
                </li>
                <li>
                  <strong>3 Players:</strong> Enter <code>BYE</code> in
                  positions 4 and 5.
                </li>
                <li>
                  <strong>BYE vs BYE:</strong> In the event of a BYE vs BYE, the
                  team winning the Frame 1 lag is awarded the win.
                </li>
              </ul>
            </div>
          </div>
        )}

        {section === 'rules' && (
          <div className="space-y-4">
            <h2 className="text-lg font-black text-white">
              League Rules (Effective from 4th November 2024)
            </h2>
            <div className="space-y-2">
              <h3 className="font-bold text-emerald-400">
                1. Code of Conduct
              </h3>
              <p>
                All players and venues are expected to uphold the values of the
                Brighton League in a respectful and accepting manner, with zero
                tolerance of discrimination or abuse.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-emerald-400">
                2. Registered Players &amp; Signings
              </h3>
              <p>
                Only registered players are eligible to play. New signings not
                registered with another team may be signed at any point during
                the season once notified to the league.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-emerald-400">
                3. Player Transfers &amp; Cup Eligibility
              </h3>
              <p>
                Players who have made at least one appearance for another team
                may only transfer during the first half of the season (by date).
                To play in Cup Semi-Finals or Finals, a player must have played
                a <strong>minimum of four (4) games</strong> for that team
                during the season.
              </p>
            </div>
          </div>
        )}

        {section === 'cofc' && (
          <div className="space-y-4">
            <h2 className="text-lg font-black text-white">
              Champion of Champions
            </h2>
            <p>
              The Brighton League can be represented by up to{' '}
              <strong>four (4) teams</strong> in the EPA Champion of Champions,
              with each team allocated <strong>two (2) singles spots</strong>{' '}
              ranked in order:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-200 font-medium">
              <li>Winter Open Singles Winner</li>
              <li>Winter Ladies Singles Winner</li>
              <li>Winter Premier League Averages Winner</li>
              <li>Summer Open Singles Winner</li>
              <li>Summer Ladies Singles Winner</li>
              <li>Summer Premier League Averages Winner</li>
            </ol>
          </div>
        )}

        {section === 'competitions' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1.5">
              <h3 className="font-bold text-emerald-400 text-sm">
                Open Singles
              </h3>
              <p>
                Races to 5 all the way through • International Rules • Randomly
                drawn each round.
              </p>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1.5">
              <h3 className="font-bold text-emerald-400 text-sm">
                Ladies Singles
              </h3>
              <p>
                Races to 5 all the way through • International Rules • Supported
                by Nigel Enticknapp.
              </p>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1.5">
              <h3 className="font-bold text-emerald-400 text-sm">
                Scotch Doubles
              </h3>
              <p>
                Races to 5 • Scotch format (alternate shots, talk before first
                shot only) • International Rules.
              </p>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1.5">
              <h3 className="font-bold text-emerald-400 text-sm">
                Captains Cup
              </h3>
              <p>
                Race to 5 • Handicapped by division (Prem scratch, Div 1 +1, Div
                2/3 +2).
              </p>
            </div>
          </div>
        )}

        {section === 'honours' && (
          <div className="space-y-4">
            <h2 className="text-lg font-black text-white">
              Recent Roll of Honour Highlights
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <h3 className="font-bold text-emerald-400">
                  League Champions (Winter 2025/26)
                </h3>
                <ul className="space-y-1 text-xs">
                  <li>
                    <strong>Premier League:</strong> LA Z (Runners-up: Romans
                    Lagers)
                  </li>
                  <li>
                    <strong>Division 1:</strong> LA Mavericks (Runners-up: LA
                    Pool Club)
                  </li>
                  <li>
                    <strong>Division 2:</strong> Castle IncrediBalls
                    (Runners-up: LA Breakers)
                  </li>
                </ul>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <h3 className="font-bold text-emerald-400">
                  Individual Honours (Winter 2025/26)
                </h3>
                <ul className="space-y-1 text-xs">
                  <li>
                    <strong>Open Singles:</strong> Chris Kingham
                  </li>
                  <li>
                    <strong>Ladies Singles:</strong> Laura Boyle
                  </li>
                  <li>
                    <strong>Doubles:</strong> Ben Middleton &amp; Mikey Booker
                  </li>
                  <li>
                    <strong>Prem Averages &amp; Top Dish:</strong> Jon Sanders
                  </li>
                  <li>
                    <strong>Div 1 Averages:</strong> Dan Stoner
                  </li>
                  <li>
                    <strong>Div 2 Averages:</strong> Ash Kianifard
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Calendar,
  Radio,
  Shield,
  Trophy,
  UserCheck,
} from 'lucide-react';
import { LeagueProvider, useLeague } from './context/LeagueContext';
import { FixturesAndLiveView } from './components/FixturesAndLiveView';
import { LeagueTableView } from './components/LeagueTableView';
import { PlayerStatsView } from './components/PlayerStatsView';
import { AdminPortalView } from './components/AdminPortalView';
import { DocsAndRulesView } from './components/DocsAndRulesView';
import { MatchScorecardModal } from './components/MatchScorecardModal';
import { RoleSwitcherModal } from './components/RoleSwitcherModal';

type NavTab = 'fixtures' | 'table' | 'stats' | 'rules' | 'admin';

const MainShell: React.FC = () => {
  const {
    seasons,
    seasonId,
    seasonName,
    setSelectedSeasonId,
    fixtures,
    session,
  } = useLeague();
  const [activeTab, setActiveTab] = useState<NavTab>('fixtures');
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(
    null
  );
  const [showRoleModal, setShowRoleModal] = useState(false);

  const selectedFixture =
    fixtures.find((f) => f.id === selectedFixtureId) || null;
  const liveMatchesCount = fixtures.filter((f) => f.status === 'live').length;

  const navItems: {
    id: NavTab;
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    {
      id: 'fixtures',
      label: 'Live & Fixtures',
      shortLabel: 'Live',
      icon: Calendar,
      badge: liveMatchesCount > 0 ? liveMatchesCount : undefined,
    },
    {
      id: 'table',
      label: 'League Table',
      shortLabel: 'Table',
      icon: Trophy,
    },
    {
      id: 'stats',
      label: 'Player Stats',
      shortLabel: 'Stats',
      icon: BarChart3,
    },
    {
      id: 'rules',
      label: 'Rules & Info',
      shortLabel: 'Rules',
      icon: BookOpen,
    },
    {
      id: 'admin',
      label: 'League Admin',
      shortLabel: 'Admin',
      icon: Shield,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-20 md:pb-8">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-3">
          {/* Brand & Season Switcher */}
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="Brighton Pool League Crest"
              onClick={() => setActiveTab('fixtures')}
              className="w-10 h-10 object-contain shrink-0 cursor-pointer"
            />
            <div className="min-w-0">
              <div
                onClick={() => setActiveTab('fixtures')}
                className="font-black text-sm sm:text-base text-white truncate cursor-pointer"
              >
                Brighton &amp; Hove Pool League
              </div>
              <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5">
                <Radio className="w-3 h-3 shrink-0" />
                {seasons.length > 1 ? (
                  <select
                    value={seasonId}
                    onChange={(e) => setSelectedSeasonId(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-[11px] text-emerald-300 font-bold"
                  >
                    {seasons.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span>{seasonName}</span>
                )}
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-black">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Role Switcher / PIN Login Pill */}
          <button
            type="button"
            onClick={() => setShowRoleModal(true)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition shrink-0 ${
              session.role === 'admin'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : session.role === 'captain'
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span className="max-w-[120px] sm:max-w-[160px] truncate">
              {session.name}
            </span>
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 pt-4 sm:pt-6">
        {activeTab === 'fixtures' && (
          <FixturesAndLiveView
            onSelectFixture={(fix) => setSelectedFixtureId(fix.id)}
            onGoToAdmin={() => {
              setActiveTab('admin');
            }}
          />
        )}
        {activeTab === 'table' && <LeagueTableView />}
        {activeTab === 'stats' && <PlayerStatsView />}
        {activeTab === 'rules' && <DocsAndRulesView />}
        {activeTab === 'admin' && (
          <AdminPortalView
            onSelectFixture={(fix) => setSelectedFixtureId(fix.id)}
          />
        )}
      </main>

      {/* Mobile Bottom Tab Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-2 py-1.5">
        <div className="grid grid-cols-5 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`relative flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-bold transition ${
                  isActive
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4 mb-0.5" />
                <span>{item.shortLabel}</span>
                {item.badge !== undefined && (
                  <span className="absolute top-1 right-3 w-2 h-2 rounded-full bg-red-500" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Live Match Scorecard Modal */}
      {selectedFixture && (
        <MatchScorecardModal
          fixture={selectedFixture}
          onClose={() => setSelectedFixtureId(null)}
        />
      )}

      {/* Role Switcher / PIN Login Modal */}
      {showRoleModal && (
        <RoleSwitcherModal onClose={() => setShowRoleModal(false)} />
      )}
    </div>
  );
};

export function App() {
  return (
    <LeagueProvider>
      <MainShell />
    </LeagueProvider>
  );
}

export default App;

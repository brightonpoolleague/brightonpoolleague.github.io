import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Edit3,
  History,
  KeyRound,
  PlayCircle,
  Plus,
  Radio,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Table as TableIcon,
  Trash2,
  Trophy,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  Division,
  Fixture,
  KnockoutFormat,
  MatchType,
  Player,
  Team,
} from '../types/league';
import { generateRandomPin, useLeague } from '../context/LeagueContext';
import {
  calculateMatchScore,
  formatMatchDate,
  getMatchTimeframe,
  getScorecardApprovalWarnings,
  isKnockoutFixture,
} from '../utils/leagueEngine';

interface AdminPortalViewProps {
  onSelectFixture: (fixture: Fixture) => void;
}

export const AdminPortalView: React.FC<AdminPortalViewProps> = ({
  onSelectFixture,
}) => {
  const {
    seasons,
    seasonId,
    seasonName,
    divisions,
    teams,
    players,
    fixtures,
    adminPin,
    canManageLeague,
    updateTeamPin,
    updateTeam,
    deleteTeam,
    addPlayer,
    updatePlayer,
    removePlayer,
    transferPlayer,
    addFixture,
    updateFixtureDetails,
    deleteFixture,
    approveFixture,
    reopenFixture,
    isCloudConnected,
    resetLocalTestData,
  } = useLeague();

  const [activeTab, setActiveTab] = useState<
    'teams' | 'fixtures' | 'approvals'
  >('teams');

  const [copiedTeamId, setCopiedTeamId] = useState<string | null>(null);
  const [newPlayerByTeam, setNewPlayerByTeam] = useState<
    Record<string, string>
  >({});
  const [filterDivision, setFilterDivision] = useState<Division | 'ALL'>('ALL');
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [fixtureFilterDivision, setFixtureFilterDivision] = useState<
    Division | 'ALL' | 'KNOCKOUT'
  >('ALL');
  const [fixtureSearchQuery, setFixtureSearchQuery] = useState('');
  const [fixtureDateFilter, setFixtureDateFilter] = useState('ALL');
  const [fixtureTimeframeFilter, setFixtureTimeframeFilter] = useState<
    'ALL' | 'live' | 'upcoming' | 'today' | 'past'
  >('ALL');
  const [approvalFilter, setApprovalFilter] = useState<
    'all' | 'submitted' | 'live' | 'scheduled' | 'overdue' | 'approved'
  >('all');
  const [scorecardSearchQuery, setScorecardSearchQuery] = useState('');

  // Team inline editing state
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [teamDraft, setTeamDraft] = useState<{
    name: string;
    division: Division;
    venue: string;
    address: string;
    captainName: string;
    tableNumber?: string;
  } | null>(null);

  // Quick Table inline editing state
  const [editingTableTeamId, setEditingTableTeamId] = useState<string | null>(null);
  const [quickTableDraft, setQuickTableDraft] = useState('');

  // Player inline renaming state
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingPlayerName, setEditingPlayerName] = useState('');

  // Fixture inline editing state
  const [editingFixtureId, setEditingFixtureId] = useState<string | null>(null);
  const [fixtureDraft, setFixtureDraft] = useState<{
    division: Division;
    matchDate: string;
    homeTeamId: string;
    awayTeamId: string;
    matchType: MatchType;
    cupName?: string;
    cupRound?: string;
    knockoutFormat?: KnockoutFormat;
  } | null>(null);

  // Fixture creation state
  const [showAddFixture, setShowAddFixture] = useState(false);
  const [newFixtureDraft, setNewFixtureDraft] = useState<{
    division: Division;
    matchDate: string;
    homeTeamId: string;
    awayTeamId: string;
    matchType: MatchType;
    cupName: string;
    cupRound: string;
    knockoutFormat: KnockoutFormat;
  }>({
    division: 'Division 1',
    matchDate: new Date().toISOString().split('T')[0],
    homeTeamId: '',
    awayTeamId: '',
    matchType: 'league',
    cupName: '',
    cupRound: '',
    knockoutFormat: 'first_to_8',
  });

  // Custom Confirmation Modal State
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

  if (!canManageLeague) {
    return null;
  }

  const handleCopyCaptainPin = (teamId: string, pin: string) => {
    navigator.clipboard?.writeText(pin);
    setCopiedTeamId(teamId);
    setTimeout(() => setCopiedTeamId(null), 2500);
  };

  const handleAddPlayerToTeam = async (teamId: string) => {
    const raw = (newPlayerByTeam[teamId] || '').trim();
    if (!raw) return;
    const names = raw
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean);
    for (const name of names) {
      await addPlayer(teamId, name);
    }
    setNewPlayerByTeam((prev) => ({ ...prev, [teamId]: '' }));
  };

  const handleSavePlayerName = async (player: Player) => {
    const trimmed = editingPlayerName.trim();
    if (!trimmed) return;
    await updatePlayer({ ...player, name: trimmed });
    setEditingPlayerId(null);
    setEditingPlayerName('');
  };

  const startEditingTeam = (team: Team) => {
    setEditingTeamId(team.id);
    setTeamDraft({
      name: team.name,
      division: team.division,
      venue: team.venue,
      address: team.address || '',
      captainName: team.captainName || '',
      tableNumber: team.tableNumber || '',
    });
  };

  // Helper to validate table conflicts
  const getTableConflict = (
    teamId: string,
    venue: string,
    division: string,
    tableRaw?: string
  ): { hasConflict: boolean; reason?: string; isWarning?: boolean } => {
    const raw = (tableRaw || '').trim();
    if (!raw) return { hasConflict: false };

    const lower = raw.toLowerCase();
    if (lower === 'tbc' || lower === 'table tbc') {
      return { hasConflict: false };
    }

    const canonical = lower.startsWith('table') ? lower : `table ${lower}`;
    const venueLower = venue.trim().toLowerCase();

    // Check all other teams at the same venue
    const otherTeams = teams.filter(
      (t) => t.id !== teamId && t.venue.trim().toLowerCase() === venueLower
    );

    for (const other of otherTeams) {
      const otherRaw = (other.tableNumber || '').trim().toLowerCase();
      if (!otherRaw || otherRaw === 'tbc' || otherRaw === 'table tbc') continue;
      const otherCanonical = otherRaw.startsWith('table')
        ? otherRaw
        : `table ${otherRaw}`;

      if (canonical === otherCanonical) {
        // Direct match: same venue, same table!
        // 1. Same division clash
        if (other.division === division) {
          return {
            hasConflict: true,
            reason: `"${raw}" is already assigned to "${other.name}" in ${other.division} at ${venue}. Two teams in the same division cannot share a table.`,
          };
        }

        // 2. Scheduled fixture clash
        const myHomeDates = new Set(
          fixtures
            .filter((f) => f.homeTeamId === teamId)
            .map((f) => f.matchDate)
        );
        const clashingDates = fixtures
          .filter(
            (f) => f.homeTeamId === other.id && myHomeDates.has(f.matchDate)
          )
          .map((f) => f.matchDate);

        if (clashingDates.length > 0) {
          return {
            hasConflict: true,
            reason: `"${raw}" clashes with "${other.name}" (${other.division}) on ${clashingDates.slice(0, 3).join(', ')}${clashingDates.length > 3 ? '...' : ''} — both teams have home matches scheduled on the same date.`,
          };
        }

        // 3. Different division without fixture clash
        return {
          hasConflict: false,
          isWarning: true,
          reason: `Note: "${raw}" is shared with "${other.name}" (${other.division}) on alternating weeks (no fixture clashes).`,
        };
      }
    }

    return { hasConflict: false };
  };

  const handleSaveQuickTable = async (team: Team) => {
    const cleanTable = quickTableDraft.trim();
    const conflict = getTableConflict(team.id, team.venue, team.division, cleanTable);
    if (conflict.hasConflict) return;

    await updateTeam({
      ...team,
      tableNumber: cleanTable || undefined,
    });
    setEditingTableTeamId(null);
  };

  const handleSaveTeamEdit = async (team: Team) => {
    if (!teamDraft || !teamDraft.name.trim() || !teamDraft.venue.trim()) return;
    const cleanTable = teamDraft.tableNumber?.trim() || undefined;
    const conflict = getTableConflict(
      team.id,
      teamDraft.venue.trim(),
      teamDraft.division,
      cleanTable
    );
    if (conflict.hasConflict) return;

    await updateTeam({
      ...team,
      name: teamDraft.name.trim(),
      division: teamDraft.division,
      venue: teamDraft.venue.trim(),
      address: teamDraft.address.trim(),
      captainName: teamDraft.captainName.trim(),
      tableNumber: cleanTable,
    });
    setEditingTeamId(null);
    setTeamDraft(null);
  };

  const startEditingFixture = (fix: Fixture) => {
    setEditingFixtureId(fix.id);
    setFixtureDraft({
      division: fix.division,
      matchDate: fix.matchDate,
      homeTeamId: fix.homeTeamId,
      awayTeamId: fix.awayTeamId,
      matchType: fix.matchType ?? 'league',
      cupName: fix.competitionName || fix.cupName || '',
      cupRound: fix.round || fix.cupRound || '',
      knockoutFormat:
        fix.knockoutFormat ??
        (fix.playAllFrames ? 'play_all_15' : 'first_to_8'),
    });
  };

  const handleSaveFixtureEdit = async (fix: Fixture) => {
    if (
      !fixtureDraft ||
      !fixtureDraft.homeTeamId ||
      !fixtureDraft.awayTeamId ||
      fixtureDraft.homeTeamId === fixtureDraft.awayTeamId
    ) {
      return;
    }
    const isKnockout = fixtureDraft.matchType === 'knockout';
    const compName = isKnockout
      ? fixtureDraft.cupName?.trim() || 'Knockout'
      : undefined;
    const roundName = isKnockout
      ? fixtureDraft.cupRound?.trim() || 'Round 1'
      : undefined;
    const koFormat = isKnockout
      ? fixtureDraft.knockoutFormat || 'first_to_8'
      : undefined;
    const playAll = isKnockout ? koFormat === 'play_all_15' : false;
    const fixtureDivision = isKnockout
      ? teamsById[fixtureDraft.homeTeamId]?.division || 'Knockout'
      : fixtureDraft.division;

    await updateFixtureDetails({
      ...fix,
      division: fixtureDivision,
      matchDate: fixtureDraft.matchDate,
      homeTeamId: fixtureDraft.homeTeamId,
      awayTeamId: fixtureDraft.awayTeamId,
      matchType: fixtureDraft.matchType ?? 'league',
      competitionName: compName,
      round: roundName,
      cupName: compName,
      cupRound: roundName,
      knockoutFormat: koFormat,
      playAllFrames: playAll,
    });
    setEditingFixtureId(null);
    setFixtureDraft(null);
  };

  const handleCreateFixture = async () => {
    if (
      !newFixtureDraft.homeTeamId ||
      !newFixtureDraft.awayTeamId ||
      newFixtureDraft.homeTeamId === newFixtureDraft.awayTeamId
    ) {
      return;
    }
    const isKnockout = newFixtureDraft.matchType === 'knockout';
    const compName = isKnockout
      ? newFixtureDraft.cupName.trim() || 'Knockout'
      : undefined;
    const roundName = isKnockout
      ? newFixtureDraft.cupRound.trim() || 'Round 1'
      : undefined;
    const koFormat = isKnockout
      ? newFixtureDraft.knockoutFormat || 'first_to_8'
      : undefined;
    const playAll = isKnockout ? koFormat === 'play_all_15' : false;
    const fixtureDivision = isKnockout
      ? teamsById[newFixtureDraft.homeTeamId]?.division || 'Knockout'
      : newFixtureDraft.division;

    await addFixture({
      division: fixtureDivision,
      matchDate: newFixtureDraft.matchDate,
      homeTeamId: newFixtureDraft.homeTeamId,
      awayTeamId: newFixtureDraft.awayTeamId,
      matchType: newFixtureDraft.matchType,
      competitionName: compName,
      round: roundName,
      cupName: compName,
      cupRound: roundName,
      knockoutFormat: koFormat,
      playAllFrames: playAll,
    });
    setShowAddFixture(false);
    setNewFixtureDraft({
      division: newFixtureDraft.division,
      matchDate: newFixtureDraft.matchDate,
      homeTeamId: '',
      awayTeamId: '',
      matchType: newFixtureDraft.matchType,
      cupName: '',
      cupRound: '',
      knockoutFormat: 'first_to_8',
    });
  };

  const filteredTeams = teams.filter((t) => {
    if (filterDivision !== 'ALL' && t.division !== filterDivision) {
      return false;
    }
    if (teamSearchQuery.trim()) {
      const q = teamSearchQuery.toLowerCase().trim();
      const matchesName = t.name.toLowerCase().includes(q);
      const matchesVenue = t.venue.toLowerCase().includes(q);
      const matchesCaptain = t.captainName.toLowerCase().includes(q);
      const matchesAddress = t.address.toLowerCase().includes(q);
      const matchesTable = (t.tableNumber || '').toLowerCase().includes(q);
      const matchesDivision = t.division.toLowerCase().includes(q);
      const teamPlayers = players.filter((p) => p.teamId === t.id);
      const matchesPlayer = teamPlayers.some((p) =>
        p.name.toLowerCase().includes(q)
      );
      return (
        matchesName ||
        matchesVenue ||
        matchesCaptain ||
        matchesAddress ||
        matchesTable ||
        matchesDivision ||
        matchesPlayer
      );
    }
    return true;
  });
  const teamsById = useMemo(
    () => Object.fromEntries(teams.map((t) => [t.id, t])),
    [teams]
  );

  const uniqueFixtureDates = useMemo(() => {
    const dateSet = new Set<string>();
    for (const f of fixtures) {
      if (!f.matchDate) continue;
      if (fixtureFilterDivision === 'KNOCKOUT') {
        if (!isKnockoutFixture(f)) continue;
      } else if (fixtureFilterDivision !== 'ALL') {
        if (f.division !== fixtureFilterDivision || isKnockoutFixture(f)) {
          continue;
        }
      }
      dateSet.add(f.matchDate);
    }
    return Array.from(dateSet).sort((a, b) => a.localeCompare(b));
  }, [fixtures, fixtureFilterDivision]);

  const fixtureTimeframeCounts = useMemo(() => {
    let all = 0;
    let live = 0;
    let upcoming = 0;
    let today = 0;
    let past = 0;

    for (const f of fixtures) {
      if (fixtureFilterDivision === 'KNOCKOUT') {
        if (!isKnockoutFixture(f)) continue;
      } else if (fixtureFilterDivision !== 'ALL') {
        if (f.division !== fixtureFilterDivision || isKnockoutFixture(f)) {
          continue;
        }
      }
      all++;
      if (f.status === 'live') {
        live++;
      }
      const tf = getMatchTimeframe(f.matchDate, f.status);
      if (tf === 'today') {
        today++;
      } else if (tf === 'upcoming') {
        upcoming++;
      } else if (tf === 'past') {
        past++;
      }
    }
    return { all, live, upcoming, today, past };
  }, [fixtures, fixtureFilterDivision]);

  const filteredFixtures = useMemo(() => {
    return fixtures.filter((f) => {
      if (fixtureFilterDivision === 'KNOCKOUT') {
        if (!isKnockoutFixture(f)) return false;
      } else if (fixtureFilterDivision !== 'ALL') {
        if (f.division !== fixtureFilterDivision || isKnockoutFixture(f)) {
          return false;
        }
      }
      if (fixtureTimeframeFilter !== 'ALL') {
        if (fixtureTimeframeFilter === 'live') {
          if (f.status !== 'live') return false;
        } else if (fixtureTimeframeFilter === 'today') {
          const tf = getMatchTimeframe(f.matchDate, f.status);
          if (tf !== 'today') return false;
        } else if (fixtureTimeframeFilter === 'upcoming') {
          const tf = getMatchTimeframe(f.matchDate, f.status);
          if (tf !== 'upcoming' || f.status === 'live') return false;
        } else if (fixtureTimeframeFilter === 'past') {
          const tf = getMatchTimeframe(f.matchDate, f.status);
          if (tf !== 'past' || f.status === 'live') return false;
        }
      }
      if (fixtureDateFilter !== 'ALL' && f.matchDate !== fixtureDateFilter) {
        return false;
      }
      if (fixtureSearchQuery.trim()) {
        const q = fixtureSearchQuery.toLowerCase().trim();
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
        const knockoutStr = `${isKnockoutFixture(f) ? 'knockout cup plate' : 'league'} ${f.competitionName ?? ''} ${f.cupName ?? ''} ${f.round ?? ''} ${f.cupRound ?? ''}`.toLowerCase();

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
    });
  }, [
    fixtures,
    fixtureFilterDivision,
    fixtureTimeframeFilter,
    fixtureDateFilter,
    fixtureSearchQuery,
    teamsById,
  ]);

  return (
    <div className="space-y-5 min-w-0 max-w-full">
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            League Admin Control Panel
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5">
            Manage {seasonName}
          </h1>
        </div>

        {/* Admin Section Tabs */}
        <div className="grid grid-cols-3 gap-1 sm:gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('teams')}
            className={`py-2 px-1 sm:px-2.5 rounded-lg text-[11px] sm:text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 ${
              activeTab === 'teams'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="text-center whitespace-nowrap">
              Teams &amp; PINs<span className="hidden sm:inline"> ({teams.length})</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fixtures')}
            className={`py-2 px-1 sm:px-2.5 rounded-lg text-[11px] sm:text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 ${
              activeTab === 'fixtures'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="text-center whitespace-nowrap">
              Fixtures<span className="hidden sm:inline"> ({fixtures.length})</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('approvals')}
            className={`py-2 px-1 sm:px-2.5 rounded-lg text-[11px] sm:text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 ${
              activeTab === 'approvals'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="text-center whitespace-nowrap">Scorecards</span>
          </button>
        </div>
      </div>

      {/* TAB 1: TEAMS, PLAYERS & CAPTAIN PINs */}
      {activeTab === 'teams' && (
        <div className="space-y-3.5 min-w-0">
          <div className="w-full overflow-x-auto pb-1">
            <div className="inline-flex items-center gap-1.5 min-w-max">
              <button
                type="button"
                onClick={() => setFilterDivision('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${
                  filterDivision === 'ALL'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                All ({teams.length})
              </button>
              {divisions.map((div) => (
                <button
                  key={div}
                  type="button"
                  onClick={() => setFilterDivision(div)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${
                    filterDivision === div
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  {div} ({teams.filter((t) => t.division === div).length})
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={teamSearchQuery}
              onChange={(e) => setTeamSearchQuery(e.target.value)}
              placeholder="Search by team, venue, table, captain, player or street..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-9 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition shadow-sm"
            />
            {teamSearchQuery && (
              <button
                type="button"
                onClick={() => setTeamSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {filteredTeams.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-sm text-slate-400">
              {teamSearchQuery.trim() ? (
                <>No teams match "<strong>{teamSearchQuery}</strong>".</>
              ) : (
                <>No teams found for <strong>{seasonName}</strong>.</>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredTeams.map((team) => {
                const squad = players.filter((p) => p.teamId === team.id);
                const isEditing = editingTeamId === team.id && teamDraft !== null;

                return (
                  <div
                    key={team.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                          {team.division}
                        </span>
                        <h3 className="text-base font-bold text-white">
                          {team.name}
                        </h3>
                        <p className="text-xs text-slate-400">
                          Venue: {team.venue}
                          {team.tableNumber ? ` (${team.tableNumber})` : ''}
                          {team.captainName
                            ? ` • Captain: ${team.captainName}`
                            : ''}
                        </p>
                        {team.address && (
                          <p className="text-[11px] text-slate-500">
                            {team.address}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            isEditing
                              ? setEditingTeamId(null)
                              : startEditingTeam(team)
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold"
                          title="Edit Team Name, Venue & Details"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                          {isEditing ? 'Cancel' : 'Edit Team'}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmDialog({
                              title: `Delete ${team.name}?`,
                              message: `Are you sure you want to delete "${team.name}"? This will also permanently delete its signed-on players and any fixtures involving this team.`,
                              confirmLabel: 'Delete Team',
                              variant: 'danger',
                              onConfirm: () => deleteTeam(team.id),
                            })
                          }
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"
                          title="Delete Team"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Venue Table Quick Editor */}
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <TableIcon className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Venue Table:</span>
                      </div>
                      {editingTableTeamId === team.id ? (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 w-full sm:w-auto">
                          <input
                            type="text"
                            value={quickTableDraft}
                            onChange={(e) => setQuickTableDraft(e.target.value)}
                            placeholder="e.g. Table 1, Table TBC or blank"
                            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white w-full sm:w-48 font-semibold"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveQuickTable(team);
                              if (e.key === 'Escape') setEditingTableTeamId(null);
                            }}
                          />
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleSaveQuickTable(team)}
                              disabled={
                                getTableConflict(
                                  team.id,
                                  team.venue,
                                  team.division,
                                  quickTableDraft
                                ).hasConflict
                              }
                              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingTableTeamId(null)}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold ${
                              team.tableNumber
                                ? 'text-amber-300'
                                : 'text-slate-400 italic'
                            }`}
                          >
                            {team.tableNumber || 'None (Single Table)'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTableTeamId(team.id);
                              setQuickTableDraft(team.tableNumber || '');
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 text-[11px] font-semibold transition"
                            title="Edit Table"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit Table</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Conflict Notice if Quick Editing Table */}
                    {editingTableTeamId === team.id && (() => {
                      const conflict = getTableConflict(
                        team.id,
                        team.venue,
                        team.division,
                        quickTableDraft
                      );
                      if (!conflict.reason) return null;
                      return (
                        <div
                          className={`text-xs px-3 py-1.5 rounded-lg border flex items-start gap-1.5 ${
                            conflict.hasConflict
                              ? 'bg-red-500/10 border-red-500/30 text-red-300 font-semibold'
                              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                          }`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{conflict.reason}</span>
                        </div>
                      );
                    })()}

                    <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                        <span>Captain PIN:</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={team.captainPin && !team.captainPin.includes('•') ? team.captainPin : ''}
                          placeholder="8-digit PIN"
                          onChange={(e) =>
                            updateTeamPin(team.id, e.target.value)
                          }
                          className="w-24 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-amber-300 text-center"
                          title="Edit Captain PIN directly"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmDialog({
                              title: `Regenerate Captain PIN?`,
                              message: `Generate a new random 8-digit Captain PIN for "${team.name}"? Their previous PIN (${team.captainPin}) will stop working immediately.`,
                              confirmLabel: 'Generate New PIN',
                              variant: 'warning',
                              onConfirm: () =>
                                updateTeamPin(team.id, generateRandomPin()),
                            })
                          }
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                          title="Generate new random 8-digit PIN"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyCaptainPin(team.id, team.captainPin)
                          }
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-[11px] font-semibold"
                          title="Copy PIN"
                        >
                          <Copy className="w-3 h-3" />
                          {copiedTeamId === team.id ? 'Copied!' : 'Copy PIN'}
                        </button>
                      </div>
                    </div>

                    {/* Inline Team Details Editor */}
                    {isEditing && teamDraft && (
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2.5">
                        <div className="text-xs font-bold text-emerald-400">
                          Edit Team Details
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1">
                              Team Name *
                            </label>
                            <input
                              type="text"
                              value={teamDraft.name}
                              onChange={(e) =>
                                setTeamDraft({
                                  ...teamDraft,
                                  name: e.target.value,
                                })
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1">
                              Division
                            </label>
                            <select
                              value={teamDraft.division}
                              onChange={(e) =>
                                setTeamDraft({
                                  ...teamDraft,
                                  division: e.target.value as Division,
                                })
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                            >
                              {divisions.map((div) => (
                                <option key={div} value={div}>
                                  {div}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1">
                              Venue *
                            </label>
                            <input
                              type="text"
                              value={teamDraft.venue}
                              onChange={(e) =>
                                setTeamDraft({
                                  ...teamDraft,
                                  venue: e.target.value,
                                })
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1">
                              Captain Name
                            </label>
                            <input
                              type="text"
                              value={teamDraft.captainName}
                              onChange={(e) =>
                                setTeamDraft({
                                  ...teamDraft,
                                  captainName: e.target.value,
                                })
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1">
                              Table Number (Optional)
                            </label>
                            <input
                              type="text"
                              value={teamDraft.tableNumber || ''}
                              onChange={(e) =>
                                setTeamDraft({
                                  ...teamDraft,
                                  tableNumber: e.target.value,
                                })
                              }
                              placeholder="e.g. Table 1, Table TBC or blank"
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                            />
                            {(() => {
                              const conflict = getTableConflict(
                                team.id,
                                teamDraft.venue,
                                teamDraft.division,
                                teamDraft.tableNumber
                              );
                              if (!conflict.reason) return null;
                              return (
                                <p
                                  className={`text-[11px] mt-1 flex items-start gap-1 ${
                                    conflict.hasConflict
                                      ? 'text-red-400 font-semibold'
                                      : 'text-amber-400'
                                  }`}
                                >
                                  <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                                  <span>{conflict.reason}</span>
                                </p>
                              );
                            })()}
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] text-slate-400 mb-1">
                              Venue Address
                            </label>
                            <input
                              type="text"
                              value={teamDraft.address}
                              onChange={(e) =>
                                setTeamDraft({
                                  ...teamDraft,
                                  address: e.target.value,
                                })
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTeamId(null);
                              setTeamDraft(null);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                          >
                            <X className="w-3.5 h-3.5" />
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveTeamEdit(team)}
                            disabled={
                              getTableConflict(
                                team.id,
                                teamDraft.venue,
                                teamDraft.division,
                                teamDraft.tableNumber
                              ).hasConflict
                            }
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition"
                          >
                            <Save className="w-3.5 h-3.5" />
                            Save Team Changes
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-300">
                        Signed-On Players ({squad.length}):
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {squad.map((player) =>
                          editingPlayerId === player.id ? (
                            <div
                              key={player.id}
                              className="inline-flex items-center gap-1.5 bg-slate-900 border border-emerald-500/50 rounded-lg px-2 py-1 text-xs shadow-sm"
                            >
                              <input
                                type="text"
                                value={editingPlayerName}
                                onChange={(e) =>
                                  setEditingPlayerName(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSavePlayerName(player);
                                  } else if (e.key === 'Escape') {
                                    setEditingPlayerId(null);
                                  }
                                }}
                                className="bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white font-medium focus:outline-none focus:border-emerald-500 w-32"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSavePlayerName(player)}
                                className="text-emerald-400 hover:text-emerald-300 p-0.5"
                                title="Save name"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingPlayerId(null)}
                                className="text-slate-400 hover:text-slate-200 p-0.5"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div
                              key={player.id}
                              className="inline-flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 hover:border-slate-700 transition"
                            >
                              <span className="font-medium text-slate-200">
                                {player.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPlayerId(player.id);
                                  setEditingPlayerName(player.name);
                                }}
                                className="text-slate-500 hover:text-emerald-400 transition p-0.5"
                                title={`Rename ${player.name}`}
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              {teams.length > 1 && (
                                <select
                                  value={player.teamId}
                                  onChange={(e) => {
                                    const targetId = e.target.value;
                                    const targetTeam = teams.find(
                                      (t) => t.id === targetId
                                    );
                                    if (targetTeam && targetId !== team.id) {
                                      setConfirmDialog({
                                        title: `Transfer Player: ${player.name}?`,
                                        message: `Move "${player.name}" from "${team.name}" to "${targetTeam.name}"?`,
                                        confirmLabel: 'Transfer Player',
                                        variant: 'warning',
                                        onConfirm: () =>
                                          transferPlayer(player.id, targetId),
                                      });
                                    }
                                  }}
                                  className="bg-transparent text-[10px] text-slate-500 hover:text-emerald-400 focus:outline-none cursor-pointer"
                                  title="Transfer player to another team"
                                >
                                  {teams.map((t) => (
                                    <option
                                      key={t.id}
                                      value={t.id}
                                      className="bg-slate-900 text-white"
                                    >
                                      {t.id === team.id
                                        ? 'Transfer...'
                                        : `→ ${t.name}`}
                                    </option>
                                  ))}
                                </select>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmDialog({
                                    title: `Delete Player: ${player.name}?`,
                                    message: `Are you sure you want to permanently delete "${player.name}" from "${team.name}"? This will also remove all of their individual player statistics and dish records from the leaderboards.`,
                                    confirmLabel: 'Delete Player',
                                    variant: 'danger',
                                    onConfirm: () => removePlayer(player.id),
                                  })
                                }
                                className="text-slate-500 hover:text-red-400 transition p-0.5"
                                title={`Delete ${player.name}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )
                        )}
                        {squad.length === 0 && (
                          <span className="text-xs text-slate-500 italic">
                            No players signed on yet.
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={newPlayerByTeam[team.id] || ''}
                          onChange={(e) =>
                            setNewPlayerByTeam((prev) => ({
                              ...prev,
                              [team.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddPlayerToTeam(team.id);
                            }
                          }}
                          placeholder="Add player name (or comma-separated names)..."
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddPlayerToTeam(team.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Add Player
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FIXTURES MANAGER */}
      {activeTab === 'fixtures' && (
        <div className="space-y-3.5 min-w-0">
          {/* Filters */}
          <div className="space-y-2.5 min-w-0">
            {/* Division & Knockout Filter */}
            <div className="w-full overflow-x-auto pb-1">
              <div className="inline-flex items-center gap-1.5 min-w-max">
                <button
                  type="button"
                  onClick={() => setFixtureFilterDivision('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    fixtureFilterDivision === 'ALL'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  All ({fixtures.length})
                </button>
                {divisions.map((div) => {
                  const count = fixtures.filter(
                    (f) => f.division === div && !isKnockoutFixture(f)
                  ).length;
                  return (
                    <button
                      key={div}
                      type="button"
                      onClick={() => setFixtureFilterDivision(div)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                        fixtureFilterDivision === div
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                      }`}
                    >
                      {div} ({count})
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setFixtureFilterDivision('KNOCKOUT')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap inline-flex items-center gap-1 transition ${
                    fixtureFilterDivision === 'KNOCKOUT'
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-slate-900 text-amber-400 border border-slate-800 hover:border-amber-500/50'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>
                    Knockouts ({fixtures.filter((f) => isKnockoutFixture(f)).length})
                  </span>
                </button>
              </div>
            </div>

            {/* Timeframe Filter Tabs */}
            <div className="w-full overflow-x-auto pb-1">
              <div className="inline-flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold min-w-max">
                <button
                  type="button"
                  onClick={() => setFixtureTimeframeFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                    fixtureTimeframeFilter === 'ALL'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({fixtureTimeframeCounts.all})
                </button>
                <button
                  type="button"
                  onClick={() => setFixtureTimeframeFilter('live')}
                  className={`px-2.5 py-1 rounded-lg transition inline-flex items-center gap-1.5 whitespace-nowrap ${
                    fixtureTimeframeFilter === 'live'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Radio
                    className={`w-3 h-3 ${
                      fixtureTimeframeFilter === 'live'
                        ? 'text-white'
                        : 'text-red-400'
                    }`}
                  />
                  Live ({fixtureTimeframeCounts.live})
                </button>
                <button
                  type="button"
                  onClick={() => setFixtureTimeframeFilter('upcoming')}
                  className={`px-2.5 py-1 rounded-lg transition inline-flex items-center gap-1.5 whitespace-nowrap ${
                    fixtureTimeframeFilter === 'upcoming'
                      ? 'bg-sky-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Clock className="w-3 h-3 text-sky-400" />
                  Upcoming ({fixtureTimeframeCounts.upcoming})
                </button>
                {fixtureTimeframeCounts.today > 0 && (
                  <button
                    type="button"
                    onClick={() => setFixtureTimeframeFilter('today')}
                    className={`px-2.5 py-1 rounded-lg transition inline-flex items-center gap-1.5 whitespace-nowrap ${
                      fixtureTimeframeFilter === 'today'
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Calendar className="w-3 h-3 text-emerald-400" />
                    Today ({fixtureTimeframeCounts.today})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setFixtureTimeframeFilter('past')}
                  className={`px-2.5 py-1 rounded-lg transition inline-flex items-center gap-1.5 whitespace-nowrap ${
                    fixtureTimeframeFilter === 'past'
                      ? 'bg-slate-700 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <History className="w-3 h-3 text-slate-400" />
                  Past Date ({fixtureTimeframeCounts.past})
                </button>
              </div>
            </div>

            {/* Search, Date Filter & Action Toolbar */}
            <div className="flex flex-col sm:flex-row gap-2.5 min-w-0">
              {/* Search Input */}
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={fixtureSearchQuery}
                  onChange={(e) => setFixtureSearchQuery(e.target.value)}
                  placeholder="Search by team, venue, table, division or date..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-9 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition shadow-sm"
                />
                {fixtureSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setFixtureSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Date Filter Dropdown & Native Picker */}
              <div className="flex items-center gap-1.5 w-full sm:w-72 sm:flex-shrink-0 min-w-0">
                <div className="relative flex-1 min-w-0">
                  <Calendar className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={fixtureDateFilter}
                    onChange={(e) => setFixtureDateFilter(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-7 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition shadow-sm appearance-none cursor-pointer truncate"
                  >
                    <option value="ALL">All Dates</option>
                    {fixtureDateFilter !== 'ALL' &&
                      !uniqueFixtureDates.includes(fixtureDateFilter) && (
                        <option value={fixtureDateFilter}>
                          {formatMatchDate(fixtureDateFilter)}
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
                    value={fixtureDateFilter === 'ALL' ? '' : fixtureDateFilter}
                    onChange={(e) => setFixtureDateFilter(e.target.value || 'ALL')}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div
                    className={`p-2 rounded-xl border text-xs transition flex items-center justify-center ${
                      fixtureDateFilter !== 'ALL'
                        ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>

                {fixtureDateFilter !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setFixtureDateFilter('ALL')}
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition flex-shrink-0"
                    title="Reset date filter"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Schedule Fixture Action Button */}
              <button
                type="button"
                onClick={() => {
                  setShowAddFixture((prev) => !prev);
                  if (!newFixtureDraft.homeTeamId && teams.length > 0) {
                    const availableTeams =
                      newFixtureDraft.matchType === 'knockout'
                        ? teams
                        : teams.filter(
                            (t) => t.division === newFixtureDraft.division
                          );
                    if (availableTeams.length >= 2) {
                      setNewFixtureDraft((prev) => ({
                        ...prev,
                        homeTeamId: availableTeams[0].id,
                        awayTeamId: availableTeams[1].id,
                      }));
                    }
                  }
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm shrink-0 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showAddFixture ? 'Close Form' : 'Schedule Fixture'}</span>
              </button>
            </div>
          </div>

          {/* Inline Schedule Fixture Form */}
          {showAddFixture && (
            <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-lg min-w-0 max-w-full">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="font-bold text-sm text-white flex items-center gap-1.5 min-w-0">
                  <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">Schedule New Fixture</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddFixture(false)}
                  className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 min-w-0">
                <div className="min-w-0">
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Match Format
                  </label>
                  <select
                    value={newFixtureDraft.matchType}
                    onChange={(e) =>
                      setNewFixtureDraft({
                        ...newFixtureDraft,
                        matchType: e.target.value as MatchType,
                      })
                    }
                    className="w-full max-w-full min-w-0 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="league">League Match (15 frames)</option>
                    <option value="knockout">Knockout</option>
                  </select>
                </div>

                {newFixtureDraft.matchType === 'knockout' && (
                  <>
                    <div className="min-w-0">
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Knockout Format Rule
                      </label>
                      <select
                        value={newFixtureDraft.knockoutFormat}
                        onChange={(e) =>
                          setNewFixtureDraft({
                            ...newFixtureDraft,
                            knockoutFormat: e.target.value as KnockoutFormat,
                          })
                        }
                        className="w-full max-w-full min-w-0 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value="first_to_8">
                          First to 8 frames (Standard Knockout)
                        </option>
                        <option value="play_all_15">
                          Play all 15 frames (2-Leg Tie / Aggregate)
                        </option>
                      </select>
                    </div>
                    <div className="min-w-0">
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Event / Competition Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Division 1 Cup, Summer Cup, Summer Plate"
                        value={newFixtureDraft.cupName}
                        onChange={(e) =>
                          setNewFixtureDraft({
                            ...newFixtureDraft,
                            cupName: e.target.value,
                          })
                        }
                        className="w-full max-w-full min-w-0 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div className="min-w-0">
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Knockout Round
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Quarter-Final, Semi-Final, Final"
                        value={newFixtureDraft.cupRound}
                        onChange={(e) =>
                          setNewFixtureDraft({
                            ...newFixtureDraft,
                            cupRound: e.target.value,
                          })
                        }
                        className="w-full max-w-full min-w-0 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </>
                )}

                <div className="min-w-0">
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Match Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={newFixtureDraft.matchDate}
                      onChange={(e) =>
                        setNewFixtureDraft({
                          ...newFixtureDraft,
                          matchDate: e.target.value,
                        })
                      }
                      onClick={(e) => {
                        try {
                          e.currentTarget.showPicker?.();
                        } catch {}
                      }}
                      className="w-full bg-slate-950 border border-slate-700 hover:border-slate-600 focus:border-emerald-500 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white [color-scheme:dark] cursor-pointer transition shadow-sm"
                    />
                    <Calendar className="w-3.5 h-3.5 text-emerald-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {newFixtureDraft.matchDate && (
                    <div className="text-[10px] text-emerald-400 font-medium mt-1 truncate">
                      {formatMatchDate(newFixtureDraft.matchDate)}
                    </div>
                  )}
                </div>

                {newFixtureDraft.matchType !== 'knockout' && (
                  <div className="min-w-0">
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Division
                    </label>
                    <select
                      value={newFixtureDraft.division}
                      onChange={(e) => {
                        const div = e.target.value as Division;
                        const divTeams = teams.filter((t) => t.division === div);
                        setNewFixtureDraft({
                          ...newFixtureDraft,
                          division: div,
                          homeTeamId: divTeams[0]?.id || '',
                          awayTeamId: divTeams[1]?.id || '',
                        });
                      }}
                      className="w-full max-w-full min-w-0 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    >
                      {divisions.map((div) => (
                        <option key={div} value={div}>
                          {div}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className={`min-w-0 ${newFixtureDraft.matchType === 'knockout' ? 'sm:col-span-1' : ''}`}>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Home Team
                  </label>
                  <select
                    value={newFixtureDraft.homeTeamId}
                    onChange={(e) =>
                      setNewFixtureDraft({
                        ...newFixtureDraft,
                        homeTeamId: e.target.value,
                      })
                    }
                    className="w-full max-w-full min-w-0 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white truncate"
                  >
                    <option value="">-- Select Home Team --</option>
                    {newFixtureDraft.matchType === 'knockout'
                      ? divisions.map((div) => {
                          const divTeams = teams.filter((t) => t.division === div);
                          if (divTeams.length === 0) return null;
                          return (
                            <optgroup key={div} label={div}>
                              {divTeams.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name} ({t.division})
                                </option>
                              ))}
                            </optgroup>
                          );
                        })
                      : teams
                          .filter((t) => t.division === newFixtureDraft.division)
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                  </select>
                </div>

                <div className={`min-w-0 ${newFixtureDraft.matchType === 'knockout' ? 'sm:col-span-2' : 'sm:col-span-2'}`}>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Away Team
                  </label>
                  <select
                    value={newFixtureDraft.awayTeamId}
                    onChange={(e) =>
                      setNewFixtureDraft({
                        ...newFixtureDraft,
                        awayTeamId: e.target.value,
                      })
                    }
                    className="w-full max-w-full min-w-0 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white truncate"
                  >
                    <option value="">-- Select Away Team --</option>
                    {newFixtureDraft.matchType === 'knockout'
                      ? divisions.map((div) => {
                          const divTeams = teams.filter(
                            (t) =>
                              t.division === div &&
                              t.id !== newFixtureDraft.homeTeamId
                          );
                          if (divTeams.length === 0) return null;
                          return (
                            <optgroup key={div} label={div}>
                              {divTeams.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name} ({t.division})
                                </option>
                              ))}
                            </optgroup>
                          );
                        })
                      : teams
                          .filter(
                            (t) =>
                              t.division === newFixtureDraft.division &&
                              t.id !== newFixtureDraft.homeTeamId
                          )
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddFixture(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={
                    !newFixtureDraft.homeTeamId ||
                    !newFixtureDraft.awayTeamId ||
                    newFixtureDraft.homeTeamId === newFixtureDraft.awayTeamId
                  }
                  onClick={handleCreateFixture}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition shadow"
                >
                  Confirm &amp; Schedule
                </button>
              </div>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-white">
              {seasonName} Fixtures ({filteredFixtures.length})
            </h3>
            {filteredFixtures.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 space-y-1.5">
                {fixtureSearchQuery.trim() || fixtureDateFilter !== 'ALL' ? (
                  <>
                    <p>
                      No fixtures match your current filters
                      {fixtureDateFilter !== 'ALL' && (
                        <span>
                          {' '}
                          on{' '}
                          <strong>{formatMatchDate(fixtureDateFilter)}</strong>
                        </span>
                      )}
                      {fixtureSearchQuery.trim() && (
                        <span>
                          {' '}
                          matching &ldquo;
                          <strong>{fixtureSearchQuery}</strong>&rdquo;
                        </span>
                      )}
                      .
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setFixtureSearchQuery('');
                        setFixtureDateFilter('ALL');
                        setFixtureTimeframeFilter('ALL');
                        setFixtureFilterDivision('ALL');
                      }}
                      className="inline-flex items-center gap-1 text-emerald-400 hover:underline font-semibold mt-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Reset all filters
                    </button>
                  </>
                ) : (
                  <p>No fixtures found for {seasonName}.</p>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredFixtures.map((fix) => {
                  const home = teamsById[fix.homeTeamId];
                  const away = teamsById[fix.awayTeamId];
                  if (!home || !away) return null;
                  const score = calculateMatchScore(fix);
                  const timeframe = getMatchTimeframe(
                    fix.matchDate,
                    fix.status
                  );
                  const isEditing =
                    editingFixtureId === fix.id && fixtureDraft !== null;
                  const divTeams = teams.filter(
                    (t) =>
                      t.division === (fixtureDraft?.division ?? fix.division)
                  );

                  return (
                    <div
                      key={fix.id}
                      className={`border rounded-xl p-3 space-y-3 text-xs transition min-w-0 ${
                        fix.status === 'live'
                          ? 'bg-slate-950 border-red-500/50 shadow-md shadow-red-950/20'
                          : timeframe === 'today'
                          ? 'bg-slate-950 border-emerald-500/50 shadow-md shadow-emerald-950/20'
                          : timeframe === 'upcoming'
                          ? 'bg-slate-950/90 border-slate-800 hover:border-sky-500/40'
                          : 'bg-slate-950/60 border-slate-800/80'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 min-w-0">
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            {isKnockoutFixture(fix) ? (
                              <span className="text-amber-400 font-bold inline-flex items-center gap-1">
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
                              <span className="text-emerald-400 font-bold">
                                {fix.division}
                              </span>
                            )}
                            <span className="text-slate-600">•</span>
                            <span className="text-slate-300">
                              {formatMatchDate(fix.matchDate)}
                            </span>

                            {/* Prominent Status & Timeframe Badge */}
                            {fix.status === 'live' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse">
                                <Radio className="w-2.5 h-2.5" />
                                LIVE ({isKnockoutFixture(fix)
                                  ? fix.knockoutFormat === 'play_all_15'
                                    ? `${score.completedFrames}/15`
                                    : 'First to 8'
                                  : `${score.completedFrames}/15`})
                              </span>
                            ) : fix.status === 'approved' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                Approved
                              </span>
                            ) : fix.status === 'submitted' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                <Clock className="w-2.5 h-2.5" />
                                Awaiting Approval
                              </span>
                            ) : timeframe === 'today' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                                <Calendar className="w-2.5 h-2.5" />
                                Match Today
                              </span>
                            ) : timeframe === 'upcoming' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
                                <Clock className="w-2.5 h-2.5" />
                                Upcoming
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700">
                                <History className="w-2.5 h-2.5" />
                                Past Date
                              </span>
                            )}
                          </div>

                          <div className="font-bold text-white text-sm flex flex-wrap items-center gap-1.5 sm:gap-2 leading-snug break-words">
                            <span>{home.name}</span>
                            <span className="tabular-nums">
                              {score.completedFrames > 0 || fix.status !== 'scheduled' ? (
                                <span className="inline-flex items-center gap-1 font-black px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                                  <span
                                    className={
                                      score.homeFrames > score.awayFrames
                                        ? 'text-emerald-400'
                                        : 'text-slate-300'
                                    }
                                  >
                                    {score.homeFrames}
                                  </span>
                                  <span className="text-slate-600">–</span>
                                  <span
                                    className={
                                      score.awayFrames > score.homeFrames
                                        ? 'text-emerald-400'
                                        : 'text-slate-300'
                                    }
                                  >
                                    {score.awayFrames}
                                  </span>
                                </span>
                              ) : (
                                <span className="text-xs font-semibold text-slate-500">
                                  vs
                                </span>
                              )}
                            </span>
                            <span>{away.name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap shrink-0 pt-1 sm:pt-0">
                          <button
                            type="button"
                            onClick={() =>
                              isEditing
                                ? setEditingFixtureId(null)
                                : startEditingFixture(fix)
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold inline-flex items-center gap-1 text-xs whitespace-nowrap"
                          >
                            <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{isEditing ? 'Cancel' : 'Edit Date'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectFixture(fix)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold inline-flex items-center gap-1 text-xs whitespace-nowrap"
                          >
                            <PlayCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Scorecard</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDialog({
                                title: `Delete Fixture?`,
                                message: `Are you sure you want to delete "${home.name} vs ${away.name}" (${formatMatchDate(fix.matchDate)})? Any recorded scores for this match will be permanently removed.`,
                                confirmLabel: 'Delete Fixture',
                                variant: 'danger',
                                onConfirm: () => deleteFixture(fix.id),
                              })
                            }
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 shrink-0"
                            title="Delete Fixture"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {isEditing && fixtureDraft && (
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2.5">
                          <div className="text-xs font-bold text-emerald-400">
                            Edit Fixture Date &amp; Teams
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[11px] text-slate-400 mb-1">
                                Match Format
                              </label>
                              <select
                                value={fixtureDraft.matchType}
                                onChange={(e) =>
                                  setFixtureDraft({
                                    ...fixtureDraft,
                                    matchType: e.target.value as MatchType,
                                  })
                                }
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                              >
                                <option value="league">League Match (15 frames)</option>
                                <option value="knockout">Knockout</option>
                              </select>
                            </div>
                            {fixtureDraft.matchType === 'knockout' && (
                              <>
                                <div>
                                  <label className="block text-[11px] text-slate-400 mb-1">
                                    Knockout Format Rule
                                  </label>
                                  <select
                                    value={fixtureDraft.knockoutFormat || 'first_to_8'}
                                    onChange={(e) =>
                                      setFixtureDraft({
                                        ...fixtureDraft,
                                        knockoutFormat: e.target.value as KnockoutFormat,
                                      })
                                    }
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                                  >
                                    <option value="first_to_8">
                                      First to 8 frames (Standard Knockout)
                                    </option>
                                    <option value="play_all_15">
                                      Play all 15 frames (2-Leg Tie / Aggregate)
                                    </option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[11px] text-slate-400 mb-1">
                                    Event / Competition Name
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Division 1 Cup, Summer Cup"
                                    value={fixtureDraft.cupName || ''}
                                    onChange={(e) =>
                                      setFixtureDraft({
                                        ...fixtureDraft,
                                        cupName: e.target.value,
                                      })
                                    }
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] text-slate-400 mb-1">
                                    Knockout Round
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Quarter-Final, Semi-Final, Final"
                                    value={fixtureDraft.cupRound || ''}
                                    onChange={(e) =>
                                      setFixtureDraft({
                                        ...fixtureDraft,
                                        cupRound: e.target.value,
                                      })
                                    }
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                                  />
                                </div>
                              </>
                            )}
                            <div className="min-w-0">
                              <label className="block text-[11px] text-slate-400 mb-1">
                                Match Date
                              </label>
                              <div className="relative">
                                <input
                                  type="date"
                                  value={fixtureDraft.matchDate}
                                  onChange={(e) =>
                                    setFixtureDraft({
                                      ...fixtureDraft,
                                      matchDate: e.target.value,
                                    })
                                  }
                                  onClick={(e) => {
                                    try {
                                      e.currentTarget.showPicker?.();
                                    } catch {}
                                  }}
                                  className="w-full bg-slate-950 border border-slate-700 hover:border-slate-600 focus:border-emerald-500 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white [color-scheme:dark] cursor-pointer transition shadow-sm"
                                />
                                <Calendar className="w-3.5 h-3.5 text-emerald-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                              </div>
                              {fixtureDraft.matchDate && (
                                <div className="text-[10px] text-emerald-400 font-medium mt-1 truncate">
                                  {formatMatchDate(fixtureDraft.matchDate)}
                                </div>
                              )}
                            </div>
                            {fixtureDraft.matchType !== 'knockout' && (
                              <div>
                                <label className="block text-[11px] text-slate-400 mb-1">
                                  Division
                                </label>
                                <select
                                  value={fixtureDraft.division}
                                  onChange={(e) =>
                                    setFixtureDraft({
                                      ...fixtureDraft,
                                      division: e.target.value as Division,
                                    })
                                  }
                                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                                >
                                  {divisions.map((div) => (
                                    <option key={div} value={div}>
                                      {div}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                            <div className="sm:col-span-1">
                              <label className="block text-[11px] text-slate-400 mb-1">
                                Home Team
                              </label>
                              <select
                                value={fixtureDraft.homeTeamId}
                                onChange={(e) =>
                                  setFixtureDraft({
                                    ...fixtureDraft,
                                    homeTeamId: e.target.value,
                                  })
                                }
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                              >
                                {fixtureDraft.matchType === 'knockout'
                                  ? divisions.map((div) => {
                                      const dt = teams.filter((t) => t.division === div);
                                      if (dt.length === 0) return null;
                                      return (
                                        <optgroup key={div} label={div}>
                                          {dt.map((t) => (
                                            <option key={t.id} value={t.id}>
                                              {t.name} ({t.division})
                                            </option>
                                          ))}
                                        </optgroup>
                                      );
                                    })
                                  : (divTeams.length > 0 ? divTeams : teams).map(
                                      (t) => (
                                        <option key={t.id} value={t.id}>
                                          {t.name}
                                        </option>
                                      )
                                    )}
                              </select>
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-[11px] text-slate-400 mb-1">
                                Away Team
                              </label>
                              <select
                                value={fixtureDraft.awayTeamId}
                                onChange={(e) =>
                                  setFixtureDraft({
                                    ...fixtureDraft,
                                    awayTeamId: e.target.value,
                                  })
                                }
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                              >
                                {fixtureDraft.matchType === 'knockout'
                                  ? divisions.map((div) => {
                                      const dt = teams.filter(
                                        (t) =>
                                          t.division === div &&
                                          t.id !== fixtureDraft.homeTeamId
                                      );
                                      if (dt.length === 0) return null;
                                      return (
                                        <optgroup key={div} label={div}>
                                          {dt.map((t) => (
                                            <option key={t.id} value={t.id}>
                                              {t.name} ({t.division})
                                            </option>
                                          ))}
                                        </optgroup>
                                      );
                                    })
                                  : (divTeams.length > 0 ? divTeams : teams)
                                      .filter(
                                        (t) => t.id !== fixtureDraft.homeTeamId
                                      )
                                      .map((t) => (
                                        <option key={t.id} value={t.id}>
                                          {t.name}
                                        </option>
                                      ))}
                              </select>
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingFixtureId(null);
                                setFixtureDraft(null);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                            >
                              <X className="w-3.5 h-3.5" />
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveFixtureEdit(fix)}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                            >
                              <Save className="w-3.5 h-3.5" />
                              Save Fixture Changes
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SCORECARD APPROVALS */}
      {activeTab === 'approvals' && (() => {
        const isFixtureOverdue = (f: Fixture) => {
          return (
            f.status === 'scheduled' &&
            getMatchTimeframe(f.matchDate, 'scheduled') === 'past'
          );
        };

        const submittedCount = fixtures.filter(
          (f) => f.status === 'submitted'
        ).length;
        const liveCount = fixtures.filter((f) => f.status === 'live').length;
        const scheduledCount = fixtures.filter(
          (f) => f.status === 'scheduled'
        ).length;
        const overdueCount = fixtures.filter(isFixtureOverdue).length;
        const approvedCount = fixtures.filter(
          (f) => f.status === 'approved'
        ).length;

        const filterTabs: {
          id: 'all' | 'submitted' | 'live' | 'scheduled' | 'overdue' | 'approved';
          label: string;
          count: number;
        }[] = [
          { id: 'all', label: 'All', count: fixtures.length },
          { id: 'submitted', label: 'Awaiting Approval', count: submittedCount },
          { id: 'live', label: 'Live', count: liveCount },
          { id: 'scheduled', label: 'Scheduled', count: scheduledCount },
          { id: 'overdue', label: 'Overdue', count: overdueCount },
          { id: 'approved', label: 'Approved', count: approvedCount },
        ];

        const statusOrder: Record<string, number> = {
          submitted: 0,
          live: 1,
          scheduled: 2,
          approved: 3,
        };

        const filtered = fixtures
          .filter((f) => {
            if (approvalFilter === 'overdue') {
              if (!isFixtureOverdue(f)) return false;
            } else if (approvalFilter !== 'all' && f.status !== approvalFilter) {
              return false;
            }
            if (scorecardSearchQuery.trim()) {
              const q = scorecardSearchQuery.toLowerCase().trim();
              const home = teamsById[f.homeTeamId];
              const away = teamsById[f.awayTeamId];
              const homeName = (home?.name ?? '').toLowerCase();
              const awayName = (away?.name ?? '').toLowerCase();
              const division = (f.division ?? '').toLowerCase();
              const dateStr = `${f.matchDate} ${formatMatchDate(f.matchDate)}`.toLowerCase();
              const statusStr = (f.status ?? '').toLowerCase();
              const knockoutStr = `${isKnockoutFixture(f) ? 'knockout' : ''} ${f.competitionName ?? ''} ${f.cupName ?? ''} ${f.round ?? ''} ${f.cupRound ?? ''}`.toLowerCase();
              const teamPlayers = players.filter(
                (p) => p.teamId === f.homeTeamId || p.teamId === f.awayTeamId
              );
              const playerMatches = teamPlayers.some((p) =>
                p.name.toLowerCase().includes(q)
              );

              const matches =
                homeName.includes(q) ||
                awayName.includes(q) ||
                division.includes(q) ||
                dateStr.includes(q) ||
                statusStr.includes(q) ||
                knockoutStr.includes(q) ||
                playerMatches;

              if (!matches) return false;
            }
            return true;
          })
          .sort((a, b) => {
            if (statusOrder[a.status] !== statusOrder[b.status]) {
              return statusOrder[a.status] - statusOrder[b.status];
            }
            return a.matchDate.localeCompare(b.matchDate);
          });

        return (
          <div className="space-y-3.5 min-w-0">
            {/* Status Filter Buttons (Outside card box) */}
            <div className="w-full overflow-x-auto pb-1">
              <div className="inline-flex items-center gap-1.5 min-w-max">
                {filterTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setApprovalFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                      approvalFilter === tab.id
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        approvalFilter === tab.id
                          ? 'bg-emerald-800 text-emerald-100'
                          : tab.id === 'submitted' && tab.count > 0
                          ? 'bg-amber-500/20 text-amber-300'
                          : tab.id === 'live' && tab.count > 0
                          ? 'bg-red-500/20 text-red-300'
                          : tab.id === 'overdue' && tab.count > 0
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input (Outside card box) */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={scorecardSearchQuery}
                onChange={(e) => setScorecardSearchQuery(e.target.value)}
                placeholder="Search by team, division, status, date or player..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-9 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition shadow-sm"
              />
              {scorecardSearchQuery && (
                <button
                  type="button"
                  onClick={() => setScorecardSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Scorecard Review Queue Container */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Scorecard Review Queue ({filtered.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Review match submissions, inspect scores, and approve official scorecards.
                  </p>
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center text-xs text-slate-400 space-y-1.5">
                  {scorecardSearchQuery.trim() ? (
                    <>
                      <p>
                        No scorecards match &ldquo;<strong>{scorecardSearchQuery}</strong>&rdquo;
                        {approvalFilter !== 'all' && (
                          <span>
                            {' '}with status <strong>{approvalFilter === 'overdue' ? 'Overdue' : approvalFilter === 'submitted' ? 'Awaiting Approval' : approvalFilter}</strong>
                          </span>
                        )}.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setScorecardSearchQuery('');
                          setApprovalFilter('all');
                        }}
                        className="inline-flex items-center gap-1 text-emerald-400 hover:underline font-semibold mt-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Reset search &amp; filters
                      </button>
                    </>
                  ) : (
                    <p>
                      {approvalFilter === 'submitted'
                        ? 'No scorecards currently awaiting approval.'
                        : approvalFilter === 'live'
                        ? 'No matches currently live.'
                        : approvalFilter === 'scheduled'
                        ? 'No upcoming scheduled matches.'
                        : approvalFilter === 'overdue'
                        ? 'No overdue scorecards.'
                        : approvalFilter === 'approved'
                        ? 'No approved scorecards yet.'
                        : `No matches recorded for ${seasonName} yet.`}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filtered.map((fix) => {
                    const home = teamsById[fix.homeTeamId];
                    const away = teamsById[fix.awayTeamId];
                    if (!home || !away) return null;
                    const score = calculateMatchScore(fix);

                    return (
                      <div
                        key={fix.id}
                        className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            {isKnockoutFixture(fix) ? (
                              <span className="text-amber-400 font-bold inline-flex items-center gap-1">
                                <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span>
                                  {fix.competitionName ||
                                    fix.cupName ||
                                    (fix.division
                                      ? `${fix.division} Knockout`
                                      : 'Knockout')}
                                  {fix.round || fix.cupRound
                                    ? ` (${fix.round || fix.cupRound})`
                                    : ''}
                                </span>
                              </span>
                            ) : (
                              <span className="font-bold text-emerald-400">
                                {fix.division}
                              </span>
                            )}
                            <span className="text-slate-500">•</span>
                            <span className="text-slate-400">
                              {formatMatchDate(fix.matchDate)}
                            </span>
                            <span
                              className={`uppercase px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                fix.status === 'approved'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : fix.status === 'submitted'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : fix.status === 'live'
                                  ? 'bg-red-500/20 text-red-300 animate-pulse'
                                  : isFixtureOverdue(fix)
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {fix.status === 'submitted'
                                ? 'Awaiting Approval'
                                : isFixtureOverdue(fix)
                                ? 'Overdue'
                                : fix.status}
                            </span>
                          </div>
                          <div className="font-bold text-white text-sm sm:text-base break-words">
                            {home.name} ({score.homeFrames}) vs ({score.awayFrames}){' '}
                            {away.name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Frames recorded: {score.completedFrames}/15 • Home
                            Signed: {fix.homeCaptainSigned ? 'Yes' : 'No'} • Away
                            Signed: {fix.awayCaptainSigned ? 'Yes' : 'No'}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0 pt-1 sm:pt-0">
                          <button
                            type="button"
                            onClick={() => onSelectFixture(fix)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                          >
                            <PlayCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Scorecard</span>
                          </button>
                          {fix.status !== 'approved' ? (
                            <button
                              type="button"
                              onClick={() => handleApproveFixture(fix)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Approve Result
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => reopenFixture(fix.id)}
                              className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold"
                            >
                              Reopen
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {!isCloudConnected && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 mt-6">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Local Sandbox Mode:</strong> Connected to local browser storage only.
            </span>
          </div>
          <button
            type="button"
            onClick={() =>
              setConfirmDialog({
                title: 'Reset Local Test Data?',
                message:
                  'Reset your local browser storage back to the default 8 test teams, 48 players, and 12 test fixtures? Any local changes you made will be overwritten.',
                confirmLabel: 'Reset Test Data',
                variant: 'warning',
                onConfirm: () => resetLocalTestData(),
              })
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold"
          >
            <RefreshCw className="w-3 h-3" />
            Reset Local Test Data
          </button>
        </div>
      )}

      {/* Custom Confirmation Modal */}
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

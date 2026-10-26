import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Copy,
  Edit3,
  KeyRound,
  RefreshCw,
  Save,
  Settings,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { Division, Fixture, Team } from '../types/league';
import { generateRandomPin, useLeague } from '../context/LeagueContext';
import { calculateMatchScore } from '../utils/leagueEngine';

interface AdminPortalViewProps {
  onSelectFixture: (fixture: Fixture) => void;
}

export const AdminPortalView: React.FC<AdminPortalViewProps> = ({
  onSelectFixture,
}) => {
  const {
    seasonName,
    divisions,
    teams,
    players,
    fixtures,
    adminPin,
    canManageLeague,
    loginAsAdminWithPin,
    updateAdminPin,
    updateTeamPin,
    updateTeam,
    deleteTeam,
    addPlayer,
    removePlayer,
    transferPlayer,
    updateFixtureDetails,
    deleteFixture,
    approveFixture,
    reopenFixture,
    isCloudConnected,
    resetLocalTestData,
  } = useLeague();

  const [activeTab, setActiveTab] = useState<
    'teams' | 'fixtures' | 'approvals' | 'settings'
  >('teams');

  const [unlockPinInput, setUnlockPinInput] = useState('');
  const [unlockError, setUnlockError] = useState('');

  const [copiedTeamId, setCopiedTeamId] = useState<string | null>(null);
  const [newPlayerByTeam, setNewPlayerByTeam] = useState<
    Record<string, string>
  >({});
  const [filterDivision, setFilterDivision] = useState<Division | 'ALL'>('ALL');
  const [fixtureFilterDivision, setFixtureFilterDivision] = useState<
    Division | 'ALL'
  >('ALL');

  // Team inline editing state
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [teamDraft, setTeamDraft] = useState<{
    name: string;
    division: Division;
    venue: string;
    address: string;
    captainName: string;
  } | null>(null);

  // Fixture inline editing state
  const [editingFixtureId, setEditingFixtureId] = useState<string | null>(null);
  const [fixtureDraft, setFixtureDraft] = useState<{
    division: Division;
    matchDate: string;
    weekNumber: number;
    homeTeamId: string;
    awayTeamId: string;
  } | null>(null);

  const [newMasterPin, setNewMasterPin] = useState(adminPin);
  const [pinSavedMsg, setPinSavedMsg] = useState('');

  if (!canManageLeague) {
    return (
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await loginAsAdminWithPin(unlockPinInput);
          if (!ok) setUnlockError('Incorrect League Admin PIN.');
        }}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center max-w-md mx-auto space-y-4"
      >
        <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">
          Enter League Admin PIN
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Enter the Master League Admin PIN to manage teams, players, Team
          Captain PINs, fixtures, and approve scorecards.
        </p>
        <div className="flex items-center gap-2 max-w-xs mx-auto">
          <input
            type="password"
            required
            value={unlockPinInput}
            onChange={(e) => {
              setUnlockPinInput(e.target.value);
              setUnlockError('');
            }}
            placeholder="Admin PIN"
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white text-center"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow"
          >
            Unlock
          </button>
        </div>
        {unlockError && (
          <p className="text-xs text-red-400 font-semibold">{unlockError}</p>
        )}
      </form>
    );
  }

  const handleCopyCaptainInvite = (
    teamId: string,
    name: string,
    pin: string
  ) => {
    const text = `Brighton Pool League (${seasonName}) — ${name} Captain Login PIN: ${pin}`;
    navigator.clipboard?.writeText(text);
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

  const startEditingTeam = (team: Team) => {
    setEditingTeamId(team.id);
    setTeamDraft({
      name: team.name,
      division: team.division,
      venue: team.venue,
      address: team.address || '',
      captainName: team.captainName || '',
    });
  };

  const handleSaveTeamEdit = async (team: Team) => {
    if (!teamDraft || !teamDraft.name.trim() || !teamDraft.venue.trim()) return;
    await updateTeam({
      ...team,
      name: teamDraft.name.trim(),
      division: teamDraft.division,
      venue: teamDraft.venue.trim(),
      address: teamDraft.address.trim(),
      captainName: teamDraft.captainName.trim(),
    });
    setEditingTeamId(null);
    setTeamDraft(null);
  };

  const startEditingFixture = (fix: Fixture) => {
    setEditingFixtureId(fix.id);
    setFixtureDraft({
      division: fix.division,
      matchDate: fix.matchDate,
      weekNumber: fix.weekNumber,
      homeTeamId: fix.homeTeamId,
      awayTeamId: fix.awayTeamId,
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
    await updateFixtureDetails({
      ...fix,
      division: fixtureDraft.division,
      matchDate: fixtureDraft.matchDate,
      weekNumber: Number(fixtureDraft.weekNumber) || 1,
      homeTeamId: fixtureDraft.homeTeamId,
      awayTeamId: fixtureDraft.awayTeamId,
    });
    setEditingFixtureId(null);
    setFixtureDraft(null);
  };

  const handleSaveMasterPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMasterPin.trim()) return;
    await updateAdminPin(newMasterPin.trim());
    setPinSavedMsg('Master League Admin PIN updated!');
    setTimeout(() => setPinSavedMsg(''), 3000);
  };

  const filteredTeams = teams.filter(
    (t) => filterDivision === 'ALL' || t.division === filterDivision
  );
  const filteredFixtures = fixtures.filter(
    (f) =>
      fixtureFilterDivision === 'ALL' || f.division === fixtureFilterDivision
  );
  const teamsById = Object.fromEntries(teams.map((t) => [t.id, t]));

  return (
    <div className="space-y-5">
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('teams')}
            className={`py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'teams'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Teams &amp; PINs ({teams.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fixtures')}
            className={`py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'fixtures'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Fixtures ({fixtures.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('approvals')}
            className={`py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'approvals'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Scorecards
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'settings'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            Settings
          </button>
        </div>
      </div>

      {/* TAB 1: TEAMS, PLAYERS & CAPTAIN PINs */}
      {activeTab === 'teams' && (
        <div className="space-y-3.5">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setFilterDivision('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${
                filterDivision === 'ALL'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 text-slate-400 border border-slate-800'
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
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                {div} ({teams.filter((t) => t.division === div).length})
              </button>
            ))}
          </div>

          {filteredTeams.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-sm text-slate-400">
              No teams found for <strong>{seasonName}</strong>.
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
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                          {team.division}
                        </span>
                        <h3 className="text-base font-bold text-white">
                          {team.name}
                        </h3>
                        <p className="text-xs text-slate-400">
                          Venue: {team.venue}
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

                      <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[11px] text-slate-400">
                          PIN:
                        </span>
                        <input
                          type="text"
                          value={team.captainPin}
                          onChange={(e) =>
                            updateTeamPin(team.id, e.target.value)
                          }
                          className="w-24 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-amber-300 text-center"
                          title="Edit Captain PIN directly"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateTeamPin(team.id, generateRandomPin())
                          }
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                          title="Generate new random 8-digit PIN"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyCaptainInvite(
                              team.id,
                              team.name,
                              team.captainPin
                            )
                          }
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-[11px] font-semibold"
                          title="Copy PIN message for WhatsApp"
                        >
                          <Copy className="w-3 h-3" />
                          {copiedTeamId === team.id ? 'Copied!' : 'Copy'}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            isEditing
                              ? setEditingTeamId(null)
                              : startEditingTeam(team)
                          }
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold"
                          title="Edit Team Name, Venue & Details"
                        >
                          <Edit3 className="w-3 h-3" />
                          {isEditing ? 'Cancel' : 'Edit'}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTeam(team.id)}
                          className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400"
                          title="Delete Team"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
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
                        {squad.map((player) => (
                          <div
                            key={player.id}
                            className="inline-flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200"
                          >
                            <span>{player.name}</span>
                            {teams.length > 1 && (
                              <select
                                value={player.teamId}
                                onChange={(e) =>
                                  transferPlayer(player.id, e.target.value)
                                }
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
                              onClick={() => removePlayer(player.id)}
                              className="text-slate-500 hover:text-red-400 font-bold"
                              title="Remove player"
                            >
                              ×
                            </button>
                          </div>
                        ))}
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
        <div className="space-y-3.5">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setFixtureFilterDivision('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${
                fixtureFilterDivision === 'ALL'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 text-slate-400 border border-slate-800'
              }`}
            >
              All ({fixtures.length})
            </button>
            {divisions.map((div) => (
              <button
                key={div}
                type="button"
                onClick={() => setFixtureFilterDivision(div)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${
                  fixtureFilterDivision === div
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                {div} ({fixtures.filter((f) => f.division === div).length})
              </button>
            ))}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-white">
              {seasonName} Fixtures ({filteredFixtures.length})
            </h3>
            {filteredFixtures.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No fixtures found for {seasonName}.
              </p>
            ) : (
              <div className="space-y-2.5">
                {filteredFixtures.map((fix) => {
                  const home = teamsById[fix.homeTeamId];
                  const away = teamsById[fix.awayTeamId];
                  if (!home || !away) return null;
                  const score = calculateMatchScore(fix);
                  const isEditing =
                    editingFixtureId === fix.id && fixtureDraft !== null;
                  const divTeams = teams.filter(
                    (t) =>
                      t.division === (fixtureDraft?.division ?? fix.division)
                  );

                  return (
                    <div
                      key={fix.id}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-3 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-emerald-400 font-bold">
                            {fix.division}
                          </span>{' '}
                          • Wk {fix.weekNumber} ({fix.matchDate})
                          <div className="font-bold text-white text-sm mt-0.5">
                            {home.name} {score.homeFrames} – {score.awayFrames}{' '}
                            {away.name}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              isEditing
                                ? setEditingFixtureId(null)
                                : startEditingFixture(fix)
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold inline-flex items-center gap-1"
                          >
                            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                            {isEditing ? 'Cancel' : 'Edit Date / Details'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectFixture(fix)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold inline-flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Edit Card
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteFixture(fix.id)}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"
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
                                Match Date
                              </label>
                              <input
                                type="date"
                                value={fixtureDraft.matchDate}
                                onChange={(e) =>
                                  setFixtureDraft({
                                    ...fixtureDraft,
                                    matchDate: e.target.value,
                                  })
                                }
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] text-slate-400 mb-1">
                                Week #
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={50}
                                value={fixtureDraft.weekNumber}
                                onChange={(e) =>
                                  setFixtureDraft({
                                    ...fixtureDraft,
                                    weekNumber: Number(e.target.value) || 1,
                                  })
                                }
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                              />
                            </div>
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
                                {(divTeams.length > 0 ? divTeams : teams).map(
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
                                {(divTeams.length > 0 ? divTeams : teams)
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
      {activeTab === 'approvals' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <h2 className="text-base font-bold text-white">
            Scorecard Review &amp; Official Approval Queue ({seasonName})
          </h2>
          {fixtures.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              No matches recorded for {seasonName} yet.
            </p>
          ) : (
            <div className="space-y-2.5">
              {fixtures.map((fix) => {
                const home = teamsById[fix.homeTeamId];
                const away = teamsById[fix.awayTeamId];
                if (!home || !away) return null;
                const score = calculateMatchScore(fix);

                return (
                  <div
                    key={fix.id}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-emerald-400">
                          {fix.division}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400">{fix.matchDate}</span>
                        <span
                          className={`uppercase px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            fix.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : fix.status === 'submitted'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {fix.status}
                        </span>
                      </div>
                      <div className="font-bold text-white text-sm sm:text-base mt-1">
                        {home.name} ({score.homeFrames}) vs ({score.awayFrames}){' '}
                        {away.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Frames recorded: {score.completedFrames}/15 • Home
                        Signed: {fix.homeCaptainSigned ? 'Yes' : 'No'} • Away
                        Signed: {fix.awayCaptainSigned ? 'Yes' : 'No'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectFixture(fix)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                      >
                        Inspect / Edit Card
                      </button>
                      {fix.status !== 'approved' ? (
                        <button
                          type="button"
                          onClick={() => approveFixture(fix.id)}
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
      )}

      {/* TAB 4: SETTINGS (MASTER ADMIN PIN & SECURITY) */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 h-fit">
            <form onSubmit={handleSaveMasterPin} className="space-y-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                Master League Admin PIN
              </h2>
              <p className="text-xs text-slate-400">
                This PIN unlocks the League Admin portal. Team Captain PINs are
                managed directly on each team card in the{' '}
                <strong>Teams &amp; PINs</strong> tab.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  value={newMasterPin}
                  onChange={(e) => setNewMasterPin(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-300"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                >
                  Update Admin PIN
                </button>
              </div>
              {pinSavedMsg && (
                <p className="text-xs text-emerald-400 font-semibold">
                  {pinSavedMsg}
                </p>
              )}
            </form>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 h-fit">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              All Team Captain PINs ({seasonName})
            </h2>
            {teams.length === 0 ? (
              <p className="text-xs text-slate-500 italic">
                No teams added yet.
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                {teams.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs"
                  >
                    <span className="font-semibold text-white">
                      {t.name}{' '}
                      <span className="text-slate-500">({t.division})</span>
                    </span>
                    <span className="font-mono font-bold text-amber-300">
                      PIN: {t.captainPin}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!isCloudConnected && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 h-fit md:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-emerald-400" />
                    Local Sandbox Test Data
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Reset local browser storage back to the default 8 test teams,
                    48 players, and 12 test fixtures across Division 1 &amp;
                    Division 2.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        'Reset local test data back to default teams, players, and fixtures?'
                      )
                    ) {
                      resetLocalTestData();
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset Local Test Data
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

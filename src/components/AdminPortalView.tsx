import React, { useEffect, useState } from 'react';
import {
  CalendarPlus,
  CheckCircle2,
  Copy,
  Edit3,
  FolderPlus,
  KeyRound,
  Layers,
  Plus,
  RefreshCw,
  Settings,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  Wand2,
} from 'lucide-react';
import { Division, Fixture } from '../types/league';
import { generateRandomPin, useLeague } from '../context/LeagueContext';
import { calculateMatchScore } from '../utils/leagueEngine';

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
    setSelectedSeasonId,
    createNewSeason,
    addDivision,
    removeDivision,
    teams,
    players,
    fixtures,
    adminPin,
    canManageLeague,
    loginAsAdminWithPin,
    updateAdminPin,
    updateTeamPin,
    addTeam,
    deleteTeam,
    addPlayer,
    removePlayer,
    transferPlayer,
    addFixture,
    generateDivisionFixtures,
    deleteFixture,
    approveFixture,
    reopenFixture,
    isCloudConnected,
    resetLocalTestData,
  } = useLeague();

  const [activeTab, setActiveTab] = useState<
    'teams' | 'fixtures' | 'approvals' | 'seasons' | 'settings'
  >('teams');

  const [unlockPinInput, setUnlockPinInput] = useState('');
  const [unlockError, setUnlockError] = useState('');

  const [teamDivision, setTeamDivision] = useState<Division>(
    divisions[0] || 'Premier League'
  );
  const [teamName, setTeamName] = useState('');
  const [teamVenue, setTeamVenue] = useState('');
  const [teamAddress, setTeamAddress] = useState('');
  const [captainName, setCaptainName] = useState('');
  const [captainPin, setCaptainPin] = useState('');
  const [initialPlayersInput, setInitialPlayersInput] = useState('');
  const [copiedTeamId, setCopiedTeamId] = useState<string | null>(null);

  const [newPlayerByTeam, setNewPlayerByTeam] = useState<
    Record<string, string>
  >({});
  const [filterDivision, setFilterDivision] = useState<Division | 'ALL'>('ALL');

  const [fixDivision, setFixDivision] = useState<Division>(
    divisions[0] || 'Premier League'
  );
  const [fixDate, setFixDate] = useState('2026-11-02');
  const [fixWeek, setFixWeek] = useState(1);
  const [fixHomeId, setFixHomeId] = useState('');
  const [fixAwayId, setFixAwayId] = useState('');
  const [genStartDate, setGenStartDate] = useState('2026-11-02');
  const [genMessage, setGenMessage] = useState('');

  const [newSeasonName, setNewSeasonName] = useState('');
  const [newSeasonDivisionsInput, setNewSeasonDivisionsInput] = useState(
    divisions.join(', ')
  );
  const [copyTeamsToNewSeason, setCopyTeamsToNewSeason] = useState(false);
  const [seasonCreatedMsg, setSeasonCreatedMsg] = useState('');

  const [newDivisionInput, setNewDivisionInput] = useState('');
  const [divisionError, setDivisionError] = useState('');

  const [newMasterPin, setNewMasterPin] = useState(adminPin);
  const [pinSavedMsg, setPinSavedMsg] = useState('');

  useEffect(() => {
    if (divisions.length > 0) {
      if (!divisions.includes(teamDivision)) {
        setTeamDivision(divisions[0]);
      }
      if (!divisions.includes(fixDivision)) {
        setFixDivision(divisions[0]);
      }
    }
  }, [divisions, teamDivision, fixDivision]);

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
          Enter the Master League Admin PIN to manage seasons, divisions, teams,
          players, Team Captain PINs, and approve scorecards.
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

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !teamVenue.trim()) return;
    const created = await addTeam({
      division: teamDivision,
      name: teamName.trim(),
      venue: teamVenue.trim(),
      address: teamAddress.trim(),
      captainName: captainName.trim(),
      captainPin: captainPin.trim() || generateRandomPin(),
    });

    const names = initialPlayersInput
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const pName of names) {
      await addPlayer(created.id, pName);
    }

    setTeamName('');
    setTeamVenue('');
    setTeamAddress('');
    setCaptainName('');
    setCaptainPin('');
    setInitialPlayersInput('');
  };

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

  const handleCreateFixture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fixHomeId || !fixAwayId || fixHomeId === fixAwayId) return;
    await addFixture({
      division: fixDivision,
      matchDate: fixDate,
      weekNumber: Number(fixWeek) || 1,
      homeTeamId: fixHomeId,
      awayTeamId: fixAwayId,
    });
    setFixHomeId('');
    setFixAwayId('');
  };

  const handleAutoGenerate = async (division: Division) => {
    const count = await generateDivisionFixtures(division, genStartDate);
    if (count === 0) {
      setGenMessage(
        `Add at least 2 teams to ${division} first before generating fixtures.`
      );
    } else {
      setGenMessage(
        `Generated ${count} fixtures (Home & Away round-robin) for ${division}!`
      );
    }
  };

  const handleCreateSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeasonName.trim()) return;
    const parsedDivs = newSeasonDivisionsInput
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean);
    const created = await createNewSeason(
      newSeasonName.trim(),
      copyTeamsToNewSeason,
      parsedDivs.length > 0 ? parsedDivs : divisions
    );
    setNewSeasonName('');
    setSeasonCreatedMsg(
      `Created & switched to season "${created.name}"!`
    );
    setTimeout(() => setSeasonCreatedMsg(''), 4000);
  };

  const handleAddDivision = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newDivisionInput.trim();
    if (!clean) return;
    if (divisions.includes(clean)) {
      setDivisionError(`"${clean}" already exists in ${seasonName}.`);
      return;
    }
    setDivisionError('');
    await addDivision(clean);
    setNewDivisionInput('');
  };

  const handleRemoveDivision = async (div: Division) => {
    const teamsInDiv = teams.filter((t) => t.division === div).length;
    if (teamsInDiv > 0) {
      setDivisionError(
        `Cannot remove "${div}" while ${teamsInDiv} team(s) are assigned to it.`
      );
      return;
    }
    if (divisions.length <= 1) {
      setDivisionError('A season must have at least 1 division.');
      return;
    }
    setDivisionError('');
    await removeDivision(div);
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
  const divisionTeamsForFixture = teams.filter(
    (t) => t.division === fixDivision
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
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
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
            <CalendarPlus className="w-3.5 h-3.5" />
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
            onClick={() => setActiveTab('seasons')}
            className={`py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'seasons'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Seasons &amp; Divisions
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 col-span-2 sm:col-span-1 ${
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <form
            onSubmit={handleCreateTeam}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 h-fit"
          >
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              Add New Team ({seasonName})
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Division
              </label>
              <select
                value={teamDivision}
                onChange={(e) => setTeamDivision(e.target.value as Division)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white"
              >
                {divisions.map((div) => (
                  <option key={div} value={div}>
                    {div}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Team Name *
              </label>
              <input
                type="text"
                required
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. Wilmy Lions"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Team Venue *
              </label>
              <input
                type="text"
                required
                value={teamVenue}
                onChange={(e) => setTeamVenue(e.target.value)}
                placeholder="e.g. Castle Club (Table R1)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Captain Name
                </label>
                <input
                  type="text"
                  value={captainName}
                  onChange={(e) => setCaptainName(e.target.value)}
                  placeholder="Lewes Pollington"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Captain PIN (auto 8-digit if blank)
                </label>
                <input
                  type="text"
                  value={captainPin}
                  onChange={(e) => setCaptainPin(e.target.value)}
                  placeholder="e.g. 48219304"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Initial Signed-On Players (comma or line separated)
              </label>
              <textarea
                rows={3}
                value={initialPlayersInput}
                onChange={(e) => setInitialPlayersInput(e.target.value)}
                placeholder="Harry Craker, Bayley Pollington, Lewes Pollington, Ellis Clarke, JJ Minty"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow"
            >
              Create Team &amp; Generate Captain PIN
            </button>
          </form>

          <div className="lg:col-span-2 space-y-3.5">
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
                No teams added for <strong>{seasonName}</strong> yet. Use the
                form on the left to add teams and generate their Captain PINs.
              </div>
            ) : (
              filteredTeams.map((team) => {
                const squad = players.filter((p) => p.teamId === team.id);
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
                      </div>

                      <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[11px] text-slate-400">
                          Captain PIN:
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
                          onClick={() => deleteTeam(team.id)}
                          className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 ml-1"
                          title="Delete Team"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

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
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: FIXTURES MANAGER */}
      {activeTab === 'fixtures' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="space-y-4">
            <form
              onSubmit={handleCreateFixture}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5"
            >
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CalendarPlus className="w-4 h-4 text-emerald-400" />
                Add Single Fixture
              </h2>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Division
                </label>
                <select
                  value={fixDivision}
                  onChange={(e) => {
                    setFixDivision(e.target.value as Division);
                    setFixHomeId('');
                    setFixAwayId('');
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {divisions.map((div) => (
                    <option key={div} value={div}>
                      {div}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Match Date
                  </label>
                  <input
                    type="date"
                    value={fixDate}
                    onChange={(e) => setFixDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Week #
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={40}
                    value={fixWeek}
                    onChange={(e) => setFixWeek(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Home Team
                </label>
                <select
                  required
                  value={fixHomeId}
                  onChange={(e) => setFixHomeId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="">-- Select Home Team --</option>
                  {divisionTeamsForFixture.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Away Team
                </label>
                <select
                  required
                  value={fixAwayId}
                  onChange={(e) => setFixAwayId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="">-- Select Away Team --</option>
                  {divisionTeamsForFixture
                    .filter((t) => t.id !== fixHomeId)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow"
              >
                Create Fixture
              </button>
            </form>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-amber-400" />
                Auto-Generate Season Schedule
              </h3>
              <p className="text-xs text-slate-400">
                Automatically generates a full Home &amp; Away round-robin
                schedule (weekly dates) for all teams in a division.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Week 1 Start Date
                </label>
                <input
                  type="date"
                  value={genStartDate}
                  onChange={(e) => setGenStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {divisions.map((div) => (
                  <button
                    key={div}
                    type="button"
                    onClick={() => handleAutoGenerate(div)}
                    className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold"
                  >
                    Generate {div}
                  </button>
                ))}
              </div>
              {genMessage && (
                <p className="text-xs text-emerald-400 font-medium">
                  {genMessage}
                </p>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-white">
              {seasonName} Fixtures ({fixtures.length})
            </h3>
            {fixtures.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No fixtures created for {seasonName} yet.
              </p>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {fixtures.map((fix) => {
                  const home = teamsById[fix.homeTeamId];
                  const away = teamsById[fix.awayTeamId];
                  if (!home || !away) return null;
                  const score = calculateMatchScore(fix);

                  return (
                    <div
                      key={fix.id}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2 text-xs"
                    >
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
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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

      {/* TAB 4: SEASONS & DIVISIONS */}
      {activeTab === 'seasons' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Manage Seasons Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 h-fit">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-emerald-400" />
                Manage Seasons
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Switch between seasons or create a new season (e.g. Summer
                2027) below.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Existing Seasons:
              </label>
              <div className="flex flex-wrap gap-2">
                {seasons.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSeasonId(s.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                      s.id === seasonId
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {s.name} {s.id === seasonId ? '(Selected)' : ''}
                  </button>
                ))}
              </div>
            </div>

            <form
              onSubmit={handleCreateSeason}
              className="pt-3 border-t border-slate-800 space-y-3"
            >
              <label className="block text-xs font-semibold text-slate-300">
                Create a New Season (e.g. Summer 2027)
              </label>
              <input
                type="text"
                required
                value={newSeasonName}
                onChange={(e) => setNewSeasonName(e.target.value)}
                placeholder="e.g. Summer 2027"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Divisions for New Season (comma-separated)
                </label>
                <input
                  type="text"
                  value={newSeasonDivisionsInput}
                  onChange={(e) => setNewSeasonDivisionsInput(e.target.value)}
                  placeholder="Premier League, Division 1, Division 2, Division 3"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={copyTeamsToNewSeason}
                  onChange={(e) => setCopyTeamsToNewSeason(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
                />
                Copy all teams, players &amp; Captain PINs from {seasonName}{' '}
                into the new season
              </label>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow"
              >
                Create New Season
              </button>
              {seasonCreatedMsg && (
                <p className="text-xs text-emerald-400 font-semibold">
                  {seasonCreatedMsg}
                </p>
              )}
            </form>
          </div>

          {/* Manage Divisions for Current Season Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 h-fit">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                Divisions in {seasonName} ({divisions.length})
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Add or remove divisions for <strong>{seasonName}</strong>.
                Each season can have its own custom set of divisions.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {divisions.map((div) => {
                const count = teams.filter((t) => t.division === div).length;
                return (
                  <div
                    key={div}
                    className="inline-flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                  >
                    <span className="font-bold">{div}</span>
                    <span className="text-[10px] text-slate-400">
                      ({count} teams)
                    </span>
                    {divisions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDivision(div)}
                        className="text-slate-500 hover:text-red-400 font-bold ml-1"
                        title="Remove division"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleAddDivision} className="flex gap-2">
              <input
                type="text"
                value={newDivisionInput}
                onChange={(e) => {
                  setNewDivisionInput(e.target.value);
                  setDivisionError('');
                }}
                placeholder="e.g. Division 4 or Summer Group A"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Division
              </button>
            </form>

            {divisionError && (
              <p className="text-xs text-red-400 font-medium">
                {divisionError}
              </p>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: SETTINGS (MASTER ADMIN PIN & SECURITY) */}
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

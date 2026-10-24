import React, { useState } from 'react';
import { Eye, KeyRound, Shield, UserCheck, X } from 'lucide-react';
import { useLeague } from '../context/LeagueContext';

interface RoleSwitcherModalProps {
  onClose: () => void;
}

export const RoleSwitcherModal: React.FC<RoleSwitcherModalProps> = ({
  onClose,
}) => {
  const {
    teams,
    session,
    setRoleSession,
    loginAsCaptainWithPin,
    loginAsAdminWithPin,
  } = useLeague();

  const [selectedTeamId, setSelectedTeamId] = useState<string>(
    session.teamId || teams[0]?.id || ''
  );
  const [captainPinInput, setCaptainPinInput] = useState('');
  const [captainError, setCaptainError] = useState('');

  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminError, setAdminError] = useState('');

  const handleCaptainLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) return;
    const ok = loginAsCaptainWithPin(selectedTeamId, captainPinInput);
    if (ok) {
      setCaptainError('');
      onClose();
    } else {
      setCaptainError('Incorrect Team Captain PIN. Check with League Admin.');
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = loginAsAdminWithPin(adminPinInput);
    if (ok) {
      setAdminError('');
      onClose();
    } else {
      setAdminError('Incorrect League Admin PIN.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              PIN Authentication
            </span>
            <h3 className="text-lg font-black text-white">
              Sign In / Switch Role
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {/* 1. General Read-Only User */}
          <button
            type="button"
            onClick={() => {
              setRoleSession('viewer');
              onClose();
            }}
            className={`w-full p-3.5 rounded-xl border text-left transition flex items-start gap-3 ${
              session.role === 'viewer'
                ? 'bg-emerald-600/15 border-emerald-500 text-white'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <Eye className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm text-white">
                General Read-Only Spectator
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                No PIN required. View live scores, fixtures, league tables, and
                player stats.
              </p>
            </div>
          </button>

          {/* 2. Team Captain Login with PIN */}
          <form
            onSubmit={handleCaptainLogin}
            className={`p-3.5 rounded-xl border transition space-y-2.5 ${
              session.role === 'captain'
                ? 'bg-emerald-600/15 border-emerald-500 text-white'
                : 'bg-slate-950 border-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <UserCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold text-sm text-white">
                  Team Captain Login
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select your team and enter your 4-digit Team PIN to fill in
                  your live match score sheet.
                </p>
              </div>
            </div>

            {teams.length > 0 ? (
              <div className="space-y-2 pt-1">
                <select
                  value={selectedTeamId}
                  onChange={(e) => {
                    setSelectedTeamId(e.target.value);
                    setCaptainError('');
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white"
                >
                  <option value="">-- Choose Your Team --</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.division})
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <KeyRound className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      inputMode="numeric"
                      required
                      value={captainPinInput}
                      onChange={(e) => {
                        setCaptainPinInput(e.target.value);
                        setCaptainError('');
                      }}
                      placeholder="Team PIN"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!selectedTeamId}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold disabled:opacity-50"
                  >
                    Unlock Team
                  </button>
                </div>
                {captainError && (
                  <p className="text-[11px] text-red-400 font-medium">
                    {captainError}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
                No teams added yet—log in as League Admin below to add teams and
                generate Team PINs.
              </p>
            )}
          </form>

          {/* 3. League Admin Login with Master PIN */}
          <form
            onSubmit={handleAdminLogin}
            className={`p-3.5 rounded-xl border transition space-y-2.5 ${
              session.role === 'admin'
                ? 'bg-emerald-600/15 border-emerald-500 text-white'
                : 'bg-slate-950 border-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold text-sm text-white">
                  League Admin Login
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Manage seasons, teams, players, Team Captain PINs, and approve
                  scorecards. (Default PIN: <code>2026</code>)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <div className="relative flex-1">
                <KeyRound className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={adminPinInput}
                  onChange={(e) => {
                    setAdminPinInput(e.target.value);
                    setAdminError('');
                  }}
                  placeholder="Enter Admin PIN (default: 2026)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
              >
                Admin Sign In
              </button>
            </div>
            {adminError && (
              <p className="text-[11px] text-red-400 font-medium">
                {adminError}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

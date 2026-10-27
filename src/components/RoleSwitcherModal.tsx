import React, { useState } from 'react';
import { KeyRound, LogOut, Shield, ShieldCheck, UserCheck, X } from 'lucide-react';
import { useLeague } from '../context/LeagueContext';

interface RoleSwitcherModalProps {
  onClose: () => void;
  onAdminLoginSuccess?: () => void;
}

export const RoleSwitcherModal: React.FC<RoleSwitcherModalProps> = ({
  onClose,
  onAdminLoginSuccess,
}) => {
  const {
    teams,
    session,
    setRoleSession,
    loginAsCaptainWithPin,
    loginAsAdminWithPin,
  } = useLeague();

  const [loginTab, setLoginTab] = useState<'captain' | 'admin'>(
    session.role === 'admin' ? 'admin' : 'captain'
  );

  const [selectedTeamId, setSelectedTeamId] = useState<string>(
    session.teamId || teams[0]?.id || ''
  );
  const [captainPinInput, setCaptainPinInput] = useState('');
  const [captainError, setCaptainError] = useState('');

  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminError, setAdminError] = useState('');

  const isLoggedIn = session.role === 'captain' || session.role === 'admin';

  const handleCaptainLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) return;
    const res = await loginAsCaptainWithPin(selectedTeamId, captainPinInput);
    if (res.success) {
      setCaptainError('');
      onClose();
    } else {
      setCaptainError(
        res.error || 'Incorrect Team Captain PIN. Check with League Admin.'
      );
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await loginAsAdminWithPin(adminPinInput);
    if (res.success) {
      setAdminError('');
      onAdminLoginSuccess?.();
      onClose();
    } else {
      setAdminError(res.error || 'Incorrect League Admin PIN.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-white">Login</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isLoggedIn && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2">
            <div className="text-xs">
              <span className="text-slate-400">Signed in as: </span>
              <strong className="text-white">{session.name}</strong>
            </div>
            <button
              type="button"
              onClick={() => {
                setRoleSession('viewer');
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-bold transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Log Out
            </button>
          </div>
        )}

        {/* 2-Tab Switcher: Team Captain | League Admin */}
        <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setLoginTab('captain')}
            className={`inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition ${
              loginTab === 'captain'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Team Captain
          </button>
          <button
            type="button"
            onClick={() => setLoginTab('admin')}
            className={`inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition ${
              loginTab === 'admin'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            League Admin
          </button>
        </div>

        {loginTab === 'captain' ? (
          <form
            onSubmit={handleCaptainLogin}
            className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3"
          >
            <p className="text-xs text-slate-400">
              Select your team and enter your 8-digit Team PIN to fill in your
              live match score card.
            </p>

            {teams.length > 0 ? (
              <div className="space-y-2.5">
                <select
                  value={selectedTeamId}
                  onChange={(e) => {
                    setSelectedTeamId(e.target.value);
                    setCaptainError('');
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
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
                      placeholder="8-digit Team PIN"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-2.5 py-2 text-xs text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!selectedTeamId}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50"
                  >
                    Log In
                  </button>
                </div>
                {captainError && (
                  <p className="text-[11px] text-red-400 font-medium">
                    {captainError}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5">
                No teams registered for this season yet.
              </p>
            )}
          </form>
        ) : session.role === 'admin' ? (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/40">
              <ShieldCheck className="w-4 h-4" /> You are logged in as League Admin
            </div>
            <p className="text-xs text-slate-400">
              You have full administrative privileges to manage teams, players, fixtures, and scorecards.
            </p>
            <button
              type="button"
              onClick={() => {
                onAdminLoginSuccess?.();
                onClose();
              }}
              className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow"
            >
              Go to League Admin Control Panel
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleAdminLogin}
            className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3"
          >
            <p className="text-xs text-slate-400">
              Enter the Master League Admin PIN to manage teams, players, Team
              Captain PINs, fixtures, and approve scorecards.
            </p>

            <div className="flex items-center gap-2">
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
                  placeholder="Enter Admin PIN"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-2.5 py-2 text-xs text-white"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
              >
                Log In
              </button>
            </div>
            {adminError && (
              <p className="text-[11px] text-red-400 font-medium">
                {adminError}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

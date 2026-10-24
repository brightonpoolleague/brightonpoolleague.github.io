import React, { useState } from 'react';
import { Eye, Shield, UserCheck, X } from 'lucide-react';
import { useLeague } from '../context/LeagueContext';

interface RoleSwitcherModalProps {
  onClose: () => void;
}

export const RoleSwitcherModal: React.FC<RoleSwitcherModalProps> = ({
  onClose,
}) => {
  const { teams, session, setRoleSession } = useLeague();
  const [selectedTeamId, setSelectedTeamId] = useState<string>(
    session.teamId || teams[0]?.id || ''
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Access &amp; Permissions
            </span>
            <h3 className="text-lg font-black text-white">Select User Role</h3>
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
                General Read-Only User
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                View live match scores, fixtures, league tables, and player
                averages/dish stats.
              </p>
            </div>
          </button>

          {/* 2. Team Captain / Admin */}
          <div
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
                  Team Captain / Team Admin
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Can only fill in the live score sheet and lineups for their
                  own team&apos;s fixtures.
                </p>
              </div>
            </div>

            {teams.length > 0 ? (
              <div className="flex items-center gap-2 pt-1">
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="">-- Choose Your Team --</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.division})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!selectedTeamId}
                  onClick={() => {
                    if (!selectedTeamId) return;
                    setRoleSession('captain', selectedTeamId);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold disabled:opacity-50"
                >
                  Sign In as Captain
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
                No teams added yet—switch to League Admin first to add teams.
              </p>
            )}
          </div>

          {/* 3. League Admin */}
          <button
            type="button"
            onClick={() => {
              setRoleSession('admin');
              onClose();
            }}
            className={`w-full p-3.5 rounded-xl border text-left transition flex items-start gap-3 ${
              session.role === 'admin'
                ? 'bg-emerald-600/15 border-emerald-500 text-white'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm text-white">League Admin</div>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage teams &amp; signed-on players, approve result cards, and
                manage all matches across all divisions.
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

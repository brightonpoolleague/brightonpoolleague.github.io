import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  KeyRound,
  Search,
  Shield,
  UserCheck,
  X,
} from 'lucide-react';
import { useLeague } from '../context/LeagueContext';
import { PinInput } from './PinInput';

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

  const [loginTab, setLoginTab] = useState<'captain' | 'admin'>('captain');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedTeamId, setSelectedTeamId] = useState<string>(
    session.teamId || ''
  );
  const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const teamDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [captainPinInput, setCaptainPinInput] = useState('');
  const [captainError, setCaptainError] = useState('');

  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminError, setAdminError] = useState('');

  const selectedTeam = useMemo(
    () => teams.find((t) => t.id === selectedTeamId),
    [teams, selectedTeamId]
  );

  const filteredTeams = useMemo(() => {
    if (!teamSearchQuery.trim()) return teams;
    const q = teamSearchQuery.toLowerCase().trim();
    return teams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.division && t.division.toLowerCase().includes(q))
    );
  }, [teams, teamSearchQuery]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.overscrollBehavior = originalOverscroll;
    };
  }, []);

  useEffect(() => {
    if (!isTeamDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        teamDropdownRef.current &&
        !teamDropdownRef.current.contains(e.target as Node)
      ) {
        setIsTeamDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsTeamDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isTeamDropdownOpen]);

  // Focus search input whenever dropdown opens (desktop only to avoid keyboard jump on mobile)
  useEffect(() => {
    if (isTeamDropdownOpen) {
      if (typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    }
  }, [isTeamDropdownOpen]);

  const handleCaptainLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId || isSubmitting) return;
    setIsSubmitting(true);
    const res = await loginAsCaptainWithPin(selectedTeamId, captainPinInput);
    if (res.success) {
      setCaptainError('');
      onClose();
    } else {
      setCaptainError(
        res.error || 'Incorrect Team Captain PIN. Check with League Admin.'
      );
      setIsSubmitting(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    const res = await loginAsAdminWithPin(adminPinInput);
    if (res.success) {
      setAdminError('');
      onAdminLoginSuccess?.();
      onClose();
    } else {
      setAdminError(res.error || 'Incorrect League Admin PIN.');
      setIsSubmitting(false);
    }
  };

  const isPointerDownOnBackdrop = useRef(false);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 touch-manipulation select-none overscroll-none"
      onMouseDown={(e) => {
        isPointerDownOnBackdrop.current = e.target === e.currentTarget;
      }}
      onTouchStart={(e) => {
        isPointerDownOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (isPointerDownOnBackdrop.current && e.target === e.currentTarget) {
          onClose();
        }
        isPointerDownOnBackdrop.current = false;
      }}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl select-text max-h-[90vh] overflow-y-auto overscroll-contain"
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
              live match scorecard.
            </p>

            {teams.length > 0 ? (
              <div className="space-y-2.5">
                {/* Searchable Team Dropdown */}
                <div className="relative" ref={teamDropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTeamDropdownOpen((prev) => !prev);
                      setCaptainError('');
                    }}
                    className={`w-full bg-slate-900 border rounded-lg px-3 py-2 text-xs text-left flex items-center justify-between gap-2 transition ${
                      isTeamDropdownOpen
                        ? 'border-emerald-500 ring-1 ring-emerald-500/30'
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {selectedTeam ? (
                      <span className="flex items-center gap-1.5 truncate">
                        <span className="font-semibold text-white truncate">
                          {selectedTeam.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium border border-slate-700 shrink-0">
                          {selectedTeam.division || 'League'}
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-400">
                        Search or select your team...
                      </span>
                    )}
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                        isTeamDropdownOpen ? 'rotate-180 text-emerald-400' : ''
                      }`}
                    />
                  </button>

                  {isTeamDropdownOpen && (
                    <div className="mt-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-56 animate-in fade-in duration-100">
                      <div className="p-2 border-b border-slate-800 bg-slate-950/80 sticky top-0 z-10">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            ref={searchInputRef}
                            type="text"
                            value={teamSearchQuery}
                            onChange={(e) => setTeamSearchQuery(e.target.value)}
                            placeholder="Search team name or division..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-7 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                          />
                          {teamSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setTeamSearchQuery('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="overflow-y-auto divide-y divide-slate-800/40 p-1">
                        {filteredTeams.length > 0 ? (
                          filteredTeams.map((t) => {
                            const isSelected = t.id === selectedTeamId;
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => {
                                  setSelectedTeamId(t.id);
                                  setCaptainError('');
                                  setIsTeamDropdownOpen(false);
                                  setTeamSearchQuery('');
                                }}
                                className={`w-full px-2.5 py-2 text-left rounded-lg text-xs flex items-center justify-between gap-2 transition ${
                                  isSelected
                                    ? 'bg-emerald-600/20 text-emerald-300 font-semibold'
                                    : 'hover:bg-slate-800 text-slate-200'
                                }`}
                              >
                                <span className="truncate">{t.name}</span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60 font-medium">
                                    {t.division || 'League'}
                                  </span>
                                  {isSelected && (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  )}
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <div className="p-3 text-center text-xs text-slate-400">
                            No teams match &ldquo;{teamSearchQuery}&rdquo;
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <PinInput
                    leftIcon={
                      <KeyRound className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    }
                    inputMode="numeric"
                    required
                    value={captainPinInput}
                    onChange={(e) => {
                      setCaptainPinInput(e.target.value);
                      setCaptainError('');
                    }}
                    placeholder="8-digit Team PIN"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 py-2 text-xs text-white"
                  />
                  <button
                    type="submit"
                    disabled={!selectedTeamId || isSubmitting}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50"
                  >
                    {isSubmitting ? 'Logging In...' : 'Log In'}
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
              <PinInput
                leftIcon={
                  <KeyRound className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                }
                required
                value={adminPinInput}
                onChange={(e) => {
                  setAdminPinInput(e.target.value);
                  setAdminError('');
                }}
                placeholder="Enter Admin PIN"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 py-2 text-xs text-white"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50"
              >
                {isSubmitting ? 'Logging In...' : 'Log In'}
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

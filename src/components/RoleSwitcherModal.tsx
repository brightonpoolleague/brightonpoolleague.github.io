import React, { useEffect, useRef, useState } from 'react';
import {
  KeyRound,
  Shield,
  UserCheck,
  X,
} from 'lucide-react';
import { useLeague } from '../context/LeagueContext';
import { PinInput } from './PinInput';

interface RoleSwitcherModalProps {
  onClose: () => void;
  onCaptainLoginSuccess?: () => void;
  onAdminLoginSuccess?: () => void;
}

export const RoleSwitcherModal: React.FC<RoleSwitcherModalProps> = ({
  onClose,
  onCaptainLoginSuccess,
  onAdminLoginSuccess,
}) => {
  const {
    loginAsCaptainWithPin,
    loginAsAdminWithPin,
  } = useLeague();

  const [loginTab, setLoginTab] = useState<'captain' | 'admin'>('captain');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [captainPinInput, setCaptainPinInput] = useState('');
  const [captainError, setCaptainError] = useState('');

  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminError, setAdminError] = useState('');

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

  const handleCaptainLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captainPinInput.trim() || isSubmitting) return;
    setIsSubmitting(true);
    const res = await loginAsCaptainWithPin(captainPinInput);
    if (res.success) {
      setCaptainError('');
      onCaptainLoginSuccess?.();
      onClose();
    } else {
      setCaptainError(
        res.error || 'Incorrect Team PIN. Check with League Admin.'
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
              Enter your unique 6-digit Team PIN to log in as your team captain and submit your match scorecard.
            </p>

            <div className="space-y-2.5">
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
                  placeholder="Enter 6-digit Team PIN"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 py-2 text-xs font-mono tracking-wider text-white"
                />
                <button
                  type="submit"
                  disabled={!captainPinInput.trim() || isSubmitting}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50 whitespace-nowrap"
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
          </form>
        ) : (
          <form
            onSubmit={handleAdminLogin}
            className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3"
          >
            <p className="text-xs text-slate-400">
              Enter the League Admin PIN to manage teams, players, Team PINs,
              fixtures and approve scorecards.
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
                placeholder="Enter League Admin PIN"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 py-2 text-xs font-mono tracking-wider text-white"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50 whitespace-nowrap"
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

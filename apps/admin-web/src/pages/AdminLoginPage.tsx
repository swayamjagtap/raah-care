import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '@raah/auth';
import { ShieldAlert } from 'lucide-react';

import { UserRole, getRoleDisplayName } from '@raah/shared-types';

const ALLOWED_ADMIN_ROLES: UserRole[] = [UserRole.DISPATCHER, UserRole.SYSTEM_ADMIN];

export const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signInWithPassword, profile, isLoading, error: authContextError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const roleMismatchError =
    profile && !ALLOWED_ADMIN_ROLES.includes(profile.role)
      ? `Your account is registered as ${getRoleDisplayName(profile.role)}. Access to the Control Centre is restricted to Dispatchers and System Administrators.`
      : null;

  useEffect(() => {
    if (isLoading) return;
    if (profile && ALLOWED_ADMIN_ROLES.includes(profile.role)) {
      const intendedPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(intendedPath || '/dashboard', { replace: true });
    }
  }, [isLoading, profile, navigate, location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await signInWithPassword(email, password);
    } catch (err: unknown) {
      const authError = err as { message?: string };
      setErrorMsg(authError.message || 'Failed to sign in. Please verify your administrative credentials.');
      setIsSubmitting(false);
    }
  };

  const displayedError = roleMismatchError || errorMsg || (authContextError?.message ?? null);

  return (
    <div className="flex min-h-[65vh] items-center justify-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
        <div className="flex flex-col items-center mb-6">
          <div className="p-3 bg-amber-50 rounded-full text-amber-600 mb-2">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Sign in to Control Centre</h2>
          <p className="text-xs text-slate-500 mt-1 text-center">
            Emergency Dispatchers and System Administrators terminal.
          </p>
        </div>

        {displayedError && (
          <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-start gap-2">
            <span>{displayedError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Control Centre Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="dispatcher@raah.care"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-hidden"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-amber-600 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Authenticating...' : 'Sign In to Operations Centre'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500 border-t border-slate-100 pt-4">
          <span>Control centre access is restricted to authorized platform personnel.</span>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router';
import { useAuth, AuthState } from '@raah/auth';
import { Lock, AlertCircle, RefreshCw, ArrowRight, UserCheck } from 'lucide-react';
import { UserRole, getRoleDisplayName } from '@raah/shared-types';

const ALLOWED_PATIENT_ROLES: UserRole[] = [UserRole.PATIENT, UserRole.CAREGIVER];

export const PatientLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    signInWithPassword,
    profile,
    authState,
    isLoading,
    error: authContextError,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Role mismatch error if account is registered for another portal (e.g. AMBULANCE or DOCTOR)
  const roleMismatchError =
    profile && !ALLOWED_PATIENT_ROLES.includes(profile.role)
      ? `Your account is registered as ${getRoleDisplayName(profile.role)}. Access to the Patient Portal is restricted to Patients and Caregivers.`
      : null;

  // Only redirect away from /login if the user has a confirmed, linked PATIENT/CAREGIVER profile
  useEffect(() => {
    if (isLoading || authState === AuthState.INITIALIZING) return;

    if (authState === AuthState.AUTHENTICATED_LINKED && profile && ALLOWED_PATIENT_ROLES.includes(profile.role)) {
      const intendedPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(intendedPath || '/', { replace: true });
    }
  }, [isLoading, authState, profile, navigate, location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg('Both email address and password are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signInWithPassword(email.trim(), password);
    } catch (err: unknown) {
      const authError = err as { message?: string; status?: number };
      const rawMsg = authError.message || '';

      if (/invalid login credentials/i.test(rawMsg)) {
        setErrorMsg('Invalid email or password. Please verify your credentials.');
      } else if (/email not confirmed/i.test(rawMsg)) {
        setErrorMsg(
          'Email not confirmed. Please check your inbox and click the confirmation link sent by Supabase.',
        );
      } else {
        setErrorMsg(rawMsg || 'Failed to sign in. Please check your network and credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayedError =
    roleMismatchError ||
    errorMsg ||
    (authContextError ? 'The emergency backend service is temporarily unavailable. Please retry.' : null);

  // If user is authenticated in Supabase but unlinked in RAAH DB, show the dedicated notice & CTA
  if (authState === AuthState.AUTHENTICATED_UNLINKED && !displayedError) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="p-3 bg-amber-50 rounded-full text-amber-600 mb-2">
              <UserCheck className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Patient Profile Registration Required</h2>
            <p className="text-xs text-slate-500 mt-1">
              Your email credentials have been authenticated, but your account is not yet registered as a patient in the RAAH emergency database.
            </p>
          </div>

          <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 space-y-2">
            <p className="font-semibold text-amber-950">Next Step:</p>
            <p className="text-amber-800 leading-relaxed">
              Complete your name and emergency telephone contact so first responders and hospitals can coordinate care.
            </p>
            <div className="pt-2">
              <Link
                to="/register"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 transition shadow-xs text-sm"
              >
                <span>Complete Patient Profile</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="text-center text-xs text-slate-500">
            <span>Wrong account? </span>
            <Link to="/register" className="font-semibold text-rose-600 hover:text-rose-700 underline">
              Start fresh registration
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[65vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="p-3 bg-rose-50 rounded-full text-rose-600 mb-2">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Sign in to Patient Portal</h2>
          <p className="text-xs text-slate-500 mt-1">
            Access emergency SOS, track your active response, and manage your Cura Card.
          </p>
        </div>

        {displayedError && (
          <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{displayedError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address *
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="patient@example.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700 mb-1">
              Password *
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-hidden"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-rose-600 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-600 border-t border-slate-100 pt-4">
          <span>Need a patient account? </span>
          <Link to="/register" className="font-semibold text-rose-600 hover:text-rose-700 underline">
            Register as Patient
          </Link>
        </div>
      </div>
    </div>
  );
};

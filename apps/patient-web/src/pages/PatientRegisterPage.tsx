import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth, AuthState, validateAndNormalizeIndianPhone } from '@raah/auth';
import { authApi } from '@raah/api-client';
import { UserPlus, AlertCircle, CheckCircle, Mail, Phone, Lock, User, RefreshCw, ArrowRight } from 'lucide-react';

export const PatientRegisterPage: React.FC = () => {
  const {
    session,
    profile,
    authState,
    refreshProfile,
    signUpWithPassword,
    clearSession,
  } = useAuth();
  const navigate = useNavigate();

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // UI state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated and linked, redirect to portal
  useEffect(() => {
    if (authState === AuthState.AUTHENTICATED_LINKED && profile) {
      navigate('/', { replace: true });
    }
  }, [authState, profile, navigate]);

  const isProfileCompletion =
    authState === AuthState.AUTHENTICATED_UNLINKED && Boolean(session?.user?.email);

  const validateFreshRegistration = () => {
    const errors: Record<string, string> = {};
    if (!name.trim()) {
      errors.name = 'Full name is required.';
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }
    if (!password || password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }
    const phoneRes = validateAndNormalizeIndianPhone(phone);
    if (!phoneRes.isValid) {
      errors.phone = phoneRes.error || 'Please enter a valid 10-digit Indian mobile number.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateProfileCompletion = () => {
    const errors: Record<string, string> = {};
    if (!name.trim()) {
      errors.name = 'Full name is required.';
    }
    const phoneRes = validateAndNormalizeIndianPhone(phone);
    if (!phoneRes.isValid) {
      errors.phone = phoneRes.error || 'Please enter a valid 10-digit Indian mobile number.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFreshRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!validateFreshRegistration()) {
      return;
    }

    const phoneRes = validateAndNormalizeIndianPhone(phone);
    if (!phoneRes.isValid || !phoneRes.normalized) {
      setErrorMsg(phoneRes.error || 'Please enter a valid Indian mobile number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await signUpWithPassword(email.trim(), password);

      // If Supabase requires email confirmation, session is null
      if (!res.session) {
        setConfirmationEmail(email.trim());
        setIsSubmitting(false);
        return;
      }

      // If auto-confirmed session was established:
      await authApi.registerPatient({
        name: name.trim(),
        email: email.trim(),
        phone: phoneRes.normalized,
      });

      await refreshProfile();
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const e = err as { message?: string };
      setErrorMsg(e.message || 'Failed to complete registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!validateProfileCompletion()) {
      return;
    }

    const phoneRes = validateAndNormalizeIndianPhone(phone);
    if (!phoneRes.isValid || !phoneRes.normalized) {
      setErrorMsg(phoneRes.error || 'Please enter a valid Indian mobile number.');
      return;
    }

    if (!session?.user?.email) {
      setErrorMsg('No confirmed Supabase identity found. Please sign in or register anew.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.registerPatient({
        name: name.trim(),
        email: session.user.email,
        phone: phoneRes.normalized,
      });

      await refreshProfile();
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const e = err as { message?: string };
      setErrorMsg(e.message || 'Failed to link patient profile. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSwitchAccount = async () => {
    await clearSession();
    setName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setErrorMsg(null);
    setValidationErrors({});
    setConfirmationEmail(null);
  };

  // 1. Confirmation Pending Screen
  if (confirmationEmail || authState === AuthState.EMAIL_CONFIRMATION_PENDING) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-slate-200 text-center space-y-4">
          <div className="p-3 bg-emerald-50 rounded-full text-emerald-600 inline-block mb-1">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Check Your Email</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            A confirmation link has been sent to{' '}
            <strong className="text-slate-900 font-semibold">{confirmationEmail || 'your email'}</strong>.
            Please verify your email address to activate your account.
          </p>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700">Next Steps:</p>
            <ol className="list-decimal pl-4 space-y-0.5 text-[11px]">
              <li>Open your email inbox and click the verification link.</li>
              <li>You will be redirected back to establish your patient profile.</li>
              <li>Complete your emergency contact telephone to finalize activation.</li>
            </ol>
          </div>
          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-xs"
            >
              <span>Return to Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Profile Completion Screen (Post-Email Confirmation / Authenticated Unlinked)
  if (isProfileCompletion) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col items-center text-center">
            <div className="p-3 bg-sky-50 rounded-full text-sky-600 mb-2">
              <UserPlus className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Complete Patient Profile</h2>
            <p className="text-xs text-slate-500 mt-1">
              Your email is confirmed. Complete your emergency profile to activate dispatch access.
            </p>
          </div>

          {/* Verified Identity Badge (Never editable) */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Verified Email Identity</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle className="w-3 h-3 text-emerald-600" /> Verified
              </span>
            </div>
            <p className="font-bold text-slate-900 text-sm">{session?.user?.email}</p>
            <div className="pt-1 flex items-center justify-between text-[11px] border-t border-slate-200/60 mt-2">
              <span className="text-slate-400">Not your email?</span>
              <button
                type="button"
                onClick={handleSwitchAccount}
                className="font-semibold text-rose-600 hover:text-rose-700 underline"
              >
                Start fresh registration
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleCompleteProfile} className="space-y-4">
            <div>
              <label htmlFor="comp-name" className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Full Name *</span>
              </label>
              <input
                id="comp-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (validationErrors.name) setValidationErrors((prev) => ({ ...prev, name: '' }));
                }}
                required
                placeholder="Jane Doe"
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-hidden ${
                  validationErrors.name ? 'border-rose-400' : 'border-slate-300 focus:border-rose-500'
                }`}
              />
              {validationErrors.name && (
                <p className="text-[11px] text-rose-600 mt-1">{validationErrors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="comp-phone" className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Mobile Phone Number *</span>
              </label>
              <input
                id="comp-phone"
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (validationErrors.phone) setValidationErrors((prev) => ({ ...prev, phone: '' }));
                }}
                required
                placeholder="9876543210 or +91 98765 43210"
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-hidden ${
                  validationErrors.phone ? 'border-rose-400' : 'border-slate-300 focus:border-rose-500'
                }`}
              />
              <span className="text-[11px] text-slate-400 block mt-1">
                Enter a 10-digit Indian mobile number (e.g. 9876543210).
              </span>
              {validationErrors.phone && (
                <p className="text-[11px] text-rose-600 mt-1">{validationErrors.phone}</p>
              )}
            </div>

            <p className="text-[11px] text-slate-500">
              Account role is permanently assigned as <strong className="text-slate-700">PATIENT</strong>.
            </p>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-rose-600 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Linking Patient Profile...</span>
                </>
              ) : (
                <span>Complete & Link Profile</span>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 3. Fresh Unauthenticated Registration Screen (4 Required Fields)
  return (
    <div className="flex min-h-[65vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="p-3 bg-rose-50 rounded-full text-rose-600 mb-2">
            <UserPlus className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Patient Registration</h2>
          <p className="text-xs text-slate-500 mt-1">
            Establish your RAAH Patient Account to access emergency SOS and Cura Card.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleFreshRegister} className="space-y-4">
          <div>
            <label htmlFor="reg-name" className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Full Name *</span>
            </label>
            <input
              id="reg-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (validationErrors.name) setValidationErrors((prev) => ({ ...prev, name: '' }));
              }}
              required
              placeholder="Aarav Patel"
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-hidden ${
                validationErrors.name ? 'border-rose-400' : 'border-slate-300 focus:border-rose-500'
              }`}
            />
            {validationErrors.name && (
              <p className="text-[11px] text-rose-600 mt-1">{validationErrors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="reg-email" className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>Email Address *</span>
            </label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (validationErrors.email) setValidationErrors((prev) => ({ ...prev, email: '' }));
              }}
              required
              placeholder="patient@example.com"
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-hidden ${
                validationErrors.email ? 'border-rose-400' : 'border-slate-300 focus:border-rose-500'
              }`}
            />
            {validationErrors.email && (
              <p className="text-[11px] text-rose-600 mt-1">{validationErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="reg-password" className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Password *</span>
            </label>
            <input
              id="reg-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (validationErrors.password) setValidationErrors((prev) => ({ ...prev, password: '' }));
              }}
              required
              minLength={6}
              placeholder="At least 6 characters"
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-hidden ${
                validationErrors.password ? 'border-rose-400' : 'border-slate-300 focus:border-rose-500'
              }`}
            />
            {validationErrors.password && (
              <p className="text-[11px] text-rose-600 mt-1">{validationErrors.password}</p>
            )}
          </div>

          <div>
            <label htmlFor="reg-phone" className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>Mobile Phone Number *</span>
            </label>
            <input
              id="reg-phone"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (validationErrors.phone) setValidationErrors((prev) => ({ ...prev, phone: '' }));
              }}
              required
              placeholder="9876543210 or +91 98765 43210"
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-hidden ${
                validationErrors.phone ? 'border-rose-400' : 'border-slate-300 focus:border-rose-500'
              }`}
            />
            <span className="text-[11px] text-slate-400 block mt-1">
              Enter a 10-digit Indian mobile number (e.g. 9876543210).
            </span>
            {validationErrors.phone && (
              <p className="text-[11px] text-rose-600 mt-1">{validationErrors.phone}</p>
            )}
          </div>

          <p className="text-[11px] text-slate-500">
            Account role is permanently assigned as <strong className="text-slate-700">PATIENT</strong>.
          </p>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-rose-600 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <span>Register Patient Account</span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-600 border-t border-slate-100 pt-4">
          <span>Already have an account? </span>
          <Link to="/login" className="font-semibold text-rose-600 hover:text-rose-700 underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

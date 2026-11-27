import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Shield,
  AlertCircle,
  CheckCircle2,
  Lock,
  Save,
  HelpCircle,
  Clock,
} from 'lucide-react';
import { useAuth } from '@raah/auth';
import { patientsApi } from '@raah/api-client';

export const PatientSettingsPage: React.FC = () => {
  const { profile, isLoading } = useAuth();

  const [emergencyContact, setEmergencyContact] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      patientsApi
        .getMe()
        .then((patient) => {
          if (patient.emergencyContact) {
            setEmergencyContact(patient.emergencyContact);
          }
        })
        .catch(() => {
          // Patient profile might not be created yet if registration is incomplete
        });
    }
  }, [profile]);

  const validate = () => {
    const errors: Record<string, string> = {};
    if (
      emergencyContact.trim() &&
      !/^\+?[0-9\s-]{7,15}$/.test(emergencyContact.trim()) &&
      emergencyContact.trim().length < 3
    ) {
      errors.emergencyContact = 'Please enter a valid emergency contact name or telephone';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEmergencyContactChange = (val: string) => {
    setEmergencyContact(val);
    if (
      val.trim() &&
      !/^\+?[0-9\s-]{7,15}$/.test(val.trim()) &&
      val.trim().length < 3
    ) {
      setValidationErrors({ emergencyContact: 'Please enter a valid emergency contact name or telephone' });
    } else {
      setValidationErrors({});
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    try {
      await patientsApi.updateMe({
        emergencyContact: emergencyContact.trim() || null,
      });
      setSaveSuccessMsg('Emergency contact details updated successfully.');
    } catch (err: unknown) {
      const error = err as { message?: string };
      setSaveErrorMsg(error.message || 'Failed to update emergency contact details.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-lg w-1/3"></div>
        <div className="h-64 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  // Consistent status derived from real profile state
  const isAccountActive = profile ? Boolean(profile.isActive) : false;

  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-8 space-y-8">
      {/* 1. Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 mb-1.5">
          <User className="w-3.5 h-3.5 text-slate-600" />
          <span>Account Settings</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Patient Profile & Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage your personal identity, contact telephone, and designated emergency next-of-kin contacts.
        </p>
      </div>

      {/* Save alerts */}
      {saveSuccessMsg && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {saveErrorMsg && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{saveErrorMsg}</span>
        </div>
      )}

      {/* 2. Honest Backend Capability Notice */}
      <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-5 shadow-2xs space-y-2 text-xs text-sky-900">
        <div className="flex items-center gap-2 font-bold text-sky-900 text-sm">
          <HelpCircle className="w-4 h-4 text-sky-600 shrink-0" />
          <span>Profile Capabilities & Clinical Record Synchronization</span>
        </div>
        <p className="leading-relaxed text-sky-800">
          Core user identity fields (Name, Email, Primary Phone) are account-bound and managed through your verified Supabase user record (<code className="bg-sky-100 px-1 py-0.5 rounded text-[11px] font-mono">GET /api/v1/auth/me</code>). Next-of-kin emergency contact updates are synchronized directly with your clinical records via <code className="bg-sky-100 px-1 py-0.5 rounded text-[11px] font-mono">PATCH /api/v1/patients/me</code>.
        </p>
      </div>

      {/* 3. Account Security & Role Enforcement Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-600" />
            <span>Account Security & RBAC Boundary</span>
          </h2>
          {profile ? (
            isAccountActive ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Active Account
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <AlertCircle className="w-3 h-3 mr-1 text-amber-600" /> Suspended Account
              </span>
            )
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
              <Clock className="w-3 h-3 mr-1 text-slate-500" /> Unverified / Guest
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 font-medium">Account Role</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {profile?.role || 'PATIENT'}
              </span>
              <span title="Protected role">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">
              Enforced by backend authorization.
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 font-medium">Internal User ID</span>
            <p className="font-mono text-slate-700 mt-1 text-[11px] truncate" title={profile?.id}>
              {profile?.id || '—'}
            </p>
            <span className="text-[10px] text-slate-400 block mt-1">
              UUID primary key
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 font-medium">Registration Status</span>
            <p className="font-bold text-slate-800 mt-1">
              {profile ? (isAccountActive ? 'Active' : 'Suspended') : 'Unregistered'}
            </p>
            <span className="text-[10px] text-slate-400 block mt-1">
              {profile?.createdAt
                ? `Joined ${new Date(profile.createdAt).toLocaleDateString()}`
                : (profile ? (isAccountActive ? 'Active Member' : 'Pending Verification') : 'No Session')}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Profile Details Form */}
      <form
        aria-label="profile-settings-form"
        onSubmit={handleSave}
        className="space-y-6"
      >
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
            Contact & Identity Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Full Name (Read-Only) */}
            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>Full Name</span>
                <span className="text-[10px] font-normal text-slate-400">(Account Identity)</span>
              </label>
              <input
                id="name"
                type="text"
                disabled
                value={profile?.name || ''}
                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-xs text-slate-600 cursor-not-allowed focus:outline-hidden"
              />
              <p className="text-[11px] text-slate-400">Account identity name is locked to verified registration.</p>
            </div>

            {/* Email (Read-Only - Identity bound) */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span>Email Address</span>
                <span className="text-[10px] font-normal text-slate-400">(Supabase Auth ID)</span>
              </label>
              <input
                id="email"
                type="email"
                disabled
                value={profile?.email || ''}
                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-xs text-slate-500 cursor-not-allowed focus:outline-hidden"
              />
              <p className="text-[11px] text-slate-400">Linked to verified authentication session.</p>
            </div>

            {/* Primary Phone (Read-Only) */}
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="phone" className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>Primary Contact Phone</span>
                <span className="text-[10px] font-normal text-slate-400">(Registration Record)</span>
              </label>
              <input
                id="phone"
                type="tel"
                disabled
                value={profile?.phone || ''}
                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-xs text-slate-600 cursor-not-allowed focus:outline-hidden"
              />
              <p className="text-[11px] text-slate-400">Registered phone number associated with user account.</p>
            </div>

            {/* Emergency Contact (Editable & Persisted via PATCH /api/v1/patients/me) */}
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="emergencyContact" className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Designated Next-of-Kin Emergency Contact (Name / Phone)</span>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  PATCH /api/v1/patients/me
                </span>
              </label>
              <input
                id="emergencyContact"
                type="text"
                value={emergencyContact}
                onBlur={validate}
                onChange={(e) => handleEmergencyContactChange(e.target.value)}
                placeholder="e.g. Priya Sharma (+91 98765 00000)"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 ${
                  validationErrors.emergencyContact
                    ? 'border-rose-400 focus:ring-rose-200'
                    : 'border-slate-300 focus:ring-slate-200'
                }`}
              />
              {validationErrors.emergencyContact && (
                <p className="text-[11px] text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {validationErrors.emergencyContact}
                </p>
              )}
              <p className="text-[11px] text-slate-400">
                Paramedics and receiving hospitals contact this number upon emergency transport reception.
              </p>
            </div>
          </div>
        </div>

        {/* 5. Save Button with Live Backend Action */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-100 rounded-2xl p-4 border border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Emergency contact updates sync directly with your clinical profile via <code className="font-mono text-[11px]">PATCH /api/v1/patients/me</code>.</span>
          </div>

          <button
            type="submit"
            disabled={isSaving || !profile}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 text-white text-xs font-bold border border-indigo-600 disabled:border-slate-300 shadow-2xs flex items-center justify-center gap-2 transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Emergency Contact'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

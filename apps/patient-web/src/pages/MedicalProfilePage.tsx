import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import {
  HeartPulse,
  Droplet,
  ShieldAlert,
  Activity,
  Pill,
  CheckCircle2,
  User,
  Phone,
  Mail,
  RefreshCw,
  Save,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@raah/auth';
import { patientsApi } from '@raah/api-client';
import type { PatientMedicalProfile } from '@raah/shared-types';

export const MedicalProfilePage: React.FC = () => {
  const { profile, isLoading: isAuthLoading } = useAuth();

  // Clinical profile data state
  const [medicalProfile, setMedicalProfile] = useState<PatientMedicalProfile | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Form edit states
  const [bloodGroup, setBloodGroup] = useState<string>('');
  const [allergies, setAllergies] = useState<string>('');
  const [medicalHistory, setMedicalHistory] = useState<string>('');
  const [currentMedication, setCurrentMedication] = useState<string>('');
  const [emergencyContact, setEmergencyContact] = useState<string>('');

  // Submission & feedback states
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  // Load clinical profile from backend
  const loadProfile = useCallback(async () => {
    setIsFetching(true);
    setFetchError(null);
    try {
      const data = await patientsApi.getMe();
      setMedicalProfile(data);
      setBloodGroup(data.bloodGroup || '');
      setAllergies(data.allergies || '');
      setMedicalHistory(data.medicalHistory || '');
      setCurrentMedication(data.currentMedication || '');
      setEmergencyContact(data.emergencyContact || '');
    } catch (err: unknown) {
      const error = err as { message?: string };
      setFetchError(error.message || 'Failed to load medical profile from server.');
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthLoading) {
      if (profile) {
        loadProfile();
      } else {
        setIsFetching(false);
      }
    }
  }, [isAuthLoading, profile, loadProfile]);

  // Form submission handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    setIsSaving(true);
    try {
      const updated = await patientsApi.updateMe({
        bloodGroup: bloodGroup.trim() || null,
        allergies: allergies.trim() || null,
        medicalHistory: medicalHistory.trim() || null,
        currentMedication: currentMedication.trim() || null,
        emergencyContact: emergencyContact.trim() || null,
      });

      setMedicalProfile(updated);
      setBloodGroup(updated.bloodGroup || '');
      setAllergies(updated.allergies || '');
      setMedicalHistory(updated.medicalHistory || '');
      setCurrentMedication(updated.currentMedication || '');
      setEmergencyContact(updated.emergencyContact || '');
      setSaveSuccessMsg('Medical profile saved successfully.');
    } catch (err: unknown) {
      const error = err as { message?: string };
      setSaveErrorMsg(error.message || 'Failed to save medical profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isAuthLoading || isFetching) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-lg w-1/3"></div>
        <div className="h-24 bg-slate-200 rounded-2xl"></div>
        <div className="h-64 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
          <HeartPulse className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Patient Authentication Required</h2>
        <p className="text-sm text-slate-600">
          Accessing and updating your clinical baseline records requires an active, verified patient session.
        </p>
        <div className="pt-2">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-sm"
          >
            <span>Sign In to Medical Profile</span>
          </Link>
        </div>
      </div>
    );
  }

  // Check if clinical profile has any recorded medical facts
  const hasClinicalData = Boolean(
    medicalProfile?.bloodGroup ||
    medicalProfile?.allergies ||
    medicalProfile?.medicalHistory ||
    medicalProfile?.currentMedication ||
    medicalProfile?.emergencyContact,
  );

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-8 space-y-8">
      {/* 1. Header & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200 mb-1.5">
            <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
            <span>Emergency Medical Records</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Patient Medical Profile
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Clinical baseline data utilized by emergency dispatchers, paramedics, and receiving trauma hospitals.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Authenticated Patient Record</span>
          </span>
        </div>
      </div>

      {/* Fetch error feedback */}
      {fetchError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Error retrieving clinical profile</p>
              <p className="mt-0.5 text-rose-700">{fetchError}</p>
            </div>
          </div>
          <button
            onClick={loadProfile}
            className="px-3 py-1 rounded-lg bg-rose-100 text-rose-800 hover:bg-rose-200 font-semibold transition shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Success feedback */}
      {saveSuccessMsg && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Save error feedback */}
      {saveErrorMsg && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{saveErrorMsg}</span>
        </div>
      )}

      {/* 2. Honest Empty State Notice when no clinical facts exist */}
      {!hasClinicalData && !fetchError && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-5 shadow-2xs space-y-1 text-xs text-blue-900">
          <div className="flex items-center gap-2 font-bold text-blue-950 text-sm">
            <Activity className="w-4 h-4 text-blue-600 shrink-0" />
            <span>No Clinical Information Recorded Yet</span>
          </div>
          <p className="leading-relaxed text-blue-800">
            Please enter your baseline medical details below (blood group, critical allergies, pre-existing conditions, active medications, and emergency contact). This information assists first responders during an active emergency SOS.
          </p>
        </div>
      )}

      {/* 3. Verified Patient Identity Card (Real data from /auth/me) */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <User className="w-4 h-4 text-slate-600" />
            <span>Verified System Identity</span>
          </h2>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Verified Backend User
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 font-medium">Registered Name</span>
            <p className="font-bold text-slate-900 text-sm mt-0.5">{profile?.name || '—'}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 font-medium flex items-center gap-1">
              <Mail className="w-3 h-3 text-slate-400" /> Email
            </span>
            <p className="font-bold text-slate-900 mt-0.5 truncate">{profile?.email || '—'}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 font-medium flex items-center gap-1">
              <Phone className="w-3 h-3 text-slate-400" /> Primary Phone
            </span>
            <p className="font-bold text-slate-900 mt-0.5">{profile?.phone || 'Not registered'}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 font-medium">Internal Patient UID</span>
            <p className="font-mono text-slate-700 mt-0.5 text-[11px] truncate" title={medicalProfile?.id || profile?.id}>
              {medicalProfile?.id || profile?.id || '—'}
            </p>
          </div>
        </div>
      </div>

      {/* 4. Clinical Medical Profile Form (Editable and connected to backend API) */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-600" />
              <span>Clinical Baseline & Triage Attributes</span>
            </h2>
            <span className="text-xs text-slate-500 font-medium">Editable by Patient</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Blood Group */}
            <div className="space-y-1.5">
              <label htmlFor="bloodGroup" className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Droplet className="w-3.5 h-3.5 text-rose-600" />
                <span>Blood Group</span>
              </label>
              <select
                id="bloodGroup"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-800 focus:border-rose-500 focus:outline-hidden"
              >
                <option value="">Not Specified / Unknown</option>
                <option value="A+">A Positive (A+)</option>
                <option value="A-">A Negative (A-)</option>
                <option value="B+">B Positive (B+)</option>
                <option value="B-">B Negative (B-)</option>
                <option value="AB+">AB Positive (AB+)</option>
                <option value="AB-">AB Negative (AB-)</option>
                <option value="O+">O Positive (O+)</option>
                <option value="O-">O Negative (O-)</option>
              </select>
              <p className="text-[11px] text-slate-400">Used by paramedics to prepare blood typing during transport.</p>
            </div>

            {/* Known Allergies */}
            <div className="space-y-1.5">
              <label htmlFor="allergies" className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span>Critical Allergies</span>
              </label>
              <input
                id="allergies"
                type="text"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="e.g. Penicillin, Latex, NSAIDs, Peanuts"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-800 focus:border-rose-500 focus:outline-hidden"
              />
              <p className="text-[11px] text-slate-400">List all drug, food, and environmental allergies.</p>
            </div>

            {/* Existing Medical Conditions */}
            <div className="space-y-1.5">
              <label htmlFor="conditions" className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <HeartPulse className="w-3.5 h-3.5 text-sky-600" />
                <span>Pre-existing Conditions</span>
              </label>
              <input
                id="conditions"
                type="text"
                value={medicalHistory}
                onChange={(e) => setMedicalHistory(e.target.value)}
                placeholder="e.g. Type 2 Diabetes, Hypertension, Asthma"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-800 focus:border-rose-500 focus:outline-hidden"
              />
              <p className="text-[11px] text-slate-400">Chronic illnesses and medical diagnoses.</p>
            </div>

            {/* Current Medications */}
            <div className="space-y-1.5">
              <label htmlFor="medications" className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5 text-indigo-600" />
                <span>Current Prescriptions & Medications</span>
              </label>
              <input
                id="medications"
                type="text"
                value={currentMedication}
                onChange={(e) => setCurrentMedication(e.target.value)}
                placeholder="e.g. Warfarin, Metformin, Lisinopril, Inhalers"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-800 focus:border-rose-500 focus:outline-hidden"
              />
              <p className="text-[11px] text-slate-400">Current ongoing drug therapies and dosage.</p>
            </div>

            {/* Emergency Contact */}
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="emergencyContact" className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-600" />
                <span>Emergency Contact Person & Phone</span>
              </label>
              <input
                id="emergencyContact"
                type="text"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="e.g. Priya Sharma (Spouse): +91 98765 43210"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-800 focus:border-rose-500 focus:outline-hidden"
              />
              <p className="text-[11px] text-slate-400">Designated primary contact to be notified by emergency dispatchers.</p>
            </div>
          </div>
        </div>

        {/* 5. Save Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 rounded-2xl p-4 border border-slate-200">
          <div className="text-xs text-slate-500">
            <span>Updates are immediately synchronized to the RAAH emergency backend.</span>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving Profile...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Medical Profile</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

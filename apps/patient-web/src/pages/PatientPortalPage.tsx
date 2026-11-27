import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  HeartPulse,
  ShieldAlert,
  Clock,
  QrCode,
  RotateCw,
  AlertCircle,
  Ambulance,
  Building2,
  PhoneCall,
  Activity,
  History as HistoryIcon,
} from 'lucide-react';
import { useAuth, AuthState } from '@raah/auth';
import { emergenciesApi } from '@raah/api-client';
import type { EmergencyCase, AmbulanceAssignment, DestinationHospital } from '@raah/shared-types';
import { EmergencySOSModal } from '../components/EmergencySOSModal';
import { EmergencyTimeline } from '../components/EmergencyTimeline';
import { CuraCardModal } from '../components/CuraCardModal';

export const PatientPortalPage: React.FC = () => {
  const { profile, authState } = useAuth();
  const navigate = useNavigate();

  // If user is authenticated in Supabase but unlinked in RAAH DB, guide directly to /register
  useEffect(() => {
    if (authState === AuthState.AUTHENTICATED_UNLINKED) {
      navigate('/register', { replace: true });
    }
  }, [authState, navigate]);

  const [activeEmergency, setActiveEmergency] = useState<EmergencyCase | null>(null);
  const [history, setHistory] = useState<EmergencyCase[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedCaseDetail, setSelectedCaseDetail] = useState<EmergencyCase | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [isCuraCardOpen, setIsCuraCardOpen] = useState(false);

  const [guestTrackingNotice, setGuestTrackingNotice] = useState<string | null>(null);

  // Polling ref
  const pollIntervalRef = useRef<number | null>(null);

  // Fetch emergencies from stored IDs for this patient or guest
  const fetchPatientEmergencies = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    setGuestTrackingNotice(null);

    try {
      const isGuest = !profile;
      const storageKey = `raah_emergencies_${profile?.id || 'guest'}`;
      const stored = localStorage.getItem(storageKey);
      const caseIds: string[] = stored ? JSON.parse(stored) : [];

      if (caseIds.length === 0) {
        setHistory([]);
        setActiveEmergency(null);
        setSelectedCaseDetail(null);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      // If guest: Backend GET /api/v1/emergencies/:id enforces authentication + role verification.
      // An unauthenticated guest will receive 401 Unauthorized upon attempting to fetch individual case details.
      if (isGuest) {
        setGuestTrackingNotice(
          `Emergency broadcast confirmed for Reference ID #${caseIds[0]}. Dispatch CAD is currently coordinating response units. Live status telemetry tracking requires an authenticated patient profile.`,
        );
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      // Authenticated patient flow: Fetch each emergency detail via GET /api/v1/emergencies/:id
      const fetchedCases: EmergencyCase[] = [];
      for (const id of caseIds) {
        try {
          const c = await emergenciesApi.getById(id);
          if (c) fetchedCases.push(c);
        } catch {
          // If deleted or not found, silently ignore
        }
      }

      // Sort descending by creation date
      fetchedCases.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      // Check if there is an active (non-completed, non-cancelled) emergency
      const active = fetchedCases.find(
        (c) => c.status !== 'COMPLETED' && c.status !== 'CANCELLED',
      );
      setActiveEmergency(active || null);
      setHistory(fetchedCases);

      if (active) {
        setSelectedCaseId(active.id);
        setSelectedCaseDetail(active);
      } else if (fetchedCases.length > 0) {
        setSelectedCaseId((prev) => prev ?? fetchedCases[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load emergency history');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchPatientEmergencies();
  }, [fetchPatientEmergencies]);

  // Periodic polling for active emergency updates (every 6 seconds while active)
  useEffect(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    if (activeEmergency && activeEmergency.status !== 'COMPLETED' && activeEmergency.status !== 'CANCELLED') {
      pollIntervalRef.current = window.setInterval(async () => {
        try {
          const refreshed = await emergenciesApi.getById(activeEmergency.id);
          if (refreshed) {
            setActiveEmergency(refreshed);
            setSelectedCaseDetail((prev) => (prev?.id === refreshed.id ? refreshed : prev));
            if (refreshed.status === 'COMPLETED' || refreshed.status === 'CANCELLED') {
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
            }
          }
        } catch {
          // Fail silently on background poll
        }
      }, 6000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [activeEmergency?.id, activeEmergency?.status]);

  // Fetch full details of selected emergency (only for authenticated profiles)
  useEffect(() => {
    let isMounted = true;
    if (!selectedCaseId || !profile) {
      return;
    }

    const fetchDetail = async () => {
      try {
        const detail = await emergenciesApi.getById(selectedCaseId);
        if (isMounted) setSelectedCaseDetail(detail);
      } catch {
        // Ignore single fetch failure
      }
    };

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [selectedCaseId, profile]);

  // Callback when emergency is created
  const handleEmergencyCreated = (emergencyId: string) => {
    const storageKey = `raah_emergencies_${profile?.id || 'guest'}`;
    const stored = localStorage.getItem(storageKey);
    const caseIds: string[] = stored ? JSON.parse(stored) : [];
    if (!caseIds.includes(emergencyId)) {
      caseIds.unshift(emergencyId);
      localStorage.setItem(storageKey, JSON.stringify(caseIds));
    }

    setIsSosOpen(false);
    setSelectedCaseId(emergencyId);
    fetchPatientEmergencies(true);
  };

  const displayedCase = selectedCaseDetail || activeEmergency;
  const latestAssignment: AmbulanceAssignment | undefined =
    displayedCase?.assignments && displayedCase.assignments.length > 0
      ? displayedCase.assignments[0]
      : undefined;
  const destinationHospital: DestinationHospital | undefined =
    displayedCase?.destinationHospital ?? undefined;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* 1. Header / Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5 tracking-tight">
            <HeartPulse className="w-7 h-7 text-rose-600" />
            <span>RAAH Emergency Patient Network</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {profile ? (
              <>
                Logged in as <strong className="text-slate-800">{profile.name}</strong> ({profile.email}). Rapid dispatch and emergency tracking terminal.
              </>
            ) : (
              <>
                <strong className="text-rose-600 font-semibold">Guest Mode:</strong> Instant emergency assistance without account login.
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => fetchPatientEmergencies(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {profile && (
            <button
              type="button"
              onClick={() => setIsCuraCardOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold transition shadow-2xs"
            >
              <QrCode className="w-4 h-4 text-sky-600" />
              <span>Digital Cura Card</span>
            </button>
          )}

          {/* Primary High-Visibility SOS Trigger Button */}
          <button
            type="button"
            onClick={() => setIsSosOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-md shadow-rose-600/30 transition transform active:scale-95"
          >
            <ShieldAlert className="w-4 h-4 animate-pulse" />
            <span>EMERGENCY SOS</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchPatientEmergencies(true)}
            className="underline font-semibold hover:text-amber-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* Guest Tracking Status Notice */}
      {guestTrackingNotice && (
        <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-xs space-y-1.5 shadow-2xs">
          <div className="flex items-center gap-2 font-bold text-sky-800 text-sm">
            <ShieldAlert className="w-4 h-4 text-sky-600" />
            <span>Emergency Broadcast Confirmed</span>
          </div>
          <p className="text-sky-700 leading-relaxed">{guestTrackingNotice}</p>
          <div className="pt-1 flex items-center gap-3">
            <a
              href="/register"
              className="font-bold underline text-sky-800 hover:text-sky-950"
            >
              Register Patient Profile to Enable Live Telemetry Tracking &rarr;
            </a>
          </div>
        </div>
      )}

      {/* 2. Hero SOS Action (Prominent Card on Top) */}
      <div className="rounded-3xl bg-gradient-to-br from-rose-600 via-rose-700 to-red-800 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-semibold text-rose-100">
            <Activity className="w-3.5 h-3.5" />
            <span>Automated Emergency Routing Online</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            Need Immediate Emergency Medical Response?
          </h2>

          <p className="text-xs sm:text-sm text-rose-100 leading-relaxed max-w-xl">
            Triggering an SOS transmits your real-time coordinates directly to the nearest available ambulance and notifies receiving trauma hospital centers. No login required for emergencies.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSosOpen(true)}
              className="px-6 py-3.5 rounded-2xl bg-white text-rose-700 hover:bg-rose-50 text-sm font-black tracking-wide shadow-lg shadow-black/10 flex items-center justify-center gap-2 transition active:scale-95"
            >
              <ShieldAlert className="w-5 h-5 text-rose-600 animate-pulse" />
              <span>REQUEST IMMEDIATE SOS</span>
            </button>

            <a
              href="tel:112"
              className="px-5 py-3.5 rounded-2xl bg-rose-800/80 hover:bg-rose-800 border border-rose-400/40 text-white text-xs font-bold flex items-center justify-center gap-2 transition"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Direct Emergency Call: 112 / 108</span>
            </a>
          </div>
        </div>
      </div>

      {/* 3. Active Emergency Section (If active or selected) */}
      {displayedCase ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-rose-600" />
              <span>Active Response Monitor — Case #{displayedCase.caseNumber}</span>
            </h3>
            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                displayedCase.status === 'COMPLETED'
                  ? 'bg-emerald-100 text-emerald-800'
                  : displayedCase.status === 'CANCELLED'
                    ? 'bg-slate-100 text-slate-700'
                    : 'bg-rose-100 text-rose-700 animate-pulse'
              }`}
            >
              {displayedCase.status}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Timeline Stepper */}
            <div className="lg:col-span-2">
              <EmergencyTimeline
                status={displayedCase.status}
                events={displayedCase.events}
              />
            </div>

            {/* Live Units / Assignment Details Panel */}
            <div className="space-y-5">
              {/* Ambulance Assignment Information */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 text-xs font-bold text-slate-900 border-b border-slate-100 pb-3">
                  <Ambulance className="w-4 h-4 text-blue-600" />
                  <span>Ambulance Assignment</span>
                </div>

                {latestAssignment && latestAssignment.ambulance ? (
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Unit Call Sign:</span>
                      <span className="font-bold text-slate-800">{latestAssignment.ambulance.callSign}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Registration:</span>
                      <span className="font-semibold text-slate-800">{latestAssignment.ambulance.registrationNumber}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Vehicle Type:</span>
                      <span className="font-semibold text-blue-600">{latestAssignment.ambulance.type}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Assignment Status:</span>
                      <span className="font-bold text-slate-800">{latestAssignment.status}</span>
                    </div>
                    {latestAssignment.ambulance.currentLatitude && latestAssignment.ambulance.currentLongitude && (
                      <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl text-[11px] text-blue-900">
                        GPS telemetry actively broadcasting coordinates.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center text-xs text-slate-500">
                    <Ambulance className="w-5 h-5 text-slate-400 mx-auto mb-1.5 opacity-70" />
                    <span>Ambulance allocation in progress by automated CAD.</span>
                  </div>
                )}
              </div>

              {/* Destination Hospital Information */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 text-xs font-bold text-slate-900 border-b border-slate-100 pb-3">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span>Receiving Hospital Center</span>
                </div>

                {destinationHospital ? (
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Hospital:</span>
                      <span className="font-bold text-slate-800">{destinationHospital.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">Address:</span>
                      <span className="text-slate-800 font-medium">{destinationHospital.address}</span>
                    </div>
                    {destinationHospital.emergencyCapability && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Facility Capability:</span>
                        <span className="font-semibold text-emerald-700">{destinationHospital.emergencyCapability}</span>
                      </div>
                    )}
                    {destinationHospital.phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Contact:</span>
                        <a href={`tel:${destinationHospital.phone}`} className="font-bold text-emerald-600 hover:underline">
                          {destinationHospital.phone}
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center text-xs text-slate-500">
                    <Building2 className="w-5 h-5 text-slate-400 mx-auto mb-1.5 opacity-70" />
                    <span>Hospital destination will be confirmed upon paramedic triage.</span>
                  </div>
                )}
              </div>

              {/* Location & Symptoms Reported */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2.5 text-xs">
                <span className="font-bold text-slate-700 block">Reported Incident Address:</span>
                <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {displayedCase.incidentAddress}
                </p>
                {displayedCase.symptoms && (
                  <>
                    <span className="font-bold text-slate-700 block mt-2">Reported Vitals / Symptoms:</span>
                    <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      {displayedCase.symptoms}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        !isLoading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 text-xs">
            <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-70" />
            <p className="font-bold text-slate-700 text-sm">No Active Emergency</p>
            <p className="mt-1 text-slate-500 max-w-sm mx-auto">
              You currently have no emergency dispatch requests in progress. Tap the SOS button above if you need immediate assistance.
            </p>
          </div>
        )
      )}

      {/* 4. Stored Emergency History Section */}
      {history.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <HistoryIcon className="w-4 h-4 text-slate-600" />
              <span>Recent Emergency Records</span>
            </h4>
            <span className="text-xs text-slate-400">{history.length} recorded on this device/account</span>
          </div>

          <div className="space-y-2">
            {history.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedCaseId(item.id)}
                className={`w-full p-3.5 rounded-xl border text-left flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition ${
                  selectedCaseId === item.id
                    ? 'border-rose-600 bg-rose-50/50'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">Case #{item.caseNumber}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 font-semibold text-slate-600">
                      {item.priority}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                    {item.incidentAddress}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-400">
                    {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      item.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.status === 'CANCELLED'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <EmergencySOSModal
        isOpen={isSosOpen}
        onClose={() => setIsSosOpen(false)}
        onSuccess={handleEmergencyCreated}
      />

      <CuraCardModal
        isOpen={isCuraCardOpen}
        onClose={() => setIsCuraCardOpen(false)}
        profile={profile}
      />
    </div>
  );
};

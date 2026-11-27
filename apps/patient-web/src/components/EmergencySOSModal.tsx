import React, { useState } from 'react';
import {
  AlertTriangle,
  MapPin,
  Send,
  Loader2,
  CheckCircle2,
  ShieldAlert,
  Activity,
  Car,
  Wind,
  Brain,
  Baby,
  HelpCircle,
  Stethoscope,
} from 'lucide-react';
import { emergenciesApi } from '@raah/api-client';
import type { CasePriority } from '@raah/shared-types';

export interface EmergencyCategoryOption {
  id: string;
  label: string;
  description: string;
  priority: CasePriority;
  icon: React.ComponentType<{ className?: string }>;
}

const EMERGENCY_CATEGORIES: EmergencyCategoryOption[] = [
  {
    id: 'CARDIAC',
    label: 'Cardiac Emergency',
    description: 'Chest pain, cardiac arrest, severe palpitations, sudden collapse',
    priority: 'CRITICAL',
    icon: Activity,
  },
  {
    id: 'TRAUMA',
    label: 'Accident / Trauma',
    description: 'Road traffic collision, fall, severe bleeding, blunt trauma',
    priority: 'HIGH',
    icon: Car,
  },
  {
    id: 'RESPIRATORY',
    label: 'Breathing Difficulty',
    description: 'Severe asthma, choking, anaphylaxis, respiratory distress',
    priority: 'CRITICAL',
    icon: Wind,
  },
  {
    id: 'STROKE',
    label: 'Stroke Symptoms',
    description: 'Facial drooping, arm weakness, speech difficulty (FAST)',
    priority: 'CRITICAL',
    icon: Brain,
  },
  {
    id: 'MATERNITY',
    label: 'Pregnancy-related Emergency',
    description: 'Active labor, pre-eclampsia, complications, hemorrhage',
    priority: 'HIGH',
    icon: Baby,
  },
  {
    id: 'OTHER',
    label: 'Other Medical Emergency',
    description: 'Severe allergic reaction, seizure, high fever, poisoning',
    priority: 'HIGH',
    icon: Stethoscope,
  },
  {
    id: 'UNSURE',
    label: 'Not Sure / Unable to Identify',
    description: 'Patient unresponsive or condition cannot be assessed safely',
    priority: 'CRITICAL',
    icon: HelpCircle,
  },
];

interface EmergencySOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (emergencyId: string) => void;
}

export const EmergencySOSModal: React.FC<EmergencySOSModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<'category' | 'location' | 'confirm'>('category');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('CARDIAC');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [symptoms, setSymptoms] = useState('');
  const [notes, setNotes] = useState('');
  const [locationStatus, setLocationStatus] = useState<
    'idle' | 'detecting' | 'acquired' | 'error' | 'denied' | 'timeout'
  >('idle');
  const [locationErrorMsg, setLocationErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedCategory =
    EMERGENCY_CATEGORIES.find((c) => c.id === selectedCategoryId) || EMERGENCY_CATEGORIES[0];

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setLocationErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    setLocationStatus('detecting');
    setLocationErrorMsg('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        setLocationStatus('acquired');
        if (!address) {
          setAddress(`GPS Location (Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)})`);
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationStatus('denied');
          setLocationErrorMsg('Location permission denied. Please enable GPS or enter location details.');
        } else if (error.code === error.TIMEOUT) {
          setLocationStatus('timeout');
          setLocationErrorMsg('Location request timed out. Please retry or enter manually.');
        } else {
          setLocationStatus('error');
          setLocationErrorMsg('Unable to acquire GPS coordinates from device.');
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  };

  const handleProceedToLocation = () => {
    setApiError(null);
    setStep('location');
    if (locationStatus === 'idle') {
      handleGetLocation();
    }
  };

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) {
      setApiError('Incident location address or description is required.');
      return;
    }
    // Backend requires incidentLatitude and incidentLongitude numbers
    if (latitude === null || longitude === null) {
      setApiError('Valid GPS coordinates are required for emergency dispatch routing. Please tap "Detect My Location" or ensure coordinates are set.');
      return;
    }
    setApiError(null);
    setStep('confirm');
  };

  const handleFinalSubmit = async () => {
    if (isSubmitting) return;

    if (latitude === null || longitude === null) {
      setApiError('Valid latitude and longitude are required by dispatch. Please verify location.');
      setStep('location');
      return;
    }

    setIsSubmitting(true);
    setApiError(null);

    // Format category clearly into symptoms field so paramedics receive structured category
    const categoryPrefix = `[Category: ${selectedCategory.label}]`;
    const fullSymptoms = symptoms.trim()
      ? `${categoryPrefix} ${symptoms.trim()}`
      : `${categoryPrefix} ${selectedCategory.description}`;

    try {
      const response = await emergenciesApi.create({
        incidentLatitude: latitude,
        incidentLongitude: longitude,
        incidentAddress: address.trim(),
        symptoms: fullSymptoms,
        notes: notes.trim() || undefined,
        priority: selectedCategory.priority,
      });

      const newId = response.id;
      setIsSubmitting(false);
      onSuccess(newId);
    } catch (err: any) {
      setIsSubmitting(false);
      setApiError(
        err.message ||
          'Failed to trigger emergency SOS. Please retry immediately or contact local emergency helpline (112/108).',
      );
      setStep('confirm');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-rose-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-700/60 rounded-xl">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Request Emergency SOS</h3>
              <p className="text-xs text-rose-100">RAAH Automated Emergency Intake & Dispatch</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-rose-200 hover:text-white text-2xl font-bold p-1 rounded-lg focus:outline-hidden leading-none"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 py-2.5 text-xs font-semibold text-slate-500">
          <span className={step === 'category' ? 'text-rose-600 font-bold' : ''}>1. Emergency Type</span>
          <span className="mx-2 text-slate-300">&rarr;</span>
          <span className={step === 'location' ? 'text-rose-600 font-bold' : ''}>2. Location & Vitals</span>
          <span className="mx-2 text-slate-300">&rarr;</span>
          <span className={step === 'confirm' ? 'text-rose-600 font-bold' : ''}>3. Verify & Submit</span>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {apiError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Attention</p>
                <p>{apiError}</p>
              </div>
            </div>
          )}

          {/* STEP 1: CATEGORY SELECTION */}
          {step === 'category' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Select Emergency Condition</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Helps our dispatch algorithm assign the most appropriate response unit and prepare target hospital trauma teams.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {EMERGENCY_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition ${
                        isSelected
                          ? 'border-rose-600 bg-rose-50/70 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div
                        className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                          isSelected ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{cat.label}</div>
                        <div className="text-[11px] text-slate-500 leading-tight mt-0.5">{cat.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleProceedToLocation}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-xs transition"
                >
                  <span>Continue to Location</span>
                  <span>&rarr;</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: LOCATION & DETAILS */}
          {step === 'location' && (
            <form onSubmit={handleProceedToConfirm} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">Incident Location & GPS *</label>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={locationStatus === 'detecting'}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline"
                  >
                    {locationStatus === 'detecting' ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Detecting GPS...</span>
                      </>
                    ) : (
                      <>
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Detect My Location</span>
                      </>
                    )}
                  </button>
                </div>

                {locationStatus === 'acquired' && latitude !== null && longitude !== null && (
                  <div className="mb-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>GPS Coordinates Acquired ({latitude.toFixed(5)}, {longitude.toFixed(5)})</span>
                    </div>
                  </div>
                )}

                {locationErrorMsg && (
                  <div className="mb-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{locationErrorMsg}</span>
                  </div>
                )}

                <textarea
                  required
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter street name, building number, nearby landmark, or city..."
                  className="w-full text-xs rounded-xl border border-slate-300 p-3 focus:outline-hidden focus:border-rose-600 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Describe Symptoms or Patient State (Optional)
                </label>
                <input
                  type="text"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="e.g. Sharp chest pain radiating to left arm, sweating, breathless..."
                  className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2.5 focus:outline-hidden focus:border-rose-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Access Notes / Landmarks for Ambulance Driver (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. 3rd floor, blue gate, enter via lane opposite temple"
                  className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2.5 focus:outline-hidden focus:border-rose-600"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('category')}
                  className="w-1/3 py-2.5 px-3 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  &larr; Back
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5"
                >
                  <span>Review & Confirm SOS</span>
                  <span>&rarr;</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: REVIEW & CONFIRM */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-semibold text-slate-500">Emergency Nature:</span>
                  <span className="font-bold text-rose-600">{selectedCategory.label}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-semibold text-slate-500">Triage Priority:</span>
                  <span className="font-bold text-slate-800">{selectedCategory.priority}</span>
                </div>
                <div className="pb-2 border-b border-slate-200">
                  <span className="font-semibold text-slate-500 block mb-0.5">Location:</span>
                  <span className="font-medium text-slate-800 break-words">{address}</span>
                  {latitude !== null && longitude !== null && (
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Coordinates: {latitude.toFixed(5)}, {longitude.toFixed(5)}
                    </div>
                  )}
                </div>
                {symptoms && (
                  <div>
                    <span className="font-semibold text-slate-500 block mb-0.5">Reported Symptoms:</span>
                    <span className="text-slate-700">{symptoms}</span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Confirming will immediately initiate an active dispatch broadcast across RAAH network ambulances and nearby emergency care centers.
                </span>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('location')}
                  disabled={isSubmitting}
                  className="w-1/3 py-2.5 px-3 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold disabled:opacity-50"
                >
                  &larr; Modify
                </button>
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                  className="w-2/3 py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Transmitting SOS...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Confirm & Broadcast SOS</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

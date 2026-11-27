import React from 'react';
import { PhoneCall } from 'lucide-react';

export const InfoPages: React.FC<{ type: 'about' | 'how-it-works' | 'contact' }> = ({ type }) => {
  if (type === 'about') {
    return (
      <div className="max-w-3xl mx-auto space-y-6 py-8">
        <h1 className="text-3xl font-bold text-slate-900">About RAAH-CARE</h1>
        <p className="text-slate-600 leading-relaxed">
          RAAH-CARE is an emergency coordination network engineered to eliminate critical minutes in patient transport, hospital bed reservation, and clinical triage.
        </p>
        <div className="grid sm:grid-cols-2 gap-4 pt-4">
          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-1">Direct Patient SOS</h3>
            <p className="text-xs text-slate-500">One-click live emergency beacon with geolocation tracking and dispatch notifications.</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-1">Cura Card Identity</h3>
            <p className="text-xs text-slate-500">Secure portable patient health identity ensuring paramedics and doctors have critical medical context.</p>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'how-it-works') {
    return (
      <div className="max-w-3xl mx-auto space-y-6 py-8">
        <h1 className="text-3xl font-bold text-slate-900">How It Works</h1>
        <ol className="space-y-4">
          <li className="p-4 bg-white rounded-xl border border-slate-200 flex gap-4 items-start">
            <span className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 font-bold flex items-center justify-center shrink-0">1</span>
            <div>
              <h3 className="font-semibold text-slate-900">Request Emergency Assistance</h3>
              <p className="text-xs text-slate-500 mt-1">Tap the Emergency SOS button, confirm your location, and describe critical symptoms.</p>
            </div>
          </li>
          <li className="p-4 bg-white rounded-xl border border-slate-200 flex gap-4 items-start">
            <span className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 font-bold flex items-center justify-center shrink-0">2</span>
            <div>
              <h3 className="font-semibold text-slate-900">Ambulance Dispatch</h3>
              <p className="text-xs text-slate-500 mt-1">The nearest suitable ambulance and paramedic team is dynamically dispatched to your location.</p>
            </div>
          </li>
          <li className="p-4 bg-white rounded-xl border border-slate-200 flex gap-4 items-start">
            <span className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 font-bold flex items-center justify-center shrink-0">3</span>
            <div>
              <h3 className="font-semibold text-slate-900">Live Tracking & Hospital Handover</h3>
              <p className="text-xs text-slate-500 mt-1">Track the ambulance in real time while target hospitals prepare specialized trauma or ICU beds.</p>
            </div>
          </li>
        </ol>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8 text-center">
      <h1 className="text-3xl font-bold text-slate-900">Contact Emergency Services</h1>
      <p className="text-slate-600">For life-threatening emergencies, call national emergency numbers directly or trigger the RAAH SOS beacon.</p>
      <div className="p-6 bg-rose-50 rounded-2xl border border-rose-200 inline-block text-left w-full">
        <div className="flex items-center gap-3 mb-3">
          <PhoneCall className="w-6 h-6 text-rose-600" />
          <span className="font-bold text-slate-900">Direct Helpline: 112 / 108</span>
        </div>
        <p className="text-xs text-slate-600">RAAH Operations Center is continuously monitoring active emergency requests.</p>
      </div>
    </div>
  );
};

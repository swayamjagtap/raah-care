import React from 'react';
import { Building2, Bed, Activity, ShieldCheck, HeartPulse } from 'lucide-react';
import { useAuth } from '@raah/auth';
import { UserRole, getPortalTitleForRole, getPortalDescriptionForRole } from '@raah/shared-types';

export const HospitalDashboardPage: React.FC = () => {
  const { profile } = useAuth();
  const role = profile?.role || UserRole.DOCTOR;
  const title = getPortalTitleForRole(role);
  const description = getPortalDescriptionForRole(role);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-emerald-600" />
            <span>{title}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Facility Open / Receiving Emergencies
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inbound Transit</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">0 Incoming Units</div>
          <p className="text-xs text-slate-500 mt-1">Real-time ETA telemetry will appear upon ambulance dispatch.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ICU / Trauma Beds</span>
            <Bed className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">14 Available / 18 Total</div>
          <p className="text-xs text-slate-500 mt-1">4 reserved for inbound stabilization cases</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Handover Readiness</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">Triage Station Ready</div>
          <p className="text-xs text-slate-500 mt-1">Clinical staff on standby · Secure digital handover active</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 text-sm">
        <div className="max-w-md mx-auto space-y-2">
          <HeartPulse className="w-8 h-8 text-emerald-600 mx-auto opacity-80" />
          <h3 className="text-base font-bold text-slate-800">No Pending Emergency Handovers</h3>
          <p className="text-xs text-slate-500">
            Emergency cases assigned to this medical center will stream live vitals and pre-arrival notifications here.
          </p>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Ambulance, Navigation, Activity, ShieldCheck, MapPin } from 'lucide-react';
import { useAuth } from '@raah/auth';
import { UserRole, getPortalTitleForRole, getPortalDescriptionForRole } from '@raah/shared-types';

export const AmbulanceDashboardPage: React.FC = () => {
  const { profile } = useAuth();
  const role = profile?.role || UserRole.AMBULANCE_DRIVER;
  const title = getPortalTitleForRole(role);
  const description = getPortalDescriptionForRole(role);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Ambulance className="w-6 h-6 text-blue-600" />
            <span>{title}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Unit Available / On Duty
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Mission</span>
            <Activity className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">No Active Mission</div>
          <p className="text-xs text-slate-500 mt-1">Standby mode. Awaiting automated or dispatcher allocation.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Vehicle</span>
            <Navigation className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">ALS Unit-04</div>
          <p className="text-xs text-slate-500 mt-1">Advanced Life Support · Telemetry Online</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Shift Readiness</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">Cleared for Dispatch</div>
          <p className="text-xs text-slate-500 mt-1">GPS lock confirmed · Medical equipment verified</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 text-sm">
        <div className="max-w-md mx-auto space-y-2">
          <MapPin className="w-8 h-8 text-blue-600 mx-auto opacity-80" />
          <h3 className="text-base font-bold text-slate-800">Mission Queue Idle</h3>
          <p className="text-xs text-slate-500">
            Incoming emergency cases and turn-by-turn routing telemetry will activate upon dispatch.
          </p>
        </div>
      </div>
    </div>
  );
};

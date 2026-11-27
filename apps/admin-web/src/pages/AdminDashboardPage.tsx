import React from 'react';
import { PhoneCall, ShieldAlert, Radio, Activity, Ambulance, Building } from 'lucide-react';
import { useAuth } from '@raah/auth';
import { UserRole, getPortalTitleForRole, getPortalDescriptionForRole } from '@raah/shared-types';

export const AdminDashboardPage: React.FC = () => {
  const { profile } = useAuth();
  const role = profile?.role || UserRole.DISPATCHER;
  const title = getPortalTitleForRole(role);
  const description = getPortalDescriptionForRole(role);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-600" />
            <span>{title}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Dispatch Engine Live · SLA Monitoring Active
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Open Emergencies</span>
            <Radio className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">0 Active Cases</div>
          <p className="text-xs text-slate-500 mt-1">Real-time SOS triage feed standing by.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fleet Online</span>
            <Ambulance className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">8 Units Deployed</div>
          <p className="text-xs text-slate-500 mt-1">6 Idle / 2 On Mission</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Network Hospitals</span>
            <Building className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">12 Connected</div>
          <p className="text-xs text-slate-500 mt-1">All telemetry endpoints responding</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Average Dispatch SLA</span>
            <Activity className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">42 Seconds</div>
          <p className="text-xs text-slate-500 mt-1">Within optimal response threshold</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 text-sm">
        <div className="max-w-md mx-auto space-y-2">
          <PhoneCall className="w-8 h-8 text-amber-600 mx-auto opacity-80" />
          <h3 className="text-base font-bold text-slate-800">Dispatch CAD Terminal Ready</h3>
          <p className="text-xs text-slate-500">
            Emergency intake queue and automated spatial triage engine will stream incidents as they are reported.
          </p>
        </div>
      </div>
    </div>
  );
};

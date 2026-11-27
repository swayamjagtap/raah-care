import React from 'react';
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Ambulance,
  Building2,
  Activity,
  UserCheck,
} from 'lucide-react';
import type { CaseEvent, CaseStatus } from '@raah/shared-types';

interface EmergencyTimelineProps {
  status: CaseStatus;
  events?: CaseEvent[];
}

interface StepDefinition {
  statusKey: CaseStatus[];
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const LIFECYCLE_STEPS: StepDefinition[] = [
  {
    statusKey: ['CREATED', 'DISPATCHING'],
    label: 'Request Received & Triage',
    description: 'Emergency registered. Dispatch engine is locating and triaging available units.',
    icon: Activity,
  },
  {
    statusKey: ['AMBULANCE_ASSIGNED'],
    label: 'Ambulance Assigned',
    description: 'Emergency response vehicle allocated. Crew notified of mission coordinates.',
    icon: Ambulance,
  },
  {
    statusKey: ['AMBULANCE_EN_ROUTE'],
    label: 'Ambulance En Route',
    description: 'Crew accepted assignment and is traveling to your incident location.',
    icon: Ambulance,
  },
  {
    statusKey: ['ARRIVED_AT_SCENE'],
    label: 'Ambulance Arrived at Scene',
    description: 'Paramedic crew arrived on-site and initiating clinical assessment.',
    icon: UserCheck,
  },
  {
    statusKey: ['PATIENT_ONBOARD'],
    label: 'Patient Transport in Progress',
    description: 'Patient secured in ambulance; vitals stabilization in progress.',
    icon: Activity,
  },
  {
    statusKey: ['HOSPITAL_SELECTED', 'HOSPITAL_NOTIFIED', 'EN_ROUTE_TO_HOSPITAL'],
    label: 'Hospital Notified & Transit',
    description: 'Receiving hospital trauma/ICU team confirmed and preparing reception.',
    icon: Building2,
  },
  {
    statusKey: ['ARRIVED_AT_HOSPITAL', 'HANDOVER_IN_PROGRESS'],
    label: 'Hospital Arrival & Handover',
    description: 'Ambulance arrived at emergency department. Clinical handover underway.',
    icon: Building2,
  },
  {
    statusKey: ['COMPLETED'],
    label: 'Emergency Completed',
    description: 'Care successfully transferred to the hospital medical team.',
    icon: CheckCircle2,
  },
];

export const EmergencyTimeline: React.FC<EmergencyTimelineProps> = ({ status, events = [] }) => {
  const isCancelled = status === 'CANCELLED';

  const getCurrentStepIndex = (): number => {
    if (isCancelled) return -1;
    for (let i = 0; i < LIFECYCLE_STEPS.length; i++) {
      if (LIFECYCLE_STEPS[i].statusKey.includes(status)) {
        return i;
      }
    }
    return 0;
  };

  const currentStepIdx = getCurrentStepIndex();

  if (isCancelled) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-100 rounded-full text-rose-600">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-bold text-rose-900">Emergency Case Cancelled</h4>
            <p className="text-xs text-rose-700 mt-0.5">
              This emergency request was cancelled or discontinued. If you still require urgent help, initiate a new SOS immediately.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-rose-600" />
            <span>Response Lifecycle & Timeline</span>
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time milestone progression confirmed by dispatcher CAD and vehicle telemetry.
          </p>
        </div>
        <div className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-700 rounded-full w-fit">
          Status: <span className="text-rose-600">{status}</span>
        </div>
      </div>

      {/* Stepper */}
      <div className="relative pl-6 space-y-6 before:absolute before:bottom-3 before:top-3 before:left-[17px] before:w-0.5 before:bg-slate-200">
        {LIFECYCLE_STEPS.map((stepDef, idx) => {
          const isPassed = idx < currentStepIdx;
          const isCurrent = idx === currentStepIdx;
          const StepIcon = stepDef.icon;

          return (
            <div key={stepDef.label} className="relative flex items-start gap-4">
              <div
                className={`absolute -left-6 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ring-4 ring-white transition-all ${
                  isPassed
                    ? 'bg-emerald-600 text-white'
                    : isCurrent
                      ? 'bg-rose-600 text-white ring-rose-100 animate-pulse'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}
              >
                {isPassed ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : isCurrent ? (
                  <StepIcon className="h-3.5 w-3.5" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>

              <div className="pt-0.5">
                <div
                  className={`text-xs font-bold leading-tight ${
                    isCurrent
                      ? 'text-rose-600'
                      : isPassed
                        ? 'text-slate-900'
                        : 'text-slate-400'
                  }`}
                >
                  {stepDef.label}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {stepDef.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Verified Event Audit Trail */}
      {events && events.length > 0 && (
        <div className="border-t border-slate-100 pt-4 mt-6">
          <h5 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Recorded Dispatch Events</span>
          </h5>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="text-[11px] bg-slate-50 border border-slate-100 rounded-lg p-2.5 flex items-start justify-between gap-3"
              >
                <div>
                  <span className="font-semibold text-slate-800">{evt.eventType}</span>
                  {evt.notes && <span className="text-slate-500 block text-[10px]">{evt.notes}</span>}
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {new Date(evt.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

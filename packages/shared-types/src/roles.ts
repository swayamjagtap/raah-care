import { UserRole } from './auth';

/**
 * Maps a RAAH user role to its primary portal route (within that specific role's portal or context).
 */
export function getPortalForRole(role: UserRole | string): string {
  switch (role) {
    case UserRole.PATIENT:
    case UserRole.CAREGIVER:
      return '/emergency';
    case UserRole.DISPATCHER:
      return '/dashboard';
    case UserRole.PARAMEDIC:
    case UserRole.AMBULANCE_DRIVER:
      return '/dashboard';
    case UserRole.DOCTOR:
    case UserRole.HOSPITAL_ADMIN:
      return '/dashboard';
    case UserRole.SYSTEM_ADMIN:
      return '/dashboard';
    default:
      return '/';
  }
}

/**
 * Formats a raw UserRole enum string into a human-readable display name.
 * Prevents raw enum strings like AMBULANCE_DRIVER from leaking into UI.
 */
export function getRoleDisplayName(role: UserRole | string): string {
  switch (role) {
    case UserRole.PATIENT:
      return 'Patient';
    case UserRole.CAREGIVER:
      return 'Caregiver';
    case UserRole.DISPATCHER:
      return 'Dispatcher';
    case UserRole.AMBULANCE_DRIVER:
      return 'Ambulance Driver';
    case UserRole.PARAMEDIC:
      return 'Paramedic';
    case UserRole.DOCTOR:
      return 'Doctor';
    case UserRole.HOSPITAL_ADMIN:
      return 'Hospital Admin';
    case UserRole.SYSTEM_ADMIN:
      return 'System Admin';
    default:
      return role;
  }
}

/**
 * Returns the human-readable portal/dashboard title for a specific user role.
 */
export function getPortalTitleForRole(role: UserRole | string): string {
  switch (role) {
    case UserRole.PATIENT:
    case UserRole.CAREGIVER:
      return 'Patient Portal';
    case UserRole.DISPATCHER:
      return 'Dispatcher Dashboard';
    case UserRole.AMBULANCE_DRIVER:
      return 'Ambulance Portal';
    case UserRole.PARAMEDIC:
      return 'Paramedic Portal';
    case UserRole.DOCTOR:
      return 'Doctor Portal';
    case UserRole.HOSPITAL_ADMIN:
      return 'Hospital Dashboard';
    case UserRole.SYSTEM_ADMIN:
      return 'Admin Dashboard';
    default:
      return 'Portal';
  }
}

/**
 * Returns the standardized portal description for a specific role.
 */
export function getPortalDescriptionForRole(role: UserRole | string): string {
  switch (role) {
    case UserRole.PATIENT:
    case UserRole.CAREGIVER:
      return 'Emergency SOS, live response tracking, Cura Card, and emergency history.';
    case UserRole.DISPATCHER:
      return 'Emergency intake, assisted triage, ambulance coordination, and hospital destination management.';
    case UserRole.AMBULANCE_DRIVER:
      return 'Mission assignments, navigation/status updates, patient transport, and hospital handover.';
    case UserRole.PARAMEDIC:
      return 'Assigned emergency missions, patient transport, clinical handover, and hospital coordination.';
    case UserRole.DOCTOR:
      return 'Incoming emergency cases, patient reception, and hospital handover management.';
    case UserRole.HOSPITAL_ADMIN:
      return 'Hospital resources, incoming emergencies, bed/resource availability, and reception coordination.';
    case UserRole.SYSTEM_ADMIN:
      return 'System administration, user provisioning, role management, and platform oversight.';
    default:
      return 'Access your role-specific emergency care coordination tools.';
  }
}

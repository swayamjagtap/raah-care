import React from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from './useAuth';
import { AuthState } from './authContextInstance';
import { UserRole, getRoleDisplayName } from '@raah/shared-types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  loginPath?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  loginPath = '/login',
}) => {
  const { session, profile, authState, isLoading } = useAuth();
  const location = useLocation();

  // 1. Initializing -> wait for session resolution before redirecting
  if (isLoading || authState === AuthState.INITIALIZING) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-rose-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-600">Verifying session...</p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated -> redirect to login
  if (!session || authState === AuthState.UNAUTHENTICATED || authState === AuthState.EMAIL_CONFIRMATION_PENDING) {
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // 3. Authenticated in Supabase but unlinked in RAAH DB -> redirect to registration/onboarding
  if (authState === AuthState.AUTHENTICATED_UNLINKED && location.pathname !== '/register') {
    return <Navigate to="/register" replace />;
  }

  // 4. Role-based authorization guard
  if (allowedRoles && allowedRoles.length > 0 && profile) {
    if (!allowedRoles.includes(profile.role)) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-slate-50">
          <div className="max-w-md rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
            <p className="mt-2 text-sm text-slate-600">
              Your role <span className="font-semibold text-slate-800">({getRoleDisplayName(profile.role)})</span> is not authorized to access this portal area.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <a
                href="/"
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 transition"
              >
                Return to Home
              </a>
            </div>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

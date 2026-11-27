import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router';
import { useAuth } from '@raah/auth';
import { Building2, LogOut } from 'lucide-react';
import { getRoleDisplayName, UserRole } from '@raah/shared-types';

const CURRENT_YEAR = new Date().getFullYear();

export const HospitalLayout: React.FC = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isDoctor = profile?.role === UserRole.DOCTOR;
  const portalName = isDoctor ? 'RAAH Doctor Portal' : 'RAAH Hospital Dashboard';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="flex items-center gap-2 font-bold text-emerald-700 text-lg shrink-0">
              <Building2 className="h-6 w-6 text-emerald-600" />
              <span>{portalName}</span>
            </Link>
            {profile && (
              <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-slate-600">
                <Link to="/dashboard" className="hover:text-emerald-600 transition-colors">
                  Dashboard
                </Link>
                <Link to="/emergencies" className="hover:text-emerald-600 transition-colors">
                  Incoming Cases
                </Link>
                <Link to="/beds" className="hover:text-emerald-600 transition-colors">
                  Beds
                </Link>
                <Link to="/resources" className="hover:text-emerald-600 transition-colors">
                  Resources
                </Link>
                <Link to="/handover" className="hover:text-emerald-600 transition-colors">
                  Handover
                </Link>
                <Link to="/cura-card-scan" className="hover:text-emerald-600 transition-colors font-bold text-sky-700">
                  Cura Card Scanner
                </Link>
                <Link to="/staff" className="hover:text-emerald-600 transition-colors">
                  Staff
                </Link>
              </nav>
            )}
          </div>

          <div className="flex items-center gap-3">
            {profile ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-sm font-semibold text-slate-900 leading-tight">
                    {profile.name}
                  </span>
                  <span className="text-xs text-emerald-700 font-medium">
                    {getRoleDisplayName(profile.role)}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>&copy; {CURRENT_YEAR} RAAH Emergency Care Network. Hospital Operations Terminal.</span>
          <span className="font-medium text-slate-400">Clinical Destination Ready</span>
        </div>
      </footer>
    </div>
  );
};

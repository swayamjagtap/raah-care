import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router';
import { useAuth } from '@raah/auth';
import { Ambulance, LogOut } from 'lucide-react';
import { getRoleDisplayName, UserRole } from '@raah/shared-types';

const CURRENT_YEAR = new Date().getFullYear();

export const AmbulanceLayout: React.FC = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isParamedic = profile?.role === UserRole.PARAMEDIC;
  const portalName = isParamedic ? 'RAAH Paramedic Portal' : 'RAAH Ambulance Portal';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="flex items-center gap-2 font-bold text-blue-600 text-lg shrink-0">
              <Ambulance className="h-6 w-6 text-blue-600" />
              <span>{portalName}</span>
            </Link>
            {profile && (
              <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-slate-600">
                <Link to="/dashboard" className="hover:text-blue-600 transition-colors">
                  Dashboard
                </Link>
                <Link to="/missions" className="hover:text-blue-600 transition-colors">
                  Missions
                </Link>
                <Link to="/navigation" className="hover:text-blue-600 transition-colors">
                  Navigation
                </Link>
                <Link to="/handover" className="hover:text-blue-600 transition-colors">
                  Handover
                </Link>
                <Link to="/cura-card-scan" className="hover:text-blue-600 transition-colors font-bold text-sky-700">
                  Cura Card Scanner
                </Link>
                <Link to="/history" className="hover:text-blue-600 transition-colors">
                  History
                </Link>
                <Link to="/vehicle" className="hover:text-blue-600 transition-colors">
                  Vehicle
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
                  <span className="text-xs text-blue-600 font-medium">
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
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
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
          <span>&copy; {CURRENT_YEAR} RAAH Emergency Transport Network. Authorised Medical & Crew Access Only.</span>
          <span className="font-medium text-slate-400">Emergency Dispatch Channel Active</span>
        </div>
      </footer>
    </div>
  );
};

import React from 'react';
import { Outlet, Link, NavLink, useNavigate, useLocation } from 'react-router';
import { useAuth, AuthState } from '@raah/auth';
import { HeartPulse, LogOut, ShieldAlert, FileText, QrCode, Settings } from 'lucide-react';
import { getRoleDisplayName } from '@raah/shared-types';

const CURRENT_YEAR = new Date().getFullYear();

export const PatientLayout: React.FC = () => {
  const { profile, session, authState, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const showAuthenticatedNav =
    !isAuthPage && authState === AuthState.AUTHENTICATED_LINKED && Boolean(profile);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 font-bold text-rose-600 text-lg shrink-0">
              <HeartPulse className="h-6 w-6 text-rose-600" />
              <span>RAAH Patient Care</span>
            </Link>

            {/* Authenticated Patient Portal Nav Links (hidden on auth pages or unlinked states) */}
            {showAuthenticatedNav ? (
              <nav className="hidden md:flex items-center gap-1 text-xs font-bold text-slate-600">
                <NavLink
                  to="/"
                  end
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-rose-50 text-rose-700'
                        : 'hover:text-slate-900 hover:bg-slate-100'
                    }`
                  }
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  <span>Emergency SOS</span>
                </NavLink>

                <NavLink
                  to="/medical-profile"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-rose-50 text-rose-700'
                        : 'hover:text-slate-900 hover:bg-slate-100'
                    }`
                  }
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Medical Profile</span>
                </NavLink>

                <NavLink
                  to="/cura-card"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-rose-50 text-rose-700'
                        : 'hover:text-slate-900 hover:bg-slate-100'
                    }`
                  }
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Cura Card</span>
                </NavLink>

                <NavLink
                  to="/settings"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-rose-50 text-rose-700'
                        : 'hover:text-slate-900 hover:bg-slate-100'
                    }`
                  }
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Settings</span>
                </NavLink>
              </nav>
            ) : (
              <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-slate-600">
                <Link to="/" className="hover:text-rose-600 transition-colors">
                  Overview
                </Link>
                <Link to="/about" className="hover:text-rose-600 transition-colors">
                  About
                </Link>
                <Link to="/how-it-works" className="hover:text-rose-600 transition-colors">
                  How It Works
                </Link>
                <Link to="/contact" className="hover:text-rose-600 transition-colors">
                  Contact
                </Link>
              </nav>
            )}
          </div>

          <div className="flex items-center gap-3">
            {showAuthenticatedNav && profile ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-sm font-semibold text-slate-900 leading-tight">
                    {profile.name}
                  </span>
                  <span className="text-xs text-rose-600 font-medium">
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
            ) : !isAuthPage && (session || profile) ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : !isAuthPage ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-rose-600 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-xs"
                >
                  Register
                </Link>
              </div>
            ) : null}
          </div>
        </div>

        {/* Mobile Navigation bar for authenticated users */}
        {showAuthenticatedNav && (
          <div className="md:hidden border-t border-slate-100 bg-slate-50/80 px-4 py-2 flex items-center justify-around text-[11px] font-bold text-slate-600 overflow-x-auto">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `px-2.5 py-1 rounded-md ${
                  isActive ? 'bg-white text-rose-700 shadow-2xs font-extrabold' : ''
                }`
              }
            >
              Emergency
            </NavLink>
            <NavLink
              to="/medical-profile"
              className={({ isActive }) =>
                `px-2.5 py-1 rounded-md ${
                  isActive ? 'bg-white text-rose-700 shadow-2xs font-extrabold' : ''
                }`
              }
            >
              Medical
            </NavLink>
            <NavLink
              to="/cura-card"
              className={({ isActive }) =>
                `px-2.5 py-1 rounded-md ${
                  isActive ? 'bg-white text-rose-700 shadow-2xs font-extrabold' : ''
                }`
              }
            >
              Cura Card
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `px-2.5 py-1 rounded-md ${
                  isActive ? 'bg-white text-rose-700 shadow-2xs font-extrabold' : ''
                }`
              }
            >
              Settings
            </NavLink>
          </div>
        )}
      </header>

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>&copy; {CURRENT_YEAR} RAAH-CARE Patient Network. Confidential Healthcare Platform.</span>
          <div className="flex gap-4">
            <Link to="/about" className="hover:text-rose-600">About</Link>
            <Link to="/how-it-works" className="hover:text-rose-600">How It Works</Link>
            <Link to="/contact" className="hover:text-rose-600">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { ProtectedRoute, AuthContext, AuthState } from '@raah/auth';
import { UserRole } from '@raah/shared-types';
import { PatientPortalPage } from './PatientPortalPage';
import { PatientLoginPage } from './PatientLoginPage';
import { PatientRegisterPage } from './PatientRegisterPage';
import { PatientLayout } from '../layouts/PatientLayout';

describe('Patient Web Guest and Role Boundaries', () => {
  const renderWithAuth = (authValues: any, initialPath: string, ui: React.ReactElement) => {
    return render(
      <AuthContext.Provider value={authValues}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path={initialPath} element={ui} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );
  };

  const createAuthMock = (overrides: any = {}) => {
    const profile = overrides.profile ?? null;
    const needsRegistration = overrides.needsRegistration ?? false;
    const defaultAuthState = profile
      ? AuthState.AUTHENTICATED_LINKED
      : needsRegistration
        ? AuthState.AUTHENTICATED_UNLINKED
        : AuthState.UNAUTHENTICATED;

    return {
      session: null,
      supabaseUser: null,
      profile,
      isLoading: false,
      authState: overrides.authState ?? defaultAuthState,
      needsRegistration,
      emailConfirmationPending: false,
      error: null,
      signInWithPassword: vi.fn(),
      signUpWithPassword: vi.fn(),
      signOut: vi.fn(),
      clearSession: vi.fn(),
      refreshProfile: vi.fn(),
      setEmailConfirmationPending: vi.fn(),
      ...overrides,
    };
  };

  it('allows unauthenticated guest to access public patient root with SOS button', () => {
    renderWithAuth(
      createAuthMock(),
      '/',
      <PatientPortalPage />,
    );

    expect(screen.getByText('RAAH Emergency Patient Network')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /emergency sos/i })).toBeInTheDocument();
  });

  it('allows PATIENT into protected history area', () => {
    renderWithAuth(
      createAuthMock({
        session: { user: { id: 'pat-1' } },
        profile: {
          id: 'pat-1',
          name: 'Jane Patient',
          email: 'jane@example.com',
          role: UserRole.PATIENT,
          isActive: true,
        },
      }),
      '/history',
      <ProtectedRoute allowedRoles={[UserRole.PATIENT, UserRole.CAREGIVER]}>
        <div>Protected Patient History</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText('Protected Patient History')).toBeInTheDocument();
  });

  it('rejects SYSTEM_ADMIN from protected patient features', () => {
    renderWithAuth(
      createAuthMock({
        session: { user: { id: 'sa-1' } },
        profile: {
          id: 'admin-1',
          name: 'Super Admin',
          email: 'admin@raah.care',
          role: UserRole.SYSTEM_ADMIN,
          isActive: true,
        },
      }),
      '/history',
      <ProtectedRoute allowedRoles={[UserRole.PATIENT, UserRole.CAREGIVER]}>
        <div>Protected Patient History</div>
      </ProtectedRoute>,
    );

    expect(screen.queryByText('Protected Patient History')).not.toBeInTheDocument();
    expect(screen.getByText('Access Restricted')).toBeInTheDocument();
  });

  describe('Authentication Route Stability and Landing Page Navigation', () => {
    it('unauthenticated direct navigation to /login stays on /login after auth initialization', async () => {
      render(
        <AuthContext.Provider
          value={createAuthMock({
            isLoading: false,
            needsRegistration: false,
            profile: null,
            session: null,
          })}
        >
          <MemoryRouter initialEntries={['/login']}>
            <Routes>
              <Route path="/login" element={<PatientLoginPage />} />
              <Route path="/register" element={<PatientRegisterPage />} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      // Verify it stays on the login page
      expect(screen.getByText('Sign in to Patient Portal')).toBeInTheDocument();
      expect(screen.queryByText('Patient Registration')).not.toBeInTheDocument();
    });

    it('unauthenticated direct navigation to /login stays on /login even when needsRegistration is true', async () => {
      render(
        <AuthContext.Provider
          value={createAuthMock({
            isLoading: false,
            authState: AuthState.AUTHENTICATED_UNLINKED,
            needsRegistration: true, // Supabase session exists without RAAH DB profile
            profile: null,
            session: { user: { id: 'unlinked-sub-1' } } as any,
          })}
        >
          <MemoryRouter initialEntries={['/login']}>
            <Routes>
              <Route path="/login" element={<PatientLoginPage />} />
              <Route path="/register" element={<PatientRegisterPage />} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      // Verify /login remains on /login and does NOT redirect to /register
      expect(screen.getByText('Patient Profile Registration Required')).toBeInTheDocument();
      expect(screen.queryByText('Patient Registration')).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: /complete patient profile/i })).toBeInTheDocument();
    });

    it('unauthenticated direct navigation to /register stays on /register', async () => {
      render(
        <AuthContext.Provider
          value={createAuthMock({
            isLoading: false,
            profile: null,
            session: null,
          })}
        >
          <MemoryRouter initialEntries={['/register']}>
            <Routes>
              <Route path="/login" element={<PatientLoginPage />} />
              <Route path="/register" element={<PatientRegisterPage />} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      expect(screen.getByText('Patient Registration')).toBeInTheDocument();
      expect(screen.queryByText('Sign in to Patient Portal')).not.toBeInTheDocument();
    });

    it('landing page Sign In navigates to /login', async () => {
      render(
        <AuthContext.Provider
          value={createAuthMock({
            isLoading: false,
            profile: null,
            session: null,
          })}
        >
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route element={<PatientLayout />}>
                <Route path="/" element={<div>Home Overview Page</div>} />
                <Route path="/login" element={<PatientLoginPage />} />
                <Route path="/register" element={<PatientRegisterPage />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      expect(screen.getByText('Home Overview Page')).toBeInTheDocument();

      const signInLink = screen.getByRole('link', { name: /^sign in$/i });
      fireEvent.click(signInLink);

      expect(await screen.findByText('Sign in to Patient Portal')).toBeInTheDocument();
      expect(screen.queryByText('Patient Registration')).not.toBeInTheDocument();
    });

    it('landing page Register navigates to /register', async () => {
      render(
        <AuthContext.Provider
          value={createAuthMock({
            isLoading: false,
            profile: null,
            session: null,
          })}
        >
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route element={<PatientLayout />}>
                <Route path="/" element={<div>Home Overview Page</div>} />
                <Route path="/login" element={<PatientLoginPage />} />
                <Route path="/register" element={<PatientRegisterPage />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      const registerLink = screen.getByRole('link', { name: /^register$/i });
      fireEvent.click(registerLink);

      expect(await screen.findByText('Patient Registration')).toBeInTheDocument();
      expect(screen.queryByText('Sign in to Patient Portal')).not.toBeInTheDocument();
    });

    it('authenticated patient on /login is redirected to /', async () => {
      render(
        <AuthContext.Provider
          value={createAuthMock({
            isLoading: false,
            session: { user: { id: 'pat-1' } } as any,
            profile: {
              id: 'pat-1',
              name: 'Jane Patient',
              email: 'jane@example.com',
              role: UserRole.PATIENT,
              isActive: true,
            },
          })}
        >
          <MemoryRouter initialEntries={['/login']}>
            <Routes>
              <Route path="/login" element={<PatientLoginPage />} />
              <Route path="/" element={<div>Authenticated Patient Home</div>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      await waitFor(() => {
        expect(screen.getByText('Authenticated Patient Home')).toBeInTheDocument();
      });
      expect(screen.queryByText('Sign in to Patient Portal')).not.toBeInTheDocument();
    });
  });
});

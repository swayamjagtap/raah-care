import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import {
  AuthContext,
  AuthState,
  ProtectedRoute,
  validateAndNormalizeIndianPhone,
} from '@raah/auth';
import { UserRole } from '@raah/shared-types';
import { authApi } from '@raah/api-client';
import { PatientRegisterPage } from './PatientRegisterPage';
import { PatientLoginPage } from './PatientLoginPage';
import { PatientPortalPage } from './PatientPortalPage';
import { PatientLayout } from '../layouts/PatientLayout';

vi.mock('@raah/api-client', () => ({
  authApi: {
    registerPatient: vi.fn(),
    getMe: vi.fn(),
  },
  supabase: {
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

describe('Patient Authentication Complete Lifecycle & Robustness Suite', () => {
  const mockLinkedPatient = {
    id: 'pat-uid-100',
    name: 'Rohan Verma',
    email: 'rohan@example.com',
    phone: '+919876543210',
    role: UserRole.PATIENT,
    isActive: true,
  };

  const createMockAuth = (overrides = {}) => ({
    session: null,
    supabaseUser: null,
    profile: null,
    isLoading: false,
    authState: AuthState.UNAUTHENTICATED,
    error: null,
    needsRegistration: false,
    emailConfirmationPending: false,
    signInWithPassword: vi.fn(),
    signUpWithPassword: vi.fn(),
    signOut: vi.fn(),
    clearSession: vi.fn(),
    refreshProfile: vi.fn(),
    setEmailConfirmationPending: vi.fn(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Phone Number Validation & Normalization', () => {
    it('rejects empty or whitespace phone numbers', () => {
      expect(validateAndNormalizeIndianPhone('').isValid).toBe(false);
      expect(validateAndNormalizeIndianPhone('   ').isValid).toBe(false);
    });

    it('rejects arbitrary short numeric strings such as 987654', () => {
      const res = validateAndNormalizeIndianPhone('987654');
      expect(res.isValid).toBe(false);
      expect(res.error).toMatch(/too short|10-digit/i);
    });

    it('rejects invalid prefixes or alpha characters', () => {
      expect(validateAndNormalizeIndianPhone('1234567890').isValid).toBe(false);
      expect(validateAndNormalizeIndianPhone('abcdefghij').isValid).toBe(false);
      expect(validateAndNormalizeIndianPhone('5555555555').isValid).toBe(false);
    });

    it('accepts and normalizes valid 10-digit Indian mobile numbers', () => {
      const res1 = validateAndNormalizeIndianPhone('9876543210');
      expect(res1.isValid).toBe(true);
      expect(res1.normalized).toBe('+919876543210');

      const res2 = validateAndNormalizeIndianPhone('+91 98765 43210');
      expect(res2.isValid).toBe(true);
      expect(res2.normalized).toBe('+919876543210');

      const res3 = validateAndNormalizeIndianPhone('09876543210');
      expect(res3.isValid).toBe(true);
      expect(res3.normalized).toBe('+919876543210');

      const res4 = validateAndNormalizeIndianPhone('+91-87654-32109');
      expect(res4.isValid).toBe(true);
      expect(res4.normalized).toBe('+918765432109');
    });
  });

  describe('2. Fresh Registration Lifecycle', () => {
    it('displays all four required fields for unauthenticated fresh registration', () => {
      render(
        <AuthContext.Provider value={createMockAuth({ authState: AuthState.UNAUTHENTICATED })}>
          <MemoryRouter initialEntries={['/register']}>
            <PatientRegisterPage />
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      expect(screen.getByLabelText(/full name \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/mobile phone number \*/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /register patient account/i })).toBeInTheDocument();
    });

    it('rejects short invalid phone number on fresh registration submit', async () => {
      const mockSignUp = vi.fn();
      render(
        <AuthContext.Provider
          value={createMockAuth({
            authState: AuthState.UNAUTHENTICATED,
            signUpWithPassword: mockSignUp,
          })}
        >
          <MemoryRouter initialEntries={['/register']}>
            <PatientRegisterPage />
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      fireEvent.change(screen.getByLabelText(/full name \*/i), { target: { value: 'Aarav Patel' } });
      fireEvent.change(screen.getByLabelText(/email address \*/i), { target: { value: 'aarav@example.com' } });
      fireEvent.change(screen.getByLabelText(/password \*/i), { target: { value: 'password123' } });
      fireEvent.change(screen.getByLabelText(/mobile phone number \*/i), { target: { value: '987654' } });

      fireEvent.click(screen.getByRole('button', { name: /register patient account/i }));

      expect(mockSignUp).not.toHaveBeenCalled();
      expect(await screen.findByText(/too short|valid 10-digit/i)).toBeInTheDocument();
    });

    it('displays email confirmation pending screen when Supabase sign-up requires confirmation', async () => {
      const mockSignUp = vi.fn().mockResolvedValue({ session: null, user: { id: 'u1' } });

      render(
        <AuthContext.Provider
          value={createMockAuth({
            authState: AuthState.UNAUTHENTICATED,
            signUpWithPassword: mockSignUp,
          })}
        >
          <MemoryRouter initialEntries={['/register']}>
            <PatientRegisterPage />
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      fireEvent.change(screen.getByLabelText(/full name \*/i), { target: { value: 'Aarav Patel' } });
      fireEvent.change(screen.getByLabelText(/email address \*/i), { target: { value: 'aarav@example.com' } });
      fireEvent.change(screen.getByLabelText(/password \*/i), { target: { value: 'password123' } });
      fireEvent.change(screen.getByLabelText(/mobile phone number \*/i), { target: { value: '9876543210' } });

      fireEvent.click(screen.getByRole('button', { name: /register patient account/i }));

      expect(mockSignUp).toHaveBeenCalledWith('aarav@example.com', 'password123');
      expect(await screen.findByText('Check Your Email')).toBeInTheDocument();
      expect(screen.getByText(/aarav@example\.com/)).toBeInTheDocument();
    });
  });

  describe('3. Registration After Confirmed Supabase Session (Profile Completion)', () => {
    it('displays deliberate patient profile-completion screen with read-only confirmed email', () => {
      render(
        <AuthContext.Provider
          value={createMockAuth({
            authState: AuthState.AUTHENTICATED_UNLINKED,
            session: {
              user: {
                id: 'sub-new-1',
                email: 'confirmed.user@gmail.com',
              },
            } as any,
          })}
        >
          <MemoryRouter initialEntries={['/register']}>
            <PatientRegisterPage />
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      expect(screen.getByText('Complete Patient Profile')).toBeInTheDocument();
      expect(screen.getByText('confirmed.user@gmail.com')).toBeInTheDocument();
      expect(screen.getByText('Verified Email Identity')).toBeInTheDocument();

      // Password and Email inputs should not be present
      expect(screen.queryByLabelText(/password \*/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/^email address \*/i)).not.toBeInTheDocument();

      // Full Name and Mobile Phone inputs must be present
      expect(screen.getByLabelText(/full name \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/mobile phone number \*/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /complete & link profile/i })).toBeInTheDocument();
    });

    it('allows switching account / starting fresh registration instead of reusing unrelated session', () => {
      const mockClearSession = vi.fn();
      render(
        <AuthContext.Provider
          value={createMockAuth({
            authState: AuthState.AUTHENTICATED_UNLINKED,
            session: {
              user: {
                id: 'sub-old-1',
                email: 'old.account@gmail.com',
              },
            } as any,
            clearSession: mockClearSession,
          })}
        >
          <MemoryRouter initialEntries={['/register']}>
            <PatientRegisterPage />
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      const switchBtn = screen.getByRole('button', { name: /start fresh registration/i });
      fireEvent.click(switchBtn);

      expect(mockClearSession).toHaveBeenCalled();
    });

    it('successfully links backend patient profile and refreshes session', async () => {
      vi.mocked(authApi.registerPatient).mockResolvedValueOnce(mockLinkedPatient as any);
      const mockRefresh = vi.fn();

      render(
        <AuthContext.Provider
          value={createMockAuth({
            authState: AuthState.AUTHENTICATED_UNLINKED,
            session: {
              user: {
                id: 'sub-new-1',
                email: 'confirmed.user@gmail.com',
              },
            } as any,
            refreshProfile: mockRefresh,
          })}
        >
          <MemoryRouter initialEntries={['/register']}>
            <Routes>
              <Route path="/register" element={<PatientRegisterPage />} />
              <Route path="/" element={<div>Patient Portal Home</div>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      fireEvent.change(screen.getByLabelText(/full name \*/i), { target: { value: 'Kiran Rao' } });
      fireEvent.change(screen.getByLabelText(/mobile phone number \*/i), { target: { value: '9876543210' } });

      fireEvent.click(screen.getByRole('button', { name: /complete & link profile/i }));

      await waitFor(() => {
        expect(authApi.registerPatient).toHaveBeenCalledWith({
          name: 'Kiran Rao',
          email: 'confirmed.user@gmail.com',
          phone: '+919876543210',
        });
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('displays error and restores button if backend linking fails', async () => {
      vi.mocked(authApi.registerPatient).mockRejectedValueOnce(new Error('Backend connection timeout'));

      render(
        <AuthContext.Provider
          value={createMockAuth({
            authState: AuthState.AUTHENTICATED_UNLINKED,
            session: {
              user: {
                id: 'sub-new-1',
                email: 'confirmed.user@gmail.com',
              },
            } as any,
          })}
        >
          <MemoryRouter initialEntries={['/register']}>
            <PatientRegisterPage />
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      fireEvent.change(screen.getByLabelText(/full name \*/i), { target: { value: 'Kiran Rao' } });
      fireEvent.change(screen.getByLabelText(/mobile phone number \*/i), { target: { value: '9876543210' } });

      const submitBtn = screen.getByRole('button', { name: /complete & link profile/i });
      fireEvent.click(submitBtn);

      expect(await screen.findByText('Backend connection timeout')).toBeInTheDocument();
      // Verify button is restored and clickable for retry
      expect(submitBtn).toBeEnabled();
    });
  });

  describe('4. Sign-In Flow and Button State Stability', () => {
    it('restores button state and displays actionable error for invalid credentials', async () => {
      const mockSignIn = vi.fn().mockRejectedValueOnce(new Error('Invalid login credentials'));

      render(
        <AuthContext.Provider
          value={createMockAuth({
            authState: AuthState.UNAUTHENTICATED,
            signInWithPassword: mockSignIn,
          })}
        >
          <MemoryRouter initialEntries={['/login']}>
            <PatientLoginPage />
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      fireEvent.change(screen.getByLabelText(/email address \*/i), { target: { value: 'wrong@example.com' } });
      fireEvent.change(screen.getByLabelText(/password \*/i), { target: { value: 'badpass' } });

      const submitBtn = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitBtn);

      expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
      expect(submitBtn).toBeEnabled();
      expect(submitBtn).toHaveTextContent('Sign In');
    });

    it('shows actionable notice when email is unconfirmed', async () => {
      const mockSignIn = vi.fn().mockRejectedValueOnce(new Error('Email not confirmed'));

      render(
        <AuthContext.Provider
          value={createMockAuth({
            authState: AuthState.UNAUTHENTICATED,
            signInWithPassword: mockSignIn,
          })}
        >
          <MemoryRouter initialEntries={['/login']}>
            <PatientLoginPage />
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      fireEvent.change(screen.getByLabelText(/email address \*/i), { target: { value: 'unconfirmed@example.com' } });
      fireEvent.change(screen.getByLabelText(/password \*/i), { target: { value: 'password123' } });

      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      expect(
        await screen.findByText(/email not confirmed.*check your inbox/i),
      ).toBeInTheDocument();
    });

    it('displays unlinked profile banner on /login if authenticated in Supabase but unlinked in RAAH DB', () => {
      render(
        <AuthContext.Provider
          value={createMockAuth({
            authState: AuthState.AUTHENTICATED_UNLINKED,
            session: { user: { id: 'unlinked-1' } } as any,
            profile: null,
          })}
        >
          <MemoryRouter initialEntries={['/login']}>
            <PatientLoginPage />
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      expect(screen.getByText('Patient Profile Registration Required')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /complete patient profile/i })).toBeInTheDocument();
    });

    it('redirects to dashboard only after both Supabase authentication and profile verification succeed', async () => {
      render(
        <AuthContext.Provider
          value={createMockAuth({
            authState: AuthState.AUTHENTICATED_LINKED,
            profile: mockLinkedPatient,
            session: { user: { id: 'pat-uid-100' } } as any,
          })}
        >
          <MemoryRouter initialEntries={['/login']}>
            <Routes>
              <Route path="/login" element={<PatientLoginPage />} />
              <Route path="/" element={<div>Dashboard Home Page</div>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      await waitFor(() => {
        expect(screen.getByText('Dashboard Home Page')).toBeInTheDocument();
      });
      expect(screen.queryByText('Sign in to Patient Portal')).not.toBeInTheDocument();
    });
  });

  describe('5. Protected Route & Navigation Isolation', () => {
    it('redirects unverified or unauthenticated users attempting to access protected routes', () => {
      render(
        <AuthContext.Provider value={createMockAuth({ authState: AuthState.UNAUTHENTICATED })}>
          <MemoryRouter initialEntries={['/medical-profile']}>
            <Routes>
              <Route path="/login" element={<div>Login Page Target</div>} />
              <Route
                path="/medical-profile"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.PATIENT, UserRole.CAREGIVER]}>
                    <div>Protected Medical Profile</div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      expect(screen.getByText('Login Page Target')).toBeInTheDocument();
      expect(screen.queryByText('Protected Medical Profile')).not.toBeInTheDocument();
    });

    it('redirects AUTHENTICATED_UNLINKED users attempting to access protected routes to /register', () => {
      render(
        <AuthContext.Provider
          value={createMockAuth({
            authState: AuthState.AUTHENTICATED_UNLINKED,
            session: { user: { id: 'unlinked-sub' } } as any,
          })}
        >
          <MemoryRouter initialEntries={['/medical-profile']}>
            <Routes>
              <Route path="/register" element={<div>Register / Profile Completion Page</div>} />
              <Route
                path="/medical-profile"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.PATIENT, UserRole.CAREGIVER]}>
                    <div>Protected Medical Profile</div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      expect(screen.getByText('Register / Profile Completion Page')).toBeInTheDocument();
      expect(screen.queryByText('Protected Medical Profile')).not.toBeInTheDocument();
    });

    it('auth pages do not render authenticated portal navigation simultaneously', () => {
      render(
        <AuthContext.Provider
          value={createMockAuth({
            authState: AuthState.AUTHENTICATED_LINKED,
            profile: mockLinkedPatient,
            session: { user: { id: 'pat-uid-100' } } as any,
          })}
        >
          <MemoryRouter initialEntries={['/login']}>
            <Routes>
              <Route element={<PatientLayout />}>
                <Route path="/login" element={<div>Isolated Login Page</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      expect(screen.getByText('Isolated Login Page')).toBeInTheDocument();
      // Authenticated portal navigation tabs must not be visible on auth pages
      expect(screen.queryByRole('link', { name: /emergency sos/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /medical profile/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /cura card/i })).not.toBeInTheDocument();
    });

    it('sign-out clears authenticated state and removes portal navigation', async () => {
      const mockSignOut = vi.fn();
      render(
        <AuthContext.Provider
          value={createMockAuth({
            authState: AuthState.AUTHENTICATED_LINKED,
            profile: mockLinkedPatient,
            session: { user: { id: 'pat-uid-100' } } as any,
            signOut: mockSignOut,
          })}
        >
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route element={<PatientLayout />}>
                <Route path="/" element={<div>Home Page</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      const signOutBtn = screen.getByRole('button', { name: /sign out/i });
      fireEvent.click(signOutBtn);

      expect(mockSignOut).toHaveBeenCalled();
    });

    it('landing page automatically redirects AUTHENTICATED_UNLINKED user to /register for profile completion', async () => {
      render(
        <AuthContext.Provider
          value={createMockAuth({
            authState: AuthState.AUTHENTICATED_UNLINKED,
            session: {
              user: { id: 'sub-new-001', email: 'confirmed-patient@example.com' },
            } as any,
            profile: null,
          })}
        >
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route path="/" element={<PatientPortalPage />} />
              <Route path="/register" element={<div>Patient Profile Completion Destination</div>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      await waitFor(() => {
        expect(screen.getByText('Patient Profile Completion Destination')).toBeInTheDocument();
      });
      expect(screen.queryByText('RAAH Emergency Patient Network')).not.toBeInTheDocument();
    });

    it('sign-in screen replaces credentials form with clear profile completion notice & CTA when identity is unlinked', () => {
      render(
        <AuthContext.Provider
          value={createMockAuth({
            authState: AuthState.AUTHENTICATED_UNLINKED,
            session: {
              user: { id: 'sub-new-002', email: 'unlinked@example.com' },
            } as any,
            profile: null,
          })}
        >
          <MemoryRouter initialEntries={['/login']}>
            <Routes>
              <Route path="/login" element={<PatientLoginPage />} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      // Verify notice and CTA are displayed
      expect(screen.getByText('Patient Profile Registration Required')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /complete patient profile/i })).toBeInTheDocument();
      // Ordinary credential inputs should NOT be rendered
      expect(screen.queryByLabelText(/email address/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^sign in$/i })).not.toBeInTheDocument();
    });

    it('sign-in screen does not display Sign Out header button on auth page for unlinked session', () => {
      render(
        <AuthContext.Provider
          value={createMockAuth({
            authState: AuthState.AUTHENTICATED_UNLINKED,
            session: {
              user: { id: 'sub-new-003', email: 'unlinked3@example.com' },
            } as any,
            profile: null,
          })}
        >
          <MemoryRouter initialEntries={['/login']}>
            <Routes>
              <Route element={<PatientLayout />}>
                <Route path="/login" element={<PatientLoginPage />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      expect(screen.getByText('Patient Profile Registration Required')).toBeInTheDocument();
      // Header must NOT display Sign Out on login page
      expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument();
    });
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { ProtectedRoute, AuthContext } from '@raah/auth';
import { UserRole } from '@raah/shared-types';

describe('Hospital Web Role Boundaries', () => {
  const renderWithAuth = (authValues: any, ui: React.ReactElement) => {
    return render(
      <AuthContext.Provider value={authValues}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route
              path="/dashboard"
              element={ui}
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );
  };

  it('allows DOCTOR into hospital protected area', () => {
    renderWithAuth(
      {
        session: { user: { id: 'doc-1' } },
        profile: {
          id: 'doc-1',
          name: 'Dr. Gregory',
          email: 'doc@hospital.raah.care',
          role: UserRole.DOCTOR,
          isActive: true,
        },
        isLoading: false,
        needsRegistration: false,
      },
      <ProtectedRoute allowedRoles={[UserRole.DOCTOR, UserRole.HOSPITAL_ADMIN]}>
        <div>Hospital Clinical Area</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText('Hospital Clinical Area')).toBeInTheDocument();
  });

  it('allows HOSPITAL_ADMIN into hospital protected area', () => {
    renderWithAuth(
      {
        session: { user: { id: 'ha-1' } },
        profile: {
          id: 'hosp-admin-1',
          name: 'Helen Admin',
          email: 'helen@hospital.raah.care',
          role: UserRole.HOSPITAL_ADMIN,
          isActive: true,
        },
        isLoading: false,
        needsRegistration: false,
      },
      <ProtectedRoute allowedRoles={[UserRole.DOCTOR, UserRole.HOSPITAL_ADMIN]}>
        <div>Hospital Clinical Area</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText('Hospital Clinical Area')).toBeInTheDocument();
  });

  it('rejects SYSTEM_ADMIN from hospital protected area', () => {
    renderWithAuth(
      {
        session: { user: { id: 'sa-1' } },
        profile: {
          id: 'admin-1',
          name: 'Super Admin',
          email: 'admin@raah.care',
          role: UserRole.SYSTEM_ADMIN,
          isActive: true,
        },
        isLoading: false,
        needsRegistration: false,
      },
      <ProtectedRoute allowedRoles={[UserRole.DOCTOR, UserRole.HOSPITAL_ADMIN]}>
        <div>Hospital Clinical Area</div>
      </ProtectedRoute>,
    );

    expect(screen.queryByText('Hospital Clinical Area')).not.toBeInTheDocument();
    expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    expect(screen.getByText('(System Admin)')).toBeInTheDocument();
  });
});

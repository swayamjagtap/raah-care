import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { ProtectedRoute, AuthContext } from '@raah/auth';
import { UserRole } from '@raah/shared-types';

describe('Ambulance Web Role Boundaries', () => {
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

  it('allows AMBULANCE_DRIVER into protected area', () => {
    renderWithAuth(
      {
        session: { user: { id: 'd-1' } },
        profile: {
          id: 'driver-1',
          name: 'Dan Driver',
          email: 'dan@raah.care',
          role: UserRole.AMBULANCE_DRIVER,
          isActive: true,
        },
        isLoading: false,
        needsRegistration: false,
      },
      <ProtectedRoute allowedRoles={[UserRole.AMBULANCE_DRIVER, UserRole.PARAMEDIC]}>
        <div>Ambulance Crew Area</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText('Ambulance Crew Area')).toBeInTheDocument();
  });

  it('allows PARAMEDIC into protected area', () => {
    renderWithAuth(
      {
        session: { user: { id: 'p-1' } },
        profile: {
          id: 'paramedic-1',
          name: 'Paula Paramedic',
          email: 'paula@raah.care',
          role: UserRole.PARAMEDIC,
          isActive: true,
        },
        isLoading: false,
        needsRegistration: false,
      },
      <ProtectedRoute allowedRoles={[UserRole.AMBULANCE_DRIVER, UserRole.PARAMEDIC]}>
        <div>Ambulance Crew Area</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText('Ambulance Crew Area')).toBeInTheDocument();
  });

  it('rejects SYSTEM_ADMIN from ambulance protected area', () => {
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
      <ProtectedRoute allowedRoles={[UserRole.AMBULANCE_DRIVER, UserRole.PARAMEDIC]}>
        <div>Ambulance Crew Area</div>
      </ProtectedRoute>,
    );

    expect(screen.queryByText('Ambulance Crew Area')).not.toBeInTheDocument();
    expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    expect(screen.getByText('(System Admin)')).toBeInTheDocument();
  });
});

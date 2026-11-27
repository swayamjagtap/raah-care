import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { ProtectedRoute, AuthContext } from '@raah/auth';
import { UserRole } from '@raah/shared-types';

describe('Admin Web Role Boundaries', () => {
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

  it('allows DISPATCHER into control centre', () => {
    renderWithAuth(
      {
        session: { user: { id: 'disp-1' } },
        profile: {
          id: 'disp-1',
          name: 'Dave Dispatcher',
          email: 'dave@raah.care',
          role: UserRole.DISPATCHER,
          isActive: true,
        },
        isLoading: false,
        needsRegistration: false,
      },
      <ProtectedRoute allowedRoles={[UserRole.DISPATCHER, UserRole.SYSTEM_ADMIN]}>
        <div>Control Centre Operations</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText('Control Centre Operations')).toBeInTheDocument();
  });

  it('allows SYSTEM_ADMIN into control centre', () => {
    renderWithAuth(
      {
        session: { user: { id: 'sa-1' } },
        profile: {
          id: 'sa-1',
          name: 'Sarah Admin',
          email: 'sarah@raah.care',
          role: UserRole.SYSTEM_ADMIN,
          isActive: true,
        },
        isLoading: false,
        needsRegistration: false,
      },
      <ProtectedRoute allowedRoles={[UserRole.DISPATCHER, UserRole.SYSTEM_ADMIN]}>
        <div>Control Centre Operations</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText('Control Centre Operations')).toBeInTheDocument();
  });

  it('rejects PATIENT, DOCTOR, and AMBULANCE_DRIVER from control centre', () => {
    renderWithAuth(
      {
        session: { user: { id: 'pat-1' } },
        profile: {
          id: 'pat-1',
          name: 'Pat Patient',
          email: 'pat@example.com',
          role: UserRole.PATIENT,
          isActive: true,
        },
        isLoading: false,
        needsRegistration: false,
      },
      <ProtectedRoute allowedRoles={[UserRole.DISPATCHER, UserRole.SYSTEM_ADMIN]}>
        <div>Control Centre Operations</div>
      </ProtectedRoute>,
    );

    expect(screen.queryByText('Control Centre Operations')).not.toBeInTheDocument();
    expect(screen.getByText('Access Restricted')).toBeInTheDocument();
  });
});

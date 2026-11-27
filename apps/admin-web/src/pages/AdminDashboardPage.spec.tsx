import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdminDashboardPage } from './AdminDashboardPage';
import { useAuth } from '@raah/auth';
import { UserRole } from '@raah/shared-types';

vi.mock('@raah/auth', () => ({
  useAuth: vi.fn(),
}));

describe('AdminDashboardPage', () => {
  it('renders Dispatcher Dashboard for DISPATCHER role', () => {
    vi.mocked(useAuth).mockReturnValue({
      profile: {
        id: 'disp-1',
        name: 'Officer John',
        email: 'dispatcher@raah.care',
        role: UserRole.DISPATCHER,
        isActive: true,
      },
    } as any);

    render(<AdminDashboardPage />);
    expect(screen.getByText('Dispatcher Dashboard')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Emergency intake, assisted triage, ambulance coordination, and hospital destination management.',
      ),
    ).toBeInTheDocument();
  });

  it('renders Admin Dashboard for SYSTEM_ADMIN role', () => {
    vi.mocked(useAuth).mockReturnValue({
      profile: {
        id: 'admin-sys-1',
        name: 'Sys Admin Dave',
        email: 'sysadmin@raah.care',
        role: UserRole.SYSTEM_ADMIN,
        isActive: true,
      },
    } as any);

    render(<AdminDashboardPage />);
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
  });
});

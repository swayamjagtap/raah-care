import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HospitalDashboardPage } from './HospitalDashboardPage';
import { useAuth } from '@raah/auth';
import { UserRole } from '@raah/shared-types';

vi.mock('@raah/auth', () => ({
  useAuth: vi.fn(),
}));

describe('HospitalDashboardPage', () => {
  it('renders Doctor Portal for DOCTOR role', () => {
    vi.mocked(useAuth).mockReturnValue({
      profile: {
        id: 'doc-1',
        name: 'Dr. Sarah Connor',
        email: 'doctor@hospital.raah.care',
        role: UserRole.DOCTOR,
        isActive: true,
      },
    } as any);

    render(<HospitalDashboardPage />);
    expect(screen.getByText('Doctor Portal')).toBeInTheDocument();
    expect(
      screen.getByText('Incoming emergency cases, patient reception, and hospital handover management.'),
    ).toBeInTheDocument();
  });

  it('renders Hospital Dashboard for HOSPITAL_ADMIN role', () => {
    vi.mocked(useAuth).mockReturnValue({
      profile: {
        id: 'admin-1',
        name: 'Admin Mark',
        email: 'admin@hospital.raah.care',
        role: UserRole.HOSPITAL_ADMIN,
        isActive: true,
      },
    } as any);

    render(<HospitalDashboardPage />);
    expect(screen.getByText('Hospital Dashboard')).toBeInTheDocument();
  });
});

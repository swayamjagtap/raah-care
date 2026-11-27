import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AmbulanceDashboardPage } from './AmbulanceDashboardPage';
import { useAuth } from '@raah/auth';
import { UserRole } from '@raah/shared-types';

vi.mock('@raah/auth', () => ({
  useAuth: vi.fn(),
}));

describe('AmbulanceDashboardPage', () => {
  it('renders Paramedic Portal for PARAMEDIC role', () => {
    vi.mocked(useAuth).mockReturnValue({
      profile: {
        id: 'paramedic-1',
        name: 'Alex Rivera',
        email: 'alex@raah.care',
        role: UserRole.PARAMEDIC,
        isActive: true,
      },
    } as any);

    render(<AmbulanceDashboardPage />);
    expect(screen.getByText('Paramedic Portal')).toBeInTheDocument();
    expect(
      screen.getByText('Assigned emergency missions, patient transport, clinical handover, and hospital coordination.'),
    ).toBeInTheDocument();
  });

  it('renders Ambulance Portal for AMBULANCE_DRIVER role', () => {
    vi.mocked(useAuth).mockReturnValue({
      profile: {
        id: 'driver-1',
        name: 'Sam Wilson',
        email: 'sam@raah.care',
        role: UserRole.AMBULANCE_DRIVER,
        isActive: true,
      },
    } as any);

    render(<AmbulanceDashboardPage />);
    expect(screen.getByText('Ambulance Portal')).toBeInTheDocument();
  });
});

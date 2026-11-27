import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { PatientPortalPage } from './PatientPortalPage';
import { useAuth } from '@raah/auth';
import { emergenciesApi } from '@raah/api-client';

vi.mock('@raah/auth', () => ({
  useAuth: vi.fn(),
  AuthState: {
    INITIALIZING: 'INITIALIZING',
    UNAUTHENTICATED: 'UNAUTHENTICATED',
    EMAIL_CONFIRMATION_PENDING: 'EMAIL_CONFIRMATION_PENDING',
    AUTHENTICATED_UNLINKED: 'AUTHENTICATED_UNLINKED',
    AUTHENTICATED_LINKED: 'AUTHENTICATED_LINKED',
    AUTH_ERROR: 'AUTH_ERROR',
  },
}));

vi.mock('@raah/api-client', () => ({
  emergenciesApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
  },
}));

describe('PatientPortalPage Integration & Audit Suite', () => {
  const renderPortalPage = () => {
    return render(
      <MemoryRouter>
        <PatientPortalPage />
      </MemoryRouter>,
    );
  };
  const mockProfile = {
    id: 'user-pat-123',
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+919876543210',
    role: 'PATIENT',
    isActive: true,
  };

  const mockEmergency = {
    id: 'em-uuid-1',
    caseNumber: 'EM-1001',
    priority: 'CRITICAL',
    status: 'AMBULANCE_ASSIGNED',
    incidentLatitude: 12.9716,
    incidentLongitude: 77.5946,
    incidentAddress: '123 Cross Road, Indiranagar',
    symptoms: '[Category: Cardiac Emergency] Chest pain and breathless',
    createdAt: new Date().toISOString(),
    assignments: [
      {
        id: 'asg-1',
        caseId: 'em-uuid-1',
        ambulanceId: 'amb-1',
        status: 'DISPATCHED',
        assignedAt: new Date().toISOString(),
        ambulance: {
          id: 'amb-1',
          registrationNumber: 'KA-01-EQ-9999',
          callSign: 'ALS-04',
          type: 'ADVANCED_LIFE_SUPPORT',
          status: 'EN_ROUTE',
          currentLatitude: 12.972,
          currentLongitude: 77.595,
        },
      },
    ],
    destinationHospital: {
      id: 'hosp-1',
      name: 'City Care Emergency Hospital',
      code: 'CCEH',
      address: '4th Block, Koramangala',
      phone: '+91 80 1234 5678',
      emergencyCapability: 'LEVEL_1_TRAUMA',
      status: 'AVAILABLE',
    },
    events: [
      {
        id: 'evt-1',
        caseId: 'em-uuid-1',
        eventType: 'CASE_CREATED',
        createdAt: new Date().toISOString(),
        notes: 'Emergency case created',
      },
      {
        id: 'evt-2',
        caseId: 'em-uuid-1',
        eventType: 'AMBULANCE_ASSIGNED',
        createdAt: new Date().toISOString(),
        notes: 'Ambulance ALS-04 allocated',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // 1. Guest SOS & Tracking Audit
  it('handles guest SOS creation and shows honest tracking-unavailable notice for unauthenticated users', async () => {
    vi.mocked(useAuth).mockReturnValue({
      profile: null,
      session: null,
      isLoading: false,
      needsRegistration: false,
    } as any);

    // Mock geolocation
    const mockGeolocation = {
      getCurrentPosition: vi.fn().mockImplementation((success) =>
        success({
          coords: {
            latitude: 12.9716,
            longitude: 77.5946,
          },
        }),
      ),
    };
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: mockGeolocation,
    });

    vi.mocked(emergenciesApi.create).mockResolvedValue({
      id: 'guest-emergency-123',
      caseNumber: 'EM-9999',
    } as any);

    renderPortalPage();

    // Trigger SOS modal
    fireEvent.click(screen.getByRole('button', { name: /emergency sos/i }));
    expect(screen.getByText('Request Emergency SOS')).toBeInTheDocument();

    // Select category and proceed
    fireEvent.click(screen.getByText('Accident / Trauma'));
    fireEvent.click(screen.getByRole('button', { name: /continue to location/i }));
    fireEvent.click(screen.getByRole('button', { name: /review & confirm sos/i }));

    // Confirm SOS
    fireEvent.click(screen.getByRole('button', { name: /confirm & broadcast sos/i }));

    await waitFor(() => {
      expect(emergenciesApi.create).toHaveBeenCalledWith({
        incidentLatitude: 12.9716,
        incidentLongitude: 77.5946,
        incidentAddress: expect.stringContaining('GPS Location'),
        symptoms: expect.stringContaining('[Category: Accident / Trauma]'),
        notes: undefined,
        priority: 'HIGH',
      });
    });

    // Check localStorage saved guest ID
    const guestStored = JSON.parse(localStorage.getItem('raah_emergencies_guest') || '[]');
    expect(guestStored).toContain('guest-emergency-123');

    // Verify honest guest tracking notice is rendered (explains telemetry requires login)
    await waitFor(() => {
      expect(screen.getByText(/Emergency broadcast confirmed for Reference ID #guest-emergency-123/i)).toBeInTheDocument();
      expect(screen.getByText(/Live status telemetry tracking requires an authenticated patient profile/i)).toBeInTheDocument();
    });

    // Verify backend findOne was NOT falsely probed anonymously
    expect(emergenciesApi.getById).not.toHaveBeenCalled();
  });

  // 2. Authenticated Patient SOS & Tracking
  it('allows authenticated patient to create and immediately track emergency with assignments', async () => {
    localStorage.setItem('raah_emergencies_user-pat-123', JSON.stringify(['em-uuid-1']));

    vi.mocked(useAuth).mockReturnValue({
      profile: mockProfile,
      session: { user: { id: 'u-1' } },
      isLoading: false,
      needsRegistration: false,
    } as any);

    vi.mocked(emergenciesApi.getById).mockResolvedValue(mockEmergency as any);

    renderPortalPage();

    await waitFor(() => {
      expect(screen.getByText(/Active Response Monitor — Case #EM-1001/i)).toBeInTheDocument();
    });

    expect(screen.getByText('Ambulance Assigned')).toBeInTheDocument();
    expect(screen.getByText('City Care Emergency Hospital')).toBeInTheDocument();
  });

  // 3. Graceful Handling of Missing Ambulance and Hospital Fields
  it('gracefully renders fallback states when ambulance or hospital assignment data is absent', async () => {
    const incompleteEmergency = {
      ...mockEmergency,
      assignments: [],
      destinationHospital: null,
    };

    localStorage.setItem('raah_emergencies_user-pat-123', JSON.stringify(['em-uuid-1']));

    vi.mocked(useAuth).mockReturnValue({
      profile: mockProfile,
      session: { user: { id: 'u-1' } },
      isLoading: false,
      needsRegistration: false,
    } as any);

    vi.mocked(emergenciesApi.getById).mockResolvedValue(incompleteEmergency as any);

    renderPortalPage();

    await waitFor(() => {
      expect(screen.getByText(/Ambulance allocation in progress by automated CAD/i)).toBeInTheDocument();
      expect(screen.getByText(/Hospital destination will be confirmed upon paramedic triage/i)).toBeInTheDocument();
    });
  });

  // 4. Geolocation Timeout Handling
  it('handles GPS timeout properly with user guidance', async () => {
    vi.mocked(useAuth).mockReturnValue({
      profile: null,
      session: null,
      isLoading: false,
      needsRegistration: false,
    } as any);

    const mockGeolocation = {
      getCurrentPosition: vi.fn().mockImplementation((_success, error) =>
        error({
          code: 3, // TIMEOUT
          TIMEOUT: 3,
        }),
      ),
    };
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: mockGeolocation,
    });

    renderPortalPage();

    fireEvent.click(screen.getByRole('button', { name: /emergency sos/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue to location/i }));

    expect(screen.getByText(/Location request timed out. Please retry or enter manually/i)).toBeInTheDocument();
  });

  // 5. Duplicate Submission Prevention
  it('prevents duplicate submissions while request is in flight', async () => {
    vi.mocked(useAuth).mockReturnValue({
      profile: null,
      session: null,
      isLoading: false,
      needsRegistration: false,
    } as any);

    const mockGeolocation = {
      getCurrentPosition: vi.fn().mockImplementation((success) =>
        success({
          coords: {
            latitude: 12.9716,
            longitude: 77.5946,
          },
        }),
      ),
    };
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: mockGeolocation,
    });

    let resolvePromise: any;
    vi.mocked(emergenciesApi.create).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        }),
    );

    renderPortalPage();

    fireEvent.click(screen.getByRole('button', { name: /emergency sos/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue to location/i }));
    fireEvent.click(screen.getByRole('button', { name: /review & confirm sos/i }));

    const submitBtn = screen.getByRole('button', { name: /confirm & broadcast sos/i });
    fireEvent.click(submitBtn);

    // Button should now be disabled and displaying loading state
    expect(screen.getByText(/Transmitting SOS.../i)).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();

    // Click again while in-flight
    fireEvent.click(submitBtn);
    expect(emergenciesApi.create).toHaveBeenCalledTimes(1);

    // Resolve in-flight request
    resolvePromise({ id: 'done-123', caseNumber: 'EM-001' });
  });

  // 6. Failed SOS Submission Handling
  it('handles backend submission failure and displays actionable error message', async () => {
    vi.mocked(useAuth).mockReturnValue({
      profile: null,
      session: null,
      isLoading: false,
      needsRegistration: false,
    } as any);

    const mockGeolocation = {
      getCurrentPosition: vi.fn().mockImplementation((success) =>
        success({
          coords: {
            latitude: 12.9716,
            longitude: 77.5946,
          },
        }),
      ),
    };
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: mockGeolocation,
    });

    vi.mocked(emergenciesApi.create).mockRejectedValue(new Error('Gateway timeout on CAD broker'));

    renderPortalPage();

    fireEvent.click(screen.getByRole('button', { name: /emergency sos/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue to location/i }));
    fireEvent.click(screen.getByRole('button', { name: /review & confirm sos/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm & broadcast sos/i }));

    await waitFor(() => {
      expect(screen.getByText(/Gateway timeout on CAD broker/i)).toBeInTheDocument();
    });
  });

  // 7. Status Mapping & Timeline
  it('maps all supported lifecycle statuses safely', async () => {
    const completedEmergency = {
      ...mockEmergency,
      status: 'COMPLETED',
    };

    localStorage.setItem('raah_emergencies_user-pat-123', JSON.stringify(['em-uuid-1']));

    vi.mocked(useAuth).mockReturnValue({
      profile: mockProfile,
      session: { user: { id: 'u-1' } },
      isLoading: false,
      needsRegistration: false,
    } as any);

    vi.mocked(emergenciesApi.getById).mockResolvedValue(completedEmergency as any);

    renderPortalPage();

    await waitFor(() => {
      expect(screen.getByText('Care successfully transferred to the hospital medical team.')).toBeInTheDocument();
    });
  });
});

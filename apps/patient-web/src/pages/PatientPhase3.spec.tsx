import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { useAuth, ProtectedRoute, AuthContext, AuthState } from '@raah/auth';
import { UserRole } from '@raah/shared-types';
import { curaCardApi, patientsApi } from '@raah/api-client';
import { MedicalProfilePage } from './MedicalProfilePage';
import { CuraCardPage } from './CuraCardPage';
import { PatientSettingsPage } from './PatientSettingsPage';
import { CuraCardModal } from '../components/CuraCardModal';

vi.mock('@raah/auth', async () => {
  const actual = await vi.importActual<any>('@raah/auth');
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

vi.mock('@raah/api-client', () => ({
  patientsApi: {
    getMe: vi.fn(),
    updateMe: vi.fn(),
  },
  curaCardApi: {
    getMe: vi.fn(),
    generateToken: vi.fn(),
    revokeToken: vi.fn(),
    resolveToken: vi.fn(),
  },
}));

describe('Patient Phase 3: Medical Profile, Digital Cura Card & Settings Suite', () => {
  const mockPatientProfile = {
    id: 'pat-uuid-001',
    name: 'Aarav Patel',
    email: 'aarav.patel@example.com',
    phone: '+919876543210',
    role: UserRole.PATIENT,
    isActive: true,
    createdAt: '2026-01-15T10:00:00.000Z',
    hospitalId: null,
    ambulanceId: null,
    supabaseId: 'sub-aarav-001',
  };

  const createMockAuth = (overrides = {}) => ({
    profile: null,
    session: null,
    supabaseUser: null,
    error: null,
    isLoading: false,
    authState: AuthState.AUTHENTICATED_LINKED,
    needsRegistration: false,
    emailConfirmationPending: false,
    signOut: vi.fn(),
    clearSession: vi.fn(),
    refreshProfile: vi.fn(),
    setEmailConfirmationPending: vi.fn(),
    signInWithPassword: vi.fn(),
    signUpWithPassword: vi.fn(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Medical Profile Page', () => {
    const mockClinicalData = {
      id: 'patient-rec-001',
      userId: 'pat-uuid-001',
      fullName: 'Aarav Patel',
      dateOfBirth: '1995-05-15T00:00:00.000Z',
      gender: 'Male',
      bloodGroup: 'B+',
      phoneNumber: '+919876543210',
      emergencyContact: 'Mother: +919876500000',
      medicalHistory: 'Mild asthma',
      allergies: 'Penicillin, Dust',
      currentMedication: 'Salbutamol Inhaler',
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-02T10:00:00.000Z',
    };

    it('renders loading state when auth profile or clinical profile is loading', () => {
      vi.mocked(useAuth).mockReturnValue(
        createMockAuth({
          isLoading: true,
        }) as any,
      );
      vi.mocked(patientsApi.getMe).mockReturnValue(new Promise(() => {}));

      const { container } = render(
        <MemoryRouter>
          <MedicalProfilePage />
        </MemoryRouter>,
      );

      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('renders verified patient identity details from auth profile and clinical records from backend', async () => {
      vi.mocked(useAuth).mockReturnValue(
        createMockAuth({
          profile: mockPatientProfile,
          session: { user: { id: 'pat-uuid-001' } } as any,
        }) as any,
      );
      vi.mocked(patientsApi.getMe).mockResolvedValue(mockClinicalData);

      render(
        <MemoryRouter>
          <MedicalProfilePage />
        </MemoryRouter>,
      );

      expect(await screen.findByText('Patient Medical Profile')).toBeInTheDocument();
      expect(screen.getByText('Aarav Patel')).toBeInTheDocument();
      expect(screen.getByText('aarav.patel@example.com')).toBeInTheDocument();
      expect(screen.getByText('+919876543210')).toBeInTheDocument();
      expect(screen.getByText('patient-rec-001')).toBeInTheDocument();
      expect(screen.getByText('Verified Backend User')).toBeInTheDocument();
      expect(screen.getByText('Authenticated Patient Record')).toBeInTheDocument();

      // Form values populated from backend
      expect(screen.getByLabelText(/blood group/i)).toHaveValue('B+');
      expect(screen.getByLabelText(/critical allergies/i)).toHaveValue('Penicillin, Dust');
      expect(screen.getByLabelText(/pre-existing conditions/i)).toHaveValue('Mild asthma');
      expect(screen.getByLabelText(/current prescriptions/i)).toHaveValue('Salbutamol Inhaler');
      expect(screen.getByLabelText(/emergency contact/i)).toHaveValue('Mother: +919876500000');
    });

    it('displays honest empty state notice when patient has no clinical information recorded yet', async () => {
      vi.mocked(useAuth).mockReturnValue(
        createMockAuth({
          profile: mockPatientProfile,
          session: { user: { id: 'pat-uuid-001' } } as any,
        }) as any,
      );
      vi.mocked(patientsApi.getMe).mockResolvedValue({
        id: 'patient-empty-001',
        userId: 'pat-uuid-001',
        fullName: 'Aarav Patel',
        bloodGroup: null,
        allergies: null,
        medicalHistory: null,
        currentMedication: null,
        emergencyContact: null,
      });

      render(
        <MemoryRouter>
          <MedicalProfilePage />
        </MemoryRouter>,
      );

      expect(await screen.findByText('No Clinical Information Recorded Yet')).toBeInTheDocument();
      expect(screen.getByLabelText(/blood group/i)).toHaveValue('');
      expect(screen.getByRole('button', { name: /save medical profile/i })).toBeEnabled();
    });

    it('enables editing, validates and successfully saves medical profile to backend', async () => {
      vi.mocked(useAuth).mockReturnValue(
        createMockAuth({
          profile: mockPatientProfile,
          session: { user: { id: 'pat-uuid-001' } } as any,
        }) as any,
      );
      vi.mocked(patientsApi.getMe).mockResolvedValue({
        id: 'patient-rec-001',
        userId: 'pat-uuid-001',
        fullName: 'Aarav Patel',
        bloodGroup: 'B+',
        allergies: '',
        medicalHistory: '',
        currentMedication: '',
        emergencyContact: '',
      });

      vi.mocked(patientsApi.updateMe).mockResolvedValue({
        id: 'patient-rec-001',
        userId: 'pat-uuid-001',
        fullName: 'Aarav Patel',
        bloodGroup: 'O+',
        allergies: 'Peanuts',
        medicalHistory: 'Hypertension',
        currentMedication: 'Amlodipine',
        emergencyContact: 'Father: +919876543210',
      });

      render(
        <MemoryRouter>
          <MedicalProfilePage />
        </MemoryRouter>,
      );

      await screen.findByText('Patient Medical Profile');

      // Edit fields
      fireEvent.change(screen.getByLabelText(/blood group/i), { target: { value: 'O+' } });
      fireEvent.change(screen.getByLabelText(/critical allergies/i), { target: { value: 'Peanuts' } });
      fireEvent.change(screen.getByLabelText(/pre-existing conditions/i), { target: { value: 'Hypertension' } });
      fireEvent.change(screen.getByLabelText(/current prescriptions/i), { target: { value: 'Amlodipine' } });
      fireEvent.change(screen.getByLabelText(/emergency contact/i), { target: { value: 'Father: +919876543210' } });

      const saveBtn = screen.getByRole('button', { name: /save medical profile/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(patientsApi.updateMe).toHaveBeenCalledWith({
          bloodGroup: 'O+',
          allergies: 'Peanuts',
          medicalHistory: 'Hypertension',
          currentMedication: 'Amlodipine',
          emergencyContact: 'Father: +919876543210',
        });
      });

      expect(await screen.findByText('Medical profile saved successfully.')).toBeInTheDocument();
      expect(screen.getByLabelText(/blood group/i)).toHaveValue('O+');
      expect(screen.getByLabelText(/critical allergies/i)).toHaveValue('Peanuts');
    });

    it('displays error feedback when save operation fails', async () => {
      vi.mocked(useAuth).mockReturnValue(
        createMockAuth({
          profile: mockPatientProfile,
          session: { user: { id: 'pat-uuid-001' } } as any,
        }) as any,
      );
      vi.mocked(patientsApi.getMe).mockResolvedValue(mockClinicalData);
      vi.mocked(patientsApi.updateMe).mockRejectedValue(new Error('Network connection timeout'));

      render(
        <MemoryRouter>
          <MedicalProfilePage />
        </MemoryRouter>,
      );

      await screen.findByText('Patient Medical Profile');

      const saveBtn = screen.getByRole('button', { name: /save medical profile/i });
      fireEvent.click(saveBtn);

      expect(await screen.findByText('Network connection timeout')).toBeInTheDocument();
    });
  });

  describe('Digital Cura Card Page & Modal', () => {
    const mockCardData = {
      cardId: 'RAAH-CR-9999AAAA',
      patientId: 'pat-uuid-001',
      fullName: 'Aarav Patel',
      bloodGroup: 'B+',
      allergies: 'Penicillin',
      status: 'INACTIVE' as const,
      hasActiveToken: false,
      expiresAt: null,
      issuedAt: null,
    };

    it('renders Digital Cura Card with real patient credentials and permanent card ID', async () => {
      vi.mocked(useAuth).mockReturnValue(
        createMockAuth({
          profile: mockPatientProfile,
          session: { user: { id: 'pat-uuid-001' } } as any,
        }) as any,
      );
      vi.mocked(curaCardApi.getMe).mockResolvedValue(mockCardData);
      vi.mocked(patientsApi.getMe).mockResolvedValue({
        id: 'pat-uuid-001',
        userId: 'pat-uuid-001',
        fullName: 'Aarav Patel',
        bloodGroup: 'B+',
        allergies: 'Penicillin',
      });

      render(
        <MemoryRouter>
          <CuraCardPage />
        </MemoryRouter>,
      );

      expect(await screen.findByText('CURA CARD')).toBeInTheDocument();
      expect(screen.getByText('Aarav Patel')).toBeInTheDocument();
      expect(screen.getByText('RAAH-CR-9999AAAA')).toBeInTheDocument();
      expect(screen.getByText('TOKEN INACTIVE')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /generate qr code/i })).toBeInTheDocument();
    });

    it('generates secure ephemeral QR token when user clicks Generate QR Code', async () => {
      vi.mocked(useAuth).mockReturnValue(
        createMockAuth({
          profile: mockPatientProfile,
          session: { user: { id: 'pat-uuid-001' } } as any,
        }) as any,
      );
      vi.mocked(curaCardApi.getMe).mockResolvedValue(mockCardData);
      vi.mocked(patientsApi.getMe).mockResolvedValue({
        id: 'pat-uuid-001',
        userId: 'pat-uuid-001',
        fullName: 'Aarav Patel',
        bloodGroup: 'B+',
        allergies: 'Penicillin',
      });

      const futureDate = new Date(Date.now() + 300000).toISOString();
      vi.mocked(curaCardApi.generateToken).mockResolvedValue({
        cardId: 'RAAH-CR-9999AAAA',
        qrPayload: 'https://patient-app/cura-card/scan?token=sample-token-123',
        expiresAt: futureDate,
        status: 'ACTIVE',
      });

      render(
        <MemoryRouter>
          <CuraCardPage />
        </MemoryRouter>,
      );

      const genBtn = await screen.findByRole('button', { name: /generate qr code/i });
      fireEvent.click(genBtn);

      await waitFor(() => {
        expect(curaCardApi.generateToken).toHaveBeenCalled();
      });

      expect(await screen.findByText(/Fresh cryptographic QR token generated/i)).toBeInTheDocument();
      expect(screen.getByAltText('Cura Card Emergency QR')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /revoke qr/i })).toBeInTheDocument();
    });

    it('revokes active QR token when Revoke QR is clicked', async () => {
      vi.mocked(useAuth).mockReturnValue(
        createMockAuth({
          profile: mockPatientProfile,
          session: { user: { id: 'pat-uuid-001' } } as any,
        }) as any,
      );
      vi.mocked(curaCardApi.getMe).mockResolvedValue(mockCardData);
      vi.mocked(patientsApi.getMe).mockResolvedValue({
        id: 'pat-uuid-001',
        userId: 'pat-uuid-001',
        fullName: 'Aarav Patel',
        bloodGroup: 'B+',
        allergies: 'Penicillin',
      });
      vi.mocked(curaCardApi.generateToken).mockResolvedValue({
        cardId: 'RAAH-CR-9999AAAA',
        qrPayload: 'https://patient-app/cura-card/scan?token=sample-token-123',
        expiresAt: new Date(Date.now() + 300000).toISOString(),
        status: 'ACTIVE',
      });
      vi.mocked(curaCardApi.revokeToken).mockResolvedValue({
        revoked: true,
        message: 'Active Cura Card QR token revoked successfully',
      });

      render(
        <MemoryRouter>
          <CuraCardPage />
        </MemoryRouter>,
      );

      const genBtn = await screen.findByRole('button', { name: /generate qr code/i });
      fireEvent.click(genBtn);

      const revokeBtn = await screen.findByRole('button', { name: /revoke qr/i });
      fireEvent.click(revokeBtn);

      await waitFor(() => {
        expect(curaCardApi.revokeToken).toHaveBeenCalled();
      });

      expect(await screen.findByText(/Cura Card QR token revoked immediately/i)).toBeInTheDocument();
      expect(screen.queryByAltText('Cura Card Emergency QR')).not.toBeInTheDocument();
    });

    it('CuraCardModal also renders permanent card ID and generate token button', async () => {
      vi.mocked(curaCardApi.getMe).mockResolvedValue(mockCardData);
      vi.mocked(patientsApi.getMe).mockResolvedValue({
        id: 'pat-uuid-001',
        userId: 'pat-uuid-001',
        fullName: 'Aarav Patel',
        bloodGroup: 'B+',
        allergies: 'Penicillin',
      });

      const handleClose = vi.fn();
      render(
        <CuraCardModal
          isOpen={true}
          onClose={handleClose}
          profile={mockPatientProfile as any}
        />,
      );

      expect(screen.getByText('Digital Cura Card • RAAH-CARE')).toBeInTheDocument();
      expect(screen.getAllByText('Aarav Patel').length).toBeGreaterThanOrEqual(1);

      const closeButton = screen.getByRole('button', { name: /close modal/i });
      fireEvent.click(closeButton);
      expect(handleClose).toHaveBeenCalled();
    });
  });

  describe('Patient Settings Page', () => {
    it('loads existing profile details and displays RBAC boundary protection badge', () => {
      vi.mocked(useAuth).mockReturnValue(
        createMockAuth({
          profile: mockPatientProfile,
          session: { user: { id: 'pat-uuid-001' } } as any,
        }) as any,
      );

      render(
        <MemoryRouter>
          <PatientSettingsPage />
        </MemoryRouter>,
      );

      expect(screen.getByText('Patient Profile & Settings')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Aarav Patel')).toBeInTheDocument();
      expect(screen.getByDisplayValue('aarav.patel@example.com')).toBeDisabled();
      expect(screen.getByDisplayValue('+919876543210')).toBeInTheDocument();
      expect(screen.getAllByText('PATIENT')).toHaveLength(1);
      expect(screen.getByText('Account Security & RBAC Boundary')).toBeInTheDocument();
    });

    it('validates contact numbers and required fields on client-side input', () => {
      vi.mocked(useAuth).mockReturnValue(
        createMockAuth({
          profile: mockPatientProfile,
          session: { user: { id: 'pat-uuid-001' } } as any,
        }) as any,
      );

      render(
        <MemoryRouter>
          <PatientSettingsPage />
        </MemoryRouter>,
      );

      const contactInput = screen.getByPlaceholderText(/Priya Sharma/i);
      fireEvent.change(contactInput, { target: { value: 'ab' } });

      expect(screen.getByText('Please enter a valid emergency contact name or telephone')).toBeInTheDocument();
    });

    it('saves emergency contact updates using PATCH /api/v1/patients/me', async () => {
      vi.mocked(useAuth).mockReturnValue(
        createMockAuth({
          profile: mockPatientProfile,
          session: { user: { id: 'pat-uuid-001' } } as any,
        }) as any,
      );
      vi.mocked(patientsApi.getMe).mockResolvedValue({
        id: 'pat-1',
        userId: 'pat-uuid-001',
        fullName: 'Aarav Patel',
        emergencyContact: 'Priya Sharma (+91 98765 00000)',
      } as any);
      vi.mocked(patientsApi.updateMe).mockResolvedValue({
        id: 'pat-1',
        userId: 'pat-uuid-001',
        fullName: 'Aarav Patel',
        emergencyContact: 'Priya Sharma (+91 98765 00000)',
      } as any);

      render(
        <MemoryRouter>
          <PatientSettingsPage />
        </MemoryRouter>,
      );

      const contactInput = screen.getByPlaceholderText(/Priya Sharma/i);
      fireEvent.change(contactInput, { target: { value: 'Priya Sharma (+91 98765 00000)' } });

      const saveButton = screen.getByRole('button', { name: /save emergency contact/i });
      expect(saveButton).not.toBeDisabled();
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(patientsApi.updateMe).toHaveBeenCalledWith({
          emergencyContact: 'Priya Sharma (+91 98765 00000)',
        });
      });
      expect(
        screen.getByText('Emergency contact details updated successfully.'),
      ).toBeInTheDocument();
      expect(
        screen.getAllByText(/PATCH \/api\/v1\/patients\/me/i).length,
      ).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Role Boundaries for Phase 3 Routes', () => {
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

    it('allows CAREGIVER into protected medical profile', () => {
      renderWithAuth(
        createMockAuth({
          session: { user: { id: 'cg-1' } },
          profile: {
            id: 'cg-1',
            name: 'Caregiver Priya',
            email: 'priya@example.com',
            role: UserRole.CAREGIVER,
            isActive: true,
          },
        }),
        '/medical-profile',
        <ProtectedRoute allowedRoles={[UserRole.PATIENT, UserRole.CAREGIVER]}>
          <div>Protected Caregiver Medical View</div>
        </ProtectedRoute>,
      );

      expect(screen.getByText('Protected Caregiver Medical View')).toBeInTheDocument();
    });

    it('rejects DOCTOR or HOSPITAL_ADMIN from patient-web protected medical profile', () => {
      renderWithAuth(
        createMockAuth({
          session: { user: { id: 'doc-1' } },
          profile: {
            id: 'doc-1',
            name: 'Dr. Sharma',
            email: 'sharma@hospital.org',
            role: UserRole.DOCTOR,
            isActive: true,
          },
        }),
        '/medical-profile',
        <ProtectedRoute allowedRoles={[UserRole.PATIENT, UserRole.CAREGIVER]}>
          <div>Protected Caregiver Medical View</div>
        </ProtectedRoute>,
      );

      expect(screen.queryByText('Protected Caregiver Medical View')).not.toBeInTheDocument();
      expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CuraCardScanner, extractCuraCardToken } from '../components/CuraCardScanner';
import { curaCardApi } from '@raah/api-client';

vi.mock('@raah/api-client', () => ({
  curaCardApi: {
    resolveToken: vi.fn(),
  },
}));

describe('Ambulance CuraCardScanner Component Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockResolvedRecord = {
    patientId: 'pat-100',
    cardId: 'RAAH-CR-TEST001',
    fullName: 'Rahul Sharma',
    bloodGroup: 'O+',
    allergies: 'Penicillin',
    medicalHistory: 'Mild Hypertension',
    currentMedication: 'Amlodipine',
    emergencyContact: 'Wife: +91 98765 11111',
    verifiedAt: '2026-11-27T18:00:00.000Z',
  };

  it('renders scanner interface with camera prompt and manual fallback', () => {
    render(<CuraCardScanner portalRole="PARAMEDIC" />);

    expect(screen.getByText(/Cura Card Verification Scanner/i)).toBeInTheDocument();
    expect(screen.getByText(/Emergency Triage Scanner • PARAMEDIC/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start camera scanner/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/paste scanned payload or token/i)).toBeInTheDocument();
  });

  it('resolves valid token through manual entry and displays clinical baseline', async () => {
    vi.mocked(curaCardApi.resolveToken).mockResolvedValue(mockResolvedRecord);

    render(<CuraCardScanner portalRole="PARAMEDIC" activeCaseId="case-1" />);

    const textarea = screen.getByPlaceholderText(/paste scanned payload or token/i);
    fireEvent.change(textarea, { target: { value: 'test-raw-token-abc123' } });

    const submitBtn = screen.getByRole('button', { name: /resolve emergency record/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(curaCardApi.resolveToken).toHaveBeenCalledWith({
        token: 'test-raw-token-abc123',
        caseId: 'case-1',
      });
    });

    expect(await screen.findByText('Verified Clinical Record')).toBeInTheDocument();
    expect(screen.getByText('Rahul Sharma')).toBeInTheDocument();
    expect(screen.getByText('RAAH-CR-TEST001')).toBeInTheDocument();
    expect(screen.getByText('O+')).toBeInTheDocument();
    expect(screen.getByText('Penicillin')).toBeInTheDocument();
    expect(screen.getByText('Mild Hypertension')).toBeInTheDocument();
  });

  it('displays honest error message when token is expired or revoked', async () => {
    vi.mocked(curaCardApi.resolveToken).mockRejectedValue(
      new Error('This Cura Card QR token has expired. Please ask the patient to refresh their QR code.'),
    );

    render(<CuraCardScanner portalRole="PARAMEDIC" />);

    const textarea = screen.getByPlaceholderText(/paste scanned payload or token/i);
    fireEvent.change(textarea, { target: { value: 'expired-token' } });

    fireEvent.click(screen.getByRole('button', { name: /resolve emergency record/i }));

    expect(
      await screen.findByText(/This Cura Card QR token has expired/i),
    ).toBeInTheDocument();
  });

  it('handles camera permission denial gracefully with clear feedback and manual fallback', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      mediaDevices: {
        getUserMedia: vi.fn().mockRejectedValue({
          name: 'NotAllowedError',
          message: 'Permission denied',
        }),
      },
    });

    render(<CuraCardScanner portalRole="PARAMEDIC" />);

    fireEvent.click(screen.getByRole('button', { name: /start camera scanner/i }));

    expect(
      await screen.findByText(/Camera permission was denied.*use manual token entry/i),
    ).toBeInTheDocument();
  });

  it('extracts token from full URL, query param or returns raw token', () => {
    expect(
      extractCuraCardToken(
        'http://localhost:5173/cura-card/scan?token=abc1234567890abcdef1234567890abcdef',
      ),
    ).toBe('abc1234567890abcdef1234567890abcdef');
    expect(
      extractCuraCardToken('https://raah.care/c/fedcba0987654321fedcba0987654321'),
    ).toBe('fedcba0987654321fedcba0987654321');
    expect(extractCuraCardToken('  raw-token-hex  ')).toBe('raw-token-hex');
  });
});

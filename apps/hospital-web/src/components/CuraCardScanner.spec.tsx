import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CuraCardScanner, extractCuraCardToken } from '../components/CuraCardScanner';
import { curaCardApi } from '@raah/api-client';

vi.mock('@raah/api-client', () => ({
  curaCardApi: {
    resolveToken: vi.fn(),
  },
}));

describe('Hospital CuraCardScanner Component Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockResolvedRecord = {
    patientId: 'pat-200',
    cardId: 'RAAH-CR-DOC001',
    fullName: 'Meera Iyer',
    bloodGroup: 'A-',
    allergies: 'Aspirin',
    medicalHistory: 'Type 1 Diabetes',
    currentMedication: 'Insulin Glargine',
    emergencyContact: 'Son: +91 98765 22222',
    verifiedAt: '2026-11-27T18:00:00.000Z',
  };

  it('renders hospital doctor triage scanner view', () => {
    render(<CuraCardScanner portalRole="DOCTOR" />);

    expect(screen.getByText(/Emergency Triage Scanner • DOCTOR/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start camera scanner/i })).toBeInTheDocument();
  });

  it('resolves valid patient record for doctor on trauma intake', async () => {
    vi.mocked(curaCardApi.resolveToken).mockResolvedValue(mockResolvedRecord);

    render(<CuraCardScanner portalRole="DOCTOR" />);

    const textarea = screen.getByPlaceholderText(/paste scanned payload or token/i);
    fireEvent.change(textarea, { target: { value: 'doctor-scanned-token' } });

    fireEvent.click(screen.getByRole('button', { name: /resolve emergency record/i }));

    expect(await screen.findByText('Meera Iyer')).toBeInTheDocument();
    expect(screen.getByText('RAAH-CR-DOC001')).toBeInTheDocument();
    expect(screen.getByText('A-')).toBeInTheDocument();
    expect(screen.getByText('Aspirin')).toBeInTheDocument();
    expect(screen.getByText('Type 1 Diabetes')).toBeInTheDocument();
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


import {
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '../../generated/prisma/enums.js';
import { CuraCardService } from './cura-card.service.js';

describe('CuraCardService', () => {
  let service: CuraCardService;
  let prismaMock: {
    patient: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    user: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    curaCardToken: {
      findFirst: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    curaCardAudit: {
      create: ReturnType<typeof vi.fn>;
    };
  };

  const patientCaller = {
    userId: 'user-pat-001',
    supabaseId: 'sub-pat-001',
    role: UserRole.PATIENT,
    hospitalId: null,
    ambulanceId: null,
  };

  const paramedicCaller = {
    userId: 'user-para-001',
    supabaseId: 'sub-para-001',
    role: UserRole.PARAMEDIC,
    hospitalId: null,
    ambulanceId: 'amb-1',
  };

  const doctorCaller = {
    userId: 'user-doc-001',
    supabaseId: 'sub-doc-001',
    role: UserRole.DOCTOR,
    hospitalId: 'hosp-1',
    ambulanceId: null,
  };

  const dispatcherCaller = {
    userId: 'user-disp-001',
    supabaseId: 'sub-disp-001',
    role: UserRole.DISPATCHER,
    hospitalId: null,
    ambulanceId: null,
  };

  const mockPatient = {
    id: 'pat-rec-001',
    userId: 'user-pat-001',
    cardId: 'RAAH-CR-ABCD1234',
    fullName: 'Ananya Sharma',
    bloodGroup: 'B+',
    allergies: 'Penicillin',
    medicalHistory: 'Asthma',
    currentMedication: 'Inhaler',
    emergencyContact: 'Mother: +919876500000',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    prismaMock = {
      patient: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
      curaCardToken: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
      },
      curaCardAudit: {
        create: vi.fn(),
      },
    };
    service = new CuraCardService(prismaMock as any);
  });

  describe('getMyCard', () => {
    it('returns permanent card details and active token status when token exists', async () => {
      prismaMock.patient.findUnique.mockResolvedValue(mockPatient);
      prismaMock.curaCardToken.findFirst.mockResolvedValue({
        id: 'tok-1',
        expiresAt: new Date(Date.now() + 100000),
        createdAt: new Date(),
        revokedAt: null,
      });

      const res = await service.getMyCard(patientCaller);

      expect(res.cardId).toBe('RAAH-CR-ABCD1234');
      expect(res.status).toBe('ACTIVE');
      expect(res.hasActiveToken).toBe(true);
    });

    it('rejects non-PATIENT callers', async () => {
      await expect(service.getMyCard(doctorCaller)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('generateToken', () => {
    it('invalidates previous tokens and creates new SHA-256 token hash', async () => {
      prismaMock.patient.findUnique.mockResolvedValue(mockPatient);
      prismaMock.curaCardToken.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.curaCardToken.create.mockResolvedValue({
        id: 'new-tok-id',
        patientId: mockPatient.id,
      });

      const res = await service.generateToken(patientCaller);

      expect(prismaMock.curaCardToken.updateMany).toHaveBeenCalledWith({
        where: { patientId: mockPatient.id, revokedAt: null },
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      });
      expect(prismaMock.curaCardToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            patientId: mockPatient.id,
            revokedAt: null,
          }),
        }),
      );
      expect(res.cardId).toBe('RAAH-CR-ABCD1234');
      expect(res.qrPayload).toContain('/cura-card/scan?token=');
      expect(res.status).toBe('ACTIVE');
    });
  });

  describe('revokeToken', () => {
    it('revokes active token for patient', async () => {
      prismaMock.patient.findUnique.mockResolvedValue(mockPatient);
      prismaMock.curaCardToken.updateMany.mockResolvedValue({ count: 1 });

      const res = await service.revokeToken(patientCaller);

      expect(res.revoked).toBe(true);
      expect(prismaMock.curaCardToken.updateMany).toHaveBeenCalledWith({
        where: { patientId: mockPatient.id, revokedAt: null },
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      });
    });
  });

  describe('resolveToken', () => {
    it('allows authorized PARAMEDIC to resolve valid non-expired token', async () => {
      const rawToken = 'test-token-value-12345';
      const tokenHash = service.hashToken(rawToken);

      prismaMock.curaCardToken.findUnique.mockResolvedValue({
        id: 'tok-1',
        tokenHash,
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: null,
        patient: mockPatient,
      });

      const res = await service.resolveToken(paramedicCaller, {
        token: rawToken,
      });

      expect(res.patientId).toBe(mockPatient.id);
      expect(res.fullName).toBe('Ananya Sharma');
      expect(res.bloodGroup).toBe('B+');
      expect(res.allergies).toBe('Penicillin');
      expect(prismaMock.curaCardAudit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            outcome: 'SUCCESS',
            responderRole: UserRole.PARAMEDIC,
          }),
        }),
      );
    });

    it('allows authorized DOCTOR to resolve valid non-expired token', async () => {
      const rawToken = 'test-token-value-12345';
      const tokenHash = service.hashToken(rawToken);

      prismaMock.curaCardToken.findUnique.mockResolvedValue({
        id: 'tok-1',
        tokenHash,
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: null,
        patient: mockPatient,
      });

      const res = await service.resolveToken(doctorCaller, {
        token: rawToken,
      });

      expect(res.fullName).toBe('Ananya Sharma');
    });

    it('rejects unauthorized roles like DISPATCHER or PATIENT', async () => {
      await expect(
        service.resolveToken(dispatcherCaller, { token: 'tok' }),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.resolveToken(patientCaller, { token: 'tok' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects expired token with UnauthorizedException and records audit', async () => {
      const rawToken = 'expired-token';
      const tokenHash = service.hashToken(rawToken);

      prismaMock.curaCardToken.findUnique.mockResolvedValue({
        id: 'tok-expired',
        tokenHash,
        expiresAt: new Date(Date.now() - 5000), // Expired
        revokedAt: null,
        patient: mockPatient,
      });

      await expect(
        service.resolveToken(paramedicCaller, { token: rawToken }),
      ).rejects.toThrow(UnauthorizedException);

      expect(prismaMock.curaCardAudit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ outcome: 'EXPIRED' }),
        }),
      );
    });

    it('rejects revoked token with UnauthorizedException and records audit', async () => {
      const rawToken = 'revoked-token';
      const tokenHash = service.hashToken(rawToken);

      prismaMock.curaCardToken.findUnique.mockResolvedValue({
        id: 'tok-revoked',
        tokenHash,
        expiresAt: new Date(Date.now() + 50000),
        revokedAt: new Date(), // Revoked
        patient: mockPatient,
      });

      await expect(
        service.resolveToken(paramedicCaller, { token: rawToken }),
      ).rejects.toThrow(UnauthorizedException);

      expect(prismaMock.curaCardAudit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ outcome: 'REVOKED' }),
        }),
      );
    });

    it('rejects unrecognized token with NotFoundException and records audit', async () => {
      prismaMock.curaCardToken.findUnique.mockResolvedValue(null);

      await expect(
        service.resolveToken(paramedicCaller, { token: 'unknown-token' }),
      ).rejects.toThrow(NotFoundException);

      expect(prismaMock.curaCardAudit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ outcome: 'INVALID' }),
        }),
      );
    });
  });
});

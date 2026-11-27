import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '../../generated/prisma/enums.js';
import { CuraCardController } from './cura-card.controller.js';
import { CuraCardService } from './cura-card.service.js';

describe('CuraCardController', () => {
  let controller: CuraCardController;
  let serviceMock: {
    getMyCard: ReturnType<typeof vi.fn>;
    generateToken: ReturnType<typeof vi.fn>;
    revokeToken: ReturnType<typeof vi.fn>;
    resolveToken: ReturnType<typeof vi.fn>;
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

  beforeEach(() => {
    serviceMock = {
      getMyCard: vi.fn(),
      generateToken: vi.fn(),
      revokeToken: vi.fn(),
      resolveToken: vi.fn(),
    };
    controller = new CuraCardController(serviceMock as unknown as CuraCardService);
  });

  it('delegates getMyCard to CuraCardService', async () => {
    serviceMock.getMyCard.mockResolvedValue({ cardId: 'RAAH-CR-1234' });
    const res = await controller.getMyCard(patientCaller);
    expect(res).toEqual({ cardId: 'RAAH-CR-1234' });
    expect(serviceMock.getMyCard).toHaveBeenCalledWith(patientCaller);
  });

  it('delegates generateToken to CuraCardService', async () => {
    serviceMock.generateToken.mockResolvedValue({ cardId: 'RAAH-CR-1234', status: 'ACTIVE' });
    const res = await controller.generateToken(patientCaller);
    expect(res.status).toBe('ACTIVE');
    expect(serviceMock.generateToken).toHaveBeenCalledWith(patientCaller);
  });

  it('delegates revokeToken to CuraCardService', async () => {
    serviceMock.revokeToken.mockResolvedValue({ revoked: true });
    const res = await controller.revokeToken(patientCaller);
    expect(res.revoked).toBe(true);
    expect(serviceMock.revokeToken).toHaveBeenCalledWith(patientCaller);
  });

  it('delegates resolveToken to CuraCardService', async () => {
    serviceMock.resolveToken.mockResolvedValue({ fullName: 'Ananya Sharma' });
    const res = await controller.resolveToken(paramedicCaller, { token: 'tok' });
    expect(res.fullName).toBe('Ananya Sharma');
    expect(serviceMock.resolveToken).toHaveBeenCalledWith(paramedicCaller, { token: 'tok' });
  });
});

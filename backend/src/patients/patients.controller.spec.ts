import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '../../generated/prisma/enums.js';
import { PatientsController } from './patients.controller.js';
import { PatientsService } from './patients.service.js';

describe('PatientsController', () => {
  let controller: PatientsController;
  let serviceMock: {
    getProfile: ReturnType<typeof vi.fn>;
    updateProfile: ReturnType<typeof vi.fn>;
  };

  const patientCaller = {
    userId: 'user-pat-001',
    supabaseId: 'sub-pat-001',
    role: UserRole.PATIENT,
    hospitalId: null,
    ambulanceId: null,
  };

  beforeEach(() => {
    serviceMock = {
      getProfile: vi.fn(),
      updateProfile: vi.fn(),
    };
    controller = new PatientsController(serviceMock as unknown as PatientsService);
  });

  it('delegates getProfile to PatientsService with authenticated caller', async () => {
    serviceMock.getProfile.mockResolvedValue({ id: 'pat-1', bloodGroup: 'O+' });

    const result = await controller.getProfile(patientCaller);

    expect(result).toEqual({ id: 'pat-1', bloodGroup: 'O+' });
    expect(serviceMock.getProfile).toHaveBeenCalledWith(patientCaller);
  });

  it('delegates updateProfile to PatientsService with authenticated caller and dto', async () => {
    const dto = { bloodGroup: 'A+' };
    serviceMock.updateProfile.mockResolvedValue({ id: 'pat-1', bloodGroup: 'A+' });

    const result = await controller.updateProfile(patientCaller, dto);

    expect(result).toEqual({ id: 'pat-1', bloodGroup: 'A+' });
    expect(serviceMock.updateProfile).toHaveBeenCalledWith(patientCaller, dto);
  });
});

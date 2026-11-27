import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '../../generated/prisma/enums.js';
import { PatientsService } from './patients.service.js';

describe('PatientsService', () => {
  let service: PatientsService;
  let prismaMock: {
    patient: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    user: {
      findUnique: ReturnType<typeof vi.fn>;
    };
  };

  const patientCaller = {
    userId: 'user-pat-001',
    supabaseId: 'sub-pat-001',
    role: UserRole.PATIENT,
    hospitalId: null,
    ambulanceId: null,
  };

  const doctorCaller = {
    userId: 'user-doc-001',
    supabaseId: 'sub-doc-001',
    role: UserRole.DOCTOR,
    hospitalId: 'hosp-001',
    ambulanceId: null,
  };

  const caregiverCaller = {
    userId: 'user-cg-001',
    supabaseId: 'sub-cg-001',
    role: UserRole.CAREGIVER,
    hospitalId: null,
    ambulanceId: null,
  };

  const existingPatient = {
    id: 'patient-rec-001',
    userId: 'user-pat-001',
    fullName: 'Ananya Sharma',
    dateOfBirth: new Date('1995-05-15'),
    gender: 'Female',
    bloodGroup: 'B+',
    phoneNumber: '+919876543210',
    emergencyContact: 'Mother: +919876500000',
    medicalHistory: 'Mild asthma',
    allergies: 'Penicillin, Dust',
    currentMedication: 'Salbutamol Inhaler',
    createdAt: new Date('2026-01-01T10:00:00Z'),
    updatedAt: new Date('2026-01-02T10:00:00Z'),
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
    };
    service = new PatientsService(prismaMock as any);
  });

  describe('getProfile', () => {
    it('returns existing patient clinical profile for authenticated patient', async () => {
      prismaMock.patient.findUnique.mockResolvedValue(existingPatient);

      const result = await service.getProfile(patientCaller);

      expect(result).toEqual({
        id: 'patient-rec-001',
        userId: 'user-pat-001',
        fullName: 'Ananya Sharma',
        dateOfBirth: existingPatient.dateOfBirth.toISOString(),
        gender: 'Female',
        bloodGroup: 'B+',
        phoneNumber: '+919876543210',
        emergencyContact: 'Mother: +919876500000',
        medicalHistory: 'Mild asthma',
        allergies: 'Penicillin, Dust',
        currentMedication: 'Salbutamol Inhaler',
        createdAt: existingPatient.createdAt.toISOString(),
        updatedAt: existingPatient.updatedAt.toISOString(),
      });
      expect(prismaMock.patient.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-pat-001' },
      });
    });

    it('creates a safe empty profile when patient record does not exist yet', async () => {
      prismaMock.patient.findUnique.mockResolvedValue(null);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-pat-001',
        name: 'New Patient',
        phone: '+919876543210',
      });
      prismaMock.patient.create.mockResolvedValue({
        id: 'patient-new-001',
        userId: 'user-pat-001',
        fullName: 'New Patient',
        dateOfBirth: null,
        gender: null,
        bloodGroup: null,
        phoneNumber: '+919876543210',
        emergencyContact: null,
        medicalHistory: null,
        allergies: null,
        currentMedication: null,
        createdAt: new Date('2026-01-01T10:00:00Z'),
        updatedAt: new Date('2026-01-01T10:00:00Z'),
      });

      const result = await service.getProfile(patientCaller);

      expect(result.id).toBe('patient-new-001');
      expect(result.bloodGroup).toBeNull();
      expect(result.allergies).toBeNull();
      expect(prismaMock.patient.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-pat-001',
          fullName: 'New Patient',
          phoneNumber: '+919876543210',
        },
      });
    });

    it('rejects non-PATIENT callers including DOCTOR and CAREGIVER', async () => {
      await expect(service.getProfile(doctorCaller)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.getProfile(caregiverCaller)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('updateProfile', () => {
    it('updates permitted medical fields and returns updated profile', async () => {
      prismaMock.patient.findUnique.mockResolvedValue(existingPatient);
      prismaMock.patient.update.mockResolvedValue({
        ...existingPatient,
        bloodGroup: 'O+',
        allergies: 'None',
        currentMedication: 'None',
        updatedAt: new Date('2026-02-01T12:00:00Z'),
      });

      const result = await service.updateProfile(patientCaller, {
        bloodGroup: 'O+',
        allergies: 'None',
        currentMedication: 'None',
      });

      expect(result.bloodGroup).toBe('O+');
      expect(result.allergies).toBe('None');
      expect(prismaMock.patient.update).toHaveBeenCalledWith({
        where: { id: 'patient-rec-001' },
        data: {
          bloodGroup: 'O+',
          allergies: 'None',
          currentMedication: 'None',
        },
      });
    });

    it('handles empty strings by converting to null consistently', async () => {
      prismaMock.patient.findUnique.mockResolvedValue(existingPatient);
      prismaMock.patient.update.mockResolvedValue({
        ...existingPatient,
        bloodGroup: null,
        allergies: null,
      });

      await service.updateProfile(patientCaller, {
        bloodGroup: '',
        allergies: '   ',
      });

      expect(prismaMock.patient.update).toHaveBeenCalledWith({
        where: { id: 'patient-rec-001' },
        data: {
          bloodGroup: null,
          allergies: null,
        },
      });
    });

    it('rejects updates from non-PATIENT callers', async () => {
      await expect(
        service.updateProfile(doctorCaller, { bloodGroup: 'A+' }),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.updateProfile(caregiverCaller, { bloodGroup: 'A+' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

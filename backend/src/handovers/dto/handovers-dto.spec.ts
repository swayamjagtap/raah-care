import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import {
  CancelHandoverDto,
  CreateHandoverDto,
  RejectHandoverDto,
  VitalsDto,
} from './index.js';

describe('Handovers DTO Validation', () => {
  describe('VitalsDto', () => {
    it('validates correct vitals numbers', async () => {
      const dto = plainToInstance(VitalsDto, {
        heartRate: 78,
        bloodPressureSystolic: 120,
        bloodPressureDiastolic: 80,
        respiratoryRate: 16,
        oxygenSaturation: 98.5,
        temperature: 36.8,
        glasgowComaScale: 15,
        bloodGlucose: 105,
        painScore: 2,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('rejects out-of-range vitals', async () => {
      const dto = plainToInstance(VitalsDto, {
        heartRate: 10, // min 20
        oxygenSaturation: 110, // max 100
        temperature: 55, // max 45
        glasgowComaScale: 2, // min 3
        painScore: 12, // max 10
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('CreateHandoverDto', () => {
    it('passes with valid caseId UUID', async () => {
      const dto = plainToInstance(CreateHandoverDto, {
        caseId: '123e4567-e89b-12d3-a456-426614174000',
        clinicalSummary: 'Patient stable en route, IV normal saline infused.',
        vitals: {
          heartRate: 75,
          oxygenSaturation: 99,
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('rejects invalid UUID for caseId', async () => {
      const dto = plainToInstance(CreateHandoverDto, {
        caseId: 'not-a-uuid',
      });

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'caseId')).toBe(true);
    });

    it('trims strings properly', async () => {
      const dto = plainToInstance(CreateHandoverDto, {
        caseId: '123e4567-e89b-12d3-a456-426614174000',
        clinicalSummary: '  Trimmed observation  ',
        notes: '  Trimmed notes  ',
      });

      expect(dto.clinicalSummary).toBe('Trimmed observation');
      expect(dto.notes).toBe('Trimmed notes');
    });
  });

  describe('RejectHandoverDto', () => {
    it('accepts reason with >= 10 non-whitespace characters', async () => {
      const dto = plainToInstance(RejectHandoverDto, {
        reason:
          'Emergency department at surge capacity; unable to safely admit patient.',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('rejects short reason (< 10 chars)', async () => {
      const dto = plainToInstance(RejectHandoverDto, {
        reason: 'Too busy',
      });

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'reason')).toBe(true);
    });

    it('rejects whitespace-only reason that trims to < 10 chars', async () => {
      const dto = plainToInstance(RejectHandoverDto, {
        reason: '   short   ',
      });

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'reason')).toBe(true);
    });
  });

  describe('CancelHandoverDto', () => {
    it('accepts reason with >= 10 non-whitespace characters', async () => {
      const dto = plainToInstance(CancelHandoverDto, {
        reason: 'Ambulance rerouted by central dispatch prior to intake.',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('rejects reason with < 10 characters', async () => {
      const dto = plainToInstance(CancelHandoverDto, {
        reason: 'Cancelled',
      });

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'reason')).toBe(true);
    });
  });
});

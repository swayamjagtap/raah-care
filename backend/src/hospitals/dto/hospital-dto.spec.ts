import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateHospitalDto } from './create-hospital.dto.js';
import { UpdateHospitalDto } from './update-hospital.dto.js';

describe('Hospital DTO Validation', () => {
  describe('CreateHospitalDto', () => {
    const validPayload = {
      name: 'City Care Hospital',
      code: 'CITY-01',
      address: '123 Health Ave, Mumbai',
      latitude: 19.076,
      longitude: 72.877,
    };

    it('accepts valid JSON numbers for latitude and longitude within range', async () => {
      const dto = plainToInstance(CreateHospitalDto, validPayload);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('rejects numeric strings for latitude without implicit conversion', async () => {
      const dto = plainToInstance(CreateHospitalDto, {
        ...validPayload,
        latitude: '19.076',
      });
      const errors = await validate(dto);
      const latError = errors.find((e) => e.property === 'latitude');
      expect(latError).toBeDefined();
      expect(latError?.constraints?.isNumber).toBe(
        'latitude must be a valid number',
      );
    });

    it('rejects numeric strings for longitude without implicit conversion', async () => {
      const dto = plainToInstance(CreateHospitalDto, {
        ...validPayload,
        longitude: '72.877',
      });
      const errors = await validate(dto);
      const lngError = errors.find((e) => e.property === 'longitude');
      expect(lngError).toBeDefined();
      expect(lngError?.constraints?.isNumber).toBe(
        'longitude must be a valid number',
      );
    });

    it('rejects latitude less than -90', async () => {
      const dto = plainToInstance(CreateHospitalDto, {
        ...validPayload,
        latitude: -90.001,
      });
      const errors = await validate(dto);
      const latError = errors.find((e) => e.property === 'latitude');
      expect(latError).toBeDefined();
      expect(latError?.constraints?.min).toBe(
        'latitude must not be less than -90',
      );
    });

    it('rejects latitude greater than 90', async () => {
      const dto = plainToInstance(CreateHospitalDto, {
        ...validPayload,
        latitude: 90.001,
      });
      const errors = await validate(dto);
      const latError = errors.find((e) => e.property === 'latitude');
      expect(latError).toBeDefined();
      expect(latError?.constraints?.max).toBe(
        'latitude must not be greater than 90',
      );
    });

    it('rejects longitude less than -180', async () => {
      const dto = plainToInstance(CreateHospitalDto, {
        ...validPayload,
        longitude: -180.001,
      });
      const errors = await validate(dto);
      const lngError = errors.find((e) => e.property === 'longitude');
      expect(lngError).toBeDefined();
      expect(lngError?.constraints?.min).toBe(
        'longitude must not be less than -180',
      );
    });

    it('rejects longitude greater than 180', async () => {
      const dto = plainToInstance(CreateHospitalDto, {
        ...validPayload,
        longitude: 180.001,
      });
      const errors = await validate(dto);
      const lngError = errors.find((e) => e.property === 'longitude');
      expect(lngError).toBeDefined();
      expect(lngError?.constraints?.max).toBe(
        'longitude must not be greater than 180',
      );
    });

    it('rejects NaN and Infinity for latitude and longitude', async () => {
      const dto = plainToInstance(CreateHospitalDto, {
        ...validPayload,
        latitude: NaN,
        longitude: Infinity,
      });
      const errors = await validate(dto);
      const latError = errors.find((e) => e.property === 'latitude');
      const lngError = errors.find((e) => e.property === 'longitude');
      expect(latError?.constraints?.isNumber).toBe(
        'latitude must be a valid number',
      );
      expect(lngError?.constraints?.isNumber).toBe(
        'longitude must be a valid number',
      );
    });
  });

  describe('UpdateHospitalDto', () => {
    it('allows omitting latitude and longitude for partial updates', async () => {
      const dto = plainToInstance(UpdateHospitalDto, {
        name: 'Updated Name',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('accepts valid JSON numbers for partial coordinate update', async () => {
      const dto = plainToInstance(UpdateHospitalDto, {
        latitude: -12.345,
        longitude: 45.678,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('rejects numeric strings on partial coordinate update', async () => {
      const dto = plainToInstance(UpdateHospitalDto, {
        latitude: '19.076',
        longitude: '72.877',
      });
      const errors = await validate(dto);
      const latError = errors.find((e) => e.property === 'latitude');
      const lngError = errors.find((e) => e.property === 'longitude');
      expect(latError?.constraints?.isNumber).toBe(
        'latitude must be a valid number',
      );
      expect(lngError?.constraints?.isNumber).toBe(
        'longitude must be a valid number',
      );
    });

    it('rejects out-of-range coordinates on update', async () => {
      const dto = plainToInstance(UpdateHospitalDto, {
        latitude: 95,
        longitude: -185,
      });
      const errors = await validate(dto);
      const latError = errors.find((e) => e.property === 'latitude');
      const lngError = errors.find((e) => e.property === 'longitude');
      expect(latError?.constraints?.max).toBe(
        'latitude must not be greater than 90',
      );
      expect(lngError?.constraints?.min).toBe(
        'longitude must not be less than -180',
      );
    });
  });
});

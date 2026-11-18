import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { ResourceType } from '../../../generated/prisma/enums.js';
import { QueryAmbulanceRecommendationsDto } from './query-ambulance-recommendations.dto.js';
import { QueryHospitalRecommendationsDto } from './query-hospital-recommendations.dto.js';
import { SelectDestinationDto } from './select-destination.dto.js';

describe('Allocation DTO Validation', () => {
  describe('QueryAmbulanceRecommendationsDto', () => {
    it('accepts an empty query and applies the default includeDisqualified value', async () => {
      const dto = plainToInstance(QueryAmbulanceRecommendationsDto, {});
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.includeDisqualified).toBe(true);
    });

    it.each([
      ['true', true],
      ['false', false],
    ])('transforms the string %s into boolean %s', async (input, expected) => {
      const dto = plainToInstance(QueryAmbulanceRecommendationsDto, {
        includeDisqualified: input,
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.includeDisqualified).toBe(expected);
    });

    it.each(['yes', '1', 'TRUE', '', 'invalid'])(
      'rejects invalid boolean query value %s',
      async (value) => {
        const dto = plainToInstance(QueryAmbulanceRecommendationsDto, {
          includeDisqualified: value,
        });
        const errors = await validate(dto);

        expect(
          errors.some((error) => error.property === 'includeDisqualified'),
        ).toBe(true);
      },
    );

    it('accepts a valid maxRangeKm numeric query value', async () => {
      const dto = plainToInstance(QueryAmbulanceRecommendationsDto, {
        maxRangeKm: '100',
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.maxRangeKm).toBe(100);
    });

    it.each(['1', '500'])(
      'accepts maxRangeKm at boundary %s',
      async (value) => {
        const dto = plainToInstance(QueryAmbulanceRecommendationsDto, {
          maxRangeKm: value,
        });
        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
      },
    );

    it.each(['0', '501', '-10', 'invalid', 'Infinity'])(
      'rejects invalid maxRangeKm value %s',
      async (value) => {
        const dto = plainToInstance(QueryAmbulanceRecommendationsDto, {
          maxRangeKm: value,
        });
        const errors = await validate(dto);

        expect(errors.some((error) => error.property === 'maxRangeKm')).toBe(
          true,
        );
      },
    );
  });

  describe('QueryHospitalRecommendationsDto', () => {
    it('accepts an empty query', async () => {
      const dto = plainToInstance(QueryHospitalRecommendationsDto, {});
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('accepts valid comma-separated resource types', async () => {
      const dto = plainToInstance(QueryHospitalRecommendationsDto, {
        requiredResources: `${ResourceType.ICU},${ResourceType.OXYGEN}`,
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.requiredResources).toEqual([
        ResourceType.ICU,
        ResourceType.OXYGEN,
      ]);
    });

    it('accepts valid resource type arrays', async () => {
      const dto = plainToInstance(QueryHospitalRecommendationsDto, {
        requiredResources: [ResourceType.ICU, ResourceType.OXYGEN],
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('rejects an unsupported resource type', async () => {
      const dto = plainToInstance(QueryHospitalRecommendationsDto, {
        requiredResources: ['INVALID_RESOURCE'],
      });
      const errors = await validate(dto);

      expect(
        errors.some((error) => error.property === 'requiredResources'),
      ).toBe(true);
    });

    it('rejects empty entries in comma-separated resource types', async () => {
      const dto = plainToInstance(QueryHospitalRecommendationsDto, {
        requiredResources: `${ResourceType.ICU},,${ResourceType.OXYGEN}`,
      });
      const errors = await validate(dto);

      expect(
        errors.some((error) => error.property === 'requiredResources'),
      ).toBe(true);
    });

    it('accepts valid comma-separated capabilities', async () => {
      const dto = plainToInstance(QueryHospitalRecommendationsDto, {
        requiredCapabilities: 'trauma care,cardiac care',
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.requiredCapabilities).toEqual(['trauma care', 'cardiac care']);
    });

    it('rejects empty capability entries', async () => {
      const dto = plainToInstance(QueryHospitalRecommendationsDto, {
        requiredCapabilities: 'trauma care,,cardiac care',
      });
      const errors = await validate(dto);

      expect(
        errors.some((error) => error.property === 'requiredCapabilities'),
      ).toBe(true);
    });

    it('rejects capability strings longer than 100 characters', async () => {
      const dto = plainToInstance(QueryHospitalRecommendationsDto, {
        requiredCapabilities: ['a'.repeat(101)],
      });
      const errors = await validate(dto);

      expect(
        errors.some((error) => error.property === 'requiredCapabilities'),
      ).toBe(true);
    });

    it('rejects more than 20 required resources', async () => {
      const dto = plainToInstance(QueryHospitalRecommendationsDto, {
        requiredResources: Array(21).fill(ResourceType.ICU),
      });
      const errors = await validate(dto);

      expect(
        errors.some((error) => error.property === 'requiredResources'),
      ).toBe(true);
    });

    it('rejects more than 20 required capabilities', async () => {
      const dto = plainToInstance(QueryHospitalRecommendationsDto, {
        requiredCapabilities: Array(21).fill('trauma care'),
      });
      const errors = await validate(dto);

      expect(
        errors.some((error) => error.property === 'requiredCapabilities'),
      ).toBe(true);
    });

    it('rejects a non-array, non-string resource value', async () => {
      const dto = plainToInstance(QueryHospitalRecommendationsDto, {
        requiredResources: 123,
      });
      const errors = await validate(dto);

      expect(
        errors.some((error) => error.property === 'requiredResources'),
      ).toBe(true);
    });
  });

  describe('SelectDestinationDto', () => {
    const validHospitalId = '550e8400-e29b-41d4-a716-446655440000';

    it('accepts a valid hospital UUID', async () => {
      const dto = plainToInstance(SelectDestinationDto, {
        hospitalId: validHospitalId,
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('rejects a missing hospital ID', async () => {
      const dto = plainToInstance(SelectDestinationDto, {});
      const errors = await validate(dto);

      expect(errors.some((error) => error.property === 'hospitalId')).toBe(
        true,
      );
    });

    it('rejects an invalid hospital UUID', async () => {
      const dto = plainToInstance(SelectDestinationDto, {
        hospitalId: 'not-a-uuid',
      });
      const errors = await validate(dto);

      expect(errors.some((error) => error.property === 'hospitalId')).toBe(
        true,
      );
    });

    it('accepts valid destination requirements and notes', async () => {
      const dto = plainToInstance(SelectDestinationDto, {
        hospitalId: validHospitalId,
        requiredResources: `${ResourceType.ICU},${ResourceType.OXYGEN}`,
        requiredCapabilities: 'trauma care,cardiac care',
        overrideReason: 'Dispatcher reviewed the limitations.',
        notes: 'Destination confirmed with dispatcher.',
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('rejects invalid resource types', async () => {
      const dto = plainToInstance(SelectDestinationDto, {
        hospitalId: validHospitalId,
        requiredResources: ['INVALID_RESOURCE'],
      });
      const errors = await validate(dto);

      expect(
        errors.some((error) => error.property === 'requiredResources'),
      ).toBe(true);
    });

    it('rejects empty capability entries', async () => {
      const dto = plainToInstance(SelectDestinationDto, {
        hospitalId: validHospitalId,
        requiredCapabilities: 'trauma care,,cardiac care',
      });
      const errors = await validate(dto);

      expect(
        errors.some((error) => error.property === 'requiredCapabilities'),
      ).toBe(true);
    });

    it('rejects override reasons longer than 2000 characters', async () => {
      const dto = plainToInstance(SelectDestinationDto, {
        hospitalId: validHospitalId,
        overrideReason: 'a'.repeat(2001),
      });
      const errors = await validate(dto);

      expect(errors.some((error) => error.property === 'overrideReason')).toBe(
        true,
      );
    });

    it('rejects notes longer than 2000 characters', async () => {
      const dto = plainToInstance(SelectDestinationDto, {
        hospitalId: validHospitalId,
        notes: 'a'.repeat(2001),
      });
      const errors = await validate(dto);

      expect(errors.some((error) => error.property === 'notes')).toBe(true);
    });

    it('rejects more than 20 required resources', async () => {
      const dto = plainToInstance(SelectDestinationDto, {
        hospitalId: validHospitalId,
        requiredResources: Array(21).fill(ResourceType.ICU),
      });
      const errors = await validate(dto);

      expect(
        errors.some((error) => error.property === 'requiredResources'),
      ).toBe(true);
    });
  });
});

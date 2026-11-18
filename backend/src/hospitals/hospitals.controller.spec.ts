import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  HospitalStatus,
  ResourceStatus,
  ResourceType,
} from '../../generated/prisma/enums.js';
import { HospitalsController } from './hospitals.controller.js';
import { HospitalsService } from './hospitals.service.js';

describe('HospitalsController', () => {
  let controller: HospitalsController;
  let service: {
    create: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    createResource: ReturnType<typeof vi.fn>;
    findResources: ReturnType<typeof vi.fn>;
    updateResource: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    service = {
      create: vi.fn(),
      findAll: vi.fn(),
      findOne: vi.fn(),
      update: vi.fn(),
      createResource: vi.fn(),
      findResources: vi.fn(),
      updateResource: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HospitalsController],
      providers: [
        {
          provide: HospitalsService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<HospitalsController>(HospitalsController);
  });

  it('delegates create to service', async () => {
    const dto = {
      name: 'City Care Hospital',
      code: 'CITY-01',
      address: '123 Health Ave, Mumbai',
      latitude: 19.076,
      longitude: 72.877,
      emergencyCapability: 'Level 1 Trauma',
      status: HospitalStatus.OPERATIONAL,
      phone: '+919876543210',
      email: 'contact@citycare.org',
    };
    const expected = { id: 'hosp-uuid-1', ...dto };
    service.create.mockResolvedValue(expected);

    const result = await controller.create(dto);
    expect(result).toBe(expected);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('delegates findAll to service', async () => {
    const query = {
      status: HospitalStatus.OPERATIONAL,
      page: 1,
      limit: 10,
    };
    const expected = {
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
    };
    service.findAll.mockResolvedValue(expected);

    const result = await controller.findAll(query);
    expect(result).toBe(expected);
    expect(service.findAll).toHaveBeenCalledWith(query);
  });

  it('delegates findOne to service', async () => {
    const expected = { id: 'hosp-uuid-1', name: 'City Care Hospital' };
    service.findOne.mockResolvedValue(expected);

    const result = await controller.findOne('hosp-uuid-1');
    expect(result).toBe(expected);
    expect(service.findOne).toHaveBeenCalledWith('hosp-uuid-1');
  });

  it('delegates update to service', async () => {
    const dto = { name: 'Updated Hospital Name' };
    const expected = { id: 'hosp-uuid-1', ...dto };
    service.update.mockResolvedValue(expected);

    const result = await controller.update('hosp-uuid-1', dto);
    expect(result).toBe(expected);
    expect(service.update).toHaveBeenCalledWith('hosp-uuid-1', dto);
  });

  it('delegates createResource to service', async () => {
    const dto = {
      type: ResourceType.ICU,
      quantity: 10,
      availableQuantity: 5,
      status: ResourceStatus.AVAILABLE,
    };
    const expected = { id: 'res-uuid-1', hospitalId: 'hosp-uuid-1', ...dto };
    service.createResource.mockResolvedValue(expected);

    const result = await controller.createResource('hosp-uuid-1', dto);
    expect(result).toBe(expected);
    expect(service.createResource).toHaveBeenCalledWith('hosp-uuid-1', dto);
  });

  it('delegates findResources to service', async () => {
    const expected = [{ id: 'res-uuid-1', type: ResourceType.ICU }];
    service.findResources.mockResolvedValue(expected);

    const result = await controller.findResources('hosp-uuid-1');
    expect(result).toBe(expected);
    expect(service.findResources).toHaveBeenCalledWith('hosp-uuid-1');
  });

  it('delegates updateResource to service', async () => {
    const dto = { availableQuantity: 3 };
    const expected = { id: 'res-uuid-1', availableQuantity: 3 };
    service.updateResource.mockResolvedValue(expected);

    const result = await controller.updateResource(
      'hosp-uuid-1',
      'res-uuid-1',
      dto,
    );
    expect(result).toBe(expected);
    expect(service.updateResource).toHaveBeenCalledWith(
      'hosp-uuid-1',
      'res-uuid-1',
      dto,
    );
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CasePriority, CaseStatus } from '../../generated/prisma/enums.js';
import { EmergenciesController } from './emergencies.controller.js';
import { EmergenciesService } from './emergencies.service.js';

describe('EmergenciesController', () => {
  let controller: EmergenciesController;
  let service: {
    create: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    updateStatus: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    service = {
      create: vi.fn(),
      findAll: vi.fn(),
      findOne: vi.fn(),
      updateStatus: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmergenciesController],
      providers: [
        {
          provide: EmergenciesService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<EmergenciesController>(EmergenciesController);
  });

  it('delegates create to service', async () => {
    const dto = {
      incidentLatitude: 19.076,
      incidentLongitude: 72.8777,
      incidentAddress: 'Marine Drive, Mumbai',
      priority: CasePriority.HIGH,
    };
    const expected = { id: 'uuid-1', ...dto };
    service.create.mockResolvedValue(expected);

    const result = await controller.create(dto);
    expect(result).toBe(expected);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('delegates findAll to service', async () => {
    const query = { page: 1, limit: 10 };
    const expected = { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
    service.findAll.mockResolvedValue(expected);

    const result = await controller.findAll(query);
    expect(result).toBe(expected);
    expect(service.findAll).toHaveBeenCalledWith(query);
  });

  it('delegates findOne to service', async () => {
    const expected = { id: 'uuid-1' };
    service.findOne.mockResolvedValue(expected);

    const result = await controller.findOne('uuid-1');
    expect(result).toBe(expected);
    expect(service.findOne).toHaveBeenCalledWith('uuid-1');
  });

  it('delegates updateStatus to service', async () => {
    const dto = { status: CaseStatus.AMBULANCE_ASSIGNED };
    const expected = { id: 'uuid-1', status: CaseStatus.AMBULANCE_ASSIGNED };
    service.updateStatus.mockResolvedValue(expected);

    const result = await controller.updateStatus('uuid-1', dto);
    expect(result).toBe(expected);
    expect(service.updateStatus).toHaveBeenCalledWith('uuid-1', dto);
  });
});

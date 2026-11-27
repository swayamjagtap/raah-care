import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AmbulanceStatus, AmbulanceType } from '../../generated/prisma/enums.js';
import { AmbulancesController } from './ambulances.controller.js';
import { AmbulancesService } from './ambulances.service.js';

describe('AmbulancesController', () => {
  let controller: AmbulancesController;
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
      controllers: [AmbulancesController],
      providers: [
        {
          provide: AmbulancesService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<AmbulancesController>(AmbulancesController);
  });

  it('delegates create to service', async () => {
    const dto = {
      registrationNumber: 'MH01-1234',
      callSign: 'RAAH-01',
      type: AmbulanceType.BLS,
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
    expect(service.findOne).toHaveBeenCalledWith('uuid-1', undefined);
  });

  it('delegates updateStatus to service', async () => {
    const dto = { status: AmbulanceStatus.AVAILABLE };
    const expected = { id: 'uuid-1', status: AmbulanceStatus.AVAILABLE };
    service.updateStatus.mockResolvedValue(expected);

    const result = await controller.updateStatus('uuid-1', dto);
    expect(result).toBe(expected);
    expect(service.updateStatus).toHaveBeenCalledWith('uuid-1', dto);
  });
});

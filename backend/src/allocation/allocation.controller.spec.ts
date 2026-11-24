import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AllocationController } from './allocation.controller.js';
import { AllocationService } from './allocation.service.js';

describe('AllocationController', () => {
  let controller: AllocationController;
  let service: {
    getAmbulanceRecommendations: ReturnType<typeof vi.fn>;
    getHospitalRecommendations: ReturnType<typeof vi.fn>;
    selectDestination: ReturnType<typeof vi.fn>;
  };

  const emergencyId = '00000000-0000-0000-0000-000000000001';

  beforeEach(async () => {
    service = {
      getAmbulanceRecommendations: vi.fn(),
      getHospitalRecommendations: vi.fn(),
      selectDestination: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AllocationController],
      providers: [
        {
          provide: AllocationService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<AllocationController>(AllocationController);
  });

  it('delegates getAmbulanceRecommendations to AllocationService', async () => {
    const query = { includeDisqualified: false, maxRangeKm: 25 };
    const mockResult = [{ candidateId: 'amb-1', score: 85 }];
    service.getAmbulanceRecommendations.mockResolvedValue(mockResult);

    const result = await controller.getAmbulanceRecommendations(
      emergencyId,
      query,
    );

    expect(result).toEqual(mockResult);
    expect(service.getAmbulanceRecommendations).toHaveBeenCalledWith(
      emergencyId,
      query,
    );
  });

  it('delegates getHospitalRecommendations to AllocationService', async () => {
    const query = { includeDisqualified: true };
    const mockResult = [{ hospitalId: 'hosp-1', score: 90 }];
    service.getHospitalRecommendations.mockResolvedValue(mockResult);

    const result = await controller.getHospitalRecommendations(
      emergencyId,
      query,
    );

    expect(result).toEqual(mockResult);
    expect(service.getHospitalRecommendations).toHaveBeenCalledWith(
      emergencyId,
      query,
    );
  });

  it('delegates selectDestination to AllocationService', async () => {
    const dto = { hospitalId: '00000000-0000-0000-0000-000000000002' };
    const mockResult = {
      id: emergencyId,
      destinationHospitalId: dto.hospitalId,
    };
    service.selectDestination.mockResolvedValue(mockResult);

    const result = await controller.selectDestination(emergencyId, dto);

    expect(result).toEqual(mockResult);
    expect(service.selectDestination).toHaveBeenCalledWith(emergencyId, dto);
  });
});

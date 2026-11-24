import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AmbulanceStatus,
  AmbulanceType,
  CaseEventType,
  CasePriority,
  CaseStatus,
  HospitalStatus,
  ResourceStatus,
  ResourceType,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  HOSPITAL_ACCEPTANCE_DISCLAIMER,
  PROVISIONAL_POLICY_NOTICE,
} from './allocation.calculator.js';
import { AllocationService } from './allocation.service.js';

describe('AllocationService', () => {
  let service: AllocationService;
  let prisma: {
    emergencyCase: {
      findUnique: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    ambulance: {
      findMany: ReturnType<typeof vi.fn>;
    };
    hospital: {
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    caseEvent: {
      create: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };

  const mockEmergency = {
    id: '00000000-0000-0000-0000-000000000001',
    caseNumber: 'RAAH-2026-000001',
    status: CaseStatus.PATIENT_ONBOARD,
    priority: CasePriority.CRITICAL,
    incidentLatitude: 19.076,
    incidentLongitude: 72.8777,
    incidentAddress: 'Andheri West, Mumbai',
    symptoms: 'Acute respiratory distress',
    notes: 'Requires ventilator',
    currentCondition: 'Critical',
    destinationHospitalId: null as string | null,
  };

  const mockAmbulances = [
    {
      id: 'amb-als-1',
      callSign: 'ALS-01',
      registrationNumber: 'MH01-1001',
      type: AmbulanceType.ALS,
      status: AmbulanceStatus.AVAILABLE,
      isAvailable: true,
      currentLatitude: 19.08,
      currentLongitude: 72.88,
      hospitalId: 'hosp-1',
    },
    {
      id: 'amb-bls-1',
      callSign: 'BLS-01',
      registrationNumber: 'MH01-1002',
      type: AmbulanceType.BLS,
      status: AmbulanceStatus.AVAILABLE,
      isAvailable: true,
      currentLatitude: 19.14, // Far ambulance (> 7 km)
      currentLongitude: 72.92,
      hospitalId: 'hosp-2',
    },
    {
      id: 'amb-disqualified',
      callSign: 'OOS-01',
      registrationNumber: 'MH01-1003',
      type: AmbulanceType.ALS,
      status: AmbulanceStatus.OUT_OF_SERVICE,
      isAvailable: false,
      currentLatitude: 19.077,
      currentLongitude: 72.878,
      hospitalId: null,
    },
    {
      id: 'amb-no-gps',
      callSign: 'NO-GPS',
      registrationNumber: 'MH01-1004',
      type: AmbulanceType.ALS,
      status: AmbulanceStatus.AVAILABLE,
      isAvailable: true,
      currentLatitude: null,
      currentLongitude: null,
      hospitalId: null,
    },
  ];

  const mockHospitals = [
    {
      id: 'hosp-1',
      name: 'City Apex Hospital',
      code: 'APEX-01',
      latitude: 19.085,
      longitude: 72.885,
      status: HospitalStatus.OPERATIONAL,
      emergencyCapability: 'TRAUMA, ICU, VENTILATORS',
      resources: [
        {
          id: 'res-1',
          hospitalId: 'hosp-1',
          type: ResourceType.OXYGEN,
          status: ResourceStatus.AVAILABLE,
          quantity: 20,
          availableQuantity: 15,
        },
        {
          id: 'res-2',
          hospitalId: 'hosp-1',
          type: ResourceType.VENTILATORS,
          status: ResourceStatus.AVAILABLE,
          quantity: 10,
          availableQuantity: 5,
        },
      ],
    },
    {
      id: 'hosp-low-stock',
      name: 'Metro General Hospital',
      code: 'METRO-01',
      latitude: 19.11,
      longitude: 72.89,
      status: HospitalStatus.OPERATIONAL,
      emergencyCapability: 'TRAUMA, OXYGEN',
      resources: [
        {
          id: 'res-3',
          hospitalId: 'hosp-low-stock',
          type: ResourceType.OXYGEN,
          status: ResourceStatus.LOW_STOCK,
          quantity: 10,
          availableQuantity: 1,
        },
      ],
    },
    {
      id: 'hosp-closed',
      name: 'St. Closed Hospital',
      code: 'CLOSED-01',
      latitude: 19.078,
      longitude: 72.879,
      status: HospitalStatus.CLOSED,
      emergencyCapability: 'GENERAL',
      resources: [],
    },
    {
      id: 'hosp-diverting',
      name: 'Diverting Emergency Care',
      code: 'DIVERT-01',
      latitude: 19.08,
      longitude: 72.88,
      status: HospitalStatus.DIVERTING,
      emergencyCapability: 'GENERAL',
      resources: [],
    },
    {
      id: 'hosp-incompatible-res',
      name: 'Exhausted Specialty Center',
      code: 'EXH-01',
      latitude: 19.082,
      longitude: 72.882,
      status: HospitalStatus.OPERATIONAL,
      emergencyCapability: 'VENTILATORS',
      resources: [
        {
          id: 'res-4',
          hospitalId: 'hosp-incompatible-res',
          type: ResourceType.VENTILATORS,
          status: ResourceStatus.UNAVAILABLE,
          quantity: 5,
          availableQuantity: 0,
        },
      ],
    },
    {
      id: 'hosp-missing-res',
      name: 'Suburban Clinic',
      code: 'SUB-01',
      latitude: 19.09,
      longitude: 72.87,
      status: HospitalStatus.OPERATIONAL,
      emergencyCapability: 'CLINIC',
      resources: [],
    },
  ];

  beforeEach(async () => {
    let currentCaseState = { ...mockEmergency };

    prisma = {
      emergencyCase: {
        findUnique: vi.fn(async () => currentCaseState),
        updateMany: vi.fn(async ({ data }) => {
          currentCaseState = { ...currentCaseState, ...data };
          return { count: 1 };
        }),
      },
      ambulance: {
        findMany: vi.fn(),
      },
      hospital: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      caseEvent: {
        create: vi.fn().mockResolvedValue({ id: 'event-1' }),
      },
      $transaction: vi.fn(async (cb: (tx: typeof prisma) => unknown) =>
        cb(prisma),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AllocationService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<AllocationService>(AllocationService);
  });

  // ─── 1. Emergency Not Found ──────────────────────────────────────────────────

  describe('Emergency not found handling', () => {
    it('throws NotFoundException when emergency does not exist for ambulance recommendations', async () => {
      prisma.emergencyCase.findUnique.mockResolvedValue(null);

      await expect(
        service.getAmbulanceRecommendations('non-existent-id', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when emergency does not exist for hospital recommendations', async () => {
      prisma.emergencyCase.findUnique.mockResolvedValue(null);

      await expect(
        service.getHospitalRecommendations('non-existent-id', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when emergency does not exist for destination selection', async () => {
      prisma.emergencyCase.findUnique.mockResolvedValue(null);

      await expect(
        service.selectDestination('non-existent-id', {
          hospitalId: 'hosp-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── 2. Ambulance Recommendation & Range Filtering ──────────────────────────

  describe('Ambulance recommendations and geographic filtering', () => {
    it('ranks available ambulances and attaches provisional policy disclosure', async () => {
      prisma.emergencyCase.findUnique.mockResolvedValue(mockEmergency);
      prisma.ambulance.findMany.mockResolvedValue(mockAmbulances);

      const results = await service.getAmbulanceRecommendations(
        mockEmergency.id,
        {},
      );

      expect(results).toBeDefined();
      expect(results.length).toBe(mockAmbulances.length);

      const top = results[0];
      expect(top.candidateId).toBe('amb-als-1');
      expect(top.score).toBeGreaterThan(0);
      expect(['OPTIMAL', 'SUITABLE']).toContain(top.tier);
      expect(top.policyNotice).toBe(PROVISIONAL_POLICY_NOTICE);
    });

    it('filters out distant ambulances exceeding maxRangeKm from results', async () => {
      prisma.emergencyCase.findUnique.mockResolvedValue(mockEmergency);
      prisma.ambulance.findMany.mockResolvedValue(mockAmbulances);

      // maxRangeKm: 5 km should exclude amb-bls-1 (> 7 km away)
      const results = await service.getAmbulanceRecommendations(
        mockEmergency.id,
        { maxRangeKm: 5 },
      );

      expect(results).toBeDefined();
      expect(results.some((r) => r.candidateId === 'amb-bls-1')).toBe(false);
      expect(results.some((r) => r.candidateId === 'amb-als-1')).toBe(true);
    });

    it('preserves ambulances with unknown GPS location even when maxRangeKm is set', async () => {
      prisma.emergencyCase.findUnique.mockResolvedValue(mockEmergency);
      prisma.ambulance.findMany.mockResolvedValue(mockAmbulances);

      const results = await service.getAmbulanceRecommendations(
        mockEmergency.id,
        { maxRangeKm: 5 },
      );

      const noGps = results.find((r) => r.candidateId === 'amb-no-gps');
      expect(noGps).toBeDefined();
      expect(noGps!.hasUnknownLocation).toBe(true);
      expect(noGps!.locationStatus).toBe('UNKNOWN_LOCATION');
      expect(noGps!.evaluationState).toBe('REQUIRES_REVIEW');
      expect(noGps!.distanceKm).toBeNull();
    });

    it('filters out disqualified candidates when includeDisqualified is false', async () => {
      prisma.emergencyCase.findUnique.mockResolvedValue(mockEmergency);
      prisma.ambulance.findMany.mockResolvedValue(mockAmbulances);

      const results = await service.getAmbulanceRecommendations(
        mockEmergency.id,
        { includeDisqualified: false },
      );

      expect(results.some((r) => r.evaluationState === 'DISQUALIFIED')).toBe(
        false,
      );
      expect(results.some((r) => r.candidateId === 'amb-disqualified')).toBe(
        false,
      );
    });
  });

  // ─── 3. Hospital Recommendations & Range Filtering ──────────────────────────

  describe('Hospital recommendations and geographic filtering', () => {
    it('ranks hospitals and preserves clinical disclaimers and provisional policy notices', async () => {
      prisma.emergencyCase.findUnique.mockResolvedValue(mockEmergency);
      prisma.hospital.findMany.mockResolvedValue(mockHospitals);

      const results = await service.getHospitalRecommendations(
        mockEmergency.id,
        {
          requiredResources: [ResourceType.VENTILATORS],
        },
      );

      expect(results).toBeDefined();
      expect(results.length).toBe(mockHospitals.length);

      const top = results[0];
      expect(top.hospitalId).toBe('hosp-1');
      expect(top.evaluationState).toBe('ELIGIBLE');
      expect(top.clinicalDisclaimer).toBe(HOSPITAL_ACCEPTANCE_DISCLAIMER);
      expect(top.policyNotice).toBe(PROVISIONAL_POLICY_NOTICE);
    });

    it('filters out distant hospitals exceeding maxRangeKm', async () => {
      prisma.emergencyCase.findUnique.mockResolvedValue(mockEmergency);
      prisma.hospital.findMany.mockResolvedValue(mockHospitals);

      // maxRangeKm: 2 km should include hosp-1 (~1.3 km) but exclude hosp-low-stock (~4 km)
      const results = await service.getHospitalRecommendations(
        mockEmergency.id,
        { maxRangeKm: 2 },
      );

      expect(results.some((r) => r.hospitalId === 'hosp-1')).toBe(true);
      expect(results.some((r) => r.hospitalId === 'hosp-low-stock')).toBe(
        false,
      );
    });

    it('flags unconfirmed missing resources as UNCONFIRMED_MISSING and REQUIRES_REVIEW', async () => {
      prisma.emergencyCase.findUnique.mockResolvedValue(mockEmergency);
      prisma.hospital.findMany.mockResolvedValue(mockHospitals);

      const results = await service.getHospitalRecommendations(
        mockEmergency.id,
        {
          requiredResources: [ResourceType.VENTILATORS],
        },
      );

      const missingResHosp = results.find(
        (r) => r.hospitalId === 'hosp-missing-res',
      );
      expect(missingResHosp).toBeDefined();
      expect(missingResHosp!.evaluationState).toBe('REQUIRES_REVIEW');
      expect(missingResHosp!.resourceAssessmentStatus).toBe(
        'UNCONFIRMED_MISSING',
      );
      expect(
        missingResHosp!.reviewReasons.some((r) =>
          r.includes('UNCONFIRMED_RESOURCE'),
        ),
      ).toBe(true);
    });

    it('flags LOW_STOCK required resources with LOW_STOCK_WARNING and REQUIRES_REVIEW', async () => {
      prisma.emergencyCase.findUnique.mockResolvedValue(mockEmergency);
      prisma.hospital.findMany.mockResolvedValue(mockHospitals);

      const results = await service.getHospitalRecommendations(
        mockEmergency.id,
        {
          requiredResources: [ResourceType.OXYGEN],
        },
      );

      const lowStockHosp = results.find(
        (r) => r.hospitalId === 'hosp-low-stock',
      );
      expect(lowStockHosp).toBeDefined();
      expect(lowStockHosp!.evaluationState).toBe('REQUIRES_REVIEW');
      expect(lowStockHosp!.resourceAssessmentStatus).toBe('LOW_STOCK_WARNING');
      expect(
        lowStockHosp!.reviewReasons.some((r) => r.includes('LOW_STOCK')),
      ).toBe(true);
    });
  });

  // ─── 4. Hospital Operational Safety (Hard Restrictions) ─────────────────────

  describe('Hospital operational safety and hard disqualifications', () => {
    it('rejects CLOSED hospital selection even with an explicit overrideReason', async () => {
      prisma.emergencyCase.findUnique.mockResolvedValue(mockEmergency);
      prisma.hospital.findUnique.mockResolvedValue(mockHospitals[2]); // hosp-closed

      await expect(
        service.selectDestination(mockEmergency.id, {
          hospitalId: 'hosp-closed',
          overrideReason:
            'Critical disaster override requested by lead field paramedic',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects DIVERTING hospital selection even with an explicit overrideReason', async () => {
      prisma.emergencyCase.findUnique.mockResolvedValue(mockEmergency);
      prisma.hospital.findUnique.mockResolvedValue(mockHospitals[3]); // hosp-diverting

      await expect(
        service.selectDestination(mockEmergency.id, {
          hospitalId: 'hosp-diverting',
          overrideReason: 'Critical proximity override requested by field team',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects hospital with INCOMPATIBLE required resources even with overrideReason', async () => {
      prisma.emergencyCase.findUnique.mockResolvedValue(mockEmergency);
      prisma.hospital.findUnique.mockResolvedValue(mockHospitals[4]); // hosp-incompatible-res (0 ventilators)

      await expect(
        service.selectDestination(mockEmergency.id, {
          hospitalId: 'hosp-incompatible-res',
          requiredResources: [ResourceType.VENTILATORS],
          overrideReason:
            'Attempting to transport despite depleted life-support inventory',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows selecting review-required hospital when valid justification (>= 10 chars) is provided', async () => {
      prisma.emergencyCase.findUnique.mockResolvedValue(mockEmergency);
      prisma.hospital.findUnique.mockResolvedValue(mockHospitals[1]); // hosp-low-stock

      const overrideReason =
        'Confirmed direct verbal intake acceptance with Dr. Sharma in ED';

      const result = await service.selectDestination(mockEmergency.id, {
        hospitalId: 'hosp-low-stock',
        requiredResources: [ResourceType.OXYGEN],
        overrideReason,
      });

      expect(result).toBeDefined();
      expect(result.destinationHospitalId).toBe('hosp-low-stock');
      expect(result.evaluation.evaluationState).toBe('REQUIRES_REVIEW');

      expect(prisma.caseEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          caseId: mockEmergency.id,
          eventType: CaseEventType.HOSPITAL_SELECTED,
          notes: overrideReason,
          payload: expect.objectContaining({
            destinationHospitalId: 'hosp-low-stock',
            wasOverridden: true,
            overrideReason,
            evaluationState: 'REQUIRES_REVIEW',
          }),
        }),
      });
    });
  });

  // ─── 5. Override Reason Validation ──────────────────────────────────────────

  describe('Override reason validation', () => {
    it('rejects whitespace-only override reason at service level', async () => {
      prisma.emergencyCase.findUnique.mockResolvedValue(mockEmergency);
      prisma.hospital.findUnique.mockResolvedValue(mockHospitals[1]); // hosp-low-stock

      await expect(
        service.selectDestination(mockEmergency.id, {
          hospitalId: 'hosp-low-stock',
          requiredResources: [ResourceType.OXYGEN],
          overrideReason: '           ',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects override reason shorter than 10 non-whitespace characters at service level', async () => {
      prisma.emergencyCase.findUnique.mockResolvedValue(mockEmergency);
      prisma.hospital.findUnique.mockResolvedValue(mockHospitals[1]); // hosp-low-stock

      await expect(
        service.selectDestination(mockEmergency.id, {
          hospitalId: 'hosp-low-stock',
          requiredResources: [ResourceType.OXYGEN],
          overrideReason: 'Too short', // 9 characters
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects review-required hospital when overrideReason is missing', async () => {
      prisma.emergencyCase.findUnique.mockResolvedValue(mockEmergency);
      prisma.hospital.findUnique.mockResolvedValue(mockHospitals[1]); // hosp-low-stock

      await expect(
        service.selectDestination(mockEmergency.id, {
          hospitalId: 'hosp-low-stock',
          requiredResources: [ResourceType.OXYGEN],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── 6. Destination Selection Concurrency Protection ─────────────────────────

  describe('Destination concurrency protection', () => {
    it('throws ConflictException when a concurrent cancellation or status change occurs', async () => {
      prisma.emergencyCase.findUnique.mockResolvedValue(mockEmergency);
      prisma.hospital.findUnique.mockResolvedValue(mockHospitals[0]);
      // Simulate concurrent update causing updateMany to match 0 rows
      prisma.emergencyCase.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.selectDestination(mockEmergency.id, {
          hospitalId: 'hosp-1',
          requiredResources: [ResourceType.VENTILATORS],
        }),
      ).rejects.toThrow(ConflictException);

      expect(prisma.caseEvent.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when another dispatcher changes destination concurrently', async () => {
      prisma.emergencyCase.findUnique.mockResolvedValue({
        ...mockEmergency,
        destinationHospitalId: 'hosp-1',
      });
      prisma.hospital.findUnique.mockResolvedValue(mockHospitals[1]);
      // Concurrent update changed destinationHospitalId under read committed
      prisma.emergencyCase.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.selectDestination(mockEmergency.id, {
          hospitalId: 'hosp-low-stock',
          requiredResources: [ResourceType.OXYGEN],
          overrideReason:
            'Changing destination after medical director consultation',
        }),
      ).rejects.toThrow(ConflictException);

      expect(prisma.caseEvent.create).not.toHaveBeenCalled();
    });

    it('propagates database errors and prevents partial event creation', async () => {
      prisma.emergencyCase.findUnique.mockResolvedValue(mockEmergency);
      prisma.hospital.findUnique.mockResolvedValue(mockHospitals[0]);
      prisma.emergencyCase.updateMany.mockRejectedValue(
        new Error('Database deadlock encountered'),
      );

      await expect(
        service.selectDestination(mockEmergency.id, {
          hospitalId: 'hosp-1',
        }),
      ).rejects.toThrow('Database deadlock encountered');

      expect(prisma.caseEvent.create).not.toHaveBeenCalled();
    });
  });

  // ─── 7. Idempotent Destination Selection ─────────────────────────────────────

  describe('Idempotent destination selection', () => {
    it('preserves existing status and skips unnecessary events on same-hospital reselection', async () => {
      const emergencyInNotifiedState = {
        ...mockEmergency,
        status: CaseStatus.HOSPITAL_NOTIFIED,
        destinationHospitalId: 'hosp-1',
      };

      prisma.emergencyCase.findUnique.mockResolvedValue(
        emergencyInNotifiedState,
      );
      prisma.hospital.findUnique.mockResolvedValue(mockHospitals[0]);

      const result = await service.selectDestination(
        emergencyInNotifiedState.id,
        {
          hospitalId: 'hosp-1',
        },
      );

      expect(result).toBeDefined();
      expect(result.status).toBe(CaseStatus.HOSPITAL_NOTIFIED); // Status is NOT regressed!
      expect(result.destinationHospitalId).toBe('hosp-1');

      // Crucial: no DB update and no duplicate CaseEvent
      expect(prisma.emergencyCase.updateMany).not.toHaveBeenCalled();
      expect(prisma.caseEvent.create).not.toHaveBeenCalled();
    });

    it('records DESTINATION_CHANGED event when changing destination from hosp-1 to hosp-low-stock', async () => {
      const emergencyWithExistingDestination = {
        ...mockEmergency,
        status: CaseStatus.HOSPITAL_SELECTED,
        destinationHospitalId: 'hosp-1',
      };

      prisma.emergencyCase.findUnique.mockResolvedValue(
        emergencyWithExistingDestination,
      );
      prisma.hospital.findUnique.mockResolvedValue(mockHospitals[1]);

      const overrideReason =
        'Diversion ordered by regional medical direction due to traffic obstruction';

      await service.selectDestination(emergencyWithExistingDestination.id, {
        hospitalId: 'hosp-low-stock',
        requiredResources: [ResourceType.OXYGEN],
        overrideReason,
      });

      expect(prisma.caseEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          caseId: emergencyWithExistingDestination.id,
          eventType: CaseEventType.DESTINATION_CHANGED,
          notes: overrideReason,
          payload: expect.objectContaining({
            previousDestinationHospitalId: 'hosp-1',
            destinationHospitalId: 'hosp-low-stock',
            wasOverridden: true,
            overrideReason,
          }),
        }),
      });
    });
  });
});

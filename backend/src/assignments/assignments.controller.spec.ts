import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AssignmentStatus } from '../../generated/prisma/enums.js';
import {
  AssignmentsController,
  AssignmentsNestedController,
} from './assignments.controller.js';
import { AssignmentsService } from './assignments.service.js';

describe('Assignments Controllers', () => {
  let nestedController: AssignmentsNestedController;
  let controller: AssignmentsController;
  let service: {
    create: ReturnType<typeof vi.fn>;
    findAllForCase: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    accept: ReturnType<typeof vi.fn>;
    reject: ReturnType<typeof vi.fn>;
    updateStatus: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    service = {
      create: vi.fn(),
      findAllForCase: vi.fn(),
      findOne: vi.fn(),
      accept: vi.fn(),
      reject: vi.fn(),
      updateStatus: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssignmentsNestedController, AssignmentsController],
      providers: [
        {
          provide: AssignmentsService,
          useValue: service,
        },
      ],
    }).compile();

    nestedController = module.get<AssignmentsNestedController>(
      AssignmentsNestedController,
    );
    controller = module.get<AssignmentsController>(AssignmentsController);
  });

  describe('AssignmentsNestedController', () => {
    it('delegates create to service', async () => {
      const dto = { ambulanceId: 'amb-1', notes: 'Call' };
      const expected = { id: 'asg-1', ...dto };
      service.create.mockResolvedValue(expected);

      const result = await nestedController.create('emg-1', dto);
      expect(result).toBe(expected);
      expect(service.create).toHaveBeenCalledWith('emg-1', dto, undefined);
    });

    it('delegates findAll to service', async () => {
      const expected = [{ id: 'asg-1' }];
      service.findAllForCase.mockResolvedValue(expected);

      const result = await nestedController.findAll('emg-1');
      expect(result).toBe(expected);
      expect(service.findAllForCase).toHaveBeenCalledWith('emg-1');
    });
  });

  describe('AssignmentsController', () => {
    it('delegates findOne to service', async () => {
      const expected = { id: 'asg-1' };
      service.findOne.mockResolvedValue(expected);

      const result = await controller.findOne('asg-1');
      expect(result).toBe(expected);
      expect(service.findOne).toHaveBeenCalledWith('asg-1', undefined);
    });

    it('delegates accept to service', async () => {
      const dto = { notes: 'Accepted' };
      const expected = { id: 'asg-1', status: AssignmentStatus.ACCEPTED };
      service.accept.mockResolvedValue(expected);

      const result = await controller.accept('asg-1', dto);
      expect(result).toBe(expected);
      expect(service.accept).toHaveBeenCalledWith('asg-1', dto, undefined);
    });

    it('delegates reject to service', async () => {
      const dto = { notes: 'Busy' };
      const expected = { id: 'asg-1', status: AssignmentStatus.REJECTED };
      service.reject.mockResolvedValue(expected);

      const result = await controller.reject('asg-1', dto);
      expect(result).toBe(expected);
      expect(service.reject).toHaveBeenCalledWith('asg-1', dto, undefined);
    });

    it('delegates updateStatus to service', async () => {
      const dto = { status: AssignmentStatus.EN_ROUTE };
      const expected = { id: 'asg-1', status: AssignmentStatus.EN_ROUTE };
      service.updateStatus.mockResolvedValue(expected);

      const result = await controller.updateStatus('asg-1', dto);
      expect(result).toBe(expected);
      expect(service.updateStatus).toHaveBeenCalledWith('asg-1', dto, undefined);
    });
  });
});

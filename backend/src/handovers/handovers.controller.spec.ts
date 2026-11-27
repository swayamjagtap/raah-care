import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HandoversController } from './handovers.controller.js';
import { HandoversService } from './handovers.service.js';

describe('HandoversController', () => {
  let controller: HandoversController;
  let service: HandoversService;

  beforeEach(() => {
    service = {
      initiateHandover: vi.fn().mockResolvedValue({ id: 'h-1' }),
      findOne: vi.fn().mockResolvedValue({ id: 'h-1' }),
      findActiveByCaseId: vi.fn().mockResolvedValue({ id: 'h-1' }),
      findAllForCase: vi.fn().mockResolvedValue({ data: [{ id: 'h-1' }] }),
      updateHandover: vi.fn().mockResolvedValue({ id: 'h-1' }),
      completeHandover: vi
        .fn()
        .mockResolvedValue({ id: 'h-1', status: 'COMPLETED' }),
      rejectHandover: vi
        .fn()
        .mockResolvedValue({ id: 'h-1', status: 'REJECTED' }),
      cancelHandover: vi
        .fn()
        .mockResolvedValue({ id: 'h-1', status: 'CANCELLED' }),
    } as unknown as HandoversService;

    controller = new HandoversController(service);
  });

  it('delegates create to initiateHandover', async () => {
    const dto = { caseId: '123e4567-e89b-12d3-a456-426614174000' };
    const res = await controller.create(dto);
    expect(service.initiateHandover).toHaveBeenCalledWith(dto, undefined);
    expect(res).toEqual({ id: 'h-1' });
  });

  it('delegates findOne', async () => {
    const res = await controller.findOne(
      '123e4567-e89b-12d3-a456-426614174000',
    );
    expect(service.findOne).toHaveBeenCalledWith(
      '123e4567-e89b-12d3-a456-426614174000',
      undefined,
    );
    expect(res).toEqual({ id: 'h-1' });
  });

  it('delegates complete', async () => {
    const dto = { notes: 'Complete' };
    const res = await controller.complete(
      '123e4567-e89b-12d3-a456-426614174000',
      dto,
    );
    expect(service.completeHandover).toHaveBeenCalledWith(
      '123e4567-e89b-12d3-a456-426614174000',
      dto,
      undefined,
    );
    expect(res.status).toBe('COMPLETED');
  });

  it('delegates reject', async () => {
    const dto = { reason: 'No beds available in ICU' };
    const res = await controller.reject(
      '123e4567-e89b-12d3-a456-426614174000',
      dto,
    );
    expect(service.rejectHandover).toHaveBeenCalledWith(
      '123e4567-e89b-12d3-a456-426614174000',
      dto,
      undefined,
    );
    expect(res.status).toBe('REJECTED');
  });

  it('delegates cancel', async () => {
    const dto = { reason: 'Rerouted to other hospital' };
    const res = await controller.cancel(
      '123e4567-e89b-12d3-a456-426614174000',
      dto,
    );
    expect(service.cancelHandover).toHaveBeenCalledWith(
      '123e4567-e89b-12d3-a456-426614174000',
      dto,
      undefined,
    );
    expect(res.status).toBe('CANCELLED');
  });
});

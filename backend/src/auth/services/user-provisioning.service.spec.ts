import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '../../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UserProvisioningService } from './user-provisioning.service.js';

describe('UserProvisioningService', () => {
  let service: UserProvisioningService;
  let prismaMock: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    hospital: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    ambulance: {
      findUnique: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    prismaMock = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      hospital: {
        findUnique: vi.fn(),
      },
      ambulance: {
        findUnique: vi.fn(),
      },
    };
    service = new UserProvisioningService(prismaMock as unknown as PrismaService);
  });

  describe('resolveUserFromJwt', () => {
    it('throws UnauthorizedException when payload or sub claim is missing', async () => {
      await expect(service.resolveUserFromJwt(null as any)).rejects.toThrow(UnauthorizedException);
      await expect(service.resolveUserFromJwt({ sub: '' } as any)).rejects.toThrow(UnauthorizedException);
    });

    it('resolves active existing user successfully', async () => {
      const mockUser = {
        id: 'u-1',
        supabaseId: 'sub-1',
        role: UserRole.DOCTOR,
        hospitalId: 'h-1',
        ambulanceId: null,
        isActive: true,
      };
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.resolveUserFromJwt({ sub: 'sub-1' });
      expect(result).toEqual({
        userId: 'u-1',
        supabaseId: 'sub-1',
        role: UserRole.DOCTOR,
        hospitalId: 'h-1',
        ambulanceId: null,
      });
    });

    it('throws UnauthorizedException when user does not exist in system', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(service.resolveUserFromJwt({ sub: 'unknown-sub' })).rejects.toThrow(
        'User not found in system',
      );
    });

    it('throws UnauthorizedException when user is inactive', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'u-2',
        supabaseId: 'sub-2',
        role: UserRole.PARAMEDIC,
        hospitalId: null,
        ambulanceId: 'amb-1',
        isActive: false,
      });
      await expect(service.resolveUserFromJwt({ sub: 'sub-2' })).rejects.toThrow(
        'User account is inactive',
      );
    });

    it('uses DB role as authoritative regardless of app_metadata.raah_role or user_metadata', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'u-3',
        supabaseId: 'sub-3',
        role: UserRole.PATIENT,
        hospitalId: null,
        ambulanceId: null,
        isActive: true,
      });

      const result = await service.resolveUserFromJwt({
        sub: 'sub-3',
        app_metadata: { raah_role: 'SYSTEM_ADMIN' },
        user_metadata: { raah_role: 'SYSTEM_ADMIN' },
      });

      expect(result.role).toBe(UserRole.PATIENT);
    });
  });

  describe('createUser', () => {
    const adminUser = {
      userId: 'admin-id',
      supabaseId: 'admin-sub',
      role: UserRole.SYSTEM_ADMIN,
      hospitalId: null,
      ambulanceId: null,
    };

    it('rejects non-SYSTEM_ADMIN from creating users', async () => {
      const nonAdmin = { ...adminUser, role: UserRole.DISPATCHER };
      await expect(
        service.createUser({ name: 'New User' }, nonAdmin),
      ).rejects.toThrow(ForbiddenException);
    });

    it('creates user with default PATIENT role when role not specified', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: 'new-u-1',
        name: 'New Patient',
        role: UserRole.PATIENT,
        isActive: true,
      });

      const result = await service.createUser({ name: 'New Patient' }, adminUser);
      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'New Patient',
          role: UserRole.PATIENT,
          isActive: true,
        }),
      });
      expect(result.id).toBe('new-u-1');
    });

    it('rejects creation if supabaseId is already in use', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'existing-id' });
      await expect(
        service.createUser({ name: 'Duplicate Sub', supabaseId: 'sub-123' }, adminUser),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('linkIdentity', () => {
    const adminUser = {
      userId: 'admin-id',
      supabaseId: 'admin-sub',
      role: UserRole.SYSTEM_ADMIN,
      hospitalId: null,
      ambulanceId: null,
    };

    it('rejects non-SYSTEM_ADMIN from linking identity', async () => {
      const nonAdmin = { ...adminUser, role: UserRole.DOCTOR };
      await expect(
        service.linkIdentity({ userId: 'u-1', supabaseId: 'sub-1' }, nonAdmin),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when target user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(
        service.linkIdentity({ userId: 'u-unknown', supabaseId: 'sub-1' }, adminUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when target user is already linked to a different supabaseId', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'u-1',
        supabaseId: 'other-sub',
      });
      await expect(
        service.linkIdentity({ userId: 'u-1', supabaseId: 'sub-1' }, adminUser),
      ).rejects.toThrow(ConflictException);
    });

    it('updates user supabaseId when valid', async () => {
      prismaMock.user.findUnique
        .mockResolvedValueOnce({ id: 'u-1', supabaseId: null }) // user check
        .mockResolvedValueOnce(null); // existingWithSub check
      prismaMock.user.update.mockResolvedValue({
        id: 'u-1',
        supabaseId: 'sub-1',
        name: 'Linked User',
      });

      const result = await service.linkIdentity(
        { userId: 'u-1', supabaseId: 'sub-1' },
        adminUser,
      );
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'u-1' },
        data: { supabaseId: 'sub-1' },
        select: expect.any(Object),
      });
      expect(result.supabaseId).toBe('sub-1');
    });
  });

  describe('registerPatient', () => {
    it('throws UnauthorizedException if payload or sub is missing', async () => {
      await expect(
        service.registerPatient({ name: 'Test' }, null as any),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        service.registerPatient({ name: 'Test' }, { sub: '' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws ConflictException if supabaseId is already registered', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'existing-id', supabaseId: 'sub-existing' });

      await expect(
        service.registerPatient({ name: 'Test' }, { sub: 'sub-existing' }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException if email already belongs to another user', async () => {
      prismaMock.user.findUnique
        .mockResolvedValueOnce(null) // sub check
        .mockResolvedValueOnce({ id: 'other-id', email: 'taken@raah.care' }); // email check

      await expect(
        service.registerPatient({ name: 'Test', email: 'taken@raah.care' }, { sub: 'sub-new' }),
      ).rejects.toThrow(ConflictException);
    });

    it('successfully creates a PATIENT user with active status and null scopes', async () => {
      prismaMock.user.findUnique
        .mockResolvedValueOnce(null) // sub check
        .mockResolvedValueOnce(null); // email check

      prismaMock.user.create.mockResolvedValue({
        id: 'new-patient-id',
        name: 'Jane Doe',
        email: 'jane@raah.care',
        phone: '+919876543210',
        supabaseId: 'sub-jane',
        role: UserRole.PATIENT,
        isActive: true,
        hospitalId: null,
        ambulanceId: null,
      });

      const result = await service.registerPatient(
        { name: 'Jane Doe', email: 'jane@raah.care', phone: '+919876543210' },
        { sub: 'sub-jane' },
      );

      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          name: 'Jane Doe',
          email: 'jane@raah.care',
          phone: '+919876543210',
          supabaseId: 'sub-jane',
          role: UserRole.PATIENT,
          isActive: true,
          hospitalId: null,
          ambulanceId: null,
        },
        select: expect.any(Object),
      });

      expect(result.id).toBe('new-patient-id');
      expect(result.role).toBe(UserRole.PATIENT);
    });

    it('converts Prisma unique constraint failure (P2002 race condition) to ConflictException', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      const p2002Error = new Error('Unique constraint failed');
      (p2002Error as any).code = 'P2002';
      prismaMock.user.create.mockRejectedValue(p2002Error);

      await expect(
        service.registerPatient({ name: 'Race Patient' }, { sub: 'sub-race' }),
      ).rejects.toThrow(ConflictException);
    });
  });
});

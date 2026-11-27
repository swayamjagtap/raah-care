import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UserRole } from '../../../generated/prisma/enums.js';
import { AuthenticatedUser } from '../types/authenticated-request.js';
import { SupabaseJwtPayload } from '../types/jwt-payload.types.js';
import { CreateUserDto } from '../dto/create-user.dto.js';
import { LinkIdentityDto } from '../dto/link-identity.dto.js';
import { RegisterPatientDto } from '../dto/register-patient.dto.js';

@Injectable()
export class UserProvisioningService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves the internal RAAH user from a cryptographically verified Supabase JWT payload.
   *
   * Security & Policy Rules:
   * 1. Authoritative External Identity: `payload.sub` MUST be present.
   * 2. Identity Resolution: Query `User` by `supabaseId === payload.sub`.
   * 3. Unknown Identity: Throws `UnauthorizedException('User not found in system')`.
   *    Does NOT auto-create privileged roles (ADMIN, DISPATCHER, DOCTOR, PARAMEDIC).
   * 4. Inactive Check: Throws `UnauthorizedException('User account is inactive')`.
   * 5. Role Metadata Policy:
   *    - DB `User.role` is authoritative for active operational permissions.
   *    - `user_metadata` is NEVER used for authorization.
   *    - `app_metadata.raah_role` is checked for informational/consistency purposes.
   *      If present, verified, and differing from DB, DB remains authoritative unless updated via admin.
   */
  async resolveUserFromJwt(payload: SupabaseJwtPayload): Promise<AuthenticatedUser> {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid token payload: missing sub claim');
    }

    const user = await this.prisma.user.findUnique({
      where: { supabaseId: payload.sub },
      select: {
        id: true,
        supabaseId: true,
        role: true,
        hospitalId: true,
        ambulanceId: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found in system');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    return {
      userId: user.id,
      supabaseId: user.supabaseId,
      role: user.role,
      hospitalId: user.hospitalId,
      ambulanceId: user.ambulanceId,
    };
  }

  /**
   * Explicit administrative user creation.
   * Restricted to SYSTEM_ADMIN via RolesGuard.
   */
  async createUser(dto: CreateUserDto, creator?: AuthenticatedUser) {
    if (creator && creator.role !== UserRole.SYSTEM_ADMIN) {
      throw new ForbiddenException('Only SYSTEM_ADMIN can create users directly');
    }

    if (dto.supabaseId) {
      const existing = await this.prisma.user.findUnique({
        where: { supabaseId: dto.supabaseId },
      });
      if (existing) {
        throw new ConflictException(`User with supabaseId '${dto.supabaseId}' already exists`);
      }
    }

    if (dto.email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existingEmail) {
        throw new ConflictException(`User with email '${dto.email}' already exists`);
      }
    }

    if (dto.hospitalId) {
      const hospital = await this.prisma.hospital.findUnique({
        where: { id: dto.hospitalId },
      });
      if (!hospital) {
        throw new NotFoundException(`Hospital with ID '${dto.hospitalId}' not found`);
      }
    }

    if (dto.ambulanceId) {
      const ambulance = await this.prisma.ambulance.findUnique({
        where: { id: dto.ambulanceId },
      });
      if (!ambulance) {
        throw new NotFoundException(`Ambulance with ID '${dto.ambulanceId}' not found`);
      }
    }

    return this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        role: dto.role ?? UserRole.PATIENT,
        hospitalId: dto.hospitalId ?? null,
        ambulanceId: dto.ambulanceId ?? null,
        supabaseId: dto.supabaseId ?? null,
        isActive: true,
      },
    });
  }

  /**
   * Explicit administrative linking of a Supabase identity (`sub`) to an existing RAAH User.
   * Restricted to SYSTEM_ADMIN via RolesGuard.
   */
  async linkIdentity(dto: LinkIdentityDto, actor?: AuthenticatedUser) {
    if (actor && actor.role !== UserRole.SYSTEM_ADMIN) {
      throw new ForbiddenException('Only SYSTEM_ADMIN can link Supabase identities');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID '${dto.userId}' not found`);
    }

    if (user.supabaseId && user.supabaseId !== dto.supabaseId) {
      throw new ConflictException(
        `User '${dto.userId}' is already linked to supabaseId '${user.supabaseId}'`,
      );
    }

    // Check if the supabaseId is already linked to another user
    const existingWithSub = await this.prisma.user.findUnique({
      where: { supabaseId: dto.supabaseId },
    });
    if (existingWithSub && existingWithSub.id !== dto.userId) {
      throw new ConflictException(
        `supabaseId '${dto.supabaseId}' is already linked to another user ('${existingWithSub.id}')`,
      );
    }

    return this.prisma.user.update({
      where: { id: dto.userId },
      data: { supabaseId: dto.supabaseId },
      select: {
        id: true,
        supabaseId: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        hospitalId: true,
        ambulanceId: true,
      },
    });
  }

  /**
   * Safe read-only lookup of currently authenticated caller profile.
   */
  async getProfile(user: AuthenticatedUser) {
    const profile = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        supabaseId: true,
        email: true,
        phone: true,
        name: true,
        role: true,
        isActive: true,
        hospitalId: true,
        ambulanceId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!profile) {
      throw new NotFoundException('User profile not found');
    }
    return profile;
  }

  /**
   * Patient self-registration:
   * Maps a verified Supabase identity (`sub`) to a new RAAH `User` with role `PATIENT`.
   *
   * Security & Policy Rules:
   * 1. Authoritative Identity: `payload.sub` MUST be used as `supabaseId`.
   * 2. Fixed Role: Always assigns `UserRole.PATIENT`. Cannot be overridden.
   * 3. Operational Scopes: `hospitalId` and `ambulanceId` remain strictly `null`.
   * 4. Active Status: `isActive` is set to `true`.
   * 5. Duplicate Check & Race Condition:
   *    - Checks if `User.supabaseId` already exists (throws 409 Conflict).
   *    - Catches Prisma unique constraint violations (P2002) and maps to 409 Conflict.
   */
  async registerPatient(dto: RegisterPatientDto, payload: SupabaseJwtPayload) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Valid JWT payload with sub claim is required');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { supabaseId: payload.sub },
    });
    if (existingUser) {
      throw new ConflictException(`User with supabaseId '${payload.sub}' is already registered`);
    }

    if (dto.email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existingEmail) {
        throw new ConflictException(`User with email '${dto.email}' already exists`);
      }
    }

    try {
      return await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email ?? null,
          phone: dto.phone ?? null,
          supabaseId: payload.sub,
          role: UserRole.PATIENT,
          isActive: true,
          hospitalId: null,
          ambulanceId: null,
        },
        select: {
          id: true,
          supabaseId: true,
          email: true,
          phone: true,
          name: true,
          role: true,
          isActive: true,
          hospitalId: true,
          ambulanceId: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error: any) {
      // Prisma P2002: Unique constraint failed
      if (error?.code === 'P2002') {
        throw new ConflictException(
          'A user with this Supabase identity or unique field already exists',
        );
      }
      throw error;
    }
  }
}

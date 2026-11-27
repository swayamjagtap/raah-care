export enum CuraCardAccessOutcome {
  SUCCESS = 'SUCCESS',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
  INVALID = 'INVALID',
  UNAUTHORIZED = 'UNAUTHORIZED',
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes, createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { UserRole } from '../../generated/prisma/enums.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-request.js';
import { ResolveCuraCardDto } from './dto/resolve-cura-card.dto.js';

export const CURA_CARD_TOKEN_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class CuraCardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a stable public Cura Card ID e.g. "RAAH-CR-XXXXXX"
   */
  private generatePermanentCardId(): string {
    const hex = randomBytes(4).toString('hex').toUpperCase();
    return `RAAH-CR-${hex}`;
  }

  /**
   * Hashes a raw token with SHA-256 for secure storage & matching.
   */
  hashToken(token: string): string {
    return createHash('sha256').update(token.trim()).digest('hex');
  }

  /**
   * Helper: Ensure caller is PATIENT.
   */
  private assertPatient(caller: AuthenticatedUser) {
    if (caller.role !== UserRole.PATIENT) {
      throw new ForbiddenException(
        'Only patients can access or manage their personal Cura Card QR token',
      );
    }
  }

  /**
   * Helper: Ensure caller is authorized responder (PARAMEDIC or DOCTOR).
   * AMBULANCE_DRIVER, DISPATCHER, SYSTEM_ADMIN, and PATIENT are not authorized for clinical records.
   */
  private assertAuthorizedResponder(caller: AuthenticatedUser) {
    if (caller.role !== UserRole.PARAMEDIC && caller.role !== UserRole.DOCTOR) {
      throw new ForbiddenException(
        `Role ${caller.role} is not authorized to resolve emergency Cura Card clinical records`,
      );
    }
  }

  /**
   * Resolves or provisions the patient record and permanent cardId.
   */
  private async findOrCreatePatientWithCardId(userId: string) {
    let patient = await this.prisma.patient.findUnique({
      where: { userId },
    });

    if (!patient) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        throw new NotFoundException('Patient user account not found');
      }

      patient = await this.prisma.patient.create({
        data: {
          userId: user.id,
          fullName: user.name,
          phoneNumber: user.phone ?? null,
          cardId: this.generatePermanentCardId(),
        },
      });
    } else if (!patient.cardId) {
      // Assign stable cardId if previously missing
      patient = await this.prisma.patient.update({
        where: { id: patient.id },
        data: {
          cardId: this.generatePermanentCardId(),
        },
      });
    }

    return patient;
  }

  /**
   * Helper: Record audit access event
   */
  private async recordAudit(params: {
    patientId: string | null;
    responderId: string | null;
    responderRole: UserRole;
    outcome: CuraCardAccessOutcome;
    caseId?: string;
  }) {
    try {
      await this.prisma.curaCardAudit.create({
        data: {
          patientId: params.patientId,
          responderId: params.responderId,
          responderRole: params.responderRole,
          outcome: params.outcome,
          caseId: params.caseId ?? null,
        },
      });
    } catch {
      // Audit failure should not crash primary flow
    }
  }

  /**
   * GET /api/v1/cura-card/me
   * Returns the patient's permanent card identity and active token state.
   */
  async getMyCard(caller: AuthenticatedUser) {
    this.assertPatient(caller);

    const patient = await this.findOrCreatePatientWithCardId(caller.userId);

    // Look up latest active non-expired token
    const now = new Date();
    const activeToken = await this.prisma.curaCardToken.findFirst({
      where: {
        patientId: patient.id,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    let status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' = 'INACTIVE';
    if (activeToken) {
      status = 'ACTIVE';
    }

    return {
      cardId: patient.cardId!,
      patientId: patient.id,
      fullName: patient.fullName,
      bloodGroup: patient.bloodGroup ?? null,
      allergies: patient.allergies ?? null,
      status,
      hasActiveToken: Boolean(activeToken),
      expiresAt: activeToken ? activeToken.expiresAt.toISOString() : null,
      issuedAt: activeToken ? activeToken.createdAt.toISOString() : null,
    };
  }

  /**
   * POST /api/v1/cura-card/token
   * Generates a replacement 256-bit cryptographic QR token and revokes previous tokens.
   */
  async generateToken(caller: AuthenticatedUser) {
    this.assertPatient(caller);

    const patient = await this.findOrCreatePatientWithCardId(caller.userId);

    // 1. Revoke any previous active tokens for this patient
    await this.prisma.curaCardToken.updateMany({
      where: {
        patientId: patient.id,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    // 2. Generate 256-bit cryptographically secure token
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + CURA_CARD_TOKEN_EXPIRY_MS);

    // 3. Store only the hash in database
    await this.prisma.curaCardToken.create({
      data: {
        patientId: patient.id,
        tokenHash,
        expiresAt,
        revokedAt: null,
      },
    });

    // 4. Construct payload
    // Embeds the raw token and minimum routing information for scanners
    const patientAppUrl =
      process.env.CURA_CARD_BASE_URL ||
      process.env.PATIENT_APP_URL ||
      process.env.FRONTEND_URL ||
      'http://localhost:5173';

    const qrPayload = `${patientAppUrl.replace(/\/$/, '')}/cura-card/scan?token=${rawToken}`;

    return {
      cardId: patient.cardId!,
      qrPayload,
      expiresAt: expiresAt.toISOString(),
      status: 'ACTIVE' as const,
    };
  }

  /**
   * POST /api/v1/cura-card/revoke
   * Revokes the patient's currently active QR token immediately.
   */
  async revokeToken(caller: AuthenticatedUser) {
    this.assertPatient(caller);

    const patient = await this.findOrCreatePatientWithCardId(caller.userId);

    const { count } = await this.prisma.curaCardToken.updateMany({
      where: {
        patientId: patient.id,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    return {
      revoked: count > 0,
      message: count > 0 ? 'Active Cura Card QR token revoked successfully' : 'No active token was found',
    };
  }

  /**
   * POST /api/v1/cura-card/resolve
   * Validates a scanned QR token and returns clinical emergency details to authorized responders.
   */
  async resolveToken(caller: AuthenticatedUser, dto: ResolveCuraCardDto) {
    // 1. Enforce RBAC
    if (caller.role !== UserRole.PARAMEDIC && caller.role !== UserRole.DOCTOR) {
      await this.recordAudit({
        patientId: null,
        responderId: caller.userId,
        responderRole: caller.role,
        outcome: CuraCardAccessOutcome.UNAUTHORIZED,
        caseId: dto.caseId,
      });
      throw new ForbiddenException(
        `Role ${caller.role} is not authorized to resolve emergency Cura Card records`,
      );
    }

    // 2. Validate token format (reject empty or malformed strings)
    const raw = dto.token.trim();
    if (!raw) {
      await this.recordAudit({
        patientId: null,
        responderId: caller.userId,
        responderRole: caller.role,
        outcome: CuraCardAccessOutcome.INVALID,
        caseId: dto.caseId,
      });
      throw new BadRequestException('Invalid or empty QR token');
    }

    // Handle full URL payload or raw token query param
    let extractedToken = raw;
    try {
      if (raw.includes('token=')) {
        const url = new URL(raw.startsWith('http') ? raw : `http://localhost/${raw}`);
        const param = url.searchParams.get('token');
        if (param) extractedToken = param;
      }
    } catch {
      // Use raw if URL parse fails
    }

    const tokenHash = this.hashToken(extractedToken);

    // 3. Look up token hash
    const storedToken = await this.prisma.curaCardToken.findUnique({
      where: { tokenHash },
      include: { patient: true },
    });

    if (!storedToken) {
      await this.recordAudit({
        patientId: null,
        responderId: caller.userId,
        responderRole: caller.role,
        outcome: CuraCardAccessOutcome.INVALID,
        caseId: dto.caseId,
      });
      throw new NotFoundException('Invalid or unrecognized Cura Card QR token');
    }

    const patient = storedToken.patient;

    // 4. Check revocation
    if (storedToken.revokedAt) {
      await this.recordAudit({
        patientId: patient.id,
        responderId: caller.userId,
        responderRole: caller.role,
        outcome: CuraCardAccessOutcome.REVOKED,
        caseId: dto.caseId,
      });
      throw new UnauthorizedException(
        'This Cura Card QR token has been revoked by the patient. Please request a fresh QR code.',
      );
    }

    // 5. Check expiry
    const now = new Date();
    if (storedToken.expiresAt <= now) {
      await this.recordAudit({
        patientId: patient.id,
        responderId: caller.userId,
        responderRole: caller.role,
        outcome: CuraCardAccessOutcome.EXPIRED,
        caseId: dto.caseId,
      });
      throw new UnauthorizedException(
        'This Cura Card QR token has expired. Please ask the patient to refresh their QR code.',
      );
    }

    // 6. Record successful audit access
    await this.recordAudit({
      patientId: patient.id,
      responderId: caller.userId,
      responderRole: caller.role,
      outcome: CuraCardAccessOutcome.SUCCESS,
      caseId: dto.caseId,
    });

    // 7. Return verified emergency medical triage fields
    return {
      patientId: patient.id,
      cardId: patient.cardId || 'RAAH-CR-VERIFIED',
      fullName: patient.fullName,
      bloodGroup: patient.bloodGroup ?? null,
      allergies: patient.allergies ?? null,
      medicalHistory: patient.medicalHistory ?? null,
      currentMedication: patient.currentMedication ?? null,
      emergencyContact: patient.emergencyContact ?? null,
      verifiedAt: now.toISOString(),
    };
  }
}

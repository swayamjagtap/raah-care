import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UserRole } from '../../generated/prisma/enums.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-request.js';
import { UpdatePatientProfileDto } from './dto/update-patient-profile.dto.js';

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper: Ensure caller is PATIENT.
   * CAREGIVER access to patient records requires an explicit multi-patient delegation model
   * to avoid generating phantom patient records under caregiver user IDs.
   */
  private assertPatient(caller: AuthenticatedUser) {
    if (caller.role !== UserRole.PATIENT) {
      throw new ForbiddenException(
        'Access to personal patient medical profile is restricted to Patients',
      );
    }
  }

  /**
   * Helper: Find existing patient record linked to the user.
   * If not found, attempts to locate the user and create a patient record on-demand
   * using the user's registered name and phone.
   */
  private async findOrCreatePatientForUser(userId: string) {
    let patient = await this.prisma.patient.findUnique({
      where: { userId },
    });

    if (!patient) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User account not found');
      }

      // Create linked Patient row
      patient = await this.prisma.patient.create({
        data: {
          userId: user.id,
          fullName: user.name,
          phoneNumber: user.phone ?? null,
        },
      });
    }

    return patient;
  }

  /**
   * GET /api/v1/patients/me
   * Retrieves the authenticated patient's clinical medical record.
   */
  async getProfile(caller: AuthenticatedUser) {
    this.assertPatient(caller);

    const patient = await this.findOrCreatePatientForUser(caller.userId);

    return {
      id: patient.id,
      userId: patient.userId,
      fullName: patient.fullName,
      dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.toISOString() : null,
      gender: patient.gender ?? null,
      bloodGroup: patient.bloodGroup ?? null,
      phoneNumber: patient.phoneNumber ?? null,
      emergencyContact: patient.emergencyContact ?? null,
      medicalHistory: patient.medicalHistory ?? null,
      allergies: patient.allergies ?? null,
      currentMedication: patient.currentMedication ?? null,
      createdAt: patient.createdAt.toISOString(),
      updatedAt: patient.updatedAt.toISOString(),
    };
  }

  /**
   * PATCH /api/v1/patients/me
   * Updates permitted medical fields for the authenticated patient's clinical record.
   */
  async updateProfile(caller: AuthenticatedUser, dto: UpdatePatientProfileDto) {
    this.assertPatient(caller);

    // Resolve patient record (or create one linked to this user)
    const patient = await this.findOrCreatePatientForUser(caller.userId);

    // Prepare update data — only allowed clinical fields
    const data: {
      bloodGroup?: string | null;
      allergies?: string | null;
      medicalHistory?: string | null;
      currentMedication?: string | null;
      emergencyContact?: string | null;
    } = {};

    if (dto.bloodGroup !== undefined) {
      data.bloodGroup = dto.bloodGroup?.trim() || null;
    }
    if (dto.allergies !== undefined) {
      data.allergies = dto.allergies?.trim() || null;
    }
    if (dto.medicalHistory !== undefined) {
      data.medicalHistory = dto.medicalHistory?.trim() || null;
    }
    if (dto.currentMedication !== undefined) {
      data.currentMedication = dto.currentMedication?.trim() || null;
    }
    if (dto.emergencyContact !== undefined) {
      data.emergencyContact = dto.emergencyContact?.trim() || null;
    }

    const updated = await this.prisma.patient.update({
      where: { id: patient.id },
      data,
    });

    return {
      id: updated.id,
      userId: updated.userId,
      fullName: updated.fullName,
      dateOfBirth: updated.dateOfBirth ? updated.dateOfBirth.toISOString() : null,
      gender: updated.gender ?? null,
      bloodGroup: updated.bloodGroup ?? null,
      phoneNumber: updated.phoneNumber ?? null,
      emergencyContact: updated.emergencyContact ?? null,
      medicalHistory: updated.medicalHistory ?? null,
      allergies: updated.allergies ?? null,
      currentMedication: updated.currentMedication ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}

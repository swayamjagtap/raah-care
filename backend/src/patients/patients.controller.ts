import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { CurrentUser, Roles } from '../auth/index.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-request.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { UpdatePatientProfileDto } from './dto/update-patient-profile.dto.js';
import { PatientsService } from './patients.service.js';

@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  /**
   * GET /api/v1/patients/me
   * Retrieves the authenticated patient's clinical medical profile.
   * Restricted strictly to PATIENT (Caregiver multi-patient delegation requires dedicated consent model).
   */
  @Roles(UserRole.PATIENT)
  @Get('me')
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.patientsService.getProfile(user);
  }

  /**
   * PATCH /api/v1/patients/me
   * Allows an authenticated patient to update permitted medical information.
   * Restricted strictly to PATIENT.
   */
  @Roles(UserRole.PATIENT)
  @Patch('me')
  @HttpCode(HttpStatus.OK)
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePatientProfileDto,
  ) {
    return this.patientsService.updateProfile(user, dto);
  }
}

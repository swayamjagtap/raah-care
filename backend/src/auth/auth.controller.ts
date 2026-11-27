import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Roles } from './decorators/roles.decorator.js';
import type { AuthenticatedUser } from './types/authenticated-request.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { LinkIdentityDto } from './dto/link-identity.dto.js';
import { RegisterPatientDto } from './dto/register-patient.dto.js';
import { CurrentJwtPayload } from './decorators/current-jwt-payload.decorator.js';
import { Public } from './decorators/public.decorator.js';
import { SupabaseJwtAuthGuard } from './guards/supabase-jwt-auth.guard.js';
import { UserProvisioningService } from './services/user-provisioning.service.js';
import { UseGuards } from '@nestjs/common';
import type { SupabaseJwtPayload } from './types/jwt-payload.types.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly provisioningService: UserProvisioningService) {}

  /**
   * Safe profile lookup for currently authenticated user.
   */
  @Get('me')
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.provisioningService.getProfile(user);
  }

  /**
   * Patient self-registration:
   * Authenticated via Supabase JWT (without requiring prior DB existence).
   * Maps JWT.sub to a new PATIENT user.
   */
  @Public()
  @UseGuards(SupabaseJwtAuthGuard)
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  registerPatient(
    @Body() dto: RegisterPatientDto,
    @CurrentJwtPayload() payload: SupabaseJwtPayload,
  ) {
    return this.provisioningService.registerPatient(dto, payload);
  }

  /**
   * Explicit administrative user creation.
   * Restricted to SYSTEM_ADMIN.
   */
  @Roles(UserRole.SYSTEM_ADMIN)
  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  createUser(
    @Body() dto: CreateUserDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.provisioningService.createUser(dto, user);
  }

  /**
   * Explicit administrative identity linking.
   * Links a Supabase sub UUID to an existing RAAH User.id.
   * Restricted to SYSTEM_ADMIN.
   */
  @Roles(UserRole.SYSTEM_ADMIN)
  @Post('users/link')
  @HttpCode(HttpStatus.OK)
  linkIdentity(
    @Body() dto: LinkIdentityDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.provisioningService.linkIdentity(dto, user);
  }
}

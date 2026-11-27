import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { CurrentUser, Roles } from '../auth/index.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-request.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { ResolveCuraCardDto } from './dto/resolve-cura-card.dto.js';
import { CuraCardService } from './cura-card.service.js';

@Controller('cura-card')
export class CuraCardController {
  constructor(private readonly curaCardService: CuraCardService) {}

  /**
   * GET /api/v1/cura-card/me
   * Patient: retrieve permanent card details and current token status.
   */
  @Roles(UserRole.PATIENT)
  @Get('me')
  getMyCard(@CurrentUser() user: AuthenticatedUser) {
    return this.curaCardService.getMyCard(user);
  }

  /**
   * POST /api/v1/cura-card/token
   * Patient: generate or refresh temporary 256-bit QR token.
   */
  @Roles(UserRole.PATIENT)
  @Post('token')
  @HttpCode(HttpStatus.OK)
  generateToken(@CurrentUser() user: AuthenticatedUser) {
    return this.curaCardService.generateToken(user);
  }

  /**
   * POST /api/v1/cura-card/revoke
   * Patient: explicitly revoke current active token.
   */
  @Roles(UserRole.PATIENT)
  @Post('revoke')
  @HttpCode(HttpStatus.OK)
  revokeToken(@CurrentUser() user: AuthenticatedUser) {
    return this.curaCardService.revokeToken(user);
  }

  /**
   * POST /api/v1/cura-card/resolve
   * Responder: resolve scanned QR token to emergency medical record.
   * Restricted to PARAMEDIC and DOCTOR.
   */
  @Roles(UserRole.PARAMEDIC, UserRole.DOCTOR)
  @Post('resolve')
  @HttpCode(HttpStatus.OK)
  resolveToken(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ResolveCuraCardDto,
  ) {
    return this.curaCardService.resolveToken(user, dto);
  }
}

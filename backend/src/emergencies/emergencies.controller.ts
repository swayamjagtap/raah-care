import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser, OptionalAuth, Roles } from '../auth/index.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-request.js';
import { UserRole } from '../../generated/prisma/enums.js';
import {
  CreateEmergencyDto,
  QueryEmergenciesDto,
  UpdateEmergencyStatusDto,
} from './dto/index.js';
import { EmergenciesService } from './emergencies.service.js';

@Controller('emergencies')
export class EmergenciesController {
  constructor(private readonly emergenciesService: EmergenciesService) {}

  @OptionalAuth()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateEmergencyDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.emergenciesService.create(dto, user ? user.userId : null);
  }

  @Roles(UserRole.DISPATCHER, UserRole.SYSTEM_ADMIN)
  @Get()
  findAll(@Query() query: QueryEmergenciesDto) {
    return this.emergenciesService.findAll(query);
  }

  @Roles(
    UserRole.DISPATCHER,
    UserRole.PARAMEDIC,
    UserRole.AMBULANCE_DRIVER,
    UserRole.DOCTOR,
    UserRole.HOSPITAL_ADMIN,
    UserRole.PATIENT,
    UserRole.SYSTEM_ADMIN,
  )
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.emergenciesService.findOne(id, user);
  }

  @Roles(UserRole.DISPATCHER, UserRole.SYSTEM_ADMIN)
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmergencyStatusDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.emergenciesService.updateStatus(id, dto, user);
  }
}

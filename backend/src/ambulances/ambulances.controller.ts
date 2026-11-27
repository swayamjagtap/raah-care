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
import { CurrentUser, Roles } from '../auth/index.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-request.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { AmbulancesService } from './ambulances.service.js';
import {
  CreateAmbulanceDto,
  QueryAmbulancesDto,
  UpdateAmbulanceStatusDto,
} from './dto/index.js';

@Controller('ambulances')
export class AmbulancesController {
  constructor(private readonly ambulancesService: AmbulancesService) {}

  @Roles(UserRole.SYSTEM_ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateAmbulanceDto) {
    return this.ambulancesService.create(dto);
  }

  @Roles(UserRole.DISPATCHER, UserRole.SYSTEM_ADMIN)
  @Get()
  findAll(@Query() query: QueryAmbulancesDto) {
    return this.ambulancesService.findAll(query);
  }

  @Roles(
    UserRole.DISPATCHER,
    UserRole.PARAMEDIC,
    UserRole.AMBULANCE_DRIVER,
    UserRole.SYSTEM_ADMIN,
  )
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.ambulancesService.findOne(id, user);
  }

  @Roles(UserRole.DISPATCHER, UserRole.SYSTEM_ADMIN)
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAmbulanceStatusDto,
  ) {
    return this.ambulancesService.updateStatus(id, dto);
  }
}

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
import {
  CreateHospitalDto,
  CreateHospitalResourceDto,
  QueryHospitalsDto,
  UpdateHospitalDto,
  UpdateHospitalResourceDto,
} from './dto/index.js';
import { HospitalsService } from './hospitals.service.js';

@Controller('hospitals')
export class HospitalsController {
  constructor(private readonly hospitalsService: HospitalsService) {}

  @Roles(UserRole.SYSTEM_ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateHospitalDto) {
    return this.hospitalsService.create(dto);
  }

  @Roles(
    UserRole.DISPATCHER,
    UserRole.DOCTOR,
    UserRole.HOSPITAL_ADMIN,
    UserRole.SYSTEM_ADMIN,
  )
  @Get()
  findAll(
    @Query() query: QueryHospitalsDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.hospitalsService.findAll(query, user);
  }

  @Roles(
    UserRole.DISPATCHER,
    UserRole.DOCTOR,
    UserRole.HOSPITAL_ADMIN,
    UserRole.SYSTEM_ADMIN,
  )
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.hospitalsService.findOne(id, user);
  }

  @Roles(UserRole.HOSPITAL_ADMIN, UserRole.SYSTEM_ADMIN)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHospitalDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.hospitalsService.update(id, dto, user);
  }

  @Roles(UserRole.HOSPITAL_ADMIN, UserRole.SYSTEM_ADMIN)
  @Post(':id/resources')
  @HttpCode(HttpStatus.CREATED)
  createResource(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateHospitalResourceDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.hospitalsService.createResource(id, dto, user);
  }

  @Roles(
    UserRole.DISPATCHER,
    UserRole.DOCTOR,
    UserRole.HOSPITAL_ADMIN,
    UserRole.SYSTEM_ADMIN,
  )
  @Get(':id/resources')
  findResources(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.hospitalsService.findResources(id, user);
  }

  @Roles(UserRole.HOSPITAL_ADMIN, UserRole.SYSTEM_ADMIN)
  @Patch(':id/resources/:resourceId')
  updateResource(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('resourceId', ParseUUIDPipe) resourceId: string,
    @Body() dto: UpdateHospitalResourceDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.hospitalsService.updateResource(id, resourceId, dto, user);
  }
}

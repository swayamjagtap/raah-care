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
} from '@nestjs/common';
import { CurrentUser, Roles } from '../auth/index.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-request.js';
import { UserRole } from '../../generated/prisma/enums.js';
import {
  CancelHandoverDto,
  CompleteHandoverDto,
  CreateHandoverDto,
  RejectHandoverDto,
  UpdateHandoverDto,
} from './dto/index.js';
import { HandoversService } from './handovers.service.js';

@Controller('handovers')
export class HandoversController {
  constructor(private readonly handoversService: HandoversService) {}

  @Roles(
    UserRole.PARAMEDIC,
    UserRole.AMBULANCE_DRIVER,
    UserRole.DISPATCHER,
    UserRole.SYSTEM_ADMIN,
  )
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateHandoverDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.handoversService.initiateHandover(dto, user);
  }

  @Roles(
    UserRole.PARAMEDIC,
    UserRole.DOCTOR,
    UserRole.DISPATCHER,
    UserRole.HOSPITAL_ADMIN,
    UserRole.SYSTEM_ADMIN,
  )
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.handoversService.findOne(id, user);
  }

  @Roles(
    UserRole.PARAMEDIC,
    UserRole.DOCTOR,
    UserRole.DISPATCHER,
    UserRole.HOSPITAL_ADMIN,
    UserRole.SYSTEM_ADMIN,
  )
  @Get('case/:caseId/active')
  findActiveByCaseId(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.handoversService.findActiveByCaseId(caseId, user);
  }

  @Roles(
    UserRole.PARAMEDIC,
    UserRole.DOCTOR,
    UserRole.DISPATCHER,
    UserRole.HOSPITAL_ADMIN,
    UserRole.SYSTEM_ADMIN,
  )
  @Get('case/:caseId')
  findAllForCase(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.handoversService.findAllForCase(caseId, user);
  }

  @Roles(UserRole.PARAMEDIC, UserRole.SYSTEM_ADMIN)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHandoverDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.handoversService.updateHandover(id, dto, user);
  }

  @Roles(UserRole.DOCTOR, UserRole.HOSPITAL_ADMIN, UserRole.SYSTEM_ADMIN)
  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteHandoverDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.handoversService.completeHandover(id, dto, user);
  }

  @Roles(UserRole.DOCTOR, UserRole.HOSPITAL_ADMIN, UserRole.SYSTEM_ADMIN)
  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectHandoverDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.handoversService.rejectHandover(id, dto, user);
  }

  @Roles(UserRole.PARAMEDIC, UserRole.DISPATCHER, UserRole.SYSTEM_ADMIN)
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelHandoverDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.handoversService.cancelHandover(id, dto, user);
  }
}

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
import { AssignmentsService } from './assignments.service.js';
import {
  AcceptAssignmentDto,
  CreateAssignmentDto,
  RejectAssignmentDto,
  UpdateAssignmentStatusDto,
} from './dto/index.js';

// Routes nested under /emergencies/:emergencyId/assignments
@Controller('emergencies/:emergencyId/assignments')
export class AssignmentsNestedController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Roles(UserRole.DISPATCHER, UserRole.SYSTEM_ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Body() dto: CreateAssignmentDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.assignmentsService.create(emergencyId, dto, user);
  }

  @Roles(
    UserRole.DISPATCHER,
    UserRole.PARAMEDIC,
    UserRole.AMBULANCE_DRIVER,
    UserRole.SYSTEM_ADMIN,
  )
  @Get()
  findAll(@Param('emergencyId', ParseUUIDPipe) emergencyId: string) {
    return this.assignmentsService.findAllForCase(emergencyId);
  }
}

// Routes under /assignments/:id
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

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
    return this.assignmentsService.findOne(id, user);
  }

  @Roles(
    UserRole.PARAMEDIC,
    UserRole.AMBULANCE_DRIVER,
    UserRole.SYSTEM_ADMIN,
  )
  @Patch(':id/accept')
  accept(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AcceptAssignmentDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.assignmentsService.accept(id, dto, user);
  }

  @Roles(
    UserRole.PARAMEDIC,
    UserRole.AMBULANCE_DRIVER,
    UserRole.SYSTEM_ADMIN,
  )
  @Patch(':id/reject')
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectAssignmentDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.assignmentsService.reject(id, dto, user);
  }

  @Roles(
    UserRole.PARAMEDIC,
    UserRole.AMBULANCE_DRIVER,
    UserRole.DISPATCHER,
    UserRole.SYSTEM_ADMIN,
  )
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssignmentStatusDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.assignmentsService.updateStatus(id, dto, user);
  }
}

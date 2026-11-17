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

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Body() dto: CreateAssignmentDto,
  ) {
    return this.assignmentsService.create(emergencyId, dto);
  }

  @Get()
  findAll(@Param('emergencyId', ParseUUIDPipe) emergencyId: string) {
    return this.assignmentsService.findAllForCase(emergencyId);
  }
}

// Routes under /assignments/:id
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.assignmentsService.findOne(id);
  }

  @Patch(':id/accept')
  accept(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AcceptAssignmentDto,
  ) {
    return this.assignmentsService.accept(id, dto);
  }

  @Patch(':id/reject')
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectAssignmentDto,
  ) {
    return this.assignmentsService.reject(id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssignmentStatusDto,
  ) {
    return this.assignmentsService.updateStatus(id, dto);
  }
}

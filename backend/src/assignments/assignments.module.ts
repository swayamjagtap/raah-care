import { Module } from '@nestjs/common';
import {
  AssignmentsController,
  AssignmentsNestedController,
} from './assignments.controller.js';
import { AssignmentsService } from './assignments.service.js';

@Module({
  controllers: [AssignmentsNestedController, AssignmentsController],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}

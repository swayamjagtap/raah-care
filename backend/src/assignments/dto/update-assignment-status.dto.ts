import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { AssignmentStatus } from '../../../generated/prisma/enums.js';

export class UpdateAssignmentStatusDto {
  @IsNotEmpty({ message: 'status is required' })
  @IsEnum(AssignmentStatus, {
    message: 'status must be a valid AssignmentStatus enum value',
  })
  status: AssignmentStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUUID()
  actorId?: string;
}

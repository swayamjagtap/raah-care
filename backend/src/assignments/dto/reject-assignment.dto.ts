import { IsOptional, IsString, IsUUID } from 'class-validator';

export class RejectAssignmentDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUUID()
  actorId?: string;
}

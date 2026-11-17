import { IsOptional, IsString, IsUUID } from 'class-validator';

export class AcceptAssignmentDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUUID()
  actorId?: string;
}

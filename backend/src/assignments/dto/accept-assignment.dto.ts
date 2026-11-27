import { IsOptional, IsString } from 'class-validator';

export class AcceptAssignmentDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

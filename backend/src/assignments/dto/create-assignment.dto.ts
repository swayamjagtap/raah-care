import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAssignmentDto {
  @IsUUID()
  @IsNotEmpty({ message: 'ambulanceId is required' })
  ambulanceId: string;

  @IsOptional()
  @IsUUID()
  dispatcherId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

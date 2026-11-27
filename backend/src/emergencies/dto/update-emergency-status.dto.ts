import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CaseStatus } from '../../../generated/prisma/enums.js';

export class UpdateEmergencyStatusDto {
  @IsNotEmpty({ message: 'status is required' })
  @IsEnum(CaseStatus, {
    message: 'status must be a valid CaseStatus enum value',
  })
  status: CaseStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

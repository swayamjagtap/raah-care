import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { HospitalStatus } from '../../../generated/prisma/enums.js';

export class QueryHospitalsDto {
  @IsOptional()
  @IsEnum(HospitalStatus, {
    message: 'status must be a valid HospitalStatus enum value',
  })
  status?: HospitalStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { CasePriority, CaseStatus } from '../../../generated/prisma/enums.js';

export class QueryEmergenciesDto {
  @IsOptional()
  @IsEnum(CaseStatus, {
    message: 'status must be a valid CaseStatus enum value',
  })
  status?: CaseStatus;

  @IsOptional()
  @IsEnum(CasePriority, {
    message: 'priority must be a valid CasePriority (LOW, MEDIUM, HIGH, CRITICAL)',
  })
  priority?: CasePriority;

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

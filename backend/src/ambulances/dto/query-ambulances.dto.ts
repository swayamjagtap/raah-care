import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { AmbulanceStatus, AmbulanceType } from '../../../generated/prisma/enums.js';

export class QueryAmbulancesDto {
  @IsOptional()
  @IsEnum(AmbulanceStatus, {
    message: 'status must be a valid AmbulanceStatus enum value',
  })
  status?: AmbulanceStatus;

  @IsOptional()
  @IsEnum(AmbulanceType, {
    message: 'type must be a valid AmbulanceType enum value',
  })
  type?: AmbulanceType;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isAvailable?: boolean;

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

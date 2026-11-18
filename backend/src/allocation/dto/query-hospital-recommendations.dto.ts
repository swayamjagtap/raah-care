import { ResourceType } from '../../../generated/prisma/enums.js';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

function transformCommaSeparated(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.split(',').map((entry) => entry.trim());
  }

  if (Array.isArray(value)) {
    return value.map((entry) =>
      typeof entry === 'string' ? entry.trim() : entry,
    );
  }

  return value;
}

export class QueryHospitalRecommendationsDto {
  @IsOptional()
  @Transform(({ value }) => transformCommaSeparated(value))
  @IsArray()
  @IsEnum(ResourceType, { each: true })
  @ArrayMaxSize(20)
  requiredResources?: ResourceType[];

  @IsOptional()
  @Transform(({ value }) => transformCommaSeparated(value))
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(100, { each: true })
  @ArrayMaxSize(20)
  requiredCapabilities?: string[];

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  includeDisqualified?: boolean = true;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  maxRangeKm?: number;
}

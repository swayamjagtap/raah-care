import { ResourceType } from '../../../generated/prisma/enums.js';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
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

export class SelectDestinationDto {
  @IsUUID()
  @IsNotEmpty()
  hospitalId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  overrideReason?: string;

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
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

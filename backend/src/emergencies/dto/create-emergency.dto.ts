import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { CasePriority } from '../../../generated/prisma/enums.js';

export class CreateEmergencyDto {
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsUUID()
  initiatorId?: string;

  @IsOptional()
  @IsEnum(CasePriority, {
    message: 'priority must be a valid CasePriority (LOW, MEDIUM, HIGH, CRITICAL)',
  })
  priority?: CasePriority;

  @IsNumber({}, { message: 'incidentLatitude must be a valid number' })
  @Min(-90)
  @Max(90)
  incidentLatitude: number;

  @IsNumber({}, { message: 'incidentLongitude must be a valid number' })
  @Min(-180)
  @Max(180)
  incidentLongitude: number;

  @IsString()
  @IsNotEmpty({ message: 'incidentAddress is required' })
  incidentAddress: string;

  @IsOptional()
  @IsString()
  symptoms?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  currentCondition?: string;
}

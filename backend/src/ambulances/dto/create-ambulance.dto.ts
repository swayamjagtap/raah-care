import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { AmbulanceType } from '../../../generated/prisma/enums.js';

export class CreateAmbulanceDto {
  @IsString()
  @IsNotEmpty({ message: 'registrationNumber is required' })
  registrationNumber: string;

  @IsString()
  @IsNotEmpty({ message: 'callSign is required' })
  callSign: string;

  @IsOptional()
  @IsEnum(AmbulanceType, {
    message: 'type must be a valid AmbulanceType (BLS, ALS, PATIENT_TRANSPORT, NEONATAL, OTHER)',
  })
  type?: AmbulanceType;

  @IsOptional()
  @IsUUID()
  baseHospitalId?: string;

  @IsOptional()
  @IsNumber({}, { message: 'currentLatitude must be a valid number' })
  @Min(-90)
  @Max(90)
  currentLatitude?: number;

  @IsOptional()
  @IsNumber({}, { message: 'currentLongitude must be a valid number' })
  @Min(-180)
  @Max(180)
  currentLongitude?: number;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

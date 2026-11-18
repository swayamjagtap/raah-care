import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { HospitalStatus } from '../../../generated/prisma/enums.js';

export class UpdateHospitalDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'name cannot be empty' })
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'code cannot be empty' })
  code?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'address cannot be empty' })
  address?: string;

  @IsOptional()
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'latitude must be a valid number' },
  )
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'longitude must be a valid number' },
  )
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsString()
  emergencyCapability?: string;

  @IsOptional()
  @IsEnum(HospitalStatus, {
    message: 'status must be a valid HospitalStatus enum value',
  })
  status?: HospitalStatus;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'email must be a valid email address' })
  email?: string;
}

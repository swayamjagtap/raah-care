import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const ALLOWED_BLOOD_GROUPS = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
] as const;

export type BloodGroup = (typeof ALLOWED_BLOOD_GROUPS)[number];

export class UpdatePatientProfileDto {
  @IsOptional()
  @IsIn(ALLOWED_BLOOD_GROUPS, {
    message: `bloodGroup must be one of: ${ALLOWED_BLOOD_GROUPS.join(', ')}`,
  })
  bloodGroup?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'allergies must not exceed 1000 characters' })
  allergies?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'medicalHistory must not exceed 2000 characters' })
  medicalHistory?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'currentMedication must not exceed 1000 characters' })
  currentMedication?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'emergencyContact must not exceed 1000 characters' })
  emergencyContact?: string | null;
}

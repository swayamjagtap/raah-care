import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  ResourceStatus,
  ResourceType,
} from '../../../generated/prisma/enums.js';

export class UpdateHospitalResourceDto {
  @IsOptional()
  @IsEnum(ResourceType, {
    message: 'type must be a valid ResourceType enum value',
  })
  type?: ResourceType;

  @IsOptional()
  @IsEnum(ResourceStatus, {
    message: 'status must be a valid ResourceStatus enum value',
  })
  status?: ResourceStatus;

  @IsOptional()
  @IsInt({ message: 'quantity must be an integer' })
  @Min(0, { message: 'quantity cannot be negative' })
  quantity?: number;

  @IsOptional()
  @IsInt({ message: 'availableQuantity must be an integer' })
  @Min(0, { message: 'availableQuantity cannot be negative' })
  availableQuantity?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

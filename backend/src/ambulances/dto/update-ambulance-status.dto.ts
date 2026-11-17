import { IsEnum, IsNotEmpty } from 'class-validator';
import { AmbulanceStatus } from '../../../generated/prisma/enums.js';

export class UpdateAmbulanceStatusDto {
  @IsNotEmpty({ message: 'status is required' })
  @IsEnum(AmbulanceStatus, {
    message: 'status must be a valid AmbulanceStatus enum value',
  })
  status: AmbulanceStatus;
}

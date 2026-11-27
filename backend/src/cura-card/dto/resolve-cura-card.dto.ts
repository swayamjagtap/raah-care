import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class ResolveCuraCardDto {
  @IsString()
  @IsNotEmpty({ message: 'Scanned QR token is required' })
  token: string;

  @IsOptional()
  @IsUUID('4', { message: 'caseId must be a valid UUID' })
  caseId?: string;
}

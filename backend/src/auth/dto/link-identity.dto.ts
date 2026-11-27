import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class LinkIdentityDto {
  @IsNotEmpty()
  @IsUUID()
  userId!: string;

  @IsNotEmpty()
  @IsString()
  supabaseId!: string;
}

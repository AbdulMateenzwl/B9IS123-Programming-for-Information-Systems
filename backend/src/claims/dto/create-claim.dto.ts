// src/claims/dto/create-claim.dto.ts
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateClaimDto {
  @IsString()
  description: string;

  @IsOptional()
  @IsEnum(['GBP', 'USD', 'EUR'])
  currency?: string = 'GBP';
}

export class UpdateClaimDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['GBP', 'USD', 'EUR'])
  currency?: string;
}

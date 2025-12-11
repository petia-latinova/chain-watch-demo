import { IsOptional, IsString, IsInt, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class TransactionFilterDto {
  // Pagination
  @IsOptional()
  @Type(() => Number) // Converts query string to number
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10; // Default limit per page

  // Filters
  @IsOptional()
  @IsString()
  symbol?: string; // e.g., 'USDC', 'EURC', 'CW-ERC20'

  @IsOptional()
  @IsString()
  sender?: string; // Wallet address (0x...)

  @IsOptional()
  @IsString()
  receiver?: string; // Wallet address (0x...)

  // Timeframe
  @IsOptional()
  @IsDateString()
  startTime?: string; // ISO 8601 string

  @IsOptional()
  @IsDateString()
  endTime?: string; // ISO 8601 string
}
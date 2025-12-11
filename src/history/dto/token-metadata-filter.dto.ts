import { IsString, IsNotEmpty } from 'class-validator';

export class TokenMetadataFilterDto {
  @IsNotEmpty()
  @IsString()
  contractAddress: string; // The ERC20 contract address (0x...)
}

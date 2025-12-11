import { IsString, IsNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// Deepest Level: Transaction Details
class TransactionDetailsDto {
  @IsString()
  @IsNotEmpty()
  hash: string;

  // The 'from' and 'to' objects contain the address we need
  @ValidateNested()
  @Type(() => AddressDto)
  from: AddressDto;
  
  @ValidateNested()
  @Type(() => AddressDto)
  to: AddressDto;
  
  @IsString()
  @IsNotEmpty()
  status: number; // or IsNumber() if validation is strict
}

// Address Sub-DTO
class AddressDto {
  @IsString()
  @IsNotEmpty()
  address: string;
}

// The Log Entry (Containing Transfer Data)
class AlchemyGraphQLLogData {
  @ValidateNested()
  @Type(() => AddressDto)
  account: AddressDto; // This holds the Contract Address

  @IsArray()
  topics: string[]; // Topics[0] is the Transfer signature

  @IsString()
  @IsNotEmpty()
  data: string; 

  @ValidateNested()
  @Type(() => TransactionDetailsDto)
  transaction: TransactionDetailsDto;
}

// The Block Data
class BlockDataDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AlchemyGraphQLLogData)
  logs: AlchemyGraphQLLogData[];
}

// The Event Data
class EventDataDto {
  @ValidateNested()
  @Type(() => BlockDataDto)
  data: { block: BlockDataDto };
}

// The Top-Level Webhook Payload
export class AlchemyWebhookDto {
  @IsString()
  @IsNotEmpty()
  webhookId: string;

  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  createdAt: string; // Using IsDateString() is safer here
  
  @IsString()
  @IsNotEmpty()
  type: string;

  @ValidateNested()
  @Type(() => EventDataDto)
  event: EventDataDto;
  
  @IsString()
  @IsNotEmpty()
  sequenceNumber: string;
  
  @IsString()
  @IsNotEmpty()
  network: string;
}

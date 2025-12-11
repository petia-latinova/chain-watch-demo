import { Controller, Get, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { HistoryService } from './history.service';
import { TransactionFilterDto } from './dto/transaction-filter.dto';
import { TokenMetadataFilterDto } from './dto/token-metadata-filter.dto';

@Controller('history')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true })) // Apply validation and transform
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  // GET /api/history/transactions
  @Get('transactions')
  getTransactionHistory(@Query() filters: TransactionFilterDto) {
    // Filters are passed via query string (e.g., ?symbol=USDC&page=2)
    return this.historyService.getTransactionHistory(filters);
  }

  // GET /api/history/metadata?contractAddress=0x...
  @Get('metadata')
  getTokenMetadata(@Query() filters: TokenMetadataFilterDto) {
    // Filter is passed via query string (?contractAddress=0x...)
    return this.historyService.getTokenMetadata(filters);
  }
}

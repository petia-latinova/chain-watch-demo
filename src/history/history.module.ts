import { Module } from '@nestjs/common';
import { HistoryService } from './history.service';
import { HistoryController } from './history.controller';
import { TransferModule } from '../transfer/transfer.module';

@Module({
  imports: [TransferModule],
  controllers: [HistoryController],
  providers: [HistoryService],
})
export class HistoryModule {}

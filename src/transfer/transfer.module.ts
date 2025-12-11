import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transfer } from './entities/transfer.entity';

@Module({
  imports: [
    // This makes the Transfer entity available for injection (via @InjectRepository)
    TypeOrmModule.forFeature([Transfer]),
  ],
  // Exporting TypeOrmModule makes it available to other modules that import TransferModule
  exports: [TypeOrmModule.forFeature([Transfer])], 
})
export class TransferModule {}

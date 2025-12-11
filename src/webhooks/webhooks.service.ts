import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transfer } from '../transfer/entities/transfer.entity';
import { AlchemyWebhookDto } from './dto/alchemy-webhook.dto';
import { formatUnits, hexToBigInt, decodeEventLog, parseAbi, Address } from 'viem';

// Define the Sepolia contract addresses and their known details
const TOKEN_CONFIG = {
  // Sepolia USDC:
  '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238': { symbol: 'USDC', decimals: 6 },
  // Sepolia EURC:
  '0x08210f9170f89ab7658f0b5e3ff39b0e03c594d4': { symbol: 'EURC', decimals: 6 },
  // CUSTOM TOKEN ADDRESS WILL BE ADDED HERE LATER:
  // e.g., '0x...': { symbol: 'CW-ERC20', decimals: 18 } 
};

// Minimal ERC20 Transfer ABI for decoding the log
const ERC20_TRANSFER_ABI = parseAbi([
  'event Transfer(address indexed from, address indexed to, uint256 value)'
]);

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectRepository(Transfer)
    private transfersRepository: Repository<Transfer>,
  ) {}

  async handleAlchemyWebhook(payload: AlchemyWebhookDto): Promise<void> {
    // Access the GraphQL payload structure
    const logsToProcess = payload.event.data.block.logs;

    this.logger.log(`Received webhook ID ${payload.id} with ${logsToProcess.length} logs to process.`);

    // Process each log entry received in the single webhook payload
    for (const log of logsToProcess) {
      // Extract data from the new nested structure:
      const contractAddress = log.account.address.toLowerCase() as Address;
      const transactionHash = log.transaction.hash;
      const tokenInfo = TOKEN_CONFIG[contractAddress];

      if (!tokenInfo) {
        this.logger.warn(`Ignoring transfer from unknown contract: ${contractAddress}`);
        continue;
      }

      // Check for duplicates before expensive decoding (prevents double-entry from webhook retries)
      const existingTransfer = await this.transfersRepository.findOneBy({
          transactionHash: transactionHash,
      });

      if (existingTransfer) {
          this.logger.warn(`Duplicate transaction hash skipped: ${transactionHash}`);
          continue;
      }

      // Start Processing Log
      try {
        // Decode the log data using viem's utilities
        const decodedEvent = decodeEventLog({
          abi: ERC20_TRANSFER_ABI,
          data: log.data as `0x${string}`, // Requires 'data' field from Alchemy
          topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
        });

        const from = decodedEvent.args.from.toLowerCase();
        const to = decodedEvent.args.to.toLowerCase();
        const rawValue = decodedEvent.args.value; // BigInt value

        // Format Amount and Timestamp
        const parsedAmount = formatUnits(rawValue, tokenInfo.decimals);

        // NOTE: The Alchemy GraphQL payload does not provide a timestamp for the log.
        // We use the webhook's creation time as a reliable fallback.
        const timestamp = new Date(payload.createdAt);

        // Create and Save the Transfer Entity
        const newTransfer = this.transfersRepository.create({
          contractAddress,
          sender: from,
          receiver: to,
          amount: parsedAmount,
          symbol: tokenInfo.symbol,
          decimals: tokenInfo.decimals,
          timestamp: timestamp,
          transactionHash: transactionHash,
        });

        await this.transfersRepository.save(newTransfer);
        this.logger.log(`Saved transfer: ${parsedAmount} ${tokenInfo.symbol} in TX ${transactionHash}`);

      } catch (error) {
        // This will catch errors if log.data is missing or decoding fails
        this.logger.error(`Error processing log for TX ${transactionHash}. Payload issue or decoding error: ${error.message}`);
      }
    }
  }
}
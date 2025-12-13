import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transfer } from '../transfer/entities/transfer.entity';
import { AlchemyWebhookDto } from './dto/alchemy-webhook.dto';
import {
  formatUnits,
  decodeEventLog,
  parseAbi,
  Address,
  createWalletClient,
  createPublicClient,
  http,
  WalletClient,
  PublicClient,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { ERC20_ABI } from '../abi/erc20-abi';
import { ConfigService } from '@nestjs/config';

// Token configuration
const TOKEN_CONFIG: Record<string, { symbol: string; decimals: number }> = {
  '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238': { symbol: 'USDC', decimals: 6 },
  '0x08210f9170f89ab7658f0b5e3ff39b0e03c594d4': { symbol: 'EURC', decimals: 6 },
  '0xc2c9a6d4c2699349f69de33df8ed8a90db908944': { symbol: 'CW-ERC20', decimals: 18 },
};

const USDC_ADDRESS =
  '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238' as Address;

const CW_ERC20_ADDRESS =
  '0xc2c9a6d4c2699349f69de33df8ed8a90db908944' as Address;

const MINT_TOKEN_DECIMALS = 18;
const MINT_MULTIPLIER = 10n;

// Minimal ERC20 Transfer ABI
const ERC20_TRANSFER_ABI = parseAbi([
  'event Transfer(address indexed from, address indexed to, uint256 value)',
]);

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  private publicClient: PublicClient;
  private walletClient: WalletClient;
  private serviceWalletAddress: Address;

  constructor(
    @InjectRepository(Transfer)
    private readonly transfersRepository: Repository<Transfer>,
    private readonly configService: ConfigService,
  ) {
    // Configuration and validation

    const publicRpc = this.configService.get<string>('SEPOLIA_RPC_URL');
    const txRpc = this.configService.get<string>(
      'SERVICE_WALLET_TRANSACTION_RPC',
    );
    const privateKey = this.configService.get<string>(
      'SERVICE_WALLET_PRIVATE_KEY',
    );

    if (!publicRpc || !txRpc || !privateKey) {
      throw new Error(
        'Missing SEPOLIA_RPC_URL, SERVICE_WALLET_TRANSACTION_RPC, or SERVICE_WALLET_PRIVATE_KEY',
      );
    }
    // Wallet initialization (LOCAL SIGNING)
    const cleanKey = privateKey.startsWith('0x')
      ? privateKey
      : `0x${privateKey}`;

    const account = privateKeyToAccount(cleanKey as `0x${string}`);
    this.serviceWalletAddress = account.address;

    this.publicClient = createPublicClient({
      chain: sepolia,
      transport: http(publicRpc),
    });

    this.walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(txRpc),
    });

    this.logger.log(`Service wallet initialized: ${account.address}`);
  }

  async handleAlchemyWebhook(payload: AlchemyWebhookDto): Promise<void> {
    const logs = payload.event.data.block.logs;

    this.logger.log(`Received ${logs.length} logs`);

    for (const log of logs) {
      const contractAddress = log.account.address.toLowerCase() as Address;
      const tokenInfo = TOKEN_CONFIG[contractAddress];
      if (!tokenInfo) continue;

      const txHash = log.transaction.hash;

      const exists = await this.transfersRepository.findOneBy({
        transactionHash: txHash,
      });
      if (exists) continue;

      try {
        const decoded = decodeEventLog({
          abi: ERC20_TRANSFER_ABI,
          data: log.data as `0x${string}`,
          topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
        });

        const sender = decoded.args.from.toLowerCase() as Address;
        const receiver = decoded.args.to.toLowerCase() as Address;
        const rawValue = decoded.args.value;

        const amount = formatUnits(rawValue, tokenInfo.decimals);
        const timestamp = new Date(payload.createdAt);

        await this.transfersRepository.save(
          this.transfersRepository.create({
            contractAddress,
            sender,
            receiver,
            amount,
            symbol: tokenInfo.symbol,
            decimals: tokenInfo.decimals,
            timestamp,
            transactionHash: txHash,
          }),
        );

        this.logger.log(
          `Saved ${amount} ${tokenInfo.symbol} (${txHash})`,
        );
        if (
          contractAddress.toLowerCase() === USDC_ADDRESS.toLowerCase() &&
          receiver.toLowerCase() === this.serviceWalletAddress.toLowerCase()
        ) {
          const scaled =
            rawValue *
            10n ** BigInt(MINT_TOKEN_DECIMALS - tokenInfo.decimals);

          const mintAmount = scaled * MINT_MULTIPLIER;

          this.logger.log(
            `Minting ${mintAmount} CW-ERC20 to ${sender}`,
          );

          const mintHash = await this.walletClient.writeContract({
            chain: sepolia,
            account: this.walletClient.account!,
            address: CW_ERC20_ADDRESS,
            abi: ERC20_ABI,
            functionName: 'mint',
            args: [this.serviceWalletAddress, mintAmount],
          });
          await this.publicClient.waitForTransactionReceipt({
            hash: mintHash,
          });

          const transferHash = await this.walletClient.writeContract({
            chain: sepolia,
            account: this.walletClient.account!,
            address: CW_ERC20_ADDRESS,
            abi: ERC20_ABI,
            functionName: 'transfer',
            args: [sender, mintAmount],
          });
          this.logger.log(
            `Swap completed. Mint TX: ${mintHash}, Transfer TX: ${transferHash}`,
          );
        }
      } catch (err: any) {
        this.logger.error(
          `Failed processing tx ${txHash}: ${err.message}`,
        );
      }
    }
  }
}

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Transfer } from '../transfer/entities/transfer.entity';
import { TransactionFilterDto } from './dto/transaction-filter.dto';
import { TokenMetadataFilterDto } from './dto/token-metadata-filter.dto';
import { createPublicClient, http, formatUnits, Address } from 'viem';
import { sepolia } from 'viem/chains';
import { ERC20_ABI } from '../abi/erc20-abi';

@Injectable()
export class HistoryService {
  private readonly logger = new Logger(HistoryService.name);
  private publicClient;

  constructor(
    @InjectRepository(Transfer)
    private transfersRepository: Repository<Transfer>,
  ) {
    const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL;
    if (!sepoliaRpcUrl) {
      this.logger.error("SEPOLIA_RPC_URL not configured. Web3 calls will fail.");
    }
    
    this.publicClient = createPublicClient({ 
        chain: sepolia, 
        transport: http(sepoliaRpcUrl) 
    });
  }

  // Transaction History Endpoint
  async getTransactionHistory(filters: TransactionFilterDto) {
  const { page, limit, symbol, sender, receiver, startTime, endTime } = filters;
  const skip = (page - 1) * limit;

  // Base conditions (AND-ed)
  const baseWhere: any = {};

  if (symbol) baseWhere.symbol = symbol;

  if (startTime && endTime) {
    baseWhere.timestamp = Between(new Date(startTime), new Date(endTime));
  } else if (startTime) {
    baseWhere.timestamp = MoreThanOrEqual(new Date(startTime));
  } else if (endTime) {
    baseWhere.timestamp = LessThanOrEqual(new Date(endTime));
  }

  let where: any;

  // OR logic for sender / receiver
  if (sender && receiver) {
    where = [
      { ...baseWhere, sender: sender.toLowerCase() },
      { ...baseWhere, receiver: receiver.toLowerCase() },
    ];
  } else if (sender) {
    where = { ...baseWhere, sender: sender.toLowerCase() };
  } else if (receiver) {
    where = { ...baseWhere, receiver: receiver.toLowerCase() };
  } else {
    where = baseWhere;
  }

  const [transfers, total] = await this.transfersRepository.findAndCount({
    where,
    order: { timestamp: 'DESC' },
    skip,
    take: limit,
  });

  return {
    transfers,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}


  // Token Metadata Endpoint
  async getTokenMetadata(filters: TokenMetadataFilterDto) {
    const address = filters.contractAddress as Address;

    // Fetch static metadata (symbol and decimals) from the DB
    const transferRecord = await this.transfersRepository.findOne({
      where: { contractAddress: address.toLowerCase() },
      select: ['symbol', 'decimals'], 
      order: { timestamp: 'DESC' },
    });

    if (!transferRecord) {
      return {
        contractAddress: address,
        tokenSymbol: 'UNKWN',
        tokenDecimals: 18,
        totalSupply: 'N/A',
        note: `No history data found in DB for this contract address.`,
      };
    }

    const { symbol, decimals } = transferRecord;
    
    try {
      // Fetch total supply directly from the live Sepolia contract using Viem
      const [totalSupplyResponse] = await this.publicClient.multicall({
        contracts: [
            {
                address: address,
                abi: ERC20_ABI,
                functionName: 'totalSupply',
            }
        ],
      });
      
      // Check for explicit failure status or missing result
      if (totalSupplyResponse.status !== 'success' || !totalSupplyResponse.result) {
          this.logger.error(`Multicall failed for ${address}. Status: ${totalSupplyResponse.status}`);
          // Throw an error that the local catch block will handle
          throw new Error(`ERC20 totalSupply call failed on chain for address ${address}.`);
      }

      // Parse the raw total supply using the fetched decimals
      // The 'result' is guaranteed to be a bigint
      const totalSupplyParsed = formatUnits(totalSupplyResponse.result as bigint, decimals); 

      return {
        contractAddress: address,
        tokenSymbol: symbol,
        tokenDecimals: decimals,
        totalSupply: totalSupplyParsed,
      };
      
    } catch (error) {
      // Catch network errors, ABI errors, or the custom error thrown above
      this.logger.error(`Failed to fetch live supply for ${address}: ${error.message}`);
      
      // Return partial data with an error note
      return {
        contractAddress: address,
        tokenSymbol: symbol,
        tokenDecimals: decimals,
        totalSupply: 'Error Fetching Supply',
        note: `Live Web3 call failed: ${error.message}`
      };
    }
  }
}

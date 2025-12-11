import { Entity, Column, PrimaryColumn, Index } from 'typeorm';

@Entity('transfers') // Defines the table name in PostgreSQL
export class Transfer {
  // Primary key will be the Transaction Hash. 
  // We use this as a unique constraint to prevent duplicate webhook processing.
  @PrimaryColumn({ type: 'varchar', length: 66 }) // Transaction hashes are 66 chars (0x...)
  transactionHash: string;

  // Contract Metadata
  @Column({ type: 'varchar', length: 42 })
  @Index() // Index for fast filtering by contract address
  contractAddress: string;

  @Column({ type: 'varchar', length: 10 })
  symbol: string; // e.g., 'USDC', 'EURC', 'CW-ERC20'

  @Column({ type: 'smallint' })
  decimals: number;

  // Transaction Details
  @Column({ type: 'varchar', length: 42 })
  @Index() // Index for fast filtering by sender
  sender: string;

  @Column({ type: 'varchar', length: 42 })
  @Index() // Index for fast filtering by receiver
  receiver: string;

  // Storing the amount as a string (numeric) to preserve precision and handle large values
  @Column({ type: 'numeric', precision: 30, scale: 18 })
  amount: string; 

  @Column({ type: 'timestamp with time zone' })
  @Index() // Index for fast sorting and timeframe filtering
  timestamp: Date;
}

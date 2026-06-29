import { randomUUID } from "crypto";
import pool from "../config/db";
import {
  BlockchainTransaction,
  BlockchainTxStatus,
} from "../models/blockchainTx.model";

class BlockchainTxRepository {
  async createTx(params: {
    txHash: string;
    type: string;
    electionId?: string | null;
    userId?: string | null;
  }): Promise<BlockchainTransaction> {
    const id = randomUUID();
    const result = await pool.query(
      `
      INSERT INTO blockchain_transactions (
        id, tx_hash, type, election_id, user_id, status
      )
      VALUES ($1, $2, $3, $4, $5, 'PENDING')
      RETURNING id, tx_hash, type, election_id, user_id, status, error_message, block_number, created_at, updated_at
      `,
      [id, params.txHash, params.type, params.electionId ?? null, params.userId ?? null]
    );
    const row = result.rows[0];
    return {
      id: row.id,
      txHash: row.tx_hash,
      type: row.type,
      electionId: row.election_id,
      userId: row.user_id,
      status: row.status,
      errorMessage: row.error_message,
      blockNumber: row.block_number,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async updateStatus(
    txHash: string,
    status: BlockchainTxStatus,
    errorMessage?: string | null,
    blockNumber?: number | null
  ): Promise<void> {
    await pool.query(
      `
      UPDATE blockchain_transactions
      SET status = $2,
          error_message = $3,
          block_number = COALESCE($4, block_number),
          updated_at = NOW()
      WHERE tx_hash = $1
      `,
      [txHash, status, errorMessage ?? null, blockNumber ?? null]
    );
  }
}

export const blockchainTxRepository = new BlockchainTxRepository();


import { randomUUID } from "crypto";
import pool from "../config/db";
import { Vote } from "../models/vote.model";

class VoteRepository {
  async hasUserVoted(electionId: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      `
      SELECT 1
      FROM votes
      WHERE election_id = $1 AND user_id = $2
      LIMIT 1
      `,
      [electionId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async findByTxHash(txHash: string): Promise<Vote | null> {
    const result = await pool.query(
      `
      SELECT id, election_id, user_id, wallet_address, candidate_id, tx_hash, block_number, created_at
      FROM votes
      WHERE tx_hash = $1
      `,
      [txHash]
    );
    if (result.rowCount === 0) return null;
    const row = result.rows[0];
    return {
      id: row.id,
      electionId: row.election_id,
      userId: row.user_id,
      walletAddress: row.wallet_address,
      candidateId: row.candidate_id,
      txHash: row.tx_hash,
      blockNumber: row.block_number,
      createdAt: row.created_at,
    };
  }

  async insertVote(params: {
    electionId: string;
    userId: string | null;
    walletAddress: string;
    candidateId: number | null;
    txHash: string;
    blockNumber: number;
  }): Promise<Vote> {
    const id = randomUUID();
    const result = await pool.query(
      `
      INSERT INTO votes (
        id, election_id, user_id, wallet_address, candidate_id, tx_hash, block_number
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, election_id, user_id, wallet_address, candidate_id, tx_hash, block_number, created_at
      `,
      [
        id,
        params.electionId,
        params.userId,
        params.walletAddress,
        params.candidateId,
        params.txHash,
        params.blockNumber,
      ]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      electionId: row.election_id,
      userId: row.user_id,
      walletAddress: row.wallet_address,
      candidateId: row.candidate_id,
      txHash: row.tx_hash,
      blockNumber: row.block_number,
      createdAt: row.created_at,
    };
  }
}

export const voteRepository = new VoteRepository();


import { randomUUID } from "crypto";
import pool from "../config/db";

class VoteRepository {
  /**
   * Checks if a specific voter has already cast their vote in an election off-chain.
   * This queries the voter_participations table, preserving the anonymity of *which* candidate they voted for.
   */
  async hasUserVoted(electionId: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      `
      SELECT 1
      FROM voter_participations
      WHERE election_id = $1 AND user_id = $2
      LIMIT 1
      `,
      [electionId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Records that a voter has participated in an election.
   * Done in a separate step/table to disconnect voter identity from the cast ballot.
   */
  async recordUserParticipation(electionId: string, userId: string): Promise<void> {
    const id = randomUUID();
    await pool.query(
      `
      INSERT INTO voter_participations (id, election_id, user_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (election_id, user_id) DO NOTHING
      `,
      [id, electionId, userId]
    );
  }

  /**
   * Checks if a vote transaction has already been recorded in the database.
   */
  async hasVoteTxBeenRecorded(txHash: string): Promise<boolean> {
    const result = await pool.query(
      `
      SELECT 1
      FROM votes
      WHERE tx_hash = $1
      LIMIT 1
      `,
      [txHash]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Inserts an anonymized vote record. No user_id or wallet_address is linked here.
   */
  async insertVote(params: {
    electionId: string;
    candidateId: number;
    txHash: string;
    blockNumber: number;
  }): Promise<void> {
    const id = randomUUID();
    await pool.query(
      `
      INSERT INTO votes (
        id, election_id, candidate_id, tx_hash, block_number
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (tx_hash) DO NOTHING
      `,
      [
        id,
        params.electionId,
        params.candidateId,
        params.txHash,
        params.blockNumber,
      ]
    );
  }
}

export const voteRepository = new VoteRepository();


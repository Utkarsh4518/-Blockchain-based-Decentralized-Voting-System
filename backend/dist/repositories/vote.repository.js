"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.voteRepository = void 0;
const crypto_1 = require("crypto");
const db_1 = __importDefault(require("../config/db"));
class VoteRepository {
    async hasUserVoted(electionId, userId) {
        const result = await db_1.default.query(`
      SELECT 1
      FROM votes
      WHERE election_id = $1 AND user_id = $2
      LIMIT 1
      `, [electionId, userId]);
        return (result.rowCount ?? 0) > 0;
    }
    async findByTxHash(txHash) {
        const result = await db_1.default.query(`
      SELECT id, election_id, user_id, wallet_address, candidate_id, tx_hash, block_number, created_at
      FROM votes
      WHERE tx_hash = $1
      `, [txHash]);
        if (result.rowCount === 0)
            return null;
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
    async insertVote(params) {
        const id = (0, crypto_1.randomUUID)();
        const result = await db_1.default.query(`
      INSERT INTO votes (
        id, election_id, user_id, wallet_address, candidate_id, tx_hash, block_number
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, election_id, user_id, wallet_address, candidate_id, tx_hash, block_number, created_at
      `, [
            id,
            params.electionId,
            params.userId,
            params.walletAddress,
            params.candidateId,
            params.txHash,
            params.blockNumber,
        ]);
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
exports.voteRepository = new VoteRepository();

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockchainTxRepository = void 0;
const crypto_1 = require("crypto");
const db_1 = __importDefault(require("../config/db"));
class BlockchainTxRepository {
    async createTx(params) {
        const id = (0, crypto_1.randomUUID)();
        const result = await db_1.default.query(`
      INSERT INTO blockchain_transactions (
        id, tx_hash, type, election_id, user_id, status
      )
      VALUES ($1, $2, $3, $4, $5, 'PENDING')
      RETURNING id, tx_hash, type, election_id, user_id, status, error_message, block_number, created_at, updated_at
      `, [id, params.txHash, params.type, params.electionId ?? null, params.userId ?? null]);
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
    async updateStatus(txHash, status, errorMessage, blockNumber) {
        await db_1.default.query(`
      UPDATE blockchain_transactions
      SET status = $2,
          error_message = $3,
          block_number = COALESCE($4, block_number),
          updated_at = NOW()
      WHERE tx_hash = $1
      `, [txHash, status, errorMessage ?? null, blockNumber ?? null]);
    }
}
exports.blockchainTxRepository = new BlockchainTxRepository();

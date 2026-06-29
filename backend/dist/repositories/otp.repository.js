"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.otpRepository = void 0;
const crypto_1 = require("crypto");
const db_1 = __importDefault(require("../config/db"));
class OtpRepository {
    async createToken(userId, codeHash, expiresAt) {
        const id = (0, crypto_1.randomUUID)();
        const result = await db_1.default.query(`
      INSERT INTO otp_tokens (id, user_id, code_hash, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_id, code_hash, expires_at, used_at, created_at
      `, [id, userId, codeHash, expiresAt]);
        const row = result.rows[0];
        return {
            id: row.id,
            userId: row.user_id,
            codeHash: row.code_hash,
            expiresAt: row.expires_at,
            usedAt: row.used_at,
            createdAt: row.created_at,
        };
    }
    async findActiveTokenByUser(userId) {
        const result = await db_1.default.query(`
      SELECT id, user_id, code_hash, expires_at, used_at, created_at
      FROM otp_tokens
      WHERE user_id = $1
        AND used_at IS NULL
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
      `, [userId]);
        if (result.rowCount === 0)
            return null;
        const row = result.rows[0];
        return {
            id: row.id,
            userId: row.user_id,
            codeHash: row.code_hash,
            expiresAt: row.expires_at,
            usedAt: row.used_at,
            createdAt: row.created_at,
        };
    }
    async markUsed(id) {
        await db_1.default.query(`
      UPDATE otp_tokens
      SET used_at = NOW()
      WHERE id = $1
      `, [id]);
    }
}
exports.otpRepository = new OtpRepository();

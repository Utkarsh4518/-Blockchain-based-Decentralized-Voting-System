import { randomUUID } from "crypto";
import pool from "../config/db";
import { OtpToken } from "../models/otp.model";

class OtpRepository {
  async createToken(
    userId: string,
    codeHash: string,
    expiresAt: Date
  ): Promise<OtpToken> {
    const id = randomUUID();
    const result = await pool.query(
      `
      INSERT INTO otp_tokens (id, user_id, code_hash, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_id, code_hash, expires_at, used_at, created_at
      `,
      [id, userId, codeHash, expiresAt]
    );
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

  async findActiveTokenByUser(
    userId: string
  ): Promise<OtpToken | null> {
    const result = await pool.query(
      `
      SELECT id, user_id, code_hash, expires_at, used_at, created_at
      FROM otp_tokens
      WHERE user_id = $1
        AND used_at IS NULL
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [userId]
    );
    if (result.rowCount === 0) return null;
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

  async markUsed(id: string): Promise<void> {
    await pool.query(
      `
      UPDATE otp_tokens
      SET used_at = NOW()
      WHERE id = $1
      `,
      [id]
    );
  }
}

export const otpRepository = new OtpRepository();


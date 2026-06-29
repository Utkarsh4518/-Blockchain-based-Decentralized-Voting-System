import { randomUUID } from "crypto";
import pool from "../config/db";
import { User, UserRole } from "../models/user.model";

class UserRepository {
  async createUser(
    email: string,
    walletAddress: string | null,
    role: UserRole,
    publicKey: string | null = null
  ): Promise<User> {
    const id = randomUUID();
    const result = await pool.query(
      `
      INSERT INTO users (id, email, wallet_address, public_key, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, wallet_address, public_key, role, created_at
      `,
      [id, email, walletAddress, publicKey, role]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      walletAddress: row.wallet_address,
      publicKey: row.public_key,
      role: row.role,
      createdAt: row.created_at,
    };
  }

  async savePublicKey(id: string, publicKey: string): Promise<void> {
    await pool.query(
      `
      UPDATE users
      SET public_key = $2
      WHERE id = $1
      `,
      [id, publicKey]
    );
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query(
      `
      SELECT id, email, wallet_address, public_key, role, created_at
      FROM users
      WHERE email = $1
      `,
      [email]
    );
    if (result.rowCount === 0) return null;
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      walletAddress: row.wallet_address,
      publicKey: row.public_key,
      role: row.role,
      createdAt: row.created_at,
    };
  }

  async findById(id: string): Promise<User | null> {
    const result = await pool.query(
      `
      SELECT id, email, wallet_address, public_key, role, created_at
      FROM users
      WHERE id = $1
      `,
      [id]
    );
    if (result.rowCount === 0) return null;
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      walletAddress: row.wallet_address,
      publicKey: row.public_key,
      role: row.role,
      createdAt: row.created_at,
    };
  }
}

export const userRepository = new UserRepository();

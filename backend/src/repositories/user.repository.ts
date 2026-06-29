import { randomUUID } from "crypto";
import pool from "../config/db";
import { User, UserRole } from "../models/user.model";

class UserRepository {
  async createUser(
    email: string,
    walletAddress: string,
    role: UserRole
  ): Promise<User> {
    const id = randomUUID();
    const result = await pool.query(
      `
      INSERT INTO users (id, email, wallet_address, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, wallet_address, role, created_at
      `,
      [id, email, walletAddress, role]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      walletAddress: row.wallet_address,
      role: row.role,
      createdAt: row.created_at,
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query(
      `
      SELECT id, email, wallet_address, role, created_at
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
      role: row.role,
      createdAt: row.created_at,
    };
  }

  async findById(id: string): Promise<User | null> {
    const result = await pool.query(
      `
      SELECT id, email, wallet_address, role, created_at
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
      role: row.role,
      createdAt: row.created_at,
    };
  }
}

export const userRepository = new UserRepository();


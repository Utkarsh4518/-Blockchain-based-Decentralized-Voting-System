"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRepository = void 0;
const crypto_1 = require("crypto");
const db_1 = __importDefault(require("../config/db"));
class UserRepository {
    async createUser(email, walletAddress, role) {
        const id = (0, crypto_1.randomUUID)();
        const result = await db_1.default.query(`
      INSERT INTO users (id, email, wallet_address, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, wallet_address, role, created_at
      `, [id, email, walletAddress, role]);
        const row = result.rows[0];
        return {
            id: row.id,
            email: row.email,
            walletAddress: row.wallet_address,
            role: row.role,
            createdAt: row.created_at,
        };
    }
    async findByEmail(email) {
        const result = await db_1.default.query(`
      SELECT id, email, wallet_address, role, created_at
      FROM users
      WHERE email = $1
      `, [email]);
        if (result.rowCount === 0)
            return null;
        const row = result.rows[0];
        return {
            id: row.id,
            email: row.email,
            walletAddress: row.wallet_address,
            role: row.role,
            createdAt: row.created_at,
        };
    }
    async findById(id) {
        const result = await db_1.default.query(`
      SELECT id, email, wallet_address, role, created_at
      FROM users
      WHERE id = $1
      `, [id]);
        if (result.rowCount === 0)
            return null;
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
exports.userRepository = new UserRepository();

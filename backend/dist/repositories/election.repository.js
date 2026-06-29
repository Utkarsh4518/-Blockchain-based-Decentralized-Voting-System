"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.electionRepository = void 0;
const crypto_1 = require("crypto");
const db_1 = __importDefault(require("../config/db"));
class ElectionRepository {
    async createElection(name, startTime, endTime) {
        const id = (0, crypto_1.randomUUID)();
        const result = await db_1.default.query(`
      INSERT INTO elections (id, name, start_time, end_time, status)
      VALUES ($1, $2, $3, $4, 'CREATED')
      RETURNING id, name, start_time, end_time, status, onchain_election_id, created_at
      `, [id, name, startTime, endTime]);
        const row = result.rows[0];
        return {
            id: row.id,
            name: row.name,
            startTime: row.start_time,
            endTime: row.end_time,
            status: row.status,
            onchainElectionId: row.onchain_election_id,
            createdAt: row.created_at,
        };
    }
    async linkOnchainElection(id, onchainElectionId) {
        await db_1.default.query(`
      UPDATE elections
      SET onchain_election_id = $2
      WHERE id = $1
      `, [id, onchainElectionId]);
    }
    async updateStatus(id, status) {
        await db_1.default.query(`
      UPDATE elections
      SET status = $2
      WHERE id = $1
      `, [id, status]);
    }
    async findById(id) {
        const result = await db_1.default.query(`
      SELECT id, name, start_time, end_time, status, onchain_election_id, created_at
      FROM elections
      WHERE id = $1
      `, [id]);
        if (result.rowCount === 0)
            return null;
        const row = result.rows[0];
        return {
            id: row.id,
            name: row.name,
            startTime: row.start_time,
            endTime: row.end_time,
            status: row.status,
            onchainElectionId: row.onchain_election_id,
            createdAt: row.created_at,
        };
    }
    async findByOnchainId(onchainId) {
        const result = await db_1.default.query(`
      SELECT id, name, start_time, end_time, status, onchain_election_id, created_at
      FROM elections
      WHERE onchain_election_id = $1
      `, [onchainId]);
        if (result.rowCount === 0)
            return null;
        const row = result.rows[0];
        return {
            id: row.id,
            name: row.name,
            startTime: row.start_time,
            endTime: row.end_time,
            status: row.status,
            onchainElectionId: row.onchain_election_id,
            createdAt: row.created_at,
        };
    }
    async findActiveElections() {
        const result = await db_1.default.query(`
      SELECT id, name, start_time, end_time, status, onchain_election_id, created_at
      FROM elections
      WHERE status = 'ACTIVE'
      `);
        return result.rows.map((row) => ({
            id: row.id,
            name: row.name,
            startTime: row.start_time,
            endTime: row.end_time,
            status: row.status,
            onchainElectionId: row.onchain_election_id,
            createdAt: row.created_at,
        }));
    }
}
exports.electionRepository = new ElectionRepository();

import { randomUUID } from "crypto";
import pool from "../config/db";
import { Election, ElectionStatus } from "../models/election.model";

class ElectionRepository {
  async createElection(
    name: string,
    startTime: Date,
    endTime: Date
  ): Promise<Election> {
    const id = randomUUID();
    const result = await pool.query(
      `
      INSERT INTO elections (id, name, start_time, end_time, status)
      VALUES ($1, $2, $3, $4, 'CREATED')
      RETURNING id, name, start_time, end_time, status, onchain_election_id, created_at
      `,
      [id, name, startTime, endTime]
    );
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

  async linkOnchainElection(
    id: string,
    onchainElectionId: number
  ): Promise<void> {
    await pool.query(
      `
      UPDATE elections
      SET onchain_election_id = $2
      WHERE id = $1
      `,
      [id, onchainElectionId]
    );
  }

  async updateStatus(id: string, status: ElectionStatus): Promise<void> {
    await pool.query(
      `
      UPDATE elections
      SET status = $2
      WHERE id = $1
      `,
      [id, status]
    );
  }

  async findById(id: string): Promise<Election | null> {
    const result = await pool.query(
      `
      SELECT id, name, start_time, end_time, status, onchain_election_id, created_at
      FROM elections
      WHERE id = $1
      `,
      [id]
    );
    if (result.rowCount === 0) return null;
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

  async findByOnchainId(onchainId: number): Promise<Election | null> {
    const result = await pool.query(
      `
      SELECT id, name, start_time, end_time, status, onchain_election_id, created_at
      FROM elections
      WHERE onchain_election_id = $1
      `,
      [onchainId]
    );
    if (result.rowCount === 0) return null;
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

  async findActiveElections(): Promise<Election[]> {
    const result = await pool.query(
      `
      SELECT id, name, start_time, end_time, status, onchain_election_id, created_at
      FROM elections
      WHERE status = 'ACTIVE'
      ORDER BY start_time DESC
      `
    );
    return result.rows.map((row: any) => ({
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

export const electionRepository = new ElectionRepository();


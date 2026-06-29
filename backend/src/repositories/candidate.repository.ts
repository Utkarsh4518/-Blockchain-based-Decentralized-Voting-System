import { randomUUID } from "crypto";
import pool from "../config/db";
import { Candidate } from "../models/candidate.model";

class CandidateRepository {
  /**
   * Inserts multiple candidates into the database in a single query.
   * Fixes a bug where parameter placeholders did not match parameter values.
   */
  async bulkInsert(
    electionId: string,
    candidates: { candidateId: number; name: string; description?: string }[]
  ): Promise<Candidate[]> {
    const values: any[] = [];
    const placeholders: string[] = [];

    candidates.forEach((c, index) => {
      const id = randomUUID();
      const base = index * 5;
      placeholders.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`
      );
      values.push(id, electionId, c.candidateId, c.name, c.description ?? null);
    });

    const query = `
      INSERT INTO candidates (id, election_id, candidate_id, name, description)
      VALUES ${placeholders.join(", ")}
      RETURNING id, election_id, candidate_id, name, description
    `;

    const result = await pool.query(query, values);
    return result.rows.map((row: any) => ({
      id: row.id,
      electionId: row.election_id,
      candidateId: row.candidate_id,
      name: row.name,
      description: row.description,
    }));
  }

  /**
   * Retrieves all candidates associated with a specific election.
   */
  async findByElectionId(electionId: string): Promise<Candidate[]> {
    const result = await pool.query(
      `
      SELECT id, election_id, candidate_id, name, description
      FROM candidates
      WHERE election_id = $1
      ORDER BY candidate_id ASC
      `,
      [electionId]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      electionId: row.election_id,
      candidateId: row.candidate_id,
      name: row.name,
      description: row.description,
    }));
  }
}

export const candidateRepository = new CandidateRepository();


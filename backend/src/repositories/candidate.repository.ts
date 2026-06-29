import { randomUUID } from "crypto";
import pool from "../config/db";
import { Candidate } from "../models/candidate.model";

class CandidateRepository {
  async bulkInsert(
    electionId: string,
    candidates: { candidateId: number; name: string; description?: string }[]
  ): Promise<Candidate[]> {
    const values: any[] = [];
    const placeholders: string[] = [];

    candidates.forEach((c, index) => {
      const id = randomUUID();
      const base = index * 4;
      placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`);
      values.push(id, electionId, c.candidateId, c.name);
      values.push(c.description ?? null);
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
}

export const candidateRepository = new CandidateRepository();


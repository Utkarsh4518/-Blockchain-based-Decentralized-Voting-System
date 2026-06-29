"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.candidateRepository = void 0;
const crypto_1 = require("crypto");
const db_1 = __importDefault(require("../config/db"));
class CandidateRepository {
    async bulkInsert(electionId, candidates) {
        const values = [];
        const placeholders = [];
        candidates.forEach((c, index) => {
            const id = (0, crypto_1.randomUUID)();
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
        const result = await db_1.default.query(query, values);
        return result.rows.map((row) => ({
            id: row.id,
            electionId: row.election_id,
            candidateId: row.candidate_id,
            name: row.name,
            description: row.description,
        }));
    }
}
exports.candidateRepository = new CandidateRepository();

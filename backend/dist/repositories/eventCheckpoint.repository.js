"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventCheckpointRepository = void 0;
const db_1 = __importDefault(require("../config/db"));
class EventCheckpointRepository {
    constructor() {
        this.key = "voting_contract";
    }
    async getLastProcessedBlock() {
        const result = await db_1.default.query(`
      SELECT last_processed_block
      FROM event_checkpoints
      WHERE id = $1
      `, [this.key]);
        if (result.rowCount === 0) {
            return 0;
        }
        return Number(result.rows[0].last_processed_block);
    }
    async setLastProcessedBlock(blockNumber) {
        await db_1.default.query(`
      INSERT INTO event_checkpoints (id, last_processed_block)
      VALUES ($1, $2)
      ON CONFLICT (id)
      DO UPDATE SET last_processed_block = EXCLUDED.last_processed_block
      `, [this.key, blockNumber]);
    }
}
exports.eventCheckpointRepository = new EventCheckpointRepository();

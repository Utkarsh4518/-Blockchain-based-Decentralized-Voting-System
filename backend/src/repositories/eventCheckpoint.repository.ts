import pool from "../config/db";

class EventCheckpointRepository {
  private readonly key = "voting_contract";

  async getLastProcessedBlock(): Promise<number> {
    const result = await pool.query(
      `
      SELECT last_processed_block
      FROM event_checkpoints
      WHERE id = $1
      `,
      [this.key]
    );

    if (result.rowCount === 0) {
      return 0;
    }

    return Number(result.rows[0].last_processed_block);
  }

  async setLastProcessedBlock(blockNumber: number): Promise<void> {
    await pool.query(
      `
      INSERT INTO event_checkpoints (id, last_processed_block)
      VALUES ($1, $2)
      ON CONFLICT (id)
      DO UPDATE SET last_processed_block = EXCLUDED.last_processed_block
      `,
      [this.key, blockNumber]
    );
  }
}

export const eventCheckpointRepository = new EventCheckpointRepository();


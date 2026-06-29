import pool from "./db";
import { ethers } from "ethers";

/**
 * Initializes the database tables if they do not exist.
 * Also seeds the default administrator account.
 */
export const initDb = async (): Promise<void> => {
  console.log("[DB] Initializing database tables...");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        wallet_address VARCHAR(42) UNIQUE,
        role VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 2. Create elections table
    await client.query(`
      CREATE TABLE IF NOT EXISTS elections (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        status VARCHAR(50) NOT NULL,
        onchain_election_id INTEGER UNIQUE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 3. Create candidates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS candidates (
        id UUID PRIMARY KEY,
        election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
        candidate_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        UNIQUE(election_id, candidate_id)
      );
    `);

    // 4. Create voter_participations table (prevents double-voting off-chain anonymously)
    await client.query(`
      CREATE TABLE IF NOT EXISTS voter_participations (
        id UUID PRIMARY KEY,
        election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(election_id, user_id)
      );
    `);

    // 5. Create votes table (anonymized vote records from chain events)
    await client.query(`
      CREATE TABLE IF NOT EXISTS votes (
        id UUID PRIMARY KEY,
        election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
        candidate_id INTEGER NOT NULL,
        tx_hash VARCHAR(66) UNIQUE NOT NULL,
        block_number INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 6. Create otp_tokens table
    await client.query(`
      CREATE TABLE IF NOT EXISTS otp_tokens (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP DEFAULT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 7. Create blockchain_transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS blockchain_transactions (
        id UUID PRIMARY KEY,
        tx_hash VARCHAR(66) UNIQUE NOT NULL,
        type VARCHAR(100) NOT NULL,
        election_id UUID,
        user_id UUID,
        status VARCHAR(50) NOT NULL,
        error_message TEXT,
        block_number INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 8. Create event_checkpoints table
    await client.query(`
      CREATE TABLE IF NOT EXISTS event_checkpoints (
        id VARCHAR(100) PRIMARY KEY,
        last_processed_block INTEGER DEFAULT 0
      );
    `);

    await client.query("COMMIT");
    console.log("[DB] Tables verified/created successfully.");

    // Seed default administrator if not present
    const adminEmail = "admin@example.com";
    const existingAdmin = await pool.query("SELECT id FROM users WHERE email = $1", [adminEmail]);

    if (existingAdmin.rowCount === 0) {
      const adminPk = process.env.ADMIN_PRIVATE_KEY;
      let adminWalletAddress = "";
      if (adminPk) {
        try {
          const wallet = new ethers.Wallet(adminPk);
          adminWalletAddress = wallet.address;
        } catch (err) {
          console.warn("[DB] Failed to derive admin address from ADMIN_PRIVATE_KEY:", err);
        }
      }

      const adminId = ethers.UUID.randomUUID();
      await pool.query(
        `
        INSERT INTO users (id, email, wallet_address, role)
        VALUES ($1, $2, $3, 'ADMIN')
        `,
        [adminId, adminEmail, adminWalletAddress || null]
      );
      console.log(`[DB] Seeded default administrator: ${adminEmail}`);
    }
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[DB] Database initialization failed:", err);
    throw err;
  } finally {
    client.release();
  }
};

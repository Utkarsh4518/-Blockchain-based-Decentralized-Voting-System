import { createApp } from "./app";
import dotenv from "dotenv";
import { blockchainEventListener } from "./services/blockchainEvents.service";
import { initDb } from "./config/initDb";
import pool from "./config/db";
import { signToken } from "./utils/jwt";

dotenv.config();

const requiredEnvs = ["ADMIN_PRIVATE_KEY", "VOTER_PRIVATE_KEY"];
for (const env of requiredEnvs) {
  if (!process.env[env]) {
    throw new Error(`Missing required environment variable: ${env}`);
  }
}

// eslint-disable-next-line no-console
console.log(`Using CONTRACT_NETWORK: ${process.env.CONTRACT_NETWORK || "not set"}`);

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const app = createApp();

(async () => {
  // Initialize Database tables and seeds
  await initDb();

  // Print a valid admin login JWT for ease of local testing
  const adminRes = await pool.query("SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1");
  if (adminRes.rowCount > 0) {
    const adminId = adminRes.rows[0].id;
    const token = signToken({ sub: adminId, role: "ADMIN" });
    console.log("\n========================================================");
    console.log("             ADMIN LOGIN JWT TOKEN");
    console.log("========================================================");
    console.log(token);
    console.log("========================================================\n");
  }

  await blockchainEventListener.start();

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on http://localhost:${PORT}`);
  });
})().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server:", err);
  process.exit(1);
});



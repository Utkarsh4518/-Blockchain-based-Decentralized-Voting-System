import { createApp } from "./app";
import dotenv from "dotenv";
import { blockchainEventListener } from "./services/blockchainEvents.service";

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



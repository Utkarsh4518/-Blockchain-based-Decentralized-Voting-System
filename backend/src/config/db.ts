import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
  user: process.env.PGUSER || "voting",
  password: process.env.PGPASSWORD || "password",
  database: process.env.PGDATABASE || "votingdb",
});

export default pool;


import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure pool with better error handling and connection settings
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  // Vercel serverless functions need smaller pool sizes
  max: 1,
  // Add connection timeout
  connectionTimeoutMillis: 10000,
  // Add idle timeout
  idleTimeoutMillis: 30000,
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

export const db = drizzle(pool, { schema });

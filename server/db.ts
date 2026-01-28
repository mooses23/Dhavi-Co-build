import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure pool with better error handling and connection settings for Vercel serverless
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  // Vercel serverless functions need smaller pool sizes
  max: 1,
  // Add connection timeout
  connectionTimeoutMillis: 10000,
  // Short idle timeout for serverless - prevents stale connections with PgBouncer
  idleTimeoutMillis: 5000,
  // Ensure SSL is configured for Supabase
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

export const db = drizzle(pool, { schema });

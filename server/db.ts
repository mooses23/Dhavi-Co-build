import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema.js";

const { Pool } = pg;

let _pool: pg.Pool | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getPool(): pg.Pool {
  if (!_pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database or set the environment variable in Vercel?",
      );
    }
    _pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      max: 3,
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 10000,
    });
  }
  return _pool;
}

export function getDb() {
  if (!_db) {
    _db = drizzle(getPool(), { schema });
  }
  return _db;
}

// For backwards compatibility - these are getters that return the actual instances
export const pool = {
  get query() {
    return getPool().query.bind(getPool());
  },
  get connect() {
    return getPool().connect.bind(getPool());
  },
  get end() {
    return getPool().end.bind(getPool());
  },
  get on() {
    return getPool().on.bind(getPool());
  },
  get totalCount() {
    return getPool().totalCount;
  },
  get idleCount() {
    return getPool().idleCount;
  },
  get waitingCount() {
    return getPool().waitingCount;
  },
};

// Create a proper Proxy for the db object
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    const realDb = getDb();
    const value = (realDb as any)[prop];
    if (typeof value === 'function') {
      return value.bind(realDb);
    }
    return value;
  }
});

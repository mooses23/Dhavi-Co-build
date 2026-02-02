import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema.js";

let _sql: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getSql(): ReturnType<typeof postgres> {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database or set the environment variable in Vercel?",
      );
    }
    _sql = postgres(process.env.DATABASE_URL, {
      prepare: false,
      ssl: process.env.NODE_ENV === "production" ? "require" : false,
      max: 3,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return _sql;
}

export function getDb() {
  if (!_db) {
    _db = drizzle(getSql(), { schema });
  }
  return _db;
}

export const sql = new Proxy({} as ReturnType<typeof postgres>, {
  get(_target, prop) {
    const realSql = getSql();
    const value = (realSql as any)[prop];
    if (typeof value === 'function') {
      return value.bind(realSql);
    }
    return value;
  },
  apply(_target, _thisArg, args) {
    return getSql()(args[0], ...args.slice(1));
  }
});

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

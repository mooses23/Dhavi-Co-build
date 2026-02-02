#!/usr/bin/env tsx
/**
 * Push schema to Supabase production database
 * 
 * Usage:
 *   npx tsx scripts/push-to-supabase.ts
 * 
 * Or with inline URL:
 *   SUPABASE_DATABASE_URL='postgresql://...' npx tsx scripts/push-to-supabase.ts
 */
import { execSync } from "child_process";

const SUPABASE_URL = process.env.SUPABASE_DATABASE_URL;

if (!SUPABASE_URL) {
  console.error("Error: SUPABASE_DATABASE_URL environment variable is not set.");
  console.error("");
  console.error("To use this script:");
  console.error("1. Go to your Supabase project → Settings → Database");
  console.error("2. Copy the 'Connection string' (URI format) with port 6543 (Transaction Pooler)");
  console.error("3. Add SUPABASE_DATABASE_URL to your Replit secrets, or run:");
  console.error("");
  console.error("   SUPABASE_DATABASE_URL='postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres' npx tsx scripts/push-to-supabase.ts");
  console.error("");
  process.exit(1);
}

console.log("🚀 Pushing schema to Supabase production database...");
console.log("");

try {
  execSync(
    `DATABASE_URL="${SUPABASE_URL}" npx drizzle-kit push`,
    { 
      stdio: "inherit",
      env: {
        ...process.env,
        DATABASE_URL: SUPABASE_URL,
      }
    }
  );
  console.log("");
  console.log("✅ Schema successfully pushed to Supabase!");
} catch (error) {
  console.error("");
  console.error("❌ Failed to push schema to Supabase.");
  console.error("Check your connection string and try again.");
  process.exit(1);
}

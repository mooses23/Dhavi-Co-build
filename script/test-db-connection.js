#!/usr/bin/env node

/**
 * Database Connection Test Script
 * 
 * This script tests the database connection and session table setup.
 * Run this to diagnose database connection issues.
 * 
 * Usage: node script/test-db-connection.js
 */

import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { Pool } = pg;

async function testConnection() {
  console.log('🔍 Testing Database Connection...\n');
  
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.log('\nPlease set DATABASE_URL in your environment or .env file:');
    console.log('  export DATABASE_URL="postgresql://user:password@host:port/database"');
    console.log('\nOr create a .env file with:');
    console.log('  DATABASE_URL=postgresql://user:password@host:port/database');
    process.exit(1);
  }
  
  console.log('✓ DATABASE_URL is set');
  console.log(`  Host: ${new URL(process.env.DATABASE_URL).hostname}`);
  console.log(`  Database: ${new URL(process.env.DATABASE_URL).pathname.slice(1)}\n`);
  
  // Create pool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 10000,
  });
  
  try {
    // Test basic connection
    console.log('Testing basic connection...');
    const result = await pool.query('SELECT NOW() as current_time, version() as version');
    console.log('✓ Connection successful!');
    console.log(`  Current time: ${result.rows[0].current_time}`);
    console.log(`  PostgreSQL version: ${result.rows[0].version.split(',')[0]}\n`);
    
    // Check if session table exists
    console.log('Checking session table...');
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'session'
      ) as exists;
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✓ Session table exists');
      
      // Get session table info
      const sessionCount = await pool.query('SELECT COUNT(*) as count FROM session');
      console.log(`  Sessions in table: ${sessionCount.rows[0].count}\n`);
    } else {
      console.log('⚠ Session table does not exist');
      console.log('  Creating session table...');
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "session" (
          "sid" varchar NOT NULL COLLATE "default",
          "sess" json NOT NULL,
          "expire" timestamp(6) NOT NULL,
          CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
        )
      `);
      
      console.log('✓ Session table created\n');
    }
    
    // Check other tables
    console.log('Checking application tables...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('✓ Found tables:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    console.log('\n✅ All database checks passed!');
    console.log('\nYour database is ready for the application.');
    
  } catch (error) {
    console.error('\n❌ Database connection failed!');
    console.error('\nError details:');
    console.error(error);
    
    console.log('\n🔧 Troubleshooting tips:');
    console.log('  1. Verify your DATABASE_URL is correct');
    console.log('  2. Check if your database allows connections from your IP');
    console.log('  3. Ensure SSL mode is configured correctly (add ?sslmode=require if needed)');
    console.log('  4. For Supabase: use the "Connection pooling" URL from project settings');
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();

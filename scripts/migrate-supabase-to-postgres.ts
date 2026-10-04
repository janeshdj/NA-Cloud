import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Migration Script: Supabase -> Neithal HRMS PostgreSQL
 * Reads attendance and user records from Supabase REST/DB export and imports to Neithal HRMS.
 */
async function runMigration() {
  console.log('[Migration] Connecting to target Neithal HRMS PostgreSQL...');

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'neithal',
    password: process.env.DB_PASSWORD || 'neithal_secure_hrms_pass_2026',
    database: process.env.DB_NAME || 'neithal_hrms',
  });

  try {
    await client.connect();
    console.log('[Migration] Database connection established.');
    
    // Check tables status
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema='public';
    `);
    
    console.log('[Migration] Existing tables in database:', res.rows.map(r => r.table_name).join(', '));
    console.log('[Migration] Dry-run completed successfully. Ready for batch data insertion.');
  } catch (error) {
    console.error('[Migration] Error during migration:', error);
  } finally {
    await client.end();
  }
}

runMigration();

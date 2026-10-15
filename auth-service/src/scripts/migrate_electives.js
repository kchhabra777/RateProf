import pg from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5cqpzoHbZ7IM@ep-quiet-pond-aycfuiga-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';
const pool = new pg.Pool({ connectionString });

async function migrate() {
  try {
    console.log('Connecting to Neon DB...');
    await pool.query('ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "selectedElectives" TEXT[] DEFAULT ARRAY[]::TEXT[];');
    console.log('✓ Added selectedElectives to StudentProfile');
    
    await pool.query('ALTER TABLE "CourseOffering" ADD COLUMN IF NOT EXISTS "isElective" BOOLEAN DEFAULT FALSE;');
    console.log('✓ Added isElective to CourseOffering');

    const res = await pool.query('SELECT column_name FROM information_schema.columns WHERE table_name = \'StudentProfile\';');
    console.log('Updated StudentProfile columns:', res.rows.map(r => r.column_name));
  } catch (e) {
    console.error('Migration error:', e.message);
  } finally {
    await pool.end();
  }
}

migrate();

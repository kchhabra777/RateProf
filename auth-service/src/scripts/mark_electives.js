import pg from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5cqpzoHbZ7IM@ep-quiet-pond-aycfuiga-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';
const pool = new pg.Pool({ connectionString });

const EXACT_24_ELECTIVE_CODES = [
  // Discipline Electives [EL-1] (12)
  'UCS531', 'UCS542', 'UCS548', 'UMC513', 'UCS551', 'UCS532',
  'UCS539', 'UCS668', 'UCS537', 'UCS534', 'UCS550', 'UEC646',
  // Free Electives (12)
  'UMA069', 'UHU018', 'UMA070', 'UTD004', 'UHU017', 'UCS002',
  'UPH064', 'UEN006', 'UHU051', 'UHU053', 'UBT510', 'UHU016'
];

async function run() {
  try {
    console.log('Synchronizing exact 24 electives...');
    const placeholders = EXACT_24_ELECTIVE_CODES.map((_, i) => `$${i + 1}`).join(',');

    // Reset any other
    await pool.query(
      `UPDATE "CourseOffering" SET "isElective" = FALSE WHERE "courseCode" NOT IN (${placeholders})`,
      EXACT_24_ELECTIVE_CODES
    );

    // Set the 24
    await pool.query(
      `UPDATE "CourseOffering" SET "isElective" = TRUE WHERE "courseCode" IN (${placeholders})`,
      EXACT_24_ELECTIVE_CODES
    );

    console.log('✓ Successfully synchronized exact 24 electives!');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}

run();

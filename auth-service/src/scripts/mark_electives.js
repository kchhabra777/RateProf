import pg from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5cqpzoHbZ7IM@ep-quiet-pond-aycfuiga-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';
const pool = new pg.Pool({ connectionString });

const KNOWN_ELECTIVE_CODES = [
  'UCS420', 'UCS421', 'UCS531', 'UCS532', 'UCS534', 'UCS537', 'UCS539',
  'UCS542', 'UCS548', 'UCS550', 'UCS551', 'UCS553', 'UCS615', 'UCS668',
  'UCS742', 'UCS743', 'UCS745', 'UCS748', 'UCS750', 'UCS751', 'UCS752',
  'UCS754', 'UCS758', 'UCS760', 'UCS762', 'UCS772', 'UMC513', 'UMC743',
  'UHU005', 'UHU006', 'UHU007', 'UHU016', 'UHU018', 'UHU047', 'UHU048', 'UHU049',
  'UEC630', 'UEC634', 'UEC640', 'UEC642', 'UEC716', 'UEC719', 'UEC720', 'UEC750', 'UEC752', 'UEC823', 'UEC867',
  'UVD701', 'UVD714', 'UEI712', 'UEI733', 'UEI735', 'UEI744', 'UEI831',
  'UME741', 'UME742', 'UME743', 'UME744', 'UME751', 'UME752', 'UME754', 'UME801',
  'UEE743', 'UEE744', 'UEE801', 'UCT701', 'UCT703', 'UCT721', 'UCT723', 'UCT732'
];

async function run() {
  try {
    console.log('Connecting to Neon DB to tag electives...');
    
    // Tag matching codes as electives
    const placeholders = KNOWN_ELECTIVE_CODES.map((_, i) => `$${i + 1}`).join(',');
    const updateRes = await pool.query(
      `UPDATE "CourseOffering" 
       SET "isElective" = TRUE 
       WHERE "courseCode" IN (${placeholders}) 
          OR "batchTaught" ILIKE '%ELECTIVE%' 
          OR "courseName" ILIKE '%ELECTIVE%'`,
      KNOWN_ELECTIVE_CODES
    );
    console.log(`✓ Marked ${updateRes.rowCount} course offerings as electives!`);

    // Verify distinct elective courses in DB
    const res = await pool.query(
      `SELECT DISTINCT "courseCode", "courseName" 
       FROM "CourseOffering" 
       WHERE "isElective" = TRUE 
       ORDER BY "courseCode"`
    );
    console.log(`\nTotal distinct elective courses in database: ${res.rows.length}`);
    res.rows.forEach(r => console.log(`  - ${r.courseCode}: ${r.courseName}`));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}

run();

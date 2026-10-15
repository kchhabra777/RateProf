import pg from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5cqpzoHbZ7IM@ep-quiet-pond-aycfuiga-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';
const pool = new pg.Pool({ connectionString });

async function run() {
  try {
    const unassigned = await pool.query(
      `SELECT tp.id, tp."fullName", tp.department, tp.designation
       FROM "TeacherProfile" tp
       LEFT JOIN "CourseOffering" co ON tp.id = co."teacherId"
       WHERE co.id IS NULL`
    );
    console.log(`Teachers with 0 course offerings: ${unassigned.rows.length}`);
    console.table(unassigned.rows.slice(0, 20));

    // Also check teachers with few offerings
    const few = await pool.query(
      `SELECT tp.id, tp."fullName", tp.department, count(co.id) as offerings_count
       FROM "TeacherProfile" tp
       LEFT JOIN "CourseOffering" co ON tp.id = co."teacherId"
       GROUP BY tp.id, tp."fullName", tp.department
       ORDER BY offerings_count ASC
       LIMIT 30`
    );
    console.log(`Teachers with lowest offerings:`);
    console.table(few.rows);

  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

run();

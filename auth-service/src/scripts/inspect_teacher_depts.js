import pg from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5cqpzoHbZ7IM@ep-quiet-pond-aycfuiga-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';
const pool = new pg.Pool({ connectionString });

async function run() {
  try {
    const res = await pool.query(
      `SELECT department, count(*) as count 
       FROM "TeacherProfile" 
       GROUP BY department 
       ORDER BY count DESC`
    );
    console.table(res.rows);

    const depts = ['HUMANITIES', 'MATHEMATICS', 'PHYSICS', 'MANAGEMENT', 'COMPUTER'];
    for (const d of depts) {
      const teachers = await pool.query(
        `SELECT id, "fullName", department, designation 
         FROM "TeacherProfile" 
         WHERE department ILIKE $1 
         LIMIT 10`,
        [`%${d}%`]
      );
      console.log(`\nTeachers in ${d}:`);
      console.table(teachers.rows);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

run();

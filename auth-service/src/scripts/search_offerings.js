import pg from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5cqpzoHbZ7IM@ep-quiet-pond-aycfuiga-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';
const pool = new pg.Pool({ connectionString });

const keywords = [
  'GRAPH', 'CORPORATE', 'UX', 'NUMERICAL', 'DATA SCIENCE', 'LINEAR', 
  'COGNITIVE', 'VISION', 'CYBER', 'FINANCE', 'NANO', 'EDGE', 
  'SUSTAINABLE', 'CREATIVE', 'SOURCE', 'NETWORK', 'GENDER', 
  'BIOLOGY', 'FRENCH', 'VEHICLES', 'CLOUD'
];

async function run() {
  try {
    for (const kw of keywords) {
      const res = await pool.query(
        `SELECT DISTINCT "courseCode", "courseName", "isElective" 
         FROM "CourseOffering" 
         WHERE "courseName" ILIKE $1 OR "courseCode" ILIKE $1`,
        [`%${kw}%`]
      );
      if (res.rows.length > 0) {
        console.log(`\n=== Keyword: ${kw} ===`);
        console.table(res.rows);
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

run();

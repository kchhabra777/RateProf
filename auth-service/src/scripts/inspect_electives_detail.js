import pg from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5cqpzoHbZ7IM@ep-quiet-pond-aycfuiga-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';
const pool = new pg.Pool({ connectionString });

async function check() {
  try {
    const res = await pool.query(
      `SELECT co.id, co."courseCode", co."courseName", co."batchTaught", co."isElective", tp."fullName" as teacher
       FROM "CourseOffering" co
       JOIN "TeacherProfile" tp ON co."teacherId" = tp.id
       WHERE co."courseName" ~* '\\([A-Z0-9]+\\)' OR co."isElective" = true OR co."courseCode" IN ('UMA069', 'UTD004', 'UCS559', 'UCS539')
       ORDER BY co."courseCode"`
    );
    console.log(`Found ${res.rows.length} relevant offerings:`);
    console.table(res.rows.slice(0, 50));
    if (res.rows.length > 50) {
      console.table(res.rows.slice(50, 100));
    }
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

check();

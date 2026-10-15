import pg from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5cqpzoHbZ7IM@ep-quiet-pond-aycfuiga-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';
const pool = new pg.Pool({ connectionString });

async function run() {
  try {
    const list = [
      'UCS531', 'UMA069', 'UHU018', 'UCS542', 'UMA070', 'UCS548',
      'UTD004', 'UMC513', 'UCS551', 'UHU017', 'UCS532', 'UCS002',
      'UCS539', 'UPH064', 'UCS668', 'UEN006', 'UHU051', 'UCS537',
      'UCS534', 'UHU053', 'UBT510', 'UCS550', 'UHU016', 'UEC646',
      'UCS559'
    ];

    const res = await pool.query(
      `SELECT co.id, co."courseCode", co."courseName", co."batchTaught", co."isElective", tp."fullName" as teacher
       FROM "CourseOffering" co
       JOIN "TeacherProfile" tp ON co."teacherId" = tp.id
       WHERE co."courseCode" = ANY($1)
       ORDER BY co."courseCode"`,
      [list]
    );

    console.log(`Matched offerings count: ${res.rows.length}`);
    console.table(res.rows);

  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

run();

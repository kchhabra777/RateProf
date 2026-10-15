import pg from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5cqpzoHbZ7IM@ep-quiet-pond-aycfuiga-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';
const pool = new pg.Pool({ connectionString });

async function run() {
  try {
    const res = await pool.query(
      `SELECT DISTINCT tp.id, tp."fullName", tp.department, tp.designation 
       FROM "TeacherProfile" tp
       ORDER BY tp."fullName"`
    );
    console.log(`Total teachers in DB: ${res.rows.length}`);
    
    // Find teachers with departments
    const deptCounts = {};
    res.rows.forEach(t => {
      deptCounts[t.department] = (deptCounts[t.department] || 0) + 1;
    });
    console.log('Department breakdown:', deptCounts);

    // Check offerings count
    const offCount = await pool.query(`SELECT count(*) FROM "CourseOffering"`);
    console.log('Total course offerings:', offCount.rows[0].count);

    const electiveOffCount = await pool.query(`SELECT count(*) FROM "CourseOffering" WHERE "isElective" = true`);
    console.log('Elective course offerings:', electiveOffCount.rows[0].count);

    // List all distinct course codes in DB
    const distCourses = await pool.query(`SELECT DISTINCT "courseCode", "courseName", "isElective" FROM "CourseOffering" ORDER BY "courseCode"`);
    console.log(`Total distinct courses: ${distCourses.rows.length}`);
    console.table(distCourses.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

run();

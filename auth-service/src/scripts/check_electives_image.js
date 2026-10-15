import pg from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5cqpzoHbZ7IM@ep-quiet-pond-aycfuiga-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';
const pool = new pg.Pool({ connectionString });

const imageElectives = [
  { code: 'UCS531', name: 'CLOUD COMPUTING', type: 'Elective [EL-1]' },
  { code: 'UMA069', name: 'GRAPH THEORY AND APPLICATIONS', type: 'Free Elective' },
  { code: 'UHU018', name: 'INTRODUCTION TO CORPORATE FINANCE', type: 'Free Elective' },
  { code: 'UCS542', name: 'UI & UX SPECIALIST', type: 'Elective [EL-1]' },
  { code: 'UMA070', name: 'ADVANCED NUMERICAL METHODS', type: 'Free Elective' },
  { code: 'UCS548', name: 'FOUNDATIONS OF DATA SCIENCE', type: 'Elective [EL-1]' },
  { code: 'UTD004', name: 'CAMPUS 2 CORPORATE', type: 'Free Elective' },
  { code: 'UMC513', name: 'LINEAR ALGEBRA FOR ARTIFICIAL INTELLIGENCE AND ML', type: 'Elective [EL-1]' },
  { code: 'UCS551', name: 'CONVERSATIONAL AI: ACCELERATED DATA SCIENCE', type: 'Elective [EL-1]' },
  { code: 'UHU017', name: 'INTRODUCTION TO COGNITIVE SCIENCE', type: 'Free Elective' },
  { code: 'UCS532', name: 'COMPUTER VISION', type: 'Elective [EL-1]' },
  { code: 'UCS002', name: 'INTRODUCTION TO CYBER SECURITY', type: 'Free Elective' },
  { code: 'UCS539', name: 'FINANCE ACCOUNTING AND VALUATION', type: 'Elective [EL-1]' },
  { code: 'UPH064', name: 'NANO SCIENCE AND NANO-MATERIALS', type: 'Free Elective' },
  { code: 'UCS668', name: 'EDGE AI AND ROBOTICS: DATA CENTRE VISION', type: 'Elective [EL-1]' },
  { code: 'UEN006', name: 'TECHNOLOGIES FOR SUSTAINABLE DEVELOPMENT', type: 'Free Elective' },
  { code: 'UHU051', name: 'CREATIVE WRITING', type: 'Free Elective' },
  { code: 'UCS537', name: 'SOURCE CODE MANAGEMENT', type: 'Elective [EL-1]' },
  { code: 'UCS534', name: 'COMPUTER & NETWORK SECURITY', type: 'Elective [EL-1]' },
  { code: 'UHU053', name: 'GENDER, IDENTITY AND TECHNOLOGY', type: 'Free Elective' },
  { code: 'UBT510', name: 'BIOLOGY FOR ENGINEERS', type: 'Free Elective' },
  { code: 'UCS550', name: 'NETWORK DEFENCE', type: 'Elective [EL-1]' },
  { code: 'UHU016', name: 'INTRODUCTORY COURSE IN FRENCH', type: 'Free Elective' },
  { code: 'UEC646', name: 'NETWORK& COMMUNICATION FOR CONNECTED VEHICLES', type: 'Elective [EL-1]' }
];

async function check() {
  try {
    const codes = imageElectives.map(e => e.code);
    const res = await pool.query(
      `SELECT DISTINCT "courseCode", "courseName", "isElective", COUNT(*) as count 
       FROM "CourseOffering" 
       WHERE "courseCode" = ANY($1)
       GROUP BY "courseCode", "courseName", "isElective"
       ORDER BY "courseCode"`,
      [codes]
    );

    console.log('--- FOUND IN DB ---');
    console.table(res.rows);

    const foundCodes = new Set(res.rows.map(r => r.courseCode));
    const missing = imageElectives.filter(e => !foundCodes.has(e.code));
    console.log('\n--- MISSING FROM DB ---');
    console.table(missing);

    // Also check teacher assignments for the found ones
    const teachersRes = await pool.query(
      `SELECT co."courseCode", co."courseName", tp."fullName" as teacher, co."batchTaught", co."isElective"
       FROM "CourseOffering" co
       JOIN "TeacherProfile" tp ON co."teacherId" = tp.id
       WHERE co."courseCode" = ANY($1)
       ORDER BY co."courseCode"`,
      [codes]
    );
    console.log(`\n--- TEACHER OFFERINGS FOR THESE ELECTIVES (${teachersRes.rows.length} offerings) ---`);
    console.table(teachersRes.rows);

  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

check();

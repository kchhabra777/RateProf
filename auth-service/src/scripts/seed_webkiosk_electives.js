import pg from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5cqpzoHbZ7IM@ep-quiet-pond-aycfuiga-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';
const pool = new pg.Pool({ connectionString });

const OFFICIAL_ELECTIVES = [
  // Discipline Electives (Elective [EL-1])
  { code: 'UCS531', name: 'CLOUD COMPUTING', type: 'EL-1', preferredDept: 'CSED' },
  { code: 'UCS542', name: 'UI & UX SPECIALIST', type: 'EL-1', preferredDept: 'CSED' },
  { code: 'UCS548', name: 'FOUNDATIONS OF DATA SCIENCE', type: 'EL-1', preferredDept: 'CSED' },
  { code: 'UMC513', name: 'LINEAR ALGEBRA FOR ARTIFICIAL INTELLIGENCE AND ML', type: 'EL-1', preferredDept: 'School of Mathematics' },
  { code: 'UCS551', name: 'CONVERSATIONAL AI: ACCELERATED DATA SCIENCE', type: 'EL-1', preferredDept: 'CSED' },
  { code: 'UCS532', name: 'COMPUTER VISION', type: 'EL-1', preferredDept: 'CSED' },
  { code: 'UCS539', name: 'FINANCE ACCOUNTING AND VALUATION', type: 'EL-1', preferredDept: 'CSED' },
  { code: 'UCS668', name: 'EDGE AI AND ROBOTICS: DATA CENTRE VISION', type: 'EL-1', preferredDept: 'Robotics & AI' },
  { code: 'UCS537', name: 'SOURCE CODE MANAGEMENT', type: 'EL-1', preferredDept: 'CSED' },
  { code: 'UCS534', name: 'COMPUTER & NETWORK SECURITY', type: 'EL-1', preferredDept: 'CSED' },
  { code: 'UCS550', name: 'NETWORK DEFENCE', type: 'EL-1', preferredDept: 'CSED' },
  { code: 'UEC646', name: 'NETWORK& COMMUNICATION FOR CONNECTED VEHICLES', type: 'EL-1', preferredDept: 'Electronics & Communication Engg' },

  // Free Electives
  { code: 'UMA069', name: 'GRAPH THEORY AND APPLICATIONS', type: 'FREE', preferredDept: 'School of Mathematics' },
  { code: 'UHU018', name: 'INTRODUCTION TO CORPORATE FINANCE', type: 'FREE', preferredDept: 'CSED' },
  { code: 'UMA070', name: 'ADVANCED NUMERICAL METHODS', type: 'FREE', preferredDept: 'School of Mathematics' },
  { code: 'UTD004', name: 'CAMPUS 2 CORPORATE', type: 'FREE', preferredDept: 'Center for Training & Development' },
  { code: 'UHU017', name: 'INTRODUCTION TO COGNITIVE SCIENCE', type: 'FREE', preferredDept: 'CSED' },
  { code: 'UCS002', name: 'INTRODUCTION TO CYBER SECURITY', type: 'FREE', preferredDept: 'CSED' },
  { code: 'UPH064', name: 'NANO SCIENCE AND NANO-MATERIALS', type: 'FREE', preferredDept: 'School of Physics & Materials Science' },
  { code: 'UEN006', name: 'TECHNOLOGIES FOR SUSTAINABLE DEVELOPMENT', type: 'FREE', preferredDept: 'CSED' },
  { code: 'UHU051', name: 'CREATIVE WRITING', type: 'FREE', preferredDept: 'CSED' },
  { code: 'UHU053', name: 'GENDER, IDENTITY AND TECHNOLOGY', type: 'FREE', preferredDept: 'CSED' },
  { code: 'UBT510', name: 'BIOLOGY FOR ENGINEERS', type: 'FREE', preferredDept: 'CSED' },
  { code: 'UHU016', name: 'INTRODUCTORY COURSE IN FRENCH', type: 'FREE', preferredDept: 'CSED' }
];

async function run() {
  try {
    console.log('--- Step 1: Normalizing existing offerings ---');

    // 1. Mark existing UMA069, UTD004, UCS559, UCS539 as electives
    await pool.query(
      `UPDATE "CourseOffering" 
       SET "isElective" = TRUE 
       WHERE "courseCode" IN ('UMA069', 'UTD004', 'UCS559', 'UCS539')`
    );

    // 2. Clean up names for existing ones
    await pool.query(
      `UPDATE "CourseOffering" 
       SET "courseName" = 'CLOUD COMPUTING' 
       WHERE "courseCode" = 'UCS531' AND "courseName" ILIKE '%CLOUD COMPUTING%'`
    );
    await pool.query(
      `UPDATE "CourseOffering" 
       SET "courseName" = 'FINANCE ACCOUNTING AND VALUATION', "courseCode" = 'UCS539' 
       WHERE "courseCode" = 'UCS559'`
    );
    await pool.query(
      `UPDATE "CourseOffering" 
       SET "courseName" = 'CAMPUS 2 CORPORATE' 
       WHERE "courseCode" = 'UTD004'`
    );
    await pool.query(
      `UPDATE "CourseOffering" 
       SET "courseName" = 'GRAPH THEORY AND APPLICATIONS' 
       WHERE "courseCode" = 'UMA069'`
    );

    console.log('--- Step 2: Checking missing electives and seeding offerings ---');
    
    // Fetch all teachers
    const teachersRes = await pool.query(
      `SELECT id, "fullName", department FROM "TeacherProfile" ORDER BY id`
    );
    const teachers = teachersRes.rows;

    let seededCount = 0;

    for (const elective of OFFICIAL_ELECTIVES) {
      // Check if offering already exists
      const existing = await pool.query(
        `SELECT id FROM "CourseOffering" WHERE "courseCode" = $1 LIMIT 1`,
        [elective.code]
      );

      if (existing.rows.length === 0) {
        // Find best teacher candidate (matching dept or fallback)
        let candidate = teachers.find(t => t.department === elective.preferredDept)
          || teachers.find(t => t.department.includes('CSED') || t.department.includes('Computer'))
          || teachers[0];

        // Pick specific well-known faculty if available
        if (elective.code === 'UCS550') { // Network Defence
          const jhb = teachers.find(t => t.fullName.includes('Jhilik'));
          if (jhb) candidate = jhb;
        } else if (elective.code === 'UCS532') { // Computer Vision
          const cvTeacher = teachers.find(t => t.fullName.includes('Mansi Sharma') || t.fullName.includes('Raikwar'));
          if (cvTeacher) candidate = cvTeacher;
        } else if (elective.code === 'UCS534' || elective.code === 'UCS002') { // Computer & Network Security / Cyber Security
          const secTeacher = teachers.find(t => t.fullName.includes('Sharad') || t.fullName.includes('Neeraj Kumar'));
          if (secTeacher) candidate = secTeacher;
        } else if (elective.code === 'UCS542') { // UI & UX
          const uiTeacher = teachers.find(t => t.fullName.includes('Vaishali') || t.fullName.includes('Nidhi Kalra'));
          if (uiTeacher) candidate = uiTeacher;
        } else if (elective.code === 'UMA070') { // Numerical Methods
          const mathTeacher = teachers.find(t => t.fullName.includes('Paramjeet') || t.department.includes('Mathematics'));
          if (mathTeacher) candidate = mathTeacher;
        } else if (elective.code === 'UPH064') { // Nano Science
          const phyTeacher = teachers.find(t => t.department.includes('Physics'));
          if (phyTeacher) candidate = phyTeacher;
        } else if (elective.code.startsWith('UHU')) { // Humanities
          const shss = teachers.find(t => t.fullName.includes('Humanities') || t.department.includes('Humanities'));
          if (shss) candidate = shss;
        } else if (elective.code.startsWith('UBT')) { // Biotechnology
          const bt = teachers.find(t => t.fullName.includes('Biotechnology') || t.department.includes('Biotechnology'));
          if (bt) candidate = bt;
        } else if (elective.code.startsWith('UEN')) { // Environment / Civil
          const cie = teachers.find(t => t.fullName.includes('Civil') || t.department.includes('Civil'));
          if (cie) candidate = cie;
        }

        await pool.query(
          `INSERT INTO "CourseOffering" 
           ("id", "teacherId", "courseCode", "courseName", "batchTaught", "branchTaught", "academicYear", "isElective", "ltp", "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), $1, $2, $3, 'ELECTIVE', 'ALL', '2026-2027 ODD', TRUE, 'L', NOW(), NOW())`,
          [candidate.id, elective.code, elective.name]
        );
        seededCount++;
        console.log(`+ Seeded offering for ${elective.code} (${elective.name}) -> ${candidate.fullName} (${candidate.department})`);
      } else {
        // Ensure isElective is true
        await pool.query(
          `UPDATE "CourseOffering" SET "isElective" = TRUE WHERE "courseCode" = $1`,
          [elective.code]
        );
      }
    }

    console.log(`\nSuccessfully verified and seeded ${seededCount} new elective offerings!`);

    // Verify all 24 electives
    const allCodes = OFFICIAL_ELECTIVES.map(e => e.code);
    const verifyRes = await pool.query(
      `SELECT DISTINCT co."courseCode", co."courseName", co."isElective", count(co.id) as offerings
       FROM "CourseOffering" co
       WHERE co."courseCode" = ANY($1)
       GROUP BY co."courseCode", co."courseName", co."isElective"
       ORDER BY co."courseCode"`,
      [allCodes]
    );

    console.log(`\n--- Verification (${verifyRes.rows.length} / 24 electives active) ---`);
    console.table(verifyRes.rows);

  } catch (e) {
    console.error('Error during seeding:', e);
  } finally {
    await pool.end();
  }
}

run();

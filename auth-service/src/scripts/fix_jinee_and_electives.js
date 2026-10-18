import pg from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5cqpzoHbZ7IM@ep-quiet-pond-aycfuiga-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';
const pool = new pg.Pool({ connectionString });

async function fix() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get Dr. Jhilik Bhattacharya and Dr. Sharad Saxena
    const jhilikRes = await client.query(`SELECT id FROM "TeacherProfile" WHERE "fullName" ILIKE '%Jhilik%' LIMIT 1`);
    const jhilikId = jhilikRes.rows[0]?.id;

    const sharadRes = await client.query(`SELECT id FROM "TeacherProfile" WHERE "fullName" ILIKE '%Sharad Saxena%' LIMIT 1`);
    const sharadId = sharadRes.rows[0]?.id;

    if (!jhilikId) throw new Error("Jhilik Bhattacharya not found");

    // 2. Helper to get or create placeholder faculty user + profile
    const getOrCreatePlaceholderTeacher = async (email, fullName, department) => {
      let userRes = await client.query(`SELECT id FROM "User" WHERE email = $1`, [email]);
      let userId;
      if (userRes.rows.length === 0) {
        const hashedPassword = await bcrypt.hash('Thapar@2026', 10);
        const newUser = await client.query(
          `INSERT INTO "User" (id, email, "passwordHash", role, "isProfileComplete", "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), $1, $2, 'TEACHER', true, NOW(), NOW())
           RETURNING id`,
          [email, hashedPassword]
        );
        userId = newUser.rows[0].id;
      } else {
        userId = userRes.rows[0].id;
      }

      let profRes = await client.query(`SELECT id FROM "TeacherProfile" WHERE "userId" = $1`, [userId]);
      let teacherId;
      if (profRes.rows.length === 0) {
        const newProf = await client.query(
          `INSERT INTO "TeacherProfile" (id, "userId", "fullName", department, designation, "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), $1, $2, $3, 'Faculty', NOW(), NOW())
           RETURNING id`,
          [userId, fullName, department]
        );
        teacherId = newProf.rows[0].id;
      } else {
        teacherId = profRes.rows[0].id;
      }

      return teacherId;
    };

    const shssTeacherId = await getOrCreatePlaceholderTeacher(
      'faculty.shss@thapar.edu',
      'Faculty (Humanities & Social Sciences)',
      'School of Humanities & Social Sciences'
    );

    const btTeacherId = await getOrCreatePlaceholderTeacher(
      'faculty.bt@thapar.edu',
      'Faculty (Biotechnology)',
      'Department of Biotechnology'
    );

    const cieTeacherId = await getOrCreatePlaceholderTeacher(
      'faculty.cie@thapar.edu',
      'Faculty (Civil & Environment)',
      'Civil Engineering'
    );

    // 3. Reassign UCS550 to Dr. Jhilik Bhattacharya
    await client.query(
      `UPDATE "CourseOffering" SET "teacherId" = $1 WHERE "courseCode" = 'UCS550'`,
      [jhilikId]
    );
    console.log('+ Reassigned UCS550 to Dr. Jhilik Bhattacharya');

    // 4. Reassign UCS002 to Dr. Sharad Saxena (or CSED)
    if (sharadId) {
      await client.query(
        `UPDATE "CourseOffering" SET "teacherId" = $1 WHERE "courseCode" = 'UCS002'`,
        [sharadId]
      );
      console.log('+ Reassigned UCS002 to Dr. Sharad Saxena');
    }

    // 5. Reassign UHU electives to Faculty (Humanities & Social Sciences)
    const uhuCodes = ['UHU016', 'UHU017', 'UHU018', 'UHU051', 'UHU053'];
    await client.query(
      `UPDATE "CourseOffering" SET "teacherId" = $1 WHERE "courseCode" = ANY($2)`,
      [shssTeacherId, uhuCodes]
    );
    console.log('+ Reassigned UHU electives to Faculty (Humanities & Social Sciences)');

    // 6. Reassign UBT510 to Faculty (Biotechnology)
    await client.query(
      `UPDATE "CourseOffering" SET "teacherId" = $1 WHERE "courseCode" = 'UBT510'`,
      [btTeacherId]
    );
    console.log('+ Reassigned UBT510 to Faculty (Biotechnology)');

    // 7. Reassign UEN006 to Faculty (Civil & Environment)
    await client.query(
      `UPDATE "CourseOffering" SET "teacherId" = $1 WHERE "courseCode" = 'UEN006'`,
      [cieTeacherId]
    );
    console.log('+ Reassigned UEN006 to Faculty (Civil & Environment)');

    await client.query('COMMIT');
    console.log('\n--- SUCCESS: Database updated cleanly ---');

    // Verify Dr. Jinee Goyal
    const jineeVerify = await client.query(`
      SELECT co."courseCode", co."courseName"
      FROM "CourseOffering" co
      JOIN "TeacherProfile" tp ON co."teacherId" = tp.id
      WHERE tp."fullName" ILIKE '%Jinee%'
    `);
    console.log(`Dr. Jinee Goyal remaining courses: ${jineeVerify.rows.length}`);
    console.table(jineeVerify.rows);

    // Verify Dr. Jhilik Bhattacharya
    const jhilikVerify = await client.query(`
      SELECT co."courseCode", co."courseName"
      FROM "CourseOffering" co
      JOIN "TeacherProfile" tp ON co."teacherId" = tp.id
      WHERE tp."fullName" ILIKE '%Jhilik%'
    `);
    console.log(`Dr. Jhilik Bhattacharya courses: ${jhilikVerify.rows.length}`);
    console.table(jhilikVerify.rows);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error fixing electives:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

fix();

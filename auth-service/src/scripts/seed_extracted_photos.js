import fs from 'fs';
import prisma from '../lib/prisma.js';

const offeringsData = JSON.parse(
  fs.readFileSync(
    'C:/Users/krish/.gemini/antigravity/brain/ef305570-f877-4523-a2e5-5e465740eed2/scratch/clean_offerings.json',
    'utf-8'
  )
);

function stripTitle(name) {
  return name.replace(/^(Dr\.|Prof\.|Mr\.|Ms\.)\s+/i, '').trim();
}

function makeEmail(name) {
  const clean = stripTitle(name).toLowerCase().replace(/[^a-z\s]/g, '').trim().replace(/\s+/g, '.');
  return `${clean || 'faculty'}@thapar.edu`;
}

async function main() {
  console.log(`Starting ingestion of ${offeringsData.length} course offerings...\n`);

  let teachersMatched = 0;
  let teachersCreated = 0;
  let offeringsCreated = 0;
  let offeringsExisted = 0;

  // Cache teacher profiles
  const allTeachers = await prisma.teacherProfile.findMany({
    include: { user: true }
  });

  const teacherMap = new Map(); // normalized name -> teacherProfile

  for (const t of allTeachers) {
    const rawClean = stripTitle(t.fullName).toLowerCase();
    teacherMap.set(rawClean, t);
  }

  for (const off of offeringsData) {
    const rawClean = stripTitle(off.facultyName).toLowerCase();
    
    // Find teacher
    let teacher = null;

    // Direct match
    if (teacherMap.has(rawClean)) {
      teacher = teacherMap.get(rawClean);
    } else {
      // Partial / inclusion match
      for (const [k, prof] of teacherMap.entries()) {
        if (k.length > 3 && rawClean.length > 3 && (k.includes(rawClean) || rawClean.includes(k))) {
          teacher = prof;
          break;
        }
      }
    }

    // Create teacher if not found
    if (!teacher) {
      let baseEmail = makeEmail(off.facultyName);
      let email = baseEmail;
      let counter = 1;

      // Ensure email uniqueness
      while (await prisma.user.findUnique({ where: { email } })) {
        email = baseEmail.replace('@thapar.edu', `${counter}@thapar.edu`);
        counter++;
      }

      console.log(`Creating new teacher: "${off.facultyName}" (${email}) in ${off.department}`);
      const user = await prisma.user.create({
        data: {
          email: email,
          passwordHash: "PENDING",
          role: "TEACHER",
          isEmailVerified: true,
          isProfileComplete: true,
          teacherProfile: {
            create: {
              fullName: off.facultyName,
              department: off.department || "Computer Science & Engineering",
              designation: "Faculty"
            }
          }
        },
        include: { teacherProfile: true }
      });

      teacher = user.teacherProfile;
      teacherMap.set(rawClean, teacher);
      teachersCreated++;
    } else {
      teachersMatched++;
    }

    // Check if CourseOffering already exists
    const existingOffering = await prisma.courseOffering.findFirst({
      where: {
        teacherId: teacher.id,
        courseCode: off.courseCode,
        batchTaught: off.batchTaught,
        ltp: off.ltp
      }
    });

    if (!existingOffering) {
      await prisma.courseOffering.create({
        data: {
          teacherId: teacher.id,
          courseCode: off.courseCode,
          courseName: off.courseName,
          batchTaught: off.batchTaught,
          branchTaught: off.branchTaught || "COE",
          academicYear: off.academicYear || "2026-27-ODD",
          ltp: off.ltp
        }
      });
      offeringsCreated++;
    } else {
      offeringsExisted++;
    }
  }

  console.log("\n=================== INGESTION SUMMARY ===================");
  console.log(`Teachers Created   : ${teachersCreated}`);
  console.log(`Teachers Reused    : ${teacherMap.size - teachersCreated}`);
  console.log(`Offerings Created  : ${offeringsCreated}`);
  console.log(`Offerings Existed  : ${offeringsExisted}`);
  console.log(`Total Offerings In : ${offeringsData.length}`);
  console.log("=========================================================");

  const totalTeachersAfter = await prisma.teacherProfile.count();
  const totalOfferingsAfter = await prisma.courseOffering.count();
  const distinctBatches = await prisma.courseOffering.findMany({
    select: { batchTaught: true },
    distinct: ['batchTaught']
  });

  console.log(`\nDatabase Totals Now:`);
  console.log(`Total Teachers in DB : ${totalTeachersAfter}`);
  console.log(`Total Offerings in DB: ${totalOfferingsAfter}`);
  console.log(`Distinct Batches in DB: ${distinctBatches.length} (${distinctBatches.map(b => b.batchTaught).join(', ')})`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

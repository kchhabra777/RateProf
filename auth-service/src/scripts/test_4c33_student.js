import { getEligibleTeachersForStudent, invalidateOfferingsCache } from '../services/courseService.js';
import prisma from '../lib/prisma.js';

async function main() {
  invalidateOfferingsCache();

  console.log('--- Testing Eligible Teachers for Roll No 102303655 (Batch 4C33, Elective UCS772) ---');
  const teachers = await getEligibleTeachersForStudent({
    batch: '4C33',
    branch: 'COE',
    electives: ['UCS772']
  });

  console.log(`Total Teachers returned: ${teachers.length}`);
  let totalCourses = 0;
  for (const t of teachers) {
    console.log(`• ${t.fullName} (${t.department}):`);
    for (const c of t.courses) {
      totalCourses++;
      console.log(`    - ${c.courseCode} [${c.ltp}] "${c.courseName}" (Elective: ${c.isElective}) [Batch: ${c.batchTaught}]`);
    }
  }
  console.log(`Total course entries: ${totalCourses}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

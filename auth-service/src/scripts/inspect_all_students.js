import prisma from '../lib/prisma.js';

async function main() {
  const students = await prisma.studentProfile.findMany({
    include: { user: true }
  });
  console.log('Total students:', students.length);
  for (const s of students) {
    console.log(`${s.rollNumber} | ${s.fullName} | ${s.batch} | ${s.branch} | ${s.user?.email} | Electives: ${s.selectedElectives}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

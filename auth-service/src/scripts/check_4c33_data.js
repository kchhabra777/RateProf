import prisma from '../lib/prisma.js';

async function main() {
  const rakesh = await prisma.teacherProfile.findMany({
    where: { fullName: { contains: 'Rakesh', mode: 'insensitive' } },
    include: { user: true }
  });
  console.log('Rakesh teachers:', rakesh.map(t => ({ id: t.id, name: t.fullName, email: t.user?.email, dept: t.department })));

  const sukh = await prisma.teacherProfile.findMany({
    where: { fullName: { contains: 'Sukh', mode: 'insensitive' } },
    include: { user: true }
  });
  console.log('Sukh teachers:', sukh.map(t => ({ id: t.id, name: t.fullName, email: t.user?.email, dept: t.department })));

  const humanities = await prisma.teacherProfile.findMany({
    where: { department: { contains: 'Humanities', mode: 'insensitive' } },
    include: { user: true }
  });
  console.log('Humanities teachers count:', humanities.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());

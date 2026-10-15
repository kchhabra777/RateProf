import prisma from '../lib/prisma.js';

const offeringsENC = [
  {
    courseCode: "UEC523",
    courseName: "APPLICATIONS OF AI FOR ELECTRONIC SYSTEMS",
    ltp: "P",
    batchTaught: "3O21",
    branchTaught: "ENC",
    rawFaculty: "SANDEEP MANDIA",
    department: "Electronics & Communication Engg"
  },
  {
    courseCode: "UEC523",
    courseName: "APPLICATIONS OF AI FOR ELECTRONIC SYSTEMS",
    ltp: "L",
    batchTaught: "3O21",
    branchTaught: "ENC",
    rawFaculty: "CHANDRAMOHAN DHASARATHAN",
    department: "Electronics & Communication Engg"
  },
  {
    courseCode: "UNC503",
    courseName: "ARTIFICIAL INTELLIGENCE & MACHINE LEARNING",
    ltp: "P",
    batchTaught: "3O21",
    branchTaught: "ENC",
    rawFaculty: "VISHWAJEET",
    department: "Electronics & Computer Engg"
  },
  {
    courseCode: "UNC503",
    courseName: "ARTIFICIAL INTELLIGENCE & MACHINE LEARNING",
    ltp: "L",
    batchTaught: "3O21",
    branchTaught: "ENC",
    rawFaculty: "DEBAYANI GHOSH",
    department: "Electronics & Computer Engg"
  },
  {
    courseCode: "UEC716",
    courseName: "DATABASE MANAGEMENT SYSTEMS",
    ltp: "L",
    batchTaught: "3O21",
    branchTaught: "ENC",
    rawFaculty: "SUSHIL KUMAR JAIN",
    department: "Electronics & Communication Engg"
  },
  {
    courseCode: "UEC716",
    courseName: "DATABASE MANAGEMENT SYSTEMS",
    ltp: "P",
    batchTaught: "3O21",
    branchTaught: "ENC",
    rawFaculty: "ASHU SHARMA",
    department: "Electronics & Communication Engg"
  },
  {
    courseCode: "UEC502",
    courseName: "DIGITAL SIGNAL PROCESSING",
    ltp: "T",
    batchTaught: "3O21",
    branchTaught: "ENC",
    rawFaculty: "AMIT KAUSHAL",
    department: "Electronics & Communication Engg"
  },
  {
    courseCode: "UEC502",
    courseName: "DIGITAL SIGNAL PROCESSING",
    ltp: "L",
    batchTaught: "3O21",
    branchTaught: "ENC",
    rawFaculty: "RAVI KUMAR",
    department: "Electronics & Communication Engg"
  },
  {
    courseCode: "UEC502",
    courseName: "DIGITAL SIGNAL PROCESSING",
    ltp: "P",
    batchTaught: "3O21",
    branchTaught: "ENC",
    rawFaculty: "EKTA",
    department: "Electronics & Communication Engg"
  },
  {
    courseCode: "UEC310",
    courseName: "INFORMATION AND COMMUNICATION THEORY",
    ltp: "L",
    batchTaught: "3O21",
    branchTaught: "ENC",
    rawFaculty: "GITANJALI CHANDWANI",
    department: "Electronics & Communication Engg"
  },
  {
    courseCode: "UEC310",
    courseName: "INFORMATION AND COMMUNICATION THEORY",
    ltp: "T",
    batchTaught: "3O21",
    branchTaught: "ENC",
    rawFaculty: "GITANJALI CHANDWANI",
    department: "Electronics & Communication Engg"
  },
  {
    courseCode: "UTA025",
    courseName: "INNOVATION AND ENTREPRENEURSHIP",
    ltp: "P",
    batchTaught: "3O21",
    branchTaught: "ENC",
    rawFaculty: "PARMINDER SINGH",
    department: "Computer Science & Engineering"
  },
  {
    courseCode: "UTA025",
    courseName: "INNOVATION AND ENTREPRENEURSHIP",
    ltp: "L",
    batchTaught: "3O21",
    branchTaught: "ENC",
    rawFaculty: "PARMINDER SINGH",
    department: "Computer Science & Engineering"
  },
  {
    courseCode: "UNC501",
    courseName: "OPERATING SYSTEMS",
    ltp: "L",
    batchTaught: "3O21",
    branchTaught: "ENC",
    rawFaculty: "MOIRANGTHEM JAMES SINGH",
    department: "Electronics & Computer Engg"
  },
  {
    courseCode: "UNC501",
    courseName: "OPERATING SYSTEMS",
    ltp: "P",
    batchTaught: "3O21",
    branchTaught: "ENC",
    rawFaculty: "MOIRANGTHEM JAMES SINGH",
    department: "Electronics & Computer Engg"
  },
  {
    courseCode: "UNC514",
    courseName: "DATA SCIENCE FUNDAMENTALS",
    ltp: "P",
    batchTaught: "O322",
    branchTaught: "ENC",
    rawFaculty: "SAURABH SHARMA",
    department: "Electronics & Computer Engg"
  },
  {
    courseCode: "UNC514",
    courseName: "DATA SCIENCE FUNDAMENTALS",
    ltp: "L",
    batchTaught: "O322",
    branchTaught: "ENC",
    rawFaculty: "SAURABH SHARMA",
    department: "Electronics & Computer Engg"
  }
];

function stripTitle(name) {
  return name.replace(/^(Dr\.|Prof\.|Mr\.|Ms\.)\s+/i, '').replace(/(\(Dr\.?\)|\(Dr\)|\(Ms\.?\)|\(Mr\.?\))/i, '').trim();
}

function makeEmail(name) {
  const clean = stripTitle(name).toLowerCase().replace(/[^a-z\s]/g, '').trim().replace(/\s+/g, '.');
  return `${clean || 'faculty'}@thapar.edu`;
}

async function main() {
  console.log(`Ingesting ${offeringsENC.length} offerings for ENC (Batch 3O21 / O322)...\n`);

  let teachersMatched = 0;
  let teachersCreated = 0;
  let offeringsCreated = 0;
  let offeringsExisted = 0;

  for (const off of offeringsENC) {
    const cleanSearch = stripTitle(off.rawFaculty).toLowerCase();

    // 1. Search existing teacher
    let teacher = await prisma.teacherProfile.findFirst({
      where: {
        OR: [
          {
            fullName: {
              contains: cleanSearch,
              mode: 'insensitive'
            }
          },
          {
            user: {
              email: {
                contains: cleanSearch.replace(/\s+/g, '.'),
                mode: 'insensitive'
              }
            }
          }
        ]
      },
      include: { user: true }
    });

    // 2. Create if not found
    if (!teacher) {
      let baseEmail = makeEmail(off.rawFaculty);
      let email = baseEmail;
      let counter = 1;

      while (await prisma.user.findUnique({ where: { email } })) {
        email = baseEmail.replace('@thapar.edu', `${counter}@thapar.edu`);
        counter++;
      }

      const formattedName = off.rawFaculty.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      console.log(`Creating new teacher: "${formattedName}" (${email}) in ${off.department}`);

      const user = await prisma.user.create({
        data: {
          email: email,
          passwordHash: "PENDING",
          role: "TEACHER",
          isEmailVerified: true,
          isProfileComplete: true,
          teacherProfile: {
            create: {
              fullName: formattedName,
              department: off.department,
              designation: "Faculty"
            }
          }
        },
        include: { teacherProfile: true }
      });
      teacher = user.teacherProfile;
      teachersCreated++;
    } else {
      console.log(`Matched existing teacher: "${teacher.fullName}" for [${off.rawFaculty}]`);
      teachersMatched++;
    }

    // 3. Upsert CourseOffering
    const existing = await prisma.courseOffering.findFirst({
      where: {
        teacherId: teacher.id,
        courseCode: off.courseCode,
        batchTaught: off.batchTaught,
        ltp: off.ltp
      }
    });

    if (!existing) {
      const created = await prisma.courseOffering.create({
        data: {
          teacherId: teacher.id,
          courseCode: off.courseCode,
          courseName: off.courseName,
          batchTaught: off.batchTaught,
          branchTaught: off.branchTaught,
          academicYear: "2026-27-ODD",
          ltp: off.ltp
        }
      });
      console.log(`  -> Created offering: ${off.courseCode} (${off.ltp}) - ${off.batchTaught} assigned to ${teacher.fullName}`);
      offeringsCreated++;
    } else {
      console.log(`  -> Offering already exists: ${off.courseCode} (${off.ltp}) - ${off.batchTaught}`);
      offeringsExisted++;
    }
  }

  console.log("\n=================== INGESTION SUMMARY ===================");
  console.log(`Offerings Processed : ${offeringsENC.length}`);
  console.log(`Offerings Created   : ${offeringsCreated}`);
  console.log(`Offerings Existed   : ${offeringsExisted}`);
  console.log(`Teachers Created    : ${teachersCreated}`);
  console.log(`Teachers Reused     : ${teachersMatched}`);
  console.log("=========================================================");

  const totalTeachers = await prisma.teacherProfile.count();
  const totalOfferings = await prisma.courseOffering.count();
  console.log(`\nDatabase Totals Now:`);
  console.log(`Total Teachers in DB : ${totalTeachers}`);
  console.log(`Total Offerings in DB: ${totalOfferings}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

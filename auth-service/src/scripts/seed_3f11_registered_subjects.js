import prisma from '../lib/prisma.js';

const REQUIRED_OFFERINGS = [
  // 1. ANALOG AND DIGITAL COMMUNICATION(UEC519) - L - 3F11 - HARI SHANKAR SINGH DR.
  {
    courseCode: "UEC519",
    courseName: "ANALOG AND DIGITAL COMMUNICATION",
    ltp: "L",
    batchTaught: "3F11",
    branchTaught: "ECE",
    teacherSearch: "Hari Shankar Singh",
    teacherCleanName: "Dr. Hari Shankar Singh"
  },
  // 2. ANALOG AND DIGITAL COMMUNICATION(UEC519) - P - 3F11 - ASHUTOSH KUMAR SINGH (DR.)
  {
    courseCode: "UEC519",
    courseName: "ANALOG AND DIGITAL COMMUNICATION",
    ltp: "P",
    batchTaught: "3F11",
    branchTaught: "ECE",
    teacherSearch: "Ashutosh Kumar",
    teacherCleanName: "Dr. Ashutosh Kumar Singh"
  },
  // 3. ANALOG AND DIGITAL COMMUNICATION(UEC519) - T - 3F11 - SURBHI SHARMA (DR.) MS.
  {
    courseCode: "UEC519",
    courseName: "ANALOG AND DIGITAL COMMUNICATION",
    ltp: "T",
    batchTaught: "3F11",
    branchTaught: "ECE",
    teacherSearch: "Surbhi Sharma",
    teacherCleanName: "Dr. Surbhi Sharma"
  },
  // 4. APPLICATIONS OF AI FOR ELECTRONIC SYSTEMS(UEC523) - P - 3F11 - NEERU JINDAL DR.
  {
    courseCode: "UEC523",
    courseName: "APPLICATIONS OF AI FOR ELECTRONIC SYSTEMS",
    ltp: "P",
    batchTaught: "3F11",
    branchTaught: "ECE",
    teacherSearch: "Neeru Jindal",
    teacherCleanName: "Dr. Neeru Jindal"
  },
  // 5. APPLICATIONS OF AI FOR ELECTRONIC SYSTEMS(UEC523) - L - 3F11 - SANDEEP MANDIA
  {
    courseCode: "UEC523",
    courseName: "APPLICATIONS OF AI FOR ELECTRONIC SYSTEMS",
    ltp: "L",
    batchTaught: "3F11",
    branchTaught: "ECE",
    teacherSearch: "Sandeep Mandia",
    teacherCleanName: "Sandeep Mandia"
  },
  // 6. DIGITAL SIGNAL PROCESSING(UEC502) - T - 3F11 - AKASH AGARWAL
  {
    courseCode: "UEC502",
    courseName: "DIGITAL SIGNAL PROCESSING",
    ltp: "T",
    batchTaught: "3F11",
    branchTaught: "ECE",
    teacherSearch: "Akash Agarwal",
    teacherCleanName: "Akash Agarwal"
  },
  // 7. DIGITAL SIGNAL PROCESSING(UEC502) - P - 3F11 - AMIT KUMAR KOHLI (DR.)
  {
    courseCode: "UEC502",
    courseName: "DIGITAL SIGNAL PROCESSING",
    ltp: "P",
    batchTaught: "3F11",
    branchTaught: "ECE",
    teacherSearch: "Amit Kumar Kohli",
    teacherCleanName: "Dr. Amit Kumar Kohli"
  },
  // 8. DIGITAL SIGNAL PROCESSING(UEC502) - L - 3F11 - RIZWAN AHMED ANSARI
  {
    courseCode: "UEC502",
    courseName: "DIGITAL SIGNAL PROCESSING",
    ltp: "L",
    batchTaught: "3F11",
    branchTaught: "ECE",
    teacherSearch: "Rizwan Ahmed Ansari",
    teacherCleanName: "Rizwan Ahmed Ansari"
  },
  // 9. EMBEDDED SYSTEMS(UEC513) - L - 3F11 - GEETIKA DUA
  {
    courseCode: "UEC513",
    courseName: "EMBEDDED SYSTEMS",
    ltp: "L",
    batchTaught: "3F11",
    branchTaught: "ECE",
    teacherSearch: "Geetika Dua",
    teacherCleanName: "Geetika Dua"
  },
  // 10. EMBEDDED SYSTEMS(UEC513) - P - 3F11 - DINESH (DR.)
  {
    courseCode: "UEC513",
    courseName: "EMBEDDED SYSTEMS",
    ltp: "P",
    batchTaught: "3F11",
    branchTaught: "ECE",
    teacherSearch: "Dinesh",
    teacherCleanName: "Dr. Dinesh"
  },
  // 11. INNOVATION AND ENTREPRENEURSHIP(UTA025) - L - 3F11 - PARMINDER SINGH DR.
  {
    courseCode: "UTA025",
    courseName: "INNOVATION AND ENTREPRENEURSHIP",
    ltp: "L",
    batchTaught: "3F11",
    branchTaught: "ECE",
    teacherSearch: "Parminder Singh",
    teacherCleanName: "Dr. Parminder Singh"
  },
  // 12. INNOVATION AND ENTREPRENEURSHIP(UTA025) - P - 3F11 - PARMINDER SINGH DR.
  {
    courseCode: "UTA025",
    courseName: "INNOVATION AND ENTREPRENEURSHIP",
    ltp: "P",
    batchTaught: "3F11",
    branchTaught: "ECE",
    teacherSearch: "Parminder Singh",
    teacherCleanName: "Dr. Parminder Singh"
  },
  // 13. LINEAR INTEGRATED CIRCUITS AND APPLICATIONS(UEC512) - P - 3F11 - KULBIR SINGH (DR.)
  {
    courseCode: "UEC512",
    courseName: "LINEAR INTEGRATED CIRCUITS AND APPLICATIONS",
    ltp: "P",
    batchTaught: "3F11",
    branchTaught: "ECE",
    teacherSearch: "Kulbir Singh",
    teacherCleanName: "Dr. Kulbir Singh"
  },
  // 14. LINEAR INTEGRATED CIRCUITS AND APPLICATIONS(UEC512) - L - 3F11 - HARDEEP SINGH (DR.)
  {
    courseCode: "UEC512",
    courseName: "LINEAR INTEGRATED CIRCUITS AND APPLICATIONS",
    ltp: "L",
    batchTaught: "3F11",
    branchTaught: "ECE",
    teacherSearch: "Hardeep Singh",
    teacherCleanName: "Dr. Hardeep Singh"
  },
  // 15. MOS CIRCUIT DESIGN(UEC750) - T - 3F11 - SUSHIL KUMAR JAIN
  {
    courseCode: "UEC750",
    courseName: "MOS CIRCUIT DESIGN",
    ltp: "T",
    batchTaught: "3F11",
    branchTaught: "ECE",
    teacherSearch: "Sushil Kumar Jain",
    teacherCleanName: "Dr. Sushil Kumar Jain"
  },
  // 16. MOS CIRCUIT DESIGN(UEC750) - P - 3F11 - RAJNEESH SHARMA DR.
  {
    courseCode: "UEC750",
    courseName: "MOS CIRCUIT DESIGN",
    ltp: "P",
    batchTaught: "3F11",
    branchTaught: "ECE",
    teacherSearch: "Rajneesh Sharma",
    teacherCleanName: "Dr. Rajneesh Sharma"
  },
  // 17. MOS CIRCUIT DESIGN(UEC750) - L - 3F11 - RAJNEESH SHARMA DR.
  {
    courseCode: "UEC750",
    courseName: "MOS CIRCUIT DESIGN",
    ltp: "L",
    batchTaught: "3F11",
    branchTaught: "ECE",
    teacherSearch: "Rajneesh Sharma",
    teacherCleanName: "Dr. Rajneesh Sharma"
  },
  // 18. DESIGN USING SYSTEM VERILOG(UEC521) - L - Elective - F312 - SHASHIKANT MR.
  {
    courseCode: "UEC521",
    courseName: "DESIGN USING SYSTEM VERILOG",
    ltp: "L",
    batchTaught: "F312, 3F12, 3F11, ELECTIVE",
    branchTaught: "ECE",
    isElective: true,
    teacherSearch: "Shashikant",
    teacherCleanName: "Shashikant"
  },
  // 19. DESIGN USING SYSTEM VERILOG(UEC521) - P - Elective - F312 - SHASHIKANT MR.
  {
    courseCode: "UEC521",
    courseName: "DESIGN USING SYSTEM VERILOG",
    ltp: "P",
    batchTaught: "F312, 3F12, 3F11, ELECTIVE",
    branchTaught: "ECE",
    isElective: true,
    teacherSearch: "Shashikant",
    teacherCleanName: "Shashikant"
  }
];

async function main() {
  console.log('=== SEEDING / SYNCHRONIZING REGISTERED SUBJECTS FOR BATCH 3F11 & F312 ===\n');

  // Fix Dr. Sushil Kumar Jain's mistakenly assigned UEC512 (L) offering first
  const sushilUec512 = await prisma.courseOffering.findFirst({
    where: {
      courseCode: "UEC512",
      batchTaught: "3F11",
      teacher: { fullName: { contains: "Sushil", mode: "insensitive" } }
    }
  });

  if (sushilUec512) {
    console.log(`Fixing Dr. Sushil Kumar Jain's offering ID ${sushilUec512.id} from UEC512 (L) -> UEC750 (T)...`);
    await prisma.courseOffering.update({
      where: { id: sushilUec512.id },
      data: {
        courseCode: "UEC750",
        courseName: "MOS CIRCUIT DESIGN",
        ltp: "T",
        batchTaught: "3F11",
        branchTaught: "ECE",
        isElective: false
      }
    });
    console.log('✓ Successfully converted to UEC750 (T).');
  }

  for (let i = 0; i < REQUIRED_OFFERINGS.length; i++) {
    const item = REQUIRED_OFFERINGS[i];
    const sNo = i + 1;
    console.log(`\n[#${sNo}] Processing ${item.courseCode} (${item.ltp}) for ${item.teacherSearch}...`);

    // 1. Locate teacher
    const teacher = await prisma.teacherProfile.findFirst({
      where: { fullName: { contains: item.teacherSearch, mode: "insensitive" } },
      include: { user: true }
    });

    if (!teacher) {
      console.error(`❌ Teacher not found for ${item.teacherSearch}!`);
      continue;
    }

    // Update teacher clean name if needed
    if (teacher.fullName !== item.teacherCleanName) {
      await prisma.teacherProfile.update({
        where: { id: teacher.id },
        data: { fullName: item.teacherCleanName }
      });
      console.log(`  Updated teacher name: "${teacher.fullName}" -> "${item.teacherCleanName}"`);
    }

    // 2. Check for existing CourseOffering
    let offering = await prisma.courseOffering.findFirst({
      where: {
        teacherId: teacher.id,
        courseCode: item.courseCode,
        ltp: item.ltp,
        OR: [
          { batchTaught: { contains: "3F11" } },
          { batchTaught: { contains: "F312" } },
          { batchTaught: { contains: "3F12" } }
        ]
      }
    });

    if (offering) {
      // Update details to make sure everything matches
      offering = await prisma.courseOffering.update({
        where: { id: offering.id },
        data: {
          courseName: item.courseName,
          batchTaught: item.batchTaught,
          branchTaught: item.branchTaught,
          isElective: Boolean(item.isElective),
          academicYear: "2026-27-ODD"
        }
      });
      console.log(`  ✓ Updated existing offering ID ${offering.id}: ${item.courseCode} (${item.ltp}) assigned to ${item.teacherCleanName}`);
    } else {
      // Create new offering
      offering = await prisma.courseOffering.create({
        data: {
          teacherId: teacher.id,
          courseCode: item.courseCode,
          courseName: item.courseName,
          ltp: item.ltp,
          batchTaught: item.batchTaught,
          branchTaught: item.branchTaught,
          academicYear: "2026-27-ODD",
          isElective: Boolean(item.isElective)
        }
      });
      console.log(`  ✓ Created NEW offering ID ${offering.id}: ${item.courseCode} (${item.ltp}) assigned to ${item.teacherCleanName}`);
    }
  }

  console.log('\n=== VERIFYING FINAL OFFERINGS FOR BATCH 3F11 / F312 ===');
  const finalOfferings = await prisma.courseOffering.findMany({
    where: {
      OR: [
        { batchTaught: { contains: "3F11" } },
        { batchTaught: { contains: "F312" } }
      ]
    },
    include: { teacher: true },
    orderBy: [{ courseCode: 'asc' }, { ltp: 'asc' }]
  });

  console.log(`Total verified offerings for 3F11 / F312: ${finalOfferings.length}`);
  for (const o of finalOfferings) {
    console.log(`- ${o.courseCode} [${o.ltp}] "${o.courseName}" | Batch: "${o.batchTaught}" | Teacher: ${o.teacher.fullName} (Elective: ${o.isElective})`);
  }
}

main()
  .catch(err => {
    console.error('Error during seeding:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

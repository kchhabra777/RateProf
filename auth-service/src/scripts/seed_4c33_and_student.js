import prisma from '../lib/prisma.js';

async function getOrCreateTeacher({ email, fullName, department, designation }) {
  let profile = await prisma.teacherProfile.findFirst({
    where: {
      OR: [
        { user: { email: { equals: email, mode: 'insensitive' } } },
        { fullName: { contains: fullName, mode: 'insensitive' } }
      ]
    },
    include: { user: true }
  });

  if (!profile) {
    console.log(`Creating teacher account for: ${fullName} (${email})...`);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: "PENDING",
        role: "TEACHER",
        isEmailVerified: true,
        isProfileComplete: true,
        teacherProfile: {
          create: {
            fullName,
            department,
            designation: designation || "Faculty"
          }
        }
      },
      include: { teacherProfile: true }
    });
    profile = user.teacherProfile;
  }
  return profile;
}

async function main() {
  console.log('=== 1. Ensuring Teachers Exist for 4C33 & UCS772 ===');
  
  // 1. Ashima (Dr. Ashima Singh)
  const ashima = await getOrCreateTeacher({
    email: "ashima@thapar.edu",
    fullName: "Dr. Ashima Singh",
    department: "Computer Science & Engineering",
    designation: "Associate Professor"
  });
  console.log(`✓ Ashima: ID ${ashima.id} (${ashima.fullName})`);

  // 2. Rupali Bhardwaj
  const rupali = await getOrCreateTeacher({
    email: "rupali.bhardwaj@thapar.edu",
    fullName: "Dr. Rupali Bhardwaj",
    department: "Computer Science & Engineering",
    designation: "Assistant Professor"
  });
  console.log(`✓ Rupali Bhardwaj: ID ${rupali.id} (${rupali.fullName})`);

  // 3. Shashank Singh
  const shashank = await getOrCreateTeacher({
    email: "shashank.singh@thapar.edu",
    fullName: "Dr. Shashank Singh",
    department: "Computer Science & Engineering",
    designation: "Assistant Professor"
  });
  console.log(`✓ Shashank Singh: ID ${shashank.id} (${shashank.fullName})`);

  // 4. Rakesh Kumar Sharma
  const rakesh = await getOrCreateTeacher({
    email: "rakesh.sharma@thapar.edu",
    fullName: "Dr. Rakesh Kumar Sharma",
    department: "School of Humanities & Social Sciences",
    designation: "Associate Professor"
  });
  console.log(`✓ Rakesh Kumar Sharma: ID ${rakesh.id} (${rakesh.fullName})`);

  // 5. Sukhveet Kaur
  const sukhveet = await getOrCreateTeacher({
    email: "sukhveet.kaur@thapar.edu",
    fullName: "Sukhveet Kaur",
    department: "School of Humanities & Social Sciences",
    designation: "Faculty"
  });
  console.log(`✓ Sukhveet Kaur: ID ${sukhveet.id} (${sukhveet.fullName})`);

  // 6. Maninder Kaur
  const maninder = await getOrCreateTeacher({
    email: "manindersohal@thapar.edu",
    fullName: "Dr. Maninder Kaur",
    department: "Computer Science & Engineering",
    designation: "Associate Professor"
  });
  console.log(`✓ Maninder Kaur: ID ${maninder.id} (${maninder.fullName})`);

  console.log('\n=== 2. Creating / Synchronizing Offerings for 4C33 & 4T8 ===');
  
  const offerings = [
    // Row 1: CAPSTONE PROJECT(UCS797) - P - 4C33 - ASHIMA (MS)
    {
      teacherId: ashima.id,
      courseCode: "UCS797",
      courseName: "CAPSTONE PROJECT",
      ltp: "P",
      batchTaught: "4C33",
      branchTaught: "COE",
      isElective: false
    },
    // Row 2: COMPILER CONSTRUCTION(UCS802) - P - 4C33 - RUPALI BHARDWAJ (DR.) MS.
    {
      teacherId: rupali.id,
      courseCode: "UCS802",
      courseName: "COMPILER CONSTRUCTION",
      ltp: "P",
      batchTaught: "4C33",
      branchTaught: "COE",
      isElective: false
    },
    // Row 3: COMPILER CONSTRUCTION(UCS802) - L - 4C33 - SHASHANK SINGH
    {
      teacherId: shashank.id,
      courseCode: "UCS802",
      courseName: "COMPILER CONSTRUCTION",
      ltp: "L",
      batchTaught: "4C33",
      branchTaught: "COE",
      isElective: false
    },
    // Row 4: HUMANITIES FOR ENGINEERS(UHU005) - L - 4C33 - RAKESH KUMAR SHARMA (DR)
    {
      teacherId: rakesh.id,
      courseCode: "UHU005",
      courseName: "HUMANITIES FOR ENGINEERS",
      ltp: "L",
      batchTaught: "4C33",
      branchTaught: "COE",
      isElective: false
    },
    // Row 5: HUMANITIES FOR ENGINEERS(UHU005) - P - 4C33 - SUKHVEET KAUR
    {
      teacherId: sukhveet.id,
      courseCode: "UHU005",
      courseName: "HUMANITIES FOR ENGINEERS",
      ltp: "P",
      batchTaught: "4C33",
      branchTaught: "COE",
      isElective: false
    },
    // Row 6: DATA SCIENCE: COMPUTER VISION AND NLP(UCS772) - L - 4T8 - MANINDER KAUR-I (MS)
    {
      teacherId: maninder.id,
      courseCode: "UCS772",
      courseName: "DATA SCIENCE: COMPUTER VISION AND NLP",
      ltp: "L",
      batchTaught: "4T8, 4C33, ELECTIVE",
      branchTaught: "COE",
      isElective: true
    },
    // Row 7: DATA SCIENCE: COMPUTER VISION AND NLP(UCS772) - P - 4T8 - MANINDER KAUR-I (MS)
    {
      teacherId: maninder.id,
      courseCode: "UCS772",
      courseName: "DATA SCIENCE: COMPUTER VISION AND NLP",
      ltp: "P",
      batchTaught: "4T8, 4C33, ELECTIVE",
      branchTaught: "COE",
      isElective: true
    }
  ];

  for (const off of offerings) {
    const existing = await prisma.courseOffering.findFirst({
      where: {
        teacherId: off.teacherId,
        courseCode: off.courseCode,
        ltp: off.ltp,
        OR: [
          { batchTaught: { contains: "4C33" } },
          { batchTaught: { contains: "4T8" } }
        ]
      }
    });

    if (existing) {
      await prisma.courseOffering.update({
        where: { id: existing.id },
        data: {
          courseName: off.courseName,
          batchTaught: off.batchTaught,
          branchTaught: off.branchTaught,
          isElective: off.isElective,
          academicYear: "2026-27-EVEN"
        }
      });
      console.log(`  ✓ Updated offering ${off.courseCode} [${off.ltp}] (ID: ${existing.id})`);
    } else {
      const created = await prisma.courseOffering.create({
        data: {
          teacherId: off.teacherId,
          courseCode: off.courseCode,
          courseName: off.courseName,
          ltp: off.ltp,
          batchTaught: off.batchTaught,
          branchTaught: off.branchTaught,
          isElective: off.isElective,
          academicYear: "2026-27-EVEN"
        }
      });
      console.log(`  ✓ Created NEW offering ${off.courseCode} [${off.ltp}] (ID: ${created.id})`);
    }
  }

  console.log('\n=== 3. Updating StudentProfile for Roll No 102303655 ===');
  const updatedStudent = await prisma.studentProfile.update({
    where: { rollNumber: "102303655" },
    data: {
      batch: "4C33",
      branch: "COE",
      yearOfStudy: 4,
      selectedElectives: ["UCS772"]
    }
  });
  console.log(`✓ Updated Shivank Bhatia [102303655]:`);
  console.log(`   Batch: ${updatedStudent.batch}, Branch: ${updatedStudent.branch}, Year: ${updatedStudent.yearOfStudy}, Electives: ${updatedStudent.selectedElectives}`);

  console.log('\n=== Done! ===');
}

main().catch(console.error).finally(() => prisma.$disconnect());

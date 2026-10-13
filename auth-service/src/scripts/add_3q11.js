import prisma from '../lib/prisma.js';

const offerings3Q11 = [
  {
    rawName: "ANJULA MEHTO",
    searchEmail: "anjulamehto@thapar.edu",
    searchName: "Anjula Mehto",
    fallbackName: "Dr. Anjula Mehto",
    fallbackEmail: "anjulamehto@thapar.edu",
    courseCode: "UCS420",
    courseName: "COGNITIVE COMPUTING",
    ltp: "P"
  },
  {
    rawName: "ANJULA MEHTO",
    searchEmail: "anjulamehto@thapar.edu",
    searchName: "Anjula Mehto",
    fallbackName: "Dr. Anjula Mehto",
    fallbackEmail: "anjulamehto@thapar.edu",
    courseCode: "UCS420",
    courseName: "COGNITIVE COMPUTING",
    ltp: "L"
  },
  {
    rawName: "SHIVANI SHARMA MS.",
    searchEmail: "shivani.sharma@thapar.edu",
    searchName: "Shivani Sharma",
    fallbackName: "Dr. Shivani Sharma",
    fallbackEmail: "shivani.sharma@thapar.edu",
    courseCode: "UCS510",
    courseName: "COMPUTER ARCHITECTURE AND ORGANIZATION",
    ltp: "L"
  },
  {
    rawName: "CHINU",
    searchEmail: "chinu@thapar.edu",
    searchName: "Chinu",
    fallbackName: "Dr. Chinu",
    fallbackEmail: "chinu@thapar.edu",
    photoUrl: "https://csed.thapar.edu/files/microfaculty/21/17712164061813.jpg",
    courseCode: "UCS553",
    courseName: "ENTERPRISE WEB APPLICATION",
    ltp: "L"
  },
  {
    rawName: "NARDEEP SINGH",
    searchEmail: "nardeep.singh@thapar.edu",
    searchName: "Nardeep Singh",
    fallbackName: "Nardeep Singh",
    fallbackEmail: "nardeep.singh@thapar.edu",
    courseCode: "UCS553",
    courseName: "ENTERPRISE WEB APPLICATION",
    ltp: "P"
  },
  {
    rawName: "SIMRAN SETIA",
    searchEmail: "simran.setia@thapar.edu",
    searchName: "Simran Setia",
    fallbackName: "Dr. Simran Setia",
    fallbackEmail: "simran.setia@thapar.edu",
    photoUrl: "https://csed.thapar.edu/files/microfaculty/21/17307925791590.jpg",
    courseCode: "UCS421",
    courseName: "ETHICS AND RISK MITIGATION IN AI",
    ltp: "L"
  },
  {
    rawName: "JATIN BEDI",
    searchEmail: "jatin.bedi@thapar.edu",
    searchName: "Jatin Bedi",
    fallbackName: "Dr. Jatin Bedi",
    fallbackEmail: "jatin.bedi@thapar.edu",
    photoUrl: "https://csed.thapar.edu/files/microfaculty/21/17307845571426.jpg",
    courseCode: "UML501",
    courseName: "MACHINE LEARNING",
    ltp: "L"
  },
  {
    rawName: "JATIN BEDI",
    searchEmail: "jatin.bedi@thapar.edu",
    searchName: "Jatin Bedi",
    fallbackName: "Dr. Jatin Bedi",
    fallbackEmail: "jatin.bedi@thapar.edu",
    photoUrl: "https://csed.thapar.edu/files/microfaculty/21/17307845571426.jpg",
    courseCode: "UML501",
    courseName: "MACHINE LEARNING",
    ltp: "P"
  },
  {
    rawName: "TANYA GARG MS.",
    searchEmail: "tanya.garg@thapar.edu",
    searchName: "Tanya Garg",
    fallbackName: "Dr. Tanya Garg",
    fallbackEmail: "tanya.garg@thapar.edu",
    courseCode: "UCS503",
    courseName: "SOFTWARE ENGINEERING",
    ltp: "L"
  }
];

async function main() {
  try {
    console.log("=== Seeding / Updating Registered Subjects for Batch 3Q11 ===\n");

    for (const off of offerings3Q11) {
      // 1. Find teacher by email or fuzzy name
      let teacherProfile = await prisma.teacherProfile.findFirst({
        where: {
          OR: [
            {
              user: {
                email: {
                  equals: off.searchEmail,
                  mode: 'insensitive'
                }
              }
            },
            {
              fullName: {
                contains: off.searchName,
                mode: 'insensitive'
              }
            }
          ]
        },
        include: { user: true }
      });

      // 2. If not existing, create User and TeacherProfile
      if (!teacherProfile) {
        console.log(`Teacher not found for [${off.rawName}]. Creating new account with email ${off.fallbackEmail}...`);
        const user = await prisma.user.create({
          data: {
            email: off.fallbackEmail,
            passwordHash: "PENDING",
            role: "TEACHER",
            isEmailVerified: true,
            isProfileComplete: true,
            teacherProfile: {
              create: {
                fullName: off.fallbackName,
                department: "CSED",
                designation: "Faculty",
                photoUrl: off.photoUrl || null
              }
            }
          },
          include: { teacherProfile: true }
        });
        teacherProfile = user.teacherProfile;
        console.log(`✓ Created TeacherProfile ID: ${teacherProfile.id} for "${off.fallbackName}"`);
      } else {
        console.log(`✓ Found existing TeacherProfile ID: ${teacherProfile.id} ("${teacherProfile.fullName}") for [${off.rawName}]`);
        
        // Update photo if we have one and profile lacks one
        if (off.photoUrl && !teacherProfile.photoUrl) {
          await prisma.teacherProfile.update({
            where: { id: teacherProfile.id },
            data: { photoUrl: off.photoUrl }
          });
          console.log(`  -> Updated photoUrl for ${teacherProfile.fullName}`);
        }
      }

      // 3. Upsert CourseOffering for batch 3Q11
      const existingOffering = await prisma.courseOffering.findFirst({
        where: {
          teacherId: teacherProfile.id,
          courseCode: off.courseCode,
          batchTaught: "3Q11",
          ltp: off.ltp
        }
      });

      if (!existingOffering) {
        const created = await prisma.courseOffering.create({
          data: {
            teacherId: teacherProfile.id,
            courseCode: off.courseCode,
            courseName: off.courseName,
            batchTaught: "3Q11",
            branchTaught: "COPC",
            academicYear: "2026-27-ODD",
            ltp: off.ltp
          }
        });
        console.log(`  -> Created CourseOffering: ${created.courseCode} (${created.ltp}) - ${created.courseName} assigned to ${teacherProfile.fullName}`);
      } else {
        // Ensure courseName and branchTaught are exact
        await prisma.courseOffering.update({
          where: { id: existingOffering.id },
          data: {
            courseName: off.courseName,
            branchTaught: "COPC",
            academicYear: "2026-27-ODD"
          }
        });
        console.log(`  -> CourseOffering already exists for ${off.courseCode} (${off.ltp}) assigned to ${teacherProfile.fullName} (updated details)`);
      }
    }

    // 4. Update student profile for Krishna Chhabra (Roll No: 1024170001)
    console.log("\nUpdating student profile for Krishna Chhabra (1024170001)...");
    const student = await prisma.studentProfile.findFirst({
      where: {
        OR: [
          { rollNumber: "1024170001" },
          { fullName: { contains: "Krishna", mode: "insensitive" } },
          { fullName: { contains: "Krish", mode: "insensitive" } }
        ]
      }
    });

    if (student) {
      await prisma.studentProfile.update({
        where: { id: student.id },
        data: {
          fullName: "Krishna Chhabra",
          branch: "COPC",
          batch: "3Q11"
        }
      });
      console.log(`✓ Updated StudentProfile for Krishna Chhabra [1024170001] -> Branch: COPC, Batch: 3Q11`);
    } else {
      console.log("Student profile for Krishna Chhabra not found.");
    }

    console.log("\n✅ Finished processing batch 3Q11 successfully.");
  } catch (error) {
    console.error("Error running add_3q11 script:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

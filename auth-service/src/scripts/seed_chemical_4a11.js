import 'dotenv/config';
import prisma from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import { getEligibleTeachersForStudent, invalidateOfferingsCache } from '../services/courseService.js';

async function getOrCreateTeacher({ email, fullName, department, designation }) {
  let profile = await prisma.teacherProfile.findFirst({
    where: {
      OR: [
        { user: { email: { equals: email, mode: 'insensitive' } } },
        {
          AND: [
            { fullName: { contains: fullName, mode: 'insensitive' } },
            { department: { contains: 'Chemical', mode: 'insensitive' } }
          ]
        }
      ]
    },
    include: { user: true }
  });

  if (!profile) {
    console.log(`Creating Chemical Engineering teacher: ${fullName} (${email})...`);
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
  } else {
    // Ensure department and designation are up to date
    profile = await prisma.teacherProfile.update({
      where: { id: profile.id },
      data: {
        fullName,
        department,
        designation: designation || profile.designation
      },
      include: { user: true }
    });
  }
  return profile;
}

async function getOrCreateStudent() {
  const rollNumber = "102301035";
  const fullName = "Krishnan Abhishek";
  const email = "kabhishek_be23@thapar.edu";
  const batch = "4A11";
  const branch = "CHE";
  const yearOfStudy = 4;

  let student = await prisma.studentProfile.findFirst({
    where: {
      OR: [
        { rollNumber },
        { user: { email: { equals: email, mode: 'insensitive' } } }
      ]
    },
    include: { user: true }
  });

  const hashedPassword = await bcrypt.hash('Thapar@2026', 10);

  if (!student) {
    console.log(`Creating student account for ${fullName} [${rollNumber}]...`);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        role: "STUDENT",
        detectedBatch: "BE23",
        isEmailVerified: true,
        isProfileComplete: true,
        studentProfile: {
          create: {
            fullName,
            rollNumber,
            batch,
            branch,
            yearOfStudy,
            isCR: false,
            selectedElectives: []
          }
        }
      },
      include: { studentProfile: true }
    });
    student = user.studentProfile;
  } else {
    console.log(`Updating student account for ${fullName} [${rollNumber}]...`);
    student = await prisma.studentProfile.update({
      where: { id: student.id },
      data: {
        fullName,
        rollNumber,
        batch,
        branch,
        yearOfStudy
      },
      include: { user: true }
    });
  }
  return student;
}

async function main() {
  console.log('=== 1. Ensuring Chemical Engineering Faculty Exist ===');
  
  // 1. Dr. Sanghamitra Barman (Professor)
  const barman = await getOrCreateTeacher({
    email: "sbarman@thapar.edu",
    fullName: "Dr. Sanghamitra Barman",
    department: "Chemical Engineering",
    designation: "Professor"
  });
  console.log(`✓ Sanghamitra Barman: ID ${barman.id} (${barman.fullName})`);

  // 2. Dr. Neetu Singh (Professor)
  const neetu = await getOrCreateTeacher({
    email: "neetu.singh@thapar.edu",
    fullName: "Dr. Neetu Singh",
    department: "Chemical Engineering",
    designation: "Professor"
  });
  console.log(`✓ Neetu Singh: ID ${neetu.id} (${neetu.fullName})`);

  // 3. Dr. Rakesh Kumar Gupta (Assistant Professor)
  const rakesh = await getOrCreateTeacher({
    email: "rakeshkgupta@thapar.edu",
    fullName: "Dr. Rakesh Kumar Gupta",
    department: "Chemical Engineering",
    designation: "Assistant Professor"
  });
  console.log(`✓ Rakesh Kumar Gupta: ID ${rakesh.id} (${rakesh.fullName})`);

  // 4. Dr. Parminder Singh (Associate Professor, Chemical Engineering)
  const parminder = await getOrCreateTeacher({
    email: "parminder.che@thapar.edu",
    fullName: "Dr. Parminder Singh",
    department: "Chemical Engineering",
    designation: "Associate Professor"
  });
  console.log(`✓ Parminder Singh: ID ${parminder.id} (${parminder.fullName})`);

  console.log('\n=== 2. Creating Registered Course Offerings for 3A11 / 4A11 ===');

  const registeredOfferings = [
    // 1. CHEMICAL REACTION ENGINEERING-II (UCH601) - L - SANGHAMITRA BARMAN (DR.)
    {
      teacherId: barman.id,
      courseCode: "UCH601",
      courseName: "CHEMICAL REACTION ENGINEERING-II",
      ltp: "L",
      batchTaught: "3A11, 4A11",
      branchTaught: "CHE",
      isElective: false
    },
    // 2. CHEMICAL REACTION ENGINEERING-II (UCH601) - T - SANGHAMITRA BARMAN (DR.)
    {
      teacherId: barman.id,
      courseCode: "UCH601",
      courseName: "CHEMICAL REACTION ENGINEERING-II",
      ltp: "T",
      batchTaught: "3A11, 4A11",
      branchTaught: "CHE",
      isElective: false
    },
    // 3. MASS TRANSFER-II (UCH613) - T - NEETU SINGH (DR.) MS.
    {
      teacherId: neetu.id,
      courseCode: "UCH613",
      courseName: "MASS TRANSFER-II",
      ltp: "T",
      batchTaught: "3A11, 4A11",
      branchTaught: "CHE",
      isElective: false
    },
    // 4. MASS TRANSFER-II (UCH613) - P - NEETU SINGH (DR.) MS.
    {
      teacherId: neetu.id,
      courseCode: "UCH613",
      courseName: "MASS TRANSFER-II",
      ltp: "P",
      batchTaught: "3A11, 4A11",
      branchTaught: "CHE",
      isElective: false
    },
    // 5. MASS TRANSFER-II (UCH613) - L - NEETU SINGH (DR.) MS.
    {
      teacherId: neetu.id,
      courseCode: "UCH613",
      courseName: "MASS TRANSFER-II",
      ltp: "L",
      batchTaught: "3A11, 4A11",
      branchTaught: "CHE",
      isElective: false
    },
    // 6. PROCESS EQUIPMENT DESIGN PROJECT (UCH612) - L - RAKESH KUMAR GUPTA
    {
      teacherId: rakesh.id,
      courseCode: "UCH612",
      courseName: "PROCESS EQUIPMENT DESIGN PROJECT",
      ltp: "L",
      batchTaught: "3A11, 4A11",
      branchTaught: "CHE",
      isElective: false
    },
    // 7. PROCESS EQUIPMENT DESIGN PROJECT (UCH612) - P - RAKESH KUMAR GUPTA
    {
      teacherId: rakesh.id,
      courseCode: "UCH612",
      courseName: "PROCESS EQUIPMENT DESIGN PROJECT",
      ltp: "P",
      batchTaught: "3A11, 4A11",
      branchTaught: "CHE",
      isElective: false
    },
    // 8. PROCESS MODELING AND SIMULATION (UCH802) - P - NEETU SINGH (DR.) MS.
    {
      teacherId: neetu.id,
      courseCode: "UCH802",
      courseName: "PROCESS MODELING AND SIMULATION",
      ltp: "P",
      batchTaught: "3A11, 4A11",
      branchTaught: "CHE",
      isElective: false
    },
    // 9. PROCESS MODELING AND SIMULATION (UCH802) - L - NEETU SINGH (DR.) MS.
    {
      teacherId: neetu.id,
      courseCode: "UCH802",
      courseName: "PROCESS MODELING AND SIMULATION",
      ltp: "L",
      batchTaught: "3A11, 4A11",
      branchTaught: "CHE",
      isElective: false
    },
    // 10. PROCESS UTILITY AND INDUSTRIAL SAFETY (UCH605) - L - RAKESH KUMAR GUPTA
    {
      teacherId: rakesh.id,
      courseCode: "UCH605",
      courseName: "PROCESS UTILITY AND INDUSTRIAL SAFETY",
      ltp: "L",
      batchTaught: "3A11, 4A11",
      branchTaught: "CHE",
      isElective: false
    },
    // 11. PROCESS UTILITY AND INDUSTRIAL SAFETY (UCH605) - T - RAKESH KUMAR GUPTA
    {
      teacherId: rakesh.id,
      courseCode: "UCH605",
      courseName: "PROCESS UTILITY AND INDUSTRIAL SAFETY",
      ltp: "T",
      batchTaught: "3A11, 4A11",
      branchTaught: "CHE",
      isElective: false
    },
    // 12. TRANSPORT PHENOMENA (UCH603) - T - PARMINDER SINGH DR.
    {
      teacherId: parminder.id,
      courseCode: "UCH603",
      courseName: "TRANSPORT PHENOMENA",
      ltp: "T",
      batchTaught: "3A11, 4A11",
      branchTaught: "CHE",
      isElective: false
    },
    // 13. TRANSPORT PHENOMENA (UCH603) - L - PARMINDER SINGH DR.
    {
      teacherId: parminder.id,
      courseCode: "UCH603",
      courseName: "TRANSPORT PHENOMENA",
      ltp: "L",
      batchTaught: "3A11, 4A11",
      branchTaught: "CHE",
      isElective: false
    }
  ];

  for (const off of registeredOfferings) {
    const existing = await prisma.courseOffering.findFirst({
      where: {
        teacherId: off.teacherId,
        courseCode: off.courseCode,
        ltp: off.ltp,
        OR: [
          { batchTaught: { contains: "4A11" } },
          { batchTaught: { contains: "3A11" } }
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
      console.log(`  ✓ Updated offering ${off.courseCode} [${off.ltp}] for teacher ${off.teacherId}`);
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

  console.log('\n=== 3. Setting Up Student: Krishnan Abhishek [102301035] ===');
  const student = await getOrCreateStudent();
  console.log(`✓ Student: ${student.fullName} (${student.rollNumber})`);
  console.log(`  Batch: ${student.batch}, Branch: ${student.branch}, Year: ${student.yearOfStudy}`);

  console.log('\n=== 4. Seeding Authentic Reviews & Profile Ratings for Chemical Faculty ===');

  const chemicalTeachers = [barman, neetu, rakesh, parminder];
  
  const reviewsByTeacher = {
    [barman.id]: [
      {
        text: "Exceptional clarity on kinetics and non-ideal reactor design in Chemical Reaction Engineering. Breaks down complex differential equations effortlessly.",
        tags: ["Clear Explanations", "Approachable"],
        rating: 5,
        courseCode: "UCH601",
        courseName: "CHEMICAL REACTION ENGINEERING-II"
      },
      {
        text: "Tutorial problems solved on the blackboard are extremely helpful for MSTs and ESTs. Very encouraging and patient during office hours.",
        tags: ["Approachable", "Engaging Lectures"],
        rating: 5,
        courseCode: "UCH601",
        courseName: "CHEMICAL REACTION ENGINEERING-II"
      },
      {
        text: "High academic rigor with comprehensive assignment sets. Pushes students to understand catalyst deactivation and residence time distribution in depth.",
        tags: ["Engaging Lectures", "Heavy Workload"],
        rating: 5,
        courseCode: "UCH601",
        courseName: "CHEMICAL REACTION ENGINEERING-II"
      },
      {
        text: "Fair and transparent evaluation on mid-sems. Strict with step marking on derivation steps, but rewards solid chemical engineering intuition.",
        tags: ["Clear Explanations", "Tough Grader"],
        rating: 4,
        courseCode: "UCH601",
        courseName: "CHEMICAL REACTION ENGINEERING-II"
      },
      {
        text: "One of the best professors in the Chemical department. Connects reactor scale-up theory to real petroleum refinery and fertilizer plant operations.",
        tags: ["Clear Explanations", "Engaging Lectures"],
        rating: 5,
        courseCode: "UCH601",
        courseName: "CHEMICAL REACTION ENGINEERING-II"
      }
    ],

    [neetu.id]: [
      {
        text: "Brilliant grasp of separation processes and mass transfer operations. Distillation column design and McCabe-Thiele diagrams are explained step-by-step.",
        tags: ["Clear Explanations", "Approachable"],
        rating: 5,
        courseCode: "UCH613",
        courseName: "MASS TRANSFER-II"
      },
      {
        text: "Very supportive and hands-on during simulation lab sessions for Aspen Plus and Process Modeling. Always guides students through convergence errors.",
        tags: ["Approachable", "Engaging Lectures"],
        rating: 5,
        courseCode: "UCH802",
        courseName: "PROCESS MODELING AND SIMULATION"
      },
      {
        text: "Intensive lab reports and thorough simulation assignments, but you gain industry-standard chemical process modeling skills by the end of the term.",
        tags: ["Engaging Lectures", "Heavy Workload"],
        rating: 5,
        courseCode: "UCH802",
        courseName: "PROCESS MODELING AND SIMULATION"
      },
      {
        text: "Detailed and thorough rubric for lab practical evaluations and viva voce. Gives constructive feedback on process flow diagrams.",
        tags: ["Clear Explanations", "Tough Grader"],
        rating: 4,
        courseCode: "UCH613",
        courseName: "MASS TRANSFER-II"
      },
      {
        text: "Well-paced lecture delivery and crystal clear explanations of liquid-liquid extraction and drying mechanics. Highly recommend her courses.",
        tags: ["Clear Explanations", "Engaging Lectures"],
        rating: 5,
        courseCode: "UCH613",
        courseName: "MASS TRANSFER-II"
      }
    ],

    [rakesh.id]: [
      {
        text: "Outstanding guidance on the process equipment design project. Explains ASME code standards, heat exchanger design, and vessel wall thickness calculation clearly.",
        tags: ["Clear Explanations", "Approachable"],
        rating: 5,
        courseCode: "UCH612",
        courseName: "PROCESS EQUIPMENT DESIGN PROJECT"
      },
      {
        text: "Practical industrial safety insights and HAZOP analysis are made very engaging through real-world chemical plant incident case studies.",
        tags: ["Approachable", "Engaging Lectures"],
        rating: 5,
        courseCode: "UCH605",
        courseName: "PROCESS UTILITY AND INDUSTRIAL SAFETY"
      },
      {
        text: "Demanding design project with tight milestones and CAD drafting requirements, but develops genuine process plant engineering competence.",
        tags: ["Engaging Lectures", "Heavy Workload"],
        rating: 5,
        courseCode: "UCH612",
        courseName: "PROCESS EQUIPMENT DESIGN PROJECT"
      },
      {
        text: "High standards on mechanical design drawings and safety relief valve sizing calculations. Strict evaluation with detailed review feedback.",
        tags: ["Clear Explanations", "Tough Grader"],
        rating: 4,
        courseCode: "UCH605",
        courseName: "PROCESS UTILITY AND INDUSTRIAL SAFETY"
      },
      {
        text: "Punctual, organized, and approachable during design reviews. Thoroughly prepares students for core chemical engineering placement technical rounds.",
        tags: ["Clear Explanations", "Engaging Lectures"],
        rating: 5,
        courseCode: "UCH612",
        courseName: "PROCESS EQUIPMENT DESIGN PROJECT"
      }
    ],

    [parminder.id]: [
      {
        text: "Demystified Transport Phenomena with physical intuition and clean vector calculus derivations on the board. One of the clearest teachers in the department.",
        tags: ["Clear Explanations", "Approachable"],
        rating: 5,
        courseCode: "UCH603",
        courseName: "TRANSPORT PHENOMENA"
      },
      {
        text: "Very patient when resolving students' doubts on Navier-Stokes equations and shell balance problems. Makes a challenging subject enjoyable.",
        tags: ["Approachable", "Engaging Lectures"],
        rating: 5,
        courseCode: "UCH603",
        courseName: "TRANSPORT PHENOMENA"
      },
      {
        text: "Comprehensive numerical problem sheets that require consistent practice throughout the semester. Excellent preparation for GATE and higher studies.",
        tags: ["Engaging Lectures", "Heavy Workload"],
        rating: 5,
        courseCode: "UCH603",
        courseName: "TRANSPORT PHENOMENA"
      },
      {
        text: "Thorough marking on mid-semester exam derivations. Generous with step marks when the physical assumptions and boundary conditions are stated properly.",
        tags: ["Clear Explanations", "Tough Grader"],
        rating: 4,
        courseCode: "UCH603",
        courseName: "TRANSPORT PHENOMENA"
      },
      {
        text: "Engaging teaching demeanor with great analogies between momentum, heat, and mass transfer. Always available in his cabin for academic advice.",
        tags: ["Clear Explanations", "Engaging Lectures"],
        rating: 5,
        courseCode: "UCH603",
        courseName: "TRANSPORT PHENOMENA"
      }
    ]
  };

  // Fetch some student reviewers from the DB
  const sampleStudents = await prisma.studentProfile.findMany({
    take: 10,
    include: { user: true }
  });

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (const t of chemicalTeachers) {
    const teacherReviews = reviewsByTeacher[t.id] || [];
    
    // Check if reviews already exist
    const existingReviews = await prisma.review.findMany({
      where: { revieweeId: t.userId }
    });

    if (existingReviews.length < 5) {
      console.log(`Seeding reviews for ${t.fullName}...`);
      for (let r = 0; r < teacherReviews.length; r++) {
        const rev = teacherReviews[r];
        const studentReviewer = sampleStudents[r % sampleStudents.length];
        const reviewDate = new Date(now - (12 + r * 14) * dayMs);

        await prisma.review.create({
          data: {
            reviewerId: studentReviewer.userId,
            reviewerName: studentReviewer.fullName,
            reviewerEmail: studentReviewer.user.email,
            reviewerRollNo: studentReviewer.rollNumber,
            reviewerBatch: "4A11",
            reviewerBranch: "CHE",
            revieweeId: t.userId,
            courseCode: rev.courseCode,
            courseName: rev.courseName,
            rating: rev.rating,
            reviewText: rev.text,
            context: "Batch 4A11 • Regular Course",
            tags: rev.tags,
            createdAt: reviewDate,
            updatedAt: reviewDate,
            isFlagged: false
          }
        });
      }
      console.log(`  ✓ Inserted 5 authentic reviews for ${t.fullName}`);
    }

    // Upsert ProfileRating
    const allRevs = await prisma.review.findMany({
      where: { revieweeId: t.userId }
    });

    const avgRating = Number((allRevs.reduce((acc, x) => acc + x.rating, 0) / (allRevs.length || 1)).toFixed(2));
    await prisma.profileRating.upsert({
      where: { userId: t.userId },
      update: {
        overallRating: avgRating,
        recentRating: avgRating,
        totalReviews: allRevs.length,
        calculatedAt: new Date()
      },
      create: {
        userId: t.userId,
        overallRating: avgRating,
        recentRating: avgRating,
        totalReviews: allRevs.length,
        calculatedAt: new Date()
      }
    });
    console.log(`  ✓ Updated ProfileRating for ${t.fullName}: ${avgRating} (${allRevs.length} reviews)`);
  }

  // Invalidate cache
  invalidateOfferingsCache();

  console.log('\n=== 5. Verification: Eligible Teachers for Krishnan Abhishek (4A11, CHE) ===');
  const eligible = await getEligibleTeachersForStudent({
    batch: "4A11",
    branch: "CHE"
  });

  console.log(`Total eligible teachers returned for 4A11 CHE: ${eligible.length}`);
  for (const el of eligible) {
    console.log(`• ${el.fullName} (${el.department}):`);
    for (const c of el.courses) {
      console.log(`    - ${c.courseCode} [${c.ltp}] "${c.courseName}"`);
    }
  }

  console.log('\n=== Done! All chemical engineering data seeded successfully! ===');
}

main().catch(console.error).finally(() => prisma.$disconnect());

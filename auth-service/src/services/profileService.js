import prisma from "../lib/prisma.js";

export const saveStudentProfile = async ({
  userId,
  fullName,
  rollNumber,
  branch,
  batch,
  yearOfStudy,
  selectedElectives = []
}) => {
  if (!rollNumber || !/^\d{9,10}$/.test(rollNumber.trim())) {
    throw new Error("Roll Number must be 9 or 10 digits (e.g. 1024031234 or 102103123).");
  }

  if (!branch || branch.trim() === "") {
    throw new Error("Branch is required (e.g. COE, ENC, CSE).");
  }

  if (!batch || batch.trim() === "") {
    throw new Error("Batch is required (e.g. 3Q11, 2Q12).");
  }

  const numYear = Number(yearOfStudy);
  if (!numYear || numYear < 1 || numYear > 5) {
    throw new Error("Year of study must be a number between 1 and 5.");
  }

  // Check if roll number already taken by another student
  const existingRoll = await prisma.studentProfile.findFirst({
    where: {
      rollNumber: rollNumber.trim(),
      userId: { not: userId }
    }
  });

  if (existingRoll) {
    throw new Error("This roll number is already registered by another student.");
  }

  // Prevent students from directly modifying their batch once set
  const existingProfile = await prisma.studentProfile.findUnique({
    where: { userId }
  });

  if (existingProfile && existingProfile.batch && existingProfile.batch !== batch.trim().toUpperCase()) {
    throw new Error("Batch cannot be changed directly after profile setup. Please submit a Batch Change Request to be verified by your CR and approved by an Admin.");
  }

  const cleanElectives = Array.isArray(selectedElectives)
    ? selectedElectives.map(e => String(e).trim().toUpperCase()).filter(e => e && e !== "NONE" && e !== "NULL")
    : [];

  const profile = await prisma.studentProfile.upsert({
    where: { userId },
    update: {
      fullName: (fullName && fullName.trim()) || null,
      rollNumber: rollNumber.trim(),
      branch: branch.trim().toUpperCase(),
      batch: batch.trim().toUpperCase(),
      yearOfStudy: numYear,
      ...(selectedElectives !== undefined ? { selectedElectives: cleanElectives } : {})
    },
    create: {
      userId,
      fullName: (fullName && fullName.trim()) || null,
      rollNumber: rollNumber.trim(),
      branch: branch.trim().toUpperCase(),
      batch: batch.trim().toUpperCase(),
      yearOfStudy: numYear,
      selectedElectives: cleanElectives
    }
  });

  await prisma.user.update({
    where: { id: userId },
    data: { isProfileComplete: true }
  });

  return profile;
};

export const updateStudentElectives = async ({ userId, selectedElectives }) => {
  const cleanElectives = Array.isArray(selectedElectives)
    ? selectedElectives.map(e => String(e).trim().toUpperCase()).filter(e => e && e !== "NONE" && e !== "NULL")
    : [];

  const profile = await prisma.studentProfile.update({
    where: { userId },
    data: { selectedElectives: cleanElectives }
  });

  return profile;
};

export const saveTeacherProfile = async ({
  userId,
  fullName,
  department,
  designation,
  offerings = []
}) => {
  if (!fullName || fullName.trim() === "") {
    throw new Error("Full name is required.");
  }

  if (!department || department.trim() === "") {
    throw new Error("Department is required.");
  }

  const teacherProfile = await prisma.teacherProfile.upsert({
    where: { userId },
    update: {
      fullName: fullName.trim(),
      department: department.trim(),
      designation: (designation && designation.trim()) || "Faculty"
    },
    create: {
      userId,
      fullName: fullName.trim(),
      department: department.trim(),
      designation: (designation && designation.trim()) || "Faculty"
    }
  });

  // If offerings provided, create them
  if (Array.isArray(offerings) && offerings.length > 0) {
    for (const off of offerings) {
      if (off.courseCode && off.courseName && off.batchTaught) {
        await prisma.courseOffering.create({
          data: {
            teacherId: teacherProfile.id,
            courseCode: off.courseCode.trim().toUpperCase(),
            courseName: off.courseName.trim(),
            batchTaught: off.batchTaught.trim().toUpperCase(),
            branchTaught: (off.branchTaught && off.branchTaught.trim().toUpperCase()) || "ALL",
            academicYear: (off.academicYear && off.academicYear.trim()) || "2024-2025"
          }
        });
      }
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isProfileComplete: true }
  });

  return await prisma.teacherProfile.findUnique({
    where: { id: teacherProfile.id },
    include: { offerings: true }
  });
};

export const getAllTeachers = async () => {
  return await prisma.teacherProfile.findMany({
    include: {
      user: {
        select: {
          id: true,
          email: true
        }
      },
      offerings: true
    },
    orderBy: {
      fullName: "asc"
    }
  });
};

export const getTeacherById = async (idOrUserId) => {
  return await prisma.teacherProfile.findFirst({
    where: {
      OR: [
        { id: idOrUserId },
        { userId: idOrUserId }
      ]
    },
    include: {
      user: {
        select: {
          id: true,
          email: true
        }
      },
      offerings: true
    }
  });
};

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

const TEACHER_PUBLIC_INCLUDE = {
  user: {
    select: {
      id: true,
      email: true
    }
  },
  offerings: true
};

export const getTeacherById = async (idOrUserId) => {
  return await prisma.teacherProfile.findFirst({
    where: {
      OR: [
        { id: idOrUserId },
        { userId: idOrUserId }
      ]
    },
    include: TEACHER_PUBLIC_INCLUDE
  });
};

const HONORIFICS = new Set(["dr", "prof", "professor", "mr", "mrs", "ms"]);
const nameWords = (text) =>
  String(text).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);
const withoutHonorifics = (words) => words.filter((w) => !HONORIFICS.has(w));

// Resolves a public profile slug such as "dr-anjula-mehto" (or "anjula-mehto") to a teacher.
// Returns null when no teacher, or more than one, matches the name.
export const getTeacherBySlug = async (slug) => {
  if (!/^[a-z0-9-]+$/i.test(slug)) return null;
  const slugWords = nameWords(slug);
  const coreWords = withoutHonorifics(slugWords);
  if (coreWords.length === 0) return null;

  const candidates = await prisma.teacherProfile.findMany({
    where: {
      AND: coreWords.map((w) => ({ fullName: { contains: w, mode: "insensitive" } }))
    },
    include: TEACHER_PUBLIC_INCLUDE,
    take: 20
  });

  const coreKey = coreWords.join("-");
  const matches = candidates.filter((t) => withoutHonorifics(nameWords(t.fullName)).join("-") === coreKey);
  if (matches.length === 1) return matches[0];

  // Several teachers share the name: accept only an exact slug match, honorific included
  const exactKey = slugWords.join("-");
  const exact = matches.filter((t) => nameWords(t.fullName).join("-") === exactKey);
  return exact.length === 1 ? exact[0] : null;
};

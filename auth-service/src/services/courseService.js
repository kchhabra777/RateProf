import prisma from "../lib/prisma.js";

export { ALLOWED_BATCHES } from "./batches.js";

export const addCourseOffering = async ({
  teacherUserId,
  courseCode,
  courseName,
  batchTaught,
  branchTaught,
  academicYear,
  isElective
}) => {
  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId: teacherUserId }
  });

  if (!teacher) {
    throw new Error("Teacher profile not found. Please complete profile onboarding first.");
  }

  if (!courseCode || !courseName || !batchTaught) {
    throw new Error("Course Code, Course Name, and Batch Taught are required.");
  }

  invalidateOfferingsCache();
  return await prisma.courseOffering.create({
    data: {
      teacherId: teacher.id,
      courseCode: courseCode.trim().toUpperCase(),
      courseName: courseName.trim(),
      batchTaught: batchTaught.trim().toUpperCase(),
      branchTaught: (branchTaught && branchTaught.trim().toUpperCase()) || "ALL",
      academicYear: (academicYear && academicYear.trim()) || "2026-2027 ODD",
      isElective: Boolean(isElective)
    }
  });
};

export const updateCourseOffering = async ({
  offeringId,
  teacherUserId,
  courseCode,
  courseName,
  batchTaught,
  branchTaught,
  academicYear,
  isElective
}) => {
  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId: teacherUserId }
  });

  if (!teacher) {
    throw new Error("Teacher profile not found.");
  }

  const existingOffering = await prisma.courseOffering.findUnique({
    where: { id: offeringId }
  });

  if (!existingOffering) {
    throw new Error("Course offering not found.");
  }

  if (existingOffering.teacherId !== teacher.id) {
    throw new Error("Unauthorized: You can only edit your own course offerings.");
  }

  invalidateOfferingsCache();
  return await prisma.courseOffering.update({
    where: { id: offeringId },
    data: {
      ...(courseCode ? { courseCode: courseCode.trim().toUpperCase() } : {}),
      ...(courseName ? { courseName: courseName.trim() } : {}),
      ...(batchTaught ? { batchTaught: batchTaught.trim().toUpperCase() } : {}),
      ...(branchTaught ? { branchTaught: branchTaught.trim().toUpperCase() } : {}),
      ...(academicYear ? { academicYear: academicYear.trim() } : {}),
      ...(typeof isElective === 'boolean' ? { isElective } : {})
    }
  });
};

export const deleteCourseOffering = async ({ offeringId, teacherUserId }) => {
  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId: teacherUserId }
  });

  if (!teacher) {
    throw new Error("Teacher profile not found.");
  }

  const existingOffering = await prisma.courseOffering.findUnique({
    where: { id: offeringId }
  });

  if (!existingOffering) {
    throw new Error("Course offering not found.");
  }

  if (existingOffering.teacherId !== teacher.id) {
    throw new Error("Unauthorized: You can only delete your own course offerings.");
  }

  await prisma.courseOffering.delete({
    where: { id: offeringId }
  });

  invalidateOfferingsCache();
  return { success: true, message: "Course offering deleted successfully." };
};

export const getTeacherOfferings = async (teacherUserId) => {
  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId: teacherUserId },
    include: { offerings: true }
  });

  return teacher?.offerings || [];
};

let cachedAllOfferings = null;
let lastOfferingsFetchTime = 0;
const OFFERINGS_CACHE_TTL = 60 * 1000;

export const invalidateOfferingsCache = () => {
  cachedAllOfferings = null;
  lastOfferingsFetchTime = 0;
};

const FREE_ELECTIVE_CODES = new Set([
  'UMA069', 'UHU018', 'UMA070', 'UTD004', 'UHU017', 'UCS002',
  'UPH064', 'UEN006', 'UHU051', 'UHU053', 'UBT510', 'UHU016'
]);

export const getAvailableElectives = async ({ branch, year } = {}) => {
  const now = Date.now();
  if (!cachedAllOfferings || now - lastOfferingsFetchTime > OFFERINGS_CACHE_TTL) {
    cachedAllOfferings = await prisma.courseOffering.findMany({
      include: {
        teacher: {
          include: {
            user: {
              select: {
                id: true,
                email: true
              }
            }
          }
        }
      }
    });
    lastOfferingsFetchTime = now;
  }

  const electiveOfferings = cachedAllOfferings.filter(off => off.isElective);
  
  // Group by distinct courseCode
  const courseMap = new Map();
  for (const off of electiveOfferings) {
    const code = off.courseCode.trim().toUpperCase();
    if (!courseMap.has(code)) {
      const isFree = FREE_ELECTIVE_CODES.has(code);
      courseMap.set(code, {
        courseCode: code,
        courseName: off.courseName,
        branchTaught: off.branchTaught,
        academicYear: off.academicYear,
        electiveType: isFree ? "FREE" : "EL-1",
        teachers: []
      });
    }
    courseMap.get(code).teachers.push({
      teacherId: off.teacher.user.id,
      fullName: off.teacher.fullName,
      ltp: off.ltp || "L"
    });
  }

  return Array.from(courseMap.values());
};

export const getEligibleTeachersForStudent = async ({ batch, branch, studentUserId, electives }) => {
  const normalizedBatch = batch ? batch.trim().toUpperCase() : "";
  let normalizedBranch = branch ? branch.trim().toUpperCase() : "";

  // Hardcode branch mappings based on batch letter
  if (normalizedBatch.includes('Q')) {
    normalizedBranch = 'COPC';
  } else if (normalizedBatch.includes('C') && !normalizedBatch.includes('COPC')) {
    normalizedBranch = 'COE';
  }

  // Determine student's chosen electives (if any)
  let studentElectives = [];
  if (Array.isArray(electives)) {
    studentElectives = electives;
  } else if (typeof electives === 'string' && electives.trim()) {
    studentElectives = electives.split(",").map(s => s.trim());
  } else if (studentUserId) {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: studentUserId }
    });
    if (student?.selectedElectives) {
      studentElectives = student.selectedElectives;
    }
  }

  const selectedElectivesSet = new Set(
    studentElectives
      .map(e => String(e).trim().toUpperCase())
      .filter(e => e && e !== "NONE" && e !== "NULL")
  );

  // Use cached offerings if fresh (< 60s)
  const now = Date.now();
  if (!cachedAllOfferings || now - lastOfferingsFetchTime > OFFERINGS_CACHE_TTL) {
    cachedAllOfferings = await prisma.courseOffering.findMany({
      include: {
        teacher: {
          include: {
            user: {
              select: {
                id: true,
                email: true
              }
            }
          }
        }
      }
    });
    lastOfferingsFetchTime = now;
  }

  const allOfferings = cachedAllOfferings;

  const BRANCH_ALIASES = {
    "COE": ["COMPUTER ENGG", "COMPUTER ENGINEERING"],
    "CSE": ["COMPUTER SCIENCE", "COMPUTER SCIENCE AND ENGG", "COMPUTER SCIENCE AND ENGINEERING"],
    "COPC": ["COMPUTER SCIENCE", "COMPUTER SCIENCE AND ENGG", "COMPUTER SCIENCE AND ENGINEERING"],
    "ENC": ["ELECTRONICS AND COMPUTER", "ELECTRONICS AND COMPUTER ENGG"],
    "ECE": ["ELECTRONICS AND COMMUNICATION", "ELECTRONICS AND COMMUNICATION ENGG"],
    "EIC": ["ELECTRONICS INSTRUMENTATION", "ELECTRONICS INSTRUMENTATION ENGG"],
    "ELE": ["ELECTRICAL", "ELECTRICAL ENGG"],
    "MEC": ["MECHANICAL", "MECHANICAL ENGG"],
    "CIV": ["CIVIL", "CIVIL ENGG"],
    "CHE": ["CHEMICAL", "CHEMICAL ENGG"],
    "BIO": ["BIOTECHNOLOGY", "BIOTECHNOLOGY ENGG"]
  };

  // Filter matching batch/branch for core, or matching student's enrolled electives
  const filteredOfferings = allOfferings.filter((off) => {
    // 1. If this offering is an ELECTIVE:
    if (off.isElective) {
      // It ONLY matches if the student explicitly selected this courseCode!
      // If student has None or didn't select this elective, skip!
      if (!selectedElectivesSet.has(off.courseCode.trim().toUpperCase())) {
        return false;
      }
      return true;
    }

    // 2. Otherwise it is a CORE course: match by batch and branch
    const batches = off.batchTaught.split(",").map((b) => b.trim().toUpperCase());
    const isSpecificBatchMatch = batches.includes(normalizedBatch) || off.batchTaught === normalizedBatch;
    const isAllBatch = off.batchTaught === "ALL";

    if (!isSpecificBatchMatch && !isAllBatch) return false;

    // If it's a specific batch match (e.g., 3C11 or 3Q11), in Thapar that batch uniquely belongs to that curriculum!
    if (isSpecificBatchMatch) return true;

    if (off.branchTaught === "ALL") return true;
    if (!normalizedBranch) return true;
    const branches = off.branchTaught.split(",").map((b) => b.trim().toUpperCase());
    
    // Check direct equality or bidirectional substring
    const directMatch = branches.includes(normalizedBranch) || off.branchTaught.includes(normalizedBranch) || normalizedBranch.includes(off.branchTaught);
    if (directMatch) return true;

    // Check acronym aliases
    for (const [alias, aliasList] of Object.entries(BRANCH_ALIASES)) {
      if (normalizedBranch.includes(alias)) {
        if (aliasList.some((alt) => off.branchTaught.includes(alt) || branches.includes(alt))) {
          return true;
        }
      }
    }

    return false;
  });

  // Group by teacher
  const teacherMap = new Map();

  for (const off of filteredOfferings) {
    const teacherId = off.teacher.user.id;
    if (!teacherMap.has(teacherId)) {
      teacherMap.set(teacherId, {
        userId: off.teacher.user.id,
        email: off.teacher.user.email,
        fullName: off.teacher.fullName,
        department: off.teacher.department,
        designation: off.teacher.designation,
        linkedIn: off.teacher.linkedIn,
        thaparProfileUrl: off.teacher.thaparProfileUrl,
        photoUrl: off.teacher.photoUrl,
        roomNumber: off.teacher.roomNumber,
        courses: []
      });
    }

    teacherMap.get(teacherId).courses.push({
      id: off.id,
      courseCode: off.courseCode,
      courseName: off.courseName,
      batchTaught: off.batchTaught,
      branchTaught: off.branchTaught,
      ltp: off.ltp || "L",
      isElective: Boolean(off.isElective),
      academicYear: off.academicYear
    });
  }

  return Array.from(teacherMap.values());
};

export const verifyStudentTeacherEligibility = async ({ studentUserId, teacherUserId, courseCode }) => {
  const student = await prisma.studentProfile.findUnique({
    where: { userId: studentUserId }
  });

  if (!student) {
    return { eligible: false, reason: "Student profile not found" };
  }

  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId: teacherUserId },
    include: { offerings: true }
  });

  if (!teacher) {
    return { eligible: false, reason: "Teacher profile not found" };
  }

  let effectiveBranch = student.branch;
  if (student.batch.includes('Q')) {
    effectiveBranch = 'COPC';
  } else if (student.batch.includes('C') && !student.batch.includes('COPC')) {
    effectiveBranch = 'COE';
  }

  const selectedElectivesSet = new Set(
    (student.selectedElectives || [])
      .map(e => String(e).trim().toUpperCase())
      .filter(e => e && e !== "NONE")
  );

  // Check if teacher has any offering matching student's batch or chosen electives
  const matchingOffering = teacher.offerings.find((off) => {
    // If it's an elective
    if (off.isElective) {
      if (!selectedElectivesSet.has(off.courseCode.trim().toUpperCase())) {
        return false;
      }
      const courseMatches = !courseCode || off.courseCode === courseCode.toUpperCase();
      return courseMatches;
    }

    // Otherwise core course
    const batches = off.batchTaught.split(",").map((b) => b.trim().toUpperCase());
    const isSpecificBatchMatch = batches.includes(student.batch) || off.batchTaught === student.batch;
    const isAllBatch = off.batchTaught === "ALL";

    if (!isSpecificBatchMatch && !isAllBatch) return false;
    
    // If specific batch match, in Thapar this batch uniquely belongs to that curriculum!
    if (isSpecificBatchMatch) {
      const courseMatches = !courseCode || off.courseCode === courseCode.toUpperCase();
      return courseMatches;
    }

    const branches = off.branchTaught.split(",").map((b) => b.trim().toUpperCase());
    const branchMatches = off.branchTaught === "ALL" || branches.includes(effectiveBranch) || off.branchTaught.includes(effectiveBranch);
    const courseMatches = !courseCode || off.courseCode === courseCode.toUpperCase();
    return branchMatches && courseMatches;
  });

  if (!matchingOffering && teacher.offerings.length > 0) {
    return {
      eligible: false,
      reason: `Teacher is not registered as having taught batch ${student.batch} (${effectiveBranch}) or your selected electives.`
    };
  }

  return {
    eligible: true,
    matchingCourse: matchingOffering || null
  };
};

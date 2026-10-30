import {
  saveStudentProfile,
  updateStudentElectives,
  saveTeacherProfile,
  getAllTeachers,
  getTeacherById,
  getTeacherBySlug
} from "../services/profileService.js";

export const onboardStudent = async (req, res) => {
  try {
    const { fullName, rollNumber, branch, batch, yearOfStudy, selectedElectives } = req.body;

    const profile = await saveStudentProfile({
      userId: req.user.id,
      fullName,
      rollNumber,
      branch,
      batch: batch || req.user.detectedBatch,
      yearOfStudy,
      selectedElectives: selectedElectives || []
    });

    return res.status(200).json({
      success: true,
      message: "Student profile saved successfully",
      profile
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

export const updateElectives = async (req, res) => {
  try {
    const { selectedElectives } = req.body;
    const profile = await updateStudentElectives({
      userId: req.user.id,
      selectedElectives
    });

    return res.status(200).json({
      success: true,
      message: "Elective courses updated successfully",
      profile
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

export const onboardTeacher = async (req, res) => {
  try {
    const { fullName, department, designation, offerings } = req.body;

    const profile = await saveTeacherProfile({
      userId: req.user.id,
      fullName,
      department,
      designation,
      offerings
    });

    return res.status(200).json({
      success: true,
      message: "Teacher profile saved successfully",
      profile
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

import prisma from "../lib/prisma.js";

let allTeachersCache = null;
let allTeachersCacheTime = 0;
const TEACHERS_CACHE_TTL = 60 * 1000;

export const invalidateTeachersCache = () => {
  allTeachersCache = null;
  allTeachersCacheTime = 0;
};

export const listTeachers = async (req, res) => {
  try {
    if (allTeachersCache && Date.now() - allTeachersCacheTime < TEACHERS_CACHE_TTL) {
      return res.status(200).json({ teachers: allTeachersCache });
    }

    const teachers = await getAllTeachers();
    allTeachersCache = teachers;
    allTeachersCacheTime = Date.now();

    return res.status(200).json({ teachers });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch teachers" });
  }
};

export const getTeacherProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = (await getTeacherById(id)) || (await getTeacherBySlug(id));
    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }
    return res.status(200).json({ teacher });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch teacher profile" });
  }
};

export const suggestTeacherName = async (req, res) => {
  try {
    const { id } = req.params; // teacherId (TeacherProfile id or userId)
    const {
      suggestedName,
      suggestedDept,
      suggestedCourseCode,
      suggestedCourseName,
      suggestedLtp,
      suggestedBatchTaught,
      suggestedBranchTaught,
      courseOfferingId,
      notes,
      suggestedRoomNo,
      suggestedLinkedIn,
      suggestedThaparProfileUrl,
      suggestedPhotoUrl
    } = req.body;

    if (!suggestedName && !suggestedRoomNo && !suggestedLinkedIn && !suggestedThaparProfileUrl && !suggestedPhotoUrl && !suggestedDept && !suggestedCourseCode && !suggestedCourseName && !suggestedLtp && !suggestedBatchTaught && !suggestedBranchTaught) {
      return res.status(400).json({ error: "At least one suggestion field must be provided." });
    }

    // Find teacher
    const teacher = await prisma.teacherProfile.findFirst({
      where: {
        OR: [{ id }, { userId: id }]
      },
      include: { offerings: true }
    });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    // Fetch submitting student profile to check CR status and roll number
    const student = await prisma.studentProfile.findUnique({
      where: { userId: req.user.id }
    });

    const isCR = student ? student.isCR : false;
    const studentBatch = student ? student.batch : null;

    const suggestion = await prisma.teacherNameSuggestion.create({
      data: {
        teacherId: teacher.id,
        suggestedName: suggestedName ? suggestedName.trim() : null,
        suggestedDept: suggestedDept ? suggestedDept.trim() : null,
        suggestedRoomNo: suggestedRoomNo ? suggestedRoomNo.trim() : null,
        suggestedLinkedIn: suggestedLinkedIn ? suggestedLinkedIn.trim() : null,
        suggestedThaparProfileUrl: suggestedThaparProfileUrl ? suggestedThaparProfileUrl.trim() : null,
        suggestedPhotoUrl: suggestedPhotoUrl ? suggestedPhotoUrl.trim() : null,
        suggestedCourseCode: suggestedCourseCode ? suggestedCourseCode.trim().toUpperCase() : null,
        suggestedCourseName: suggestedCourseName ? suggestedCourseName.trim() : null,
        suggestedLtp: suggestedLtp ? suggestedLtp.trim().toUpperCase() : null,
        suggestedBatchTaught: suggestedBatchTaught ? suggestedBatchTaught.trim().toUpperCase() : null,
        suggestedBranchTaught: suggestedBranchTaught ? suggestedBranchTaught.trim().toUpperCase() : null,
        courseOfferingId: courseOfferingId || null,
        notes: notes?.trim() || null,
        studentId: req.user.id,
        studentRollNo: student?.rollNumber || null,
        studentEmail: req.user.email || null,
        isCR: Boolean(isCR),
        batch: studentBatch,
        status: "PENDING"
      }
    });

    return res.status(201).json({
      success: true,
      message: isCR
        ? "Submitted as Official Batch CR! Prioritized for admin approval."
        : "Suggestion submitted successfully for campus verification.",
      suggestion
    });
  } catch (error) {
    console.error("Failed to submit teacher name suggestion:", error);
    return res.status(500).json({ error: error.message || "Failed to submit suggestion" });
  }
};

/**
 * Student / CR batch change request
 * Students can request a batch change with reason and optional CR email/ID.
 * Admin verifies and approves/rejects it.
 */
export const requestBatchChange = async (req, res) => {
  try {
    const { requestedBatch, requestedBranch, reason, crEmail, targetRollNo } = req.body;

    if (!requestedBatch || !requestedBatch.trim()) {
      return res.status(400).json({ error: "Requested batch is required" });
    }

    const currentStudent = await prisma.studentProfile.findUnique({
      where: { userId: req.user.id }
    });

    if (!currentStudent) {
      return res.status(404).json({ error: "Student profile not found" });
    }

    let targetStudent = currentStudent;
    let submittedByCR = false;

    // If targetRollNo provided, verify that the submitter is a CR
    if (targetRollNo && targetRollNo.trim() && targetRollNo.trim() !== currentStudent.rollNumber) {
      if (!currentStudent.isCR) {
        return res.status(403).json({ error: "Only a designated Class Representative (CR) can submit batch requests on behalf of other students." });
      }

      const foundTarget = await prisma.studentProfile.findFirst({
        where: { rollNumber: targetRollNo.trim() }
      });

      if (!foundTarget) {
        return res.status(404).json({ error: `Student with roll number ${targetRollNo} not found.` });
      }

      targetStudent = foundTarget;
      submittedByCR = true;
    } else if (currentStudent.isCR) {
      submittedByCR = true;
    }

    // Check if there is already a pending request for the target student
    const existing = await prisma.batchChangeRequest.findFirst({
      where: {
        studentId: targetStudent.userId,
        status: "PENDING"
      }
    });

    if (existing) {
      return res.status(400).json({
        error: `There is already a pending batch change request for student ${targetStudent.rollNumber}. Please wait for admin approval.`
      });
    }

    // Limit to twice in 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const recentRequestsCount = await prisma.batchChangeRequest.count({
      where: {
        studentId: targetStudent.userId,
        createdAt: {
          gte: sixMonthsAgo
        }
      }
    });

    if (recentRequestsCount >= 2) {
      return res.status(429).json({
        error: "A student can only apply for a batch change twice in a 6-month period."
      });
    }

    // Create the request
    const batchReq = await prisma.batchChangeRequest.create({
      data: {
        studentId: targetStudent.userId,
        studentRollNo: targetStudent.rollNumber,
        studentName: targetStudent.fullName || null,
        currentBatch: targetStudent.batch,
        requestedBatch: requestedBatch.trim().toUpperCase(),
        currentBranch: targetStudent.branch,
        requestedBranch: requestedBranch ? requestedBranch.trim() : targetStudent.branch,
        reason: reason ? reason.trim() : null,
        crId: submittedByCR ? req.user.id : null,
        crEmail: submittedByCR ? (req.user.email || null) : (crEmail ? crEmail.trim().toLowerCase() : null),
        status: "PENDING"
      }
    });

    return res.status(201).json({
      success: true,
      message: submittedByCR
        ? `Batch change request for student ${targetStudent.rollNumber} submitted with CR verification! Sent to Admin for final approval.`
        : "Batch change request submitted! It will be verified by the Batch CR and confirmed by the Admin.",
      request: batchReq
    });
  } catch (error) {
    console.error("Failed to request batch change:", error);
    return res.status(500).json({ error: "Failed to submit batch change request: " + error.message });
  }
};

export const getMyBatchRequests = async (req, res) => {
  try {
    const requests = await prisma.batchChangeRequest.findMany({
      where: { studentId: req.user.id },
      orderBy: { createdAt: "desc" }
    });
    return res.status(200).json({ requests });
  } catch (error) {
    console.error("Failed to fetch student batch requests:", error);
    return res.status(500).json({ error: "Failed to fetch requests" });
  }
};

export const getCRBatchRequests = async (req, res) => {
  try {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: req.user.id }
    });
    if (!student || !student.isCR) {
      return res.status(403).json({ error: "Only Class Representatives can view batch change requests." });
    }

    const requests = await prisma.batchChangeRequest.findMany({
      where: {
        OR: [
          { currentBatch: student.batch },
          { requestedBatch: student.batch },
          { crId: req.user.id }
        ]
      },
      orderBy: { createdAt: "desc" }
    });

    return res.status(200).json({ requests });
  } catch (error) {
    console.error("Failed to fetch CR batch requests:", error);
    return res.status(500).json({ error: "Failed to fetch requests" });
  }
};

// XP rises when a student posts a review, so a live name + XP list would let anyone match a new
// "anonymous" review to its author. Names are shown, but the list is only visible to signed-in
// users, never includes roll numbers or IDs, and is rebuilt at most once a day so individual XP
// jumps cannot be timed against new reviews.
let leaderboardCache = null;
let leaderboardCacheTime = 0;
const LEADERBOARD_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const toInitials = (fullName) => {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Student";
  const letters = parts.length === 1 ? [parts[0]] : [parts[0], parts[parts.length - 1]];
  return letters.map((p) => `${p[0].toUpperCase()}.`).join(" ");
};

const effectiveBranch = (batch, branch) => {
  const b = (batch || "").toUpperCase();
  if (b.includes("Q")) return "COPC";
  if (b.includes("C") && !b.includes("COPC")) return "COE";
  return branch || null;
};

export const getStudentLeaderboard = async (req, res) => {
  try {
    if (!leaderboardCache || Date.now() - leaderboardCacheTime >= LEADERBOARD_CACHE_TTL) {
      const topStudents = await prisma.studentProfile.findMany({
        where: {
          xp: { gt: 0 }
        },
        orderBy: { xp: "desc" },
        take: 50,
        select: {
          userId: true,
          fullName: true,
          batch: true,
          branch: true,
          xp: true
        }
      });

      leaderboardCache = topStudents.map((s, idx) => ({
        userId: s.userId,
        rank: idx + 1,
        fullName: s.fullName?.trim() || null,
        initials: toInitials(s.fullName),
        branch: effectiveBranch(s.batch, s.branch),
        xp: s.xp
      }));
      leaderboardCacheTime = Date.now();
    }

    // userId stays server-side; the caller only learns which row is their own
    const leaderboard = leaderboardCache.map(({ userId, ...entry }) => ({
      ...entry,
      isYou: userId === req.user.id
    }));

    return res.status(200).json({ leaderboard });
  } catch (error) {
    console.error("Failed to fetch student leaderboard:", error);
    return res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
};

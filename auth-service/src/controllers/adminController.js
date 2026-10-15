import prisma from "../lib/prisma.js";
import { invalidateTeachersCache } from "./profileController.js";

export const getStudents = async (req, res) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: "STUDENT" },
      include: { studentProfile: true },
      orderBy: { 
        studentProfile: {
          rollNumber: 'asc'
        }
      }
    });
    res.status(200).json({ students });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch students" });
  }
};

export const banUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { isBanned } = req.body;

    // Search user by user.id
    let targetUser = await prisma.user.findUnique({ where: { id } });

    // Fallback search: studentProfile id or rollNumber
    if (!targetUser) {
      const studentProfile = await prisma.studentProfile.findFirst({
        where: {
          OR: [{ id }, { rollNumber: id }]
        }
      });
      if (studentProfile) {
        targetUser = await prisma.user.findUnique({ where: { id: studentProfile.userId } });
      }
    }

    // Fallback search: teacherProfile id
    if (!targetUser) {
      const teacherProfile = await prisma.teacherProfile.findUnique({ where: { id } });
      if (teacherProfile) {
        targetUser = await prisma.user.findUnique({ where: { id: teacherProfile.userId } });
      }
    }

    // Fallback search: by email
    if (!targetUser && typeof id === 'string' && id.includes('@')) {
      targetUser = await prisma.user.findUnique({ where: { email: id.toLowerCase().trim() } });
    }

    if (!targetUser) {
      return res.status(404).json({ error: "User account not found" });
    }

    if (targetUser.role === "ADMIN") {
      return res.status(400).json({ error: "Administrator accounts cannot be banned." });
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUser.id },
      data: { isBanned: Boolean(isBanned) }
    });

    res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Failed to update ban status:", error);
    res.status(500).json({ error: "Failed to update ban status: " + (error.message || "Unknown error") });
  }
};

export const registerTeacher = async (req, res) => {
  try {
    const { fullName, email, department, designation } = req.body;

    const normalized = email.trim().toLowerCase();
    
    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email: normalized } });
    if (existing) {
      return res.status(400).json({ error: "User with this email already exists." });
    }

    // Create user with PENDING password
    const user = await prisma.user.create({
      data: {
        email: normalized,
        passwordHash: "PENDING",
        role: "TEACHER",
        isEmailVerified: false,
        isProfileComplete: true, // we complete profile right away
        teacherProfile: {
          create: {
            fullName,
            department,
            designation
          }
        }
      },
      include: { teacherProfile: true }
    });

    res.status(201).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: "Failed to register teacher" });
  }
};

export const deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Find teacher profile by profile id OR by userId
    const teacherProfile = await prisma.teacherProfile.findFirst({
      where: {
        OR: [
          { id },
          { userId: id }
        ]
      }
    });

    const targetUserId = teacherProfile?.userId || id;
    const profileId = teacherProfile?.id;

    if (!teacherProfile && !targetUserId) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    // 2. Cascade cleanup related child records concurrently first
    const childTasks = [];

    if (profileId) {
      childTasks.push(
        prisma.courseOffering.deleteMany({ where: { teacherId: profileId } }),
        prisma.teacherNameSuggestion.deleteMany({ where: { teacherId: profileId } })
      );
    }

    const revieweeIds = [
      ...(targetUserId ? [targetUserId] : []),
      ...(profileId && profileId !== targetUserId ? [profileId] : [])
    ];

    if (revieweeIds.length > 0) {
      childTasks.push(
        prisma.profileRating.deleteMany({ where: { userId: { in: revieweeIds } } }),
        prisma.review.deleteMany({ where: { revieweeId: { in: revieweeIds } } })
      );
    }

    if (childTasks.length > 0) {
      await Promise.allSettled(childTasks);
    }

    // 3. Remove teacherProfile and user records safely
    if (profileId) {
      await prisma.teacherProfile.deleteMany({ where: { id: profileId } }).catch(err => console.warn('TeacherProfile delete warning:', err.message));
    }

    if (targetUserId) {
      await prisma.user.deleteMany({ where: { id: targetUserId } }).catch(err => console.warn('User delete warning:', err.message));
    }

    res.status(200).json({ success: true, message: "Teacher deleted successfully" });
  } catch (error) {
    console.error("Failed to delete teacher:", error);
    res.status(500).json({ error: error.message || "Failed to delete teacher" });
  }
};

export const getTeacherCourses = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find teacher profile first by userId or profile id
    const teacherProfile = await prisma.teacherProfile.findFirst({
      where: {
        OR: [
          { userId: id },
          { id }
        ]
      }
    });
    
    if (!teacherProfile) return res.status(404).json({ error: "Teacher profile not found" });

    const courses = await prisma.courseOffering.findMany({
      where: { teacherId: teacherProfile.id }
    });
    res.status(200).json({ courses });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch courses" });
  }
};

export const addTeacherCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { courseCode, courseName, batchTaught, branchTaught, academicYear, ltp } = req.body;
    
    // Find teacher profile first by userId or profile id
    const teacherProfile = await prisma.teacherProfile.findFirst({
      where: {
        OR: [
          { userId: id },
          { id }
        ]
      }
    });
    
    if (!teacherProfile) return res.status(404).json({ error: "Teacher profile not found" });

    const course = await prisma.courseOffering.create({
      data: {
        teacherId: teacherProfile.id,
        courseCode,
        courseName,
        batchTaught,
        branchTaught,
        academicYear,
        ltp: ltp || "L"
      }
    });
    res.status(201).json({ course });
  } catch (error) {
    res.status(500).json({ error: "Failed to add course" });
  }
};

export const deleteTeacherCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    await prisma.courseOffering.delete({
      where: { id: courseId }
    });
    res.status(200).json({ message: "Course deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete course" });
  }
};

export const updateTeacherCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { courseCode, courseName, batchTaught, branchTaught, ltp, academicYear } = req.body;
    
    const updated = await prisma.courseOffering.update({
      where: { id: courseId },
      data: { courseCode, courseName, batchTaught, branchTaught, ltp, academicYear }
    });
    res.status(200).json({ message: "Course updated", course: updated });
  } catch (error) {
    res.status(500).json({ error: "Failed to update course" });
  }
};

export const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, rollNumber } = req.body;
    
    const updated = await prisma.studentProfile.update({
      where: { userId: id },
      data: { fullName, rollNumber }
    });
    res.status(200).json({ message: "Student updated", profile: updated });
  } catch (error) {
    res.status(500).json({ error: "Failed to update student" });
  }
};

export const updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, department, designation } = req.body;
    
    const teacherProfile = await prisma.teacherProfile.findFirst({
      where: {
        OR: [
          { userId: id },
          { id }
        ]
      }
    });

    if (!teacherProfile) return res.status(404).json({ error: "Teacher profile not found" });

    const updated = await prisma.teacherProfile.update({
      where: { id: teacherProfile.id },
      data: { fullName, department, designation }
    });
    res.status(200).json({ message: "Teacher updated", profile: updated });
  } catch (error) {
    res.status(500).json({ error: "Failed to update teacher" });
  }
};

export const getCommunityTags = async (req, res) => {
  try {
    const tags = await prisma.communityTag.findMany({ orderBy: { type: 'desc' } });
    res.status(200).json({ tags });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tags" });
  }
};

export const addCommunityTag = async (req, res) => {
  try {
    const { name, type, opposite } = req.body;
    const tag = await prisma.communityTag.create({ data: { name, type, opposite } });
    res.status(201).json({ tag });
  } catch (error) {
    res.status(500).json({ error: "Failed to add tag" });
  }
};

export const updateCommunityTag = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, opposite } = req.body;
    
    // Get old tag to cascade updates to reviews
    const oldTag = await prisma.communityTag.findUnique({ where: { id: parseInt(id) } });
    
    const tag = await prisma.communityTag.update({
      where: { id: parseInt(id) },
      data: { name, type, opposite }
    });
    
    // If the name changed, we MUST update all existing reviews so old tags don't get orphaned
    if (oldTag && oldTag.name !== name) {
      await prisma.$executeRaw`UPDATE "Review" SET "tags" = array_replace("tags", ${oldTag.name}, ${name})`;
    }
    
    res.status(200).json({ tag });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update tag" });
  }
};

export const deleteCommunityTag = async (req, res) => {
  try {
    const { id } = req.params;
    const oldTag = await prisma.communityTag.findUnique({ where: { id: parseInt(id) } });
    if (oldTag) {
      await prisma.$executeRaw`UPDATE "Review" SET "tags" = array_remove("tags", ${oldTag.name})`;
    }
    await prisma.communityTag.delete({ where: { id: parseInt(id) } });
    res.status(200).json({ message: "Tag deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete tag" });
  }
};

export const toggleStudentCR = async (req, res) => {
  try {
    const { id } = req.params;

    const studentProfile = await prisma.studentProfile.findFirst({
      where: {
        OR: [{ id }, { userId: id }]
      }
    });

    if (!studentProfile) {
      return res.status(404).json({ error: "Student profile not found" });
    }

    const updated = await prisma.studentProfile.update({
      where: { id: studentProfile.id },
      data: { isCR: !studentProfile.isCR }
    });

    res.status(200).json({
      message: `Student CR status set to ${updated.isCR}`,
      profile: updated
    });
  } catch (error) {
    console.error("Failed to toggle student CR:", error);
    res.status(500).json({ error: "Failed to toggle CR status" });
  }
};

export const getTeacherSuggestions = async (req, res) => {
  try {
    const suggestions = await prisma.teacherNameSuggestion.findMany({
      include: {
        teacher: {
          include: {
            offerings: true
          }
        }
      },
      orderBy: [
        { isCR: "desc" },
        { createdAt: "desc" }
      ]
    });

    const studentIds = [...new Set(suggestions.map(s => s.studentId).filter(Boolean))];
    const studentProfiles = await prisma.studentProfile.findMany({
      where: { userId: { in: studentIds } },
      select: { userId: true, fullName: true }
    });

    const studentMap = new Map(studentProfiles.map(p => [p.userId, p.fullName]));

    const enrichedSuggestions = suggestions.map(s => ({
      ...s,
      studentName: studentMap.get(s.studentId) || 'Unknown Student'
    }));

    res.status(200).json({ suggestions: enrichedSuggestions });
  } catch (error) {
    console.error("Failed to fetch teacher suggestions:", error);
    res.status(500).json({ error: "Failed to fetch suggestions" });
  }
};

export const approveTeacherSuggestion = async (req, res) => {
  try {
    const { id } = req.params;

    const suggestion = await prisma.teacherNameSuggestion.findUnique({
      where: { id },
      include: { teacher: true }
    });

    if (!suggestion) {
      return res.status(404).json({ error: "Suggestion not found" });
    }

    const updateData = {};
    if (suggestion.suggestedName) updateData.fullName = suggestion.suggestedName;
    if (suggestion.suggestedDept) updateData.department = suggestion.suggestedDept;
    if (suggestion.suggestedRoomNo) updateData.roomNumber = suggestion.suggestedRoomNo;
    if (suggestion.suggestedLinkedIn) updateData.linkedIn = suggestion.suggestedLinkedIn;
    if (suggestion.suggestedThaparProfileUrl) updateData.thaparProfileUrl = suggestion.suggestedThaparProfileUrl;
    if (suggestion.suggestedPhotoUrl) updateData.photoUrl = suggestion.suggestedPhotoUrl;

    const updatedTeacher = await prisma.teacherProfile.update({
      where: { id: suggestion.teacherId },
      data: updateData
    });

    // If suggestion includes course code / name / LTP, either update existing or create new course offering
    if (suggestion.suggestedCourseCode || suggestion.suggestedLtp || suggestion.suggestedCourseName) {
      try {
        // Extract batch/branch from notes if they exist
        let suggestedBatch = "ALL";
        let suggestedBranch = "ALL";
        if (suggestion.notes && suggestion.notes.includes("[COURSE_META:")) {
          const matchBatch = suggestion.notes.match(/batch=([^,\]]+)/);
          const matchBranch = suggestion.notes.match(/branch=([^,\]]+)/);
          if (matchBatch) suggestedBatch = matchBatch[1].trim();
          if (matchBranch) suggestedBranch = matchBranch[1].trim();
        }

        if (suggestion.courseOfferingId) {
          await prisma.courseOffering.update({
            where: { id: suggestion.courseOfferingId },
            data: {
              ...(suggestion.suggestedCourseCode ? { courseCode: suggestion.suggestedCourseCode } : {}),
              ...(suggestion.suggestedCourseName ? { courseName: suggestion.suggestedCourseName } : {}),
              ...(suggestion.suggestedLtp ? { ltp: suggestion.suggestedLtp } : {}),
              batchTaught: suggestedBatch !== "ALL" ? suggestedBatch : undefined,
              branchTaught: suggestedBranch !== "ALL" ? suggestedBranch : undefined
            }
          });
        } else if (suggestion.suggestedCourseCode) {
          // Create new course offering
          await prisma.courseOffering.create({
            data: {
              teacherId: suggestion.teacherId,
              courseCode: suggestion.suggestedCourseCode,
              courseName: suggestion.suggestedCourseName || suggestion.suggestedCourseCode,
              ltp: suggestion.suggestedLtp || 'L',
              batchTaught: suggestedBatch,
              branchTaught: suggestedBranch,
              academicYear: "2026-2027 ODD", // default current year
              isCurrentSemester: true
            }
          });
        }
      } catch (err) {
        console.warn("Could not process course offering for suggestion:", err.message);
      }
    }

    // Award XP to the student who submitted the suggestion
    if (suggestion.studentId) {
      try {
        // Base XP is 10, bonus +5 for each detailed field (room, linkedin, photo)
        let xpReward = 10;
        if (suggestion.suggestedRoomNo) xpReward += 5;
        if (suggestion.suggestedLinkedIn) xpReward += 5;
        if (suggestion.suggestedThaparProfileUrl) xpReward += 5;
        if (suggestion.suggestedPhotoUrl) xpReward += 10;
        
        // If CR, they get double XP
        if (suggestion.isCR) xpReward *= 2;

        await prisma.studentProfile.update({
          where: { userId: suggestion.studentId },
          data: { xp: { increment: xpReward } }
        });
      } catch (err) {
        console.warn("Could not award XP to student:", err.message);
      }
    }

    const updatedSuggestion = await prisma.teacherNameSuggestion.update({
      where: { id },
      data: { status: "APPROVED" }
    });

    invalidateTeachersCache();

    res.status(200).json({
      message: "Suggestion approved: Teacher and course details updated campus-wide",
      teacher: updatedTeacher,
      suggestion: updatedSuggestion
    });
  } catch (error) {
    console.error("Failed to approve suggestion:", error);
    res.status(500).json({ error: "Failed to approve suggestion" });
  }
};

export const rejectTeacherSuggestion = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await prisma.teacherNameSuggestion.update({
      where: { id },
      data: { status: "REJECTED" }
    });

    res.status(200).json({ message: "Suggestion rejected", suggestion: updated });
  } catch (error) {
    console.error("Failed to reject suggestion:", error);
    res.status(500).json({ error: "Failed to reject suggestion" });
  }
};

/**
 * 6-Month Semester Rollover & Timetable Ingestion Engine
 * Non-destructive: Archives past semester offerings (isCurrentSemester: false)
 * and ingests new semester offerings with full batch/course mappings.
 */
export const rolloverSemester = async (req, res) => {
  try {
    const { newAcademicYear, offerings = [], archivePrevious = true } = req.body;

    if (!newAcademicYear || !newAcademicYear.trim()) {
      return res.status(400).json({ error: "New academic semester name is required (e.g. 2026-2027 EVEN)" });
    }

    const targetYear = newAcademicYear.trim();

    // 1. Archive previous active semester if requested
    let archivedCount = 0;
    if (archivePrevious) {
      const archiveRes = await prisma.courseOffering.updateMany({
        where: { isCurrentSemester: true },
        data: { isCurrentSemester: false }
      });
      archivedCount = archiveRes.count;
    }

    // 2. Process incoming course offerings
    let createdCount = 0;
    let matchedTeachersCount = 0;

    if (Array.isArray(offerings) && offerings.length > 0) {
      // Map all existing teachers by code or name
      const teachers = await prisma.teacherProfile.findMany({
        include: { user: true }
      });

      const teacherMap = new Map();
      teachers.forEach(t => {
        teacherMap.set(t.fullName.toLowerCase().trim(), t.id);
        if (t.user?.email) {
          const prefix = t.user.email.split('@')[0].toLowerCase();
          teacherMap.set(prefix, t.id);
        }
      });

      const offeringsToInsert = [];

      for (const off of offerings) {
        let teacherId = off.teacherId;

        // Auto-match teacher by code or name if teacherId not directly provided
        if (!teacherId && off.teacherIdentifier) {
          const ident = off.teacherIdentifier.toLowerCase().trim();
          teacherId = teacherMap.get(ident);
        }

        if (teacherId) {
          matchedTeachersCount++;
          offeringsToInsert.push({
            teacherId,
            courseCode: (off.courseCode || 'GEN').toUpperCase().trim(),
            courseName: (off.courseName || off.courseCode || 'General Course').trim(),
            batchTaught: (off.batchTaught || 'ALL').toUpperCase().trim(),
            branchTaught: (off.branchTaught || 'ALL').toUpperCase().trim(),
            academicYear: targetYear,
            ltp: off.ltp || 'L',
            isCurrentSemester: true
          });
        }
      }

      if (offeringsToInsert.length > 0) {
        const createRes = await prisma.courseOffering.createMany({
          data: offeringsToInsert,
          skipDuplicates: true
        });
        createdCount = createRes.count;
      }
    }

    invalidateTeachersCache();

    return res.status(200).json({
      success: true,
      message: `Successfully rolled over to ${targetYear}!`,
      details: {
        newAcademicYear: targetYear,
        archivedPreviousOfferings: archivedCount,
        newOfferingsCreated: createdCount,
        teachersMatched: matchedTeachersCount
      }
    });
  } catch (error) {
    console.error("Semester rollover failed:", error);
    return res.status(500).json({ error: "Failed to perform semester rollover: " + error.message });
  }
};

export const getSemesterStats = async (req, res) => {
  try {
    const [currentCount, archivedCount, activeSemesters] = await Promise.all([
      prisma.courseOffering.count({ where: { isCurrentSemester: true } }),
      prisma.courseOffering.count({ where: { isCurrentSemester: false } }),
      prisma.courseOffering.findMany({
        where: { isCurrentSemester: true },
        select: { academicYear: true },
        distinct: ['academicYear']
      })
    ]);

    const activeSemName = activeSemesters.length > 0 ? activeSemesters[0].academicYear : '2026-2027 ODD';

    return res.status(200).json({
      currentSemester: activeSemName,
      activeOfferings: currentCount,
      archivedOfferings: archivedCount
    });
  } catch (error) {
    console.error("Failed to fetch semester stats:", error);
    return res.status(500).json({ error: "Failed to fetch semester stats" });
  }
};

export const getBatchChangeRequests = async (req, res) => {
  try {
    const requests = await prisma.batchChangeRequest.findMany({
      orderBy: { createdAt: "desc" }
    });
    return res.status(200).json({ requests });
  } catch (error) {
    console.error("Failed to fetch batch change requests:", error);
    return res.status(500).json({ error: "Failed to fetch batch change requests" });
  }
};

export const approveBatchChangeRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await prisma.batchChangeRequest.findUnique({
      where: { id }
    });

    if (!request) {
      return res.status(404).json({ error: "Batch change request not found" });
    }

    if (request.status !== "PENDING") {
      return res.status(400).json({ error: `Request has already been ${request.status.toLowerCase()}` });
    }

    // Update the student profile with the approved batch and branch
    await prisma.studentProfile.update({
      where: { userId: request.studentId },
      data: {
        batch: request.requestedBatch,
        ...(request.requestedBranch ? { branch: request.requestedBranch } : {})
      }
    });

    const updated = await prisma.batchChangeRequest.update({
      where: { id },
      data: { status: "APPROVED" }
    });

    return res.status(200).json({
      success: true,
      message: `Batch change approved! Student ${request.studentRollNo} has been assigned to batch ${request.requestedBatch}.`,
      request: updated
    });
  } catch (error) {
    console.error("Failed to approve batch change request:", error);
    return res.status(500).json({ error: "Failed to approve batch change request: " + error.message });
  }
};

export const rejectBatchChangeRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const request = await prisma.batchChangeRequest.findUnique({
      where: { id }
    });

    if (!request) {
      return res.status(404).json({ error: "Batch change request not found" });
    }

    if (request.status !== "PENDING") {
      return res.status(400).json({ error: `Request has already been ${request.status.toLowerCase()}` });
    }

    const updated = await prisma.batchChangeRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        ...(reason ? { reason: `${request.reason ? request.reason + " | " : ""}Admin note: ${reason}` } : {})
      }
    });

    return res.status(200).json({
      success: true,
      message: `Batch change request for ${request.studentRollNo} rejected.`,
      request: updated
    });
  } catch (error) {
    console.error("Failed to reject batch change request:", error);
    return res.status(500).json({ error: "Failed to reject batch change request" });
  }
};

export const getCampusAnalytics = async (req, res) => {
  try {
    const { department, timeRange } = req.query; // optional filters

    // 1. Gather baseline counts
    const [totalStudents, totalFaculty, totalReviewsCount, allReviews, allRatings, teachers] = await Promise.all([
      prisma.studentProfile.count(),
      prisma.teacherProfile.count(),
      prisma.review.count({ where: { isFlagged: false } }),
      prisma.review.findMany({
        where: { isFlagged: false },
        select: {
          reviewId: true,
          rating: true,
          tags: true,
          createdAt: true,
          reviewerId: true,
          revieweeId: true,
          courseCode: true,
          reviewerBatch: true,
          reviewerBranch: true
        },
        orderBy: { createdAt: "asc" }
      }),
      prisma.profileRating.findMany(),
      prisma.teacherProfile.findMany({
        select: {
          id: true,
          userId: true,
          fullName: true,
          department: true,
          designation: true
        }
      })
    ]);

    // Build teacher lookup
    const teacherMap = new Map();
    teachers.forEach(t => {
      teacherMap.set(t.userId, t);
    });

    // Filter reviews by department if specified
    const filteredReviews = department && department !== "ALL"
      ? allReviews.filter(r => {
          const t = teacherMap.get(r.revieweeId);
          return t && (t.department.toLowerCase() === department.toLowerCase() || 
                       (department === "CSED" && (t.department.includes("Computer") || t.department.includes("COE"))));
        })
      : allReviews;

    // 2. Response rate & NPS calculation
    const activeStudentReviewers = new Set(filteredReviews.map(r => r.reviewerId)).size;
    const responseRate = totalStudents > 0 ? Math.min(100, Math.round((activeStudentReviewers / totalStudents) * 100)) : 0;

    let promoters = 0;
    let passives = 0;
    let detractors = 0;
    let totalScoreSum = 0;

    filteredReviews.forEach(r => {
      totalScoreSum += r.rating;
      if (r.rating >= 4) promoters++;
      else if (r.rating === 3) passives++;
      else detractors++;
    });

    const totalRated = filteredReviews.length;
    const campusAvgRating = totalRated > 0 ? Number((totalScoreSum / totalRated).toFixed(2)) : 0;
    const npsScore = totalRated > 0 ? Math.round(((promoters - detractors) / totalRated) * 100) : 0;

    // 3. Rating distribution (1, 2, 3, 4, 5 stars)
    const starCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    filteredReviews.forEach(r => {
      if (starCounts[r.rating] !== undefined) {
        starCounts[r.rating]++;
      }
    });

    const ratingDistribution = [
      { stars: "5 Stars", count: starCounts[5], percentage: totalRated > 0 ? Math.round((starCounts[5] / totalRated) * 100) : 0, color: "#22c55e" },
      { stars: "4 Stars", count: starCounts[4], percentage: totalRated > 0 ? Math.round((starCounts[4] / totalRated) * 100) : 0, color: "#84cc16" },
      { stars: "3 Stars", count: starCounts[3], percentage: totalRated > 0 ? Math.round((starCounts[3] / totalRated) * 100) : 0, color: "#eab308" },
      { stars: "2 Stars", count: starCounts[2], percentage: totalRated > 0 ? Math.round((starCounts[2] / totalRated) * 100) : 0, color: "#f97316" },
      { stars: "1 Star",  count: starCounts[1], percentage: totalRated > 0 ? Math.round((starCounts[1] / totalRated) * 100) : 0, color: "#ef4444" }
    ];

    // 4. Monthly / Periodic Rating Trends (Last 6 Months)
    const monthMap = new Map();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString("default", { month: "short" });
      monthMap.set(label, { month: label, totalRating: 0, count: 0, reviews: 0 });
    }

    filteredReviews.forEach(r => {
      const reviewDate = new Date(r.createdAt);
      const label = reviewDate.toLocaleString("default", { month: "short" });
      if (monthMap.has(label)) {
        const item = monthMap.get(label);
        item.totalRating += r.rating;
        item.count++;
        item.reviews++;
      }
    });

    const monthlyTrends = Array.from(monthMap.values()).map(m => ({
      month: m.month,
      avgRating: m.count > 0 ? Number((m.totalRating / m.count).toFixed(2)) : campusAvgRating,
      reviewsCount: m.reviews
    }));

    // 5. Department Breakdown & Benchmarks
    const deptStatsMap = new Map();
    teachers.forEach(t => {
      let deptKey = t.department || "General Engineering";
      if (deptKey.includes("Computer") || deptKey === "COE") deptKey = "Computer Science (CSED)";
      else if (deptKey.includes("Mechanical")) deptKey = "Mechanical (MED)";
      else if (deptKey.includes("Civil")) deptKey = "Civil (CED)";
      else if (deptKey.includes("Electrical") || deptKey.includes("Instrumentation")) deptKey = "Electrical & EIC (EED)";
      else deptKey = "Core Engineering (CED/MED)";

      if (!deptStatsMap.has(deptKey)) {
        deptStatsMap.set(deptKey, {
          department: deptKey,
          facultyCount: 0,
          totalReviews: 0,
          scoreSum: 0,
          teachersList: []
        });
      }
      const dEntry = deptStatsMap.get(deptKey);
      dEntry.facultyCount++;
      dEntry.teachersList.push(t.userId);
    });

    // Populate reviews into dept buckets
    const ratingMap = new Map();
    allRatings.forEach(r => ratingMap.set(r.userId, r));

    for (const [deptKey, dEntry] of deptStatsMap.entries()) {
      let deptReviews = 0;
      let deptSum = 0;
      dEntry.teachersList.forEach(userId => {
        const pRating = ratingMap.get(userId);
        if (pRating && pRating.totalReviews > 0) {
          deptReviews += pRating.totalReviews;
          deptSum += pRating.overallRating;
        }
      });
      dEntry.totalReviews = deptReviews;
      const ratedTeachers = dEntry.teachersList.filter(u => ratingMap.has(u) && ratingMap.get(u).totalReviews > 0).length;
      dEntry.avgRating = ratedTeachers > 0 ? Number((deptSum / ratedTeachers).toFixed(2)) : 3.8;
      delete dEntry.teachersList;
    }

    const departmentComparisons = Array.from(deptStatsMap.values()).sort((a, b) => b.avgRating - a.avgRating);

    // 6. Top Tags Distribution
    const tagFreq = {};
    filteredReviews.forEach(r => {
      if (Array.isArray(r.tags)) {
        r.tags.forEach(t => {
          tagFreq[t] = (tagFreq[t] || 0) + 1;
        });
      }
    });

    const topTags = Object.entries(tagFreq)
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalRated > 0 ? Math.round((count / totalRated) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // 7. Faculty At-Risk & Top Performers
    const ratedFaculty = teachers.map(t => {
      const r = ratingMap.get(t.userId);
      return {
        id: t.userId,
        fullName: t.fullName,
        department: t.department,
        designation: t.designation,
        overallRating: r ? r.overallRating : 0,
        recentRating: r ? r.recentRating : 0,
        totalReviews: r ? r.totalReviews : 0
      };
    }).filter(f => f.totalReviews > 0);

    const topFaculty = [...ratedFaculty].sort((a, b) => b.overallRating - a.overallRating).slice(0, 5);
    const atRiskFaculty = ratedFaculty.filter(f => f.overallRating < 3.0).sort((a, b) => a.overallRating - b.overallRating);

    // 8. Weekly review volume heatmap (last 7 weeks)
    const weeklyHeatmap = [];
    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 27; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split("T")[0];
      const count = filteredReviews.filter(r => r.createdAt.toISOString().split("T")[0] === dateStr).length;
      weeklyHeatmap.push({
        date: dateStr,
        day: dayLabels[d.getDay()],
        count: count,
        level: count === 0 ? 0 : count < 3 ? 1 : count < 6 ? 2 : 3
      });
    }

    return res.status(200).json({
      success: true,
      metrics: {
        totalStudents,
        totalFaculty,
        totalReviews: totalRated,
        responseRate,
        campusAvgRating,
        npsScore,
        promotersPercentage: totalRated > 0 ? Math.round((promoters / totalRated) * 100) : 0,
        detractorsPercentage: totalRated > 0 ? Math.round((detractors / totalRated) * 100) : 0,
        passivesPercentage: totalRated > 0 ? Math.round((passives / totalRated) * 100) : 0,
        atRiskCount: atRiskFaculty.length
      },
      ratingDistribution,
      monthlyTrends,
      departmentComparisons,
      topTags,
      topFaculty,
      atRiskFaculty,
      weeklyHeatmap
    });
  } catch (error) {
    console.error("Failed to fetch campus analytics:", error);
    return res.status(500).json({ error: "Failed to load campus analytics: " + error.message });
  }
};




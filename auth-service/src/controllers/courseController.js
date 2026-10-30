import {
  addCourseOffering,
  updateCourseOffering,
  deleteCourseOffering,
  getTeacherOfferings,
  getEligibleTeachersForStudent,
  verifyStudentTeacherEligibility,
  getAvailableElectives
} from "../services/courseService.js";
import prisma from "../lib/prisma.js";
import { withPublicPhoto } from "../utils/teacherPhoto.js";

export const createOffering = async (req, res) => {
  try {
    const { courseCode, courseName, batchTaught, branchTaught, academicYear } = req.body;

    const offering = await addCourseOffering({
      teacherUserId: req.user.id,
      courseCode,
      courseName,
      batchTaught,
      branchTaught,
      academicYear
    });

    return res.status(201).json({
      success: true,
      message: "Course offering registered successfully",
      offering
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

export const updateOffering = async (req, res) => {
  try {
    const { id } = req.params;
    const { courseCode, courseName, batchTaught, branchTaught, academicYear } = req.body;

    const offering = await updateCourseOffering({
      offeringId: id,
      teacherUserId: req.user.id,
      courseCode,
      courseName,
      batchTaught,
      branchTaught,
      academicYear
    });

    return res.status(200).json({
      success: true,
      message: "Course offering updated successfully.",
      offering
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

export const deleteOffering = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await deleteCourseOffering({
      offeringId: id,
      teacherUserId: req.user.id
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

export const getMyOfferings = async (req, res) => {
  try {
    const offerings = await getTeacherOfferings(req.user.id);
    return res.status(200).json({ offerings });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch course offerings" });
  }
};

export const getElectives = async (req, res) => {
  try {
    const { branch, year } = req.query;
    const electives = await getAvailableElectives({ branch, year });
    return res.status(200).json({ electives });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to fetch electives" });
  }
};

const eligibleTeachersCache = new Map();
const ELIGIBLE_CACHE_TTL = 60 * 1000;

export const getEligibleTeachers = async (req, res) => {
  try {
    let batch = req.query.batch;
    let branch = req.query.branch;
    let electives = req.query.electives;

    if (req.user?.id) {
      const student = await prisma.studentProfile.findUnique({
        where: { userId: req.user.id }
      });
      if (student) {
        batch = batch || student.batch;
        branch = branch || student.branch;
        if (!electives && student.selectedElectives && student.selectedElectives.length > 0) {
          electives = student.selectedElectives;
        }
      }
    }

    if (!batch) {
      batch = req.user?.studentProfile?.batch || req.user?.detectedBatch || "3Q11";
      branch = branch || req.user?.studentProfile?.branch || "COE";
      if (!electives && req.user?.studentProfile?.selectedElectives) {
        electives = req.user.studentProfile.selectedElectives;
      }
    }

    const electivesKey = Array.isArray(electives) ? electives.sort().join(",") : (electives || "");
    const cacheKey = `${(batch || "").toUpperCase()}_${(branch || "").toUpperCase()}_${electivesKey.toUpperCase()}`;
    const cached = eligibleTeachersCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < ELIGIBLE_CACHE_TTL) {
      return res.status(200).json({ teachers: cached.data });
    }

    const teachers = (await getEligibleTeachersForStudent({
      batch,
      branch,
      studentUserId: req.user?.id,
      electives
    })).map((t) => withPublicPhoto(t, t.userId));
    eligibleTeachersCache.set(cacheKey, { data: teachers, timestamp: Date.now() });

    return res.status(200).json({ teachers });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to fetch eligible teachers" });
  }
};

export const checkEligibility = async (req, res) => {
  try {
    const { teacherId, courseCode } = req.query;
    if (!teacherId) {
      return res.status(400).json({ error: "Teacher ID is required." });
    }

    const result = await verifyStudentTeacherEligibility({
      studentUserId: req.user.id,
      teacherUserId: teacherId,
      courseCode
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

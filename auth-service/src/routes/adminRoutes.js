import express from "express";
import {
  getStudents,
  banUser,
  registerTeacher,
  deleteTeacher,
  getTeacherCourses,
  addTeacherCourse,
  deleteTeacherCourse,
  updateTeacherCourse,
  updateStudent,
  updateTeacher,
  getCommunityTags,
  addCommunityTag,
  updateCommunityTag,
  deleteCommunityTag,
  toggleStudentCR,
  deleteStudentProfile,
  getTeacherSuggestions,
  approveTeacherSuggestion,
  rejectTeacherSuggestion,
  rolloverSemester,
  getSemesterStats,
  getBatchChangeRequests,
  approveBatchChangeRequest,
  rejectBatchChangeRequest,
  getCampusAnalytics
} from "../controllers/adminController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { requireRole } from "../middlewares/roleMiddleware.js";

const router = express.Router();

router.use(requireAuth, requireRole("ADMIN"));

router.get("/analytics", getCampusAnalytics);
router.get("/semester-stats", getSemesterStats);
router.post("/rollover-semester", rolloverSemester);

router.get("/tags", getCommunityTags);
router.post("/tags", addCommunityTag);
router.put("/tags/:id", updateCommunityTag);
router.delete("/tags/:id", deleteCommunityTag);

router.get("/students", getStudents);
router.put("/students/:id", updateStudent);
router.patch("/students/:id/toggle-cr", toggleStudentCR);
router.delete("/students/:id/profile", deleteStudentProfile);
router.patch("/users/:id/ban", banUser);
router.post("/register-teacher", registerTeacher);
router.put("/teachers/:id", updateTeacher);
router.delete("/teachers/:id", deleteTeacher);

router.get("/teachers/:id/courses", getTeacherCourses);
router.post("/teachers/:id/courses", addTeacherCourse);
router.put("/courses/:courseId", updateTeacherCourse);
router.delete("/courses/:courseId", deleteTeacherCourse);

router.get("/teacher-suggestions", getTeacherSuggestions);
router.post("/teacher-suggestions/:id/approve", approveTeacherSuggestion);
router.post("/teacher-suggestions/:id/reject", rejectTeacherSuggestion);

router.get("/batch-requests", getBatchChangeRequests);
router.post("/batch-requests/:id/approve", approveBatchChangeRequest);
router.post("/batch-requests/:id/reject", rejectBatchChangeRequest);

export default router;

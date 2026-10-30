import express from "express";
import {
  onboardStudent,
  onboardTeacher,
  listTeachers,
  getTeacherProfile,
  getTeacherPhotoImage,
  suggestTeacherName,
  requestBatchChange,
  getMyBatchRequests,
  getCRBatchRequests,
  getStudentLeaderboard,
  updateElectives
} from "../controllers/profileController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { requireRole } from "../middlewares/roleMiddleware.js";

const router = express.Router();

router.get("/students/leaderboard", requireAuth, getStudentLeaderboard);
router.post("/student", requireAuth, requireRole("STUDENT"), onboardStudent);
router.put("/student/electives", requireAuth, requireRole("STUDENT"), updateElectives);
router.post("/student/request-batch-change", requireAuth, requireRole("STUDENT"), requestBatchChange);
router.get("/student/batch-requests", requireAuth, requireRole("STUDENT"), getMyBatchRequests);
router.get("/student/cr/batch-requests", requireAuth, requireRole("STUDENT"), getCRBatchRequests);

router.post("/teacher", requireAuth, requireRole("TEACHER"), onboardTeacher);
router.get("/teachers", listTeachers);
router.get("/teachers/:id", getTeacherProfile);
router.get("/teachers/:id/photo", getTeacherPhotoImage);
router.post("/teachers/:id/suggest-name", requireAuth, suggestTeacherName);

export default router;

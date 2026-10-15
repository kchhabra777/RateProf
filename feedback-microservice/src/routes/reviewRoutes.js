import express from "express";
import {
    createReview,
    getReviews,
    getSingleReview,
    getTeacherTagStats,
    getPublicTags,
    getTeacherAISummary
} from "../controllers/reviewController.js";
import { requireUser } from "../lib/gatewayAuth.js";

const router = express.Router();

router.post("/", requireUser, createReview);
router.get("/tags", getPublicTags);
router.get("/teachers/:teacherId/tags", getTeacherTagStats);
router.get("/teachers/:teacherId/ai-summary", getTeacherAISummary);
router.get("/reviewee/:id", getReviews);
router.get("/:id", getSingleReview);

export default router;

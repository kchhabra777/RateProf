import express from "express";
import { voteReview } from "../controllers/voteController.js";
import { requireUser } from "../lib/gatewayAuth.js";

const router = express.Router();

// Support both /reviews/:id/vote and /reviews/:id/votes
router.post("/:id/vote", requireUser, voteReview);
router.post("/:id/votes", requireUser, voteReview);

export default router;

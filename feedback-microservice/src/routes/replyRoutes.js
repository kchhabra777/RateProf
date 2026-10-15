import express from "express";
import { createReply, getReplies, voteOnReply } from "../controllers/replyController.js";
import { requireUser } from "../lib/gatewayAuth.js";

const router = express.Router();

router.post("/:id/replies", requireUser, createReply);
router.get("/:id/replies", getReplies);
router.post("/replies/:replyId/vote", requireUser, voteOnReply);

export default router;

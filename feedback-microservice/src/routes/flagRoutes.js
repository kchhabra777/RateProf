import express from "express";
import { flagReview, listFlags, resolveFlag } from "../controllers/flagController.js";
import { requireAdmin, requireUser } from "../lib/gatewayAuth.js";

const router = express.Router();

router.get("/flags", requireAdmin, listFlags);
router.post("/flags/:id/resolve", requireAdmin, resolveFlag);
router.post("/:id/flag", requireUser, flagReview);
router.post("/:id/flags", requireUser, flagReview);

export default router;

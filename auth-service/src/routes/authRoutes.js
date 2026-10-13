import express from "express";
import {
  checkEmail,
  requestOtp,
  signup,
  login,
  getMe,
  syncClerkUser,
  forgotPasswordSendOtp,
  forgotPasswordReset,
  changePasswordSendOtp,
  changePasswordVerifyAndUpdate
} from "../controllers/authController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/check-email", checkEmail);
router.post("/send-otp", requestOtp);
router.post("/signup", signup);
router.post("/login", login);
router.post("/clerk-sync", syncClerkUser);
router.get("/me", requireAuth, getMe);

// Forgot Password Flow (Unauthenticated)
router.post("/forgot-password/send-otp", forgotPasswordSendOtp);
router.post("/forgot-password/reset", forgotPasswordReset);

// Change Password Flow (Authenticated)
router.post("/change-password/send-otp", requireAuth, changePasswordSendOtp);
router.post("/change-password/verify-and-update", requireAuth, changePasswordVerifyAndUpdate);

export default router;

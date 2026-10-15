import {
  checkEmailRole,
  registerUser,
  loginUser,
  getUserById
} from "../services/authService.js";
import { sendOtp as sendOtpService, verifyOtp } from "../services/emailOtpService.js";
import { determineRoleFromEmail } from "../utils/roleDetector.js";
import prisma from "../lib/prisma.js";
import { generateToken } from "../utils/jwt.js";
import bcrypt from "bcryptjs";

const syncPasswordToClerkIfApplicable = async (user, newPassword) => {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) return;

  let clerkUserId = null;
  if (user.passwordHash && user.passwordHash.startsWith("CLERK_user_")) {
    clerkUserId = user.passwordHash.replace("CLERK_", "");
  }

  try {
    if (!clerkUserId) {
      const lookupRes = await fetch(`https://api.clerk.com/v1/users?email_address=${encodeURIComponent(user.email)}`, {
        headers: { Authorization: `Bearer ${secretKey}` }
      });
      if (lookupRes.ok) {
        const users = await lookupRes.json();
        if (users && users.length > 0) {
          clerkUserId = users[0].id;
        }
      }
    }

    if (clerkUserId) {
      console.log(`[AUTH] Syncing updated password to Clerk user ${clerkUserId}`);
      const patchRes = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ password: newPassword })
      });
      if (!patchRes.ok) {
        const errText = await patchRes.text();
        console.warn(`[AUTH] Clerk password sync response for ${clerkUserId}:`, errText);
      } else {
        console.log(`[AUTH] Successfully synced password to Clerk for ${clerkUserId}`);
      }
    }
  } catch (err) {
    console.warn(`[AUTH] Error syncing password to Clerk:`, err.message);
  }
};

export const checkEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const result = await checkEmailRole(email);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

export const requestOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const roleInfo = determineRoleFromEmail(email);
    const result = await sendOtpService(roleInfo.email);

    return res.status(200).json({
      success: true,
      message: `Verification code sent to ${roleInfo.email}`,
      role: roleInfo.role,
      detectedBatch: roleInfo.batch
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

export const signup = async (req, res) => {
  try {
    const { email, password, otp } = req.body;

    if (!email || !password || !otp) {
      return res.status(400).json({ error: "Email, password, and 6-digit OTP code are required." });
    }

    const result = await registerUser({ email, password, otp });
    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const result = await loginUser({ email, password });
    return res.status(200).json(result);
  } catch (error) {
    const statusCode = error.status || 401;
    return res.status(statusCode).json({ error: error.message, isBanned: !!error.isBanned });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch user details" });
  }
};

export const syncClerkUser = async (req, res) => {
  try {
    const { email, fullName, clerkId } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const roleInfo = determineRoleFromEmail(email);

    let user = await prisma.user.findUnique({
      where: { email: roleInfo.email },
      include: { studentProfile: true, teacherProfile: true }
    });

    if (user && user.isBanned) {
      return res.status(403).json({
        error: "Your account has been suspended by an administrator.",
        isBanned: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isBanned: true
        }
      });
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: roleInfo.email,
          passwordHash: `CLERK_${clerkId || 'MANAGED'}`,
          role: roleInfo.role,
          detectedBatch: roleInfo.batch,
          isEmailVerified: true,
          isProfileComplete: false
        },
        include: { studentProfile: true, teacherProfile: true }
      });
    } else if (clerkId && user.passwordHash.startsWith("CLERK_") && user.passwordHash !== `CLERK_${clerkId}`) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: `CLERK_${clerkId}` },
        include: { studentProfile: true, teacherProfile: true }
      });
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      batch: user.detectedBatch
    });
    return res.status(200).json({ user, token });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const forgotPasswordSendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email address is required." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.endsWith("@thapar.edu")) {
      return res.status(400).json({ error: "Only official @thapar.edu email addresses are permitted." });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      return res.status(404).json({ error: "No account found with this Thapar email address. Please sign up first." });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: "Your account has been suspended by an administrator." });
    }

    const otpResult = await sendOtpService(normalizedEmail, "password_reset");

    return res.status(200).json({
      success: true,
      message: otpResult.emailSent
        ? `Password reset verification code sent to ${normalizedEmail}`
        : `Password reset verification code generated for ${normalizedEmail}`,
      otp: !otpResult.emailSent ? otpResult.otp : undefined,
      emailSent: otpResult.emailSent
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

export const forgotPasswordReset = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: "Email, 6-digit verification code, and new password are required." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters long." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      return res.status(404).json({ error: "User account not found." });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: "Your account has been suspended by an administrator." });
    }

    const isOtpValid = await verifyOtp(normalizedEmail, otp);
    if (!isOtpValid) {
      return res.status(400).json({ error: "Invalid or expired verification code." });
    }

    // Sync to Clerk before updating DB
    await syncPasswordToClerkIfApplicable(user, newPassword);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        isEmailVerified: true
      }
    });

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now log in with your new password."
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

export const changePasswordSendOtp = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.email) {
      return res.status(401).json({ error: "Authentication required." });
    }

    const otpResult = await sendOtpService(user.email, "change_password");

    return res.status(200).json({
      success: true,
      message: otpResult.emailSent
        ? `Verification code sent to your registered email (${user.email})`
        : `Verification code generated for ${user.email}`,
      otp: !otpResult.emailSent ? otpResult.otp : undefined,
      emailSent: otpResult.emailSent
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

export const changePasswordVerifyAndUpdate = async (req, res) => {
  try {
    const user = req.user;
    const { otp, newPassword } = req.body;

    if (!user || !user.email) {
      return res.status(401).json({ error: "Authentication required." });
    }

    if (!otp || !newPassword) {
      return res.status(400).json({ error: "Verification code and new password are required." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters long." });
    }

    const isOtpValid = await verifyOtp(user.email, otp);
    if (!isOtpValid) {
      return res.status(400).json({ error: "Invalid or expired verification code." });
    }

    // Sync to Clerk before updating DB so user.passwordHash still holds CLERK_user_... if present
    await syncPasswordToClerkIfApplicable(user, newPassword);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });

    return res.status(200).json({
      success: true,
      message: "Password changed successfully."
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

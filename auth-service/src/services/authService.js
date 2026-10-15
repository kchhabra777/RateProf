import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import { determineRoleFromEmail } from "../utils/roleDetector.js";
import { verifyOtp } from "./emailOtpService.js";
import { generateToken } from "../utils/jwt.js";

export const checkEmailRole = async (email) => {
  const roleInfo = determineRoleFromEmail(email);
  const existingUser = await prisma.user.findUnique({
    where: { email: roleInfo.email }
  });

  return {
    ...roleInfo,
    isRegistered: !!existingUser,
    isProfileComplete: existingUser?.isProfileComplete || false
  };
};

export const registerUser = async ({ email, password, otp }) => {
  const roleInfo = determineRoleFromEmail(email);

  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }

  // Verify OTP
  const isOtpValid = await verifyOtp(roleInfo.email, otp);
  if (!isOtpValid) {
    throw new Error("Invalid or expired verification code (OTP).");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: roleInfo.email }
  });

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  let user;

  if (existingUser) {
    if (existingUser.isBanned) {
      const err = new Error("Your account has been suspended by an administrator.");
      err.status = 403;
      err.isBanned = true;
      throw err;
    }
    if (existingUser.passwordHash === "PENDING") {
      // This is a pre-registered teacher account by an admin! Complete their registration.
      user = await prisma.user.update({
        where: { email: roleInfo.email },
        data: {
          passwordHash,
          isEmailVerified: true
        }
      });
    } else {
      throw new Error("An account with this Thapar email already exists. Please log in.");
    }
  } else {
    user = await prisma.user.create({
      data: {
        email: roleInfo.email,
        passwordHash,
        role: roleInfo.role,
        detectedBatch: roleInfo.batch,
        isEmailVerified: true,
        isProfileComplete: false
      }
    });
  }

  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    batch: user.detectedBatch
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      detectedBatch: user.detectedBatch,
      isProfileComplete: user.isProfileComplete,
      isBanned: user.isBanned
    }
  };
};

export const loginUser = async ({ email, password }) => {
  if (!email || !password) {
    throw new Error("Email and password are required.");
  }

  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalized },
    include: {
      studentProfile: true,
      teacherProfile: {
        include: {
          offerings: true
        }
      }
    }
  });

  if (!user) {
    // Same message as a wrong password, so the login form can't be used to check who is registered
    throw new Error("Invalid email or password.");
  }

  if (user.isBanned) {
    const err = new Error("Your account has been suspended by an administrator.");
    err.status = 403;
    err.isBanned = true;
    throw err;
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new Error("Invalid email or password.");
  }

  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    batch: user.detectedBatch
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      detectedBatch: user.detectedBatch,
      isProfileComplete: user.isProfileComplete,
      isBanned: user.isBanned,
      studentProfile: user.studentProfile,
      teacherProfile: user.teacherProfile
    }
  };
};

export const getUserById = async (userId) => {
  return await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      detectedBatch: true,
      isProfileComplete: true,
      isBanned: true,
      createdAt: true,
      studentProfile: true,
      teacherProfile: {
        include: {
          offerings: true
        }
      }
    }
  });
};

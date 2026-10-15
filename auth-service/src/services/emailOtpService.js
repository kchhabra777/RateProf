import crypto from "crypto";
import nodemailer from "nodemailer";
import prisma from "../lib/prisma.js";

let transporter = null;

const MAX_OTP_ATTEMPTS = 5;
// Wrong guesses per email for the current code. A new code resets the count; reaching the
// limit burns the code so a 6-digit OTP can't be brute-forced within its 10-minute window.
const failedAttempts = new Map();

const initTransporter = () => {
  if (!transporter && process.env.SMTP_HOST && process.env.SMTP_USER) {
    try {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_PORT === "465",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000
      });
    } catch (err) {
      console.warn("SMTP setup warning:", err.message);
    }
  }
  return transporter;
};

export const sendOtp = async (email, purpose = "verification") => {
  const normalizedEmail = email.trim().toLowerCase();
  
  // Generate 6-digit OTP
  const otp = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Delete prior OTPs for this email to prevent collisions
  await prisma.otpVerification.deleteMany({
    where: { email: normalizedEmail }
  });
  failedAttempts.delete(normalizedEmail);

  // Store new OTP
  await prisma.otpVerification.create({
    data: {
      email: normalizedEmail,
      otp,
      expiresAt
    }
  });

  // Codes are printed only in local development, where SMTP is usually not configured
  if (process.env.NODE_ENV !== "production") {
    console.log(`\n✉️  [DEV OTP] (${purpose.toUpperCase()}) ${normalizedEmail}: ${otp} (valid until ${expiresAt.toISOString()})\n`);
  }

  let emailSent = false;
  const mailClient = initTransporter();
  if (mailClient) {
    let subject = "Your Campus Feedback Verification Code";
    let heading = "Verification Code";
    let message = "Your 6-digit verification code to complete your registration is:";

    if (purpose === "password_reset") {
      subject = "Password Reset Code - RateProf";
      heading = "Password Reset Request";
      message = "Your 6-digit verification code to reset your account password is:";
    } else if (purpose === "change_password") {
      subject = "Security Verification Code - RateProf";
      heading = "Change Password Security Verification";
      message = "Your 6-digit verification code to change your account password is:";
    }

    try {
      await mailClient.sendMail({
        from: process.env.SMTP_FROM || "Thapar Feedback System <noreply@thapar.edu>",
        to: normalizedEmail,
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 24px; color: #1a1a1a; max-width: 520px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
            <div style="border-bottom: 2px solid #b91c1c; padding-bottom: 12px; margin-bottom: 20px;">
              <h2 style="color: #b91c1c; margin: 0; font-size: 20px;">RateProf • TIET Campus Feedback</h2>
            </div>
            <h3 style="color: #1e293b; margin-top: 0;">${heading}</h3>
            <p style="font-size: 14px; color: #475569; line-height: 1.5;">${message}</p>
            <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #b91c1c; background: #fef2f2; border: 1px dashed #fca5a5; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
              ${otp}
            </div>
            <p style="font-size: 13px; color: #64748b; margin-bottom: 4px;">⏰ This code will expire in <strong>10 minutes</strong>.</p>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 16px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
              If you did not request this verification code, please ignore this email or contact support immediately.
            </p>
          </div>
        `
      });
      emailSent = true;
    } catch (err) {
      console.error("Failed to deliver SMTP email:", err.message);
    }
  }

  if (!emailSent && process.env.NODE_ENV === "production") {
    const err = new Error("We couldn't send the verification email right now. Please try again in a few minutes.");
    err.status = 503;
    throw err;
  }

  // The code itself is never returned to the caller
  return {
    success: true,
    message: emailSent ? "OTP sent successfully" : "Verification code generated",
    emailSent
  };
};

export const verifyOtp = async (email, otp) => {
  const normalizedEmail = email.trim().toLowerCase();

  const record = await prisma.otpVerification.findFirst({
    where: {
      email: normalizedEmail,
      expiresAt: {
        gt: new Date()
      }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!record) {
    return false;
  }

  const provided = Buffer.from(String(otp).trim());
  const expected = Buffer.from(record.otp);
  const matches = provided.length === expected.length && crypto.timingSafeEqual(provided, expected);

  if (!matches) {
    const attempts = (failedAttempts.get(normalizedEmail) || 0) + 1;
    if (attempts >= MAX_OTP_ATTEMPTS) {
      failedAttempts.delete(normalizedEmail);
      await prisma.otpVerification.deleteMany({ where: { email: normalizedEmail } });
    } else {
      failedAttempts.set(normalizedEmail, attempts);
    }
    return false;
  }

  failedAttempts.delete(normalizedEmail);

  // Delete used OTP
  await prisma.otpVerification.delete({
    where: { id: record.id }
  });

  return true;
};

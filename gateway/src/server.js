import express from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";
import rateLimit from "express-rate-limit";
import "dotenv/config";
import { clerkAuthMiddleware } from "./middleware/clerkAuth.js";

const app = express();
const PORT = process.env.PORT || 8000;

const AUTH_SERVICE_URL = (process.env.AUTH_SERVICE_URL || "http://localhost:5001").replace(/\/$/, "");
const FEEDBACK_SERVICE_URL = (process.env.FEEDBACK_SERVICE_URL || "http://localhost:5000").replace(/\/$/, "");
const GATEWAY_INTERNAL_SECRET = process.env.GATEWAY_INTERNAL_SECRET || "rateprof_internal_gw_sec_2026_ti_campus";

// Trust proxy for proper IP resolution in hosted environments (e.g. Render, Vercel, Railway)
app.set("trust proxy", 1);

// Allowed origins
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "https://www.rateprof.tech",
  "https://rateprof.tech"
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests or allowed origins
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
      callback(null, true);
    } else {
      callback(null, true); // Fallback to allow for testing
    }
  },
  credentials: true
}));

// Strip client spoofed headers and verify valid token first so limiters know the user identity
app.use(clerkAuthMiddleware);

// ── Rate Limiters (Campus NAT & User Aware) ──
// 1. General API limiter (protects against DDoS while accommodating 1000s on campus Wi-Fi)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // High threshold for campus-wide NAT egress IP
  keyGenerator: (req) => req.headers["x-user-id"] || req.ip,
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down and try again shortly." }
});

// 2. Sensitive OTP send limiter (keyed per authenticated student or IP)
const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  keyGenerator: (req) => req.headers["x-user-id"] || req.ip,
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many verification code requests. Please wait a few minutes before requesting again." }
});

// 3. Sensitive Login attempt limiter (prevents brute-force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  keyGenerator: (req) => req.headers["x-user-id"] || req.ip,
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again after 15 minutes." }
});

// 4. Review creation limiter (per authenticated student)
const reviewSubmissionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  keyGenerator: (req) => req.headers["x-user-id"] || req.ip,
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "You are submitting reviews too rapidly. Please slow down." }
});

app.use(generalLimiter);
app.use([
  "/api/auth/forgot-password/send-otp",
  "/auth/forgot-password/send-otp",
  "/api/auth/change-password/send-otp",
  "/auth/change-password/send-otp"
], otpSendLimiter);
app.use(["/api/auth/login", "/auth/login"], loginLimiter);

const proxyOptions = (target) => ({
  target,
  changeOrigin: true,
  on: {
    proxyReq: (proxyReq, req) => {
      // Inject signed internal gateway secret to authenticate gateway-to-service traffic
      proxyReq.setHeader("x-gateway-secret", GATEWAY_INTERNAL_SECRET);

      if (req.headers["x-user-id"]) {
        proxyReq.setHeader("x-user-id", req.headers["x-user-id"]);
      }
      if (req.headers["x-user-email"]) {
        proxyReq.setHeader("x-user-email", req.headers["x-user-email"]);
      }
      if (req.headers["x-user-role"]) {
        proxyReq.setHeader("x-user-role", req.headers["x-user-role"]);
      }
    }
  }
});

// Root and Health Check
app.get(["/", "/health"], (req, res) => {
  res.json({
    status: "OK",
    service: "Campus Feedback API Gateway",
    services: {
      authService: AUTH_SERVICE_URL,
      feedbackService: FEEDBACK_SERVICE_URL
    }
  });
});

// Proxy /api/auth/* and /auth/* -> AUTH_SERVICE_URL/auth/*
app.use(
  ["/api/auth", "/auth"],
  createProxyMiddleware(proxyOptions(`${AUTH_SERVICE_URL}/auth`))
);

// Proxy /api/profiles/* and /profiles/* -> AUTH_SERVICE_URL/profiles/*
app.use(
  ["/api/profiles", "/profiles"],
  createProxyMiddleware(proxyOptions(`${AUTH_SERVICE_URL}/profiles`))
);

// Proxy /api/courses/* and /courses/* -> AUTH_SERVICE_URL/courses/*
app.use(
  ["/api/courses", "/courses"],
  createProxyMiddleware(proxyOptions(`${AUTH_SERVICE_URL}/courses`))
);

// Proxy /api/admin/* and /admin/* -> AUTH_SERVICE_URL/admin/*
app.use(
  ["/api/admin", "/admin"],
  createProxyMiddleware(proxyOptions(`${AUTH_SERVICE_URL}/admin`))
);

// Proxy /api/support/* and /support/* -> AUTH_SERVICE_URL/support/*
app.use(
  ["/api/support", "/support"],
  createProxyMiddleware(proxyOptions(`${AUTH_SERVICE_URL}/support`))
);

// Proxy /api/reviews/* and /reviews/* -> FEEDBACK_SERVICE_URL/reviews/*
app.use(
  ["/api/reviews", "/reviews"],
  reviewSubmissionLimiter,
  createProxyMiddleware(proxyOptions(`${FEEDBACK_SERVICE_URL}/reviews`))
);

// Proxy /api/ratings/* and /ratings/* -> FEEDBACK_SERVICE_URL/ratings/*
app.use(
  ["/api/ratings", "/ratings"],
  createProxyMiddleware(proxyOptions(`${FEEDBACK_SERVICE_URL}/ratings`))
);

app.listen(PORT, () => {
  console.log(`🌐 API Gateway listening on port ${PORT}`);
  console.log(`   Auth routes     -> ${AUTH_SERVICE_URL}/auth`);
  console.log(`   Profiles routes -> ${AUTH_SERVICE_URL}/profiles`);
  console.log(`   Courses routes  -> ${AUTH_SERVICE_URL}/courses`);
  console.log(`   Support routes  -> ${AUTH_SERVICE_URL}/support`);
  console.log(`   Reviews routes  -> ${FEEDBACK_SERVICE_URL}/reviews`);
  console.log(`   Ratings routes  -> ${FEEDBACK_SERVICE_URL}/ratings`);
});

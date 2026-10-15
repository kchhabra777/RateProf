import express from "express";
import cors from "cors";
import helmet from "helmet";
import { createProxyMiddleware } from "http-proxy-middleware";
import rateLimit from "express-rate-limit";
import "dotenv/config";
import { clerkAuthMiddleware } from "./middleware/clerkAuth.js";
import { requireEnv } from "./secrets.js";

const app = express();
const PORT = process.env.PORT || 8000;

const AUTH_SERVICE_URL = (process.env.AUTH_SERVICE_URL || "http://localhost:5001").replace(/\/$/, "");
const FEEDBACK_SERVICE_URL = (process.env.FEEDBACK_SERVICE_URL || "http://localhost:5000").replace(/\/$/, "");
const GATEWAY_INTERNAL_SECRET = requireEnv("GATEWAY_INTERNAL_SECRET");
requireEnv("JWT_SECRET");

// Trust proxy for proper IP resolution in hosted environments (e.g. Render, Vercel, Railway)
app.set("trust proxy", 1);

// Browser origins allowed to call the API with credentials. Extra origins (e.g. a preview
// deployment) can be added through CORS_EXTRA_ORIGINS as a comma-separated list.
const allowedOrigins = new Set([
  "https://rateprof.tech",
  "https://www.rateprof.tech",
  "https://campus-feedback-system.vercel.app",
  ...(process.env.CORS_EXTRA_ORIGINS || "").split(",").map((o) => o.trim()).filter(Boolean)
]);
if (process.env.NODE_ENV !== "production") {
  ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"].forEach((o) => allowedOrigins.add(o));
}

app.use(helmet({
  // JSON API only: no pages to frame and no inline content
  contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
  crossOriginResourcePolicy: { policy: "same-site" }
}));

app.use(cors({
  origin: (origin, callback) => {
    // Requests without an Origin header (curl, server-to-server, same-origin rewrites) carry no
    // ambient browser credentials for another site, so they are not a CORS concern.
    callback(null, !origin || allowedOrigins.has(origin));
  },
  credentials: true
}));

// cors() ends preflights from allowed origins. Any preflight that gets here comes from an origin
// that is not allowed: answer it without CORS headers instead of forwarding it downstream.
app.use((req, res, next) => {
  if (req.method === "OPTIONS" && req.headers["access-control-request-method"]) {
    return res.sendStatus(204);
  }
  next();
});

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
  "/api/auth/send-otp",
  "/auth/send-otp",
  "/api/auth/forgot-password/send-otp",
  "/auth/forgot-password/send-otp",
  "/api/auth/change-password/send-otp",
  "/auth/change-password/send-otp"
], otpSendLimiter);

// 5. OTP verification limiter (slows brute-forcing 6-digit codes; the auth service also locks a code after 5 misses)
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.headers["x-user-id"] || req.ip,
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many verification attempts. Please wait a few minutes and try again." }
});
app.use([
  "/api/auth/signup",
  "/auth/signup",
  "/api/auth/forgot-password/reset",
  "/auth/forgot-password/reset",
  "/api/auth/change-password/verify-and-update",
  "/auth/change-password/verify-and-update"
], otpVerifyLimiter);
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
    },
    proxyRes: (proxyRes) => {
      // The gateway owns CORS. Drop the downstream services' own (allow-all) CORS headers so
      // they cannot override the allow-list above.
      for (const header of Object.keys(proxyRes.headers)) {
        if (header.toLowerCase().startsWith("access-control-")) delete proxyRes.headers[header];
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

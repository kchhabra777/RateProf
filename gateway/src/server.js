import express from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";
import "dotenv/config";
import { clerkAuthMiddleware } from "./middleware/clerkAuth.js";

const app = express();
const PORT = process.env.PORT || 8000;

const AUTH_SERVICE_URL = (process.env.AUTH_SERVICE_URL || "http://localhost:5001").replace(/\/$/, "");
const FEEDBACK_SERVICE_URL = (process.env.FEEDBACK_SERVICE_URL || "http://localhost:5000").replace(/\/$/, "");

app.use(cors());

// Clerk JWT Verification & Header Injection Middleware
app.use(clerkAuthMiddleware);

const proxyOptions = (target) => ({
  target,
  changeOrigin: true,
  on: {
    proxyReq: (proxyReq, req) => {
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

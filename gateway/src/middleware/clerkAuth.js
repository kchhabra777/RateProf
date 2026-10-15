import { createClerkClient, verifyToken } from "@clerk/backend";
import jwt from "jsonwebtoken";
import { requireEnv } from "../secrets.js";

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY
});

// Cache user email addresses to minimize Clerk API calls
const userCache = new Map();

export const clerkAuthMiddleware = async (req, res, next) => {
  // CRITICAL SECURITY: Immediately strip any client-supplied internal headers to prevent spoofing/auth-bypass
  delete req.headers["x-user-id"];
  delete req.headers["x-user-email"];
  delete req.headers["x-user-role"];
  delete req.headers["x-gateway-secret"];

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return next();
  }

  // 1. Try Clerk Token verification
  try {
    const verified = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY
    });

    if (verified && verified.sub) {
      req.headers["x-user-id"] = verified.sub;

      let email = verified.email || verified.email_address || verified.primary_email_address || verified.claims?.email || verified.claims?.email_address;
      if (!email && userCache.has(verified.sub)) {
        email = userCache.get(verified.sub);
      }
      if (!email) {
        try {
          const userObj = await clerk.users.getUser(verified.sub);
          email = userObj.primaryEmailAddress?.emailAddress || userObj.emailAddresses?.[0]?.emailAddress;
          if (email) {
            userCache.set(verified.sub, email);
          }
        } catch (e) {
          // Ignore lookup error
        }
      }

      if (email) {
        req.headers["x-user-email"] = email;
      }
      return next();
    }
  } catch (clerkErr) {
    // Not a valid Clerk token, fallback to local JWT verification
  }

  // 2. Cryptographic Local JWT verification (reject unverified/tampered tokens)
  try {
    const decoded = jwt.verify(token, requireEnv("JWT_SECRET"));
    if (decoded) {
      const resolvedId = decoded.userId || decoded.sub || decoded.id;
      if (resolvedId) req.headers["x-user-id"] = resolvedId;
      if (decoded.email) req.headers["x-user-email"] = decoded.email;
      if (decoded.role) req.headers["x-user-role"] = decoded.role;
    }
  } catch (localErr) {
    // Token is signature-invalid or expired - leave headers stripped and let downstream return 401
  }

  next();
};

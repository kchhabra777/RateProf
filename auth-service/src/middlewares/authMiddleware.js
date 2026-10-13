import jwt from "jsonwebtoken";
import { verifyToken } from "../utils/jwt.js";
import prisma from "../lib/prisma.js";
import { determineRoleFromEmail } from "../utils/roleDetector.js";

export const requireAuth = async (req, res, next) => {
  try {
    const route = `${req.method} ${req.originalUrl || req.url}`;
    console.log(`[AUTH] ── requireAuth for ${route}`);

    // 1. Check if Gateway injected verified Clerk User headers
    const GATEWAY_INTERNAL_SECRET = process.env.GATEWAY_INTERNAL_SECRET || "rateprof_internal_gw_sec_2026_ti_campus";
    const gatewaySecret = req.headers["x-gateway-secret"];
    const isGatewayVerified = gatewaySecret && gatewaySecret === GATEWAY_INTERNAL_SECRET;

    const injectedUserId = isGatewayVerified ? req.headers["x-user-id"] : undefined;
    const injectedEmail = isGatewayVerified ? req.headers["x-user-email"] : undefined;

    console.log(`[AUTH]   Strategy 1 – Gateway verified: ${isGatewayVerified}, userId=${injectedUserId || '(none)'}, email=${injectedEmail || '(none)'}`);

    if (injectedEmail || injectedUserId) {
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            ...(injectedEmail ? [{ email: injectedEmail.toLowerCase().trim() }] : []),
            ...(injectedUserId ? [{ passwordHash: `CLERK_${injectedUserId}` }] : [])
          ]
        },
        include: {
          studentProfile: true,
          teacherProfile: true
        }
      });

      // If user authenticated via Clerk but record doesn't exist in DB yet, initialize on the fly
      if (!user && injectedEmail) {
        console.log(`[AUTH]   Strategy 1 – user not found, creating on-the-fly for ${injectedEmail}`);
        try {
          const roleInfo = determineRoleFromEmail(injectedEmail);
          user = await prisma.user.create({
            data: {
              email: roleInfo.email,
              passwordHash: `CLERK_${injectedUserId || 'MANAGED'}`,
              role: roleInfo.role,
              detectedBatch: roleInfo.batch,
              isEmailVerified: true,
              isProfileComplete: false
            },
            include: {
              studentProfile: true,
              teacherProfile: true
            }
          });
        } catch (initErr) {
          console.warn("[AUTH]   Strategy 1 – on-the-fly creation error:", initErr.message);
        }
      }

      if (user) {
        if (user.isBanned) {
          console.log(`[AUTH]   🚫 Access Denied: User ${user.email} (${user.id}) is suspended.`);
          return res.status(403).json({
            error: "Your account has been suspended by an administrator.",
            isBanned: true
          });
        }
        console.log(`[AUTH]   ✅ Strategy 1 OK – user=${user.id}, role=${user.role}, email=${user.email}`);
        req.user = user;
        return next();
      }
      console.log(`[AUTH]   Strategy 1 – headers present but user lookup failed`);
    }

    // 2. Fallback to Local JWT or Clerk JWT Bearer Token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log(`[AUTH]   ❌ No Authorization header present`);
      return res.status(401).json({ error: "Access denied. Authentication token is missing." });
    }

    const token = authHeader.split(" ")[1];
    console.log(`[AUTH]   Bearer token present (length=${token.length}, first20=${token.substring(0, 20)}...)`);

    // Attempt internal backend JWT verification
    try {
      const decoded = verifyToken(token);
      const resolvedId = decoded?.userId || decoded?.id;
      console.log(`[AUTH]   Strategy 2 – Local JWT decoded OK: userId=${resolvedId}, email=${decoded?.email}`);
      if (decoded && resolvedId) {
        const user = await prisma.user.findUnique({
          where: { id: resolvedId },
          include: {
            studentProfile: true,
            teacherProfile: true
          }
        });

        if (user) {
          if (user.isBanned) {
            console.log(`[AUTH]   🚫 Access Denied: User ${user.email} (${user.id}) is suspended.`);
            return res.status(403).json({
              error: "Your account has been suspended by an administrator.",
              isBanned: true
            });
          }
          console.log(`[AUTH]   ✅ Strategy 2 OK – user=${user.id}, role=${user.role}`);
          req.user = user;
          return next();
        }
        console.log(`[AUTH]   Strategy 2 – JWT valid but user id=${resolvedId} NOT found in DB`);
      }
    } catch (jwtErr) {
      console.log(`[AUTH]   Strategy 2 – Local JWT verify failed: ${jwtErr.message}`);
    }

    // Attempt Clerk JWT payload decoding
    try {
      const rawDecoded = jwt.decode(token);
      console.log(`[AUTH]   Strategy 3 – Clerk JWT decode: sub=${rawDecoded?.sub}, email=${rawDecoded?.email}, email_address=${rawDecoded?.email_address}`);
      
      // Ensure we don't accidentally accept unverified campus tokens here.
      // Clerk tokens typically have 'azp' or 'iss' ending with clerk.accounts.dev or clerk.com.
      // Or we can just check if it has a 'sub' claim starting with 'user_', which campus tokens don't.
      const isClerkToken = rawDecoded && typeof rawDecoded.sub === 'string' && rawDecoded.sub.startsWith('user_');

      if (isGatewayVerified && isClerkToken && (rawDecoded.sub || rawDecoded.email || rawDecoded.email_address)) {
        const clerkSub = rawDecoded.sub;
        const clerkEmail = rawDecoded.email || rawDecoded.email_address || rawDecoded.claims?.email;

        let user = await prisma.user.findFirst({
          where: {
            OR: [
              ...(clerkEmail ? [{ email: clerkEmail.toLowerCase().trim() }] : []),
              ...(clerkSub ? [{ passwordHash: `CLERK_${clerkSub}` }] : [])
            ]
          },
          include: {
            studentProfile: true,
            teacherProfile: true
          }
        });

        // If user authenticated via Clerk token but DB record doesn't exist yet, initialize on the fly
        if (!user && clerkEmail) {
          console.log(`[AUTH]   Strategy 3 – user not found, creating on-the-fly for ${clerkEmail}`);
          try {
            const roleInfo = determineRoleFromEmail(clerkEmail);
            user = await prisma.user.create({
              data: {
                email: roleInfo.email,
                passwordHash: `CLERK_${clerkSub || 'MANAGED'}`,
                role: roleInfo.role,
                detectedBatch: roleInfo.batch,
                isEmailVerified: true,
                isProfileComplete: false
              },
              include: {
                studentProfile: true,
                teacherProfile: true
              }
            });
          } catch (initErr) {
            console.warn("[AUTH]   Strategy 3 – on-the-fly creation error:", initErr.message);
          }
        }

        if (user) {
          if (user.isBanned) {
            console.log(`[AUTH]   🚫 Access Denied: User ${user.email} (${user.id}) is suspended.`);
            return res.status(403).json({
              error: "Your account has been suspended by an administrator.",
              isBanned: true
            });
          }
          console.log(`[AUTH]   ✅ Strategy 3 OK – user=${user.id}, role=${user.role}`);
          req.user = user;
          return next();
        }
        console.log(`[AUTH]   Strategy 3 – Clerk token decoded but no user found`);
      }
    } catch (clerkDecodeErr) {
      console.log(`[AUTH]   Strategy 3 – Clerk JWT decode error: ${clerkDecodeErr.message}`);
    }

    console.log(`[AUTH]   ❌ ALL strategies failed – returning 401`);
    return res.status(401).json({ error: "Invalid or expired session token." });
  } catch (error) {
    console.error(`[AUTH]   ❌ Unexpected error in requireAuth:`, error.message);
    return res.status(500).json({ error: "Internal Server Error during authentication." });
  }
};

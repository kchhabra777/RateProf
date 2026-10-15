import { verifyToken } from "../utils/jwt.js";
import { isFromGateway } from "../utils/secrets.js";
import prisma from "../lib/prisma.js";
import { determineRoleFromEmail } from "../utils/roleDetector.js";

const PROFILE_INCLUDE = {
  studentProfile: true,
  teacherProfile: true
};

const rejectIfBanned = (user, res) => {
  if (!user.isBanned) return false;
  console.log(`[AUTH]   🚫 Access Denied: User ${user.id} is suspended.`);
  res.status(403).json({
    error: "Your account has been suspended by an administrator.",
    isBanned: true
  });
  return true;
};

export const requireAuth = async (req, res, next) => {
  try {
    // 1. Identity injected by the gateway. The gateway strips client-supplied x-user-* headers
    //    and only sets them after verifying a Clerk or campus token, so they are trusted only
    //    when the request also carries the gateway secret.
    const isGatewayVerified = isFromGateway(req);
    const injectedUserId = isGatewayVerified ? req.headers["x-user-id"] : undefined;
    const injectedEmail = isGatewayVerified ? req.headers["x-user-email"] : undefined;

    if (injectedEmail || injectedUserId) {
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            ...(injectedEmail ? [{ email: injectedEmail.toLowerCase().trim() }] : []),
            ...(injectedUserId ? [{ id: injectedUserId }, { passwordHash: `CLERK_${injectedUserId}` }] : [])
          ]
        },
        include: PROFILE_INCLUDE
      });

      // First request from a verified Clerk user: create their record on the fly
      if (!user && injectedEmail) {
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
            include: PROFILE_INCLUDE
          });
        } catch (initErr) {
          console.warn("[AUTH]   On-the-fly user creation failed:", initErr.message);
        }
      }

      if (user) {
        if (rejectIfBanned(user, res)) return;
        req.user = user;
        return next();
      }
    }

    // 2. Campus JWT, verified with the shared secret (covers direct service-to-service calls)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access denied. Authentication token is missing." });
    }

    const token = authHeader.split(" ")[1];
    try {
      const decoded = verifyToken(token);
      const resolvedId = decoded?.userId || decoded?.id;
      if (resolvedId) {
        const user = await prisma.user.findUnique({
          where: { id: resolvedId },
          include: PROFILE_INCLUDE
        });

        if (user) {
          if (rejectIfBanned(user, res)) return;
          req.user = user;
          return next();
        }
      }
    } catch (jwtErr) {
      // Invalid signature or expired: fall through to 401
    }

    // Unverified tokens (e.g. a hand-made "Clerk-looking" JWT) are never decoded or trusted here.
    return res.status(401).json({ error: "Invalid or expired session token." });
  } catch (error) {
    console.error(`[AUTH]   ❌ Unexpected error in requireAuth:`, error.message);
    return res.status(500).json({ error: "Internal Server Error during authentication." });
  }
};

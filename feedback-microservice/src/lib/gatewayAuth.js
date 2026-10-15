import prisma from "./prisma.js";
import { isFromGateway } from "./secrets.js";

// Resolves the signed-in user from the identity headers the gateway sets after verifying a
// Clerk or campus token. Headers are ignored unless the request carries the gateway secret,
// and user IDs sent in request bodies are never trusted.
export const attachGatewayUser = async (req, res, next) => {
    req.authUser = null;
    if (!isFromGateway(req)) return next();

    const email = req.headers["x-user-email"];
    const userId = req.headers["x-user-id"];
    if (!email && !userId) return next();

    try {
        req.authUser = await prisma.user.findFirst({
            where: {
                OR: [
                    ...(email ? [{ email: email.toLowerCase().trim() }] : []),
                    ...(userId ? [{ id: userId }, { passwordHash: `CLERK_${userId}` }] : [])
                ]
            },
            include: { studentProfile: true, teacherProfile: true }
        });
    } catch (error) {
        console.error("Gateway user lookup failed:", error.message);
    }
    next();
};

export const requireUser = (req, res, next) => {
    if (!req.authUser) {
        return res.status(401).json({ error: "Please sign in to continue." });
    }
    if (req.authUser.isBanned) {
        return res.status(403).json({
            error: "Your account has been suspended by an administrator.",
            isBanned: true
        });
    }
    next();
};

export const requireAdmin = (req, res, next) => {
    requireUser(req, res, () => {
        if (req.authUser.role !== "ADMIN") {
            return res.status(403).json({ error: "Only administrators can do this." });
        }
        next();
    });
};

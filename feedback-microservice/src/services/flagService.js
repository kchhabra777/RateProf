import prisma from "../lib/prisma.js";

export const createFlag = async ({
    reviewId,
    reporterId,
    reason
}) => {
    const numReviewId = Number(reviewId);

    // Prevent duplicate flagging by the same user
    const existingFlag = await prisma.reviewFlag.findFirst({
        where: {
            reviewId: numReviewId,
            reporterId
        }
    });

    if (existingFlag) {
        throw new Error("You have already reported this review.");
    }

    const flag = await prisma.reviewFlag.create({
        data: {
            reviewId: numReviewId,
            reporterId,
            reason: reason || "Inappropriate / abusive content"
        }
    });

    // Auto-quarantine safety threshold: only hide if flagged by >= 3 unique users
    const pendingFlagsCount = await prisma.reviewFlag.count({
        where: {
            reviewId: numReviewId,
            status: "PENDING"
        }
    });

    if (pendingFlagsCount >= 3) {
        try {
            await prisma.review.update({
                where: { reviewId: numReviewId },
                data: { isFlagged: true }
            });
        } catch (e) {}
    }

    return flag;
};

export const getAllFlags = async () => {
    const flags = await prisma.reviewFlag.findMany({
        include: {
            review: true
        },
        orderBy: {
            createdAt: "desc"
        }
    });

    for (let flag of flags) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: flag.reporterId },
                include: { studentProfile: true, teacherProfile: true }
            });
            if (user) {
                flag.reporterDetails = {
                    email: user.email,
                    name: user.studentProfile?.fullName || user.teacherProfile?.fullName || "Admin",
                    rollNo: user.studentProfile?.rollNumber || null
                };
            }
        } catch (e) {}
    }

    return flags;
};

export const resolveFlag = async (flagId, action) => {
    const newStatus = action === 'delete_review' ? 'REMOVED' : 'DISMISSED';
    const flag = await prisma.reviewFlag.update({
        where: { flagId: Number(flagId) },
        data: { status: newStatus }
    });

    if (action === 'delete_review') {
        try {
            await prisma.review.delete({ where: { reviewId: flag.reviewId } });
        } catch(e) {}
    } else {
        try {
            await prisma.review.update({
                where: { reviewId: flag.reviewId },
                data: { isFlagged: false }
            });
        } catch(e) {}
    }
    return flag;
};
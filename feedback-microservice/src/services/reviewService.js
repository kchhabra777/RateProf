import prisma from "../lib/prisma.js";
import { calculateRating } from "./ratingService.js";

const COOLDOWN_DAYS = 21;

const inFlightSubmissions = new Set();

export const createReview = async ({
    reviewerId,
    reviewerName,
    reviewerEmail,
    reviewerRollNo,
    reviewerBatch,
    reviewerBranch,
    revieweeId,
    courseCode,
    courseName,
    rating,
    reviewText,
    context,
    tags
}) => {
    const inFlightKey = `${reviewerId}_${revieweeId}_${(courseCode || '').toUpperCase()}`;
    if (inFlightSubmissions.has(inFlightKey)) {
        throw new Error("A review submission is already processing. Please wait a moment.");
    }
    inFlightSubmissions.add(inFlightKey);

    try {
        const cooldownThreshold = new Date(Date.now() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

        // 1. Enforce 21-day cooldown check (strictly per course for this faculty member)
        const lastReview = await prisma.review.findFirst({
            where: {
                reviewerId,
                revieweeId,
                ...(courseCode ? { courseCode } : {}),
                createdAt: {
                    gte: cooldownThreshold
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        if (lastReview) {
            const ageInMs = Date.now() - new Date(lastReview.createdAt).getTime();
            const ageInDays = ageInMs / (1000 * 60 * 60 * 24);
            const remainingDays = Math.max(1, Math.ceil(COOLDOWN_DAYS - ageInDays));
            const courseNameText = courseCode ? ` for ${courseCode}` : '';
            throw new Error(`21-day cooldown active. You have already submitted feedback${courseNameText}. You can submit another rating in ${remainingDays} day(s).`);
        }

    // 2. Create the review record
    const review = await prisma.review.create({
        data: {
            reviewerId,
            reviewerName: reviewerName || null,
            reviewerEmail: reviewerEmail || null,
            reviewerRollNo: reviewerRollNo || null,
            reviewerBatch: reviewerBatch || null,
            reviewerBranch: reviewerBranch || null,
            revieweeId,
            courseCode: courseCode || null,
            courseName: courseName || null,
            rating,
            reviewText,
            context: context || (reviewerBatch ? `Batch ${reviewerBatch}` : null),
            tags: tags || []
        },
        include: {
            replies: {
                include: {
                    votes: true
                }
            },
            votes: true
        }
    });

    // 3. Automatically recalculate time-weighted ratings for the teacher
    try {
        await calculateRating(revieweeId);
    } catch (err) {
        console.error("Failed to auto-update profile rating:", err);
    }

        return review;
    } finally {
        inFlightSubmissions.delete(inFlightKey);
    }
};

export const getReviewsByReviewee = async (revieweeId, page = 1, limit = 20) => {
    const skip = (page - 1) * limit;

    const rawReviews = await prisma.review.findMany({
        where: {
            revieweeId: revieweeId,
            isFlagged: false
        },
        include: {
            replies: {
                include: {
                    votes: true
                },
                orderBy: {
                    createdAt: "asc"
                }
            },
            votes: true
        },
        orderBy: {
            createdAt: "desc"
        },
        skip: skip,
        take: limit
    });

    const totalReviews = await prisma.review.count({
        where: {
            revieweeId: revieweeId,
            isFlagged: false
        }
    });

    const reviews = rawReviews.map((rev) => {
        const upvotes = rev.votes.filter((v) => v.voteType === "UP").length;
        const downvotes = rev.votes.filter((v) => v.voteType === "DOWN").length;

        const replies = (rev.replies || []).map((rep) => {
            const repUp = rep.votes ? rep.votes.filter((v) => v.voteType === "UP").length : 0;
            const repDown = rep.votes ? rep.votes.filter((v) => v.voteType === "DOWN").length : 0;
            return {
                ...rep,
                upvotes: repUp,
                downvotes: repDown
            };
        });

        return {
            ...rev,
            upvotes,
            downvotes,
            replies
        };
    });

    return {
        reviews,
        totalReviews
    };
};

export const getReviewById = async (reviewId) => {
    const rev = await prisma.review.findUnique({
        where: { reviewId: Number(reviewId) },
        include: {
            replies: {
                include: {
                    votes: true
                },
                orderBy: { createdAt: "asc" }
            },
            votes: true
        }
    });

    if (!rev) return null;

    const upvotes = rev.votes.filter((v) => v.voteType === "UP").length;
    const downvotes = rev.votes.filter((v) => v.voteType === "DOWN").length;

    const replies = (rev.replies || []).map((rep) => {
        const repUp = rep.votes ? rep.votes.filter((v) => v.voteType === "UP").length : 0;
        const repDown = rep.votes ? rep.votes.filter((v) => v.voteType === "DOWN").length : 0;
        return {
            ...rep,
            upvotes: repUp,
            downvotes: repDown
        };
    });

    return {
        ...rev,
        upvotes,
        downvotes,
        replies
    };
};
import prisma from "../lib/prisma.js";
import {
    createReview as createReviewService,
    getReviewsByReviewee,
    getReviewById
} from "../services/reviewService.js";
import { verifyStudentTeacherEligibility } from "../lib/eligibility.js";

export const createReview = async (req, res) => {
    try {
        const {
            reviewee,
            rating,
            reviewText,
            context,
            courseCode,
            courseName,
            tags
        } = req.body;

        // The reviewer is always the signed-in user; any reviewer object in the body is ignored
        const reviewerUser = req.authUser;
        if (reviewerUser.role !== "STUDENT") {
            return res.status(403).json({
                error: "Only students can submit faculty reviews."
            });
        }
        const studentProfile = reviewerUser.studentProfile;

        if (!reviewee || !reviewee.userId) {
            return res.status(400).json({
                error: "Reviewee teacher information is required"
            });
        }

        const numRating = Number(rating);
        if (!numRating || numRating < 1 || numRating > 5) {
            return res.status(400).json({
                error: "Rating must be an integer between 1 and 5"
            });
        }

        if (!reviewText || reviewText.trim() === "") {
            return res.status(400).json({
                error: "Review text cannot be empty"
            });
        }

        // Same batch/branch/elective rule the frontend checks via /courses/check-eligibility,
        // enforced here so it cannot be skipped by calling the API directly
        const eligibility = await verifyStudentTeacherEligibility({
            studentProfile,
            teacherUserId: reviewee.userId,
            courseCode
        });
        if (!eligibility.eligible) {
            return res.status(403).json({
                error: eligibility.reason || "You are not eligible to review this teacher."
            });
        }
        const matchedCourse = courseCode ? eligibility.matchingCourse : null;

        const review = await createReviewService({
            reviewerId: reviewerUser.id,
            reviewerName: studentProfile?.fullName || reviewerUser.email.split("@")[0],
            reviewerEmail: reviewerUser.email,
            reviewerRollNo: studentProfile?.rollNumber || null,
            reviewerBatch: studentProfile?.batch || reviewerUser.detectedBatch || null,
            reviewerBranch: studentProfile?.branch || null,
            revieweeId: reviewee.userId,
            courseCode: matchedCourse?.courseCode || courseCode || null,
            courseName: matchedCourse?.courseName || courseName || null,
            rating: numRating,
            reviewText: reviewText.trim(),
            context: context || null,
            tags: tags || []
        });

        return res.status(201).json({
            review
        });
    } catch (error) {
        console.error("Create review error:", error);
        return res.status(400).json({
            error: error.message || "Failed to submit review"
        });
    }
};

export const getReviews = async (req, res) => {
    try {
        const { id } = req.params;

        let page = Number(req.query.page) || 1;
        let limit = Number(req.query.limit) || 20;

        if (page < 1) page = 1;
        if (limit < 1) limit = 10;
        if (limit > 50) limit = 50;

        const result = await getReviewsByReviewee(id, page, limit);

        // Admin status comes from the stored role of the gateway-verified user, never from token claims
        const isAdmin = req.authUser?.role === "ADMIN" && !req.authUser.isBanned;

        // Anonymize for non-admins, but populate student profile details for admins
        let processedReviews;
        if (isAdmin) {
            processedReviews = await Promise.all(result.reviews.map(async (review) => {
                let name = review.reviewerName;
                let email = review.reviewerEmail;
                let rollNo = review.reviewerRollNo;
                let batch = review.reviewerBatch;
                let branch = review.reviewerBranch;

                if (!name || name === "Anonymous Student" || !rollNo) {
                    if (review.reviewerId) {
                        const student = await prisma.user.findUnique({
                            where: { id: review.reviewerId },
                            include: { studentProfile: true }
                        }).catch(() => null);

                        if (student) {
                            name = student.studentProfile?.fullName || student.email.split('@')[0];
                            email = student.email;
                            rollNo = student.studentProfile?.rollNumber || rollNo;
                            batch = student.studentProfile?.batch || batch;
                            branch = student.studentProfile?.branch || branch;
                        }
                    }
                }

                return {
                    ...review,
                    reviewerName: name || "Verified Student",
                    reviewerEmail: email,
                    reviewerRollNo: rollNo,
                    reviewerBatch: batch,
                    reviewerBranch: branch
                };
            }));
        } else {
            processedReviews = result.reviews.map(review => ({
                ...review,
                reviewerName: "Anonymous Student",
                reviewerEmail: null,
                reviewerRollNo: null,
                reviewerBatch: null,
                reviewerBranch: null
            }));
        }

        return res.status(200).json({
            reviewee: {
                userId: id
            },
            page,
            limit,
            totalReviews: result.totalReviews,
            reviews: processedReviews
        });
    } catch (error) {
        console.error("Get reviews error:", error);
        return res.status(500).json({
            error: "Failed to retrieve reviews"
        });
    }
};

export const getSingleReview = async (req, res) => {
    try {
        const { id } = req.params;
        const review = await getReviewById(id);
        if (!review) {
            return res.status(404).json({ error: "Review not found" });
        }
        // Admin status comes from the stored role of the gateway-verified user, never from token claims
        const isAdmin = req.authUser?.role === "ADMIN" && !req.authUser.isBanned;

        let processedReview = review;
        if (isAdmin) {
            let name = review.reviewerName;
            let email = review.reviewerEmail;
            let rollNo = review.reviewerRollNo;
            let batch = review.reviewerBatch;
            let branch = review.reviewerBranch;

            if (!name || name === "Anonymous Student" || !rollNo) {
                if (review.reviewerId) {
                    const student = await prisma.user.findUnique({
                        where: { id: review.reviewerId },
                        include: { studentProfile: true }
                    }).catch(() => null);

                    if (student) {
                        name = student.studentProfile?.fullName || student.email.split('@')[0];
                        email = student.email;
                        rollNo = student.studentProfile?.rollNumber || rollNo;
                        batch = student.studentProfile?.batch || batch;
                        branch = student.studentProfile?.branch || branch;
                    }
                }
            }

            processedReview = {
                ...review,
                reviewerName: name || "Verified Student",
                reviewerEmail: email,
                reviewerRollNo: rollNo,
                reviewerBatch: batch,
                reviewerBranch: branch
            };
        } else {
            processedReview = {
                ...review,
                reviewerName: "Anonymous Student",
                reviewerEmail: null,
                reviewerRollNo: null,
                reviewerBatch: null,
                reviewerBranch: null
            };
        }

        return res.status(200).json({ review: processedReview });
    } catch (error) {
        console.error("Get single review error:", error);
        return res.status(500).json({ error: "Failed to retrieve review" });
    }
};
export const getPublicTags = async (req, res) => {
    try {
        const tags = await prisma.communityTag.findMany({
            orderBy: { name: 'asc' }
        });
        res.json({ tags });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const getTeacherTagStats = async (req, res) => {
    try {
        const { teacherId } = req.params;
        const [reviews, dbTags] = await Promise.all([
            prisma.review.findMany({
                where: { revieweeId: teacherId },
                select: { tags: true }
            }),
            prisma.communityTag.findMany({
                orderBy: { id: "asc" },
                select: { name: true }
            }).catch(() => [])
        ]);
        
        const standardTags = [
            "Clear Explanations",
            "Approachable",
            "Engaging Lectures",
            "Heavy Workload",
            "Tough Grader"
        ];

        const allTagNames = Array.from(new Set([
            ...standardTags,
            ...(dbTags || []).map(t => t.name)
        ]));

        const counts = {};
        allTagNames.forEach(t => {
            counts[t] = 0;
        });

        let totalTags = 0;
        
        reviews.forEach(r => {
            if (r.tags && r.tags.length > 0) {
                const validTags = r.tags.filter(t => t !== "None of these fit");
                validTags.forEach(t => {
                    counts[t] = (counts[t] || 0) + 1;
                    totalTags++;
                });
            }
        });
        
        const stats = Object.entries(counts).map(([name, count]) => ({
            name,
            count,
            percentage: totalTags > 0 ? Math.round((count / totalTags) * 100) : 0
        })).sort((a, b) => {
            if (b.count !== a.count) return b.count - a.count;
            return allTagNames.indexOf(a.name) - allTagNames.indexOf(b.name);
        });
        
        const totalReviewsWithTags = reviews.filter(r => r.tags && r.tags.length > 0).length;
        const MIN_REVIEWS_FOR_TAGS = 5;
        const sufficientData = totalReviewsWithTags >= MIN_REVIEWS_FOR_TAGS;
        const needed = Math.max(0, MIN_REVIEWS_FOR_TAGS - totalReviewsWithTags);
        
        res.json({ stats, totalReviewsWithTags, sufficientData, needed });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

import { generateTeacherSummaries } from "../services/aiService.js";

// In-memory cache with TTL and promise deduplication to collapse thundering-herd requests
const aiSummaryCache = new Map();
const inFlightSummaries = new Map();
const AI_SUMMARY_TTL = 60 * 60 * 1000; // 1 hour TTL
const AI_SUMMARY_FAILURE_TTL = 2 * 60 * 1000; // retry an unavailable summary after 2 minutes

// Responses always carry a status so the client can tell "no reviews yet" from "AI unavailable":
//   { status: "ok", summary } | { status: "no_reviews", summary: null } | { status: "unavailable", summary: null }
export const getTeacherAISummary = async (req, res) => {
    try {
        const { teacherId } = req.params;
        const cacheKey = `ai-summary-${teacherId}`;

        const cached = aiSummaryCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < cached.ttl) {
            return res.json(cached.data);
        }

        // Collapse concurrent requests for the same teacher into a single promise
        let promise = inFlightSummaries.get(cacheKey);
        if (!promise) {
            promise = (async () => {
                const reviews = await prisma.review.findMany({
                    where: { revieweeId: teacherId, isFlagged: false },
                    select: { reviewText: true },
                    orderBy: { createdAt: "desc" },
                    take: 50 // Cap to latest 50 reviews for LLM prompt context
                });

                if (!reviews || reviews.length === 0) {
                    return { status: "no_reviews", summary: null };
                }

                const summary = await generateTeacherSummaries(reviews);
                const result = summary
                    ? { status: "ok", summary }
                    : { status: "unavailable", summary: null };
                // Failures are cached briefly so a Gemini outage does not trigger a call per page view
                aiSummaryCache.set(cacheKey, {
                    data: result,
                    timestamp: Date.now(),
                    ttl: summary ? AI_SUMMARY_TTL : AI_SUMMARY_FAILURE_TTL
                });
                return result;
            })();
            inFlightSummaries.set(cacheKey, promise);
        }

        let result;
        try {
            result = await promise;
        } finally {
            inFlightSummaries.delete(cacheKey);
        }

        res.json(result);
    } catch (e) {
        console.error("Failed to generate AI summary:", e);
        res.status(500).json({ status: "unavailable", summary: null, error: "Failed to generate AI insights" });
    }
};

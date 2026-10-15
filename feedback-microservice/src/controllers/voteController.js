import { voteReview as voteReviewService } from "../services/voteService.js";
import prisma from "../lib/prisma.js";

export const voteReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { user, vote } = req.body;

        if (!user || !user.userId) {
            return res.status(400).json({
                error: "User is required"
            });
        }

        if (!vote || !["UP", "DOWN"].includes(vote.type)) {
            return res.status(400).json({
                error: "Vote must be UP or DOWN"
            });
        }

        const voter = await prisma.user.findUnique({
            where: { id: user.userId },
            select: { isBanned: true }
        });
        if (voter && voter.isBanned) {
            return res.status(403).json({
                error: "Your account has been suspended by an administrator. You cannot vote.",
                isBanned: true
            });
        }

        const reviewId = Number(id);

        const result = await voteReviewService({
            reviewId,
            userId: user.userId,
            voteType: vote.type
        });

        // Fetch exact aggregated counts from DB in parallel
        const [upvotes, downvotes] = await Promise.all([
            prisma.reviewVote.count({ where: { reviewId, voteType: "UP" } }),
            prisma.reviewVote.count({ where: { reviewId, voteType: "DOWN" } })
        ]);

        return res.status(200).json({
            vote: result,
            upvotes,
            downvotes
        });
    } catch (error) {
        console.error("Vote review error:", error);
        return res.status(500).json({
            error: "Failed to vote"
        });
    }
};
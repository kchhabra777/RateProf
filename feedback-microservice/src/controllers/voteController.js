import { voteReview as voteReviewService } from "../services/voteService.js";
import prisma from "../lib/prisma.js";

export const voteReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { vote } = req.body;

        if (!vote || !["UP", "DOWN"].includes(vote.type)) {
            return res.status(400).json({
                error: "Vote must be UP or DOWN"
            });
        }

        const reviewId = Number(id);

        // Voter is the gateway-verified user; any user ID in the body is ignored
        const result = await voteReviewService({
            reviewId,
            userId: req.authUser.id,
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
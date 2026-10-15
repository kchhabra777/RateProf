import {
    createReply as createReplyService,
    getRepliesByReview as getRepliesService,
    voteReply as voteReplyService
} from "../services/replyService.js";
import prisma from "../lib/prisma.js";

export const createReply = async (req, res) => {
    try {
        const { id } = req.params; // reviewId
        const { replyText, parentReplyId } = req.body;

        if (!replyText || replyText.trim() === "") {
            return res.status(400).json({ error: "Reply text is required" });
        }

        // Author identity, role and badge come from the gateway-verified user so nobody can post as "Faculty"
        const author = req.authUser;
        let authorName = "Anonymous Student";
        let authorBadge = "Verified Student";
        if (author.role === "TEACHER") {
            authorName = author.teacherProfile?.fullName || "Faculty Member";
            authorBadge = `${author.teacherProfile?.designation || "Faculty"} (${author.teacherProfile?.department || "Department"})`;
        } else if (author.role === "ADMIN") {
            authorName = "Administrator";
            authorBadge = "Admin";
        }

        const reply = await createReplyService({
            reviewId: Number(id),
            authorId: author.id,
            authorRole: author.role,
            authorName,
            authorBadge,
            replyText: replyText.trim(),
            parentReplyId: parentReplyId ? Number(parentReplyId) : null
        });

        return res.status(201).json({ reply });
    } catch (error) {
        console.error("Failed to create reply:", error);
        return res.status(400).json({ error: error.message || "Failed to create reply" });
    }
};

export const voteOnReply = async (req, res) => {
    try {
        const { replyId } = req.params;
        const { vote } = req.body;

        if (!vote || !["UP", "DOWN"].includes(vote.type)) {
            return res.status(400).json({ error: "Vote type must be UP or DOWN" });
        }

        const numReplyId = Number(replyId);

        // Voter is the gateway-verified user; any user ID in the body is ignored
        const result = await voteReplyService({
            replyId: numReplyId,
            userId: req.authUser.id,
            voteType: vote.type
        });

        // Fetch exact aggregated counts from DB in parallel
        const [upvotes, downvotes] = await Promise.all([
            prisma.replyVote.count({ where: { replyId: numReplyId, voteType: "UP" } }),
            prisma.replyVote.count({ where: { replyId: numReplyId, voteType: "DOWN" } })
        ]);

        return res.status(200).json({
            vote: result,
            upvotes,
            downvotes
        });
    } catch (error) {
        console.error("Failed to vote on reply:", error);
        return res.status(500).json({ error: "Failed to vote on reply" });
    }
};

export const getReplies = async (req, res) => {
    try {
        const { id } = req.params; // reviewId
        const replies = await getRepliesService(Number(id));
        return res.status(200).json({ replies });
    } catch (error) {
        console.error("Failed to fetch replies:", error);
        return res.status(500).json({ error: "Failed to fetch replies" });
    }
};

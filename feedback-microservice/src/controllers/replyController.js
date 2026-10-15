import {
    createReply as createReplyService,
    getRepliesByReview as getRepliesService,
    voteReply as voteReplyService
} from "../services/replyService.js";
import prisma from "../lib/prisma.js";

export const createReply = async (req, res) => {
    try {
        const { id } = req.params; // reviewId
        const {
            authorId,
            authorRole,
            authorName,
            authorBadge,
            replyText,
            parentReplyId
        } = req.body;

        if (!authorId) {
            return res.status(400).json({ error: "Author ID is required" });
        }

        if (!["STUDENT", "TEACHER", "ADMIN"].includes(authorRole)) {
            return res.status(403).json({ error: "Only registered students, faculty, and admins can post in discussion threads." });
        }

        if (!replyText || replyText.trim() === "") {
            return res.status(400).json({ error: "Reply text is required" });
        }

        const authorUser = await prisma.user.findUnique({
            where: { id: authorId },
            select: { isBanned: true }
        });
        if (authorUser && authorUser.isBanned) {
            return res.status(403).json({
                error: "Your account has been suspended by an administrator. You cannot post replies.",
                isBanned: true
            });
        }

        const reply = await createReplyService({
            reviewId: Number(id),
            authorId,
            authorRole,
            authorName: authorName || (authorRole === "TEACHER" ? "Faculty Member" : authorRole === "ADMIN" ? "Administrator" : "Student"),
            authorBadge: authorBadge || (authorRole === "TEACHER" ? "Faculty" : authorRole === "ADMIN" ? "Admin" : "Student"),
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
        const { user, vote } = req.body;

        if (!user || !user.userId) {
            return res.status(400).json({ error: "User is required" });
        }

        if (!vote || !["UP", "DOWN"].includes(vote.type)) {
            return res.status(400).json({ error: "Vote type must be UP or DOWN" });
        }

        const voterUser = await prisma.user.findUnique({
            where: { id: user.userId },
            select: { isBanned: true }
        });
        if (voterUser && voterUser.isBanned) {
            return res.status(403).json({
                error: "Your account has been suspended by an administrator. You cannot vote.",
                isBanned: true
            });
        }

        const numReplyId = Number(replyId);

        const result = await voteReplyService({
            replyId: numReplyId,
            userId: user.userId,
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

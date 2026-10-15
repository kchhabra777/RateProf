import express from "express";
import cors from "cors";

import reviewRoutes from "./routes/reviewRoutes.js";
import voteRoutes from "./routes/voteRoutes.js";
import flagRoutes from "./routes/flagRoutes.js";
import replyRoutes from "./routes/replyRoutes.js";
import ratingRoutes from "./routes/ratingRoutes.js";
import { attachGatewayUser } from "./lib/gatewayAuth.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

app.get("/health", (req, res) => {
    res.json({
        status: "OK",
        service: "Feedback Management Microservice"
    });
});

app.use(attachGatewayUser);

app.use("/reviews", flagRoutes);
app.use("/reviews", voteRoutes);
app.use("/reviews", replyRoutes);
app.use("/reviews", reviewRoutes);
app.use("/ratings", ratingRoutes);

// Return JSON for body-parser failures (oversized or malformed payloads) instead of an HTML page
app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    if (status >= 500) console.error("Unhandled feedback-service error:", err);
    res.status(status).json({
        error: status === 413 ? "Request body is too large." : status === 400 ? "Invalid request body." : "Internal server error"
    });
});

export default app;
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

import app from "./app.js";
import { requireEnv } from "./lib/secrets.js";

requireEnv("GATEWAY_INTERNAL_SECRET");

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Feedback Microservice running on http://localhost:${PORT}`);
});


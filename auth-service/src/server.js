import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

import app from "./app.js";
import { requireEnv } from "./utils/secrets.js";

requireEnv("JWT_SECRET");
requireEnv("GATEWAY_INTERNAL_SECRET");

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`🚀 Auth & Profile Microservice running on port ${PORT}`);
});


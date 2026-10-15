import jwt from "jsonwebtoken";
import { requireEnv } from "./secrets.js";

// Read lazily: ES module imports are evaluated before server.js loads .env.
export const generateToken = (payload) => {
  return jwt.sign(payload, requireEnv("JWT_SECRET"), { expiresIn: "7d" });
};

export const verifyToken = (token) => {
  return jwt.verify(token, requireEnv("JWT_SECRET"));
};

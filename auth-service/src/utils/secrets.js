import crypto from "crypto";

// Secrets have no fallback values: a missing variable must stop the service,
// never silently fall back to a value that is visible in the repository.
export const requireEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`FATAL: ${name} environment variable is required.`);
  }
  return value;
};

const safeEqual = (a, b) => {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

// True only when the request carries the shared secret injected by the API gateway.
export const isFromGateway = (req) => {
  const provided = req.headers["x-gateway-secret"];
  return Boolean(provided) && safeEqual(provided, requireEnv("GATEWAY_INTERNAL_SECRET"));
};

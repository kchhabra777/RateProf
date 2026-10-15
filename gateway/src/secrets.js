// Secrets have no fallback values: a missing variable must stop the service,
// never silently fall back to a value that is visible in the repository.
export const requireEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`FATAL: ${name} environment variable is required.`);
  }
  return value;
};

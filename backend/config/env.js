const validateEnv = () => {
  const missing = ["MONGODB_URI", "JWT_SECRET"].filter((key) => !process.env[key]?.trim());
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}. See backend/.env.example.`);
  }
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters.");
  }
  const origins = (process.env.CLIENT_URL || "http://localhost:3000").split(",").map((value) => value.trim());
  for (const origin of origins) {
    try {
      const url = new URL(origin);
      if (!["http:", "https:"].includes(url.protocol) || url.origin !== origin) throw new Error();
    } catch {
      throw new Error(`CLIENT_URL must be a comma-separated list of exact HTTP origins: ${origin}`);
    }
  }
  const pushKeys = [process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY];
  if (pushKeys.some(Boolean) && !pushKeys.every(Boolean)) {
    throw new Error("VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be configured together.");
  }
};

module.exports = { validateEnv };

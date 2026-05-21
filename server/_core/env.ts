const _cookieSecret = process.env.JWT_SECRET;
if (!_cookieSecret || _cookieSecret.length < 32) {
  const msg = `JWT_SECRET is ${_cookieSecret ? "too short (min 32 chars)" : "MISSING"}. Generate: openssl rand -base64 64`;
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    throw new Error(`[FATAL] ${msg}`);
  }
  console.warn(`[WARN] ${msg} — using insecure default for development only`);
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: _cookieSecret || "dev-insecure-secret-do-not-use-in-production",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};

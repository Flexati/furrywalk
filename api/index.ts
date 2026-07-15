/**
 * Vercel serverless entry point.
 *
 * Vercel auto-detects an Express app exported as default and wraps it
 * as a serverless function. All /api/* routes are handled by this function.
 *
 * Force redeploy: v2 — privacy route via /api/privacy
 */
import "dotenv/config"; // no-op in production, loads .env in local dev
import { createApp } from "../server/_core/index";

const app = createApp();

export default app;

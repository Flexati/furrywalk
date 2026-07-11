/**
 * Minimal in-memory rate limiter — no new npm dependency required.
 *
 * NOTE: this is per-process memory, so on serverless (Vercel) each cold
 * instance has its own counters — it is a best-effort mitigation against
 * casual abuse/brute force, not a substitute for an edge/WAF rate limiter
 * in front of production traffic.
 */
import type { NextFunction, Request, Response } from "express";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function getClientKey(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0]?.trim();
  return ip || req.socket.remoteAddress || "unknown";
}

/**
 * Returns Express middleware that allows at most `max` requests per
 * `windowMs` milliseconds per client IP, for the route(s) it's mounted on.
 */
export function rateLimit(options: { windowMs: number; max: number; message?: string }) {
  const { windowMs, max, message = "Too many requests, please try again later." } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.path}:${getClientKey(req)}`;
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (bucket.count >= max) {
      res.status(429).json({ error: message });
      return;
    }

    bucket.count += 1;
    next();
  };
}

// Periodically sweep expired buckets so the map doesn't grow unbounded on
// long-lived standalone server processes.
(setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 60_000) as unknown as { unref?: () => void }).unref?.();

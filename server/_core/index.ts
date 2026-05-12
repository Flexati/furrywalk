import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { handleLSWebhook } from "./webhooks/ls-webhook";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { getDb } from "../db";

// ─── Express app factory (shared between standalone server and Vercel serverless) ───
export function createApp(): express.Express {
  const app = express();

  // Enable CORS for all routes - reflect the request origin to support credentials
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.header("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // Lemon Squeezy webhook endpoint
  app.post("/api/webhooks/ls", (req, res) => handleLSWebhook(req, res));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.get("/api/health/db", async (_req, res) => {
    const start = Date.now();
    try {
      const db = await getDb();
      if (!db) {
        res.json({ ok: false, error: "getDb returned null (no DATABASE_URL?)", latency_ms: Date.now() - start });
        return;
      }
      // Test query via the pg pool
      const result = await (db as unknown as { $client: { query: (sql: string) => Promise<unknown> } }).$client.query("SELECT 1");
      res.json({ ok: true, latency_ms: Date.now() - start, rows: (result as { rows: unknown[] }).rows });
    } catch (err) {
      res.json({ ok: false, error: err instanceof Error ? err.message : "Unknown error", latency_ms: Date.now() - start });
    }
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  return app;
}

// ─── Standalone server (dev / production on non-serverless platforms) ───

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = createApp();
  const server = createServer(app);

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

// Only start the standalone server when NOT running on Vercel serverless
if (!process.env.VERCEL) {
  startServer().catch(console.error);
}

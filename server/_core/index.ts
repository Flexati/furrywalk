import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { handleLSWebhook } from "./webhooks/ls-webhook";
import { handlePlayBillingSync } from "./play-billing";
import { appRouter } from "../routers";
import { createContext } from "./context";

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

  // Google Play Billing purchase sync
  app.post("/api/play-billing/sync", (req, res) => handlePlayBillingSync(req, res));

  // ─── Privacy Policy (PUBLIC — required by Google Play Store) ───
  app.get("/api/privacy", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(`<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Privacy Policy — Passeggiata Furba</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
         background:#FFF5E6;color:#2B2B2B;padding:32px 24px;max-width:720px;margin:0 auto;line-height:1.7}
    h1{color:#1E3D2F;font-size:2rem;margin-bottom:8px}
    h2{color:#1E3D2F;font-size:1.2rem;margin:28px 0 10px}
    p,li{margin-bottom:8px;font-size:0.97rem}
    ul{padding-left:20px}
    a{color:#1E3D2F}
    .meta{color:#888;font-size:0.85rem;margin-bottom:32px}
    table{width:100%;border-collapse:collapse;margin:12px 0}
    th,td{text-align:left;padding:8px 10px;border:1px solid #ddd;font-size:0.88rem}
    th{background:#f0ebe2;color:#1E3D2F}
  </style>
</head>
<body>
  <h1>🐾 Privacy Policy</h1>
  <p class="meta">Passeggiata Furba &nbsp;·&nbsp; Ultimo aggiornamento: 10 Maggio 2026</p>

  <h2>1. Titolare del trattamento</h2>
  <p>Hamza Jaoual — <a href="mailto:amzajaguar@gmail.com">amzajaguar@gmail.com</a></p>

  <h2>2. Dati raccolti</h2>
  <ul>
    <li><strong>Account:</strong> identificatore OAuth (Google), indirizzo email.</li>
    <li><strong>Profilo cane:</strong> nome, razza, età, peso, foto (opzionale).</li>
    <li><strong>Passeggiate:</strong> traccia GPS durante le camminate, distanza, durata, foto allegate.</li>
    <li><strong>Salute:</strong> date vaccinazioni e antiparassitari inserite dall'utente.</li>
    <li><strong>Abbonamento:</strong> tier (Free/Pro), token di acquisto Google Play o Lemon Squeezy. <em>Non memorizziamo dati di carta di credito.</em></li>
    <li><strong>Diagnostica:</strong> log anonimi di crash (via Expo).</li>
  </ul>

  <h2>3. Finalità</h2>
  <ul>
    <li>Registrare e visualizzare i percorsi delle passeggiate.</li>
    <li>Calcolare statistiche di attività del cane.</li>
    <li>Inviare promemoria per vaccinazioni e trattamenti.</li>
    <li>Gestire l'abbonamento Premium.</li>
    <li>Migliorare l'app tramite analisi anonime.</li>
  </ul>

  <h2>4. Condivisione dei dati</h2>
  <p>Non vendiamo i dati a terzi. Li condividiamo solo con:</p>
  <table>
    <tr><th>Servizio</th><th>Finalità</th><th>Dato condiviso</th></tr>
    <tr><td>Supabase</td><td>Database e storage</td><td>Tutti i dati app</td></tr>
    <tr><td>Google Play Billing</td><td>Pagamenti Android</td><td>Token acquisto</td></tr>
    <tr><td>Lemon Squeezy</td><td>Pagamenti iOS/Web</td><td>Token acquisto</td></tr>
    <tr><td>Vercel</td><td>Hosting API</td><td>Dati cifrati in transito</td></tr>
  </table>

  <h2>5. Posizione GPS</h2>
  <p>Il GPS è attivo <strong>solo durante le passeggiate avviate dall'utente</strong>. Non c'è tracciamento in background. I dati GPS non vengono condivisi con terze parti per pubblicità.</p>

  <h2>6. Conservazione</h2>
  <p>I dati vengono conservati fino alla cancellazione del profilo. Puoi eliminare passeggiate singole o l'intero account inviando email a <a href="mailto:amzajaguar@gmail.com">amzajaguar@gmail.com</a>.</p>

  <h2>7. Diritti GDPR</h2>
  <ul>
    <li>Accesso, rettifica, cancellazione, portabilità e opposizione al trattamento.</li>
    <li>Per esercitarli: <a href="mailto:amzajaguar@gmail.com">amzajaguar@gmail.com</a></li>
  </ul>

  <h2>8. Minori</h2>
  <p>L'app non è rivolta a minori di 13 anni e non raccoglie consapevolmente dati da essi.</p>

  <h2>9. Contatti</h2>
  <p><a href="mailto:amzajaguar@gmail.com">amzajaguar@gmail.com</a></p>
</body>
</html>`);
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
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

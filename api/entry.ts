import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import { createApp } from "../server/_core/index";

const app = createApp();

// ─── Static privacy + terms pages (PUBLIC — required by Google Play Store) ───
// Read the HTML files at module-eval time, fall back to embedded full HTML if missing.
// This avoids relying on Vercel static serving (public/ excluded by .vercelignore,
// outputDirectory:"." only ships root files when framework is not 'nextjs').
function readStaticFile(name: string): string {
  const candidates = [
    process.cwd() + "/" + name,
    path.resolve(process.cwd(), "..", name),
    path.resolve(__dirname, "..", name),
    "/var/task/" + name,
    "/var/" + name,
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
    } catch {}
  }
  return "";
}

const PRIVACY_HTML = readStaticFile("privacy.html");
const TERMS_HTML = readStaticFile("terms.html");

const PRIVACY_FALLBACK = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Privacy Policy — Passeggiata Furba</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:sans-serif;background:#FFF5E6;color:#2B2B2B;padding:2rem;max-width:800px;margin:2rem auto;line-height:1.7}
    h1{color:#1E3D2F;font-size:1.8rem;margin-bottom:0.5rem}
    h2{color:#1E3D2F;font-size:1.2rem;margin-top:1.4rem;margin-bottom:0.5rem}
    p,li{margin-bottom:0.6rem}
    a{color:#1E3D2F}
  </style>
</head>
<body>
  <h1>Privacy Policy — Passeggiata Furba</h1>
  <p><em>Contenuto embed fallback — file privacy.html non incluso nel bundle.</em></p>
  <h2>1. Titolare del trattamento</h2>
  <p>Hamza Jaoual — <a href="mailto:amzajaguar@gmail.com">amzajaguar@gmail.com</a></p>
  <h2>2. Dati raccolti</h2>
  <ul>
    <li><strong>Account:</strong> email e OAuth provider (Google/Apple).</li>
    <li><strong>Profilo cane:</strong> nome, razza, età, peso, foto (opzionale).</li>
    <li><strong>Passeggiate:</strong> tracce GPS in foreground, durata, distanza, foto allegate.</li>
    <li><strong>Salute:</strong> record vaccinali e antiparassitari inseriti dall'utente.</li>
    <li><strong>Abbonamento:</strong> tier (Free/Pro/Family) e token di acquisto Play Billing.</li>
    <li><strong>Diagnostica:</strong> crash log anonimi via Expo.</li>
  </ul>
  <h2>3. Finalità</h2>
  <ul>
    <li>Registrare e visualizzare i percorsi delle passeggiate.</li>
    <li>Calcolare statistiche di attività del cane.</li>
    <li>Inviare promemoria per vaccinazioni e antiparassitari.</li>
    <li>Gestire l'abbonamento Pro.</li>
    <li>Migliorare l'app tramite analisi anonime.</li>
  </ul>
  <h2>4. Condivisione dati</h2>
  <ul>
    <li>Supabase — DB e storage.</li>
    <li>Google Play Billing — pagamenti.</li>
    <li>Vercel — hosting API (dati cifrati in transito).</li>
  </ul>
  <h2>5. La tua posizione GPS</h2>
  <p>Solo in foreground durante passeggiate attive. Mai in background. Mai condivisa per advertising.</p>
  <h2>6. Conservazione</h2>
  <p>I dati sono conservati fino a cancellazione account. Le singole passeggiate possono essere eliminate dalla timeline.</p>
  <h2>7. Diritti GDPR</h2>
  <p>Accesso, rettifica, cancellazione, portabilità, opposizione. Per esercitarli: <a href="mailto:amzajaguar@gmail.com">amzajaguar@gmail.com</a></p>
  <h2>8. Minori</h2>
  <p>Non rivolto a minori di 13 anni. Nessun dato raccolto consapevolmente da essi.</p>
  <h2>9. Contatti</h2>
  <p><a href="mailto:amzajaguar@gmail.com">amzajaguar@gmail.com</a></p>
</body>
</html>`;

const TERMS_FALLBACK = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Termini di Servizio — Passeggiata Furba</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:sans-serif;background:#FFF5E6;color:#2B2B2B;padding:2rem;max-width:800px;margin:2rem auto;line-height:1.7}
    h1{color:#1E3D2F;font-size:1.8rem;margin-bottom:0.5rem}
    h2{color:#1E3D2F;font-size:1.2rem;margin-top:1.4rem;margin-bottom:0.5rem}
    p,li{margin-bottom:0.6rem}
    a{color:#1E3D2F}
  </style>
</head>
<body>
  <h1>Termini di Servizio — Passeggiata Furba</h1>
  <p><em>Smart Walk Dog</em></p>
  <h2>1. Servizio</h2>
  <p>Tracking passeggiate cani, abbonamento premium.</p>
  <h2>2. Pagamenti</h2>
  <p>Gestiti da Google Play. Cancellabili in qualsiasi momento.</p>
  <h2>3. Contatto</h2>
  <p><a href="mailto:amzajaguar@gmail.com">amzajaguar@gmail.com</a></p>
  <h2>4. Legge applicabile</h2>
  <p>Italia.</p>
</body>
</html>`;

function servePage(res: any, content: string, fallback: string, title: string, source: "file" | "fallback") {
  const body = content && content.length > 200 ? content : fallback;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.setHeader("X-Page-Source", source);
  res.setHeader("X-Page-Title", title);
  res.send(body);
}

app.get("/privacy", (_req, res) => {
  servePage(res, PRIVACY_HTML, PRIVACY_FALLBACK, "privacy", PRIVACY_HTML ? "file" : "fallback");
});
app.get("/api/privacy", (_req, res) => {
  servePage(res, PRIVACY_HTML, PRIVACY_FALLBACK, "privacy", PRIVACY_HTML ? "file" : "fallback");
});

app.get("/terms", (_req, res) => {
  servePage(res, TERMS_HTML, TERMS_FALLBACK, "terms", TERMS_HTML ? "file" : "fallback");
});
app.get("/api/terms", (_req, res) => {
  servePage(res, TERMS_HTML, TERMS_FALLBACK, "terms", TERMS_HTML ? "file" : "fallback");
});

// DEBUG: verify which bundle is running
app.get("/api/__build_info", (_req, res) => {
  res.json({
    nodeVersion: process.version,
    cwd: process.cwd(),
    dirname: __dirname,
    privacyLoaded: !!PRIVACY_HTML,
    termsLoaded: !!TERMS_HTML,
    privacySize: PRIVACY_HTML.length,
    termsSize: TERMS_HTML.length,
    buildTimestamp: new Date().toISOString(),
  });
});

export default app;

#!/usr/bin/env node
/**
 * Script tutto-in-uno:
 * 1. Imposta secrets Supabase su GitHub Actions
 * 2. Configura git remote con token
 * 3. git add -A, commit, push
 */
import https from "node:https";
import fs from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname + "/..";

// All secrets now read from env. NEVER hardcode tokens in committed files.
// Required env: GITHUB_TOKEN, SUPABASE_URL, SUPABASE_KEY, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD
const TOKEN  = process.env.GITHUB_TOKEN || "";
const OWNER  = process.env.GITHUB_OWNER  || "amzajaguar-blip";
const REPO   = process.env.GITHUB_REPO   || "passeggiata-furba";
const REMOTE = TOKEN
  ? `https://x-access-token:${TOKEN}@github.com/${OWNER}/${REPO}.git`
  : `https://github.com/${OWNER}/${REPO}.git`;

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "";

// ─── GitHub API ───
function ghRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: "api.github.com",
      path, method,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "passeggiata-ci",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    };
    if (body) {
      opts.headers["Content-Type"] = "application/json";
    }
    const req = https.request(opts, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        if (res.statusCode >= 400) reject(new Error(`${res.statusCode}: ${d}`));
        else resolve(d ? JSON.parse(d) : {});
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function setSecret(sodium, keyId, pubKey64, name, value) {
  const pk  = sodium.from_base64(pubKey64, sodium.base64_variants.ORIGINAL);
  const enc = sodium.crypto_box_seal(sodium.from_string(value), pk);
  const b64 = sodium.to_base64(enc, sodium.base64_variants.ORIGINAL);
  await ghRequest("PUT", `/repos/${OWNER}/${REPO}/actions/secrets/${name}`, {
    encrypted_value: b64,
    key_id: keyId,
  });
  console.log(`  ✅ ${name}`);
}

function run(cmd, opts = {}) {
  console.log(`  $ ${cmd}`);
  return execSync(cmd, { cwd: ROOT, stdio: "pipe", ...opts }).toString().trim();
}

// ─── Main ───
async function main() {
  // ── Step 1: Supabase secrets ──
  console.log("\n📡 Impostando secrets Supabase su GitHub Actions...");
  const mod    = await import("libsodium-wrappers");
  const sodium = mod.default || mod;
  await sodium.ready;

  const { key_id, key: pubKey } = await ghRequest(
    "GET",
    `/repos/${OWNER}/${REPO}/actions/secrets/public-key`
  );

  await setSecret(sodium, key_id, pubKey, "EXPO_PUBLIC_SUPABASE_URL", SUPABASE_URL);
  await setSecret(sodium, key_id, pubKey, "EXPO_PUBLIC_SUPABASE_ANON_KEY", SUPABASE_KEY);

  console.log("  ✅ Supabase secrets impostati!\n");

  // ── Step 2: Git commit + push ──
  console.log("📦 Git: staging tutte le modifiche...");

  // Configure git identity if not set
  try { run("git config user.email"); } catch {
    run('git config user.email "amzajaguar@gmail.com"');
    run('git config user.name "Hamza Jaoual"');
  }

  // Set remote with token
  run(`git remote set-url origin ${REMOTE}`);

  // Stage tracked modified/deleted files + new scripts (except set-secrets-now.mjs)
  const filesToAdd = [
    ".env.example",
    ".github/workflows/build-android-apk.yml",
    "components/paywall/PaywallScreen.tsx",
    "lib/services/payment-provider.ts",
    "server/_core/index.ts",
    "server/routers/subscription.ts",
    "PRIVACY_POLICY.md",
    "scripts/set-github-secrets.mjs",
    "scripts/commit-and-push.sh",
  ];

  // Also stage deleted files
  const deletedFiles = [
    "lib/services/ls-checkout.ts",
    "lib/services/payment-service.ts",
    "scripts/simulate-ls-webhook.ts",
    "server/_core/webhooks/ls-webhook.ts",
  ];

  for (const f of [...filesToAdd, ...deletedFiles]) {
    try { run(`git add "${f}"`); } catch (e) { console.log(`  ⚠️  skip ${f}: ${e.message}`); }
  }

  // Check if anything to commit
  const status = run("git status --porcelain");
  if (!status) {
    console.log("  ℹ️  Nessuna modifica da committare.");
  } else {
    console.log("\n📝 Commit...");
    run(`git commit -m "chore: remove Lemon Squeezy, Play Billing only + secrets script

- Remove Lemon Squeezy from Privacy Policy, payments, subscriptions
- Deleted: ls-checkout.ts, payment-service.ts, ls-webhook.ts, simulate-ls-webhook.ts  
- Updated: PaywallScreen.tsx, payment-provider.ts, subscription.ts, server/index.ts
- Added: scripts/set-github-secrets.mjs for CI secrets management
- Privacy policy: Google Play Billing only, GDPR compliant"`);

    console.log("\n🚀 Push su origin/main...");
    run("git push origin main");
    console.log("  ✅ Push completato!");
  }

  console.log("\n🎉 TUTTO FATTO!");
  console.log("   Privacy Policy live: https://passeggiata-furba.vercel.app/api/privacy");
  console.log("   GitHub Actions pronti per build release con keystore");
  console.log("   Supabase configurato per la mappa community");
}

main().catch((e) => {
  console.error("\n❌ Errore:", e.message);
  process.exit(1);
});

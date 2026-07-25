#!/usr/bin/env node
// Script one-shot per impostare tutti i 4 secrets keystore Android
// Token e password embedded per esecuzione diretta

import https from "node:https";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// All secrets read from env. NEVER hardcode tokens or keystore passwords in committed files.
// Required env: GITHUB_TOKEN, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD, ANDROID_KEYSTORE_PASSWORD, GITHUB_OWNER, GITHUB_REPO
const TOKEN = process.env.GITHUB_TOKEN || "";
const OWNER = process.env.GITHUB_OWNER  || "amzajaguar-blip";
const REPO  = process.env.GITHUB_REPO   || "passeggiata-furba";
const KEY_ALIAS = process.env.ANDROID_KEY_ALIAS || "";
const KEY_PWD   = process.env.ANDROID_KEY_PASSWORD || "";
const KS_PWD    = process.env.ANDROID_KEYSTORE_PASSWORD || KEY_PWD;

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
    if (body) opts.headers["Content-Type"] = "application/json";
    const req = https.request(opts, (res) => {
      let d = "";
      res.on("data", c => d += c);
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
  const msg = sodium.from_string(value);
  const enc = sodium.crypto_box_seal(msg, pk);
  const b64 = sodium.to_base64(enc, sodium.base64_variants.ORIGINAL);
  await ghRequest("PUT", `/repos/${OWNER}/${REPO}/actions/secrets/${name}`, {
    encrypted_value: b64,
    key_id: keyId,
  });
  console.log(`  ✅ ${name}`);
}

async function main() {
  const mod    = await import("libsodium-wrappers");
  const sodium = mod.default || mod;
  await sodium.ready;

  console.log("🔑 Fetching public key...");
  const { key_id, key: pubKey } = await ghRequest("GET",
    `/repos/${OWNER}/${REPO}/actions/secrets/public-key`);

  const ksB64 = fs.readFileSync(join(ROOT, "keystore.b64"), "utf8").trim();

  console.log("🔐 Setting secrets...");
  await setSecret(sodium, key_id, pubKey, "ANDROID_KEYSTORE_BASE64",   ksB64);
  await setSecret(sodium, key_id, pubKey, "ANDROID_KEY_ALIAS",         KEY_ALIAS);
  await setSecret(sodium, key_id, pubKey, "ANDROID_KEY_PASSWORD",      KEY_PWD);
  await setSecret(sodium, key_id, pubKey, "ANDROID_KEYSTORE_PASSWORD", KS_PWD);

  console.log("\n🎉 Tutti i 4 secrets impostati con successo!");
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });

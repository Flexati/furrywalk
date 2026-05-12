# RCA Report — Vercel Deployments Failing with "Unexpected error" (0ms Builds)

**Project:** `amzajaguar-blips-projects/smart-walk-app` (ID: `prj_qeBBJAjMOKC4hlKvLlwmJD4y1xEs`)  
**Date:** 2026-05-12  
**Severity:** P1 (core feature broken — API unreachable)  
**Author:** Forensic Debugging Agent  

---

## Executive Summary

All Vercel deployments fail because Vercel auto-detects two conflicting build steps:

1. **`@vercel/node`** — correctly detects `api/index.ts` as a serverless function
2. **`@vercel/static-build`** — incorrectly detects the `build` script in `package.json` as a static-site build

Build #2 runs `pnpm run build` → `esbuild` outputs to `dist/`, then Vercel expects an output directory named `public/` (the default for Framework "Other"). Since no `public/` directory exists, the static-build **fails**, which marks the entire deployment as **Error**.

The serverless function build (`@vercel/node` for `api/index.ts`) either never runs or its output is discarded — hence `Builds: [0ms]`.

---

## 5 Whys Analysis

### Why #1: Why do deployments fail with "Error"?
Because the `@vercel/static-build` step fails with:

> No Output Directory named "public" found after the Build completed.

### Why #2: Why does @vercel/static-build run at all?
Because Vercel auto-detects the `build` script in `package.json` when Framework is "Other" and no explicit `builds` array overrides it.

### Why #3: Why does the `build` script exist if it's not for Vercel?
The `build` script (`esbuild server/_core/index.ts --bundle --outdir=dist`) is for standalone server deployment (`node dist/index.js`), not for Vercel serverless. It's a legitimate script — it just shouldn't be invoked by Vercel.

### Why #4: Why was this not caught earlier?
The `smart-walk-app` project was created ~2h ago. Earlier deployments with a different (or default) Framework preset may not have triggered static-build auto-detection. The user changed to Framework "Other" to fix a different issue (vercel.json being ignored), which activated the auto-detection of the `build` script.

### Why #5: Why does the project have both a standalone server AND Vercel serverless entry points?
`server/_core/index.ts` exports `createApp()` and also starts a standalone HTTP server when `VERCEL` env var is not set. This dual-mode design (standalone + serverless) is intentional. The `build` script only compiles the standalone entry — it's not needed for Vercel at all.

---

## Root Cause Chain (Causal Timeline)

```
Trigger: User deploys to Vercel
    ↓
Vercel reads vercel.json → finds "framework": null (Framework "Other")
    ↓
Vercel auto-detects builds:
  - api/index.ts → @vercel/node (serverless function) ✓
  - package.json (has "build" script) → @vercel/static-build (static site) ✗
    ↓
Vercel runs pnpm install --frozen-lockfile → succeeds (~77s)
    ↓
Vercel runs @vercel/static-build first (or in parallel):
  - Executes "pnpm run build" → esbuild outputs dist/index.js (43.8kb)
  - Looks for "public/" output directory → NOT FOUND
    ↓
@vercel/static-build FAILS: "No Output Directory named 'public' found"
    ↓
Entire deployment marked as ● Error
    ↓
@vercel/node build for api/index.ts → [0ms] (discarded/never recorded)
    ↓
Deployment has routes (from vercel.json) but no built functions → 404
```

---

## Evidence Collected

### 1. Local `vercel build` Reproduced the Error

```bash
$ vercel build --yes

Running "pnpm run build"
> esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
  dist/index.js  43.8kb
⚡ Done in 70ms

Error: No Output Directory named "public" found after the Build completed.
       Configure the Output Directory in your Project Settings.
       Alternatively, configure vercel.json#outputDirectory.
```

### 2. Deployment Inspection Confirms 0ms Builds

All 7 `smart-walk-app` deployments show identical pattern:

```
Builds
  ╶ .        [0ms]
```

Even the 2 "Ready" deployments (from 2h ago) had 0ms builds — no function was ever built.

### 3. `builds.json` Shows Two Auto-Detected Builds

```json
{
  "builds": [
    { "use": "@vercel/node", "src": "api/index.ts" },
    { "use": "@vercel/static-build", "src": "package.json" }
  ]
}
```

### 4. No `public/` Directory Exists

The project is an Expo/React Native app with an Express API — it produces no static output.

### 5. Project Settings (Dashboard)

```
Framework Preset:  Other
Build Command:     npm run vercel-build or npm run build  (auto-detected)
Output Directory:  public if it exists, or .
Install Command:   pnpm install --frozen-lockfile
Root Directory:    .
Node.js Version:   24.x
```

---

## Impact Assessment

- **Users affected:** All users hitting `/api/*` endpoints (health, auth, webhooks, tRPC)
- **Data loss:** None
- **Revenue impact:** None directly, but API unavailability blocks all backend functionality
- **Detection time:** ~2h (first "Ready" deployments with 0ms builds were undetected because they showed green)
- **Resolution time:** TBD

---

## Recommended Fix

### Option A (Recommended): Explicit `builds` array in `vercel.json`

Add a `builds` array that explicitly tells Vercel to only build the API function, preventing auto-detection of the static build:

```json
{
  "framework": null,
  "installCommand": "pnpm install --frozen-lockfile",
  "builds": [
    { "src": "api/index.ts", "use": "@vercel/node" }
  ],
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index" }
  ],
  "functions": {
    "api/index.ts": {
      "maxDuration": 10,
      "memory": 512
    }
  }
}
```

**Why this is the best approach:** It's declarative, explicit, and prevents any auto-detection ambiguity. It tells Vercel exactly what to build and nothing else.

### Option B: Create a `public/` directory

Create an empty `public/` directory so the static-build "succeeds" (produces no static files but doesn't error):

```bash
mkdir public && touch public/.gitkeep
```

Then update `.gitignore` to NOT ignore `public/`:
```
# public/  ← remove or comment out if present
```

**Why this is inferior:** It's a workaround that masks the real issue. The static build still runs unnecessarily, wasting build time.

### Option C: Remove or rename the `build` script

Remove the `build` script from `package.json` so Vercel doesn't auto-detect it.

**Why this is inferior:** The `build` script is needed for standalone server deployment. Removing it breaks local production workflows.

### Option D: Set `buildCommand` to an empty string in vercel.json

```json
{
  "buildCommand": ""
}
```

**Why this is risky:** The dashboard already shows a Build Command override. This may conflict. Option A is more explicit and robust.

---

## Verification Checklist (After Fix)

- [ ] `vercel build --yes` completes without "public" directory error
- [ ] `.vercel/output/functions/api/index.func/` exists with compiled function
- [ ] New deployment shows non-zero build duration
- [ ] `GET /api/health` returns `{"ok": true, "timestamp": ...}`
- [ ] `GET /api/trpc` returns expected tRPC response
- [ ] `POST /api/webhooks/ls` endpoint is reachable
- [ ] Cross-browser verification on the Vercel deployment URL

# Post-Mortem — Vercel 0ms Build / "Unexpected Error" Incident

**Date:** 2026-05-12  
**Incident ID:** SWA-2026-05-12-001  
**Type:** Blameless  

---

## Incident Timeline

| Time (UTC+2) | Event |
|---|---|
| **10:40** | `smart-walk-app` Vercel project created from GitHub repo `amzajaguar-blip/passeggiata-furba` |
| **10:43** | Deployments start showing "Ready" but with `Builds: [0ms]` — no function built, /api/health returns 404 |
| **~11:15** | User notices 404, investigates. Discovers Framework preset was set to something other than "Other", ignoring vercel.json |
| **~11:30** | User changes Framework to "Other" in dashboard → deployments now fail with "Error" instead of "Ready" |
| **~12:16** | Separate `passeggiata-furba` Vercel project created (same repo), also fails identically |
| **~12:50** | 7 failed deployments accumulated (5 smart-walk-app, 1 passeggiata-furba in same period) |
| **~13:00** | User reports issue. Forensic debugging begins. |
| **~13:15** | Root cause identified via `vercel build --yes` local reproduction |

### Detection Time: ~35 minutes (10:43 → 11:15+)
First "Ready" deployments appeared successful (green badge) but returned 404. The green status masked the failure.

### Resolution Time: TBD (fix pending)

---

## Root Cause

Vercel's "Other" Framework preset auto-detects two builds:

1. `@vercel/node` — for `api/index.ts` (serverless API function) — **correct**
2. `@vercel/static-build` — for `package.json` because it has a `"build"` script — **incorrect**

Build #2 runs `pnpm run build` (esbuild compiles standalone server to `dist/`), then fails because Vercel expects a `public/` output directory. The failure of build #2 marks the entire deployment as Error, discarding or preventing build #1's output.

**The `"build"` script in `package.json` is legitimate** — it compiles the standalone server for non-Vercel deployments. It should not be invoked by Vercel, but auto-detection picks it up.

---

## Impact

- **API endpoints completely unavailable:** /api/health, /api/trpc, /api/webhooks/ls, /api/oauth/*, /api/auth/*
- **No data loss**
- **No revenue impact** (pre-launch)
- **7 failed deployments** in ~2 hour window
- **Wasted triage time:** User spent time debugging Framework preset and Root Directory settings (which were valid concerns but not the root cause)

---

## Contributing Factors

1. **Dual-mode architecture:** The project has both a standalone server (`server/_core/index.ts` with `startServer()`) and a Vercel serverless entry point (`api/index.ts`). The standalone build script leaked into Vercel's auto-detection.

2. **No explicit `builds` array in vercel.json:** Relying on auto-detection for Framework "Other" is fragile. When it works, it's convenient; when it doesn't, failures are silent (0ms, no logs).

3. **Misleading "Ready" status:** Early deployments showed green "Ready" status despite no function being built. The only clue was the 0ms build time (not visible without CLI inspection).

4. **No health check monitor:** No automated alert fired when /api/health started returning 404.

---

## Systemic Analysis

### Is this bug unique or part of a broader class?

**Broader class: Vercel Framework "Other" auto-detection ambiguity.**

Any project with:
- A `build` script in package.json (for non-Vercel purposes)
- Serverless functions in `api/` directory
- Framework set to "Other"
- No explicit `builds` array in vercel.json

...will experience the same failure mode. This affects any dual-mode (standalone + serverless) Express/Node project on Vercel.

### Codebase audit

```bash
grep -r '"build"' package.json
# → "build": "esbuild server/_core/index.ts ..."
```

The `build` script is needed for non-Vercel deployments. No other scripts trigger auto-detection.

---

## Prevention Measures

| # | Action | Owner | Deadline | Priority |
|---|---|---|---|---|
| 1 | Add explicit `"builds": [{"src": "api/index.ts", "use": "@vercel/node"}]` to vercel.json | @amzajaguar-blip | Immediate | P0 |
| 2 | Add `vercel build --yes` to CI pipeline to catch build failures before deploy | @amzajaguar-blip | This week | P1 |
| 3 | Set up Vercel deployment monitor alert for 0ms builds | @amzajaguar-blip | This week | P2 |
| 4 | Add UptimeRobot/Checkly monitor for /api/health on production URL | @amzajaguar-blip | This week | P2 |
| 5 | Document dual-mode architecture in project README | @amzajaguar-blip | This week | P3 |

---

## Lessons Learned

1. **"Ready" ≠ working.** Vercel deployments can show green status with 0ms builds and no actual function output. Always verify with a real HTTP request.

2. **vercel.json `builds` array is the source of truth.** For Framework "Other", always define `builds` explicitly to prevent auto-detection surprises.

3. **Local `vercel build` catches what the dashboard hides.** The dashboard showed "No build logs" — but `vercel build --yes` locally reproduced the exact error in 90 seconds.

4. **`buildCommand` and `builds` are different.** The dashboard Build Command setting and the vercel.json `builds` array serve different purposes. Setting `buildCommand` to null doesn't prevent `@vercel/static-build` from auto-detecting the `build` script.

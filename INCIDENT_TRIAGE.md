# Incident Triage — Vercel Deployments Failing

**Incident ID:** SWA-2026-05-12-001  
**Date Opened:** 2026-05-12 13:00 UTC+2  
**Owner:** Forensic Debugging Agent  

---

## Severity Classification: P1

**Rationale:** Core feature (backend API) is completely unreachable. No workaround exists for API consumers. Frontend may still function client-side but all server-dependent features (auth, webhooks, tRPC, health) are broken.

---

## Symptom Capture

| Evidence Type | Detail |
|---|---|
| **Status** | All deployments since ~12:50 show `● Error` |
| **Build duration** | `[0ms]` or `Duration: ?` across all deployments |
| **Build logs** | None available in Vercel dashboard |
| **Routes** | Correctly populated from vercel.json (rewrite rule visible) |
| **Environment** | Vercel, Node 24.x, Framework "Other", pnpm 9.12.0 |
| **Deployment URL** | https://smart-walk-o7rs0w0yi-amzajaguar-blips-projects.vercel.app |
| **Error message** | "Unexpected error. Please try again later." (dashboard) |
| **Local repro** | `vercel build` fails with: "No Output Directory named 'public' found" |

---

## Reproducibility Assessment: **ALWAYS**

- 7 consecutive deployments all show the same failure pattern
- `vercel build --yes` reproduces deterministically on local machine
- Both `smart-walk-app` and `passeggiata-furba` Vercel projects exhibit identical behavior

---

## Isolation

| Layer | Verdict | Evidence |
|---|---|---|
| **User code** | ⚠️ Contributing factor | `package.json` build script triggers unwanted `@vercel/static-build` |
| **Framework (Phaser/Expo)** | ✅ Cleared | Not involved in build phase |
| **Vercel platform** | ❌ ROOT CAUSE | Auto-detection of static build conflicts with serverless function build |
| **Browser/OS** | ✅ Cleared | Build-time issue, not runtime |
| **Hardware** | ✅ Cleared | N/A |

**Conclusion:** Root cause is in the **Vercel build auto-detection** layer, triggered by the project's `package.json` build script.

---

## Initial Hypotheses (Ranked)

| # | Hypothesis | Verdict |
|---|---|---|
| H1 | pnpm lockfile version mismatch causes install failure | ❌ Refuted — install succeeds (77s, all packages installed) |
| H2 | Framework preset override ignores vercel.json | ❌ Refuted — routes from vercel.json ARE applied |
| H3 | Root Directory wrong → no files found | ❌ Refuted — Root Directory is `.`, files are found |
| H4 | `@vercel/static-build` auto-detection conflicts with `@vercel/node` | ✅ **CONFIRMED** — static build fails on missing `public/` directory |
| H5 | Node.js 24.x incompatibility | ❌ Refuted — build script runs fine |
| H6 | .gitignore excludes critical files from Vercel | ❌ Refuted — `dist/` is excluded but that's irrelevant for Vercel |

---

## Timeline

| Time (UTC+2) | Event |
|---|---|
| ~10:40 | `smart-walk-app` Vercel project created |
| ~10:43 | First "Ready" deployments — 0ms builds, returns 404 |
| ~11:30 | User changes Framework preset to "Other" (fixes vercel.json being ignored) |
| ~11:30 | User briefly sets Root Directory to "passeggiata-furba", then back to empty |
| ~12:16 | `passeggiata-furba` Vercel project created, also fails with Error |
| ~12:16–12:50 | Multiple "Error" deployments with 0ms builds |
| ~13:00 | Debugging initiated |

---

## Assigned To

Developer: @amzajaguar-blip  
Debugger: Forensic Agent  

**Next Step:** Apply fix per RCA_REPORT.md Option A (explicit `builds` array).

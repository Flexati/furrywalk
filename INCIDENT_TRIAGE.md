# Incident Triage — Passeggiata Furba Proactive Debugging Sweep

**Date**: 2026-05-13  
**Owner**: Automated Forensic Debugger  
**Scope**: Proactive debugging sweep across 8 investigation areas  
**Overall Result**: 1x P1 (critical), 3x P2 (significant), 2x P3 (cosmetic)

---

## Area 1: TypeScript Compilation — ✅ PASS
- `pnpm tsc --noEmit` → exit code 0, zero errors.
- `pnpm build:server` (esbuild) → exit code 0, `dist/index.js` 50.1KB.

## Area 2: Drizzle Schema Consistency — ✅ PASS
- `drizzle.config.ts`: `dialect: "postgresql"` ↔ `drizzle/schema.ts`: imports from `drizzle-orm/pg-core`. Consistent.
- `dbCredentials.url` uses postgresql connection string — correct for postgresql dialect.

## Area 3: Import Path Resolution — ⚠️ NON-STANDARD (P3)
- 6 imports use `.js` extension for `.ts` files (e.g., `from "../shared/const.js"`).
- Works with `tsx` and `esbuild` but deviates from TypeScript conventions.
- Not a functional bug, but fragile if tooling changes.

## Area 4: tRPC Router Registration — ✅ PASS
- `server/routers.ts` merges: `system`, `auth`, `subscription`, `ad` routers.
- All properly registered via `router({...})`.

## Area 5: Express Route Collisions — ✅ PASS
- Routes: `/api/oauth/callback`, `/api/oauth/mobile`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/session`, `/api/webhooks/ls`, `/api/play-billing/sync`, `/api/health`, `/api/trpc`, `/manus-storage/*`.
- No overlapping patterns detected.

## Area 6: build.gradle vs app.config.ts — ✅ PASS
- `app.config.ts`: `androidPackage: "space.manus.passeggiata.furba.t20260504051231"`
- `build.gradle`: `namespace` and `applicationId` both `"space.manus.passeggiata.furba.t20260504051231"`
- Match confirmed.

## Area 7: vercel.json vs api/index.ts — ✅ PASS (with caveat)
- `vercel.json`: `rewrites: [{ source: "/api/(.*)", destination: "/api/index" }]`
- `api/index.ts`: exports Express app from `createApp()`.
- Rewrites correctly route all `/api/*` to the single serverless function.
- Caveat: Vercel uses internal esbuild for TS→JS; should work but not verified in production.

## Area 8: Environment Variable Validation — ⚠️ SILENT FAILURES (P2)
- `server/_core/env.ts` returns empty strings on missing vars — no warnings, no throws.
- Critical vars (`appId`, `cookieSecret`, `oAuthServerUrl`) silently become `""`.
- Missing env var documentation (see BUG #3 below).

---

## Bugs Found — Summary

| ID | Severity | Area | Description |
|----|----------|------|-------------|
| BUG-1 | **P1** | play-billing | `handlePlayBillingSync` never inserts subscription to DB |
| BUG-2 | P2 | env | `ENV.appId` reads `VITE_APP_ID` — not documented in `.env.example` |
| BUG-3 | P2 | env | 6 critical server env vars missing from `.env.example` |
| BUG-4 | P2 | schema | `lemonSqueezySubscriptionId` column reused for Google Play tokens |
| BUG-5 | P3 | imports | `.js` extension on `.ts` file imports (6 occurrences) |
| BUG-6 | P3 | env | `ENV` object silently defaults to `""` — no startup validation |

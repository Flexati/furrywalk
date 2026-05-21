# RCA Report — Proactive Debugging Sweep 2026-05-13

---

## BUG-1 (P1): Google Play Billing purchases never persisted via Express endpoint

### 5 Whys

1. **Why** are Google Play purchases lost when hitting `POST /api/play-billing/sync`?
   → Because the handler returns `{ synced: true }` without inserting any database record.

2. **Why** does the handler return success without inserting?
   → Because the `db.insert(subscriptions)` call was never written. The function computes
     `resolvedTier`, `now`, `periodEnd` but never persists them.

3. **Why** was the insert omitted?
   → The function structure mirrors the tRPC `syncPlayBilling` mutation (which DOES insert),
     but the Express endpoint was likely scaffolded as a thin wrapper and the insert logic
     was forgotten during the refactor/creation of the direct Express route.

4. **Why** didn't tests catch this?
   → There are no integration tests for the `/api/play-billing/sync` endpoint.
     The `"test"` script in package.json is `"vitest run"` but no test files exist in `tests/`.

5. **Why** wasn't this caught during manual QA?
   → The tRPC path (`subscription.syncPlayBilling`) works correctly, so clients using tRPC
     would see purchases persisted. The Express endpoint is a secondary entry point that
     may not have been manually tested end-to-end.

### Root Cause Chain

```
Trigger: Client calls POST /api/play-billing/sync with valid purchaseToken + productId
   ↓
Condition: purchaseToken is NOT a duplicate (new purchase)
   ↓
Defect: Missing `db.insert(subscriptions)` call in `handlePlayBillingSync()` (lines 50-80)
   ↓
Error: Function returns HTTP 200 with `{ synced: true }` but zero rows inserted
   ↓
Failure: Purchase silently lost — user loses pro-tier access on next app restart
```

### Evidence

**File**: `server/_core/play-billing.ts`, lines 50-80

```typescript
// Lines 50-74: compute resolvedTier, now, periodEnd — all correct
// Line 65-69: duplicate check — correct
// Line 71-73: duplicate found → return early — correct

// LINE 75-80: THE BUG — returns without inserting
res.status(200).json({
  synced: true,
  tier: resolvedTier,
  periodEnd: periodEnd.toISOString(),
});
// NOTE: No db.insert(subscriptions).values({...}) anywhere in this function!
```

**Confirmation**: `grep` for `db.insert` in `server/_core/play-billing.ts` → **zero matches**.

### Impact Assessment

- **Users affected**: Any user purchasing via Google Play Billing whose client uses the Express endpoint instead of tRPC.
- **Data loss**: Purchase token is lost — subscription not recorded, ad tier not updated.
- **Revenue impact**: Users could potentially receive pro features without payment being recorded, OR lose pro access after paying (depending on client behavior).
- **Recovery**: Not possible from server logs alone — purchase tokens are ephemeral. Would need Google Play Developer API reconciliation.

### Timeline

| Time | Event |
|------|-------|
| Unknown | `handlePlayBillingSync` function created (likely from template/scaffold) |
| Unknown | tRPC `syncPlayBilling` correctly implemented with inserts |
| 2026-05-13 | Bug discovered during forensic debugging sweep |

---

## BUG-2 (P2): `ENV.appId` reads `VITE_APP_ID` — undocumented env var

### Root Cause

`server/_core/env.ts` line 2: `appId: process.env.VITE_APP_ID ?? ""`

The `VITE_APP_ID` env var is a Manus platform convention. A mapping script (`scripts/load-env.js`) maps it to `EXPO_PUBLIC_APP_ID` for the Expo client. However:

1. `.env.example` does not document `VITE_APP_ID` (or `EXPO_PUBLIC_APP_ID`)
2. The server reads `VITE_APP_ID` directly (server doesn't run `load-env.js`)
3. If the platform doesn't inject `VITE_APP_ID`, `ENV.appId` → `""` → all OAuth calls fail

### Impact

- Developers setting up locally won't know to set `VITE_APP_ID`
- Silent auth failures when `appId` is empty string

---

## BUG-3 (P2): 6 critical server env vars missing from `.env.example`

### Missing Variables

| Variable | Used In | Purpose |
|----------|---------|---------|
| `VITE_APP_ID` | `env.ts`, `sdk.ts` | OAuth app ID |
| `JWT_SECRET` | `env.ts` (as `cookieSecret`) | Session JWT signing |
| `OAUTH_SERVER_URL` | `env.ts`, `sdk.ts` | OAuth provider URL |
| `OWNER_OPEN_ID` | `env.ts`, `db.ts` | Admin user identification |
| `BUILT_IN_FORGE_API_URL` | `env.ts`, `storage.ts`, `notification.ts` | Forge API endpoint |
| `BUILT_IN_FORGE_API_KEY` | `env.ts`, `storage.ts`, `notification.ts` | Forge API key |
| `LEMON_SQUEEZY_API_KEY` | `subscription.ts` | LS API auth |
| `LEMON_SQUEEZY_WEBHOOK_SECRET` | `ls-webhook.ts` | LS webhook HMAC secret |

### Impact

- New developers cannot set up the project from `.env.example` alone
- CI/CD pipelines may miss critical environment variables

---

## BUG-4 (P2): `lemonSqueezySubscriptionId` column semantic conflation

### Root Cause

The Drizzle schema defines `lemonSqueezySubscriptionId` (`lsSubscriptionId` DB column) specifically for Lemon Squeezy subscription IDs. However:

- `server/routers/subscription.ts` `syncPlayBilling` mutation stores **Google Play purchase tokens** in this column
- `server/_core/play-billing.ts` queries `eq(subscriptions.lemonSqueezySubscriptionId, purchaseToken)` for dedup

This conflates two different identifier namespaces in a single column with a misleading name.

### Impact

- Column name is misleading for anyone reading the code
- If LS subscription IDs and Play purchase tokens ever collide (unlikely with random IDs but possible), data corruption occurs
- Webhook lookups by `lemonSqueezySubscriptionId` won't find Play Billing records (currently harmless since Play records don't have webhooks)

---

## BUG-5 (P3): `.js` extension on TypeScript imports

### Locations (6 occurrences)

1. `server/routers.ts:1` — `from "../shared/const.js"`
2. `server/_core/sdk.ts:1` — `from "../../shared/const.js"`
3. `server/_core/sdk.ts:2` — `from "../../shared/_core/errors.js"`
4. `server/_core/oauth.ts:1` — `from "../../shared/const.js"`
5. `server/_core/trpc.ts:1` — `from "../../shared/const.js"`

### Analysis

- TypeScript resolves `.js` → `.ts` at compile time (works with tsx and esbuild)
- Non-standard for TypeScript projects; typically use extensionless imports or `.ts`
- If the project ever switches to `tsc` for emit, these import paths in emitted `.js` files would correctly reference the `.js` files — but the `.ts` source files wouldn't be compiled to `.js` alongside them

### Recommendation

Either (a) switch to extensionless imports, or (b) add `"allowImportingTsExtensions": true` to tsconfig for clarity.

---

## BUG-6 (P3): `ENV` object silently defaults to `""` — no startup validation

### Root Cause

`server/_core/env.ts`:

```typescript
export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  // ... all other vars default to ""
};
```

No validation at module load time. If any critical var is missing, the server starts but fails mysteriously later (e.g., JWT signing with empty secret, OAuth calls with empty appId).

### Impact

- Difficult to diagnose production issues
- Error messages are cryptic (e.g., "Invalid session cookie" instead of "JWT_SECRET not configured")

### Recommendation

Add startup validation that throws clear errors for missing required vars (at least `appId`, `cookieSecret`, `oAuthServerUrl`).

---

## Deliverables Checklist

- [x] INCIDENT_TRIAGE.md — severity, evidence, initial hypotheses, owner
- [x] RCA_REPORT.md — 5 Whys, timeline, root cause chain, impact assessment
- [ ] MCVE_REPO/ — not applicable (static code analysis, no runtime repro needed)
- [ ] FIX_PR.md — pending fixes for BUG-1 through BUG-6
- [ ] POST_MORTEM.md — blameless analysis, action items
- [ ] DEBUGGING_RUNBOOK.md — recurring bug class patterns

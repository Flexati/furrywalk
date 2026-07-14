/**
 * Google Play Billing server-side validation & sync.
 *
 * POST /api/play-billing/sync — validates purchase token with Google
 * Play Developer API and records the subscription in the database.
 *
 * For MVP, we trust the on-device verification and record the purchase.
 * Full server-side validation with googleapis requires a service account
 * JSON in GOOGLE_PLAY_SERVICE_ACCOUNT env var.
 */
import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { subscriptions, adTiers } from "../../drizzle/schema";

interface PlayBillingSyncBody {
  purchaseToken: string;
  productId: string;
  userId?: number; // required when called directly (non-tRPC); tRPC uses ctx.user.id
}

// ─── SKU → tier/interval mapping (mirrors play-billing.ts) ───
const SKU_TO_TIER: Record<string, { tier: "pro_ad_free" | "pro_family"; interval: "monthly" | "yearly" }> = {
  premium_monthly: { tier: "pro_ad_free", interval: "monthly" },
  premium_yearly: { tier: "pro_ad_free", interval: "yearly" },
};

export async function handlePlayBillingSync(req: Request, res: Response): Promise<void> {
  const { purchaseToken, productId } = req.body as PlayBillingSyncBody;

  if (!purchaseToken || !productId) {
    res.status(400).json({ error: "Missing purchaseToken or productId" });
    return;
  }

  // ─── Server-side validation (optional, requires service account) ───
  let validation: PlayValidationResult | null = null;
  if (process.env.GOOGLE_PLAY_SERVICE_ACCOUNT) {
    validation = await validateWithGooglePlay(purchaseToken, productId);
    if (!validation.valid) {
      res.status(400).json({ error: "Purchase validation failed with Google Play" });
      return;
    }
  }

  // ─── Record in database ───
  const db = await getDb();
  if (!db) {
    res.status(503).json({ error: "Database unavailable" });
    return;
  }

  const mapping = SKU_TO_TIER[productId];
  const resolvedTier = mapping?.tier ?? "pro_ad_free";
  const now = new Date();
  const periodEnd = new Date(now);
  if (mapping?.interval === "monthly") periodEnd.setMonth(periodEnd.getMonth() + 1);
  else periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  const userId = (req.body as PlayBillingSyncBody).userId;
  if (!userId) {
    res.status(400).json({ error: "Missing userId. The direct Express endpoint requires userId in the body. Use tRPC subscription.syncPlayBilling for authenticated calls." });
    return;
  }

  // Check for duplicate purchase token
  const [existing] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.lemonSqueezySubscriptionId, purchaseToken))
    .limit(1);

  if (existing) {
    res.status(200).json({ synced: true, alreadyRecorded: true });
    return;
  }

  // INSERT subscription record (reuse LS columns for Play Billing data)
  await db.insert(subscriptions).values({
    userId,
    lemonSqueezySubscriptionId: purchaseToken,
    lemonSqueezyVariantId: productId,
    lemonSqueezyProductId: "google-play",
    tier: resolvedTier,
    status: validation?.isTrial ? "on_trial" : "active",
    trialStart: validation?.isTrial ? now : null,
    trialEnd: validation?.trialEnd ? new Date(validation.trialEnd) : null,
    currentPeriodStart: now,
    // During a free trial, Play reports the trial expiry as expiryTimeMillis,
    // which we persist as both the period end and the trial end.
    currentPeriodEnd: validation?.trialEnd ? new Date(validation.trialEnd) : periodEnd,
  });

  // Update ad tier: pro users get no ads
  await db
    .update(adTiers)
    .set({
      tier: resolvedTier,
      bannerEnabled: false,
      rewardedEnabled: false,
      interstitialEnabled: false,
    })
    .where(eq(adTiers.userId, userId));

  res.status(200).json({
    synced: true,
    tier: resolvedTier,
    periodEnd: periodEnd.toISOString(),
  });
}

/**
 * Result of server-side Google Play purchase validation.
 * - valid:    purchase is authentic and not expired. FAIL-CLOSED: false on any error.
 * - isTrial:  purchase is currently inside a free-trial period (paymentState === 2).
 * - trialEnd: ISO timestamp of trial expiry when in trial, otherwise null.
 */
export interface PlayValidationResult {
  valid: boolean;
  isTrial: boolean;
  trialEnd: string | null;
}

/**
 * Validate a purchase token with Google Play Developer API.
 * Requires GOOGLE_PLAY_SERVICE_ACCOUNT env var (service account JSON).
 * Returns { valid, isTrial, trialEnd } derived from the Play subscription state.
 * FAILS CLOSED: any error, or a missing service account in production, yields valid:false.
 */
export async function validateWithGooglePlay(
  purchaseToken: string,
  productId: string,
): Promise<PlayValidationResult> {
  const failClosed: PlayValidationResult = { valid: false, isTrial: false, trialEnd: null };

  try {
    const serviceAccount = JSON.parse(
      process.env.GOOGLE_PLAY_SERVICE_ACCOUNT ?? "{}",
    );

    if (!serviceAccount.client_email) {
      console.warn("[PlayBilling] GOOGLE_PLAY_SERVICE_ACCOUNT not configured — cannot validate purchase");
      if (process.env.NODE_ENV === "production") {
        console.error("[PlayBilling] CRITICAL: Service account missing in production — rejecting purchase");
        return failClosed;
      }
      console.warn("[PlayBilling] Non-production environment — allowing purchase without server-side validation");
      // Dev/test fallback: without the API we cannot detect a trial, so default to active.
      return { valid: true, isTrial: false, trialEnd: null };
    }

    // Get OAuth2 token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: await createJwtAssertion(serviceAccount),
      }),
    });

    if (!tokenRes.ok) {
      console.error("[PlayBilling] Failed to get OAuth token:", tokenRes.status);
      return failClosed;
    }

    const { access_token } = (await tokenRes.json()) as { access_token: string };
    const packageName = "com.passeggiatafurba.app";

    // Validate subscription purchase
    const validateRes = await fetch(
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptions/${productId}/tokens/${purchaseToken}`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
      },
    );

    if (!validateRes.ok) {
      console.error("[PlayBilling] Google validation failed:", await validateRes.text());
      return failClosed;
    }

    const data = (await validateRes.json()) as {
      paymentState?: number;
      expiryTimeMillis?: string | number;
    };
    // paymentState: 0=pending, 1=received, 2=free trial, 3=deferred
    const isTrial = data.paymentState === 2;
    const valid = data.paymentState === 1 || data.paymentState === 2;
    // During a free trial, expiryTimeMillis is the end of the trial period.
    const trialEnd =
      isTrial && data.expiryTimeMillis
        ? new Date(Number(data.expiryTimeMillis)).toISOString()
        : null;

    return { valid, isTrial, trialEnd };
  } catch (error) {
    console.error("[PlayBilling] Validation error:", error);
    return failClosed; // FAIL CLOSED: reject purchase if validation cannot complete
  }
}

/**
 * Create a JWT assertion for Google OAuth2 service account.
 */
async function createJwtAssertion(
  serviceAccount: Record<string, string>,
): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encodeBase64 = (obj: Record<string, unknown>): string =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");

  const headerB64 = encodeBase64(header);
  const claimB64 = encodeBase64(claim);
  const unsigned = `${headerB64}.${claimB64}`;

  // Sign with the private key
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );

  const sigB64 = Buffer.from(signature).toString("base64url");
  return `${unsigned}.${sigB64}`;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const binary = Buffer.from(b64, "base64");
  return binary.buffer.slice(
    binary.byteOffset,
    binary.byteOffset + binary.byteLength,
  );
}

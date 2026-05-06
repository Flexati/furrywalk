/**
 * Lemon Squeezy Webhook Handler
 *
 * Validates HMAC-SHA256 signatures, enforces idempotency via ls_event_id,
 * processes subscription lifecycle events, and retries with exponential backoff.
 *
 * Registered at: POST /api/webhooks/ls
 */
import type { Request, Response } from "express";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { subscriptions, webhookEvents, receipts, adTiers } from "../../../drizzle/schema";

interface LSWebhookPayload {
  meta: {
    event_name: string;
    custom_data?: { user_id?: string };
  };
  data: {
    id: string;
    type: string;
    attributes: Record<string, unknown>;
  };
}

const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = [1_000, 5_000, 15_000];

// ─── HMAC-SHA256 signature validation ───
function verifySignature(rawBody: Buffer, signature: string): boolean {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[LS Webhook] Missing LEMON_SQUEEZY_WEBHOOK_SECRET");
    return false;
  }

  const hmac = crypto.createHmac("sha256", secret);
  const digest = hmac.update(rawBody).digest("hex");

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

// ─── Idempotency check ───
async function isDuplicate(lsEventId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const [existing] = await db
    .select({ id: webhookEvents.id })
    .from(webhookEvents)
    .where(eq(webhookEvents.lsEventId, lsEventId))
    .limit(1);

  return !!existing;
}

// ─── Process subscription event ───
async function processSubscriptionEvent(
  eventName: string,
  data: LSWebhookPayload["data"],
  retryCount: number = 0,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const attrs = data.attributes;
  const lsSubId = String(data.id);

  try {
    switch (eventName) {
      case "subscription_created":
      case "subscription_updated": {
        const resolvedTier = String(attrs.variant_name ?? "").includes("family")
          ? "pro_family" as const
          : "pro_ad_free" as const;

        const rawStatus = String(attrs.status ?? "active");
        const validStatuses = [
          "on_trial", "active", "past_due", "cancelled", "expired", "paused", "unpaid",
        ] as const;
        type ValidStatus = typeof validStatuses[number];
        const status: ValidStatus = validStatuses.includes(rawStatus as ValidStatus)
          ? (rawStatus as ValidStatus)
          : "active";

        const [existing] = await db
          .select({ id: subscriptions.id })
          .from(subscriptions)
          .where(eq(subscriptions.lemonSqueezySubscriptionId, lsSubId))
          .limit(1);

        const subData = {
          lemonSqueezyVariantId: String(attrs.variant_id ?? ""),
          lemonSqueezyProductId: String(attrs.product_id ?? ""),
          tier: resolvedTier,
          status,
          currentPeriodStart: new Date((attrs.current_period_start as string) ?? Date.now()),
          currentPeriodEnd: new Date((attrs.current_period_end as string) ?? Date.now()),
          trialStart: attrs.trial_start ? new Date(attrs.trial_start as string) : null,
          trialEnd: attrs.trial_end ? new Date(attrs.trial_end as string) : null,
          cancelAtPeriodEnd: Boolean(attrs.cancelled ?? false),
          updatedAt: new Date(),
          paymentMethodBrand: attrs.payment_method_brand
            ? String(attrs.payment_method_brand)
            : undefined,
          paymentMethodLast4: attrs.payment_method_last4
            ? String(attrs.payment_method_last4)
            : undefined,
        };

        if (existing) {
          await db
            .update(subscriptions)
            .set(subData)
            .where(eq(subscriptions.id, existing.id));
        } else {
          // New subscription — userId will be resolved via LS custom_data or email
          console.log(`[LS Webhook] New subscription ${lsSubId} — manual user linking needed`);
          // Stub: in production, look up user by LS customer email or custom_data.user_id
        }

        // If status is terminal, revert ad tier to free
        if (["expired", "cancelled", "unpaid"].includes(status)) {
          const [sub] = await db
            .select({ userId: subscriptions.userId })
            .from(subscriptions)
            .where(eq(subscriptions.lemonSqueezySubscriptionId, lsSubId))
            .limit(1);

          if (sub) {
            await db
              .update(adTiers)
              .set({
                tier: "free_with_ads",
                bannerEnabled: true,
                rewardedEnabled: true,
                interstitialEnabled: false,
              })
              .where(eq(adTiers.userId, sub.userId));
          }
        }
        break;
      }

      case "order_paid": {
        await db.insert(receipts).values({
          userId: 0, // placeholder — resolved via subscription lookup
          lemonSqueezyOrderId: String(data.id),
          amountEur: String(attrs.subtotal ?? "0"),
          totalEur: String(attrs.total ?? "0"),
          currency: String(attrs.currency ?? "EUR"),
          invoiceUrl: attrs.invoice_url ? String(attrs.invoice_url) : null,
          createdAt: new Date(),
        });
        break;
      }

      case "subscription_payment_failed":
      case "subscription_payment_recovered":
        // Status update handled by subscription_updated event
        break;

      case "subscription_expired":
      case "subscription_cancelled":
        // Downgrade handled in subscription_updated branch
        break;
    }
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_BACKOFF_MS[retryCount]));
      return processSubscriptionEvent(eventName, data, retryCount + 1);
    }
    throw error;
  }
}

// ─── Main webhook handler ───
export async function handleLSWebhook(req: Request, res: Response): Promise<void> {
  const rawBody = req.body instanceof Buffer
    ? req.body
    : Buffer.from(JSON.stringify(req.body));
  const signature = req.headers["x-signature"] as string;

  // 1. Validate signature
  if (!signature || !verifySignature(rawBody, signature)) {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  const payload: LSWebhookPayload = req.body;
  const eventName = payload.meta.event_name;
  const lsEventId = String(payload.data.id);

  // 2. Idempotency check
  const duplicate = await isDuplicate(lsEventId);
  if (duplicate) {
    res.status(200).json({ received: true, deduplicated: true });
    return;
  }

  // 3. Record event
  const db = await getDb();
  if (!db) {
    res.status(503).json({ error: "Database unavailable" });
    return;
  }

  const [eventRecord] = await db.insert(webhookEvents).values({
    lsEventId,
    eventType: payload.data.type,
    eventName,
    payload: payload as unknown as Record<string, unknown>,
    signatureValid: true,
    processed: false,
    receivedAt: new Date(),
  });

  // 4. Process
  try {
    await processSubscriptionEvent(eventName, payload.data);
    await db
      .update(webhookEvents)
      .set({ processed: true, processedAt: new Date() })
      .where(eq(webhookEvents.id, eventRecord.insertId));
    res.status(200).json({ received: true, processed: true });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    await db
      .update(webhookEvents)
      .set({
        processingErrors: [errMsg],
        retryCount: 1,
      })
      .where(eq(webhookEvents.id, eventRecord.insertId));
    res.status(500).json({ error: "Processing failed", detail: errMsg });
  }
}

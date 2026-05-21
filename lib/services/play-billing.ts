/**
 * Google Play Billing service for Android subscriptions.
 *
 * Uses react-native-iap v15 for Play Store subscription purchases.
 * This module is Android-only — guard with Platform.OS before calling.
 *
 * Prerequisites:
 * 1. Product IDs configured in Google Play Console: premium_monthly, premium_yearly
 * 2. App published to closed/internal test track (or license-testers added)
 * 3. Service account JSON in GOOGLE_PLAY_SERVICE_ACCOUNT env var (server-side validation)
 *
 * API note: react-native-iap v15 uses event-based purchase flow.
 * requestPurchase() dispatches the flow; results arrive via purchaseUpdatedListener / purchaseErrorListener.
 */

import { Platform } from "react-native";
import * as RNIap from "react-native-iap";

// ─── SKU mapping ───
// Must match exactly the Product IDs in Google Play Console
const SKUS: Record<string, Record<string, string>> = {
  pro_ad_free: {
    monthly: "premium_monthly",
    yearly: "premium_yearly",
  },
};

export type PlayBillingTier = "pro_ad_free" | "pro_family";
export type PlayBillingInterval = "monthly" | "yearly";

export interface PlayBillingResult {
  success: boolean;
  cancelled: boolean;
  purchaseToken?: string;
  productId?: string;
  error?: string;
}

// ─── Module state ───
let _initialized = false;
let _pendingResolve: ((r: PlayBillingResult) => void) | null = null;

/** Initialize the Play Billing connection. Must be called once at app startup. */
export async function initPlayBilling(): Promise<void> {
  if (_initialized) return;
  if (Platform.OS !== "android") return;

  try {
    await RNIap.initConnection();

    // Handle completed purchases (fired after user approves payment in Google Play dialog)
    RNIap.purchaseUpdatedListener((purchase: RNIap.Purchase) => {
      const token = purchase.purchaseToken ?? "";
      const productId = purchase.productId;

      // Acknowledge the purchase so Google doesn't auto-refund after 3 days
      RNIap.finishTransaction({ purchase, isConsumable: false }).catch(() => {});

      if (_pendingResolve) {
        _pendingResolve({
          success: true,
          cancelled: false,
          purchaseToken: token,
          productId,
        });
        _pendingResolve = null;
      }
    });

    // Handle purchase errors (user cancelled, payment declined, etc.)
    RNIap.purchaseErrorListener((error: RNIap.PurchaseError) => {
      if (_pendingResolve) {
        _pendingResolve({
          success: false,
          cancelled: String(error.code).includes("CANCELLED"),
          error: error.message ?? "Purchase failed",
        });
        _pendingResolve = null;
      }
    });

    _initialized = true;
  } catch (error) {
    console.error("[PlayBilling] Init failed:", error);
  }
}

/**
 * Request a subscription purchase. Returns a Promise that resolves when the
 * user completes or cancels the Play Store purchase flow.
 *
 * IMPORTANT: On Android, the Play Store dialog handles the entire flow.
 * The Promise resolves with the purchase token after user confirms payment.
 */
export async function requestSubscription(
  tier: PlayBillingTier,
  interval: PlayBillingInterval,
): Promise<PlayBillingResult> {
  if (Platform.OS !== "android") {
    return { success: false, cancelled: false, error: "Not on Android" };
  }

  const sku = SKUS[tier]?.[interval];
  if (!sku) {
    return {
      success: false,
      cancelled: false,
      error: `No SKU for ${tier}/${interval}`,
    };
  }

  return new Promise<PlayBillingResult>((resolve) => {
    _pendingResolve = resolve;

    // Dispatch the purchase flow. Result arrives via purchaseUpdatedListener.
    RNIap.requestPurchase({
      request: {
        google: { skus: [sku] },
      },
      type: "subs",
    }).catch((error: RNIap.PurchaseError) => {
      if (_pendingResolve) {
        _pendingResolve({
          success: false,
          cancelled: String(error?.code).includes("CANCELLED"),
          error: error?.message ?? "Subscription request failed",
        });
        _pendingResolve = null;
      }
    });
  });
}

/**
 * Validate a purchase token with our backend server.
 * The server verifies the token and records the subscription.
 */
export async function validatePurchaseOnServer(
  purchaseToken: string,
  productId: string,
): Promise<{ valid: boolean; error?: string }> {
  const apiBase =
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    "https://passeggiata-furba.vercel.app";

  try {
    const res = await fetch(`${apiBase}/api/play-billing/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purchaseToken, productId }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return {
        valid: false,
        error: (body as { error?: string }).error ?? "Validation failed",
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/** Clean up Play Billing connection. Call on app unmount. */
export async function endPlayBillingConnection(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await RNIap.endConnection();
  } catch {
    // Best-effort cleanup
  }
  _initialized = false;
}

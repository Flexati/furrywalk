/**
 * Unified Payment Provider
 *
 * Selects the correct billing backend at runtime:
 * - Android  → Google Play Billing (via react-native-iap)
 * - iOS/web  → Lemon Squeezy hosted checkout
 *
 * This file replaces the fragmented payment-service.ts + ls-checkout.ts duality.
 */

import { Platform } from "react-native";
import {
  requestSubscription as playRequestSubscription,
  validatePurchaseOnServer,
  initPlayBilling,
  endPlayBillingConnection,
  type PlayBillingInterval,
  type PlayBillingTier,
  type PlayBillingResult,
} from "./play-billing";
import {
  openLSCheckout,
  getLSCheckoutConfig,
  onLSCheckoutReturn,
  type CheckoutTier as LSCheckoutTier,
  type BillingInterval as LSBillingInterval,
} from "./ls-checkout";

// ─── Public types ───
export type BillingProvider = "play-billing" | "lemon-squeezy";
export type CheckoutTier = PlayBillingTier; // "pro_ad_free" | "pro_family"
export type BillingInterval = PlayBillingInterval; // "monthly" | "yearly"

export interface CheckoutRequest {
  tier: CheckoutTier;
  interval: BillingInterval;
}

export interface CheckoutResult {
  success: boolean;
  cancelled: boolean;
  provider: BillingProvider;
  error?: string;
  /** Play Billing: the purchase token to send to the server */
  purchaseToken?: string;
  /** Play Billing: the product ID purchased */
  productId?: string;
  /** LS: the checkout session ID returned after redirect */
  checkoutSessionId?: string;
}

// ─── Initialize (call once at app root) ───
let _paymentInitialized = false;

export async function initPaymentProvider(): Promise<void> {
  if (_paymentInitialized) return;
  if (Platform.OS === "android") {
    await initPlayBilling();
  }
  _paymentInitialized = true;
}

export function cleanupPaymentProvider(): void {
  if (Platform.OS === "android") {
    endPlayBillingConnection().catch(() => {});
  }
  _paymentInitialized = false;
}

// ─── Provider detection ───
export function getActiveBillingProvider(): BillingProvider {
  if (Platform.OS === "android") return "play-billing";
  return "lemon-squeezy";
}

// ─── Request subscription ───
export async function requestSubscription(
  req: CheckoutRequest,
): Promise<CheckoutResult> {
  const provider = getActiveBillingProvider();

  if (provider === "play-billing") {
    const result = await playRequestSubscription(req.tier, req.interval);
    return {
      success: result.success,
      cancelled: result.cancelled,
      provider: "play-billing",
      error: result.error,
      purchaseToken: result.purchaseToken,
      productId: result.productId,
    };
  }

  // Lemon Squeezy path (iOS / web)
  const config = getLSCheckoutConfig(
    req.tier as LSCheckoutTier,
    req.interval as LSBillingInterval,
  );

  if (!config) {
    return {
      success: false,
      cancelled: false,
      provider: "lemon-squeezy",
      error: "LS checkout configuration not available. Check variant ID env vars.",
    };
  }

  const result = await openLSCheckout(config);
  return {
    ...result,
    provider: "lemon-squeezy",
  };
}

// ─── Validate after purchase ───
export async function validateOnServer(
  result: CheckoutResult,
): Promise<{ valid: boolean; error?: string }> {
  if (result.provider === "play-billing" && result.purchaseToken) {
    return validatePurchaseOnServer(
      result.purchaseToken,
      result.productId ?? "",
    );
  }

  // LS purchase is validated server-side via webhook / subscription.sync
  return { valid: true };
}

// ─── Deep link listener (for LS checkout return on iOS) ───
export { onLSCheckoutReturn };

// ─── Check if provider is ready ───
export function isPaymentReady(): boolean {
  if (Platform.OS === "android") return true; // initPlayBilling handles this
  // Check if LS variant IDs are configured
  const config = getLSCheckoutConfig("pro_ad_free", "monthly");
  return config !== null;
}

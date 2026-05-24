/**
 * Unified Payment Provider — Google Play Billing (Android only)
 *
 * Uses react-native-iap v15 for Play Store subscription purchases.
 * iOS and Web payments are not yet implemented.
 *
 * Entry point for all subscription purchase flows in the app.
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

// ─── Public types ───
export type BillingProvider = "play-billing";
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
  return "play-billing";
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

  return {
    success: false,
    cancelled: false,
    provider: "play-billing",
    error: "Billing not available on this platform",
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

  return { valid: false, error: "No purchase token to validate" };
}

// ─── Check if provider is ready ───
export function isPaymentReady(): boolean {
  if (Platform.OS === "android") return true;
  return false; // iOS/Web payments not yet implemented
}

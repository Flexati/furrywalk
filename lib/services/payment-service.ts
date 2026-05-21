/**
 * @deprecated Use `@/lib/services/payment-provider` instead.
 *
 * This file exists for backward compatibility only.
 * All payment logic has been migrated to payment-provider.ts (unified Play Billing + LS).
 *
 * Migration guide:
 * - `paymentService.createCheckoutSession(userId, planId)` → `requestSubscription({ tier, interval })` from payment-provider
 * - `paymentService.getSubscription(subId)` → `trpc.subscription.getStatus.useQuery()` from hooks/use-subscription
 * - `paymentService.cancelSubscription(subId)` → use LS dashboard or tRPC subscription router
 * - `paymentService.PREMIUM_PLAN` → checkout tiers "pro_ad_free" / "pro_family" from payment-provider
 */
export {
  requestSubscription,
  validateOnServer as validateOnServer,
  initPaymentProvider,
  getActiveBillingProvider,
  isPaymentReady,
  type CheckoutTier,
  type BillingInterval,
  type CheckoutRequest,
  type CheckoutResult,
  type BillingProvider,
} from "./payment-provider";

// ─── Backward-compatible wrapper ───
import {
  requestSubscription,
  validateOnServer,
  initPaymentProvider,
  getActiveBillingProvider,
  type CheckoutTier,
  type BillingInterval,
  type CheckoutRequest,
  type CheckoutResult,
} from "./payment-provider";

/** @deprecated Use `useSubscription()` from `@/hooks/use-subscription` for state, `requestSubscription()` for purchase flow. */
export function usePaymentService() {
  const createCheckout = async (_userId: string, _planId: string) => {
    console.warn("[deprecated] usePaymentService().createCheckout() — use requestSubscription() from payment-provider");
    const result: CheckoutResult = await requestSubscription({
      tier: "pro_ad_free" as CheckoutTier,
      interval: "monthly" as BillingInterval,
    });
    if (!result.success || result.cancelled) return null;
    return { id: result.purchaseToken ?? result.checkoutSessionId ?? "", checkoutUrl: "" };
  };

  const validateAfterPurchase = async (_purchaseToken: string, _productId: string) => {
    return validateOnServer({
      success: true,
      cancelled: false,
      provider: "play-billing",
      purchaseToken: _purchaseToken,
      productId: _productId,
    });
  };

  return {
    createCheckout,
    getSubscription: async (_subId: string) => {
      console.warn("[deprecated] usePaymentService().getSubscription() — use useSubscription() hook");
      return null;
    },
    cancelSubscription: async (_subId: string) => {
      console.warn("[deprecated] usePaymentService().cancelSubscription() — use LS dashboard");
      return false;
    },
    pauseSubscription: async (_subId: string) => {
      console.warn("[deprecated] usePaymentService().pauseSubscription() — use LS dashboard");
      return false;
    },
    resumeSubscription: async (_subId: string) => {
      console.warn("[deprecated] usePaymentService().resumeSubscription() — use LS dashboard");
      return false;
    },
    validateAfterPurchase,
    PREMIUM_PLAN: {
      id: "premium_monthly",
      name: "Premium",
      price: 399,
      currency: "EUR",
      interval: "month" as const,
      features: [
        "Cani multipli",
        "Mappe offline",
        "Statistiche salute avanzate",
        "Alert veterinario",
        "Shop accessori affiliato",
      ],
    },
  };
}

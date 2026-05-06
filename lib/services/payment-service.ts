import axios from "axios";

const LEMON_SQUEEZY_API_KEY = process.env.EXPO_PUBLIC_LEMON_SQUEEZY_API_KEY || "";
const LEMON_SQUEEZY_STORE_ID = process.env.EXPO_PUBLIC_LEMON_SQUEEZY_STORE_ID || "";

const lemonSqueezyAPI = axios.create({
  baseURL: "https://api.lemonsqueezy.com/v1",
  headers: {
    Authorization: `Bearer ${LEMON_SQUEEZY_API_KEY}`,
    "Content-Type": "application/json",
  },
});

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number; // in cents (€3.99 = 399)
  currency: string;
  interval: "month" | "year";
  features: string[];
}

export interface CheckoutSession {
  id: string;
  checkoutUrl: string;
  expiresAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: "active" | "paused" | "cancelled" | "expired";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt: string | null;
  createdAt: string;
}

class PaymentService {
  // Premium plan: €3.99/month
  readonly PREMIUM_PLAN = {
    id: "premium_monthly",
    name: "Premium",
    price: 399, // €3.99 in cents
    currency: "EUR",
    interval: "month" as const,
    features: [
      "Cani multipli",
      "Mappe offline",
      "Statistiche salute avanzate",
      "Alert veterinario",
      "Shop accessori affiliato",
    ],
  };

  async createCheckoutSession(userId: string, planId: string): Promise<CheckoutSession | null> {
    try {
      const response = await lemonSqueezyAPI.post("/checkouts", {
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: {
              custom: {
                userId,
                planId,
              },
            },
          },
          relationships: {
            store: {
              data: {
                type: "stores",
                id: LEMON_SQUEEZY_STORE_ID,
              },
            },
            variant: {
              data: {
                type: "variants",
                id: this.getPlanVariantId(planId),
              },
            },
          },
        },
      });

      const checkout = response.data.data;
      return {
        id: checkout.id,
        checkoutUrl: checkout.attributes.url,
        expiresAt: checkout.attributes.expires_at,
      };
    } catch (error) {
      console.error("Failed to create checkout session:", error);
      return null;
    }
  }

  async getSubscription(subscriptionId: string): Promise<Subscription | null> {
    try {
      const response = await lemonSqueezyAPI.get(`/subscriptions/${subscriptionId}`);
      const sub = response.data.data;

      return {
        id: sub.id,
        userId: sub.attributes.custom_data?.userId || "",
        planId: sub.attributes.custom_data?.planId || "",
        status: sub.attributes.status,
        currentPeriodStart: sub.attributes.current_period_start,
        currentPeriodEnd: sub.attributes.current_period_end,
        cancelledAt: sub.attributes.cancelled_at,
        createdAt: sub.attributes.created_at,
      };
    } catch (error) {
      console.error("Failed to get subscription:", error);
      return null;
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    try {
      await lemonSqueezyAPI.delete(`/subscriptions/${subscriptionId}`);
      return true;
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
      return false;
    }
  }

  async pauseSubscription(subscriptionId: string): Promise<boolean> {
    try {
      await lemonSqueezyAPI.patch(`/subscriptions/${subscriptionId}`, {
        data: {
          type: "subscriptions",
          attributes: {
            pause: true,
          },
        },
      });
      return true;
    } catch (error) {
      console.error("Failed to pause subscription:", error);
      return false;
    }
  }

  async resumeSubscription(subscriptionId: string): Promise<boolean> {
    try {
      await lemonSqueezyAPI.patch(`/subscriptions/${subscriptionId}`, {
        data: {
          type: "subscriptions",
          attributes: {
            pause: false,
          },
        },
      });
      return true;
    } catch (error) {
      console.error("Failed to resume subscription:", error);
      return false;
    }
  }

  async verifyWebhook(signature: string, payload: string): Promise<boolean> {
    try {
      // Verify webhook signature using HMAC
      const crypto = require("crypto");
      const secret = process.env.EXPO_PUBLIC_LEMON_SQUEEZY_WEBHOOK_SECRET || "";
      const hash = crypto.createHmac("sha256", secret).update(payload).digest("hex");
      return hash === signature;
    } catch (error) {
      console.error("Failed to verify webhook:", error);
      return false;
    }
  }

  private getPlanVariantId(planId: string): string {
    // Map plan IDs to Lemon Squeezy variant IDs
    // These should be configured based on your Lemon Squeezy store
    const variantMap: Record<string, string> = {
      premium_monthly: process.env.EXPO_PUBLIC_LEMON_SQUEEZY_PREMIUM_VARIANT_ID || "",
    };
    return variantMap[planId] || "";
  }

  isPremiumPlan(planId: string): boolean {
    return planId === "premium_monthly";
  }

  isSubscriptionActive(subscription: Subscription): boolean {
    return subscription.status === "active" && new Date(subscription.currentPeriodEnd) > new Date();
  }
}

export const paymentService = new PaymentService();

export function usePaymentService() {
  const createCheckout = async (userId: string, planId: string) => {
    return paymentService.createCheckoutSession(userId, planId);
  };

  const getSubscription = async (subscriptionId: string) => {
    return paymentService.getSubscription(subscriptionId);
  };

  const cancelSubscription = async (subscriptionId: string) => {
    return paymentService.cancelSubscription(subscriptionId);
  };

  const pauseSubscription = async (subscriptionId: string) => {
    return paymentService.pauseSubscription(subscriptionId);
  };

  const resumeSubscription = async (subscriptionId: string) => {
    return paymentService.resumeSubscription(subscriptionId);
  };

  return {
    createCheckout,
    getSubscription,
    cancelSubscription,
    pauseSubscription,
    resumeSubscription,
    PREMIUM_PLAN: paymentService.PREMIUM_PLAN,
  };
}

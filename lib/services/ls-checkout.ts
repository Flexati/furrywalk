import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { Platform } from "react-native";

export type BillingInterval = "monthly" | "yearly";
export type CheckoutTier = "pro_ad_free" | "pro_family";

interface LSCheckoutConfig {
  tier: CheckoutTier;
  interval: BillingInterval;
  variantId: string;
  appScheme: string;
}

const LS_CHECKOUT_BASE = "https://passeggiata-furba.lemonsqueezy.com/checkout/buy";

/**
 * Build the LS hosted checkout URL with variant ID and redirect params.
 * The server-side tRPC `subscription.sync` handles post-checkout verification.
 */
function buildCheckoutUrl(config: LSCheckoutConfig): string {
  const redirect = `${config.appScheme}://subscription/confirm`;
  const params = new URLSearchParams({
    "checkout[embed]": "false",
    "checkout[media]": "false",
    "checkout[button_color]": "1E3D2F",
    "checkout[redirect_url]": redirect,
  });
  return `${LS_CHECKOUT_BASE}/${config.variantId}?${params.toString()}`;
}

/**
 * Open the Lemon Squeezy hosted checkout flow.
 * - Native (iOS/Android): opens expo-web-browser auth session
 * - Web: redirects the window location
 *
 * Returns true if checkout was opened successfully.
 */
export async function openLSCheckout(config: LSCheckoutConfig): Promise<{
  success: boolean;
  cancelled: boolean;
  error?: string;
}> {
  const url = buildCheckoutUrl(config);

  if (Platform.OS === "web") {
    try {
      window.location.href = url;
      return { success: true, cancelled: false };
    } catch (e) {
      return {
        success: false,
        cancelled: false,
        error: e instanceof Error ? e.message : "Web redirect failed",
      };
    }
  }

  // Native: use expo-web-browser auth session
  try {
    const result = await WebBrowser.openAuthSessionAsync(
      url,
      `${config.appScheme}://subscription/confirm`,
    );

    if (result.type === "cancel" || result.type === "dismiss") {
      return { success: false, cancelled: true };
    }

    // On success, the deep link handler in the app will trigger tRPC subscription.sync
    return { success: true, cancelled: false };
  } catch (e) {
    return {
      success: false,
      cancelled: false,
      error: e instanceof Error ? e.message : "Checkout open failed",
    };
  }
}

/**
 * Set up a deep link listener for LS checkout return.
 * Call this once at the app root level. Returns the cleanup function.
 */
export function onLSCheckoutReturn(callback: (url: string) => void): () => void {
  const subscription = Linking.addEventListener("url", ({ url }) => {
    if (url.includes("subscription/confirm") || url.includes("payment-success")) {
      callback(url);
    }
  });
  return () => subscription.remove();
}

/**
 * Get LS checkout variant IDs from environment variables.
 * In production these come from EXPO_PUBLIC_ env vars set during build.
 */
export function getLSCheckoutConfig(
  tier: CheckoutTier,
  interval: BillingInterval,
): LSCheckoutConfig | null {
  const appScheme = process.env.EXPO_PUBLIC_APP_SCHEME ?? "passeggiatafurba";

  const variantKey =
    tier === "pro_family"
      ? interval === "yearly"
        ? "EXPO_PUBLIC_LS_FAMILY_YEARLY_VARIANT_ID"
        : "EXPO_PUBLIC_LS_FAMILY_MONTHLY_VARIANT_ID"
      : interval === "yearly"
        ? "EXPO_PUBLIC_LS_PRO_YEARLY_VARIANT_ID"
        : "EXPO_PUBLIC_LS_PRO_MONTHLY_VARIANT_ID";

  const variantId = process.env[variantKey];
  if (!variantId) {
    // Fallback: use hardcoded variant IDs from LS store (stub for dev)
    console.warn(`[LS Checkout] Missing env var: ${variantKey}`);
    return null;
  }

  return { tier, interval, variantId, appScheme };
}

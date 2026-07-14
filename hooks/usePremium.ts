import { useSubscription } from "./use-subscription";

/**
 * Convenience hook: true when the user has any premium access
 * (active subscription OR inside the free-trial period).
 * Wraps useSubscription so screens can gate on a single boolean.
 */
export function usePremium() {
  const { isPro, status, isLoading } = useSubscription();
  const isPremium = isPro || status === "on_trial";
  return { isPremium, isLoading };
}

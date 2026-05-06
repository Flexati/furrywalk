import { useEffect, useRef, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import { trpc } from "@/lib/trpc";
import { useSubscriptionStore } from "./use-subscription-store";

/**
 * Hook combining tRPC server sync + Zustand local cache for subscription state.
 * Refetches on app foreground and exposes convenience helpers.
 */
export function useSubscription() {
  const store = useSubscriptionStore();
  const { data, refetch, isLoading, error } =
    trpc.subscription.getStatus.useQuery(undefined, {
      staleTime: 5 * 60 * 1000,
      retry: 2,
    });

  const restoreMutation = trpc.subscription.restore.useMutation();

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Sync server data into Zustand on mount and on data change
  useEffect(() => {
    if (data) {
      const toISO = (d: Date | string | null | undefined): string | null => {
        if (!d) return null;
        if (typeof d === "string") return d;
        return d.toISOString();
      };
      store.setSubscription({
        tier: data.tier,
        status: data.status,
        currentPeriodEnd: toISO(data.currentPeriodEnd),
        trialEnd: toISO(data.trialEnd),
        cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
      });
      store.setLastSyncAt(new Date().toISOString());
    }
  }, [data]);

  // Refetch on app foreground (background → active transition)
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === "active"
      ) {
        refetch();
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [refetch]);

  const isPro = store.isPro();

  const restore = useCallback(async () => {
    try {
      const result = await restoreMutation.mutateAsync();
      if (result.restored) {
        store.setSubscription({
          tier: result.tier,
          status: "active",
        });
      }
      return result;
    } catch {
      return { restored: false, tier: "free_with_ads" as const };
    }
  }, [restoreMutation, store]);

  return {
    tier: store.tier,
    isPro,
    status: store.status,
    currentPeriodEnd: store.currentPeriodEnd,
    trialEnd: store.trialEnd,
    cancelAtPeriodEnd: store.cancelAtPeriodEnd,
    isLoading,
    error,
    refetch,
    restore,
  };
}

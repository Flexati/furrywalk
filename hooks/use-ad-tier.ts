import { useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAdTierStore } from "./use-ad-tier-store";

/**
 * Hook combining tRPC + Zustand for ad tier configuration.
 * Returns helpers to check ad eligibility and record rewarded views.
 */
export function useAdTier() {
  const store = useAdTierStore();
  const { data, refetch } = trpc.ad.getConfig.useQuery(undefined, {
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });

  const recordMutation = trpc.ad.recordRewardedView.useMutation();
  const consentMutation = trpc.ad.updateConsent.useMutation();

  useEffect(() => {
    if (data) {
      store.setAdConfig({
        tier: data.tier,
        bannerEnabled: data.bannerEnabled ?? false,
        rewardedEnabled: data.rewardedEnabled ?? false,
        interstitialEnabled: data.interstitialEnabled ?? false,
        rewardedFrequencyCap: data.rewardedFrequencyCap ?? 3,
        rewardedCountToday: data.rewardedCountToday ?? 0,
        consentIabTcf: data.consentIabTcf ?? false,
        consentAttIos: data.consentAttIos ?? false,
        adPersonalization: data.adPersonalization ?? false,
      });
    }
  }, [data]);

  const canShowRewarded =
    store.rewardedEnabled &&
    store.consentIabTcf &&
    store.rewardedCountToday < store.rewardedFrequencyCap;

  const recordRewardedView = useCallback(async () => {
    store.incrementRewardedCount();
    try {
      await recordMutation.mutateAsync();
      refetch();
    } catch {
      // Offline — trust local state, sync later
    }
  }, [recordMutation, refetch]);

  const updateConsent = useCallback(
    async (opts: {
      iabTcf?: boolean;
      attIos?: boolean;
      adPersonalization?: boolean;
    }) => {
      store.setConsent(
        opts.iabTcf ?? store.consentIabTcf,
        opts.attIos ?? store.consentAttIos,
      );
      try {
        await consentMutation.mutateAsync({
          iabTcf: opts.iabTcf,
          attIos: opts.attIos,
          adPersonalization: opts.adPersonalization,
        });
      } catch {
        // Deferred sync on next query
      }
    },
    [consentMutation],
  );

  return {
    tier: store.tier,
    bannerEnabled: store.bannerEnabled,
    rewardedEnabled: store.rewardedEnabled,
    interstitialEnabled: store.interstitialEnabled,
    rewardedFrequencyCap: store.rewardedFrequencyCap,
    rewardedCountToday: store.rewardedCountToday,
    canShowRewarded,
    consentIabTcf: store.consentIabTcf,
    consentAttIos: store.consentAttIos,
    adPersonalization: store.adPersonalization,
    recordRewardedView,
    updateConsent,
    refetch,
  };
}

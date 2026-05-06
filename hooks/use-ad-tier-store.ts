import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type AdTierLevel = "free_with_ads" | "pro_ad_free" | "pro_family";

interface AdTierState {
  tier: AdTierLevel;
  bannerEnabled: boolean;
  rewardedEnabled: boolean;
  interstitialEnabled: boolean;
  rewardedFrequencyCap: number;
  rewardedCountToday: number;
  consentIabTcf: boolean;
  consentAttIos: boolean;
  adPersonalization: boolean;

  setAdConfig: (config: Partial<AdTierState>) => void;
  incrementRewardedCount: () => void;
  resetDailyCount: () => void;
  setConsent: (iabTcf: boolean, attIos: boolean) => void;
  reset: () => void;
}

const initialState = {
  tier: "free_with_ads" as AdTierLevel,
  bannerEnabled: true,
  rewardedEnabled: true,
  interstitialEnabled: false,
  rewardedFrequencyCap: 3,
  rewardedCountToday: 0,
  consentIabTcf: false,
  consentAttIos: false,
  adPersonalization: false,
};

export const useAdTierStore = create<AdTierState>()(
  persist(
    (set) => ({
      ...initialState,

      setAdConfig: (config) => set(config),
      incrementRewardedCount: () =>
        set((s) => ({ rewardedCountToday: s.rewardedCountToday + 1 })),
      resetDailyCount: () => set({ rewardedCountToday: 0 }),
      setConsent: (iabTcf, attIos) =>
        set({ consentIabTcf: iabTcf, consentAttIos: attIos }),
      reset: () => set(initialState),
    }),
    {
      name: "ad-tier-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

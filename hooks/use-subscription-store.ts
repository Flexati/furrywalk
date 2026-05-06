import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Tier = "free_with_ads" | "pro_ad_free" | "pro_family";
export type TierStatus =
  | "on_trial"
  | "active"
  | "past_due"
  | "cancelled"
  | "expired"
  | "paused"
  | "unpaid";

interface SubscriptionState {
  tier: Tier;
  status: TierStatus;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean;
  pendingTier: string | null;
  lastSyncAt: string | null;

  setSubscription: (data: {
    tier: Tier;
    status: TierStatus;
    currentPeriodEnd?: string | null;
    trialEnd?: string | null;
    cancelAtPeriodEnd?: boolean;
  }) => void;
  setPendingTier: (tier: string) => void;
  clearPendingTier: () => void;
  setLastSyncAt: (iso: string) => void;
  isPro: () => boolean;
  reset: () => void;
}

const initialState = {
  tier: "free_with_ads" as Tier,
  status: "active" as TierStatus,
  currentPeriodEnd: null,
  trialEnd: null,
  cancelAtPeriodEnd: false,
  pendingTier: null,
  lastSyncAt: null,
};

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setSubscription: (data) =>
        set({
          tier: data.tier,
          status: data.status,
          currentPeriodEnd: data.currentPeriodEnd ?? null,
          trialEnd: data.trialEnd ?? null,
          cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
        }),

      setPendingTier: (tier) => set({ pendingTier: tier }),
      clearPendingTier: () => set({ pendingTier: null }),
      setLastSyncAt: (iso) => set({ lastSyncAt: iso }),

      isPro: () => {
        const { tier } = get();
        return tier === "pro_ad_free" || tier === "pro_family";
      },

      reset: () => set(initialState),
    }),
    {
      name: "subscription-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

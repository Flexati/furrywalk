import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { trpc } from "@/lib/trpc";
import { useSubscriptionStore } from "@/hooks/use-subscription-store";
import { openLSCheckout, getLSCheckoutConfig, onLSCheckoutReturn } from "@/lib/services/ls-checkout";

// ─── Benefit definitions ───
const BENEFITS: { icon: string; title: string; desc: string }[] = [
  {
    icon: "shield-checkmark",
    title: "No Ads, Ever",
    desc: "Pure walking experience without interruptions",
  },
  {
    icon: "paw",
    title: "Up to 5 Dog Profiles",
    desc: "Track health and walks for all your dogs",
  },
  {
    icon: "map",
    title: "Offline Maps",
    desc: "Download routes and navigate without cellular data",
  },
  {
    icon: "analytics",
    title: "Advanced Stats",
    desc: "Weekly trends, breed comparisons, energy analytics",
  },
  {
    icon: "medkit",
    title: "3 Vet Tele-Consults / Month",
    desc: "Professional advice when you need it",
  },
  {
    icon: "download",
    title: "Export Walk History",
    desc: "CSV & PDF reports for your vet",
  },
];

// ─── Price Toggle ───
function PriceToggle({
  isYearly,
  onToggle,
}: {
  isYearly: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View className="flex-row items-center justify-center mt-6 mb-4 bg-[#E8E8E8] rounded-2xl p-1">
      <Pressable
        onPress={() => onToggle(false)}
        className={`flex-1 py-3 px-4 rounded-xl ${!isYearly ? "bg-white shadow-sm" : "bg-transparent"}`}
        accessibilityRole="button"
        accessibilityLabel="Monthly billing"
        accessibilityState={{ selected: !isYearly }}
      >
        <Text
          className={`text-center text-sm font-semibold ${!isYearly ? "text-[#1E3D2F]" : "text-[#2B2B2B]"}`}
        >
          Monthly
        </Text>
        <Text className="text-center text-xs text-[#2B2B2B] mt-1">€3.99/mo</Text>
      </Pressable>
      <Pressable
        onPress={() => onToggle(true)}
        className={`flex-1 py-3 px-4 rounded-xl ${isYearly ? "bg-white shadow-sm" : "bg-transparent"}`}
        accessibilityRole="button"
        accessibilityLabel="Yearly billing with 25 percent discount"
        accessibilityState={{ selected: isYearly }}
      >
        <View className="flex-row items-center justify-center gap-1">
          <Text
            className={`text-center text-sm font-semibold ${isYearly ? "text-[#1E3D2F]" : "text-[#2B2B2B]"}`}
          >
            Yearly
          </Text>
          <View className="bg-[#F47C35] rounded-full px-2 py-0.5">
            <Text className="text-[10px] font-bold text-white">-25%</Text>
          </View>
        </View>
        <Text className="text-center text-xs text-[#2B2B2B] mt-1">€2.99/mo</Text>
        <Text className="text-center text-[10px] text-[#2B2B2B] opacity-60">
          €35.88/year
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Benefit List ───
function BenefitList() {
  return (
    <View className="mt-4 gap-3">
      {BENEFITS.map((b) => (
        <View
          key={b.title}
          className="flex-row items-start gap-3 bg-white rounded-xl p-3 shadow-sm"
        >
          <Ionicons
            name={b.icon as keyof typeof Ionicons.glyphMap}
            size={22}
            color="#1E3D2F"
          />
          <View className="flex-1">
            <Text className="text-[15px] font-semibold text-[#2B2B2B]">{b.title}</Text>
            <Text className="text-[13px] text-[#2B2B2B] opacity-60 mt-0.5">
              {b.desc}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Trust Badges ───
function TrustBadges() {
  return (
    <View className="flex-row items-center justify-center gap-6 mt-6 mb-2">
      <View className="flex-row items-center gap-1">
        <Ionicons name="lock-closed" size={14} color="#2B2B2B" />
        <Text className="text-xs text-[#2B2B2B] opacity-60">Secure</Text>
      </View>
      <View className="flex-row items-center gap-1">
        <Ionicons name="close-circle" size={14} color="#2B2B2B" />
        <Text className="text-xs text-[#2B2B2B] opacity-60">Cancel anytime</Text>
      </View>
      <View className="flex-row items-center gap-1">
        <Ionicons name="star" size={14} color="#F47C35" />
        <Text className="text-xs text-[#2B2B2B] opacity-60">4.8★ rating</Text>
      </View>
    </View>
  );
}

// ─── Main Paywall Screen ───
export default function PaywallScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";

  const [isYearly, setIsYearly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setPendingTier = useSubscriptionStore((s) => s.setPendingTier);
  const clearPendingTier = useSubscriptionStore((s) => s.clearPendingTier);
  const setSubscription = useSubscriptionStore((s) => s.setSubscription);

  const syncMutation = trpc.subscription.sync.useMutation();
  const restoreMutation = trpc.subscription.restore.useMutation();

  const tier = "pro_ad_free" as const;
  const interval = isYearly ? ("yearly" as const) : ("monthly" as const);

  const checkoutConfig = useMemo(
    () => getLSCheckoutConfig(tier, interval),
    [tier, interval],
  );

  // Handle deep link return from LS checkout
  useEffect(() => {
    const cleanup = onLSCheckoutReturn(async (_url) => {
      setIsLoading(true);
      try {
        const result = await syncMutation.mutateAsync({});
        clearPendingTier();
        if (result.synced) {
          setSubscription({ tier: result.tier as "pro_ad_free", status: "active" });
          router.back();
        }
      } catch {
        setError("Failed to verify subscription. Please contact support.");
      } finally {
        setIsLoading(false);
      }
    });
    return cleanup;
  }, []);

  const handleUpgrade = useCallback(async () => {
    if (!checkoutConfig) {
      setError("Checkout unavailable. Please try again later.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setPendingTier(`${tier}_${interval}`);

    const result = await openLSCheckout(checkoutConfig);

    if (!result.success && !result.cancelled) {
      setError(result.error ?? "Could not open checkout.");
      clearPendingTier();
      setIsLoading(false);
    }

    if (result.cancelled) {
      clearPendingTier();
      setIsLoading(false);
    }
    // On success, the deep link listener handles the rest
  }, [checkoutConfig, tier, interval]);

  const handleRestore = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await restoreMutation.mutateAsync();
      if (result.restored) {
        setSubscription({ tier: result.tier, status: "active" });
        router.back();
      } else {
        setError("No previous purchases found.");
      }
    } catch {
      setError("Restore failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const priceDisplay = isYearly ? "2.99" : "3.99";

  return (
    <View className="flex-1 bg-[#FFF5E6]">
      {/* Header */}
      <View className="items-center pt-12 pb-2 px-6">
        <Text className="text-[28px] font-bold text-[#1E3D2F] text-center">
          Go Premium
        </Text>
        <Text className="text-[15px] text-[#2B2B2B] opacity-70 text-center mt-2">
          Unlock the full Passeggiata Furba experience
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Price */}
        <View className="items-center mt-2">
          <View className="flex-row items-baseline">
            <Text className="text-[40px] font-bold text-[#1E3D2F]">
              €{priceDisplay}
            </Text>
            <Text className="text-[16px] text-[#2B2B2B] opacity-60 ml-1">
              /month
            </Text>
          </View>
          {isYearly && (
            <Text className="text-[13px] text-[#F47C35] font-semibold mt-1">
              Billed €35.88/year — save 25%
            </Text>
          )}
        </View>

        <PriceToggle isYearly={isYearly} onToggle={setIsYearly} />
        <BenefitList />
        <TrustBadges />

        {/* Primary CTA */}
        <Pressable
          onPress={handleUpgrade}
          disabled={isLoading || !checkoutConfig}
          className={`mt-6 py-4 rounded-2xl items-center ${isLoading || !checkoutConfig ? "bg-[#1E3D2F] opacity-50" : "bg-[#1E3D2F]"}`}
          accessibilityRole="button"
          accessibilityLabel={`Start free trial for €${priceDisplay} per month`}
        >
          <Text className="text-white text-[17px] font-semibold">
            {isLoading ? "Loading..." : "Start 7-Day Free Trial"}
          </Text>
        </Pressable>

        {error && (
          <Text className="text-red-500 text-center text-sm mt-3">{error}</Text>
        )}

        {/* Close */}
        <Pressable
          onPress={() => router.back()}
          className="mt-4 py-2 items-center"
          accessibilityRole="button"
          accessibilityLabel="Close and continue with free version"
        >
          <Text className="text-[#2B2B2B] opacity-50 text-[15px] underline">
            Continue with Free
          </Text>
        </Pressable>

        {/* Restore */}
        <Pressable
          onPress={handleRestore}
          className="mt-6 py-2 items-center"
          accessibilityRole="button"
          accessibilityLabel="Restore previous purchases"
        >
          <Text className="text-[#2B2B2B] opacity-40 text-[13px]">
            Restore Purchases
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

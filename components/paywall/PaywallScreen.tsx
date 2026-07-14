import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
  useWindowDimensions,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { trpc } from "@/lib/trpc";
import { useSubscriptionStore } from "@/hooks/use-subscription-store";
import {
  requestSubscription,
  type CheckoutTier,
  type BillingInterval,
  type CheckoutResult,
} from "@/lib/services/payment-provider";

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
    title: "Vet Health Library",
    desc: "Expert-written answers on dog health & walking safety",
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
  const [showConfirmation, setShowConfirmation] = useState(false);

  const setPendingTier = useSubscriptionStore((s) => s.setPendingTier);
  const clearPendingTier = useSubscriptionStore((s) => s.clearPendingTier);
  const setSubscription = useSubscriptionStore((s) => s.setSubscription);

  const syncPlayBillingMutation = trpc.subscription.syncPlayBilling.useMutation();
  const restoreMutation = trpc.subscription.restore.useMutation();

  const tier: CheckoutTier = "pro_ad_free";
  const interval: BillingInterval = isYearly ? "yearly" : "monthly";

  const handleUpgrade = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setPendingTier(`${tier}_${interval}`);

    const result: CheckoutResult = await requestSubscription({ tier, interval });

    if (result.cancelled) {
      clearPendingTier();
      setIsLoading(false);
      return;
    }

    if (!result.success) {
      setError(result.error ?? "Could not complete purchase.");
      clearPendingTier();
      setIsLoading(false);
      return;
    }

    // Play Billing: sync purchase with server
    if (result.purchaseToken && result.productId) {
      try {
        const syncResult = await syncPlayBillingMutation.mutateAsync({
          purchaseToken: result.purchaseToken,
          productId: result.productId,
        });
        clearPendingTier();
        if (syncResult.synced) {
          setSubscription({ tier: syncResult.tier, status: "active" });
          setShowConfirmation(true);
        }
      } catch {
        setError("Failed to verify subscription. Please contact support.");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(false);
    setError("Purchase completed but no token received. Please try again.");
  }, [tier, interval]);

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

  // Animated checkmark scale for confirmation
  const checkmarkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showConfirmation) {
      Animated.spring(checkmarkScale, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }).start();
    }
  }, [showConfirmation]);

  // ─── Confirmation Screen ───
  if (showConfirmation) {
    return (
      <View className="flex-1 bg-[#FFF5E6] items-center justify-center px-8">
        <Animated.View style={{ transform: [{ scale: checkmarkScale }] }}>
          <View className="w-24 h-24 rounded-full bg-[#1E3D2F] items-center justify-center mb-6">
            <Ionicons name="checkmark" size={48} color="#FFF" />
          </View>
        </Animated.View>

        <Text className="text-[28px] font-bold text-[#1E3D2F] text-center">
          Grazie!
        </Text>
        <Text className="text-[16px] text-[#2B2B2B] opacity-70 text-center mt-2 mb-8">
          Il tuo abbonamento Pro è attivo
        </Text>

        {/* Plan summary card */}
        <View className="bg-white rounded-2xl p-5 w-full shadow-sm mb-8">
          <View className="flex-row items-center gap-3 mb-4">
            <Ionicons name="star" size={20} color="#F47C35" />
            <Text className="text-[17px] font-semibold text-[#1E3D2F]">
              Passeggiata Furba Pro
            </Text>
          </View>

          <View className="h-px bg-[#E8E8E8] mb-4" />

          <View className="flex-row justify-between mb-2">
            <Text className="text-[14px] text-[#2B2B2B] opacity-60">Piano</Text>
            <Text className="text-[14px] font-semibold text-[#2B2B2B]">
              {interval === "yearly" ? "Annuale" : "Mensile"}
            </Text>
          </View>

          <View className="flex-row justify-between mb-2">
            <Text className="text-[14px] text-[#2B2B2B] opacity-60">Prezzo</Text>
            <Text className="text-[14px] font-semibold text-[#2B2B2B]">
              {interval === "yearly" ? "€35.88/anno" : `€${priceDisplay}/mese`}
            </Text>
          </View>

          <View className="flex-row justify-between mb-2">
            <Text className="text-[14px] text-[#2B2B2B] opacity-60">Prova gratuita</Text>
            <Text className="text-[14px] font-semibold text-[#1E3D2F]">7 giorni</Text>
          </View>

          <View className="flex-row justify-between">
            <Text className="text-[14px] text-[#2B2B2B] opacity-60">Ricevuta</Text>
            <Text className="text-[14px] font-semibold text-[#2B2B2B]">Via email</Text>
          </View>
        </View>

        {/* Email receipt note */}
        <View className="flex-row items-start gap-2 mb-8 px-2">
          <Ionicons name="mail-outline" size={16} color="#2B2B2B" style={{ opacity: 0.5 }} />
          <Text className="text-[13px] text-[#2B2B2B] opacity-50 flex-1">
            Ti abbiamo inviato la ricevuta via email. Controlla anche la cartella spam.
          </Text>
        </View>

        {/* CTA */}
        <Pressable
          onPress={() => router.back()}
          className="bg-[#1E3D2F] py-4 rounded-2xl items-center w-full"
          accessibilityRole="button"
          accessibilityLabel="Torna all'app"
        >
          <Text className="text-white text-[17px] font-semibold">
            Inizia a usare Pro
          </Text>
        </Pressable>
      </View>
    );
  }

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

        {/* Primary CTA — only available on Android */}
        {Platform.OS === "android" ? (
          <Pressable
            onPress={handleUpgrade}
            disabled={isLoading}
            className={`mt-6 py-4 rounded-2xl items-center ${isLoading ? "bg-[#1E3D2F] opacity-50" : "bg-[#1E3D2F]"}`}
            accessibilityRole="button"
            accessibilityLabel={`Start free trial for €${priceDisplay} per month`}
          >
            <Text className="text-white text-[17px] font-semibold">
              {isLoading ? "Loading..." : "Start 7-Day Free Trial"}
            </Text>
          </Pressable>
        ) : (
          <View className="mt-6 py-4 rounded-2xl items-center bg-[#E8E8E8]">
            <Text className="text-[#2B2B2B] text-[15px] opacity-70">
              Available on Android only
            </Text>
          </View>
        )}

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

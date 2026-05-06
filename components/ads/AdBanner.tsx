import React, { useState } from "react";
import { View, Text, Platform } from "react-native";
import { useAdTier } from "@/hooks/use-ad-tier";

/**
 * Lazy-loaded AdMob Banner component.
 * The AdMob SDK is only required/loaded when the user is on the free tier
 * and has given IAB TCF 2.2 consent. This avoids bundling the SDK for Pro users.
 */
let AdMobBannerView: React.ComponentType<{
  unitId: string;
  size: string;
  onAdLoaded?: () => void;
  onAdFailedToLoad?: (error: string) => void;
}> | null = null;

function getAdMobBanner() {
  if (!AdMobBannerView) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { BannerAd, BannerAdSize } = require("react-native-google-mobile-ads");
      AdMobBannerView = (props: {
        unitId: string;
        size: string;
        onAdLoaded?: () => void;
        onAdFailedToLoad?: (error: string) => void;
      }) => (
        <BannerAd
          unitId={props.unitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          onAdLoaded={props.onAdLoaded}
          onAdFailedToLoad={(e: { message: string }) =>
            props.onAdFailedToLoad?.(e.message)
          }
        />
      );
    } catch {
      return null;
    }
  }
  return AdMobBannerView;
}

interface AdBannerProps {
  placement: "home" | "detail" | "tracker" | "summary";
  className?: string;
}

export function AdBanner({ placement, className }: AdBannerProps) {
  const {
    tier,
    bannerEnabled,
    consentIabTcf,
  } = useAdTier();
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);

  const adUnitId =
    Platform.OS === "android"
      ? process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID
      : process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS;

  const shouldShowAd =
    tier === "free_with_ads" &&
    bannerEnabled &&
    consentIabTcf &&
    !!adUnitId;

  const BannerComponent = getAdMobBanner();

  if (!shouldShowAd || !BannerComponent || !adUnitId) {
    return null;
  }

  return (
    <View
      className={`w-full min-h-[50px] items-center justify-center ${
        adLoaded ? "bg-transparent" : "bg-[#E8E8E8]"
      } ${className ?? ""}`}
      accessibilityLabel="Advertisement banner"
    >
      {adError ? (
        <View className="py-2 px-4">
          <Text className="text-xs text-[#2B2B2B] opacity-40 text-center">
            Ad not available
          </Text>
        </View>
      ) : (
        <BannerComponent
          unitId={adUnitId}
          size="ANCHORED_ADAPTIVE_BANNER"
          onAdLoaded={() => setAdLoaded(true)}
          onAdFailedToLoad={(msg: string) => {
            setAdError(msg);
            console.warn("[AdBanner]", placement, "load failed:", msg);
          }}
        />
      )}
    </View>
  );
}

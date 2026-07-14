// Phase 1.1 — Production config
// Package ID: space.dogs.walk.dogs.t20260504051231 — Play Store-registered identifier
import type { ExpoConfig } from "expo/config";

const bundleId = "space.dogs.walk.dogs.t20260504051231";
const env = {
  appName: "FurryWalk",
  appSlug: "passeggiata-furba",
  logoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663611683209/KDdoZNyUrVhVTvdxaK293E/splash-icon-nCKhaT5m5QUb942pk5rgS6.webp",
  scheme: "passeggiatafurba",
  iosBundleId: bundleId,
  androidPackage: bundleId,
};

const config: ExpoConfig = {
  name: env.appName,
  slug: env.appSlug,
  version: "1.0.0",
  // Phase 1.1: buildNumber / playStoreVersionCode pinned to 1 for v1.0.0
  // CI overrides versionCode via -PversionCode=<N> (see release-build.yml)
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: env.scheme,
  // Phase 1.1 spec: light mode (no automatic dark mode in v1.0.0)
  userInterfaceStyle: "light",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: env.iosBundleId,
    "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false
      }
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#FFF5E6",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: env.androidPackage,
    // Phase 1.1: Play Store versionCode 1 for initial release
    // Auto-incremented by EAS Build (eas.json autoIncrement: true) on each production build
    versionCode: 1,
    permissions: [
      "POST_NOTIFICATIONS",
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
      // Phase 1.1 compliance: CAMERA + READ_MEDIA_IMAGES for walk photo feature
      "CAMERA",
      "READ_MEDIA_IMAGES",
      // READ/WRITE_EXTERNAL_STORAGE kept for Android < 10 compat (minSdk 24)
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE",
      "VIBRATE",
      "INTERNET",
      // Phase 1.1: BILLING permission for future Google Play Billing (Phase 1.4)
      "com.android.vending.BILLING",
    ],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: env.scheme,
            host: "*",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-audio",
      {
        microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone.",
      },
    ],
    [
      "expo-video",
      {
        supportsBackgroundPlayback: true,
        supportsPictureInPicture: true,
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          compileSdkVersion: 36,
          targetSdkVersion: 36,
          buildToolsVersion: "35.0.0",
          minSdkVersion: 24,
          // Phase 1.1: single ABI for smaller AAB (Play Store handles splits)
          buildArchs: ["arm64-v8a"],
          // R8 minification disabled: AGP 8.x full-mode R8 fails the bundle
          // step on transitive dependency classes (CompilationFailedException).
          // Re-enable once keep rules are validated; AAB is larger but builds.
          enableMinifyInReleaseBuilds: false,
          enableShrinkResourcesInReleaseBuilds: false,
        },
      },
    ],
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "Permetti a Passeggiata Furba di tracciare il tuo percorso durante la passeggiata.",
        locationWhenInUsePermission:
          "Permetti a Passeggiata Furba di tracciare il tuo percorso durante la passeggiata.",
        // Phase 1.1 compliance: background location DISABLED in v1.0.0
        // Google Play requires explicit justification for ACCESS_BACKGROUND_LOCATION.
        // Will be re-enabled in Phase 1.5 with full policy declaration.
        isAndroidBackgroundLocationEnabled: false,
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission: "Passeggiata Furba accede alle foto per allegarle alle passeggiate.",
        cameraPermission: "Passeggiata Furba accede alla fotocamera per le foto del cane.",
      },
    ],
    [
      "expo-notifications",
      {
        icon: "./assets/images/icon.png",
        color: "#2D5A3D",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: false,
  },
};

export default config;

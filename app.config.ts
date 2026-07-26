// Package ID: furry.walk.dog — Play Store-registered identifier
import type { ExpoConfig } from "expo/config";

const bundleId = "furry.walk.dog";
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
    // Incrementato manualmente per ogni release Play Console.
    // CI workflow --version-code NON sovrascrive app.config.ts → hardcoded.
    versionCode: 13,
    // Note: REMOVED RECORD_AUDIO, FOREGROUND_SERVICE_MEDIA_PLAYBACK, BILLING
    // (last 3 entries previously here) — Play Console started requesting a
    // video demo for FOREGROUND_SERVICE_MEDIA_PLAYBACK because the app does
    // not actually play background media. Permissions kept minimal to what
    // the app truly uses: notifications + GPS (foreground tracking only,
    // not background, so we also do NOT need FOREGROUND_SERVICE).
    permissions: [
      "POST_NOTIFICATIONS",
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
      "CAMERA",
      "READ_MEDIA_IMAGES",
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE",
      "VIBRATE",
      "INTERNET",
      "com.google.android.gms.permission.AD_ID",
    ],
    blockedPermissions: [
      "android.permission.USE_BIOMETRIC",
      "android.permission.USE_FINGERPRINT",
      "android.permission.RECORD_AUDIO",
      "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
      "android.permission.SYSTEM_ALERT_WINDOW",
      "android.permission.DUMP",
      "android.permission.READ_APP_BADGE",
      "android.permission.RECEIVE_BOOT_COMPLETED",
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
    // REMOVED expo-audio and expo-video plugins: the app does not record audio
    // or play background video, so including them caused Play Console to demand
    // a video demo for FOREGROUND_SERVICE_MEDIA_PLAYBACK.
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
          // Override transitive Android dependencies to keep Kotlin metadata
          // version below 2.1.0 (Expo SDK 54 + RN 0.81 use Kotlin 2.1.20, but
          // play-services-ads 25.4.0 ships Kotlin metadata 2.3.0 → binary
          // incompatibility → compileReleaseKotlin FAILED).
          dependencies: [
            {
              group: "com.google.android.gms",
              artifact: "play-services-ads",
              version: "24.0.0",
            },
            {
              group: "com.google.android.ump",
              artifact: "user-messaging-platform",
              version: "2.1.0",
            },
          ],
        },
      },
    ],
    [
      "react-native-google-mobile-ads",
      {
        // Google official TEST App ID — safe for internal testing.
        // Prod replacement: AdMob dashboard → register furry.walk.dog → real App ID.
        // Publisher: pub-8156953772676654
        androidAppId: "ca-app-pub-3940256099942544~3347511713",
        iosAppId: "ca-app-pub-3940256099942544~1458002511",
        userTrackingUsageReason: "Passeggiata Furba usa l'ID pubblicità per mostrare annunci pertinenti nel piano gratuito.",
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

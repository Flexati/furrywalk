import { ScrollView, Text, View, TouchableOpacity, Switch, Alert, Linking } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useState } from "react";
import { Storage } from "@/lib/services/storage";
import { exportWalkHistory } from "@/utils/export-utils";
import { useRouter } from "expo-router";
import { useSubscription } from "@/hooks/use-subscription";
import Constants from "expo-constants";
import { i18n, setLanguage } from "@/lib/i18n";

const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";
const PRIVACY_POLICY_URL = "https://passeggiata-furba.vercel.app/api/privacy";
const SUPPORT_EMAIL = "amzajaguar@gmail.com";

export default function SettingsScreen() {
  const router = useRouter();
  const { isPro, tier, status, isLoading: subLoading } = useSubscription();
  const [notif, setNotif] = useState(true);
  const [hapticsOn, setHapticsOn] = useState(true);
  const [locale, setLocale] = useState(i18n.locale.substring(0, 2));
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);

  const toggleLanguage = () => {
    const newLang = locale === "en" ? "it" : "en";
    setLanguage(newLang);
    setLocale(newLang);
  };

  const handleResetOnboarding = () => {
    Alert.alert("Reset onboarding", "Mostra di nuovo l'onboarding al prossimo avvio?", [
      { text: "Annulla", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: async () => {
          await Storage.setOnboardingDone(false);
          router.replace("/onboarding");
        },
      },
    ]);
  };

  const handleClearWalks = () => {
    Alert.alert("Cancella passeggiate", "Eliminare tutte le passeggiate salvate?", [
      { text: "Annulla", style: "cancel" },
      {
        text: "Elimina",
        style: "destructive",
        onPress: async () => {
          await Storage.clearWalks();
          Alert.alert("Fatto", "Tutte le passeggiate sono state eliminate.");
        },
      },
    ]);
  };

  const handleExport = async (format: "csv" | "pdf") => {
    if (!isPro && status !== "on_trial") {
      router.push("/paywall");
      return;
    }
    try {
      setExporting(format);
      await exportWalkHistory({ format });
    } catch (e) {
      Alert.alert("Errore export", String(e));
    } finally {
      setExporting(null);
    }
  };

  const premiumLabel = subLoading
    ? "Caricamento..."
    : isPro
      ? `Pro ${tier === "pro_family" ? "Family" : ""} Attivo ✓`
      : "Sblocca tutte le funzioni";

  const premiumSubLabel = isPro
    ? status === "on_trial"
      ? "Periodo di prova in corso"
      : status === "active"
        ? "Abbonamento attivo"
        : status
    : "Mappe offline, multi-cane, statistiche avanzate, alert veterinario.";

  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}>
        <View className="flex-1 gap-6">
          <Text className="text-3xl font-bold text-foreground">Impostazioni</Text>

          <View className="bg-primary rounded-3xl p-6">
            <Text className="text-white text-xs font-bold mb-1">PREMIUM</Text>
            <Text className="text-white text-2xl font-bold mb-2">
              {premiumLabel}
            </Text>
            <Text className="text-white/90 text-sm mb-4">
              {premiumSubLabel}
            </Text>
            {!subLoading && !isPro && (
              <TouchableOpacity
                onPress={() => router.push("/paywall")}
                className="bg-white rounded-full py-3 items-center"
              >
                <Text className="text-primary font-bold">Diventa Premium • €3.99/mese</Text>
              </TouchableOpacity>
            )}
            {isPro && (
              <TouchableOpacity
                onPress={() => router.push("/paywall")}
                className="bg-white/20 rounded-full py-3 items-center"
              >
                <Text className="text-white font-bold">Gestisci abbonamento</Text>
              </TouchableOpacity>
            )}
          </View>

          <View className="bg-surface rounded-2xl border border-border divide-y divide-border">
            <View className="p-4 flex-row items-center justify-between">
              <View>
                <Text className="font-semibold text-foreground">Notifiche</Text>
                <Text className="text-xs text-muted">Promemoria e avvisi</Text>
              </View>
              <Switch value={notif} onValueChange={setNotif} />
            </View>
            <View className="p-4 flex-row items-center justify-between">
              <View>
                <Text className="font-semibold text-foreground">Vibrazione</Text>
                <Text className="text-xs text-muted">Feedback aptico</Text>
              </View>
              <Switch value={hapticsOn} onValueChange={setHapticsOn} />
            </View>
            <View className="p-4 flex-row items-center justify-between">
              <View>
                <Text className="font-semibold text-foreground">Lingua / Language</Text>
                <Text className="text-xs text-muted">IT / EN</Text>
              </View>
              <Switch 
                value={locale === "en"} 
                onValueChange={toggleLanguage} 
                trackColor={{ false: "#ccc", true: "#2D5A3D" }}
                thumbColor={"#fff"}
              />
            </View>
          </View>

          <View className="gap-3">
            <Text className="text-sm font-bold text-foreground">DATI</Text>
            <TouchableOpacity
              onPress={handleResetOnboarding}
              className="bg-surface rounded-2xl p-4 border border-border"
            >
              <Text className="font-semibold text-foreground">Rifai onboarding</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleClearWalks}
              className="bg-surface rounded-2xl p-4 border border-border"
            >
              <Text className="font-semibold text-error">Cancella tutte le passeggiate</Text>
            </TouchableOpacity>
            <View className="gap-3 mt-3">
              <Text className="text-sm font-bold text-foreground">ESPORTA DATI</Text>
              {isPro || status === "on_trial" ? (
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    disabled={exporting !== null}
                    onPress={() => handleExport("csv")}
                    className="flex-1 bg-primary rounded-2xl py-3 items-center active:opacity-90"
                  >
                    <Text className="text-white font-bold">
                      {exporting === "csv" ? "..." : "Esporta CSV"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={exporting !== null}
                    onPress={() => handleExport("pdf")}
                    className="flex-1 bg-primary rounded-2xl py-3 items-center active:opacity-90"
                  >
                    <Text className="text-white font-bold">
                      {exporting === "pdf" ? "..." : "Esporta PDF"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => router.push("/paywall")}
                  className="bg-surface rounded-2xl p-4 border border-border"
                >
                  <Text className="text-primary font-semibold">🔓 Sblocca l'export dei dati</Text>
                  <Text className="text-xs text-muted mt-1">
                    Esporta le tue passeggiate in CSV o PDF per il veterinario.
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View className="gap-3">
            <Text className="text-sm font-bold text-foreground">SUPPORTO</Text>
            <TouchableOpacity
              onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
              className="bg-surface rounded-2xl p-4 border border-border flex-row items-center justify-between"
              accessibilityRole="link"
              accessibilityLabel="Apri la Privacy Policy"
            >
              <Text className="font-semibold text-foreground">Privacy Policy</Text>
              <Text className="text-muted text-xs">→</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                Linking.openURL(
                  `mailto:${SUPPORT_EMAIL}?subject=Passeggiata%20Furba%20Support`
                )
              }
              className="bg-surface rounded-2xl p-4 border border-border flex-row items-center justify-between"
              accessibilityRole="button"
              accessibilityLabel="Invia email al supporto"
            >
              <Text className="font-semibold text-foreground">Contatta il Supporto</Text>
              <Text className="text-muted text-xs">✉</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => Linking.openURL("https://openstreetmap.org/copyright")}
              className="bg-surface rounded-2xl p-4 border border-border"
            >
              <Text className="font-semibold text-foreground">Mappe © OpenStreetMap</Text>
            </TouchableOpacity>
          </View>

          <View className="bg-surface rounded-2xl p-4 border border-border items-center">
            <Text className="text-xs text-muted">Passeggiata Furba v{APP_VERSION}</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

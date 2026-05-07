import { ScrollView, Text, View, TouchableOpacity, Switch, Alert, Linking } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useEffect, useState } from "react";
import { Storage } from "@/lib/services/storage";
import { useRouter } from "expo-router";

export default function SettingsScreen() {
  const router = useRouter();
  const [premium, setPremium] = useState(false);
  const [notif, setNotif] = useState(true);
  const [hapticsOn, setHapticsOn] = useState(true);

  useEffect(() => {
    Storage.getPremium().then(setPremium);
  }, []);

  const togglePremium = async (v: boolean) => {
    setPremium(v);
    await Storage.setPremium(v);
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

  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}>
        <View className="flex-1 gap-6">
          <Text className="text-3xl font-bold text-foreground">Impostazioni</Text>

          <View className="bg-primary rounded-3xl p-6">
            <Text className="text-white text-xs font-bold mb-1">PREMIUM</Text>
            <Text className="text-white text-2xl font-bold mb-2">
              {premium ? "Attivo ✓" : "Sblocca tutte le funzioni"}
            </Text>
            <Text className="text-white/90 text-sm mb-4">
              Mappe offline, multi-cane, statistiche avanzate, alert veterinario.
            </Text>
            {!premium ? (
              <TouchableOpacity
                onPress={() =>
                  Alert.alert(
                    "Premium €3.99/mese",
                    "L'integrazione di pagamento richiede chiavi Lemon Squeezy. Per ora abilitiamo Premium localmente per il demo.",
                    [
                      { text: "Annulla", style: "cancel" },
                      { text: "Attiva (demo)", onPress: () => togglePremium(true) },
                    ]
                  )
                }
                className="bg-white rounded-full py-3 items-center"
              >
                <Text className="text-primary font-bold">Diventa Premium • €3.99/mese</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => togglePremium(false)}
                className="bg-white/20 rounded-full py-3 items-center"
              >
                <Text className="text-white font-bold">Disattiva Premium (demo)</Text>
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
          </View>

          <View className="gap-3">
            <Text className="text-sm font-bold text-foreground">INFO</Text>
            <View className="bg-surface rounded-2xl p-4 border border-border">
              <Text className="text-xs text-muted">Versione</Text>
              <Text className="font-semibold text-foreground">1.0.0</Text>
            </View>
            <TouchableOpacity
              onPress={() => Linking.openURL("https://openstreetmap.org/copyright")}
              className="bg-surface rounded-2xl p-4 border border-border"
            >
              <Text className="font-semibold text-foreground">Mappe © OpenStreetMap</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

import { ScrollView, Text, View, TouchableOpacity, TextInput, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useState } from "react";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { Storage } from "@/lib/services/storage";

type Step = "welcome" | "dog-setup" | "location";

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [dogName, setDogName] = useState("");
  const [dogBreed, setDogBreed] = useState("");
  const [dogAge, setDogAge] = useState("");
  const [dogEnergy, setDogEnergy] = useState<"bassa" | "media" | "alta">("media");
  const [busy, setBusy] = useState(false);

  const finishOnboarding = async () => {
    setBusy(true);
    try {
      // Create first dog profile using new multi-profile storage
      await Storage.setDogProfiles([{
        name: dogName.trim() || "Il mio cane",
        breed: dogBreed.trim() || "Meticcio",
        age: dogAge.trim() || "—",
        energy: dogEnergy,
        avatarEmoji: "🐶",
      }]);
      await Storage.setOnboardingDone(true);
      router.replace("/(tabs)");
    } finally {
      setBusy(false);
    }
  };

  const handleLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permesso negato",
          "Senza la posizione non potrai usare il tracker. Puoi attivarla più tardi nelle impostazioni del telefono."
        );
      }
    } catch (e) {
      console.warn("[onboarding] location request failed", e);
    }
    await finishOnboarding();
  };

  const handleNext = () => {
    if (step === "welcome") setStep("dog-setup");
    else if (step === "dog-setup") setStep("location");
  };

  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 gap-6 justify-center">
          {step === "welcome" && (
            <View className="gap-6 items-center">
              <Text className="text-7xl">🐕</Text>
              <Text className="text-3xl font-bold text-primary text-center">
                Benvenuto in Passeggiata Furba
              </Text>
              <Text className="text-base text-muted text-center">
                Trova le passeggiate più belle, traccia i percorsi GPS e prenditi cura del tuo amico
                a quattro zampe.
              </Text>
              <TouchableOpacity
                onPress={handleNext}
                className="bg-primary rounded-full py-4 px-12 active:opacity-90"
              >
                <Text className="text-white font-bold text-base">Iniziamo</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === "dog-setup" && (
            <View className="gap-4">
              <Text className="text-2xl font-bold text-foreground">Parlami del tuo cane</Text>
              <Text className="text-sm text-muted mb-2">
                Useremo questi dati per personalizzare le passeggiate.
              </Text>

              <View>
                <Text className="text-xs font-semibold text-foreground mb-2">NOME</Text>
                <TextInput
                  value={dogName}
                  onChangeText={setDogName}
                  placeholder="Es. Luna"
                  className="bg-surface border border-border rounded-2xl px-4 py-3 text-foreground"
                  placeholderTextColor="#999"
                />
              </View>

              <View>
                <Text className="text-xs font-semibold text-foreground mb-2">RAZZA</Text>
                <TextInput
                  value={dogBreed}
                  onChangeText={setDogBreed}
                  placeholder="Es. Labrador"
                  className="bg-surface border border-border rounded-2xl px-4 py-3 text-foreground"
                  placeholderTextColor="#999"
                />
              </View>

              <View>
                <Text className="text-xs font-semibold text-foreground mb-2">ETÀ</Text>
                <TextInput
                  value={dogAge}
                  onChangeText={setDogAge}
                  placeholder="Es. 3 anni"
                  className="bg-surface border border-border rounded-2xl px-4 py-3 text-foreground"
                  placeholderTextColor="#999"
                />
              </View>

              <View>
                <Text className="text-xs font-semibold text-foreground mb-2">LIVELLO ENERGIA</Text>
                <View className="flex-row gap-2">
                  {(["bassa", "media", "alta"] as const).map((e) => (
                    <TouchableOpacity
                      key={e}
                      onPress={() => setDogEnergy(e)}
                      className={`flex-1 rounded-full py-3 items-center border-2 ${
                        dogEnergy === e ? "bg-primary border-primary" : "bg-surface border-border"
                      }`}
                    >
                      <Text
                        className={`font-semibold capitalize ${
                          dogEnergy === e ? "text-white" : "text-foreground"
                        }`}
                      >
                        {e}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                onPress={handleNext}
                className="bg-primary rounded-full py-4 items-center mt-4 active:opacity-90"
              >
                <Text className="text-white font-bold">Continua</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === "location" && (
            <View className="gap-6 items-center">
              <Text className="text-7xl">📍</Text>
              <Text className="text-2xl font-bold text-foreground text-center">
                Permetti la posizione
              </Text>
              <Text className="text-sm text-muted text-center">
                Servirà a tracciare le tue passeggiate e mostrarti i percorsi vicini. Puoi sempre
                modificarla nelle impostazioni del telefono.
              </Text>
              <TouchableOpacity
                disabled={busy}
                onPress={handleLocation}
                className="bg-primary rounded-full py-4 px-12 active:opacity-90"
              >
                <Text className="text-white font-bold">Permetti posizione</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={busy} onPress={finishOnboarding} className="py-2">
                <Text className="text-muted underline">Salta per ora</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

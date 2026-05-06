import { ScrollView, Text, View, TouchableOpacity, TextInput } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useState } from "react";
import { useRouter } from "expo-router";

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState<"welcome" | "dog-setup" | "location">("welcome");
  const [dogName, setDogName] = useState("");
  const [dogBreed, setDogBreed] = useState("");
  const [dogAge, setDogAge] = useState("");
  const [dogEnergy, setDogEnergy] = useState<"bassa" | "media" | "alta">("media");

  const handleNext = () => {
    if (step === "welcome") {
      setStep("dog-setup");
    } else if (step === "dog-setup") {
      setStep("location");
    } else {
      // Complete onboarding
      router.replace("/(tabs)");
    }
  };

  const handleSkip = () => {
    router.replace("/(tabs)");
  };

  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 justify-between">
          {/* Welcome Step */}
          {step === "welcome" && (
            <View className="flex-1 justify-center gap-6">
              <View className="items-center gap-4">
                <Text className="text-6xl">🐕</Text>
                <Text className="text-4xl font-bold text-foreground text-center">
                  Passeggiata Furba
                </Text>
                <Text className="text-lg text-muted text-center">
                  Scopri i migliori percorsi per il tuo cane
                </Text>
              </View>

              <View className="bg-surface rounded-2xl p-6 border border-border gap-3">
                <Text className="text-base font-semibold text-foreground mb-2">
                  Cosa ti aspetta:
                </Text>
                <View className="gap-2">
                  <Text className="text-sm text-muted">🗺️ Mappe personalizzate per il tuo cane</Text>
                  <Text className="text-sm text-muted">📊 Tracker passeggiate con statistiche</Text>
                  <Text className="text-sm text-muted">🏥 Reminder vaccini e salute</Text>
                  <Text className="text-sm text-muted">👥 Community e condivisione percorsi</Text>
                </View>
              </View>
            </View>
          )}

          {/* Dog Setup Step */}
          {step === "dog-setup" && (
            <View className="flex-1 justify-center gap-6">
              <Text className="text-3xl font-bold text-foreground">Profilo del tuo cane</Text>

              <View className="gap-4">
                <View>
                  <Text className="text-sm font-semibold text-foreground mb-2">Nome</Text>
                  <TextInput
                    placeholder="Es. Max"
                    value={dogName}
                    onChangeText={setDogName}
                    className="bg-surface border border-border rounded-lg p-3 text-foreground"
                  />
                </View>

                <View>
                  <Text className="text-sm font-semibold text-foreground mb-2">Razza</Text>
                  <TextInput
                    placeholder="Es. Golden Retriever"
                    value={dogBreed}
                    onChangeText={setDogBreed}
                    className="bg-surface border border-border rounded-lg p-3 text-foreground"
                  />
                </View>

                <View>
                  <Text className="text-sm font-semibold text-foreground mb-2">Età (anni)</Text>
                  <TextInput
                    placeholder="Es. 3"
                    value={dogAge}
                    onChangeText={setDogAge}
                    keyboardType="numeric"
                    className="bg-surface border border-border rounded-lg p-3 text-foreground"
                  />
                </View>

                <View>
                  <Text className="text-sm font-semibold text-foreground mb-2">Livello energia</Text>
                  <View className="flex-row gap-2">
                    {(["bassa", "media", "alta"] as const).map((level) => (
                      <TouchableOpacity
                        key={level}
                        onPress={() => setDogEnergy(level)}
                        className={`flex-1 rounded-lg p-3 items-center ${
                          dogEnergy === level ? "bg-primary" : "bg-surface border border-border"
                        }`}
                      >
                        <Text
                          className={`font-semibold ${
                            dogEnergy === level ? "text-white" : "text-foreground"
                          }`}
                        >
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Location Step */}
          {step === "location" && (
            <View className="flex-1 justify-center gap-6">
              <View className="items-center gap-4">
                <Text className="text-5xl">📍</Text>
                <Text className="text-3xl font-bold text-foreground text-center">
                  Accedi alla posizione
                </Text>
              </View>

              <View className="bg-surface rounded-2xl p-6 border border-border gap-3">
                <Text className="text-base font-semibold text-foreground mb-2">
                  Perché abbiamo bisogno della tua posizione:
                </Text>
                <View className="gap-2">
                  <Text className="text-sm text-muted">
                    🗺️ Mostrare percorsi vicino a te
                  </Text>
                  <Text className="text-sm text-muted">
                    📍 Tracciare le tue passeggiate
                  </Text>
                  <Text className="text-sm text-muted">
                    🔍 Scoprire zone sicure e aree con altri cani
                  </Text>
                </View>
              </View>

              <Text className="text-xs text-muted text-center">
                La tua privacy è importante. I tuoi dati non saranno mai condivisi senza il tuo consenso.
              </Text>
            </View>
          )}

          {/* Buttons */}
          <View className="gap-3 mt-6">
            <TouchableOpacity
              onPress={handleNext}
              className="bg-primary rounded-full py-3 items-center active:opacity-80"
            >
              <Text className="text-white font-semibold">
                {step === "location" ? "Inizia" : "Avanti"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSkip} className="py-3 items-center active:opacity-80">
              <Text className="text-muted font-semibold">Salta per ora</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

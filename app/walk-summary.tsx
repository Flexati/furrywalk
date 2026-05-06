import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";

export default function WalkSummaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");

  const distance = parseFloat(params.distance as string) || 0;
  const time = parseInt(params.time as string) || 0;
  const photos = params.photos ? JSON.parse(params.photos as string) : { before: false, after: false };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const handleSave = () => {
    // Save walk data to AsyncStorage
    const walkData = {
      id: Date.now(),
      distance,
      time,
      rating,
      notes,
      photos,
      timestamp: new Date().toISOString(),
    };
    console.log("Saving walk:", walkData);
    router.replace("/(tabs)");
  };

  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 gap-6">
          {/* Header */}
          <View className="items-center gap-2">
            <Text className="text-5xl">🎉</Text>
            <Text className="text-3xl font-bold text-foreground">Passeggiata completata!</Text>
            <Text className="text-sm text-muted">Fantastico lavoro!</Text>
          </View>

          {/* Stats Summary */}
          <View className="bg-surface rounded-2xl p-6 border border-border gap-4">
            <View className="flex-row justify-between">
              <View className="flex-1 items-center">
                <Text className="text-xs text-muted mb-2">Distanza</Text>
                <Text className="text-3xl font-bold text-primary">{distance.toFixed(2)}</Text>
                <Text className="text-xs text-muted">km</Text>
              </View>
              <View className="w-px bg-border" />
              <View className="flex-1 items-center">
                <Text className="text-xs text-muted mb-2">Tempo</Text>
                <Text className="text-3xl font-bold text-primary">{formatTime(time)}</Text>
              </View>
              <View className="w-px bg-border" />
              <View className="flex-1 items-center">
                <Text className="text-xs text-muted mb-2">Calorie</Text>
                <Text className="text-3xl font-bold text-primary">{Math.round(distance * 50)}</Text>
              </View>
            </View>
          </View>

          {/* Photos Status */}
          <View className="bg-surface rounded-2xl p-4 border border-border gap-3">
            <Text className="font-semibold text-foreground">Foto del cane</Text>
            <View className="flex-row gap-3">
              <View className="flex-1 items-center p-3 bg-background rounded-lg">
                <Text className="text-2xl mb-1">{photos.before ? "📸" : "❌"}</Text>
                <Text className="text-xs text-muted">Prima</Text>
              </View>
              <View className="flex-1 items-center p-3 bg-background rounded-lg">
                <Text className="text-2xl mb-1">{photos.after ? "📸" : "❌"}</Text>
                <Text className="text-xs text-muted">Dopo</Text>
              </View>
            </View>
          </View>

          {/* Rating */}
          <View className="bg-surface rounded-2xl p-4 border border-border gap-3">
            <Text className="font-semibold text-foreground">Come è stata la passeggiata?</Text>
            <View className="flex-row justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  className="active:opacity-80"
                >
                  <Text className="text-3xl">{star <= rating ? "⭐" : "☆"}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Stats Card */}
          <View className="bg-primary/10 rounded-2xl p-4 border border-primary gap-2">
            <Text className="text-sm font-semibold text-primary">📊 Statistiche aggiornate</Text>
            <Text className="text-xs text-foreground">
              Hai completato {distance.toFixed(1)} km in questa passeggiata. Continua così! 🐕
            </Text>
          </View>

          {/* Buttons */}
          <View className="gap-3 mt-6">
            <TouchableOpacity
              onPress={handleSave}
              className="bg-primary rounded-full py-3 items-center active:opacity-80"
            >
              <Text className="text-white font-semibold">Salva Passeggiata</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.replace("/(tabs)")}
              className="bg-surface border border-border rounded-full py-3 items-center active:opacity-80"
            >
              <Text className="text-foreground font-semibold">Torna a Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

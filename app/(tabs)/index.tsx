import { ScrollView, Text, View, TouchableOpacity, RefreshControl } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import { Storage, type DogProfile, type WalkRecord } from "@/lib/services/storage";

interface FeaturedWalk {
  id: string;
  name: string;
  emoji: string;
  km: number;
  minutes: number;
  rating: number;
  features: string;
}

const FEATURED: FeaturedWalk = {
  id: "parco-verde",
  name: "Parco Verde",
  emoji: "🌳",
  km: 2.5,
  minutes: 35,
  rating: 4.9,
  features: "💧 Fontanella • ☀️ Ombra • 🐕 Pochi cani",
};

const NEARBY: FeaturedWalk[] = [
  { id: "bosco", name: "Sentiero del Bosco", emoji: "🌲", km: 3.2, minutes: 45, rating: 4.8, features: "" },
  { id: "lago", name: "Lungolago Tranquillo", emoji: "💧", km: 1.8, minutes: 25, rating: 4.9, features: "" },
  { id: "collina", name: "Collina Verde", emoji: "⛰️", km: 4.1, minutes: 60, rating: 4.6, features: "" },
];

export default function HomeScreen() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [dog, setDog] = useState<DogProfile | null>(null);
  const [walks, setWalks] = useState<WalkRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const done = await Storage.getOnboardingDone();
    if (!done) {
      router.replace("/onboarding");
      return;
    }
    const [d, w] = await Promise.all([Storage.getDogProfile(), Storage.getWalks()]);
    setDog(d);
    setWalks(w);
    setChecking(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (checking) {
    return (
      <ScreenContainer className="p-6">
        <View className="flex-1 items-center justify-center">
          <Text className="text-base text-muted">Caricamento...</Text>
        </View>
      </ScreenContainer>
    );
  }

  const totalKm = walks.reduce((s, w) => s + (w.distanceKm || 0), 0);

  return (
    <ScreenContainer className="p-6">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="flex-1 gap-6">
          <View className="gap-1">
            <Text className="text-3xl font-bold text-primary">🐕 Passeggiata Furba</Text>
            <Text className="text-sm text-muted">
              {dog
                ? `Ciao ${dog.name}! Pronto per una passeggiata?`
                : "Scopri i migliori percorsi per il tuo cane"}
            </Text>
          </View>

          {walks.length > 0 && (
            <View className="bg-surface rounded-2xl p-4 border border-border flex-row gap-6">
              <View className="flex-1">
                <Text className="text-xs text-muted">Passeggiate totali</Text>
                <Text className="text-2xl font-bold text-foreground">{walks.length}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs text-muted">Distanza totale</Text>
                <Text className="text-2xl font-bold text-foreground">{totalKm.toFixed(1)} km</Text>
              </View>
            </View>
          )}

          <View className="bg-primary rounded-3xl p-6">
            <View className="flex-row justify-between items-start mb-4">
              <View className="flex-1">
                <Text className="text-white text-xs font-bold mb-1">CONSIGLIATA PER TE</Text>
                <Text className="text-white text-2xl font-bold">{FEATURED.name}</Text>
              </View>
              <Text className="text-4xl">{FEATURED.emoji}</Text>
            </View>
            <View className="gap-2 mb-4">
              <View className="flex-row gap-3">
                <Text className="text-white text-sm font-semibold">📏 {FEATURED.km} km</Text>
                <Text className="text-white text-sm font-semibold">⏱️ {FEATURED.minutes} min</Text>
                <Text className="text-white text-sm font-semibold">⭐ {FEATURED.rating}</Text>
              </View>
              <Text className="text-white/90 text-xs">{FEATURED.features}</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/walk-tracker")}
              className="bg-white rounded-full py-3 items-center active:opacity-90"
            >
              <Text className="text-primary font-bold">Inizia Tracker</Text>
            </TouchableOpacity>
          </View>

          <View className="gap-3">
            <Text className="text-sm font-bold text-foreground">FILTRA PASSEGGIATE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {["☀️ Ombra", "💧 Fontanella", "🐕 Pochi cani", "🛡️ Sicuro"].map((f) => (
                  <View
                    key={f}
                    className="bg-primary/10 border border-primary rounded-full px-4 py-2"
                  >
                    <Text className="text-sm text-primary font-semibold">{f}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>

          <View className="gap-3">
            <Text className="text-sm font-bold text-foreground">PASSEGGIATE VICINO A TE</Text>
            {NEARBY.map((w) => (
              <TouchableOpacity
                key={w.id}
                onPress={() => router.push("/map-view")}
                className="bg-surface rounded-2xl p-4 border-2 border-primary/30 active:border-primary active:bg-primary/5"
              >
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1">
                    <Text className="text-base font-bold text-foreground mb-1">
                      {w.emoji} {w.name}
                    </Text>
                    <Text className="text-xs text-muted">
                      {w.km} km • {w.minutes} min
                    </Text>
                  </View>
                  <Text className="text-lg font-bold text-primary">{w.rating}⭐</Text>
                </View>
                <View className="h-2 bg-primary/20 rounded-full overflow-hidden">
                  <View
                    className="h-full bg-primary"
                    style={{ width: `${Math.round((w.rating / 5) * 100)}%` }}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {walks.length > 0 && (
            <View className="gap-3">
              <Text className="text-sm font-bold text-foreground">ULTIME PASSEGGIATE</Text>
              {walks.slice(0, 3).map((w) => (
                <View key={w.id} className="bg-surface rounded-2xl p-4 border border-border">
                  <View className="flex-row justify-between items-center">
                    <Text className="font-semibold text-foreground">
                      {new Date(w.startedAt).toLocaleDateString("it-IT")}
                    </Text>
                    <Text className="text-primary font-bold">{w.distanceKm.toFixed(2)} km</Text>
                  </View>
                  <Text className="text-xs text-muted mt-1">
                    {Math.floor(w.durationSec / 60)} min • {w.caloriesKcal} kcal • {"⭐".repeat(w.rating)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

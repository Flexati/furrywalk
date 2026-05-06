import { ScrollView, Text, View, TouchableOpacity, Pressable } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useState } from "react";

interface Walk {
  id: string;
  name: string;
  distance: number;
  rating: number;
  frequency: number;
  breed?: string;
  energy?: "bassa" | "media" | "alta";
}

export default function MapViewScreen() {
  const [filterBreed, setFilterBreed] = useState<string | null>(null);
  const [filterEnergy, setFilterEnergy] = useState<"bassa" | "media" | "alta" | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(true);

  const walks: Walk[] = [
    {
      id: "1",
      name: "Parco Centrale",
      distance: 3.2,
      rating: 4.9,
      frequency: 156,
      breed: "Tutte",
      energy: "media",
    },
    {
      id: "2",
      name: "Bosco Naturale",
      distance: 5.1,
      rating: 4.7,
      frequency: 89,
      breed: "Tutte",
      energy: "alta",
    },
    {
      id: "3",
      name: "Lungolago Tranquillo",
      distance: 1.8,
      rating: 4.8,
      frequency: 124,
      breed: "Piccoli",
      energy: "bassa",
    },
    {
      id: "4",
      name: "Sentiero del Bosco",
      distance: 4.5,
      rating: 4.6,
      frequency: 78,
      breed: "Grandi",
      energy: "alta",
    },
  ];

  const filteredWalks = walks.filter((walk) => {
    if (filterBreed && walk.breed !== filterBreed && walk.breed !== "Tutte") return false;
    if (filterEnergy && walk.energy !== filterEnergy) return false;
    return true;
  });

  const getHeatmapIntensity = (frequency: number) => {
    const maxFreq = Math.max(...walks.map((w) => w.frequency));
    const intensity = (frequency / maxFreq) * 100;
    return intensity;
  };

  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 gap-6">
          <Text className="text-3xl font-bold text-foreground">Mappa Passeggiate</Text>

          {/* Map Placeholder with Heatmap */}
          <View className="bg-surface rounded-2xl h-48 border border-border overflow-hidden">
            <View className="flex-1 items-center justify-center bg-gradient-to-b from-primary/10 to-primary/30 relative">
              <Text className="text-5xl mb-2">🗺️</Text>
              <Text className="text-xs text-muted">Mappa interattiva con heatmap</Text>

              {/* Heatmap Visualization */}
              {showHeatmap && (
                <View className="absolute inset-0 opacity-40">
                  <View className="flex-1 flex-row">
                    <View className="flex-1 bg-blue-300" />
                    <View className="flex-1 bg-green-400" />
                    <View className="flex-1 bg-yellow-400" />
                    <View className="flex-1 bg-red-400" />
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Filters */}
          <View className="gap-3">
            <Text className="font-semibold text-foreground">Filtri</Text>

            <View>
              <Text className="text-xs text-muted mb-2">Taglia cane</Text>
              <View className="flex-row gap-2">
                {["Piccoli", "Medi", "Grandi"].map((breed) => (
                  <Pressable
                    key={breed}
                    onPress={() => setFilterBreed(filterBreed === breed ? null : breed)}
                    className={`flex-1 rounded-lg p-2 items-center ${
                      filterBreed === breed ? "bg-primary" : "bg-surface border border-border"
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        filterBreed === breed ? "text-white" : "text-foreground"
                      }`}
                    >
                      {breed}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View>
              <Text className="text-xs text-muted mb-2">Energia</Text>
              <View className="flex-row gap-2">
                {(["bassa", "media", "alta"] as const).map((energy) => (
                  <Pressable
                    key={energy}
                    onPress={() => setFilterEnergy(filterEnergy === energy ? null : energy)}
                    className={`flex-1 rounded-lg p-2 items-center ${
                      filterEnergy === energy ? "bg-primary" : "bg-surface border border-border"
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        filterEnergy === energy ? "text-white" : "text-foreground"
                      }`}
                    >
                      {energy.charAt(0).toUpperCase() + energy.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable
              onPress={() => setShowHeatmap(!showHeatmap)}
              className="bg-surface rounded-lg p-3 border border-border flex-row justify-between items-center"
            >
              <Text className="text-sm font-semibold text-foreground">Mostra Heatmap</Text>
              <Text className="text-lg">{showHeatmap ? "✓" : "○"}</Text>
            </Pressable>
          </View>

          {/* Walks List */}
          <View className="gap-3">
            <Text className="font-semibold text-foreground">
              Passeggiate ({filteredWalks.length})
            </Text>

            {filteredWalks.map((walk) => (
              <View key={walk.id} className="bg-surface rounded-2xl p-4 border border-border">
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground mb-1">{walk.name}</Text>
                    <Text className="text-xs text-muted">
                      {walk.distance} km • ⭐ {walk.rating}
                    </Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-xs text-muted">Frequenza</Text>
                    <Text className="text-lg font-bold text-primary">{walk.frequency}</Text>
                  </View>
                </View>

                {/* Heatmap Bar */}
                <View className="h-2 bg-border rounded-full overflow-hidden">
                  <View
                    className="h-full bg-primary"
                    style={{ width: `${getHeatmapIntensity(walk.frequency)}%` }}
                  />
                </View>

                <TouchableOpacity className="mt-3 bg-primary rounded-lg py-2 items-center active:opacity-80">
                  <Text className="text-white text-sm font-semibold">Visualizza Percorso</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

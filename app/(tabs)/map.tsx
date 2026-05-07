import { Text, View, TouchableOpacity, ScrollView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { LeafletMap, type MapMarker, type MapPoint } from "@/components/leaflet-map";
import { useEffect, useState } from "react";
import { getCurrentLocation } from "@/lib/services/gps-service";

const FALLBACK_CENTER: MapPoint = { latitude: 41.9028, longitude: 12.4964 };

const MOCK_WALKS: { id: string; name: string; emoji: string; rating: number; freq: number; coord: MapPoint }[] = [
  { id: "parco-centrale", name: "Parco Centrale", emoji: "🌳", rating: 4.9, freq: 156, coord: { latitude: 41.9105, longitude: 12.4823 } },
  { id: "bosco", name: "Bosco Naturale", emoji: "🌲", rating: 4.7, freq: 89, coord: { latitude: 41.8987, longitude: 12.5121 } },
  { id: "lago", name: "Lungolago", emoji: "💧", rating: 4.9, freq: 134, coord: { latitude: 41.9211, longitude: 12.4694 } },
  { id: "collina", name: "Collina Verde", emoji: "⛰️", rating: 4.6, freq: 67, coord: { latitude: 41.8821, longitude: 12.4901 } },
];

function generateHeatmapAround(center: MapPoint, n: number): MapPoint[] {
  const pts: MapPoint[] = [];
  for (let i = 0; i < n; i++) {
    const dx = (Math.random() - 0.5) * 0.04;
    const dy = (Math.random() - 0.5) * 0.04;
    pts.push({ latitude: center.latitude + dx, longitude: center.longitude + dy });
  }
  return pts;
}

export default function MapScreen() {
  const [center, setCenter] = useState<MapPoint>(FALLBACK_CENTER);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [filter, setFilter] = useState<"all" | "high" | "popular">("all");

  useEffect(() => {
    (async () => {
      const loc = await getCurrentLocation();
      if (loc) setCenter({ latitude: loc.latitude, longitude: loc.longitude });
    })();
  }, []);

  const filtered = MOCK_WALKS.filter((w) => {
    if (filter === "high") return w.rating >= 4.8;
    if (filter === "popular") return w.freq >= 100;
    return true;
  });

  const markers: MapMarker[] = filtered.map((w) => ({
    id: w.id,
    latitude: w.coord.latitude,
    longitude: w.coord.longitude,
    title: `${w.name} • ⭐ ${w.rating}`,
    emoji: w.emoji,
  }));

  const heatmap = showHeatmap ? generateHeatmapAround(center, 60) : [];

  return (
    <ScreenContainer className="p-4">
      <View className="flex-1 gap-3">
        <Text className="text-2xl font-bold text-foreground px-2">Mappa</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-2">
          <View className="flex-row gap-2">
            {[
              { k: "all", l: "Tutti" },
              { k: "high", l: "⭐ 4.8+" },
              { k: "popular", l: "🔥 Popolari" },
            ].map((f) => (
              <TouchableOpacity
                key={f.k}
                onPress={() => setFilter(f.k as any)}
                className={`rounded-full px-4 py-2 border ${
                  filter === f.k ? "bg-primary border-primary" : "bg-surface border-border"
                }`}
              >
                <Text className={filter === f.k ? "text-white font-semibold" : "text-foreground"}>
                  {f.l}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setShowHeatmap((s) => !s)}
              className={`rounded-full px-4 py-2 border ${
                showHeatmap ? "bg-warning border-warning" : "bg-surface border-border"
              }`}
            >
              <Text className={showHeatmap ? "text-white font-semibold" : "text-foreground"}>
                🔥 Heatmap
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View className="flex-1 mx-2 rounded-2xl overflow-hidden" style={{ minHeight: 320 }}>
          <LeafletMap center={center} zoom={13} markers={markers} heatmap={heatmap} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-2">
          <View className="flex-row gap-3 pb-2">
            {filtered.map((w) => (
              <View
                key={w.id}
                className="bg-surface rounded-2xl p-4 border border-border"
                style={{ width: 200 }}
              >
                <Text className="font-bold text-foreground">
                  {w.emoji} {w.name}
                </Text>
                <Text className="text-xs text-muted mt-1">
                  ⭐ {w.rating} • {w.freq} passeggiate
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

import { Text, View, TouchableOpacity, ScrollView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";
import { LeafletMap, type MapMarker, type MapPoint } from "@/components/leaflet-map";
import { useEffect, useState } from "react";
import { getCurrentLocation } from "@/lib/services/gps-service";
import { useRouter } from "expo-router";
import { useSubscription } from "@/hooks/use-subscription";

const FALLBACK_CENTER: MapPoint = { latitude: 41.9028, longitude: 12.4964 };

const MOCK_WALKS: { id: string; name: string; emoji: string; rating: number; freq: number; coord: MapPoint }[] = [
  { id: "parco-centrale", name: "Parco Centrale", emoji: "🌳", rating: 4.9, freq: 156, coord: { latitude: 41.9105, longitude: 12.4823 } },
  { id: "bosco", name: "Bosco Naturale", emoji: "🌲", rating: 4.7, freq: 89, coord: { latitude: 41.8987, longitude: 12.5121 } },
  { id: "lago", name: "Lungolago", emoji: "💧", rating: 4.9, freq: 134, coord: { latitude: 41.9211, longitude: 12.4694 } },
  { id: "collina", name: "Collina Verde", emoji: "⛰️", rating: 4.6, freq: 67, coord: { latitude: 41.8821, longitude: 12.4901 } },
];

// --- Offline map persistence (FASE 2) ---
// Stored via AsyncStorage (same layer the app's Storage wrapper uses).
// Scope is intentionally limited to this file per the FASE-2 constraint.
const OFFLINE_MAP_KEY = "pf:offline_map";

export interface OfflineMapArea {
  center: MapPoint;
  zoom: number;
  savedAt: string;
}

async function getOfflineMap(): Promise<OfflineMapArea | null> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_MAP_KEY);
    return raw ? (JSON.parse(raw) as OfflineMapArea) : null;
  } catch (e) {
    console.warn("[map] getOfflineMap failed", e);
    return null;
  }
}

async function saveOfflineMap(area: OfflineMapArea): Promise<void> {
  try {
    await AsyncStorage.setItem(OFFLINE_MAP_KEY, JSON.stringify(area));
  } catch (e) {
    console.warn("[map] saveOfflineMap failed", e);
  }
}

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
  const router = useRouter();
  const { isPro, status, isLoading } = useSubscription();
  const hasPremiumAccess = isPro || status === "on_trial";

  const [center, setCenter] = useState<MapPoint>(FALLBACK_CENTER);
  const [zoom, setZoom] = useState(13);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [filter, setFilter] = useState<"all" | "high" | "popular">("all");
  const [offlineArea, setOfflineArea] = useState<OfflineMapArea | null>(null);

  useEffect(() => {
    (async () => {
      // Restore a previously downloaded offline area on open.
      const cached = await getOfflineMap();
      if (cached) {
        setOfflineArea(cached);
        setCenter(cached.center);
        setZoom(cached.zoom);
        return;
      }
      const loc = await getCurrentLocation();
      if (loc) setCenter({ latitude: loc.latitude, longitude: loc.longitude });
    })();
  }, []);

  const handleDownloadOffline = async () => {
    const area: OfflineMapArea = {
      center,
      zoom,
      savedAt: new Date().toISOString(),
    };
    await saveOfflineMap(area);
    setOfflineArea(area);
  };

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
          <LeafletMap center={center} zoom={zoom} markers={markers} heatmap={heatmap} />
        </View>

        {/* Premium-gated offline maps (FASE 2) */}
        {isLoading ? null : hasPremiumAccess ? (
          <View className="mx-2 flex-row items-center gap-2">
            <TouchableOpacity
              onPress={handleDownloadOffline}
              className="flex-1 bg-primary rounded-2xl py-3 items-center"
              accessibilityRole="button"
              accessibilityLabel="Scarica mappa offline"
            >
              <Text className="text-white font-bold">📥 Scarica mappa offline</Text>
            </TouchableOpacity>
            {offlineArea && (
              <View className="bg-surface rounded-full px-3 py-3 border border-border">
                <Text className="text-foreground text-xs font-semibold">✓ Mappa offline pronta</Text>
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => router.push("/paywall")}
            className="mx-2 bg-surface rounded-2xl p-4 border border-border"
            accessibilityRole="button"
            accessibilityLabel="Sblocca Mappe offline con Premium"
          >
            <Text className="font-bold text-foreground text-lg">🗺️ Mappe offline</Text>
            <Text className="text-sm text-muted mt-1">
              Scarica le aree e usale anche senza connessione. Funzione Premium.
            </Text>
            <View className="mt-3 bg-primary rounded-full py-2 items-center">
              <Text className="text-white font-bold">Sblocca con Premium</Text>
            </View>
          </TouchableOpacity>
        )}

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

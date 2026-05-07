import { Text, View, TouchableOpacity, Alert, Image, ScrollView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { useGPSTracking, getCurrentLocation } from "@/lib/services/gps-service";
import { LeafletMap, type MapPoint } from "@/components/leaflet-map";
import * as ImagePicker from "expo-image-picker";
import { Storage } from "@/lib/services/storage";

export default function WalkTrackerScreen() {
  const router = useRouter();
  const { stats, isTracking, startTracking, stopTracking } = useGPSTracking();
  const [center, setCenter] = useState<MapPoint>({ latitude: 41.9028, longitude: 12.4964 });
  const [tickSec, setTickSec] = useState(0);
  const [photoBefore, setPhotoBefore] = useState<string | null>(null);
  const [photoAfter, setPhotoAfter] = useState<string | null>(null);
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    (async () => {
      const loc = await getCurrentLocation();
      if (loc) setCenter({ latitude: loc.latitude, longitude: loc.longitude });
    })();
  }, []);

  useEffect(() => {
    if (!isTracking) return;
    const id = setInterval(() => setTickSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isTracking]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleStart = async () => {
    const ok = await startTracking();
    if (!ok) {
      Alert.alert("Posizione negata", "Attiva i permessi di localizzazione per iniziare la passeggiata.");
      return;
    }
    startedAtRef.current = Date.now();
    setTickSec(0);
  };

  const takePhoto = async (slot: "before" | "after") => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Fotocamera negata", "Attiva i permessi della fotocamera nelle impostazioni.");
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ quality: 0.6, base64: false });
      if (!res.canceled && res.assets[0]) {
        const uri = res.assets[0].uri;
        if (slot === "before") setPhotoBefore(uri);
        else setPhotoAfter(uri);
      }
    } catch (e) {
      console.warn("[walk-tracker] camera error", e);
      Alert.alert("Errore fotocamera", String(e));
    }
  };

  const handleStop = async () => {
    const final = stopTracking();
    const dog = await Storage.getDogProfile();
    const weightKg = dog?.weightKg ?? 15;
    const calories = Math.round(weightKg * final.distance * 1.2);
    const startedAt = startedAtRef.current || Date.now() - tickSec * 1000;
    const endedAt = Date.now();

    router.replace({
      pathname: "/walk-summary",
      params: {
        distance: final.distance.toFixed(2),
        time: String(Math.round(final.duration || tickSec)),
        calories: String(calories),
        startedAt: String(startedAt),
        endedAt: String(endedAt),
        photoBefore: photoBefore ?? "",
        photoAfter: photoAfter ?? "",
        path: JSON.stringify(
          final.locations.map((p) => ({
            latitude: p.latitude,
            longitude: p.longitude,
            timestamp: p.timestamp,
          }))
        ),
      },
    });
  };

  const polyline: MapPoint[] = stats.locations.map((p) => ({
    latitude: p.latitude,
    longitude: p.longitude,
  }));
  const liveCenter = polyline.length > 0 ? polyline[polyline.length - 1] : center;
  const elapsed = isTracking ? Math.max(stats.duration, tickSec) : 0;

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 gap-4">
          <View className="px-2 pt-2">
            <Text className="text-2xl font-bold text-foreground">Passeggiata in corso</Text>
            <Text className="text-sm text-muted">
              {isTracking ? "Tracking GPS attivo" : "Premi Inizia per iniziare"}
            </Text>
          </View>

          <View className="rounded-2xl overflow-hidden mx-2" style={{ height: 280 }}>
            <LeafletMap
              center={liveCenter}
              zoom={17}
              polyline={polyline}
              followPolyline
              markers={
                polyline.length > 0
                  ? [
                      {
                        id: "current",
                        latitude: liveCenter.latitude,
                        longitude: liveCenter.longitude,
                        emoji: "🐕",
                        title: "Sei qui",
                      },
                    ]
                  : []
              }
            />
          </View>

          <View className="bg-surface rounded-2xl p-5 border border-border mx-2">
            <View className="flex-row justify-between">
              <View className="items-center flex-1">
                <Text className="text-xs text-muted mb-1">Tempo</Text>
                <Text className="text-2xl font-bold text-primary">{formatTime(elapsed)}</Text>
              </View>
              <View className="items-center flex-1">
                <Text className="text-xs text-muted mb-1">Distanza</Text>
                <Text className="text-2xl font-bold text-primary">
                  {stats.distance.toFixed(2)} km
                </Text>
              </View>
              <View className="items-center flex-1">
                <Text className="text-xs text-muted mb-1">Velocità</Text>
                <Text className="text-2xl font-bold text-primary">
                  {stats.avgSpeed.toFixed(1)} km/h
                </Text>
              </View>
            </View>
          </View>

          <View className="flex-row gap-3 mx-2">
            <TouchableOpacity
              onPress={() => takePhoto("before")}
              className="flex-1 bg-surface rounded-2xl border border-border h-28 items-center justify-center overflow-hidden"
            >
              {photoBefore ? (
                <Image source={{ uri: photoBefore }} style={{ width: "100%", height: "100%" }} />
              ) : (
                <>
                  <Text className="text-3xl">📷</Text>
                  <Text className="text-xs text-muted mt-1">Prima</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => takePhoto("after")}
              className="flex-1 bg-surface rounded-2xl border border-border h-28 items-center justify-center overflow-hidden"
            >
              {photoAfter ? (
                <Image source={{ uri: photoAfter }} style={{ width: "100%", height: "100%" }} />
              ) : (
                <>
                  <Text className="text-3xl">📷</Text>
                  <Text className="text-xs text-muted mt-1">Dopo</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View className="gap-3 mx-2 mt-2 mb-4">
            {!isTracking ? (
              <TouchableOpacity
                onPress={handleStart}
                className="bg-primary rounded-full py-4 items-center active:opacity-90"
              >
                <Text className="text-white font-bold text-base">▶ Inizia passeggiata</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleStop}
                className="bg-error rounded-full py-4 items-center active:opacity-90"
              >
                <Text className="text-white font-bold text-base">■ Termina passeggiata</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => router.back()}
              className="rounded-full py-3 items-center border border-border active:opacity-80"
            >
              <Text className="text-foreground font-semibold">Annulla</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

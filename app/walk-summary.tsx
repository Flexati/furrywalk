import { ScrollView, Text, View, TouchableOpacity, TextInput, Image } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useMemo } from "react";
import { Storage, type WalkRecord } from "@/lib/services/storage";
import { LeafletMap, type MapPoint } from "@/components/leaflet-map";

export default function WalkSummaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);

  const distance = parseFloat((params.distance as string) || "0") || 0;
  const time = parseInt((params.time as string) || "0") || 0;
  const calories = parseInt((params.calories as string) || "0") || 0;
  const startedAt = parseInt((params.startedAt as string) || "0") || Date.now();
  const endedAt = parseInt((params.endedAt as string) || "0") || Date.now();
  const photoBefore = (params.photoBefore as string) || "";
  const photoAfter = (params.photoAfter as string) || "";

  const path = useMemo<MapPoint[]>(() => {
    try {
      const raw = (params.path as string) || "[]";
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr.map((p: any) => ({ latitude: p.latitude, longitude: p.longitude }));
    } catch {
      return [];
    }
  }, [params.path]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  const handleSave = async () => {
    let pathArr: WalkRecord["path"] = [];
    try {
      pathArr = JSON.parse((params.path as string) || "[]");
    } catch {}
    const record: WalkRecord = {
      id: Date.now(),
      startedAt,
      endedAt,
      distanceKm: distance,
      durationSec: time,
      caloriesKcal: calories,
      rating: rating || 5,
      notes,
      photos: { before: photoBefore || undefined, after: photoAfter || undefined },
      path: pathArr,
    };
    await Storage.addWalk(record);
    setSaved(true);
    router.replace("/(tabs)");
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}>
        <View className="flex-1 gap-4">
          <View className="px-2 pt-2">
            <Text className="text-3xl font-bold text-foreground">Riepilogo</Text>
            <Text className="text-sm text-muted">
              {new Date(startedAt).toLocaleString("it-IT")}
            </Text>
          </View>

          {path.length > 1 && (
            <View className="rounded-2xl overflow-hidden mx-2" style={{ height: 220 }}>
              <LeafletMap polyline={path} followPolyline center={path[0]} zoom={15} />
            </View>
          )}

          <View className="bg-surface rounded-2xl p-5 border border-border mx-2">
            <View className="flex-row justify-between">
              <View className="items-center flex-1">
                <Text className="text-xs text-muted">Distanza</Text>
                <Text className="text-2xl font-bold text-primary">{distance.toFixed(2)} km</Text>
              </View>
              <View className="items-center flex-1">
                <Text className="text-xs text-muted">Tempo</Text>
                <Text className="text-2xl font-bold text-primary">{formatTime(time)}</Text>
              </View>
              <View className="items-center flex-1">
                <Text className="text-xs text-muted">Calorie</Text>
                <Text className="text-2xl font-bold text-primary">{calories}</Text>
              </View>
            </View>
          </View>

          {(photoBefore || photoAfter) && (
            <View className="flex-row gap-3 mx-2">
              {photoBefore ? (
                <Image
                  source={{ uri: photoBefore }}
                  style={{ flex: 1, height: 120, borderRadius: 16 }}
                />
              ) : null}
              {photoAfter ? (
                <Image
                  source={{ uri: photoAfter }}
                  style={{ flex: 1, height: 120, borderRadius: 16 }}
                />
              ) : null}
            </View>
          )}

          <View className="bg-surface rounded-2xl p-5 border border-border mx-2 gap-3">
            <Text className="font-semibold text-foreground">Com'è andata?</Text>
            <View className="flex-row gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setRating(n)}>
                  <Text className="text-3xl">{n <= rating ? "⭐" : "☆"}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Note (opzionale)"
              multiline
              className="bg-background border border-border rounded-2xl p-3 text-foreground"
              style={{ minHeight: 80 }}
              placeholderTextColor="#999"
            />
          </View>

          <View className="gap-3 mx-2">
            <TouchableOpacity
              disabled={saved}
              onPress={handleSave}
              className="bg-primary rounded-full py-4 items-center active:opacity-90"
            >
              <Text className="text-white font-bold">{saved ? "Salvata ✓" : "Salva passeggiata"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.replace("/(tabs)")}
              className="rounded-full py-3 items-center border border-border"
            >
              <Text className="text-foreground font-semibold">Scarta</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

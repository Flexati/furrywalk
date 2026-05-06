import { ScrollView, Text, View, TouchableOpacity, Pressable } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { useGPSTracking } from "@/lib/services/gps-service";
import { usePhotoService } from "@/lib/services/photo-service";

export default function WalkTrackerScreen() {
  const router = useRouter();
  const { stats, isTracking: gpsTracking, startTracking, stopTracking } = useGPSTracking();
  const { takePhoto } = usePhotoService();
  const [isTracking, setIsTracking] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [distance, setDistance] = useState(0);
  const [photos, setPhotos] = useState<{ before: boolean; after: boolean }>({
    before: false,
    after: false,
  });

  useEffect(() => {
    if (gpsTracking) {
      setDistance(stats.distance);
      setElapsedTime(Math.round(stats.duration));
    }
  }, [stats, gpsTracking]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isTracking && !gpsTracking) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
        setDistance((prev) => prev + 0.05); // Simulated distance
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking, gpsTracking]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleTakePhoto = async (type: "before" | "after") => {
    const photo = await takePhoto();
    if (photo) {
      setPhotos((prev) => ({ ...prev, [type]: true }));
      console.log(`Photo ${type} taken:`, photo.fileName);
    }
  };

  const handleStop = () => {
    setIsTracking(false);
    router.push({
      pathname: "/(tabs)" as any,
      params: {
        distance: distance.toFixed(2),
        time: String(elapsedTime),
        photos: JSON.stringify(photos),
      },
    });
    // TODO: Implement walk-summary screen
  };

  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 gap-6">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">Passeggiata in corso</Text>
            <Text className="text-sm text-muted">Parco Verde</Text>
          </View>

          {/* Map Placeholder */}
          <View className="bg-surface rounded-2xl h-40 border border-border items-center justify-center">
            <Text className="text-4xl mb-2">🗺️</Text>
            <Text className="text-sm text-muted">Mappa live tracking</Text>
          </View>

          {/* Stats */}
          <View className="bg-surface rounded-2xl p-5 border border-border gap-4">
            <View className="flex-row justify-between">
              <View>
                <Text className="text-xs text-muted mb-1">Tempo</Text>
                <Text className="text-2xl font-bold text-primary">{formatTime(elapsedTime)}</Text>
              </View>
              <View>
                <Text className="text-xs text-muted mb-1">Distanza</Text>
                <Text className="text-2xl font-bold text-primary">{distance.toFixed(2)} km</Text>
              </View>
              <View>
                <Text className="text-xs text-muted mb-1">Calorie</Text>
                <Text className="text-2xl font-bold text-primary">{Math.round(distance * 50)}</Text>
              </View>
            </View>
          </View>

          {/* Photos */}
          <View className="gap-3">
            <Text className="font-semibold text-foreground">Foto del cane</Text>

            <Pressable
              onPress={() => handleTakePhoto("before")}
              className="bg-surface rounded-2xl p-6 border border-border items-center justify-center h-32 active:opacity-80"
            >
              {photos.before ? (
                <Text className="text-4xl">📸 ✓</Text>
              ) : (
                <View className="items-center gap-2">
                  <Text className="text-3xl">📷</Text>
                  <Text className="text-sm text-muted">Foto prima</Text>
                </View>
              )}
            </Pressable>

            <Pressable
              onPress={() => handleTakePhoto("after")}
              className="bg-surface rounded-2xl p-6 border border-border items-center justify-center h-32 active:opacity-80"
            >
              {photos.after ? (
                <Text className="text-4xl">📸 ✓</Text>
              ) : (
                <View className="items-center gap-2">
                  <Text className="text-3xl">📷</Text>
                  <Text className="text-sm text-muted">Foto dopo</Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* Controls */}
          <View className="gap-3 mt-6">
            <TouchableOpacity
            onPress={async () => {
              if (!isTracking) {
                const success = await startTracking();
                if (success) setIsTracking(true);
              } else {
                setIsTracking(false);
              }
            }}
            className={`rounded-full py-3 items-center active:opacity-80 ${
              isTracking ? "bg-warning" : "bg-primary"
            }`}
          >
            <Text className="text-white font-semibold">
              {isTracking ? "Pausa" : "Inizia"}
            </Text>
          </TouchableOpacity>

            <TouchableOpacity
              onPress={handleStop}
              className="bg-error rounded-full py-3 items-center active:opacity-80"
            >
              <Text className="text-white font-semibold">Termina passeggiata</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

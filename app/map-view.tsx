import { Text, View, TouchableOpacity } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { LeafletMap } from "@/components/leaflet-map";

export default function MapViewScreen() {
  const router = useRouter();
  return (
    <ScreenContainer className="p-4">
      <View className="flex-1 gap-3">
        <View className="px-2 pt-2 flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-foreground">Esplora</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-primary font-semibold">Chiudi</Text>
          </TouchableOpacity>
        </View>
        <View className="flex-1 mx-2 rounded-2xl overflow-hidden">
          <LeafletMap zoom={13} />
        </View>
      </View>
    </ScreenContainer>
  );
}

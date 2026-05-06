import { ScrollView, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";

export default function MapScreen() {
  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 gap-6">
          <Text className="text-3xl font-bold text-foreground">Mappa</Text>
          
          {/* Map Placeholder */}
          <View className="bg-surface rounded-2xl h-64 border border-border items-center justify-center">
            <Text className="text-4xl mb-2">🗺️</Text>
            <Text className="text-sm text-muted">Mappa interattiva</Text>
          </View>

          {/* Popular Walks */}
          <View className="gap-3">
            <Text className="font-semibold text-foreground">Passeggiate Popolari</Text>
            
            <View className="bg-surface rounded-2xl p-4 border border-border">
              <Text className="font-semibold text-foreground mb-1">Parco Centrale</Text>
              <Text className="text-xs text-muted mb-2">⭐ 4.9 • 156 passeggiate</Text>
              <View className="h-12 bg-primary rounded-lg opacity-30" />
            </View>

            <View className="bg-surface rounded-2xl p-4 border border-border">
              <Text className="font-semibold text-foreground mb-1">Bosco Naturale</Text>
              <Text className="text-xs text-muted mb-2">⭐ 4.7 • 89 passeggiate</Text>
              <View className="h-12 bg-primary rounded-lg opacity-30" />
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

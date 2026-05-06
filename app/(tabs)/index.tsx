import { ScrollView, Text, View, TouchableOpacity } from "react-native";

import { ScreenContainer } from "@/components/screen-container";

export default function HomeScreen() {
  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 gap-6">
          {/* Header with Branding */}
          <View className="gap-1">
            <Text className="text-4xl font-bold text-primary">🐕 Passeggiata Furba</Text>
            <Text className="text-sm text-muted">Scopri i migliori percorsi per il tuo cane</Text>
          </View>

          {/* Featured Walk Card - Branding Strong */}
          <View className="bg-primary rounded-3xl p-6 shadow-sm">
            <View className="flex-row justify-between items-start mb-4">
              <View className="flex-1">
                <Text className="text-white text-xs font-bold mb-1">CONSIGLIATA PER TE</Text>
                <Text className="text-white text-2xl font-bold">Parco Verde</Text>
              </View>
              <Text className="text-4xl">🌳</Text>
            </View>
            <View className="gap-2 mb-4">
              <View className="flex-row gap-3">
                <Text className="text-white text-sm font-semibold">📏 2.5 km</Text>
                <Text className="text-white text-sm font-semibold">⏱️ 35 min</Text>
                <Text className="text-white text-sm font-semibold">⭐ 4.9</Text>
              </View>
              <Text className="text-white/90 text-xs">💧 Fontanella • ☀️ Ombra • 🐕 Pochi cani</Text>
            </View>
            <TouchableOpacity className="bg-white rounded-full py-3 items-center active:opacity-90">
              <Text className="text-primary font-bold">Inizia Tracker</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Chips - Branding Strong */}
          <View className="gap-3">
            <Text className="text-sm font-bold text-foreground">FILTRA PASSEGGIATE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-2">
              <View className="bg-primary/10 border border-primary rounded-full px-4 py-2">
                <Text className="text-sm text-primary font-semibold">☀️ Ombra</Text>
              </View>
              <View className="bg-primary/10 border border-primary rounded-full px-4 py-2">
                <Text className="text-sm text-primary font-semibold">💧 Fontanella</Text>
              </View>
              <View className="bg-primary/10 border border-primary rounded-full px-4 py-2">
                <Text className="text-sm text-primary font-semibold">🐕 Pochi cani</Text>
              </View>
              <View className="bg-primary/10 border border-primary rounded-full px-4 py-2">
                <Text className="text-sm text-primary font-semibold">🛡️ Sicuro</Text>
              </View>
            </ScrollView>
          </View>

          {/* Nearby Walks */}
          <View className="gap-3">
            <Text className="text-sm font-bold text-foreground">PASSEGGIATE VICINO A TE</Text>
            <TouchableOpacity className="bg-surface rounded-2xl p-4 border-2 border-primary/30 active:border-primary active:bg-primary/5">
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1">
                  <Text className="text-base font-bold text-foreground mb-1">🌲 Sentiero del Bosco</Text>
                  <Text className="text-xs text-muted">3.2 km • 45 min</Text>
                </View>
                <Text className="text-lg font-bold text-primary">4.8⭐</Text>
              </View>
              <View className="h-2 bg-primary/20 rounded-full overflow-hidden">
                <View className="h-full bg-primary" style={{ width: "85%" }} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity className="bg-surface rounded-2xl p-4 border-2 border-primary/30 active:border-primary active:bg-primary/5">
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1">
                  <Text className="text-base font-bold text-foreground mb-1">💧 Lungolago Tranquillo</Text>
                  <Text className="text-xs text-muted">1.8 km • 25 min</Text>
                </View>
                <Text className="text-lg font-bold text-primary">4.9⭐</Text>
              </View>
              <View className="h-2 bg-primary/20 rounded-full overflow-hidden">
                <View className="h-full bg-primary" style={{ width: "95%" }} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

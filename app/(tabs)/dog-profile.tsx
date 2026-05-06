import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { ScreenContainer } from "@/components/screen-container";

export default function DogProfileScreen() {
  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 gap-6">
          <Text className="text-3xl font-bold text-foreground">Profilo Cane</Text>
          
          {/* Dog Avatar Placeholder */}
          <View className="items-center">
            <View className="w-24 h-24 bg-primary rounded-full items-center justify-center">
              <Text className="text-5xl">🐕</Text>
            </View>
          </View>

          {/* Dog Info Card */}
          <View className="bg-surface rounded-2xl p-5 border border-border gap-4">
            <View>
              <Text className="text-xs text-muted mb-1">Nome</Text>
              <Text className="text-lg font-semibold text-foreground">Max</Text>
            </View>
            <View>
              <Text className="text-xs text-muted mb-1">Razza</Text>
              <Text className="text-lg font-semibold text-foreground">Golden Retriever</Text>
            </View>
            <View>
              <Text className="text-xs text-muted mb-1">Età</Text>
              <Text className="text-lg font-semibold text-foreground">3 anni</Text>
            </View>
            <View>
              <Text className="text-xs text-muted mb-1">Energia</Text>
              <Text className="text-lg font-semibold text-foreground">Alta</Text>
            </View>
          </View>

          {/* Health Stats */}
          <View className="bg-surface rounded-2xl p-5 border border-border gap-3">
            <Text className="font-semibold text-foreground">Statistiche</Text>
            <View className="flex-row justify-between">
              <View className="flex-1">
                <Text className="text-xs text-muted mb-1">Passeggiate</Text>
                <Text className="text-2xl font-bold text-primary">24</Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs text-muted mb-1">Km totali</Text>
                <Text className="text-2xl font-bold text-primary">45.2</Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs text-muted mb-1">Streak</Text>
                <Text className="text-2xl font-bold text-primary">7 gg</Text>
              </View>
            </View>
          </View>

          {/* Edit Button */}
          <TouchableOpacity className="bg-primary rounded-full py-3 items-center active:opacity-80">
            <Text className="text-white font-semibold">Modifica Profilo</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

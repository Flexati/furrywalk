import { ScrollView, Text, View, TouchableOpacity, TextInput, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useEffect, useState } from "react";
import { Storage, type DogProfile } from "@/lib/services/storage";

export default function DogProfileScreen() {
  const [dog, setDog] = useState<DogProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [energy, setEnergy] = useState<DogProfile["energy"]>("media");

  useEffect(() => {
    Storage.getDogProfile().then((d) => {
      if (d) {
        setDog(d);
        setName(d.name);
        setBreed(d.breed);
        setAge(d.age);
        setWeight(d.weightKg ? String(d.weightKg) : "");
        setEnergy(d.energy);
      }
    });
  }, []);

  const handleSave = async () => {
    const next: DogProfile = {
      name: name.trim() || "Il mio cane",
      breed: breed.trim() || "Meticcio",
      age: age.trim() || "—",
      energy,
      weightKg: weight ? parseFloat(weight) : undefined,
      avatarEmoji: dog?.avatarEmoji ?? "🐶",
    };
    await Storage.setDogProfile(next);
    setDog(next);
    setEditing(false);
    Alert.alert("Salvato", "Profilo aggiornato.");
  };

  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}>
        <View className="flex-1 gap-6">
          <View className="items-center gap-2">
            <Text className="text-7xl">{dog?.avatarEmoji ?? "🐶"}</Text>
            <Text className="text-3xl font-bold text-foreground">{dog?.name ?? "—"}</Text>
            {dog && (
              <Text className="text-sm text-muted">
                {dog.breed} • {dog.age} • Energia {dog.energy}
              </Text>
            )}
          </View>

          {!editing ? (
            <View className="gap-3">
              <View className="bg-surface rounded-2xl p-4 border border-border">
                <Text className="text-xs text-muted">Razza</Text>
                <Text className="text-base font-semibold text-foreground">
                  {dog?.breed ?? "—"}
                </Text>
              </View>
              <View className="bg-surface rounded-2xl p-4 border border-border">
                <Text className="text-xs text-muted">Età</Text>
                <Text className="text-base font-semibold text-foreground">{dog?.age ?? "—"}</Text>
              </View>
              <View className="bg-surface rounded-2xl p-4 border border-border">
                <Text className="text-xs text-muted">Peso</Text>
                <Text className="text-base font-semibold text-foreground">
                  {dog?.weightKg ? `${dog.weightKg} kg` : "Non impostato"}
                </Text>
              </View>
              <View className="bg-surface rounded-2xl p-4 border border-border">
                <Text className="text-xs text-muted">Livello energia</Text>
                <Text className="text-base font-semibold text-foreground capitalize">
                  {dog?.energy ?? "—"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setEditing(true)}
                className="bg-primary rounded-full py-3 items-center mt-2"
              >
                <Text className="text-white font-bold">Modifica profilo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="gap-3">
              <Text className="text-xs font-semibold text-foreground">NOME</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                className="bg-surface border border-border rounded-2xl px-4 py-3 text-foreground"
                placeholderTextColor="#999"
              />
              <Text className="text-xs font-semibold text-foreground">RAZZA</Text>
              <TextInput
                value={breed}
                onChangeText={setBreed}
                className="bg-surface border border-border rounded-2xl px-4 py-3 text-foreground"
                placeholderTextColor="#999"
              />
              <Text className="text-xs font-semibold text-foreground">ETÀ</Text>
              <TextInput
                value={age}
                onChangeText={setAge}
                className="bg-surface border border-border rounded-2xl px-4 py-3 text-foreground"
                placeholderTextColor="#999"
              />
              <Text className="text-xs font-semibold text-foreground">PESO (kg)</Text>
              <TextInput
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                placeholder="Es. 18"
                className="bg-surface border border-border rounded-2xl px-4 py-3 text-foreground"
                placeholderTextColor="#999"
              />
              <Text className="text-xs font-semibold text-foreground">ENERGIA</Text>
              <View className="flex-row gap-2">
                {(["bassa", "media", "alta"] as const).map((e) => (
                  <TouchableOpacity
                    key={e}
                    onPress={() => setEnergy(e)}
                    className={`flex-1 rounded-full py-3 items-center border-2 ${
                      energy === e ? "bg-primary border-primary" : "bg-surface border-border"
                    }`}
                  >
                    <Text
                      className={`font-semibold capitalize ${
                        energy === e ? "text-white" : "text-foreground"
                      }`}
                    >
                      {e}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View className="flex-row gap-3 mt-3">
                <TouchableOpacity
                  onPress={() => setEditing(false)}
                  className="flex-1 rounded-full py-3 items-center border border-border"
                >
                  <Text className="text-foreground font-semibold">Annulla</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  className="flex-1 bg-primary rounded-full py-3 items-center"
                >
                  <Text className="text-white font-bold">Salva</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

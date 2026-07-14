import { ScrollView, Text, View, TouchableOpacity, TextInput, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useEffect, useState } from "react";
import { Storage, type DogProfile } from "@/lib/services/storage";
import { useSubscription } from "@/hooks/use-subscription";
import { useRouter } from "expo-router";

export default function DogProfileScreen() {
  const router = useRouter();
  const { isPro, status } = useSubscription();
  
  const [profiles, setProfiles] = useState<DogProfile[]>([]);
  const [currentProfileIndex, setCurrentProfileIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [energy, setEnergy] = useState<DogProfile["energy"]>("media");

  // Load profiles on mount
  useEffect(() => {
    Storage.getDogProfiles().then((list) => {
      setProfiles(list);
      if (list.length > 0) {
        const first = list[0];
        setName(first.name);
        setBreed(first.breed);
        setAge(first.age);
        setWeight(first.weightKg ? String(first.weightKg) : "");
        setEnergy(first.energy);
      }
    });
  }, []);

  const currentProfile = profiles[currentProfileIndex] || null;

  // Check if user can create another profile
  const canCreateMoreProfiles = () => {
    const maxProfiles = isPro ? 5 : 1;
    return profiles.length < maxProfiles;
  };

  const handleCreateNewProfile = () => {
    // Premium gate: check limits before allowing creation
    const maxProfiles = isPro || status === "on_trial" ? 5 : 1;
    
    if (profiles.length >= maxProfiles) {
      // Block creation and show paywall
      router.push("/paywall");
      return;
    }
    
    // Clear form for new profile
    setName("");
    setBreed("");
    setAge("");
    setWeight("");
    setEnergy("media");
    setEditing(true);
  };

  const handleSave = async () => {
    const next: DogProfile = {
      name: name.trim() || "Il mio cane",
      breed: breed.trim() || "Meticcio",
      age: age.trim() || "—",
      energy,
      weightKg: weight ? parseFloat(weight) : undefined,
      avatarEmoji: currentProfile?.avatarEmoji ?? "🐶",
    };

    let updatedProfiles: DogProfile[];
    
    if (currentProfile) {
      // Update existing profile
      updatedProfiles = [...profiles];
      updatedProfiles[currentProfileIndex] = next;
    } else {
      // Add new profile
      updatedProfiles = [...profiles, next];
      setCurrentProfileIndex(updatedProfiles.length - 1);
    }
    
    await Storage.setDogProfiles(updatedProfiles);
    setProfiles(updatedProfiles);
    setEditing(false);
    Alert.alert("Salvato", "Profilo aggiornato.");
  };

  const handleSwitchProfile = (index: number) => {
    const profile = profiles[index];
    setCurrentProfileIndex(index);
    setName(profile.name);
    setBreed(profile.breed);
    setAge(profile.age);
    setWeight(profile.weightKg ? String(profile.weightKg) : "");
    setEnergy(profile.energy);
    setEditing(false);
  };

  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}>
        <View className="flex-1 gap-6">
          {/* Profile selector */}
          {profiles.length > 0 && (
            <View className="flex-row items-center justify-center gap-2 mb-2">
              {profiles.map((p, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleSwitchProfile(idx)}
                  className={`w-3 h-3 rounded-full ${
                    idx === currentProfileIndex ? "bg-primary" : "bg-border"
                  }`}
                  accessibilityRole="button"
                  accessibilityLabel={`Switch to profile ${idx + 1}`}
                />
              ))}
            </View>
          )}

          <View className="items-center gap-2">
            <Text className="text-7xl">{currentProfile?.avatarEmoji ?? "🐶"}</Text>
            <Text className="text-3xl font-bold text-foreground">{currentProfile?.name ?? "—"}</Text>
            {currentProfile && (
              <Text className="text-sm text-muted">
                {currentProfile.breed} • {currentProfile.age} • Energia {currentProfile.energy}
              </Text>
            )}
          </View>

          {!editing ? (
            <View className="gap-3">
              <View className="bg-surface rounded-2xl p-4 border border-border">
                <Text className="text-xs text-muted">Razza</Text>
                <Text className="text-base font-semibold text-foreground">
                  {currentProfile?.breed ?? "—"}
                </Text>
              </View>
              <View className="bg-surface rounded-2xl p-4 border border-border">
                <Text className="text-xs text-muted">Età</Text>
                <Text className="text-base font-semibold text-foreground">{currentProfile?.age ?? "—"}</Text>
              </View>
              <View className="bg-surface rounded-2xl p-4 border border-border">
                <Text className="text-xs text-muted">Peso</Text>
                <Text className="text-base font-semibold text-foreground">
                  {currentProfile?.weightKg ? `${currentProfile.weightKg} kg` : "Non impostato"}
                </Text>
              </View>
              <View className="bg-surface rounded-2xl p-4 border border-border">
                <Text className="text-xs text-muted">Livello energia</Text>
                <Text className="text-base font-semibold text-foreground capitalize">
                  {currentProfile?.energy ?? "—"}
                </Text>
              </View>
              
              {/* Action buttons */}
              <View className="gap-3 mt-2">
                <TouchableOpacity
                  onPress={() => setEditing(true)}
                  className="bg-primary rounded-full py-3 items-center"
                >
                  <Text className="text-white font-bold">Modifica profilo</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={handleCreateNewProfile}
                  className="bg-surface border-2 border-primary rounded-full py-3 items-center"
                >
                  <Text className="text-primary font-bold">
                    + Aggiungi un altro cane
                  </Text>
                </TouchableOpacity>
              </View>
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

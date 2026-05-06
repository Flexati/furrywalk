import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useNotificationService } from "@/lib/services/notification-service";
import { useState } from "react";

export default function HealthScreen() {
  const { scheduleVaccineReminder, scheduleAntiparassiteReminder, scheduleGroomingReminder } =
    useNotificationService();
  const [reminders, setReminders] = useState({
    vaccine: false,
    antiparassite: false,
    grooming: false,
  });

  const handleSetReminder = async (type: "vaccine" | "antiparassite" | "grooming") => {
    let notificationId: string | null = null;
    const dogId = "dog_1"; // TODO: Get from user context

    if (type === "vaccine") {
      notificationId = await scheduleVaccineReminder(dogId, 7); // 7 days from now
    } else if (type === "antiparassite") {
      notificationId = await scheduleAntiparassiteReminder(dogId, 14); // 14 days from now
    } else if (type === "grooming") {
      notificationId = await scheduleGroomingReminder(dogId, 30); // 30 days from now
    }

    if (notificationId) {
      setReminders((prev) => ({ ...prev, [type]: true }));
    }
  };

  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 gap-6">
          <Text className="text-3xl font-bold text-foreground">Salute</Text>

          {/* Reminders */}
          <View className="gap-3">
            <View className="bg-surface rounded-2xl p-4 border border-border">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="font-semibold text-foreground">💉 Vaccini</Text>
                <Text className="text-xs text-muted">Tra 15 giorni</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleSetReminder("vaccine")}
                className={`rounded-full py-2 items-center active:opacity-80 ${
                  reminders.vaccine ? "bg-success" : "bg-primary"
                }`}
              >
                <Text className="text-white text-sm font-semibold">
                  {reminders.vaccine ? "✓ Impostato" : "Imposta Reminder"}
                </Text>
              </TouchableOpacity>
            </View>

            <View className="bg-surface rounded-2xl p-4 border border-border">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="font-semibold text-foreground">🦠 Antiparassitari</Text>
                <Text className="text-xs text-muted">Tra 7 giorni</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleSetReminder("antiparassite")}
                className={`rounded-full py-2 items-center active:opacity-80 ${
                  reminders.antiparassite ? "bg-success" : "bg-primary"
                }`}
              >
                <Text className="text-white text-sm font-semibold">
                  {reminders.antiparassite ? "✓ Impostato" : "Imposta Reminder"}
                </Text>
              </TouchableOpacity>
            </View>

            <View className="bg-surface rounded-2xl p-4 border border-border">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="font-semibold text-foreground">✂️ Toelettatura</Text>
                <Text className="text-xs text-muted">Tra 30 giorni</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleSetReminder("grooming")}
                className={`rounded-full py-2 items-center active:opacity-80 ${
                  reminders.grooming ? "bg-success" : "bg-primary"
                }`}
              >
                <Text className="text-white text-sm font-semibold">
                  {reminders.grooming ? "✓ Impostato" : "Imposta Reminder"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

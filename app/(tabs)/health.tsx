import { ScrollView, Text, View, TouchableOpacity, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useEffect, useState, useCallback } from "react";
import { Storage, type Reminder, type WalkRecord } from "@/lib/services/storage";
import { notificationService } from "@/lib/services/notification-service";
import { VetFAQList } from "@/components/VetFAQList";
import { WeeklyChart } from "@/components/stats/weekly-chart";
import { getWeeklyStats, type WeeklyStat } from "@/lib/services/analytics-weekly";
import { usePremium } from "@/hooks/usePremium";
import { router } from "expo-router";

const REMINDER_TYPES: { type: Reminder["type"]; emoji: string; label: string; days: number }[] = [
  { type: "vaccino", emoji: "💉", label: "Vaccino annuale", days: 365 },
  { type: "antiparassitario", emoji: "🐛", label: "Antiparassitario", days: 30 },
  { type: "toelettatura", emoji: "✂️", label: "Toelettatura", days: 60 },
  { type: "passeggiata", emoji: "🐕", label: "Passeggiata quotidiana", days: 1 },
];

function startOfWeek(d: Date) {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setHours(0, 0, 0, 0)).setDate(diff);
}

export default function HealthScreen() {
  const [walks, setWalks] = useState<WalkRecord[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStat[]>([]);
  const [statsMode, setStatsMode] = useState<"distance" | "duration">("distance");
  const { isPremium } = usePremium();

  const refresh = useCallback(async () => {
    const [w, r, stats] = await Promise.all([
      Storage.getWalks(),
      Storage.getReminders(),
      getWeeklyStats(8),
    ]);
    setWalks(w);
    setReminders(r);
    setWeeklyStats(stats);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const totalKm = walks.reduce((s, w) => s + w.distanceKm, 0);
  const totalMinutes = walks.reduce((s, w) => s + w.durationSec / 60, 0);
  const totalCalories = walks.reduce((s, w) => s + w.caloriesKcal, 0);

  const weekStart = startOfWeek(new Date());
  const weekKm = walks
    .filter((w) => w.startedAt >= weekStart)
    .reduce((s, w) => s + w.distanceKm, 0);

  // Streak: count consecutive days going back from today with at least one walk
  const daysSet = new Set(
    walks.map((w) => new Date(w.startedAt).toDateString())
  );
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (daysSet.has(d.toDateString())) streak++;
    else if (i > 0) break;
  }

  const addReminder = async (t: typeof REMINDER_TYPES[number]) => {
    try {
      const scheduledFor = Date.now() + t.days * 24 * 60 * 60 * 1000;
      const date = new Date(scheduledFor);
      const notifId = await notificationService.scheduleNotification({
        id: `${t.type}_${Date.now()}`,
        title: `${t.emoji} ${t.label}`,
        body: `Promemoria per il tuo cane`,
        type: t.type === "vaccino" ? "vaccine" : t.type === "antiparassitario" ? "antiparassite" : t.type === "toelettatura" ? "grooming" : "walk",
        scheduledFor: date,
        dogId: "default",
      });
      const next: Reminder[] = [
        ...reminders,
        {
          id: `${t.type}_${Date.now()}`,
          type: t.type,
          title: `${t.emoji} ${t.label}`,
          scheduledFor,
          notificationId: notifId ?? undefined,
        },
      ];
      await Storage.setReminders(next);
      setReminders(next);
      Alert.alert("Promemoria impostato", `Tra ${t.days} giorni`);
    } catch (e) {
      Alert.alert("Errore", String(e));
    }
  };

  const removeReminder = async (id: string) => {
    const r = reminders.find((x) => x.id === id);
    if (r?.notificationId) {
      try {
        await notificationService.cancelNotification(r.notificationId);
      } catch {}
    }
    const next = reminders.filter((x) => x.id !== id);
    await Storage.setReminders(next);
    setReminders(next);
  };

  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}>
        <View className="flex-1 gap-6">
          <Text className="text-3xl font-bold text-foreground">Salute</Text>

          <View className="flex-row gap-3">
            <View className="flex-1 bg-surface rounded-2xl p-4 border border-border">
              <Text className="text-xs text-muted">Km totali</Text>
              <Text className="text-2xl font-bold text-primary">{totalKm.toFixed(1)}</Text>
            </View>
            <View className="flex-1 bg-surface rounded-2xl p-4 border border-border">
              <Text className="text-xs text-muted">Minuti</Text>
              <Text className="text-2xl font-bold text-primary">{Math.round(totalMinutes)}</Text>
            </View>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 bg-surface rounded-2xl p-4 border border-border">
              <Text className="text-xs text-muted">Settimana</Text>
              <Text className="text-2xl font-bold text-primary">{weekKm.toFixed(1)} km</Text>
            </View>
            <View className="flex-1 bg-surface rounded-2xl p-4 border border-border">
              <Text className="text-xs text-muted">Streak 🔥</Text>
              <Text className="text-2xl font-bold text-primary">{streak}g</Text>
            </View>
            <View className="flex-1 bg-surface rounded-2xl p-4 border border-border">
              <Text className="text-xs text-muted">Calorie</Text>
              <Text className="text-2xl font-bold text-primary">{totalCalories}</Text>
            </View>
          </View>

          <View className="gap-3">
            <Text className="text-sm font-bold text-foreground">PROMEMORIA</Text>
            {reminders.length === 0 ? (
              <View className="bg-surface rounded-2xl p-4 border border-border">
                <Text className="text-muted text-sm">Nessun promemoria. Aggiungine uno qui sotto.</Text>
              </View>
            ) : (
              reminders.map((r) => (
                <View
                  key={r.id}
                  className="bg-surface rounded-2xl p-4 border border-border flex-row items-center justify-between"
                >
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground">{r.title}</Text>
                    <Text className="text-xs text-muted">
                      {new Date(r.scheduledFor).toLocaleDateString("it-IT")}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => removeReminder(r.id)} className="px-3 py-2">
                    <Text className="text-error font-semibold">Rimuovi</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          <View className="gap-3">
            <Text className="text-sm font-bold text-foreground">AGGIUNGI PROMEMORIA</Text>
            <View className="flex-row flex-wrap gap-2">
              {REMINDER_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.type}
                  onPress={() => addReminder(t)}
                  className="bg-primary/10 border border-primary rounded-2xl px-4 py-3"
                >
                  <Text className="text-primary font-semibold">
                    {t.emoji} {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Advanced Statistics - Premium Gated */}
          <View className="gap-3">
            <Text className="text-sm font-bold text-foreground">STATISTICHE AVANZATE</Text>
            {isPremium ? (
              <View className="bg-surface rounded-2xl p-4 border border-border gap-3">
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => setStatsMode("distance")}
                    className={`flex-1 rounded-full py-2 items-center border ${
                      statsMode === "distance" ? "bg-primary border-primary" : "bg-surface border-border"
                    }`}
                  >
                    <Text className={statsMode === "distance" ? "text-white font-semibold" : "text-foreground"}>
                      Distanza
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setStatsMode("duration")}
                    className={`flex-1 rounded-full py-2 items-center border ${
                      statsMode === "duration" ? "bg-primary border-primary" : "bg-surface border-border"
                    }`}
                  >
                    <Text className={statsMode === "duration" ? "text-white font-semibold" : "text-foreground"}>
                      Durata
                    </Text>
                  </TouchableOpacity>
                </View>
                <WeeklyChart weeklyStats={weeklyStats} mode={statsMode} />
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => router.push("/paywall")}
                className="bg-surface rounded-2xl p-4 border border-border"
              >
                <Text className="text-primary font-semibold">🔓 Sblocca le statistiche avanzate</Text>
                <Text className="text-xs text-muted mt-1">
                  Grafico settimanale, medie e tendenze delle tue passeggiate.
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Vet Health FAQ Library - Premium Gated */}
          <View className="gap-3">
            <Text className="text-sm font-bold text-foreground">CONSIGLI DEL VETERINARIO</Text>
            <VetFAQList
              onOpenPaywall={() => router.push("/paywall")}
            />
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

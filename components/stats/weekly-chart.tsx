import React from "react";
import { View, Text, useWindowDimensions } from "react-native";
import type { WeeklyStat } from "@/lib/services/analytics-weekly";

interface WeeklyChartProps {
  weeklyStats: WeeklyStat[];
  mode?: "distance" | "duration";
}

/**
 * Componente grafico a barre per il trend settimanale.
 * Implementazione semplice con View di React Native (nessuna libreria chart esterna).
 */
export function WeeklyChart({ weeklyStats, mode = "distance" }: WeeklyChartProps) {
  const { width } = useWindowDimensions();
  
  if (!weeklyStats || weeklyStats.length === 0) {
    return (
      <View className="items-center justify-center py-8">
        <Text className="text-muted text-sm">Nessun dato disponibile</Text>
      </View>
    );
  }

  // Filtra solo le settimane con dati
  const activeWeeks = weeklyStats.filter((w) => w.walkCount > 0);
  const maxValue = Math.max(
    ...weeklyStats.map((w) => (mode === "distance" ? w.totalDistanceKm : w.totalDurationMin))
  );

  const chartWidth = width - 48; // Padding laterale
  const barWidth = Math.min(32, (chartWidth / weeklyStats.length) - 4);
  const chartHeight = 120;

  const getBarHeight = (value: number) => {
    if (maxValue === 0) return 0;
    return (value / maxValue) * chartHeight;
  };

  const formatValue = (stat: WeeklyStat) => {
    if (mode === "distance") {
      return `${stat.totalDistanceKm.toFixed(1)} km`;
    }
    return `${Math.round(stat.totalDurationMin)} min`;
  };

  const getWeekLabel = (weekStart: Date) => {
    const day = weekStart.getDate();
    const month = weekStart.getMonth() + 1;
    return `${day}/${month}`;
  };

  return (
    <View className="w-full">
      {/* Area del grafico */}
      <View className="flex-row items-end justify-between px-2" style={{ height: chartHeight + 30 }}>
        {weeklyStats.map((stat, index) => {
          const value = mode === "distance" ? stat.totalDistanceKm : stat.totalDurationMin;
          const barHeight = getBarHeight(value);
          const isActive = value > 0;

          return (
            <View
              key={index}
              className="items-center"
              style={{ width: barWidth }}
            >
              {/* Barra */}
              <View
                className={`rounded-t-md ${isActive ? "bg-primary" : "bg-muted"}`}
                style={{
                  height: barHeight,
                  width: barWidth,
                  opacity: isActive ? 0.9 : 0.3,
                }}
              />
              
              {/* Etichetta settimana */}
              <View className="mt-2 items-center">
                <Text className="text-[10px] text-muted" numberOfLines={1}>
                  {getWeekLabel(stat.weekStart)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Legenda e totali */}
      <View className="mt-4 pt-3 border-t border-border">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-xs text-muted">Media settimanale</Text>
            <Text className="text-lg font-bold text-primary">
              {mode === "distance"
                ? `${(weeklyStats.reduce((s, w) => s + w.totalDistanceKm, 0) / weeklyStats.length).toFixed(1)} km`
                : `${Math.round(weeklyStats.reduce((s, w) => s + w.totalDurationMin, 0) / weeklyStats.length)} min`}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-xs text-muted">Totale periodo</Text>
            <Text className="text-lg font-bold text-foreground">
              {mode === "distance"
                ? `${weeklyStats.reduce((s, w) => s + w.totalDistanceKm, 0).toFixed(1)} km`
                : `${Math.round(weeklyStats.reduce((s, w) => s + w.totalDurationMin, 0))} min`}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
import { Storage, type WalkRecord } from "./storage";

export interface WeeklyStat {
  weekStart: Date;
  weekEnd: Date;
  totalDistanceKm: number;
  totalDurationMin: number;
  walkCount: number;
  avgDistanceKm: number;
  avgDurationMin: number;
}

/**
 * Calcola l'inizio della settimana (lunedì) per una data data.
 */
function getWeekStart(d: Date): Date {
  const result = new Date(d);
  const day = result.getDay();
  const diff = result.getDate() - day + (day === 0 ? -6 : 1); // Lunedì come primo giorno
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Calcola la fine della settimana (domenica) per una data data.
 */
function getWeekEnd(d: Date): Date {
  const weekStart = getWeekStart(d);
  const result = new Date(weekStart);
  result.setDate(weekStart.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Aggrega i dati delle passeggiate per settimana.
 * Restituisce le ultime N settimane (default: 8).
 */
export async function getWeeklyStats(numWeeks: number = 8): Promise<WeeklyStat[]> {
  const walks = await Storage.getWalks();
  if (walks.length === 0) {
    return [];
  }

  const today = new Date();
  const currentWeekStart = getWeekStart(today);
  
  // Calcola la data di inizio per numWeeks fa
  const earliestWeekStart = new Date(currentWeekStart);
  earliestWeekStart.setDate(earliestWeekStart.getDate() - (numWeeks - 1) * 7);

  // Filtra le passeggiate delle ultime numWeeks settimane
  const relevantWalks = walks.filter((w) => {
    const walkDate = new Date(w.startedAt);
    return walkDate >= earliestWeekStart && walkDate <= today;
  });

  // Raggruppa per settimana
  const weekMap = new Map<string, WalkRecord[]>();
  
  for (const walk of relevantWalks) {
    const walkDate = new Date(walk.startedAt);
    const weekStart = getWeekStart(walkDate);
    const weekKey = weekStart.toISOString();
    
    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, []);
    }
    weekMap.get(weekKey)!.push(walk);
  }

  // Costruisci l'array di statistiche per ogni settimana
  const result: WeeklyStat[] = [];
  
  for (let i = numWeeks - 1; i >= 0; i--) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(weekStart.getDate() - i * 7);
    const weekEnd = getWeekEnd(weekStart);
    const weekKey = weekStart.toISOString();
    
    const weekWalks = weekMap.get(weekKey) || [];
    
    const totalDistanceKm = weekWalks.reduce((sum, w) => sum + w.distanceKm, 0);
    const totalDurationMin = weekWalks.reduce((sum, w) => sum + w.durationSec / 60, 0);
    const walkCount = weekWalks.length;
    
    result.push({
      weekStart,
      weekEnd,
      totalDistanceKm,
      totalDurationMin,
      walkCount,
      avgDistanceKm: walkCount > 0 ? totalDistanceKm / walkCount : 0,
      avgDurationMin: walkCount > 0 ? totalDurationMin / walkCount : 0,
    });
  }

  return result;
}

/**
 * Calcola la media delle ultime N settimane (escludendo le settimane con 0 passeggiate).
 */
export function calculateWeeklyAverage(weeklyStats: WeeklyStat[]): {
  avgDistanceKm: number;
  avgDurationMin: number;
  avgWalksPerWeek: number;
} {
  const activeWeeks = weeklyStats.filter((w) => w.walkCount > 0);
  
  if (activeWeeks.length === 0) {
    return { avgDistanceKm: 0, avgDurationMin: 0, avgWalksPerWeek: 0 };
  }

  const totalDistance = activeWeeks.reduce((sum, w) => sum + w.totalDistanceKm, 0);
  const totalDuration = activeWeeks.reduce((sum, w) => sum + w.totalDurationMin, 0);
  const totalWalks = activeWeeks.reduce((sum, w) => sum + w.walkCount, 0);

  return {
    avgDistanceKm: totalDistance / activeWeeks.length,
    avgDurationMin: totalDuration / activeWeeks.length,
    avgWalksPerWeek: totalWalks / activeWeeks.length,
  };
}
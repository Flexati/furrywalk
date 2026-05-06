import { supabase } from "./supabase-service";

export interface DailyStats {
  date: string;
  distance: number; // km
  duration: number; // seconds
  walkCount: number;
  caloriesBurned: number;
}

export interface WeeklyStats {
  week: number;
  year: number;
  totalDistance: number; // km
  totalDuration: number; // seconds
  totalWalks: number;
  totalCalories: number;
  avgDistance: number; // per walk
  avgDuration: number; // per walk
}

export interface HealthStats {
  totalWalks: number;
  totalDistance: number; // km
  totalDuration: number; // seconds
  totalCalories: number;
  currentStreak: number; // days
  longestStreak: number; // days
  averageWalkDistance: number; // km
  averageWalkDuration: number; // seconds
  lastWalkDate: string;
}

class AnalyticsService {
  // Calorie calculation based on dog weight and activity
  // Average: 5-10 calories per kg per hour
  private calculateCalories(dogWeightKg: number, durationSeconds: number): number {
    const durationHours = durationSeconds / 3600;
    const caloriesPerHour = dogWeightKg * 7.5; // average
    return Math.round(caloriesPerHour * durationHours);
  }

  async getDailyStats(userId: string, date: string): Promise<DailyStats | null> {
    try {
      // Query walks for the specific date
      const { data, error } = (await supabase
        .from("walks")
        .select("*")
        .eq("userId", userId)
        .gte("createdAt", `${date}T00:00:00Z`)
        .lte("createdAt", `${date}T23:59:59Z`)) as any;

      if (error) throw error;

      const walks = (data as any[]) || [];
      const totalDistance = walks.reduce((sum: number, w: any) => sum + w.distance, 0);
      const totalDuration = walks.reduce((sum: number, w: any) => sum + w.duration, 0);

      // Estimate calories (assuming average dog weight of 20kg)
      const caloriesBurned = this.calculateCalories(20, totalDuration);

      return {
        date,
        distance: totalDistance,
        duration: totalDuration,
        walkCount: walks.length,
        caloriesBurned,
      };
    } catch (error) {
      console.error("Failed to get daily stats:", error);
      return null;
    }
  }

  async getWeeklyStats(userId: string, week: number, year: number): Promise<WeeklyStats | null> {
    try {
      // Calculate week start and end dates
      const jan1 = new Date(year, 0, 1);
      const weekStart = new Date(jan1);
      weekStart.setDate(jan1.getDate() + (week - 1) * 7);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const { data, error } = (await supabase
        .from("walks")
        .select("*")
        .eq("userId", userId)
        .gte("createdAt", weekStart.toISOString())
        .lte("createdAt", weekEnd.toISOString())) as any;

      if (error) throw error;

      const walks = (data as any[]) || [];
      const totalDistance = walks.reduce((sum: number, w: any) => sum + w.distance, 0);
      const totalDuration = walks.reduce((sum: number, w: any) => sum + w.duration, 0);
      const totalCalories = this.calculateCalories(20, totalDuration);

      return {
        week,
        year,
        totalDistance,
        totalDuration,
        totalWalks: walks.length,
        totalCalories,
        avgDistance: walks.length > 0 ? totalDistance / walks.length : 0,
        avgDuration: walks.length > 0 ? totalDuration / walks.length : 0,
      };
    } catch (error) {
      console.error("Failed to get weekly stats:", error);
      return null;
    }
  }

  async getHealthStats(userId: string): Promise<HealthStats | null> {
    try {
      const { data, error } = (await supabase
        .from("walks")
        .select("*")
        .eq("userId", userId)
        .order("createdAt", { ascending: false })) as any;

      if (error) throw error;

      const walks = (data as any[]) || [];
      if (walks.length === 0) {
        return {
          totalWalks: 0,
          totalDistance: 0,
          totalDuration: 0,
          totalCalories: 0,
          currentStreak: 0,
          longestStreak: 0,
          averageWalkDistance: 0,
          averageWalkDuration: 0,
          lastWalkDate: "",
        };
      }

      const totalDistance = walks.reduce((sum: number, w: any) => sum + w.distance, 0);
      const totalDuration = walks.reduce((sum: number, w: any) => sum + w.duration, 0);
      const totalCalories = this.calculateCalories(20, totalDuration);

      // Calculate streaks
      const { currentStreak, longestStreak } = this.calculateStreaks(walks);

      return {
        totalWalks: walks.length,
        totalDistance,
        totalDuration,
        totalCalories,
        currentStreak,
        longestStreak,
        averageWalkDistance: totalDistance / walks.length,
        averageWalkDuration: totalDuration / walks.length,
        lastWalkDate: walks[0].createdAt,
      };
    } catch (error) {
      console.error("Failed to get health stats:", error);
      return null;
    }
  }

  private calculateStreaks(walks: any[]): { currentStreak: number; longestStreak: number } {
    if (walks.length === 0) return { currentStreak: 0, longestStreak: 0 };

    const dates = walks.map((w: any) => new Date(w.createdAt).toDateString());
    const uniqueDates = [...new Set(dates)];

    let currentStreak = 1;
    let longestStreak = 1;
    let tempStreak = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = new Date(uniqueDates[i - 1]);
      const currDate = new Date(uniqueDates[i]);
      const dayDiff = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));

      if (dayDiff === 1) {
        tempStreak++;
        if (i === 1) currentStreak = tempStreak;
      } else {
        if (tempStreak > longestStreak) longestStreak = tempStreak;
        tempStreak = 1;
      }
    }

    if (tempStreak > longestStreak) longestStreak = tempStreak;

    return { currentStreak, longestStreak };
  }

  async getMonthlyTrend(userId: string, months: number = 12): Promise<DailyStats[]> {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const { data, error } = (await supabase
        .from("walks")
        .select("*")
        .eq("userId", userId)
        .gte("createdAt", startDate.toISOString())
        .order("createdAt", { ascending: true })) as any;

      if (error) throw error;

      const walks = (data as any[]) || [];
      const dailyStats: Record<string, DailyStats> = {};

      walks.forEach((walk: any) => {
        const date = new Date(walk.createdAt).toDateString();
        if (!dailyStats[date]) {
          dailyStats[date] = {
            date,
            distance: 0,
            duration: 0,
            walkCount: 0,
            caloriesBurned: 0,
          };
        }
        dailyStats[date].distance += walk.distance;
        dailyStats[date].duration += walk.duration;
        dailyStats[date].walkCount += 1;
      });

      // Recalculate calories for each day
      Object.values(dailyStats).forEach((stat) => {
        stat.caloriesBurned = this.calculateCalories(20, stat.duration);
      });

      return Object.values(dailyStats);
    } catch (error) {
      console.error("Failed to get monthly trend:", error);
      return [];
    }
  }
}

export const analyticsService = new AnalyticsService();

export function useAnalyticsService() {
  const getDailyStats = async (userId: string, date: string) => {
    return analyticsService.getDailyStats(userId, date);
  };

  const getWeeklyStats = async (userId: string, week: number, year: number) => {
    return analyticsService.getWeeklyStats(userId, week, year);
  };

  const getHealthStats = async (userId: string) => {
    return analyticsService.getHealthStats(userId);
  };

  const getMonthlyTrend = async (userId: string, months?: number) => {
    return analyticsService.getMonthlyTrend(userId, months);
  };

  return {
    getDailyStats,
    getWeeklyStats,
    getHealthStats,
    getMonthlyTrend,
  };
}

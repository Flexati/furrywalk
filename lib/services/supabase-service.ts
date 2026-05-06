import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface Walk {
  id: string;
  userId: string;
  dogId: string;
  startLocation: { lat: number; lng: number };
  endLocation: { lat: number; lng: number };
  distance: number; // km
  duration: number; // seconds
  rating: number; // 1-5
  photos: string[]; // S3 URLs
  createdAt: string;
  updatedAt: string;
}

export interface WalkRoute {
  id: string;
  name: string;
  description: string;
  distance: number; // km
  duration: number; // minutes
  difficulty: "easy" | "medium" | "hard";
  coordinates: Array<{ lat: number; lng: number }>;
  rating: number; // average rating
  walkCount: number; // number of times walked
  tags: string[]; // "ombra", "fontanella", "pochi-cani", "sicuro"
  createdBy: string;
  createdAt: string;
}

export interface Heatmap {
  id: string;
  location: { lat: number; lng: number };
  intensity: number; // 0-100
  walkCount: number;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  dogs: string[]; // dog IDs
  subscription: "free" | "premium";
  subscriptionExpiry: string | null;
  totalWalks: number;
  totalDistance: number;
  createdAt: string;
}

class SupabaseService {
  async uploadWalk(walk: Omit<Walk, "id" | "createdAt" | "updatedAt">): Promise<Walk | null> {
    try {
      const { data, error } = await supabase
        .from("walks")
        .insert([
          {
            ...walk,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Failed to upload walk:", error);
      return null;
    }
  }

  async getWalkRoutes(
    latitude: number,
    longitude: number,
    radiusKm: number = 5
  ): Promise<WalkRoute[]> {
    try {
      // Using PostGIS for geospatial queries
      const { data, error } = await supabase
        .from("walk_routes")
        .select("*")
        .filter(
          "coordinates",
          "cs",
          `(${latitude},${longitude}),${radiusKm}`
        );

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Failed to get walk routes:", error);
      return [];
    }
  }

  async getHeatmapData(
    latitude: number,
    longitude: number,
    radiusKm: number = 5
  ): Promise<Heatmap[]> {
    try {
      const { data, error } = await supabase
        .from("heatmap")
        .select("*")
        .filter("location", "cs", `(${latitude},${longitude}),${radiusKm}`);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Failed to get heatmap data:", error);
      return [];
    }
  }

  async rateWalk(walkId: string, rating: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("walks")
        .update({ rating })
        .eq("id", walkId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Failed to rate walk:", error);
      return false;
    }
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Failed to get user profile:", error);
      return null;
    }
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("user_profiles")
        .update(updates)
        .eq("id", userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Failed to update user profile:", error);
      return false;
    }
  }

  async getWalkStats(userId: string): Promise<{
    totalWalks: number;
    totalDistance: number;
    weeklyDistance: number;
    streak: number;
  } | null> {
    try {
      const { data, error } = await supabase
        .from("walk_stats")
        .select("*")
        .eq("userId", userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Failed to get walk stats:", error);
      return null;
    }
  }

  async createWalkRoute(route: Omit<WalkRoute, "id" | "createdAt">): Promise<WalkRoute | null> {
    try {
      const { data, error } = await supabase
        .from("walk_routes")
        .insert([
          {
            ...route,
            createdAt: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Failed to create walk route:", error);
      return null;
    }
  }

  async getTopRoutes(limit: number = 10): Promise<WalkRoute[]> {
    try {
      const { data, error } = await supabase
        .from("walk_routes")
        .select("*")
        .order("rating", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Failed to get top routes:", error);
      return [];
    }
  }
}

export const supabaseService = new SupabaseService();

export function useSupabaseService() {
  const uploadWalk = async (walk: Omit<Walk, "id" | "createdAt" | "updatedAt">) => {
    return supabaseService.uploadWalk(walk);
  };

  const getWalkRoutes = async (latitude: number, longitude: number, radiusKm?: number) => {
    return supabaseService.getWalkRoutes(latitude, longitude, radiusKm);
  };

  const getHeatmapData = async (latitude: number, longitude: number, radiusKm?: number) => {
    return supabaseService.getHeatmapData(latitude, longitude, radiusKm);
  };

  const rateWalk = async (walkId: string, rating: number) => {
    return supabaseService.rateWalk(walkId, rating);
  };

  const getUserProfile = async (userId: string) => {
    return supabaseService.getUserProfile(userId);
  };

  const getWalkStats = async (userId: string) => {
    return supabaseService.getWalkStats(userId);
  };

  return {
    uploadWalk,
    getWalkRoutes,
    getHeatmapData,
    rateWalk,
    getUserProfile,
    getWalkStats,
  };
}

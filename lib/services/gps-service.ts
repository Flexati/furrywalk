import * as Location from "expo-location";
import { useState, useCallback } from "react";

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface WalkStats {
  distance: number; // in km
  duration: number; // in seconds
  avgSpeed: number; // in km/h
  locations: LocationData[];
}

class GPSService {
  private locationSubscription: Location.LocationSubscription | null = null;
  private locations: LocationData[] = [];
  private isTracking = false;

  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === "granted";
    } catch (error) {
      console.error("Permission request failed:", error);
      return false;
    }
  }

  async startTracking(onLocationChange?: (location: LocationData) => void): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return false;

      this.isTracking = true;
      this.locations = [];

      // High accuracy for walk tracking, but with battery optimization
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Update every 5 seconds for battery efficiency
          distanceInterval: 10, // Update every 10 meters
        },
        (location: Location.LocationObject) => {
          const locationData: LocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || 0,
            timestamp: location.timestamp,
          };

          this.locations.push(locationData);
          onLocationChange?.(locationData);
        }
      );

      return true;
    } catch (error) {
      console.error("Failed to start tracking:", error);
      this.isTracking = false;
      return false;
    }
  }

  stopTracking(): WalkStats {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }

    this.isTracking = false;
    return this.calculateStats();
  }

  private calculateStats(): WalkStats {
    if (this.locations.length < 2) {
      return {
        distance: 0,
        duration: 0,
        avgSpeed: 0,
        locations: this.locations,
      };
    }

    // Calculate distance using Haversine formula
    let totalDistance = 0;
    for (let i = 1; i < this.locations.length; i++) {
      const prev = this.locations[i - 1];
      const curr = this.locations[i];
      totalDistance += this.haversineDistance(
        prev.latitude,
        prev.longitude,
        curr.latitude,
        curr.longitude
      );
    }

    // Calculate duration
    const firstLocation = this.locations[0];
    const lastLocation = this.locations[this.locations.length - 1];
    const duration = (lastLocation.timestamp - firstLocation.timestamp) / 1000; // in seconds

    // Calculate average speed
    const avgSpeed = duration > 0 ? (totalDistance / duration) * 3.6 : 0; // convert m/s to km/h

    return {
      distance: totalDistance / 1000, // convert to km
      duration,
      avgSpeed,
      locations: this.locations,
    };
  }

  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  getLocations(): LocationData[] {
    return this.locations;
  }
}

export const gpsService = new GPSService();

export function useGPSTracking() {
  const [stats, setStats] = useState<WalkStats>({
    distance: 0,
    duration: 0,
    avgSpeed: 0,
    locations: [],
  });
  const [isTracking, setIsTracking] = useState(false);

  const startTracking = useCallback(async () => {
    const success = await gpsService.startTracking((location) => {
      // Update stats in real-time
      const currentStats = gpsService.stopTracking();
      gpsService.startTracking(); // Restart to continue tracking
      setStats(currentStats);
    });
    setIsTracking(success);
    return success;
  }, []);

  const stopTracking = useCallback(() => {
    const finalStats = gpsService.stopTracking();
    setStats(finalStats);
    setIsTracking(false);
    return finalStats;
  }, []);

  return {
    stats,
    isTracking,
    startTracking,
    stopTracking,
  };
}

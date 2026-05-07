import * as Location from "expo-location";
import { useState, useCallback, useRef, useEffect } from "react";

export interface LocationPoint {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface WalkStats {
  distance: number; // km
  duration: number; // seconds
  avgSpeed: number; // km/h
  locations: LocationPoint[];
}

const R_EARTH = 6371000;

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export function haversineMeters(a: LocationPoint, b: LocationPoint): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R_EARTH * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export async function requestLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === "granted";
  } catch (e) {
    console.warn("[gps] permission failed", e);
    return false;
  }
}

export async function getCurrentLocation(): Promise<LocationPoint | null> {
  try {
    const ok = await requestLocationPermission();
    if (!ok) return null;
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy: loc.coords.accuracy ?? 0,
      timestamp: loc.timestamp,
    };
  } catch (e) {
    console.warn("[gps] getCurrentLocation failed", e);
    return null;
  }
}

export function useGPSTracking() {
  const [stats, setStats] = useState<WalkStats>({
    distance: 0,
    duration: 0,
    avgSpeed: 0,
    locations: [],
  });
  const [isTracking, setIsTracking] = useState(false);
  const subRef = useRef<Location.LocationSubscription | null>(null);
  const pointsRef = useRef<LocationPoint[]>([]);
  const distanceMetersRef = useRef(0);
  const startTsRef = useRef<number>(0);

  const startTracking = useCallback(async () => {
    const ok = await requestLocationPermission();
    if (!ok) return false;

    pointsRef.current = [];
    distanceMetersRef.current = 0;
    startTsRef.current = Date.now();
    setStats({ distance: 0, duration: 0, avgSpeed: 0, locations: [] });

    try {
      subRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,
          distanceInterval: 5,
        },
        (loc) => {
          const p: LocationPoint = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy ?? 0,
            timestamp: loc.timestamp,
          };
          const prev = pointsRef.current[pointsRef.current.length - 1];
          if (prev) {
            const seg = haversineMeters(prev, p);
            // Skip outliers (e.g., GPS jitter > 100m in <3s)
            if (seg < 200) distanceMetersRef.current += seg;
          }
          pointsRef.current.push(p);
          const durationSec = (Date.now() - startTsRef.current) / 1000;
          const km = distanceMetersRef.current / 1000;
          setStats({
            distance: km,
            duration: durationSec,
            avgSpeed: durationSec > 0 ? (km / durationSec) * 3600 : 0,
            locations: [...pointsRef.current],
          });
        }
      );
      setIsTracking(true);
      return true;
    } catch (e) {
      console.warn("[gps] startTracking failed", e);
      return false;
    }
  }, []);

  const stopTracking = useCallback((): WalkStats => {
    if (subRef.current) {
      subRef.current.remove();
      subRef.current = null;
    }
    setIsTracking(false);
    const durationSec = (Date.now() - (startTsRef.current || Date.now())) / 1000;
    const km = distanceMetersRef.current / 1000;
    const final: WalkStats = {
      distance: km,
      duration: durationSec,
      avgSpeed: durationSec > 0 ? (km / durationSec) * 3600 : 0,
      locations: [...pointsRef.current],
    };
    setStats(final);
    return final;
  }, []);

  useEffect(() => {
    return () => {
      if (subRef.current) {
        subRef.current.remove();
        subRef.current = null;
      }
    };
  }, []);

  return { stats, isTracking, startTracking, stopTracking };
}

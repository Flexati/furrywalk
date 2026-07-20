import { describe, it, expect, vi } from "vitest";

// gps-service imports expo-location (native). Mock it so the pure
// haversine math can run under Node/Vitest.
vi.mock("expo-location", () => ({}));

import { haversineMeters, type LocationPoint } from "../../lib/services/gps-service";

const P = (latitude: number, longitude: number): LocationPoint => ({
  latitude,
  longitude,
  accuracy: 5,
  timestamp: 0,
});

// Earth circumference ≈ 40030 km → 1 degree ≈ 111195 m
const DEG_M = 111194.93;
const TOL = DEG_M * 0.005; // ±0.5%

describe("haversineMeters (GPS distance core)", () => {
  it("returns 0 for identical points", () => {
    expect(haversineMeters(P(45, 9), P(45, 9))).toBe(0);
  });

  it("computes ~111.195 km for 1° of latitude", () => {
    expect(haversineMeters(P(0, 0), P(1, 0))).toBeGreaterThan(DEG_M - TOL);
    expect(haversineMeters(P(0, 0), P(1, 0))).toBeLessThan(DEG_M + TOL);
  });

  it("computes ~111.195 km for 1° of longitude at the equator", () => {
    expect(haversineMeters(P(0, 0), P(0, 1))).toBeGreaterThan(DEG_M - TOL);
    expect(haversineMeters(P(0, 0), P(0, 1))).toBeLessThan(DEG_M + TOL);
  });

  it("is symmetric (a→b equals b→a)", () => {
    const a = P(41.89, 12.49);
    const b = P(45.46, 9.19);
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 6);
  });

  it("ignores the accuracy field when computing distance", () => {
    const a = P(0, 0);
    const b = P(0, 1);
    const precise = haversineMeters(a, { ...b, accuracy: 5 });
    const noisy = haversineMeters(a, { ...b, accuracy: 999 });
    expect(precise).toBe(noisy);
  });

  it("scales correctly with latitude (1° lon shrinks toward the poles)", () => {
    const atEquator = haversineMeters(P(0, 0), P(0, 1));
    const at45 = haversineMeters(P(45, 0), P(45, 1));
    expect(at45).toBeLessThan(atEquator);
    // cos(45°) ≈ 0.7071
    expect(at45 / atEquator).toBeCloseTo(Math.cos((45 * Math.PI) / 180), 2);
  });

  it("handles antipodal points (~half Earth circumference)", () => {
    const d = haversineMeters(P(0, 0), P(0, 180));
    // π * R ≈ 20,015,087 m
    expect(d).toBeGreaterThan(20000000 - 20000);
    expect(d).toBeLessThan(20000000 + 20000);
  });
});

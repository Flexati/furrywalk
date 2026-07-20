import { describe, it, expect, vi, beforeEach } from "vitest";

// Replace the Supabase client with a controllable stub. The analytics
// service only ever queries the "walks" table here.
vi.mock("../../lib/services/supabase-service", () => {
  let walks: any[] = [];
  const query = (value: unknown) => {
    const fn = function () {};
    const proxy = new Proxy(fn, {
      get(_t, prop) {
        if (prop === "then") return (resolve: (v: unknown) => void) => resolve(value);
        if (prop === "catch" || prop === "finally") return undefined;
        return () => proxy;
      },
      apply() {
        return proxy;
      },
    });
    return proxy as unknown as Promise<unknown> & Record<string, unknown>;
  };
  return {
    supabase: { from: () => query({ data: walks, error: null }) },
    __setWalks: (w: any[]) => {
      walks = w;
    },
  };
});

import { analyticsService } from "../../lib/services/analytics-service";
import * as supabaseService from "../../lib/services/supabase-service";

const { __setWalks } = supabaseService as unknown as {
  __setWalks: (w: unknown[]) => void;
};

const day = (offset: number) => {
  const d = new Date("2026-06-01T18:00:00Z");
  d.setDate(d.getDate() - offset);
  return d.toISOString();
};

const walk = (offset: number, durationSec = 600) => ({
  id: `w_${offset}`,
  userId: "u1",
  distance: 2.5,
  duration: durationSec,
  createdAt: day(offset),
});

beforeEach(() => __setWalks([]));

describe("analytics.getHealthStats — streaks", () => {
  it("returns all zeros when there are no walks", async () => {
    const stats = await analyticsService.getHealthStats("u1");
    expect(stats).toMatchObject({
      totalWalks: 0,
      currentStreak: 0,
      longestStreak: 0,
    });
  });

  it("resets the streak on a gap day", async () => {
    // day 0 and day -2 → a 2-day gap breaks the run.
    __setWalks([walk(0), walk(2)]);
    const stats = await analyticsService.getHealthStats("u1");
    expect(stats?.currentStreak).toBe(1);
    expect(stats?.longestStreak).toBe(1);
  });

  it("counts an unbroken multi-day run", async () => {
    // Newest first (as the real query orders createdAt desc).
    __setWalks([walk(0), walk(1), walk(2)]);
    const stats = await analyticsService.getHealthStats("u1");
    expect(stats?.longestStreak).toBe(3);
    // The bug was fixed, currentStreak accurately reflects the 3 day unbroken run
    expect(stats?.currentStreak).toBe(3);
  });
});

describe("analytics.getDailyStats — calories", () => {
  it("estimates calories from duration at a fixed 20 kg dog weight", async () => {
    // 3600 s = 1 h → 20 kg * 7.5 cal/h = 150 cal.
    __setWalks([walk(0, 3600)]);
    const stats = await analyticsService.getDailyStats("u1", "2026-06-01");
    expect(stats?.caloriesBurned).toBe(150);
    expect(stats?.walkCount).toBe(1);
  });

  it("sums distance and duration across multiple walks in a day", async () => {
    __setWalks([walk(0, 600), walk(0, 1200)]);
    const stats = await analyticsService.getDailyStats("u1", "2026-06-01");
    expect(stats?.walkCount).toBe(2);
    expect(stats?.duration).toBe(1800);
    expect(stats?.distance).toBeCloseTo(5, 5);
  });
});

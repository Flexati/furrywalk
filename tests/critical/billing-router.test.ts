import { describe, it, expect, vi, beforeEach } from "vitest";

// Replace the DB layer so billing logic can be exercised without Postgres.
vi.mock("../../server/db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "../../server/db";
import { appRouter } from "../../server/routers";
import type { TrpcContext } from "../../server/_core/context";

/**
 * A thenable + chainable stand-in for a drizzle query builder.
 * Every method returns the same proxy; awaiting it resolves to `value`.
 */
function query(value: unknown) {
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
}

let selectResult: unknown[] = [];

function makeDb() {
  return {
    select: () => query(selectResult),
    insert: () => query(undefined),
    update: () => query(undefined),
  };
}

function makeCtx(user: TrpcContext["user"]): TrpcContext {
  return {
    user,
    req: { protocol: "https", hostname: "localhost", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const user: NonNullable<TrpcContext["user"]> = {
  id: 7,
  openId: "billing-user",
  email: "billing@example.com",
  name: "Billing User",
  loginMethod: "manus",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

beforeEach(() => {
  selectResult = [];
  vi.mocked(getDb).mockReset();
});

describe("subscription.getStatus", () => {
  it("rejects unauthenticated callers (no premium leak)", async () => {
    vi.mocked(getDb).mockResolvedValue(makeDb() as never);
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.subscription.getStatus()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("degrades to free tier when the database is unavailable", async () => {
    vi.mocked(getDb).mockResolvedValue(null);
    const caller = appRouter.createCaller(makeCtx(user));
    const status = await caller.subscription.getStatus();
    expect(status.tier).toBe("free_with_ads");
    expect(status.status).toBe("active");
  });

  it("returns the active subscription tier from the database", async () => {
    selectResult = [
      {
        tier: "pro_ad_free",
        status: "active",
        currentPeriodEnd: new Date(),
        trialEnd: null,
        cancelAtPeriodEnd: false,
        paymentMethodBrand: "visa",
        paymentMethodLast4: "4242",
      },
    ];
    vi.mocked(getDb).mockResolvedValue(makeDb() as never);
    const caller = appRouter.createCaller(makeCtx(user));
    const status = await caller.subscription.getStatus();
    expect(status.tier).toBe("pro_ad_free");
    expect(status.paymentMethodLast4).toBe("4242");
  });
});

describe("subscription.syncPlayBilling", () => {
  it("refuses to sync when the database is unavailable", async () => {
    vi.mocked(getDb).mockResolvedValue(null);
    const caller = appRouter.createCaller(makeCtx(user));
    await expect(
      caller.subscription.syncPlayBilling({
        purchaseToken: "tok_123",
        productId: "premium_monthly",
      }),
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });

  it("records a new subscription and disables ads", async () => {
    // No existing record for this purchase token → insert path.
    vi.mocked(getDb).mockResolvedValue(makeDb() as never);
    const caller = appRouter.createCaller(makeCtx(user));
    const res = await caller.subscription.syncPlayBilling({
      purchaseToken: "tok_abc",
      productId: "premium_monthly",
    });
    expect(res).toMatchObject({ synced: true, tier: "pro_ad_free", alreadyRecorded: false });
  });

  it("is idempotent for a duplicate purchase token", async () => {
    selectResult = [{ id: 99 }];
    vi.mocked(getDb).mockResolvedValue(makeDb() as never);
    const caller = appRouter.createCaller(makeCtx(user));
    const res = await caller.subscription.syncPlayBilling({
      purchaseToken: "tok_dup",
      productId: "premium_yearly",
    });
    expect(res).toMatchObject({ synced: true, alreadyRecorded: true, tier: "pro_ad_free" });
  });

  it("defaults an unknown SKU to pro_ad_free / monthly", async () => {
    vi.mocked(getDb).mockResolvedValue(makeDb() as never);
    const caller = appRouter.createCaller(makeCtx(user));
    const res = await caller.subscription.syncPlayBilling({
      purchaseToken: "tok_unknown",
      productId: "mystery_sku",
    });
    expect(res).toMatchObject({ synced: true, tier: "pro_ad_free" });
  });
});

describe("subscription.restore", () => {
  it("reports no restore when there is no active subscription", async () => {
    selectResult = [{ status: "cancelled", tier: "pro_ad_free" }];
    vi.mocked(getDb).mockResolvedValue(makeDb() as never);
    const caller = appRouter.createCaller(makeCtx(user));
    const res = await caller.subscription.restore();
    expect(res).toEqual({ restored: false, tier: "free_with_ads" });
  });

  it("restores the active subscription tier", async () => {
    selectResult = [{ status: "active", tier: "pro_family" }];
    vi.mocked(getDb).mockResolvedValue(makeDb() as never);
    const caller = appRouter.createCaller(makeCtx(user));
    const res = await caller.subscription.restore();
    expect(res).toEqual({ restored: true, tier: "pro_family" });
  });
});

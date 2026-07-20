import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "../../server/routers";
import { COOKIE_NAME } from "../../shared/const";
import type { TrpcContext } from "../../server/_core/context";

type CookieCall = { name: string; options: Record<string, unknown> };

function makeCtx(user: TrpcContext["user"], secure = true): {
  ctx: TrpcContext;
  cleared: CookieCall[];
} {
  const cleared: CookieCall[] = [];
  const ctx: TrpcContext = {
    user,
    req: {
      protocol: secure ? "https" : "http",
      hostname: "passeggiata-furba.vercel.app",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        cleared.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, cleared };
}

const sampleUser: NonNullable<TrpcContext["user"]> = {
  id: 1,
  openId: "sample-user",
  email: "sample@example.com",
  name: "Sample User",
  loginMethod: "manus",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

describe("auth.session", () => {
  it("me returns the authenticated user", async () => {
    const { ctx } = makeCtx(sampleUser);
    const caller = appRouter.createCaller(ctx);
    const me = await caller.auth.me();
    expect(me).toEqual(sampleUser);
  });

  it("logout clears the session cookie with safe options", async () => {
    const { ctx, cleared } = makeCtx(sampleUser, true);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(cleared).toHaveLength(1);
    expect(cleared[0]?.name).toBe(COOKIE_NAME);
    expect(cleared[0]?.options).toMatchObject({
      maxAge: -1,
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/",
    });
  });

  it("marks the cookie non-secure on plain-HTTP requests", async () => {
    const { ctx, cleared } = makeCtx(sampleUser, false);
    const caller = appRouter.createCaller(ctx);

    await caller.auth.logout();

    expect(cleared[0]?.options.secure).toBe(false);
  });
});

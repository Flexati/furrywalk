import { TRPCError } from "@trpc/server";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";
import {
  subscriptions,
  adTiers,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

export const subscriptionRouter = router({
  /** Get current subscription status for the authenticated user. */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return {
        tier: "free_with_ads" as const,
        status: "active" as const,
        currentPeriodEnd: null,
        trialEnd: null,
        cancelAtPeriodEnd: false,
      };
    }

    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, ctx.user.id),
          eq(subscriptions.status, "active"),
        ),
      )
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    if (!sub) {
      return {
        tier: "free_with_ads" as const,
        status: "active" as const,
        currentPeriodEnd: null,
        trialEnd: null,
        cancelAtPeriodEnd: false,
      };
    }

    return {
      tier: sub.tier,
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd,
      trialEnd: sub.trialEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      paymentMethodBrand: sub.paymentMethodBrand,
      paymentMethodLast4: sub.paymentMethodLast4,
    };
  }),

  /** Restore purchases across devices by verifying with LS API. */
  restore: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const allSubs = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, ctx.user.id))
      .orderBy(desc(subscriptions.createdAt));

    const activeSub = allSubs.find(
      (s) => s.status === "active" || s.status === "on_trial",
    );

    if (activeSub && process.env.LEMON_SQUEEZY_API_KEY) {
      try {
        const lsResponse = await fetch(
          `https://api.lemonsqueezy.com/v1/subscriptions/${activeSub.lemonSqueezySubscriptionId}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.LEMON_SQUEEZY_API_KEY}`,
              Accept: "application/vnd.api+json",
            },
          },
        );

        if (lsResponse.ok) {
          await db
            .update(adTiers)
            .set({
              tier: activeSub.tier,
              bannerEnabled: activeSub.tier === "free_with_ads",
              rewardedEnabled: activeSub.tier === "free_with_ads",
            })
            .where(eq(adTiers.userId, ctx.user.id));

          return { restored: true, tier: activeSub.tier };
        }
      } catch {
        // LS API unreachable — trust local state
        return { restored: true, tier: activeSub.tier };
      }
    }

    return { restored: false, tier: "free_with_ads" as const };
  }),

  /** Sync subscription state after LS checkout redirect. */
  sync: protectedProcedure
    .input(
      z.object({
        checkoutSessionId: z.string().optional(),
        subscriptionId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!process.env.LEMON_SQUEEZY_API_KEY) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "LS API key not configured" });
      }

      const endpoint = input.subscriptionId
        ? `https://api.lemonsqueezy.com/v1/subscriptions/${input.subscriptionId}`
        : input.checkoutSessionId
          ? `https://api.lemonsqueezy.com/v1/checkouts/${input.checkoutSessionId}`
          : null;

      if (!endpoint) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Missing subscriptionId or checkoutSessionId" });
      }

      const lsResponse = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${process.env.LEMON_SQUEEZY_API_KEY}`,
          Accept: "application/vnd.api+json",
        },
      });

      if (!lsResponse.ok) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Failed to verify subscription with Lemon Squeezy" });
      }

      const data = await lsResponse.json();
      const attrs = data.data.attributes as Record<string, unknown>;
      const resolvedTier = String(attrs.variant_name ?? "").includes("family")
        ? ("pro_family" as const)
        : ("pro_ad_free" as const);

      const rawStatus = String(attrs.status ?? "active");
      const validStatuses = ["on_trial", "active", "past_due", "cancelled", "expired", "paused", "unpaid"] as const;
      const status = validStatuses.includes(rawStatus as typeof validStatuses[number])
        ? (rawStatus as typeof validStatuses[number])
        : ("active" as const);

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.insert(subscriptions).values({
        userId: ctx.user.id,
        lemonSqueezySubscriptionId: String(data.data.id),
        lemonSqueezyVariantId: String(attrs.variant_id ?? ""),
        lemonSqueezyProductId: String(attrs.product_id ?? ""),
        tier: resolvedTier,
        status,
        currentPeriodStart: new Date((attrs.current_period_start as string) ?? Date.now()),
        currentPeriodEnd: new Date((attrs.current_period_end as string) ?? Date.now()),
        trialStart: attrs.trial_start ? new Date(attrs.trial_start as string) : null,
        trialEnd: attrs.trial_end ? new Date(attrs.trial_end as string) : null,
      });

      // Update ad tier cache: pro users get no ads
      await db
        .update(adTiers)
        .set({
          tier: resolvedTier as "pro_ad_free" | "pro_family",
          bannerEnabled: false,
          rewardedEnabled: false,
          interstitialEnabled: false,
        })
        .where(eq(adTiers.userId, ctx.user.id));

      return { synced: true, tier: resolvedTier };
    }),
});

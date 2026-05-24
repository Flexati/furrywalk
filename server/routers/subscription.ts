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

  /** Restore purchases — check local DB for active subscription. */
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

    if (activeSub) {
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

    return { restored: false, tier: "free_with_ads" as const };
  }),

  /** Sync a Google Play Billing purchase after successful checkout. */
  syncPlayBilling: protectedProcedure
    .input(
      z.object({
        purchaseToken: z.string(),
        productId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Map SKU to tier/interval
      const skuToTier: Record<
        string,
        { tier: "pro_ad_free" | "pro_family"; interval: "monthly" | "yearly" }
      > = {
        premium_monthly: { tier: "pro_ad_free", interval: "monthly" },
        premium_yearly: { tier: "pro_ad_free", interval: "yearly" },
      };

      const mapping = skuToTier[input.productId] ?? {
        tier: "pro_ad_free" as const,
        interval: "monthly" as const,
      };

      const now = new Date();
      const periodEnd = new Date(now);
      if (mapping.interval === "monthly") periodEnd.setMonth(periodEnd.getMonth() + 1);
      else periodEnd.setFullYear(periodEnd.getFullYear() + 1);

      // Check for duplicate purchase token
      const [existing] = await db
        .select({ id: subscriptions.id })
        .from(subscriptions)
        .where(eq(subscriptions.lemonSqueezySubscriptionId, input.purchaseToken))
        .limit(1);

      if (existing) {
        return { synced: true, tier: mapping.tier, alreadyRecorded: true };
      }

      // Insert subscription record (reuse LS columns for Play Billing data)
      await db.insert(subscriptions).values({
        userId: ctx.user.id,
        lemonSqueezySubscriptionId: input.purchaseToken, // stores Play Store purchase token
        lemonSqueezyVariantId: input.productId, // stores Play Store product ID
        lemonSqueezyProductId: "google-play",
        tier: mapping.tier,
        status: "active" as const,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      });

      // Update ad tier: pro users get no ads
      await db
        .update(adTiers)
        .set({
          tier: mapping.tier,
          bannerEnabled: false,
          rewardedEnabled: false,
          interstitialEnabled: false,
        })
        .where(eq(adTiers.userId, ctx.user.id));

      return { synced: true, tier: mapping.tier };
    }),
});

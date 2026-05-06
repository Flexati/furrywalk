import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { adTiers } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const adRouter = router({
  /** Get ad configuration for current user. */
  getConfig: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return {
        tier: "free_with_ads" as const,
        bannerEnabled: true,
        rewardedEnabled: true,
        interstitialEnabled: false,
        rewardedFrequencyCap: 3,
        rewardedCountToday: 0,
        consentIabTcf: false,
        consentAttIos: false,
        adPersonalization: false,
      };
    }

    const [config] = await db
      .select()
      .from(adTiers)
      .where(eq(adTiers.userId, ctx.user.id))
      .limit(1);

    if (!config) {
      // First access — seed default free tier config
      await db.insert(adTiers).values({
        userId: ctx.user.id,
        tier: "free_with_ads",
        bannerEnabled: true,
        rewardedEnabled: true,
        interstitialEnabled: false,
        rewardedFrequencyCap: 3,
        rewardedCountToday: 0,
        consentIabTcf: false,
        consentAttIos: false,
        adPersonalization: false,
      });

      return {
        tier: "free_with_ads" as const,
        bannerEnabled: true,
        rewardedEnabled: true,
        interstitialEnabled: false,
        rewardedFrequencyCap: 3,
        rewardedCountToday: 0,
        consentIabTcf: false,
        consentAttIos: false,
        adPersonalization: false,
      };
    }

    return {
      tier: config.tier as "free_with_ads" | "pro_ad_free" | "pro_family",
      bannerEnabled: config.bannerEnabled,
      rewardedEnabled: config.rewardedEnabled,
      interstitialEnabled: config.interstitialEnabled,
      rewardedFrequencyCap: config.rewardedFrequencyCap,
      rewardedCountToday: config.rewardedCountToday,
      consentIabTcf: config.consentIabTcf,
      consentAttIos: config.consentAttIos,
      adPersonalization: config.adPersonalization,
    };
  }),

  /** Record a rewarded ad view and check frequency cap. */
  recordRewardedView: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { allowed: false, count: 0, cap: 0, remaining: 0 };

    const [config] = await db
      .select()
      .from(adTiers)
      .where(eq(adTiers.userId, ctx.user.id))
      .limit(1);

    if (!config || config.tier !== "free_with_ads") {
      return { allowed: false, count: 0, cap: 0, remaining: 0 };
    }

    const newCount = (config.rewardedCountToday ?? 0) + 1;
    const cap = config.rewardedFrequencyCap ?? 3;

    await db
      .update(adTiers)
      .set({
        rewardedCountToday: newCount,
        lastRewardedAt: new Date(),
      })
      .where(eq(adTiers.userId, ctx.user.id));

    return {
      allowed: newCount <= cap,
      count: newCount,
      cap,
      remaining: Math.max(0, cap - newCount),
    };
  }),

  /** Update consent preferences (IAB TCF 2.2, ATT, GDPR). */
  updateConsent: protectedProcedure
    .input(
      z.object({
        iabTcf: z.boolean().optional(),
        attIos: z.boolean().optional(),
        gdpr: z
          .object({
            necessary: z.boolean(),
            preferences: z.boolean(),
            statistics: z.boolean(),
            marketing: z.boolean(),
          })
          .optional(),
        adPersonalization: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const updateSet: Record<string, unknown> = {};
      if (input.iabTcf !== undefined) updateSet.consentIabTcf = input.iabTcf;
      if (input.attIos !== undefined) updateSet.consentAttIos = input.attIos;
      if (input.gdpr !== undefined) updateSet.consentGdpr = input.gdpr;
      if (input.adPersonalization !== undefined) updateSet.adPersonalization = input.adPersonalization;

      await db
        .update(adTiers)
        .set(updateSet)
        .where(eq(adTiers.userId, ctx.user.id));

      return { updated: true };
    }),
});

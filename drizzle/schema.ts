import {
  boolean,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Monetization: Subscription Tiers ───
export const subscriptions = mysqlTable(
  "subscriptions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lemonSqueezySubscriptionId: varchar("lsSubscriptionId", { length: 128 })
      .notNull()
      .unique(),
    lemonSqueezyVariantId: varchar("lsVariantId", { length: 64 }).notNull(),
    lemonSqueezyProductId: varchar("lsProductId", { length: 64 }).notNull(),
    tier: mysqlEnum("tier", ["free_with_ads", "pro_ad_free", "pro_family"])
      .notNull()
      .default("free_with_ads"),
    status: mysqlEnum("status", [
      "on_trial",
      "active",
      "past_due",
      "cancelled",
      "expired",
      "paused",
      "unpaid",
    ])
      .notNull()
      .default("active"),
    currentPeriodStart: timestamp("currentPeriodStart").notNull(),
    currentPeriodEnd: timestamp("currentPeriodEnd").notNull(),
    trialStart: timestamp("trialStart"),
    trialEnd: timestamp("trialEnd"),
    cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").default(false),
    paymentMethodBrand: varchar("paymentMethodBrand", { length: 32 }),
    paymentMethodLast4: varchar("paymentMethodLast4", { length: 4 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("subs_userId_idx").on(table.userId),
    index("subs_status_idx").on(table.status),
  ],
);

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

// ─── Ad Tier Configuration (cached per user) ───
export const adTiers = mysqlTable(
  "adTiers",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tier: mysqlEnum("tier", ["free_with_ads", "pro_ad_free", "pro_family"])
      .notNull()
      .default("free_with_ads"),
    bannerEnabled: boolean("bannerEnabled").default(true),
    rewardedEnabled: boolean("rewardedEnabled").default(true),
    interstitialEnabled: boolean("interstitialEnabled").default(false),
    rewardedFrequencyCap: int("rewardedFrequencyCap").default(3),
    rewardedCountToday: int("rewardedCountToday").default(0),
    lastRewardedAt: timestamp("lastRewardedAt"),
    consentIabTcf: boolean("consentIabTcf").default(false),
    consentAttIos: boolean("consentAttIos").default(false),
    consentGdpr: json("consentGdpr").$type<{
      necessary: boolean;
      preferences: boolean;
      statistics: boolean;
      marketing: boolean;
    }>(),
    adPersonalization: boolean("adPersonalization").default(false),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("adTiers_userId_unique").on(table.userId),
  ],
);

export type AdTier = typeof adTiers.$inferSelect;
export type InsertAdTier = typeof adTiers.$inferInsert;

// ─── Webhook Events (Idempotency) ───
export const webhookEvents = mysqlTable(
  "webhookEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    lsEventId: varchar("lsEventId", { length: 128 }).notNull(),
    eventType: varchar("eventType", { length: 64 }).notNull(),
    eventName: varchar("eventName", { length: 128 }).notNull(),
    payload: json("payload").notNull(),
    signatureValid: boolean("signatureValid").notNull().default(false),
    processed: boolean("processed").notNull().default(false),
    processingErrors: json("processingErrors").$type<string[]>(),
    retryCount: int("retryCount").default(0),
    receivedAt: timestamp("receivedAt").defaultNow().notNull(),
    processedAt: timestamp("processedAt"),
  },
  (table) => [
    uniqueIndex("webhookEvent_lsEventId_unique").on(table.lsEventId),
    index("webhookEvent_processed_idx").on(table.processed),
  ],
);

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type InsertWebhookEvent = typeof webhookEvents.$inferInsert;

// ─── Receipts (VAT-compliant) ───
export const receipts = mysqlTable(
  "receipts",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subscriptionId: int("subscriptionId").references(() => subscriptions.id),
    lemonSqueezyOrderId: varchar("lsOrderId", { length: 128 }).notNull().unique(),
    amountEur: decimal("amountEur", { precision: 8, scale: 2 }).notNull(),
    vatRatePct: decimal("vatRatePct", { precision: 5, scale: 2 }),
    vatAmountEur: decimal("vatAmountEur", { precision: 8, scale: 2 }),
    totalEur: decimal("totalEur", { precision: 8, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("EUR"),
    countryCode: varchar("countryCode", { length: 2 }),
    invoiceUrl: varchar("invoiceUrl", { length: 512 }),
    invoiceNumber: varchar("invoiceNumber", { length: 64 }),
    periodStart: timestamp("periodStart"),
    periodEnd: timestamp("periodEnd"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("receipts_userId_idx").on(table.userId),
  ],
);

export type Receipt = typeof receipts.$inferSelect;
export type InsertReceipt = typeof receipts.$inferInsert;

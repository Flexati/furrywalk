CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('on_trial', 'active', 'past_due', 'cancelled', 'expired', 'paused', 'unpaid');--> statement-breakpoint
CREATE TYPE "public"."tier" AS ENUM('free_with_ads', 'pro_ad_free', 'pro_family');--> statement-breakpoint
CREATE TABLE "adTiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"tier" "tier" DEFAULT 'free_with_ads' NOT NULL,
	"bannerEnabled" boolean DEFAULT true,
	"rewardedEnabled" boolean DEFAULT true,
	"interstitialEnabled" boolean DEFAULT false,
	"rewardedFrequencyCap" integer DEFAULT 3,
	"rewardedCountToday" integer DEFAULT 0,
	"lastRewardedAt" timestamp,
	"consentIabTcf" boolean DEFAULT false,
	"consentAttIos" boolean DEFAULT false,
	"consentGdpr" jsonb,
	"adPersonalization" boolean DEFAULT false,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"subscriptionId" integer,
	"lsOrderId" varchar(128) NOT NULL,
	"amountEur" numeric(8, 2) NOT NULL,
	"vatRatePct" numeric(5, 2),
	"vatAmountEur" numeric(8, 2),
	"totalEur" numeric(8, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'EUR',
	"countryCode" varchar(2),
	"invoiceUrl" varchar(512),
	"invoiceNumber" varchar(64),
	"periodStart" timestamp,
	"periodEnd" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "receipts_lsOrderId_unique" UNIQUE("lsOrderId")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"lsSubscriptionId" varchar(128) NOT NULL,
	"lsVariantId" varchar(64) NOT NULL,
	"lsProductId" varchar(64) NOT NULL,
	"tier" "tier" DEFAULT 'free_with_ads' NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"currentPeriodStart" timestamp NOT NULL,
	"currentPeriodEnd" timestamp NOT NULL,
	"trialStart" timestamp,
	"trialEnd" timestamp,
	"cancelAtPeriodEnd" boolean DEFAULT false,
	"paymentMethodBrand" varchar(32),
	"paymentMethodLast4" varchar(4),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_lsSubscriptionId_unique" UNIQUE("lsSubscriptionId")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "webhookEvents" (
	"id" serial PRIMARY KEY NOT NULL,
	"lsEventId" varchar(128) NOT NULL,
	"eventType" varchar(64) NOT NULL,
	"eventName" varchar(128) NOT NULL,
	"payload" jsonb NOT NULL,
	"signatureValid" boolean DEFAULT false NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"processingErrors" jsonb,
	"retryCount" integer DEFAULT 0,
	"receivedAt" timestamp DEFAULT now() NOT NULL,
	"processedAt" timestamp
);
--> statement-breakpoint
ALTER TABLE "adTiers" ADD CONSTRAINT "adTiers_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_subscriptionId_subscriptions_id_fk" FOREIGN KEY ("subscriptionId") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "adTiers_userId_unique" ON "adTiers" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "receipts_userId_idx" ON "receipts" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "subs_userId_idx" ON "subscriptions" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "subs_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "webhookEvent_lsEventId_unique" ON "webhookEvents" USING btree ("lsEventId");--> statement-breakpoint
CREATE INDEX "webhookEvent_processed_idx" ON "webhookEvents" USING btree ("processed");
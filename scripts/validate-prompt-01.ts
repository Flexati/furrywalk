/**
 * Validates PROMPT-01 monetization strategy JSON against Zod schema.
 * Usage: npx tsx scripts/validate-prompt-01.ts [path-to-json]
 */
import { z } from "zod";
import fs from "fs";

const adConfigSchema = z.object({
  banner: z.boolean(),
  interstitial: z.boolean(),
  rewarded: z.boolean(),
  frequency_cap: z.number().int().min(0),
  eCPM_target: z.number().min(0),
});

const tierSchema = z.object({
  id: z.enum(["free_with_ads", "pro_ad_free", "pro_family"]),
  price_monthly_eur: z.number().nullable(),
  price_yearly_eur: z.number().nullable(),
  discount_pct: z.number().min(0).max(100),
  features_included: z.array(z.string()),
  ad_configuration: adConfigSchema,
  psychological_triggers: z.array(z.string()),
  compliance_notes: z.array(z.string()),
});

const monetizationAddonSchema = z.object({
  name: z.string(),
  type: z.enum(["ad_network", "affiliate", "sponsored_route"]),
  conversion_target_pct: z.number().min(0).max(100),
});

const monetizationStrategySchema = z.object({
  context_tag: z.literal("@playstore-app-grouth-master"),
  pricing_model: z.literal("freemium_ads_plus_subscription"),
  tiers: z.array(tierSchema).length(3),
  payment_processor: z.literal("lemon_squeezy"),
  checkout_flow: z.string().min(20),
  tax_compliance: z.object({
    vat_mooss: z.boolean(),
    local_rates: z.boolean(),
    invoice_generation: z.boolean(),
  }),
  monetization_addons: z.array(monetizationAddonSchema).min(1),
  validation_checklist: z.array(z.string()).min(5),
});

type MonetizationStrategy = z.infer<typeof monetizationStrategySchema>;

function validate(filePath: string): { validation: "pass" | "fail"; zod_errors: string[] } {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    const result = monetizationStrategySchema.safeParse(parsed);

    if (result.success) {
      console.log(JSON.stringify({ validation: "pass", zod_errors: [] }));
      return { validation: "pass", zod_errors: [] };
    }

    const errors = result.error.issues.map(
      (i) => `[${i.path.join(".")}] ${i.message}`
    );
    console.log(JSON.stringify({ validation: "fail", zod_errors: errors }));
    return { validation: "fail", zod_errors: errors };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.log(JSON.stringify({ validation: "fail", zod_errors: [msg] }));
    return { validation: "fail", zod_errors: [msg] };
  }
}

// Run from CLI
const filePath = process.argv[2];
if (!filePath) {
  console.log(JSON.stringify({ validation: "fail", zod_errors: ["No file path provided"] }));
  process.exit(1);
}

const result = validate(filePath);
process.exit(result.validation === "pass" ? 0 : 1);

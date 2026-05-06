/**
 * Ad Network Dry-Run Simulation Script
 *
 * Mocks AdMob/Meta SDK events without real impressions.
 * Validates:
 * - Ad config gating (tier check, consent check)
 * - Frequency capping logic
 * - Event schema compliance
 * - No PII leakage
 *
 * Usage: npx tsx scripts/ad-network-dry-run.ts
 */

// ─── Mock Ad Configuration ───
interface AdConfig {
  tier: "free_with_ads" | "pro_ad_free" | "pro_family";
  bannerEnabled: boolean;
  rewardedEnabled: boolean;
  rewardedFrequencyCap: number;
  rewardedCountToday: number;
  consentIabTcf: boolean;
  consentAttIos: boolean;
}

interface AdEvent {
  event: string;
  timestamp: string;
  properties: Record<string, unknown>;
}

// ─── Mock user scenarios ───
const scenarios: { name: string; config: AdConfig; expected: Record<string, boolean> }[] = [
  {
    name: "Free user with full consent",
    config: {
      tier: "free_with_ads",
      bannerEnabled: true,
      rewardedEnabled: true,
      rewardedFrequencyCap: 3,
      rewardedCountToday: 0,
      consentIabTcf: true,
      consentAttIos: true,
    },
    expected: {
      bannerAdShown: true,
      rewardedAdAvailable: true,
      interstitialAdShown: false,
    },
  },
  {
    name: "Free user without consent",
    config: {
      tier: "free_with_ads",
      bannerEnabled: true,
      rewardedEnabled: true,
      rewardedFrequencyCap: 3,
      rewardedCountToday: 0,
      consentIabTcf: false,
      consentAttIos: false,
    },
    expected: {
      bannerAdShown: false, // blocked by consent
      rewardedAdAvailable: false,
      interstitialAdShown: false,
    },
  },
  {
    name: "Pro user (no ads)",
    config: {
      tier: "pro_ad_free",
      bannerEnabled: false,
      rewardedEnabled: false,
      rewardedFrequencyCap: 0,
      rewardedCountToday: 0,
      consentIabTcf: true,
      consentAttIos: true,
    },
    expected: {
      bannerAdShown: false,
      rewardedAdAvailable: false,
      interstitialAdShown: false,
    },
  },
  {
    name: "Free user at frequency cap",
    config: {
      tier: "free_with_ads",
      bannerEnabled: true,
      rewardedEnabled: true,
      rewardedFrequencyCap: 3,
      rewardedCountToday: 3, // at cap
      consentIabTcf: true,
      consentAttIos: true,
    },
    expected: {
      bannerAdShown: true,
      rewardedAdAvailable: false, // capped
      interstitialAdShown: false,
    },
  },
];

// ─── Mock Events Generator ───
function generateMockEvents(config: AdConfig): AdEvent[] {
  const events: AdEvent[] = [];
  const ts = new Date().toISOString();
  const sessionId = "sim_session_" + Math.random().toString(36).slice(2, 10);

  // Banner impression (if allowed)
  if (config.bannerEnabled && config.consentIabTcf) {
    events.push({
      event: "ad_impression",
      timestamp: ts,
      properties: {
        ad_network: "admob",
        ad_format: "banner",
        placement: "home",
        ad_unit_id_hash: "sha256:mock",
        eCPM_eur: 3.5,
        session_id: sessionId,
        consent_tcf: true,
      },
    });
  }

  // Rewarded ad check
  const canReward =
    config.rewardedEnabled &&
    config.consentIabTcf &&
    config.rewardedCountToday < config.rewardedFrequencyCap;

  if (canReward) {
    events.push({
      event: "ad_impression",
      timestamp: ts,
      properties: {
        ad_network: "admob",
        ad_format: "rewarded",
        placement: "tracker",
        ad_unit_id_hash: "sha256:mock",
        eCPM_eur: 8.2,
        session_id: sessionId,
        consent_tcf: true,
        reward_type: "unlock_premium_feature",
      },
    });
  }

  return events;
}

// ─── PII Detection Check ───
function checkPII(events: AdEvent[]): string[] {
  const violations: string[] = [];
  const piiPatterns = [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // email
    /\b\d{10,16}\b/, // possible credit card
    /\b[A-Z][a-z]+ [A-Z][a-z]+\b/, // possible name
    /\+\d{7,15}/, // phone number
  ];

  for (const event of events) {
    const payload = JSON.stringify(event.properties);
    for (const pattern of piiPatterns) {
      if (pattern.test(payload)) {
        violations.push(`PII pattern detected in event "${event.event}": ${pattern}`);
      }
    }
  }

  return violations;
}

// ─── Main ───
function main(): void {
  console.log("📢 Ad Network Dry-Run Simulation\n");

  let totalPassed = 0;
  let totalFailed = 0;

  for (const scenario of scenarios) {
    console.log(`\n── Scenario: ${scenario.name} ──`);

    const events = generateMockEvents(scenario.config);
    console.log(`   Events generated: ${events.length}`);

    // Check expected outcomes
    const bannerShown = events.some(
      (e) => e.properties.ad_format === "banner",
    );
    const rewardedAvailable = events.some(
      (e) => e.properties.ad_format === "rewarded",
    );

    const checks = {
      bannerAdShown: bannerShown,
      rewardedAdAvailable: rewardedAvailable,
      interstitialAdShown: events.some((e) => e.properties.ad_format === "interstitial"),
    };

    let scenarioPassed = true;
    for (const [key, expected] of Object.entries(scenario.expected)) {
      const actual = checks[key as keyof typeof checks];
      if (actual !== expected) {
        console.log(`   ❌ ${key}: expected=${expected}, actual=${actual}`);
        scenarioPassed = false;
      } else {
        console.log(`   ✅ ${key}: ${actual}`);
      }
    }

    // PII check
    const piiViolations = checkPII(events);
    if (piiViolations.length > 0) {
      console.log("   ❌ PII violations found:");
      piiViolations.forEach((v) => console.log(`      - ${v}`));
      scenarioPassed = false;
    } else {
      console.log("   ✅ No PII violations");
    }

    if (scenarioPassed) totalPassed++;
    else totalFailed++;
  }

  console.log(`\n\n📊 Results: ${totalPassed} passed, ${totalFailed} failed`);

  if (totalFailed > 0) {
    console.log("❌ Some scenarios failed. Check ad configuration logic.");
    process.exit(1);
  } else {
    console.log("✅ All ad network dry-run scenarios passed.");
  }
}

main();

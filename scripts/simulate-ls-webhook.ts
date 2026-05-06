/**
 * Lemon Squeezy Webhook Simulation Script
 *
 * Mocks LS webhook events to test the webhook handler's:
 * - HMAC-SHA256 signature validation
 * - Idempotency (duplicate event handling)
 * - Subscription lifecycle state transitions
 * - Retry backoff behavior
 *
 * Usage: npx tsx scripts/simulate-ls-webhook.ts
 */

import crypto from "crypto";

interface LSWebhookEvent {
  event_name: string;
  data: {
    id: string;
    type: string;
    attributes: Record<string, unknown>;
  };
}

const WEBHOOK_URL = process.env.WEBHOOK_URL ?? "http://localhost:3000/api/webhooks/ls";
const WEBHOOK_SECRET = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET ?? "whsec_test_simulation_key";

// ─── Test events ───
const testEvents: LSWebhookEvent[] = [
  {
    event_name: "subscription_created",
    data: {
      id: "sub_sim_001",
      type: "subscriptions",
      attributes: {
        variant_id: "var_pro_monthly",
        product_id: "prod_pro",
        variant_name: "Pro Monthly",
        status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        trial_start: new Date().toISOString(),
        trial_end: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        user_email: "test@example.com",
      },
    },
  },
  {
    event_name: "order_paid",
    data: {
      id: "ord_sim_001",
      type: "orders",
      attributes: {
        subtotal: "3.99",
        total: "4.87",
        currency: "EUR",
        tax_rate: "22",
        invoice_url: "https://ls.invoice/sim_001",
        status: "paid",
      },
    },
  },
  {
    event_name: "subscription_updated",
    data: {
      id: "sub_sim_001",
      type: "subscriptions",
      attributes: {
        variant_id: "var_pro_monthly",
        product_id: "prod_pro",
        variant_name: "Pro Monthly",
        status: "past_due",
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      },
    },
  },
  {
    event_name: "subscription_payment_failed",
    data: {
      id: "sub_sim_001",
      type: "subscriptions",
      attributes: {
        status: "past_due",
        payment_failure_reason: "card_declined",
        retry_count: 1,
      },
    },
  },
  {
    event_name: "subscription_payment_recovered",
    data: {
      id: "sub_sim_001",
      type: "subscriptions",
      attributes: {
        status: "active",
        payment_method_brand: "visa",
        payment_method_last4: "4242",
      },
    },
  },
  {
    event_name: "subscription_cancelled",
    data: {
      id: "sub_sim_001",
      type: "subscriptions",
      attributes: {
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
      },
    },
  },
  {
    event_name: "subscription_expired",
    data: {
      id: "sub_sim_001",
      type: "subscriptions",
      attributes: {
        status: "expired",
        expires_at: new Date().toISOString(),
      },
    },
  },
];

// ─── HMAC-SHA256 signature generation (mirrors LS) ───
function signPayload(payload: string): string {
  return crypto.createHmac("sha256", WEBHOOK_SECRET).update(payload).digest("hex");
}

// ─── Simulate webhook delivery ───
async function simulateWebhook(event: LSWebhookEvent): Promise<void> {
  const payload = JSON.stringify({
    meta: {
      event_name: event.event_name,
    },
    data: event.data,
  });

  const signature = signPayload(payload);

  console.log(`\n📨 Sending webhook: ${event.event_name} (id: ${event.data.id})`);
  console.log(`   Signature: ${signature.slice(0, 32)}...`);

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Signature": signature,
      },
      body: payload,
    });

    const status = response.status;
    const body = await response.text();
    console.log(`   Response: ${status} — ${body.slice(0, 100)}`);
  } catch (err) {
    console.log(`   ⚠️  Delivery failed (server may be offline): ${err instanceof Error ? err.message : "unknown"}`);
  }
}

// ─── Test idempotency: send same event twice ───
async function testIdempotency(): Promise<void> {
  const event = testEvents[0]; // subscription_created
  console.log("\n🔁 Testing idempotency (duplicate event)...");
  await simulateWebhook(event);
  await new Promise((r) => setTimeout(r, 500));
  await simulateWebhook(event); // duplicate — should return 200 with deduplicated=true
}

// ─── Main ───
async function main(): Promise<void> {
  console.log("🔧 Lemon Squeezy Webhook Simulation");
  console.log(`   Target URL: ${WEBHOOK_URL}`);
  console.log(`   Events to simulate: ${testEvents.length}`);

  // Test all lifecycle events
  for (const event of testEvents) {
    await simulateWebhook(event);
    await new Promise((r) => setTimeout(r, 200));
  }

  // Test idempotency
  await testIdempotency();

  console.log("\n✅ Simulation complete.");
  console.log("   Verify server logs for processing status.");
}

main().catch(console.error);

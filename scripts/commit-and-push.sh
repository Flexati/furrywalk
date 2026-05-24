#!/bin/bash
# Script per commit e push delle modifiche
# Esegui: bash scripts/commit-and-push.sh

set -e

echo "📦 Staging changes..."
git add -A

echo "📝 Committing..."
git commit -m "chore: remove Lemon Squeezy refs, add secrets script, update privacy

- Remove Lemon Squeezy references from Privacy Policy
- Add scripts/set-github-secrets.mjs for CI secrets setup
- Payment provider: Play Billing only
- Privacy policy: only Google Play Billing as payment processor
- Deleted: ls-checkout.ts, payment-service.ts, ls-webhook.ts, simulate-ls-webhook.ts
- Updated: PaywallScreen.tsx, subscription.ts, server index"

echo "🚀 Pushing to origin/main..."
git push origin main

echo "✅ Push complete! Vercel deploy should start automatically."
echo "   Privacy policy will be live at: https://passeggiata-furba.vercel.app/api/privacy"

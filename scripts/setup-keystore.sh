#!/usr/bin/env bash
# ─── Phase 1.1: Keystore Setup Helper ────────────────────────────────────────
# Uso: bash scripts/setup-keystore.sh
#
# Questo script:
#   1. Verifica che il keystore esista
#   2. Decodifica l'alias corrente
#   3. Mostra il contenuto di keystore.b64 (da copiare come GitHub Secret)
#   4. Verifica che il keystore NON sia tracciato da Git
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KEYSTORE_JKS="$REPO_ROOT/passeggiata-release.jks"
KEYSTORE_B64="$REPO_ROOT/keystore.b64"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Passeggiata Furba — Phase 1.1 Keystore Setup Helper"
echo "═══════════════════════════════════════════════════════"
echo ""

# ── 1. Check keystore file ────────────────────────────────────────────────────
echo "📋 STEP 1: Verifica keystore file"
if [ -f "$KEYSTORE_JKS" ]; then
  SIZE=$(wc -c < "$KEYSTORE_JKS")
  echo "  ✅ passeggiata-release.jks trovato ($SIZE bytes)"
else
  echo "  ❌ passeggiata-release.jks NON trovato!"
  echo ""
  echo "  Genera un nuovo keystore con:"
  echo "    keytool -genkey -v \\"
  echo "      -keystore passeggiata-release.jks \\"
  echo "      -alias passeggiata-key \\"
  echo "      -keyalg RSA -keysize 2048 -validity 10000 \\"
  echo "      -dname \"CN=Passeggiata Furba, OU=Dev, O=Passeggiata Furba, L=Italy, ST=Italy, C=IT\""
  exit 1
fi

# ── 2. Check b64 file ─────────────────────────────────────────────────────────
echo ""
echo "📋 STEP 2: Verifica keystore.b64"
if [ -f "$KEYSTORE_B64" ]; then
  SIZE_B64=$(wc -c < "$KEYSTORE_B64")
  echo "  ✅ keystore.b64 trovato ($SIZE_B64 bytes)"
else
  echo "  ⚠️  keystore.b64 non trovato — generazione..."
  base64 -w0 "$KEYSTORE_JKS" > "$KEYSTORE_B64"
  echo "  ✅ keystore.b64 generato"
fi

# ── 3. List aliases ───────────────────────────────────────────────────────────
echo ""
echo "📋 STEP 3: Alias nel keystore (inserisci la password quando richiesta)"
echo ""
keytool -list -keystore "$KEYSTORE_JKS" 2>&1 | grep -E "Keystore type|Keystore provider|entries|alias" || true

# ── 4. Git tracking check ────────────────────────────────────────────────────
echo ""
echo "📋 STEP 4: Verifica che il keystore NON sia tracciato da Git"
cd "$REPO_ROOT"

TRACKED_JKS=$(git ls-files passeggiata-release.jks 2>/dev/null || echo "")
TRACKED_B64=$(git ls-files keystore.b64 2>/dev/null || echo "")

if [ -n "$TRACKED_JKS" ]; then
  echo "  🚨 ATTENZIONE: passeggiata-release.jks è tracciato da Git!"
  echo "     Esegui: git rm --cached passeggiata-release.jks && git commit -m 'security: remove keystore from tracking'"
else
  echo "  ✅ passeggiata-release.jks NON tracciato da Git"
fi

if [ -n "$TRACKED_B64" ]; then
  echo "  🚨 ATTENZIONE: keystore.b64 è tracciato da Git!"
  echo "     Esegui: git rm --cached keystore.b64 && git commit -m 'security: remove keystore b64 from tracking'"
else
  echo "  ✅ keystore.b64 NON tracciato da Git"
fi

# ── 5. GitHub Secrets istruzioni ─────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  📋 STEP 5: Configura i GitHub Secrets (UNA SOLA VOLTA)"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "  Vai su: https://github.com/amzajaguar-blip/passeggiata-furba/settings/secrets/actions"
echo "  Aggiungi questi 4 secrets:"
echo ""
echo "  ┌─────────────────────────────────┬──────────────────────────────────────────────┐"
echo "  │ Secret Name                     │ Valore                                       │"
echo "  ├─────────────────────────────────┼──────────────────────────────────────────────┤"
echo "  │ ANDROID_KEYSTORE_BASE64         │ (contenuto del file keystore.b64 qui sotto)  │"
echo "  │ ANDROID_KEYSTORE_PASSWORD       │ (password del keystore)                      │"
echo "  │ ANDROID_KEY_ALIAS               │ passeggiata-key (o alias usato sopra)        │"
echo "  │ ANDROID_KEY_PASSWORD            │ (password della chiave)                      │"
echo "  └─────────────────────────────────┴──────────────────────────────────────────────┘"
echo ""
echo "  Contenuto di ANDROID_KEYSTORE_BASE64:"
echo "  ──────────────────────────────────────"
cat "$KEYSTORE_B64"
echo ""
echo "  ──────────────────────────────────────"
echo ""

# ── 6. Release trigger ────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════"
echo "  🚀 STEP 6: Trigger prima build di release"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "  Dopo aver configurato i secrets:"
echo ""
echo "    git tag v1.0.0"
echo "    git push origin v1.0.0"
echo ""
echo "  La pipeline GitHub Actions 'Release Build & Sign (.aab)' partirà"
echo "  automaticamente e produrrà il file .aab firmato."
echo ""
echo "  Monitora: https://github.com/amzajaguar-blip/passeggiata-furba/actions"
echo ""
echo "✅ Setup helper completato."
echo ""

#!/usr/bin/env bash
# Genera il keystore di firma release per Passeggiata Furba.
# Uso: bash scripts/generate-keystore.sh
# Dopo l'esecuzione, codifica in base64 con:  base64 -w0 passeggiata-release.jks > keystore.b64
# e carica i 4 secrets su GitHub (vedi docs/SETUP.md).

set -euo pipefail

OUT="passeggiata-release.jks"
ALIAS="passeggiata-key"

if [ -f "$OUT" ]; then
  echo "ERRORE: $OUT esiste gia'. Rimuovilo o spostalo prima di rigenerarlo." >&2
  exit 1
fi

keytool -genkeypair -v \
  -keystore "$OUT" \
  -alias "$ALIAS" \
  -keyalg RSA -keysize 2048 -validity 10000

echo ""
echo "OK. Keystore creato: $OUT (alias: $ALIAS)"
echo "BACKUP IMMEDIATO consigliato: senza questo file non potrai aggiornare l'app sul Play Store."
echo ""
echo "Prossimo step: base64 -w0 $OUT > keystore.b64 e carica i secrets su GitHub."

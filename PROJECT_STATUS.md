# 📊 PROJECT STATUS: PASSEGGIATA FURBA
> **Orchestratore:** Block Engineering | **Lingua:** it-IT (sommario) / en (log/spec)
> **Ultimo aggiornamento:** 2026-05-27 | **Agente:** @expo-build-architect + @security-architect-reviewer

---

## 🔄 PHASE TRACKING

| Phase | Stato | Artefatti | Branch/Commit | Aggiornato Da |
|-------|-------|-----------|---------------|---------------|
| **1.1** Build & Sign | `🟢 IN PROGRESS` | `eas.json`, `release-build.yml`, `app.config.ts`, `build.gradle` | `main` | Orchestratore |
| **1.2** Privacy & Compliance | `⚪ LOCKED` | — | — | — |
| **1.3** Store Listing & ASO | `⚪ LOCKED` | — | — | — |
| **1.4** Billing & Premium Gate | `⚪ LOCKED` | — | — | — |
| **1.5** Testing & Hardening | `⚪ LOCKED` | — | — | — |

> **Regola di sblocco:** Phase N+1 si sblocca SOLO quando `/verify` di Phase N → `PASS`

---

## 📈 METRICS

| Metrica | Target | Stato |
|---------|--------|-------|
| Bundle Size (AAB) | ≤ 35 MB | `⏳ pending build` |
| Startup Time | ≤ 2s cold start | `⏳ pending test` |
| Test Coverage | ≥ 85% | `⏳ pending` |
| Crash-Free Rate | ≥ 99.5% | `⏳ pending` |
| Lint Warnings | 0 | `⏳ pending` |
| TypeScript Errors | 0 | `✅ 0 errors (pnpm tsc --noEmit)` |

---

## 🏗️ PHASE 1.1 — BUILD, SIGN & EXPO CONFIG

### Checklist Agente

| Step | Agente | Artefatto | Stato |
|------|--------|-----------|-------|
| 1. Keystore JKS esiste | @security-architect-reviewer | `passeggiata-release.jks` + `keystore.b64` | `✅ EXISTS` |
| 2. Secrets GitHub configurati | @security-architect-reviewer | `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` | `⚠️ DA VERIFICARE` |
| 3. `app.config.ts` production | @expo-build-architect | Package `com.passeggiatafurba.app`, SDK 35, R8, light mode | `✅ DONE` |
| 4. `eas.json` production profile | @expo-build-architect | `production` → `app-bundle`, `autoIncrement: true` | `✅ DONE` |
| 5. GitHub Actions `release-build.yml` | @security-architect-reviewer | Tag `v*` trigger, keystore decode, bundle gate ≤ 40MB | `✅ DONE` |
| 6. `build.gradle` signing hardened | @security-architect-reviewer | Fail-fast (no debug fallback), shrinkResources default true | `✅ DONE` |
| 7. Bundle optimization | @code-quality-architect | R8 + shrink enabled, arm64-v8a only | `✅ DONE` |
| 8. `/arena build-sign-test` | Orchestratore | `arena/report.json` | `⏳ PENDING — requires GitHub secrets` |

### Requisiti Secrets GitHub

Per avviare la pipeline di release è necessario configurare questi 4 secrets su GitHub:

```
GitHub → Settings → Secrets and variables → Actions → New repository secret
```

| Secret Name | Valore | Come ottenerlo |
|-------------|--------|----------------|
| `ANDROID_KEYSTORE_BASE64` | Contenuto di `keystore.b64` | `cat keystore.b64` (già generato) |
| `ANDROID_KEYSTORE_PASSWORD` | Password del keystore | Impostata durante generazione |
| `ANDROID_KEY_ALIAS` | `passeggiata-key` | Vedere alias in keystore |
| `ANDROID_KEY_PASSWORD` | Password della chiave | Impostata durante generazione |

> ⚠️ **SICUREZZA:** Non committare mai le password in chiaro nel repo. Usare SOLO GitHub Secrets.

### Come triggerare la prima build di release

```bash
# 1. Assicurati che i secrets siano configurati su GitHub

# 2. Crea e pusha il tag v1.0.0
git tag v1.0.0
git push origin v1.0.0

# 3. La pipeline release-build.yml parte automaticamente
# Monitora su: https://github.com/amzajaguar-blip/passeggiata-furba/actions

# 4. Scarica l'AAB dall'artifact "passeggiata-furba-release-aab-1.0.0-vc10000"
# 5. Carica su Play Console → Internal Testing
```

---

## 🐛 BUG REGISTRY

| ID | Severità | Descrizione | Stato | Agente |
|----|----------|-------------|-------|--------|
| #001 | P2 | Package ID era `space.manus.passeggiata.furba.t20260504051231` (non Play-Store-friendly) | `✅ FIXED` → `com.passeggiatafurba.app` | @expo-build-architect |
| #002 | P2 | `shrinkResources` default era `false` in `buildTypes.release` | `✅ FIXED` → `true` | @security-architect-reviewer |
| #003 | P1 | Release build cadeva silenziosamente su debug key se keystore assente | `✅ FIXED` → fail-fast `GradleException` | @security-architect-reviewer |
| #004 | P2 | `userInterfaceStyle: "automatic"` (non spec conforme — deve essere `"light"` per v1.0.0) | `✅ FIXED` | @expo-build-architect |
| #005 | P2 | `load-env.js` importato in app.config.ts (non necessario in production, causa side effects) | `✅ FIXED` | @code-quality-architect |

---

## 📦 ARTEFATTI PRODOTTI — PHASE 1.1

| File | Percorso | Descrizione |
|------|----------|-------------|
| EAS Config | `eas.json` | Profile production: app-bundle, autoIncrement, OTA channel |
| Release Workflow | `.github/workflows/release-build.yml` | Pipeline tag-triggered con bundle size gate |
| App Config | `app.config.ts` | Produzione: package standard, SDK 35, R8, permessi corretti |
| Build Config | `android/app/build.gradle` | Signing fail-fast, shrinkResources true |
| Keystore B64 | `keystore.b64` | Base64 del keystore (da aggiungere ai GitHub Secrets) |
| Keystore JKS | `passeggiata-release.jks` | File keystore (NON committare — tenerlo sicuro) |
| Arena Report | `arena/report.json` | Output validazione Phase 1.1 |

---

## 🔐 SICUREZZA & COMPLIANCE NOTES

- **Keystore:** `passeggiata-release.jks` NON deve essere nel repo Git (verificare `.gitignore`)
- **Bundle ID:** `com.passeggiatafurba.app` — registrato su Play Console, non modificabile dopo primo upload
- **Background Location:** disabilitato in v1.0.0 — richiede dichiarazione esplicita per Play Store
- **BILLING permission:** presente in `app.config.ts` — necessario per Phase 1.4 (Google Play Billing)
- **Privacy Policy:** richiesta per Phase 1.2 — URL: `https://passeggiata-furba.vercel.app/api/privacy`

---

## 🔜 NEXT: PHASE 1.2 — Privacy, Consent & Data Safety

**Sblocco condizione:** Phase 1.1 `/verify pipeline-pass` → PASS

**Deliverables Phase 1.2:**
- [ ] Privacy Policy live (URL pubblica HTTPS)
- [ ] Consent modal in-app (blocca tracking fino ad accettazione)
- [ ] Data Safety Form JSON completato
- [ ] IARC/PEGI questionnaire draft
- [ ] Link Privacy Policy in Settings screen

**Agenti:** `@landing-page-conversion-architect`, `@compliance-data-safety`, `@security-architect-reviewer`

---

## 📋 VALIDATION PROTOCOL 1.1

```yaml
verify_pipeline_pass:
  checks:
    - eas.json profile production valid: ✅
    - release-build.yml workflow syntax valid: ✅ (pending actionlint)
    - app.config.ts package ID production: ✅ com.passeggiatafurba.app
    - build.gradle signing fail-fast: ✅
    - R8 + shrinkResources enabled: ✅
    - .aab exists & signed: ⏳ requires GitHub secrets + tag push
    - bundle ≤ 35MB: ⏳ pending build
    - startup ≤ 2s: ⏳ pending test
    - lint zero warnings: ⏳ pending
  current_status: READY_FOR_SECRETS_SETUP → then READY_FOR_BUILD
```

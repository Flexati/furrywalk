# 🐛 BUG REGISTRY — Passeggiata Furba P0

> **Generato da:** Orchestratore Phase 1.1 | **Data:** 2026-05-27
> **Formato:** [AGENT_ID] | STATUS: PASS/FAIL | ARTIFACT: [path] | NEXT: [phase/command]

---

## Legenda Severità

| Livello | Impatto | Azione |
|---------|---------|--------|
| **P0** | Pipeline halt — Play Store rifiuta | Fix immediato, re-run /arena |
| **P1** | Funzionalità core rotta — blocca release | Fix entro 24h |
| **P2** | Degradazione UX o compliance non critica | Fix prima del release |
| **P3** | Nice-to-have, nessun blocco | Backlog |

---

## Phase 1.1 — Build, Sign & Expo Config

| ID | Sev | Descrizione | File | Fix Applicato | Stato |
|----|-----|-------------|------|---------------|-------|
| #001 | P2 | Package ID non Play-Store-friendly (`space.manus.passeggiata.furba.t20260504051231`) | `app.config.ts` | → `com.passeggiatafurba.app` | `✅ FIXED` |
| #002 | P2 | `shrinkResources` default `false` in release build | `android/app/build.gradle` | → `true` | `✅ FIXED` |
| #003 | P1 | Release build cadeva silenziosamente su debug signing key | `android/app/build.gradle` | `GradleException` fail-fast | `✅ FIXED` |
| #004 | P2 | `userInterfaceStyle: "automatic"` — spec richiede `"light"` per v1.0.0 | `app.config.ts` | → `"light"` | `✅ FIXED` |
| #005 | P2 | `import "./scripts/load-env.js"` in app.config.ts causa side effects in produzione | `app.config.ts` | Rimosso, bundleId costante | `✅ FIXED` |
| #006 | P0 | GitHub Secrets non verificati come configurati (`ANDROID_KEYSTORE_BASE64` etc.) | GitHub Settings | Da configurare manualmente | `🔴 OPEN` |

---

## Phase 1.2 — Privacy & Compliance *(LOCKED)*

> Sblocco: dopo `/verify pipeline-pass` Phase 1.1

---

## Phase 1.3 — Store Listing & ASO *(LOCKED)*

---

## Phase 1.4 — Billing & Premium Gate *(LOCKED)*

---

## Phase 1.5 — Testing & Hardening *(LOCKED)*

---

## 🔴 Bug Aperti (OPEN)

| ID | Sev | Descrizione | Owner | Target |
|----|-----|-------------|-------|--------|
| #006 | P0 | GitHub Secrets non configurati — AAB build non può partire | @security-architect-reviewer | Manuale — priorità immediata |

---

## ✅ Bug Risolti (FIXED)

| ID | Sev | Fix | Commit |
|----|-----|-----|--------|
| #001 | P2 | Package ID → `com.passeggiatafurba.app` | Phase 1.1 |
| #002 | P2 | `shrinkResources` → `true` | Phase 1.1 |
| #003 | P1 | Signing fail-fast in `build.gradle` | Phase 1.1 |
| #004 | P2 | `userInterfaceStyle` → `"light"` | Phase 1.1 |
| #005 | P2 | Rimosso `load-env.js` import | Phase 1.1 |

# Setup — Attivare le funzioni che richiedono le tue chiavi

Questa guida spiega come passare dalle modalità mock/demo a quelle reali per:

1. **Supabase** — community walks (ora mock locale)
2. **Lemon Squeezy** — pagamenti Premium (ora toggle demo)
3. **APK Release firmato** — per Play Store (ora solo debug funzionante)

Tutte le chiavi vanno in un file `.env` nella root `passeggiata-furba/` (non committarlo). Expo carica automaticamente le variabili con prefisso `EXPO_PUBLIC_`.

---

## 1) Supabase — Community Walks reali

**Stato attuale:** `lib/services/supabase-service.ts` legge `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Se mancano, l'app mostra percorsi finti.

### Passi

1. Vai su https://supabase.com → **New project** (piano Free basta).
2. Quando il progetto è pronto, apri **Project Settings → API** e copia:
   - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - **anon public key** → `EXPO_PUBLIC_SUPABASE_ANON_KEY`
3. Apri **SQL Editor** e crea la tabella `walks`:
   ```sql
   create table walks (
     id uuid primary key default gen_random_uuid(),
     user_id uuid references auth.users(id),
     title text not null,
     distance_km numeric,
     duration_min int,
     route_geojson jsonb,
     city text,
     created_at timestamptz default now()
   );
   alter table walks enable row level security;
   create policy "read public walks" on walks for select using (true);
   create policy "insert own walks" on walks for insert with check (auth.uid() = user_id);
   ```
4. Aggiungi al file `.env` nella root del progetto:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```
5. Riavvia Expo: `pnpm start --clear`. La sezione community ora carica dati reali.

> **Nota:** se vuoi che gli utenti facciano login per pubblicare percorsi, abilita **Auth → Email** in Supabase e collega `signInWithPassword` nel servizio.

---

## 2) Lemon Squeezy — Premium reale

**Stato attuale:** `lib/services/payment-service.ts` usa quattro variabili. Senza chiavi, il toggle Premium funziona solo come demo locale.

### Passi

1. Crea un account su https://lemonsqueezy.com e completa l'onboarding del **Store** (servono dati fiscali).
2. **Settings → API** → **Create API key** → copiala.
3. Crea un **Product → Subscription** (es. "Passeggiata Furba Premium", €4.99/mese), poi crea una **Variant** mensile e annota l'**ID variante**.
4. **Settings → Webhooks** → **Add webhook** → URL del tuo backend (es. una Edge Function Supabase) → copia il **Signing secret**.
5. Aggiungi al `.env`:
   ```
   EXPO_PUBLIC_LEMON_SQUEEZY_API_KEY=lsq_...
   EXPO_PUBLIC_LEMON_SQUEEZY_STORE_ID=12345
   EXPO_PUBLIC_LEMON_SQUEEZY_PREMIUM_VARIANT_ID=67890
   EXPO_PUBLIC_LEMON_SQUEEZY_WEBHOOK_SECRET=whsec_...
   ```
6. Riavvia Expo. Il pulsante "Sblocca Premium" apre ora il **checkout reale** Lemon Squeezy.

> **Test:** Lemon Squeezy ha la modalità test — usa una test API key e carte fittizie prima di andare live.

---

## 3) APK Release firmato (Play Store)

**Stato attuale:** il workflow `.github/workflows/build-android-apk.yml` supporta `build_type=release`, ma senza keystore l'APK risultante non è installabile in produzione né caricabile su Play Console.

### Passi

#### 3.1 Genera il keystore (una volta sola, in locale)

```bash
keytool -genkeypair -v \
  -keystore passeggiata-release.jks \
  -alias passeggiata-key \
  -keyalg RSA -keysize 2048 -validity 10000
```

Ti chiederà password e dati anagrafici. **Conserva il file `.jks` e le password in modo sicuro** — se li perdi non puoi più aggiornare l'app sul Play Store.

#### 3.2 Carica i secrets su GitHub

Converti il keystore in base64:
```bash
base64 -w 0 passeggiata-release.jks > keystore.b64
```

Su GitHub → **Settings → Secrets and variables → Actions → New repository secret**, aggiungi:

| Nome | Valore |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | contenuto di `keystore.b64` |
| `ANDROID_KEYSTORE_PASSWORD` | password keystore |
| `ANDROID_KEY_ALIAS` | `passeggiata-key` |
| `ANDROID_KEY_PASSWORD` | password chiave |

#### 3.3 Estendi il workflow

In `.github/workflows/build-android-apk.yml`, prima dello step `Build APK (Release)` aggiungi:

```yaml
      - name: Decode keystore
        if: ${{ github.event.inputs.build_type == 'release' }}
        run: |
          echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 -d > android/app/release.jks

      - name: Configure signing
        if: ${{ github.event.inputs.build_type == 'release' }}
        run: |
          cat >> android/gradle.properties <<EOF
          MYAPP_RELEASE_STORE_FILE=release.jks
          MYAPP_RELEASE_KEY_ALIAS=${{ secrets.ANDROID_KEY_ALIAS }}
          MYAPP_RELEASE_STORE_PASSWORD=${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          MYAPP_RELEASE_KEY_PASSWORD=${{ secrets.ANDROID_KEY_PASSWORD }}
          EOF
```

E in `android/app/build.gradle` (rigenerato da `expo prebuild`) abilita il blocco `signingConfigs.release` che legge le proprietà sopra. Expo lo predispone già — basta togliere il commento o aggiungere:

```gradle
signingConfigs {
    release {
        storeFile file(MYAPP_RELEASE_STORE_FILE)
        storePassword MYAPP_RELEASE_STORE_PASSWORD
        keyAlias MYAPP_RELEASE_KEY_ALIAS
        keyPassword MYAPP_RELEASE_KEY_PASSWORD
    }
}
buildTypes {
    release { signingConfig signingConfigs.release }
}
```

> Poiché `expo prebuild` rigenera `android/`, conviene patchare via `app.config.ts` con `expo-build-properties` o committare il blocco con un plugin Expo dedicato.

#### 3.4 Build & upload

1. Su GitHub Actions → **Build Android APK** → Run workflow → `build_type: release`.
2. Scarica l'artifact: APK firmato pronto per il Play Store.
3. Per Play Store usa **AAB** invece dell'APK: sostituisci `assembleRelease` con `bundleRelease` e scarica `app/build/outputs/bundle/release/app-release.aab`.

---

## Checklist finale

- [ ] `.env` creato e **NON** committato (verifica `.gitignore`)
- [ ] Supabase: tabella `walks` creata e RLS abilitata
- [ ] Lemon Squeezy: webhook puntato a un endpoint reale
- [ ] Keystore salvato in posto sicuro + backup
- [ ] Secrets GitHub configurati
- [ ] Workflow release testato con un build di prova

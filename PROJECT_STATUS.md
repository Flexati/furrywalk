# Passeggiata Furba — Project Status

**Ultimo aggiornamento:** 2026-05-07
**APK build:** `apk-output/app-debug.apk` (65 MB, arm64-v8a)
**Repo:** https://github.com/amzajaguar-blip/passeggiata-furba
**Ultimo run CI:** https://github.com/amzajaguar-blip/passeggiata-furba/actions/runs/25517279323 ✅

---

## 1. Cosa è stato fatto in questa sessione

### Sblocco APK (root cause: splash che non scompariva)
- Aggiunto `RootErrorBoundary` globale in `app/_layout.tsx` che intercetta ogni eccezione e mostra un fallback con stack trace + bottone "Riprova".
- Chiamata esplicita a `SplashScreen.preventAutoHideAsync()` all'avvio e `SplashScreen.hideAsync()` 200 ms dopo il primo render del layout root.
- Disabilitato `experiments.reactCompiler` in `app.config.ts` (causava crash silenzioso al boot su SDK 54 senza il plugin Babel corrispondente).
- `lib/trpc.ts`: il fetch ora cattura gli errori di rete e ritorna una Response 503 sintetica invece di propagare un'eccezione.
- `constants/oauth.ts`: `getApiBaseUrl()` ora ritorna un sentinel non-null su native quando l'env è vuota.

### Mappe reali (senza Google Maps API key)
- Nuovo componente `components/leaflet-map.tsx` basato su `react-native-webview` + Leaflet + tile OpenStreetMap.
- Supporta marker con emoji, polyline live, heatmap (`leaflet.heat`), aggiornamento incrementale via `injectJavaScript`.
- Usato in: `app/(tabs)/map.tsx`, `app/walk-tracker.tsx`, `app/walk-summary.tsx`, `app/map-view.tsx`.

### GPS service riscritto (`lib/services/gps-service.ts`)
- Hook `useGPSTracking` con buffer di punti, calcolo distanza Haversine progressivo, filtro outlier (>200 m in <3 s scartati come jitter).
- Helper `getCurrentLocation()` per centrare la mappa al primo render.
- Niente più ricorsione `stopTracking` → `startTracking` (era un bug del codice precedente).

### Persistenza locale (`lib/services/storage.ts`)
- Nuovo modulo `Storage` con AsyncStorage tipato.
- Salva: profilo cane, lista passeggiate (max 500), promemoria, flag onboarding-done, flag premium.

### Schermate
- **Home** (`app/(tabs)/index.tsx`): gate onboarding, statistiche reali, ultime passeggiate, navigazione al tracker.
- **Onboarding** (`app/onboarding.tsx`): welcome → dog setup → richiesta permesso GPS → salvataggio profilo.
- **Walk Tracker** (`app/walk-tracker.tsx`): mappa live con polyline, GPS reale, foto prima/dopo via `expo-image-picker`, calcolo calorie basato sul peso del cane.
- **Walk Summary** (`app/walk-summary.tsx`): mappa del percorso, rating ⭐, note, salvataggio in AsyncStorage.
- **Dog Profile** (`app/(tabs)/dog-profile.tsx`): visualizzazione + form di modifica completa (nome, razza, età, peso, energia).
- **Health** (`app/(tabs)/health.tsx`): km totali, settimana corrente, streak giorni consecutivi, calorie totali, gestione promemoria con notifiche programmate.
- **Settings** (`app/(tabs)/settings.tsx`): toggle Premium (demo), reset onboarding, cancella passeggiate, attribuzione OSM.
- **Map View** (`app/map-view.tsx`): mappa esplorativa fullscreen.

### Permessi Android (`app.config.ts`)
Aggiunti: `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `CAMERA`, `READ_MEDIA_IMAGES`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `VIBRATE`, `INTERNET`.
Plugin: `expo-location`, `expo-image-picker`, `expo-notifications` con messaggi italiani.

### CI/CD
- Workflow `.github/workflows/build-android-apk.yml` aggiornato: build solo `arm64-v8a` (riduce dimensione e tempo), supporto `debug` e `release`.
- Build artefatto scaricabile come `passeggiata-furba-debug.zip` da Actions.

### Quality
- `npx tsc --noEmit` → **0 errori**.
- Tutte le navigazioni usano route esplicite (`expo-router` typed routes).

---

## 2. Test da fare manualmente sul device

Installa `app-debug.apk` (Impostazioni → Sicurezza → consenti origine sconosciuta).

### 2.1 Smoke test (30 secondi)
- [ ] L'app si apre senza restare bloccata sulla splash.
- [ ] Compare la schermata di onboarding (al primo avvio).

### 2.2 Onboarding flow
- [ ] Schermata "Benvenuto" → tap "Iniziamo".
- [ ] Inserisci nome cane (es. "Luna"), razza, età, energia → tap "Continua".
- [ ] Tap "Permetti posizione" → il prompt nativo Android appare → concedi.
- [ ] Atterra sulla Home con saluto personalizzato ("Ciao Luna!").
- [ ] **Negativo:** ripeti scegliendo "Salta per ora" → arrivi comunque alla Home senza errori.

### 2.3 Walk Tracker (richiede di camminare ~50 m)
- [ ] Da Home tap "Inizia Tracker" → si apre la schermata tracker.
- [ ] La mappa OSM carica le tile (vedi case/strade reali, non riquadro grigio).
- [ ] Tap "▶ Inizia passeggiata" → lo stato cambia a "Tracking GPS attivo".
- [ ] Cammina 30–60 secondi: il timer scorre, la distanza aumenta, la polyline verde appare sulla mappa.
- [ ] Tap "📷 Prima" → la fotocamera si apre → scatta una foto → torna al tracker con la foto come thumbnail.
- [ ] Tap "■ Termina passeggiata" → atterri sul Walk Summary.
- [ ] Sul Summary: vedi distanza/tempo/calorie, mappa con il percorso completo, foto.
- [ ] Imposta rating 4 stelle, scrivi una nota, tap "Salva passeggiata".
- [ ] Torni in Home → la passeggiata appare in "ULTIME PASSEGGIATE" e il contatore "Passeggiate totali" è 1.

### 2.4 Mappa esplorativa
- [ ] Tab "Mappa" in basso → tile OSM caricano, marker emoji 🌳 🌲 💧 ⛰️ visibili.
- [ ] Tap "🔥 Heatmap" → appare overlay rosso/giallo.
- [ ] Tap "⭐ 4.8+" → vedi solo Parco Centrale e Lungolago.
- [ ] Scroll orizzontale in fondo → cards con info passeggiate.

### 2.5 Profilo cane
- [ ] Tab "Profilo" → vedi i dati inseriti in onboarding.
- [ ] Tap "Modifica profilo" → cambia peso (es. 18) → "Salva" → vedi alert "Salvato".
- [ ] Riapri il tab → il peso è persistito.

### 2.6 Salute & promemoria
- [ ] Tab "Salute" → statistiche corrette (km totali ≥ km della passeggiata di prima).
- [ ] Tap "💉 Vaccino annuale" → alert "Promemoria impostato Tra 365 giorni".
- [ ] Il promemoria appare nella sezione "PROMEMORIA".
- [ ] Tap "Rimuovi" → scompare.

### 2.7 Impostazioni
- [ ] Tab "Impostazioni" → tap "Diventa Premium" → conferma "Attiva (demo)" → la card diventa "Attivo ✓".
- [ ] Tap "Rifai onboarding" → confermi → torna allo step Welcome.
- [ ] Completa di nuovo onboarding → i dati cane sono sovrascritti.
- [ ] "Cancella tutte le passeggiate" → confermi → tab Home azzera "Passeggiate totali".

### 2.8 Resilienza
- [ ] Modalità aereo ON → app continua a funzionare (mappa cached, salvataggi locali OK).
- [ ] Spegni e riaccendi telefono → l'app riapre alla Home, dati persistiti.
- [ ] Negazione permessi: nega GPS al tracker → vedi alert "Posizione negata", non crash.
- [ ] Negazione fotocamera → alert "Fotocamera negata", non crash.

---

## 3. Miglioramenti da fare (prioritizzati)

### 🔴 P0 — Necessari prima del Play Store

#### 3.1 Build release firmata
**Stato:** workflow supporta `build_type=release` ma serve un keystore.
**Come:**
1. Genera keystore localmente:
   ```bash
   keytool -genkey -v -keystore passeggiata-furba.keystore \
     -alias passeggiata-furba -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Codifica in base64: `base64 -w0 passeggiata-furba.keystore > keystore.b64`.
3. Aggiungi 4 secrets al repo GitHub:
   - `ANDROID_KEYSTORE_BASE64` (contenuto di `keystore.b64`)
   - `ANDROID_KEYSTORE_PASSWORD`
   - `ANDROID_KEY_ALIAS` (`passeggiata-furba`)
   - `ANDROID_KEY_PASSWORD`
4. Estendi il workflow con uno step che decodifica il keystore e patcha `android/app/build.gradle` per firmare il release.
5. Trigger: `gh workflow run "Build Android APK" -f build_type=release`.

#### 3.2 Privacy policy + termini d'uso
- Required dal Play Store dato che usiamo posizione + fotocamera.
- Crea pagina pubblica (es. su GitHub Pages o landing page) con privacy policy che dichiari: uso GPS solo durante walk tracker, foto salvate solo locale, niente analytics terze parti.
- Aggiungi link nelle Settings.

#### 3.3 Google Play Console listing
- App icon 512x512 (già hai l'icona, serve esportarla).
- Feature graphic 1024x500.
- 4–8 screenshot del telefono.
- Descrizione breve (80 char) + lunga (4000 char).
- Categoria: Lifestyle o Health & Fitness.

### 🟡 P1 — Funzionalità mancanti vs. promessa "100% completa"

#### 3.4 Supabase community walks (vere)
**Stato:** ora i percorsi popolari sono mock hardcoded in `app/(tabs)/map.tsx`.
**Come:**
1. Crea progetto Supabase, abilita PostGIS.
2. Tabelle: `walk_routes(id, name, geom geography(LineString), rating, total_walks)`, `walk_uploads(id, user_id, path geometry, distance, duration, started_at)`, `heatmap_points(geom geography(Point), weight)`.
3. RLS policy: read pubblico per `walk_routes`, write solo per autenticato su `walk_uploads`.
4. Imposta in `.env` o GitHub secret `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
5. Estendi `lib/services/supabase-service.ts` per leggere le rotte vicine via RPC `nearby_routes(lat, lng, radius_km)`.
6. In `map.tsx` sostituisci `MOCK_WALKS` con un `useQuery` su Supabase.

#### 3.5 Lemon Squeezy payment integration
**Stato:** Premium è solo un toggle demo in Settings.
**Come:**
1. Crea store Lemon Squeezy, prodotto "Passeggiata Furba Premium" variant `€3.99/mese`.
2. Genera API key + webhook secret.
3. Imposta secrets `EXPO_PUBLIC_LEMON_SQUEEZY_API_KEY`, `EXPO_PUBLIC_LEMON_SQUEEZY_STORE_ID`, `EXPO_PUBLIC_LEMON_SQUEEZY_VARIANT_ID`.
4. Sostituisci la funzione `togglePremium` in `app/(tabs)/settings.tsx` con apertura del checkout via `expo-web-browser` su `https://yourstore.lemonsqueezy.com/buy/<variant>`.
5. Webhook handler: aggiungi endpoint `/api/webhooks/lemonsqueezy` nel server tRPC che aggiorna stato `premium` per user.
6. Per native serve sync polling: al ritorno dal browser, chiama Supabase `subscriptions` per verificare lo stato.

#### 3.6 Multi-cane (Premium)
- Estendi `Storage.getDogProfile` → `getDogs(): DogProfile[]`.
- Limite 1 cane se `!premium`, illimitato se Premium.
- Selettore in alto nel tab Profilo per switchare tra cani.

#### 3.7 Mappe offline (Premium)
- Strategia: download tile OSM in un range geografico al checkpoint Premium.
- Libreria: `expo-file-system` per memorizzare le tile, custom `tile://` handler in Leaflet.
- Più semplice: usa `react-native-maps` con `Mapbox` (offline support nativo) — ma richiede chiave Mapbox.

### 🟢 P2 — Polish e UX

#### 3.8 Haptic feedback
- `expo-haptics` già installato. Aggiungi:
  - `Haptics.impactAsync(ImpactFeedbackStyle.Medium)` al tap "Inizia/Termina passeggiata".
  - `Haptics.notificationAsync(Success)` al salvataggio walk.
  - `Haptics.selectionAsync()` ai filtri/chip della mappa.

#### 3.9 Background GPS (per passeggiate lunghe con schermo spento)
- Installa `expo-task-manager` + `expo-location` background.
- Aggiungi `ACCESS_BACKGROUND_LOCATION` in `app.config.ts`.
- Implementa `Location.startLocationUpdatesAsync` con TaskManager handler che accumula in AsyncStorage.

#### 3.10 Compressione foto
- `ImagePicker.launchCameraAsync` accetta `quality: 0.6` ma genera comunque JPEG ~2MB.
- Usa `expo-image-manipulator` per ridurre a 1200px max + qualità 0.7 → ~250 KB.
- Salva il risultato locale; il `uri` salvato in `Storage.WalkRecord.photos` punta al file ridotto.

#### 3.11 Onboarding più ricco
- Slide aggiuntiva: scelta avatar emoji del cane (🐕 🐩 🐺 🐶 🦮 🐕‍🦺).
- Importazione vaccini esistenti (data ultimo vaccino → calcola scadenza).

#### 3.12 Dark mode
- `userInterfaceStyle: "automatic"` già impostato in `app.config.ts`.
- Verifica i colori del tema in `theme.config.js`: serve palette dark dedicata.
- Le tile OSM dark: usa `https://tile-{s}.openstreetmap.fr/hot/{z}/{x}/{y}.png` o `Stadia Dark`.

#### 3.13 Accessibilità
- Tutti i `TouchableOpacity` dovrebbero avere `accessibilityLabel` e `accessibilityRole`.
- Verifica contrasto colori (Forest Green su Soft Cream): `#2D5A3D` su `#FFF5E6` → contrasto ~10:1 ✓.
- Aumenta `minTouchTarget` a 44 pt minimo (alcuni emoji nelle filter chip sono al limite).

#### 3.14 Performance
- `LeafletMap` ricrea l'HTML ogni volta che cambia il polyline → ottimizza usando solo `injectJavaScript` per gli update (già parzialmente fatto, ma `useMemo` dipende da `JSON.stringify(polyline)` che invalida troppo).
- Aggiungi `React.memo` ai card delle nearby walks in Home.
- Lazy-load `LeafletMap` con `React.lazy` per non bloccare il primo paint.

### 🔵 P3 — Nice to have

#### 3.15 Social sharing
- Bottone "Condividi" sul Walk Summary che usa `expo-sharing` per inviare un'immagine compositiva (mappa + stats + foto).

#### 3.16 Achievement / badge
- "Prima passeggiata", "Streak 7 giorni", "Maratona (10 km)".
- Notifica in-app quando si sbloccano.

#### 3.17 Export GPX
- Bottone su ogni walk per esportare il path in formato GPX condivisibile.

#### 3.18 Localizzazione
- Estrai stringhe italiane in `i18n/it.json`.
- Aggiungi `i18n/en.json`, `i18n/es.json` con `expo-localization`.

---

## 4. Comandi rapidi

```bash
# Avviare dev server (web + metro)
cd "/home/locoomo/Scrivania/building factory/saas_app/smart_walk_app/passeggiata-furba"
pnpm dev

# TypeScript check
pnpm check

# Lanciare nuova build APK su GitHub Actions
GH_TOKEN=<your_token> gh workflow run "Build Android APK" \
  --repo amzajaguar-blip/passeggiata-furba -f build_type=debug

# Scaricare l'APK dell'ultimo run
GH_TOKEN=<your_token> gh run download --repo amzajaguar-blip/passeggiata-furba --dir apk-output

# Push modifiche (richiede token valido nel remote)
git add -A
git commit -m "feat: ..."
git push origin main
```

---

## 5. Dipendenze chiave (versioni installate)

| Libreria | Versione | Scopo |
|---|---|---|
| `expo` | `~54.0.29` | SDK base |
| `react-native` | `0.81.5` | Runtime |
| `expo-router` | `~6.0.19` | File-based routing |
| `expo-location` | `^55.1.8` | GPS |
| `expo-image-picker` | `^55.0.19` | Fotocamera |
| `expo-notifications` | `~0.32.15` | Promemoria |
| `react-native-webview` | `13.16.0` | Container Leaflet (no API key) |
| `@react-native-async-storage/async-storage` | `^2.2.0` | Persistenza locale |
| `nativewind` | `^4.2.1` | Tailwind per RN |
| `@supabase/supabase-js` | `^2.105.1` | Backend (non ancora attivo) |

---

## 6. File chiave da conoscere

| File | Ruolo |
|---|---|
| `app/_layout.tsx` | Root: error boundary, splash hide, providers |
| `app/(tabs)/index.tsx` | Home + onboarding gate |
| `app/walk-tracker.tsx` | Tracker GPS + mappa live |
| `app/walk-summary.tsx` | Riepilogo + salvataggio |
| `components/leaflet-map.tsx` | Mappa OSM via WebView |
| `lib/services/storage.ts` | API AsyncStorage tipata |
| `lib/services/gps-service.ts` | Hook GPS tracking |
| `app.config.ts` | Config Expo (permessi, plugin) |
| `.github/workflows/build-android-apk.yml` | CI build APK |

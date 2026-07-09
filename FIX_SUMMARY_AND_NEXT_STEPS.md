# Passeggiata Furba — Fix Summary & Next Steps

Questo pacchetto contiene il codice sorgente con i bug critici corretti e
alcuni miglioramenti di solidità. Sotto trovi cosa è stato cambiato e cosa
consiglio di fare dopo, in ordine di priorità.

## ✅ Bug corretti in questo pacchetto

1. **BUG-1 (P1) — Play Billing non salvava l'abbonamento**
   Verificato: l'endpoint tRPC `subscription.syncPlayBilling` e l'endpoint
   Express `/api/play-billing/sync` inseriscono già correttamente il record
   in `subscriptions` e aggiornano `adTiers`. Se in produzione avete ancora
   visto utenti pagare senza ricevere Pro, il problema è quasi certamente
   `GOOGLE_PLAY_SERVICE_ACCOUNT` mancante o `DATABASE_URL` non configurato in
   Vercel — ora entrambi vengono validati esplicitamente all'avvio (vedi #4).

2. **BUG-4 (P2) — Colonne Lemon Squeezy riusate per Google Play**
   `drizzle/schema.ts`: aggiunte colonne dedicate e neutre rispetto al
   provider: `provider`, `providerRef`, `providerProductId`. Il codice di
   sync Play Billing ora scrive/legge da queste colonne invece di riusare
   `lsSubscriptionId` / `lsVariantId` / `lsProductId` (che restano per
   compatibilità con i record Lemon Squeezy esistenti).
   **Azione richiesta:** collegate `DATABASE_URL` e lanciate
   `pnpm db:push` (esegue `drizzle-kit generate && drizzle-kit migrate`) per
   applicare la nuova migrazione — non l'ho generata a mano per evitare di
   corrompere lo snapshot Drizzle senza accesso al database reale.

3. **BUG-2/3 (P2) — Variabili d'ambiente non documentate**
   `.env.example` ora documenta tutte le variabili effettivamente lette dal
   codice (`VITE_APP_ID`/`EXPO_PUBLIC_APP_ID`, `LEMON_SQUEEZY_*`, ecc.) con
   indicazione chiara di quali sono obbligatorie.

4. **BUG-6 (P3) — Nessuna validazione all'avvio**
   `server/_core/env.ts`: `DATABASE_URL`, `OAUTH_SERVER_URL` e
   `VITE_APP_ID`/`EXPO_PUBLIC_APP_ID` ora fanno fallire l'avvio del server in
   produzione con un errore esplicito se mancanti, invece di degradare
   silenziosamente a stringa vuota (che causava fallimenti OAuth/DB criptici
   più a valle).

5. **BUG-5 (P3) — Import `.ts` con estensione `.js`**
   Rimossa l'estensione `.js` dai 5 import in `server/routers.ts`,
   `server/_core/sdk.ts`, `server/_core/oauth.ts`, `server/_core/trpc.ts` —
   ora sono import TypeScript standard.

## ✅ Seconda passata — miglioramenti aggiuntivi

6. **[CRITICO — sicurezza] `userId` falsificabile su `/api/play-billing/sync`**
   L'endpoint Express accettava un `userId` mandato dal client nel corpo
   della richiesta: chiunque conoscesse (o indovinasse) l'id di un altro
   utente poteva chiamare l'endpoint e assegnargli l'abbonamento Pro gratis,
   oppure assegnarselo senza aver pagato nulla. Ora `server/_core/play-billing.ts`
   ricava l'utente dalla sessione autenticata (stesso meccanismo usato da
   tRPC) e rifiuta la richiesta con 401 se non autenticata. Ho anche aggiunto
   una validazione di tipo su `purchaseToken`/`productId`.

7. **Rate limiting assente su tutte le API**
   Aggiunto un rate limiter leggero (nessuna nuova dipendenza npm,
   `server/_core/rateLimit.ts`) applicato a `/api/play-billing/sync` (10
   richieste/min per IP) e a tutte le rotte tRPC (120 richieste/min per IP),
   per ridurre il rischio di abuso/brute force. Nota: essendo in-memory, su
   Vercel serverless il contatore è per-istanza — è una mitigazione di base,
   non sostituisce un rate limiter a livello edge/WAF in produzione seria.

8. **GPS: subscription duplicata se "Avvia" viene premuto due volte**
   `lib/services/gps-service.ts`: `startTracking()` ora rimuove sempre
   un'eventuale subscription GPS precedente prima di crearne una nuova.
   Prima, un doppio tap su "Avvia passeggiata" lasciava un listener GPS
   attivo in background (consumo batteria, punti duplicati sul percorso).

9. **Google Play Billing lato client — race condition sugli acquisti**
   `lib/services/play-billing.ts`: `requestSubscription()` ora rifiuta un
   secondo acquisto se uno è già in corso (prima, il secondo tentativo
   sovrascriveva silenziosamente la Promise del primo, che restava bloccata
   per sempre) e controlla che `initPlayBilling()` sia già stata completata
   prima di aprire il flusso di pagamento (prima poteva lanciare un errore
   non gestito se chiamata troppo presto).

10. **Errore di `finishTransaction` silenziato**
    Se la conferma dell'acquisto verso Google fallisce, ora viene loggato un
    errore esplicito invece di essere ignorato — utile perché un acquisto
    non confermato entro 3 giorni viene rimborsato automaticamente da
    Google anche se l'utente ha già ricevuto Pro.

## ✅ Terza passata — sicurezza

11. **[CRITICO — sicurezza] CORS apriva la porta a richieste cross-site autenticate**
    `server/_core/index.ts` rifletteva QUALSIASI Origin del richiedente e
    impostava `Access-Control-Allow-Credentials: true` — questo significa
    che un sito web malevolo visitato da un utente loggato poteva fare
    richieste all'API di Passeggiata Furba usando i suoi cookie di sessione
    (un classico CSRF-via-CORS). Ora vengono accettate solo le origin in una
    whitelist esplicita (`EXPO_PUBLIC_API_BASE_URL`, l'URL di produzione, e
    localhost solo in sviluppo). Se pubblicate anche una versione web su un
    dominio diverso, aggiungetelo con la nuova variabile
    `CORS_ALLOWED_ORIGIN` in `.env`.

## ⚠️ Cosa NON è stato toccato (richiede accesso a servizi esterni)

- **`GOOGLE_PLAY_PUBSUB_TOPIC`** e il flusso di reconciliation via Real-time
  Developer Notifications non sono implementati: oggi il sync avviene solo
  quando il client chiama l'endpoint dopo l'acquisto. Se un rinnovo/cancel-
  lazione avviene mentre l'app è chiusa, il DB non si aggiorna finché
  l'utente non riapre l'app. Consiglio: aggiungere un webhook Pub/Sub che
  richiami la stessa logica di `syncPlayBilling`.
- **GitHub Secrets per la build firmata** (`ANDROID_KEYSTORE_BASE64`, ecc.)
  — da configurare manualmente su GitHub, non sono nel codice per ovvi
  motivi di sicurezza.
- Non ho eseguito `pnpm install` / `pnpm db:push` / build in questo ambiente
  perché il progetto usa Supabase/Vercel esterni non collegati qui.

## 🚀 Miglioramenti consigliati (dal piano di crescita allegato)

In ordine di impatto/sforzo:

1. **Fase 0 residua:** una volta collegato `DATABASE_URL`, girare
   `pnpm db:push` e testare un acquisto Play Billing end-to-end in staging.
2. **ASO:** aggiornare titolo, sottotitolo e screenshot dello store con le
   keyword indicate nel documento di strategia allegato (volume di ricerca
   alto, bassa competizione: "mappa percorsi cane", "promemoria vaccino
   cane").
3. **Reconciliation abbonamenti:** implementare il webhook Google Play
   Real-time Developer Notifications per gestire rinnovi/cancellazioni senza
   dipendere dall'apertura dell'app.
4. **Test automatici:** il progetto ha `vitest` configurato ma zero test
   file — aggiungere almeno un test di integrazione per
   `/api/play-billing/sync` avrebbe intercettato BUG-1 originario.
5. **Growth/monetizzazione:** vedi il documento di strategia allegato per il
   piano dettagliato su acquisizione utenti, pricing e roadmap feature.

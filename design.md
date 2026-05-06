# Passeggiata Furba - Design System & UI/UX Strategy

## Brand Identity

**Passeggiata Furba** è un'app enterprise di livello internazionale che aiuta proprietari di cani a scoprire i migliori percorsi di passeggiata. Il design comunica **fiducia, cura emotiva, e semplicità**.

### Color Palette
- **Forest Green (#1E3D2F)**: Natura, sicurezza, affidabilità — colore primario per CTA e accenti
- **Sunset Orange (#F47C35)**: Energia, calore, connessione emotiva — colore secondario per highlight
- **Soft Cream (#FFF5E6)**: Background neutro e caldo
- **Charcoal (#2B2B2B)**: Testo primario e icone
- **Light Gray (#E8E8E8)**: Divider e background secondario

### Typography
- **Primary Font**: Plus Jakarta Sans (moderna, friendly, leggibile)
- **Headlines**: Bold, 24-32px
- **Body**: Regular, 14-16px
- **Small text**: Medium, 12-14px

### Logo & Visual Language
- Cane stilizzato in movimento con mappa pin integrato
- Icone arrotondate e friendly (non corporate rigido)
- Spacing generoso per sensazione di aria e libertà
- Rounded corners (16-20px) per UI elements

---

## Screen Architecture

### 1. **Onboarding Flow** (First-Time Users)
- **Splash Screen**: Logo + brand message "Scopri le migliori passeggiate per il tuo cane"
- **Welcome Screen**: Introduzione breve + CTA "Inizia"
- **Dog Profile Setup**: Form per razza, età, energia (bassa/media/alta)
- **Location Permission**: Richiesta permesso geolocalizzazione
- **Completion**: Redirect a Home

### 2. **Home Screen** (Tab: Home)
**Primary Content:**
- Header: "Ciao [Nome Proprietario]! 👋" + profilo cane rapido
- **Featured Walk**: Card grande con passeggiata consigliata (foto, distanza, durata, rating)
- **Filters Section**: Chip selezionabili (Ombra, Poco fango, Fontanella, Pochi cani, Sicuro)
- **Nearby Walks List**: FlatList di percorsi locali con:
  - Foto copertina
  - Nome percorso
  - Distanza + tempo stimato
  - Numero di stelle (rating)
  - Numero di cani visti (community data)
- **CTA "Inizia Passeggiata"**: Floating button verde

**Functionality:**
- Tap su walk → Detail screen
- Swipe filtri per aggiungere/rimuovere
- Pull-to-refresh per aggiornare lista

### 3. **Walk Detail Screen**
**Primary Content:**
- Hero image (full width)
- Walk name + rating + review count
- Map view con percorso tracciato
- Difficulty badge (Facile/Medio/Difficile)
- Features list: Fontanella ✓, Ombra ✓, Poco fango ✗, ecc.
- Community reviews (avatar + testo breve)
- **CTA "Inizia Tracker"**: Green button

### 4. **Walk Tracker Screen** (During Walk)
**Primary Content:**
- Live map con posizione utente + percorso tracciato
- Timer + distanza percorsa + calorie stimate
- **Foto "Prima/Dopo"**: 2 button per scattare foto del cane
- Pause/Stop button
- Real-time stats: velocità, altitudine, passi cane (se disponibile)

**Functionality:**
- GPS tracking in background
- Haptic feedback ogni 500m
- Salvataggio automatico se app chiusa

### 5. **Walk Summary Screen** (Post-Walk)
**Primary Content:**
- Recap: distanza, durata, calorie, foto prima/dopo
- Rating walk (1-5 stelle)
- Add notes (opzionale)
- **CTA "Salva Passeggiata"**: Green button

**Functionality:**
- Salva nel tracker personale
- Opzione per condividere con community

### 6. **Dog Profile Screen** (Tab: Profilo Cane)
**Primary Content:**
- Avatar cane (foto upload)
- Name + Razza + Età + Energia level
- Health Stats:
  - Passeggiate totali (km, ore)
  - Media settimanale
  - Streak (giorni consecutivi)
- Reminder section:
  - Vaccini (data prossima)
  - Antiparassitari (data prossima)
  - Toelettatura (data prossima)
- **Edit button** → Edit dog profile

**Functionality:**
- Tap reminder → Set notification
- Tap stats → View detailed history

### 7. **Multiple Dogs Screen** (Premium Feature)
**Primary Content:**
- List di cani aggiunti
- Tap cane → Switch profilo
- "+ Aggiungi cane" button

### 8. **Reminder/Health Screen** (Tab: Salute)
**Primary Content:**
- Calendar view con reminder imminenti
- Cards per vaccini, antiparassitari, toelettatura
- Completed checkmarks
- **CTA "Segna come completato"** per ogni reminder

**Functionality:**
- Tap reminder → Add to calendar
- Notification 1 giorno prima

### 9. **Community/Map Screen** (Tab: Mappa)
**Primary Content:**
- Full map view con tutti i percorsi
- Filtri: Razza, Energia, Features
- Heatmap: Zone con più passeggiate (colore più intenso = più frequentate)
- Tap marker → Walk detail

**Functionality:**
- Offline map download (Premium)
- Share location con altri utenti (opt-in)

### 10. **Settings Screen** (Tab: Impostazioni)
**Primary Content:**
- Profilo utente (nome, email, foto)
- Preferenze notifiche
- Privacy & Data
- Subscription status (Freemium/Premium badge)
- **"Upgrade to Premium"** button
- Logout

---

## Key User Flows

### Flow 1: First Walk (Onboarding)
1. User apre app → Onboarding
2. Setup profilo cane (razza, età, energia)
3. Permesso geolocalizzazione
4. Home screen con walk suggerite
5. Tap walk → Detail
6. Tap "Inizia Tracker" → Walk tracker
7. Durante walk: foto prima/dopo
8. Stop → Summary screen
9. Salva → Redirect Home

### Flow 2: Routine Walk
1. Home screen
2. Tap featured walk o dalla lista
3. "Inizia Tracker"
4. Walk tracker (GPS, foto)
5. Stop → Summary
6. Salva

### Flow 3: Check Health Reminders
1. Tab "Salute"
2. View prossimi reminder
3. Tap reminder → Set notification
4. Completed checkmark

### Flow 4: Upgrade to Premium
1. Tab "Impostazioni"
2. Tap "Upgrade to Premium"
3. Subscription screen (€3,99/mese)
4. Unlock: multipli cani, mappe offline, statistiche avanzate, alert veterinario

---

## Freemium vs Premium

### Freemium (Free)
- 1 cane
- Mappe base (online only)
- Walk tracker con foto
- Reminder base (vaccini, antiparassitari, toelettatura)
- Community walks view (read-only)

### Premium (€3,99/mese)
- Cani multipli
- Mappe offline
- Statistiche salute avanzate (km/settimana, trend, comparazione)
- Alert veterinario personalizzato
- Shop accessori affiliato (link a prodotti)
- Priority support

---

## Interaction Patterns

### Press Feedback
- **Primary buttons (Green)**: Scale 0.97 + haptic light
- **Secondary buttons (Orange)**: Opacity 0.8
- **List items**: Opacity 0.7 on press
- **Icons**: Opacity 0.6 on press

### Animations
- **Screen transitions**: Fade in 200ms (subtle)
- **Button press**: Scale 80ms (responsive)
- **List scroll**: Smooth, no jank
- **Map interactions**: Smooth zoom/pan

### Haptics
- Walk start: Medium impact
- Milestone reached (500m): Light impact
- Reminder alert: Success notification
- Error: Error notification

---

## Accessibility

- **Color contrast**: WCAG AA minimum (4.5:1 for text)
- **Font size**: Min 14px body text
- **Touch targets**: Min 48x48pt
- **Icons + labels**: Always paired
- **Dark mode**: Full support (automatic via system setting)

---

## Performance Considerations

- **Maps**: Lazy load, cache tiles
- **Photos**: Compress before upload (max 2MB)
- **Lists**: Virtual scrolling (FlatList)
- **GPS**: Battery-efficient (update every 5-10s during walk)
- **Offline**: Core features work without internet

---

## Next Steps

1. Create tab navigation with 5 tabs: Home, Profilo Cane, Salute, Mappa, Impostazioni
2. Implement Home screen with walk list + filters
3. Implement Walk Detail + Tracker
4. Add dog profile management
5. Implement reminder system
6. Add community/map view
7. Subscription/premium gating
8. Polish animations and branding

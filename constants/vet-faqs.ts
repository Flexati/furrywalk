/**
 * Vet Health FAQ Library — Static Content
 * 
 * Educational content about dog health and safety during walks.
 * NOT personalized veterinary advice — always consult a real vet for specific concerns.
 */

export interface VetFAQ {
  id: string;
  question: string;
  answer: string;
  category: 'hydration' | 'temperature' | 'parasites' | 'paw_care' | 'behavior' | 'post_walk' | 'safety';
}

export const VET_FAQS: VetFAQ[] = [
  {
    id: 'hydration_1',
    category: 'hydration',
    question: 'Quanta acqua deve bere il mio cane durante una passeggiata?',
    answer: 'In generale, un cane dovrebbe bere circa 50-60 ml di acqua per kg di peso corporeo al giorno. Durante passeggiate lunghe o caldi, offri acqua ogni 15-20 minuti. Porta sempre una bottiglietta portatile e una ciotola pieghevole. Se il cane ansima molto o sembra disidratato (gengive secche, pelle che rimane "in piedi" se pizzicata), fermati e fallo bere immediatamente.',
  },
  {
    id: 'hydration_2',
    category: 'hydration',
    question: 'Come capisco se il mio cane è disidratato?',
    answer: 'Segni di disidratazione: gengive secche o appiccicose, occhi infossati, pelle che pierde elasticità (test del pizzicotto: solleva la pelle sul collo, dovrebbe tornare giù in meno di 2 secondi), letargia, ansima eccessivo. Se noti questi sintomi, offri acqua fresca e consulta un veterinario se non migliora rapidamente.',
  },
  {
    id: 'temp_1',
    category: 'temperature',
    question: 'A che temperatura è troppo caldo per passeggiare?',
    answer: 'Regola generale: se l\'asfalto è troppo caldo per il tuo palmo (testa la mano per 7 secondi), è troppo caldo per le zampe del cane. Sopra i 25°C, esce solo nelle ore fresche (prima delle 8:00 o dopo le 20:00). Sopra i 30°C, evita passeggiate lunghe — preferisci brevi uscite igieniche all\'ombra.',
  },
  {
    id: 'temp_2',
    category: 'temperature',
    question: 'Il mio cane può camminare sulla neve o al freddo?',
    answer: 'Dipende dalla razza e dalla durata. Cani a pelo corto o piccola taglia soffrono sotto i -5°C. Sopra i 30 minuti a temperature sotto zero, usa un cappottino. Proteggi le zampe da ghiaccio e sale antigelo (causano irritazione). Asciuga bene le zampe al rientro.',
  },
  {
    id: 'temp_3',
    category: 'temperature',
    question: 'Come evito il colpo di calore durante la passeggiata?',
    answer: 'Prevenzione: evita ore calde, porta acqua, preferisci percorsi ombreggiati, riduci intensità e durata. Sintomi di colpo di calore: ansima estremo, gengive rosse scure, vomito, barcollamento, collasso. Se succede: sposta il cane all\'ombra, bagnalo con acqua tiepida (non gelata), offri acqua fresca, chiama subito il vet.',
  },
  {
    id: 'parasites_1',
    category: 'parasites',
    question: 'Quanto spesso devo controllare il cane per zecche dopo una passeggiata?',
    answer: 'Controlla SEMPRE il cane dopo ogni passeggiata in aree verdi, soprattutto da primavera a autunno. Zone chiave: testa, collo, orecchie, ascelle, inguine, tra le dita delle zampe. Le zecche trasmettono malattie gravi (ehrlichiosi, babesiosi). Rimuovi con pinzetta adatta (afferra vicino alla pelle, tira dritto), disinfetta, e monitora per 2-3 settimane.',
  },
  {
    id: 'parasites_2',
    category: 'parasites',
    question: 'Devo usare antiparassitari anche in inverno?',
    answer: 'Sì. Zecche e pulci sopravvivono anche sotto i 10°C. Usa un prodotto tutto l\'anno (spot-on, collare, o compressa). Chiedi al veterinario quale sia il migliore per la tua zona e lo stile di vita del cane.',
  },
  {
    id: 'parasites_3',
    category: 'parasites',
    question: 'Come prevengo le pulci durante le passeggiate?',
    answer: 'Evita aree con erba alta o dove ci sono animali randagi. Usa un preventivo mensile (es. fipronil, imidacloprid, o prodotti orali come isoxazoline). Se trovi pulci, pettina con pettine a denti fitti, lava la cuccia a 60°C, e tratta l\'ambiente con spray specifico.',
  },
  {
    id: 'paw_1',
    category: 'paw_care',
    question: 'Quanto spesso devo controllare i polpastrelli del cane?',
    answer: 'Controlla le zampe PRIMA e DOPO ogni passeggiata. Cerca: tagli, corpi estranei (forasacchi, vetri), arrossamenti, unghie rotte. Dopo la passeggiata, pulisci con panno umido per rimuovere sale, fango, o sostanze chimiche. In estate, idrata con balsamo specifico se i cuscinetti sembrano secchi o screpolati.',
  },
  {
    id: 'paw_2',
    category: 'paw_care',
    question: 'Cosa faccio se il cane si taglia un polpastrello?',
    answer: 'Ferita piccola: pulisci con soluzione fisiologica, applica disinfettante (clorexidina), copri con garza se sanguina molto. Ferita profonda o sanguinamento continuo: vai dal veterinario. Evita passeggiate su terreni ruvidi fino a guarigione (7-10 giorni).',
  },
  {
    id: 'paw_3',
    category: 'paw_care',
    question: 'Le unghie troppo lunghe fanno male durante la passeggiata?',
    answer: 'Sì. Unghie lunghe cambiano l\'appoggio e causano dolori articolari. Tagliale ogni 3-4 settimane (o quando senti "clic" sul pavimento). Usa tronchesino adatto o lima elettrica. Se sei insicuro, chiedi al veterinario o toelettatore.',
  },
  {
    id: 'behavior_1',
    category: 'behavior',
    question: 'Il mio cane tira al guinzaglio: è pericoloso?',
    answer: 'Sì. Tirare può causare: traumi alla trachea (tosse, soffocamento), lesioni cervicali, ansia. Usa un guinzaglio corto (1-1,5m), premia quando cammina al fianco, fermati quando tira. Per cani forti, usa una pettorina ad H o anti-trazione. Evita il collare se il cane tossisce.',
  },
  {
    id: 'behavior_2',
    category: 'behavior',
    question: 'Come gestisco un cane che ha paura di altri cani o persone?',
    answer: 'Mantieni distanza, non forzare incontri. Usa premi per creare associazioni positive. Se la paura è grave (trema, abbaia, scappa), consulta un educatore cinofilo o veterinario comportamentalista. Evita aree affollate finché non migliora.',
  },
  {
    id: 'behavior_3',
    category: 'behavior',
    question: 'Il mio cane mangia cose per terra: come lo fermo?',
    answer: 'Comando "lascia": insegna a casa con premi. Durante la passeggiata, usa guinzaglio corto e distrai con giochi o premi quando passa vicino a rifiuti. muzzle (museruola) morbida se il comportamento persiste (sicurezza prima). Evita zone sporche.',
  },
  {
    id: 'post_walk_1',
    category: 'post_walk',
    question: 'Cosa devo controllare dopo ogni passeggiata?',
    answer: 'Checklist post-passeggiata:\n1. Zampe: tagli, corpi estranei, arrossamenti\n2. Mantello: zecche, pulci, forasacchi\n3. Orecchie: sporco, arrossamenti (specialmente cani a orecchie pendenti)\n4. Occhi: secrezioni, arrossamenti\n5. Comportamento: zoppia, letargia, sete eccessiva\nSe noti anomalie, contatta il veterinario.',
  },
  {
    id: 'post_walk_2',
    category: 'post_walk',
    question: 'Devo lavare il cane dopo ogni passeggiata?',
    answer: 'No. Lavaggi frequenti rimuovono oli protettivi della pelle. Detergi solo zampe e zona genitale/anale con panno umido o salviette specifiche. Bagno completo solo se molto sporco (max 1-2 volte/mese con shampoo delicato). Asciuga bene, soprattutto in inverno.',
  },
  {
    id: 'post_walk_3',
    category: 'post_walk',
    question: 'Quanto deve riposare il cane dopo una passeggiata lunga?',
    answer: 'Dipende da intensità e cane. Passeggiata leggera (30 min): 15-30 min di riposo. Intensa (1+ ora, corsa, hikes): 1-2 ore. Offri acqua fresca, lascia sdraiare in zona tranquilla. Se il cane è anziano o con problemi articolari, estendi il riposo e evita superfici dure.',
  },
  {
    id: 'safety_1',
    category: 'safety',
    question: 'È sicuro far giocare il cane con bastoni durante la passeggiata?',
    answer: 'No. I bastoni possono: scheggiarsi e ferire bocca/gola, causare soffocamento, conficcarsi in gola (perforazione). Usa giochi sicuri: palline in gomma, frisbee morbidi, corda. Evita anche oggetti appuntiti o piccoli che può ingerire.',
  },
];

export const VET_FAQ_CATEGORIES = {
  hydration: 'Idratazione',
  temperature: 'Temperatura e meteo',
  parasites: 'Parassiti (zecche e pulci)',
  paw_care: 'Cura delle zampe',
  behavior: 'Comportamento al guinzaglio',
  post_walk: 'Controlli post-passeggiata',
  safety: 'Sicurezza generale',
} as const;

export const DISCLAIMER_TEXT = 
  '⚠️ Contenuto informativo generale. Non sostituisce una visita veterinaria professionale. ' +
  'Per qualsiasi dubbio sulla salute del tuo cane, consulta sempre un veterinario abilitato.';
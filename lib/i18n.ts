import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';

const translations = {
  en: {
    welcome: 'Welcome to Smart Walk',
    startWalk: 'Start Walk',
    stopWalk: 'Stop Walk',
    settings: 'Settings',
    language: 'Language',
    profile: 'Profile',
    history: 'History',
    summary: 'Summary',
    duration: 'Duration',
    distance: 'Distance',
  },
  it: {
    welcome: 'Benvenuto in Passeggiata Furba',
    startWalk: 'Inizia Passeggiata',
    stopWalk: 'Termina Passeggiata',
    settings: 'Impostazioni',
    language: 'Lingua',
    profile: 'Profilo',
    history: 'Cronologia',
    summary: 'Riepilogo',
    duration: 'Durata',
    distance: 'Distanza',
  },
};

export const i18n = new I18n(translations);

i18n.enableFallback = true;
// Set the locale once at the beginning of your app.
const locales = getLocales();
i18n.locale = locales && locales.length > 0 ? locales[0].languageCode : 'it';

export const setLanguage = (lang: string) => {
  i18n.locale = lang;
};

import { createI18n } from 'vue-i18n';
import en from './locales/en';
import es from './locales/es';

export type SupportedLocale = 'es' | 'en';

type LocaleChangeListener = (locale: SupportedLocale) => void;

export const supportedLocales: { code: SupportedLocale; name: string }[] = [
  { code: 'es', name: 'Español' },
  { code: 'en', name: 'English' },
];

const savedLocale = (
  typeof localStorage !== 'undefined' ? localStorage.getItem('triada-locale') : null
) as SupportedLocale | null;

export const i18n = createI18n({
  legacy: false,
  locale: savedLocale || 'es',
  fallbackLocale: 'en',
  messages: {
    es,
    en,
  },
});

const localeChangeListeners = new Set<LocaleChangeListener>();

export function setLocale(locale: SupportedLocale): void {
  i18n.global.locale.value = locale;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('triada-locale', locale);
  }

  for (const listener of localeChangeListeners) {
    listener(locale);
  }
}

export function getLocale(): SupportedLocale {
  return i18n.global.locale.value as SupportedLocale;
}

export function onLocaleChange(listener: LocaleChangeListener): () => void {
  localeChangeListeners.add(listener);

  return () => {
    localeChangeListeners.delete(listener);
  };
}

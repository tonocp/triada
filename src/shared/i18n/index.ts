import { createI18n } from 'vue-i18n';
import en from './locales/en';
import es from './locales/es';

export type SupportedLocale = 'es' | 'en';

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

export function setLocale(locale: SupportedLocale): void {
  i18n.global.locale.value = locale;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('triada-locale', locale);
  }
}

export function getLocale(): SupportedLocale {
  return i18n.global.locale.value as SupportedLocale;
}

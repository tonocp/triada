import { getIntlLocale, getLocale } from '@/shared/i18n';
import { computed, ref } from 'vue';

export type SupportedCurrency = 'USD' | 'EUR';

export interface CurrencyInfo {
  code: SupportedCurrency;
  symbol: string;
  name: string;
}

export const supportedCurrencies: CurrencyInfo[] = [
  { code: 'USD', symbol: '$', name: 'Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
];

const defaultCurrency: CurrencyInfo = supportedCurrencies.find(
  (currency) => currency.code === 'EUR',
)!;

const savedCurrency =
  typeof localStorage !== 'undefined' ? localStorage.getItem('triada-currency') : null;

function isSupportedCurrency(value: string | null): value is SupportedCurrency {
  return value === 'USD' || value === 'EUR';
}

const currentCurrency = ref<SupportedCurrency>(
  isSupportedCurrency(savedCurrency) ? savedCurrency : defaultCurrency.code,
);

const NON_BREAKING_SPACE = /[\u00a0\u202f]/g;

const numberFormatCache = new Map<string, Intl.NumberFormat>();

function getNumberFormat(localeTag: string, currency: SupportedCurrency): Intl.NumberFormat {
  const key = `${localeTag}|${currency}`;
  let formatter = numberFormatCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(localeTag, {
      style: 'currency',
      currency,
      useGrouping: true,
    });
    numberFormatCache.set(key, formatter);
  }
  return formatter;
}

export function useCurrency() {
  const currency = computed(() => currentCurrency.value);

  const currencyInfo = computed((): CurrencyInfo => {
    const found = supportedCurrencies.find((c) => c.code === currentCurrency.value);
    return found ?? defaultCurrency;
  });

  function setCurrency(code: SupportedCurrency): void {
    currentCurrency.value = code;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('triada-currency', code);
    }
  }

  function formatCurrency(amountMinor: number): string {
    const formatted = getNumberFormat(getIntlLocale(getLocale()), currentCurrency.value).format(
      amountMinor / 100,
    );
    return formatted.replace(NON_BREAKING_SPACE, ' ');
  }

  return {
    currency,
    currencyInfo,
    setCurrency,
    formatCurrency,
    supportedCurrencies,
  };
}

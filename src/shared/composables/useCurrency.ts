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

// Amount/symbol gap comes through as U+00A0 or the narrow U+202F depending on
// the ICU version; collapse both to a plain space so output is deterministic
// and matches DOM text queries in tests.
const NON_BREAKING_SPACE = /[\u00a0\u202f]/g;

// `Intl.NumberFormat` construction resolves locale data and is ~10x the cost of
// a `.format()` call; `formatCurrency` runs once per rendered amount (dozens per
// dashboard/year-summary render). Cache one formatter per locale+currency pair
// (at most 2 x 2 combinations).
const numberFormatCache = new Map<string, Intl.NumberFormat>();

function getNumberFormat(localeTag: string, currency: SupportedCurrency): Intl.NumberFormat {
  const key = `${localeTag}|${currency}`;
  let formatter = numberFormatCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(localeTag, {
      style: 'currency',
      currency,
      // Spanish CLDR only groups from 10 000 up; `true` maps to "always" per
      // ECMA-402 so amounts read consistently (1.000,00 € not 1000,00 €).
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

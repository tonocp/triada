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
    const info = currencyInfo.value;
    const amount = amountMinor / 100;
    return `${info.symbol}${amount.toFixed(2)}`;
  }

  return {
    currency,
    currencyInfo,
    setCurrency,
    formatCurrency,
    supportedCurrencies,
  };
}

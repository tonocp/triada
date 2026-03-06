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

const defaultCurrency: CurrencyInfo = supportedCurrencies[0]!;

const savedCurrency = (
  typeof localStorage !== 'undefined' ? localStorage.getItem('triada-currency') : null
) as SupportedCurrency | null;

const currentCurrency = ref<SupportedCurrency>(savedCurrency || 'USD');

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

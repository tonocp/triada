import { setLocale } from '@/shared/i18n';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supportedCurrencies, useCurrency } from './useCurrency';

vi.stubGlobal('localStorage', {
  getItem: vi.fn(),
  setItem: vi.fn(),
});

describe('useCurrency', () => {
  // locale and the module-level currency ref are shared state — reset both
  // before every test since individual tests switch them.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    setLocale('es');
    useCurrency().setCurrency('EUR');
  });

  describe('supportedCurrencies', () => {
    it('should have USD and EUR currencies', () => {
      const codes = supportedCurrencies.map((c) => c.code);
      expect(codes).toContain('USD');
      expect(codes).toContain('EUR');
    });

    it('should have correct symbols', () => {
      const usd = supportedCurrencies.find((c) => c.code === 'USD');
      const eur = supportedCurrencies.find((c) => c.code === 'EUR');
      expect(usd?.symbol).toBe('$');
      expect(eur?.symbol).toBe('€');
    });
  });

  describe('useCurrency', () => {
    it('should return default EUR currency', () => {
      const { currency, currencyInfo } = useCurrency();
      expect(currency.value).toBe('EUR');
      expect(currencyInfo.value.symbol).toBe('€');
    });

    it('should format currency with the active locale conventions (es)', () => {
      const { formatCurrency } = useCurrency();
      expect(formatCurrency(1500)).toBe('15,00 €');
      expect(formatCurrency(100)).toBe('1,00 €');
      expect(formatCurrency(0)).toBe('0,00 €');
    });

    it('should always group thousands, even in the 1 000-9 999 range', () => {
      const { formatCurrency } = useCurrency();
      expect(formatCurrency(500_000)).toBe('5.000,00 €');
      expect(formatCurrency(1_234_567)).toBe('12.345,67 €');
    });

    it('should follow english + USD conventions when configured that way', () => {
      setLocale('en');
      const { formatCurrency, setCurrency } = useCurrency();
      setCurrency('USD');
      expect(formatCurrency(150_000)).toBe('$1,500.00');
    });

    it('should set currency and save to localStorage', () => {
      const { setCurrency } = useCurrency();
      setCurrency('EUR');
      expect(localStorage.setItem).toHaveBeenCalledWith('triada-currency', 'EUR');
    });

    it('should fallback to EUR when saved currency is invalid', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('JPY');

      const { currency, currencyInfo } = useCurrency();

      expect(currency.value).toBe('EUR');
      expect(currencyInfo.value.symbol).toBe('€');
    });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supportedCurrencies, useCurrency } from './useCurrency';

vi.stubGlobal('localStorage', {
  getItem: vi.fn(),
  setItem: vi.fn(),
});

describe('useCurrency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(localStorage.getItem).mockReturnValue(null);
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

    it('should format currency correctly', () => {
      const { formatCurrency } = useCurrency();
      expect(formatCurrency(1500)).toBe('€15.00');
      expect(formatCurrency(100)).toBe('€1.00');
      expect(formatCurrency(0)).toBe('€0.00');
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

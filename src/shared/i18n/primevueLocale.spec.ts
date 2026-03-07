import { describe, expect, it } from 'vitest';
import { getPrimeVueLocale } from './primevueLocale';

describe('shared/i18n primevueLocale', () => {
  it('should return english PrimeVue locale labels', () => {
    const locale = getPrimeVueLocale('en');

    expect(locale.today).toBe('Today');
    expect(locale.clear).toBe('Clear');
    expect(locale.firstDayOfWeek).toBe(0);
    expect(locale.monthNames[0]).toBe('January');
    expect(locale.monthNames[11]).toBe('December');
  });

  it('should return spanish PrimeVue locale labels', () => {
    const locale = getPrimeVueLocale('es');

    expect(locale.today).toBe('Hoy');
    expect(locale.clear).toBe('Limpiar');
    expect(locale.firstDayOfWeek).toBe(1);
    expect(locale.monthNames[0]).toBe('Enero');
    expect(locale.monthNames[11]).toBe('Diciembre');
  });
});

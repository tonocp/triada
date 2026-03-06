import { describe, expect, it } from 'vitest';
import en from './en';
import es from './es';

function collectKeys(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return [prefix];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) => {
    const next = prefix ? `${prefix}.${key}` : key;
    return collectKeys(nested, next);
  });
}

describe('shared/i18n locales parity', () => {
  it('should keep the same translation key shape in english and spanish', () => {
    const enKeys = new Set(collectKeys(en));
    const esKeys = new Set(collectKeys(es));

    expect(enKeys).toEqual(esKeys);
  });

  it('should keep 12 localized month names in both locales', () => {
    expect(en.dashboard.monthNames).toHaveLength(12);
    expect(es.dashboard.monthNames).toHaveLength(12);
  });
});

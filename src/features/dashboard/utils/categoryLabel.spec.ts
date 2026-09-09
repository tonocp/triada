import type { Category } from '@/domain/entities';
import { describe, expect, it } from 'vitest';
import { categoryLabel, categoryLabeller } from './categoryLabel';

function category(partial: Partial<Category>): Category {
  return {
    id: 'housing',
    group: 'needs',
    order: 0,
    isDefault: true,
    isActive: true,
    deletedAt: null,
    ...partial,
  };
}

const translate = (key: string): string | null =>
  key === 'categories.housing' ? 'Vivienda' : null;

describe('categoryLabel', () => {
  it('should prefer a non-blank custom name', () => {
    expect(categoryLabel(category({ name: 'Mascotas' }), 'housing', translate)).toBe('Mascotas');
  });

  it('should fall back to the localized default label', () => {
    expect(categoryLabel(category({ name: '  ' }), 'housing', translate)).toBe('Vivienda');
    expect(categoryLabel(undefined, 'housing', translate)).toBe('Vivienda');
  });

  it('should fall back to the raw id when nothing else resolves', () => {
    expect(categoryLabel(undefined, 'pets', translate)).toBe('pets');
  });
});

describe('categoryLabeller', () => {
  const t = (key: string): string => (key === 'categories.housing' ? 'Vivienda' : key);
  const te = (key: string): boolean => key === 'categories.housing';
  const resolve = categoryLabeller(t, te);

  it('should resolve names through the bound translator', () => {
    expect(resolve(category({ name: 'Mascotas' }), 'housing')).toBe('Mascotas');
    expect(resolve(undefined, 'housing')).toBe('Vivienda');
    expect(resolve(undefined, 'pets')).toBe('pets');
  });
});

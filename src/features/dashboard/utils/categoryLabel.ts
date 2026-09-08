import type { Category, CategoryId } from '@/domain/entities';

/**
 * Display name for a category: its custom name, else the localized default label,
 * else the raw id. `translate` returns the localized string or `null` when the
 * `categories.<id>` key is unknown (a user-created category).
 */
export function categoryLabel(
  category: Category | undefined,
  categoryId: CategoryId,
  translate: (key: string) => string | null,
): string {
  const name = category?.name?.trim();
  if (name) {
    return name;
  }
  return translate(`categories.${categoryId}`) ?? categoryId;
}

/**
 * Bind `categoryLabel` to a vue-i18n instance's `t`/`te` — every view needs a
 * `(category, id) => label` and this is the one place that wraps the translator.
 */
export function categoryLabeller(
  t: (key: string) => string,
  te: (key: string) => boolean,
): (category: Category | undefined, id: CategoryId) => string {
  return (category, id) => categoryLabel(category, id, (key) => (te(key) ? t(key) : null));
}

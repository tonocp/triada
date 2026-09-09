import type { Category, CategoryId } from '@/domain/entities';

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

export function categoryLabeller(
  t: (key: string) => string,
  te: (key: string) => boolean,
): (category: Category | undefined, id: CategoryId) => string {
  return (category, id) => categoryLabel(category, id, (key) => (te(key) ? t(key) : null));
}

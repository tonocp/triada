export const BucketType = {
  NEEDS: 'needs',
  WANTS: 'wants',
  SAVINGS: 'savings',
} as const;

export type BucketType = (typeof BucketType)[keyof typeof BucketType];

export const BUCKET_PERCENTAGES: Record<BucketType, number> = {
  needs: 50,
  wants: 30,
  savings: 20,
};

export const BUCKET_ORDER: readonly BucketType[] = [
  BucketType.NEEDS,
  BucketType.WANTS,
  BucketType.SAVINGS,
];

const BUCKET_ORDER_INDEX: Record<BucketType, number> = {
  needs: 0,
  wants: 1,
  savings: 2,
};

export const BUCKET_LABELS: Record<BucketType, string> = {
  needs: 'Necesidades',
  wants: 'Gastos personales',
  savings: 'Ahorro e inversión',
};

export const BUCKET_ICONS: Record<BucketType, string> = {
  needs: 'pi pi-home',
  wants: 'pi pi-shopping-bag',
  savings: 'pi pi-wallet',
};

export function compareBuckets(left: BucketType, right: BucketType): number {
  return BUCKET_ORDER_INDEX[left] - BUCKET_ORDER_INDEX[right];
}

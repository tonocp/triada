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

export const BUCKET_LABELS: Record<BucketType, string> = {
  needs: 'Needs',
  wants: 'Wants',
  savings: 'Savings',
};

export const BUCKET_ICONS: Record<BucketType, string> = {
  needs: 'pi pi-home',
  wants: 'pi pi-heart',
  savings: 'pi pi-wallet',
};

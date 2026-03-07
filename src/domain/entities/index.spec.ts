import { describe, expect, it } from 'vitest';
import { BUCKET_ORDER, BUCKET_PERCENTAGES, BucketType, compareBuckets } from './index';

describe('domain/entities index exports', () => {
  it('should re-export bucket domain members', () => {
    expect(BucketType.NEEDS).toBe('needs');
    expect(BUCKET_ORDER).toEqual(['needs', 'wants', 'savings']);
    expect(BUCKET_PERCENTAGES.savings).toBe(20);
    expect(compareBuckets('needs', 'savings')).toBeLessThan(0);
  });
});

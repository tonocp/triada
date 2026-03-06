import { describe, expect, it } from 'vitest';
import {
  BUCKET_ICONS,
  BUCKET_ORDER,
  BUCKET_PERCENTAGES,
  BucketType,
  compareBuckets,
} from './Bucket';

describe('domain/entities - Bucket', () => {
  describe('BucketType', () => {
    it('should have needs, wants, savings values', () => {
      expect(BucketType.NEEDS).toBe('needs');
      expect(BucketType.WANTS).toBe('wants');
      expect(BucketType.SAVINGS).toBe('savings');
    });
  });

  describe('BUCKET_PERCENTAGES', () => {
    it('should have correct percentages for 50/30/20 rule', () => {
      expect(BUCKET_PERCENTAGES[BucketType.NEEDS]).toBe(50);
      expect(BUCKET_PERCENTAGES[BucketType.WANTS]).toBe(30);
      expect(BUCKET_PERCENTAGES[BucketType.SAVINGS]).toBe(20);
    });

    it('should total 100', () => {
      const total =
        BUCKET_PERCENTAGES[BucketType.NEEDS] +
        BUCKET_PERCENTAGES[BucketType.WANTS] +
        BUCKET_PERCENTAGES[BucketType.SAVINGS];
      expect(total).toBe(100);
    });
  });

  describe('BUCKET_ORDER', () => {
    it('should preserve needs wants savings order', () => {
      expect(BUCKET_ORDER).toEqual([BucketType.NEEDS, BucketType.WANTS, BucketType.SAVINGS]);
    });
  });

  describe('BUCKET_ICONS', () => {
    it('should have icons for each bucket', () => {
      expect(BUCKET_ICONS[BucketType.NEEDS]).toBe('pi pi-home');
      expect(BUCKET_ICONS[BucketType.WANTS]).toBe('pi pi-shopping-bag');
      expect(BUCKET_ICONS[BucketType.SAVINGS]).toBe('pi pi-wallet');
    });
  });

  describe('compareBuckets', () => {
    it('should sort buckets using domain order', () => {
      const unordered = [BucketType.SAVINGS, BucketType.NEEDS, BucketType.WANTS];
      const sorted = [...unordered].sort(compareBuckets);
      expect(sorted).toEqual([BucketType.NEEDS, BucketType.WANTS, BucketType.SAVINGS]);
    });
  });
});

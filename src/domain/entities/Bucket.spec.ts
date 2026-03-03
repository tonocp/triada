import { describe, expect, it } from 'vitest';
import { BUCKET_ICONS, BUCKET_LABELS, BUCKET_PERCENTAGES, BucketType } from './Bucket';

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

  describe('BUCKET_LABELS', () => {
    it('should have correct labels', () => {
      expect(BUCKET_LABELS[BucketType.NEEDS]).toBe('Needs');
      expect(BUCKET_LABELS[BucketType.WANTS]).toBe('Wants');
      expect(BUCKET_LABELS[BucketType.SAVINGS]).toBe('Savings');
    });
  });

  describe('BUCKET_ICONS', () => {
    it('should have icons for each bucket', () => {
      expect(BUCKET_ICONS[BucketType.NEEDS]).toBeDefined();
      expect(BUCKET_ICONS[BucketType.WANTS]).toBeDefined();
      expect(BUCKET_ICONS[BucketType.SAVINGS]).toBeDefined();
    });
  });
});

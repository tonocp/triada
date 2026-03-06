import { describe, expect, it } from 'vitest';
import { generateUUID, getCurrentTimestamp } from '../database/utils';

describe('database/utils', () => {
  describe('generateUUID', () => {
    it('should generate a valid UUID v4 format', () => {
      const uuid = generateUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
      expect(uuid).toMatch(uuidRegex);
    });

    it('should generate unique UUIDs', () => {
      const uuids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        uuids.add(generateUUID());
      }
      expect(uuids.size).toBe(100);
    });
  });

  describe('getCurrentTimestamp', () => {
    it('should return a valid ISO string', () => {
      const timestamp = getCurrentTimestamp();
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
      expect(timestamp).toMatch(isoRegex);
    });

    it('should return current time', () => {
      const before = new Date().toISOString();
      const timestamp = getCurrentTimestamp();
      const after = new Date().toISOString();
      expect(timestamp >= before).toBe(true);
      expect(timestamp <= after).toBe(true);
    });
  });
});

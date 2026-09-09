import { afterEach, describe, expect, it, vi } from 'vitest';
import { currentPeriod } from './period';

afterEach(() => {
  vi.useRealTimers();
});

describe('currentPeriod', () => {
  it('should return the current year and a 1-indexed month', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T10:00:00Z'));

    expect(currentPeriod()).toEqual({ year: 2026, month: 3 });
  });

  it('should return month 12 for December', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-12-01T00:00:00Z'));

    expect(currentPeriod()).toEqual({ year: 2025, month: 12 });
  });
});

import { describe, expect, it } from 'vitest';
import { fromMinorUnits, toMinorUnits } from './money';

describe('toMinorUnits', () => {
  it('should parse a major-unit string to integer cents', () => {
    expect(toMinorUnits('99.99')).toBe(9999);
    expect(toMinorUnits('7')).toBe(700);
    expect(toMinorUnits('0')).toBe(0);
  });

  it('should round to the nearest cent', () => {
    expect(toMinorUnits('1.006')).toBe(101);
    expect(toMinorUnits('0.014')).toBe(1);
  });

  it('should keep the sign of negative amounts', () => {
    expect(toMinorUnits('-5')).toBe(-500);
  });

  it('should return 0 for input that is not a finite number', () => {
    expect(toMinorUnits('')).toBe(0);
    expect(toMinorUnits('abc')).toBe(0);
  });
});

describe('fromMinorUnits', () => {
  it('should format cents as a fixed 2-decimal string', () => {
    expect(fromMinorUnits(1240)).toBe('12.40');
    expect(fromMinorUnits(0)).toBe('0.00');
    expect(fromMinorUnits(9999)).toBe('99.99');
  });
});

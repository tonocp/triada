import { describe, expect, it } from 'vitest';
import { fromMinorUnits, isPositiveAmount, toMinorUnits } from './money';

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

  it('should accept a comma as the decimal separator', () => {
    expect(toMinorUnits('12,50')).toBe(1250);
    expect(toMinorUnits('0,99')).toBe(99);
    expect(toMinorUnits('1.234,56')).toBe(123456);
  });

  it('should strip a currency symbol or spaces around the amount', () => {
    expect(toMinorUnits(' 12,50 €')).toBe(1250);
  });

  it('should keep the sign of negative amounts', () => {
    expect(toMinorUnits('-5')).toBe(-500);
    expect(toMinorUnits('-5,50')).toBe(-550);
  });

  it('should return 0 for input that is not a finite number', () => {
    expect(toMinorUnits('')).toBe(0);
    expect(toMinorUnits('abc')).toBe(0);
  });
});

describe('isPositiveAmount', () => {
  it('should accept a plain positive number in either separator style', () => {
    expect(isPositiveAmount('1000')).toBe(true);
    expect(isPositiveAmount('1000.55')).toBe(true);
    expect(isPositiveAmount('0,01')).toBe(true);
    expect(isPositiveAmount('1.234,56')).toBe(true);
    expect(isPositiveAmount(' 1500 ')).toBe(true);
  });

  it('should reject zero, empty and whitespace-only input', () => {
    expect(isPositiveAmount('')).toBe(false);
    expect(isPositiveAmount('   ')).toBe(false);
    expect(isPositiveAmount('0')).toBe(false);
    expect(isPositiveAmount('0,00')).toBe(false);
  });

  it('should reject anything that is not just digits and separators', () => {
    expect(isPositiveAmount('abc')).toBe(false);
    expect(isPositiveAmount('12abc')).toBe(false);
    expect(isPositiveAmount('-5')).toBe(false);
    expect(isPositiveAmount('1e5')).toBe(false);
    expect(isPositiveAmount('12,50 €')).toBe(false);
  });
});

describe('fromMinorUnits', () => {
  it('should format cents as a fixed 2-decimal string', () => {
    expect(fromMinorUnits(1240)).toBe('12.40');
    expect(fromMinorUnits(0)).toBe('0.00');
    expect(fromMinorUnits(9999)).toBe('99.99');
  });
});

/**
 * Tests for money parsing and formatting utilities
 */
import { parseMoneyInput, formatMoney, formatNumber } from '../utils/money';

describe('Money Utility Functions', () => {
  describe('parseMoneyInput', () => {
    test('parses shorthand "k" notation', () => {
      expect(parseMoneyInput('50k')).toBe(50000);
      expect(parseMoneyInput('50K')).toBe(50000);
      expect(parseMoneyInput('2.5k')).toBe(2500);
      expect(parseMoneyInput('100k')).toBe(100000);
    });

    test('parses shorthand "M" notation', () => {
      expect(parseMoneyInput('2M')).toBe(2000000);
      expect(parseMoneyInput('2m')).toBe(2000000);
      expect(parseMoneyInput('2.5M')).toBe(2500000);
      expect(parseMoneyInput('1.25m')).toBe(1250000);
    });

    test('parses plain numbers', () => {
      expect(parseMoneyInput('2000000')).toBe(2000000);
      expect(parseMoneyInput('750000')).toBe(750000);
      expect(parseMoneyInput('1500')).toBe(1500);
    });

    test('parses numbers with dollar sign and commas', () => {
      expect(parseMoneyInput('$2,000,000')).toBe(2000000);
      expect(parseMoneyInput('$750,000')).toBe(750000);
      expect(parseMoneyInput('$1,500')).toBe(1500);
    });

    test('handles whitespace', () => {
      expect(parseMoneyInput('  50k  ')).toBe(50000);
      expect(parseMoneyInput(' $2,000,000 ')).toBe(2000000);
    });

    test('returns null for invalid input', () => {
      expect(parseMoneyInput('abc')).toBeNull();
      expect(parseMoneyInput('xyz123')).toBeNull();
      expect(parseMoneyInput('')).toBeNull();
      expect(parseMoneyInput('$')).toBeNull();
    });

    test('handles null and undefined', () => {
      expect(parseMoneyInput(null)).toBeNull();
      expect(parseMoneyInput(undefined)).toBeNull();
    });
  });

  describe('formatMoney', () => {
    test('formats numbers as currency with dollar sign and commas', () => {
      expect(formatMoney(2000000)).toBe('$2,000,000');
      expect(formatMoney(750000)).toBe('$750,000');
      expect(formatMoney(50000)).toBe('$50,000');
      expect(formatMoney(1500)).toBe('$1,500');
    });

    test('handles zero and small numbers', () => {
      expect(formatMoney(0)).toBe('$0');
      expect(formatMoney(1)).toBe('$1');
      expect(formatMoney(100)).toBe('$100');
    });

    test('rounds to whole dollars by default', () => {
      expect(formatMoney(2500.50)).toBe('$2,501');
      expect(formatMoney(999.99)).toBe('$1,000');
    });

    test('includes cents when requested', () => {
      expect(formatMoney(2500.50, true)).toBe('$2,500.50');
      expect(formatMoney(999.99, true)).toBe('$999.99');
    });

    test('handles invalid input', () => {
      expect(formatMoney(null)).toBe('$0');
      expect(formatMoney(undefined)).toBe('$0');
      expect(formatMoney(NaN)).toBe('$0');
    });
  });

  describe('formatNumber', () => {
    test('formats numbers with commas but no dollar sign', () => {
      expect(formatNumber(2000000)).toBe('2,000,000');
      expect(formatNumber(750000)).toBe('750,000');
      expect(formatNumber(1500)).toBe('1,500');
    });

    test('handles invalid input', () => {
      expect(formatNumber(null)).toBe('0');
      expect(formatNumber(undefined)).toBe('0');
      expect(formatNumber(NaN)).toBe('0');
    });
  });

  describe('Round-trip parsing and formatting', () => {
    test('50k -> 50000 -> $50,000', () => {
      const parsed = parseMoneyInput('50k');
      const formatted = formatMoney(parsed);
      expect(formatted).toBe('$50,000');
    });

    test('2M -> 2000000 -> $2,000,000', () => {
      const parsed = parseMoneyInput('2M');
      const formatted = formatMoney(parsed);
      expect(formatted).toBe('$2,000,000');
    });

    test('$750,000 -> 750000 -> $750,000', () => {
      const parsed = parseMoneyInput('$750,000');
      const formatted = formatMoney(parsed);
      expect(formatted).toBe('$750,000');
    });
  });
});

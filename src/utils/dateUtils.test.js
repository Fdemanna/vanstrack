import { describe, it, expect } from 'vitest';
import { formatDate, formatDateDisplay, formatGroupDate, formatMonth, getMonthRange } from './dateUtils';

describe('dateUtils', () => {
  it('formatDate returns YYYY-MM-DD from a Date object', () => {
    // 1 de Enero de 2026 local
    const date = new Date(2026, 0, 1);
    expect(formatDate(date)).toBe('2026-01-01');
  });

  it('formatDateDisplay returns formatted short date', () => {
    // Retorna algo como "jue, 1 ene" (depende del locale es-ES)
    const result = formatDateDisplay('2026-01-01');
    expect(result).toContain('1');
    expect(result).toContain('ene');
  });

  it('formatGroupDate returns long formatted date', () => {
    const result = formatGroupDate('2026-01-01');
    expect(result).toContain('1');
    expect(result).toContain('enero');
  });

  it('formatMonth returns month and year', () => {
    const date = new Date(2026, 0, 15);
    const result = formatMonth(date);
    expect(result).toContain('enero');
    expect(result).toContain('2026');
  });

  it('getMonthRange returns correct start and end dates', () => {
    const date = new Date(2026, 1, 15); // Febrero 2026 (año no bisiesto)
    const range = getMonthRange(date);
    expect(range.start).toBe('2026-02-01');
    expect(range.end).toBe('2026-02-28');
  });

  it('getMonthRange handles leap years correctly', () => {
    const date = new Date(2024, 1, 15); // Febrero 2024 (año bisiesto)
    const range = getMonthRange(date);
    expect(range.start).toBe('2024-02-01');
    expect(range.end).toBe('2024-02-29');
  });

  describe('Edge Cases (Intentando romperlo)', () => {
    it('formatDate with null should throw or handle gracefully', () => {
      expect(() => formatDate(null)).toThrow(TypeError);
    });

    it('formatDateDisplay with invalid string should return Invalid Date', () => {
      const result = formatDateDisplay('invalid-date-string');
      // toLocaleDateString on invalid date returns "Invalid Date"
      expect(result).toBe('Invalid Date');
    });

    it('getMonthRange with undefined should throw', () => {
      expect(() => getMonthRange(undefined)).toThrow(TypeError);
    });
  });
});

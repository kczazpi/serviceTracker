import { afterEach, describe, expect, it, vi } from 'vitest';
import { addMonths, defaultDateFor, formatDayLabel, formatHours, formatMonth, monthRange, toIsoDate } from './dates';

afterEach(() => vi.useRealTimers());

describe('monthRange', () => {
  it('covers the whole month', () => {
    expect(monthRange({ year: 2026, month: 9 })).toEqual({ from: '2026-10-01', to: '2026-10-31' });
  });

  it('knows about leap years', () => {
    expect(monthRange({ year: 2028, month: 1 }).to).toBe('2028-02-29');
    expect(monthRange({ year: 2027, month: 1 }).to).toBe('2027-02-28');
  });
});

describe('addMonths', () => {
  it('rolls over year boundaries in both directions', () => {
    expect(addMonths({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
    expect(addMonths({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
    expect(addMonths({ year: 2026, month: 5 }, -18)).toEqual({ year: 2024, month: 11 });
  });
});

describe('defaultDateFor', () => {
  it('is today when today is inside the month, otherwise the first day', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 16, 12));

    expect(defaultDateFor({ year: 2026, month: 9 })).toBe('2026-10-16');
    expect(defaultDateFor({ year: 2026, month: 10 })).toBe('2026-11-01');
  });
});

describe('formatting', () => {
  it('formats local dates as yyyy-MM-dd with zero padding', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('formats day labels and months without time zone shifts', () => {
    expect(formatDayLabel('2026-10-16')).toBe('Fri, Oct 16');
    expect(formatMonth({ year: 2026, month: 9 })).toBe('October 2026');
  });

  it('trims floating point noise from hours', () => {
    expect(formatHours(8)).toBe('8');
    expect(formatHours(7.5)).toBe('7.5');
    expect(formatHours(0.1 + 0.2)).toBe('0.3');
  });
});

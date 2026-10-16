import { describe, expect, it } from 'vitest';
import {
  addMonths,
  dayOfMonth,
  daysInMonth,
  formatDate,
  formatDayLabel,
  formatHours,
  formatMonth,
  formatMonthShort,
  monthRange,
  toIsoDate,
  weekdayOffset,
} from './dates';

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

describe('calendar layout', () => {
  it('lists every date of the month in order', () => {
    const october = daysInMonth({ year: 2026, month: 9 });

    expect(october).toHaveLength(31);
    expect(october[0]).toBe('2026-10-01');
    expect(october[30]).toBe('2026-10-31');
    expect(daysInMonth({ year: 2028, month: 1 })).toHaveLength(29);
    expect(daysInMonth({ year: 2027, month: 1 })).toHaveLength(28);
  });

  it('counts the empty cells before the 1st when weeks start on Monday', () => {
    expect(weekdayOffset({ year: 2026, month: 9 })).toBe(3); // Thu 1 Oct 2026
    expect(weekdayOffset({ year: 2027, month: 1 })).toBe(0); // Mon 1 Feb 2027
    expect(weekdayOffset({ year: 2026, month: 10 })).toBe(6); // Sun 1 Nov 2026
  });

  it('extracts the day of the month', () => {
    expect(dayOfMonth('2026-10-05')).toBe(5);
    expect(dayOfMonth('2026-10-31')).toBe(31);
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

describe('more formatting', () => {
  it('formats short month names and dates independent of the time zone', () => {
    expect(formatMonthShort({ year: 2026, month: 0 })).toBe('Jan');
    expect(formatDate('2026-10-15T12:00:00Z')).toBe('Oct 15, 2026');
    expect(formatDate('2026-10-15T00:00:00+00:00')).toBe('Oct 15, 2026');
  });

  it('returns an empty string instead of throwing for something that is not a date', () => {
    expect(formatDate('')).toBe('');
    expect(formatDate('not a date')).toBe('');
  });
});

import { describe, expect, it } from 'vitest';
import type { WorkDay } from './api';
import { computeStats } from './stats';

const day = (date: string, workedHours: number): WorkDay => ({ id: date, userId: 'u', date, workedHours });

describe('computeStats', () => {
  it('handles a user who has logged nothing', () => {
    const stats = computeStats([], '2026-10-16');

    expect(stats).toMatchObject({
      totalHours: 0, totalDays: 0, averageHours: 0, monthHours: 0, monthDays: 0, yearHours: 0,
      longestDay: null, currentStreak: 0, longestStreak: 0,
    });
    expect(stats.recentMonths).toHaveLength(6);
    expect(stats.recentMonths.every((m) => m.hours === 0)).toBe(true);
  });

  it('adds up total, month and year hours, splitting at the boundaries', () => {
    const stats = computeStats(
      [
        day('2025-12-31', 7), // last year
        day('2026-01-05', 8), // this year
        day('2026-09-30', 8), // last month
        day('2026-10-01', 4), // first day of this month
        day('2026-10-16', 6.5),
      ],
      '2026-10-16',
    );

    expect(stats.totalHours).toBe(33.5);
    expect(stats.totalDays).toBe(5);
    expect(stats.averageHours).toBe(6.7);
    expect(stats.monthHours).toBe(10.5);
    expect(stats.monthDays).toBe(2);
    expect(stats.yearHours).toBe(26.5);
  });

  it('removes floating point noise', () => {
    const stats = computeStats([day('2026-10-14', 0.1), day('2026-10-15', 0.2)], '2026-10-16');

    expect(stats.totalHours).toBe(0.3);
    expect(stats.monthHours).toBe(0.3);
  });

  it('finds the longest day, preferring the earlier one on a tie', () => {
    const stats = computeStats([day('2026-10-02', 12), day('2026-10-01', 12), day('2026-10-03', 8)], '2026-10-16');

    expect(stats.longestDay).toEqual({ date: '2026-10-01', hours: 12 });
  });

  describe('streaks', () => {
    it('counts consecutive days up to today', () => {
      const stats = computeStats([day('2026-10-14', 8), day('2026-10-15', 8), day('2026-10-16', 8)], '2026-10-16');

      expect(stats.currentStreak).toBe(3);
      expect(stats.longestStreak).toBe(3);
    });

    it("keeps the streak alive when today isn't logged yet but yesterday is", () => {
      const stats = computeStats([day('2026-10-14', 8), day('2026-10-15', 8)], '2026-10-16');

      expect(stats.currentStreak).toBe(2);
    });

    it('resets once a day was missed, while remembering the longest run', () => {
      const stats = computeStats(
        [day('2026-10-01', 8), day('2026-10-02', 8), day('2026-10-03', 8), day('2026-10-04', 8), day('2026-10-14', 8)],
        '2026-10-16',
      );

      expect(stats.currentStreak).toBe(0);
      expect(stats.longestStreak).toBe(4);
    });

    it('counts a single logged day as a streak of one', () => {
      const stats = computeStats([day('2026-10-16', 8)], '2026-10-16');

      expect(stats.currentStreak).toBe(1);
      expect(stats.longestStreak).toBe(1);
    });

    it('runs across month ends, leap days and daylight saving changes', () => {
      expect(computeStats([day('2028-02-28', 1), day('2028-02-29', 1), day('2028-03-01', 1)], '2028-03-10').longestStreak).toBe(3);
      expect(computeStats([day('2026-03-28', 1), day('2026-03-29', 1), day('2026-03-30', 1)], '2026-04-10').longestStreak).toBe(3);
      expect(computeStats([day('2026-10-31', 1), day('2026-11-01', 1)], '2026-11-02').currentStreak).toBe(2);
    });
  });

  describe('recent months', () => {
    it('lists the last six months, oldest first, ending with the current one', () => {
      const stats = computeStats([day('2026-09-30', 8), day('2026-10-14', 4), day('2026-10-15', 12)], '2026-10-16');

      expect(stats.recentMonths.map((m) => m.label)).toEqual(['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']);
      expect(stats.recentMonths.map((m) => m.hours)).toEqual([0, 0, 0, 0, 8, 16]);
    });

    it('crosses the year boundary', () => {
      const stats = computeStats([day('2025-09-10', 5), day('2025-12-31', 7), day('2026-02-10', 3)], '2026-02-10');

      expect(stats.recentMonths.map((m) => `${m.label} ${m.year}`)).toEqual([
        'Sep 2025', 'Oct 2025', 'Nov 2025', 'Dec 2025', 'Jan 2026', 'Feb 2026',
      ]);
      expect(stats.recentMonths.map((m) => m.hours)).toEqual([5, 0, 0, 7, 0, 3]);
    });

    it('ignores days older than the window', () => {
      const stats = computeStats([day('2026-04-30', 9)], '2026-10-16');

      expect(stats.recentMonths.every((m) => m.hours === 0)).toBe(true);
      expect(stats.totalHours).toBe(9);
    });
  });
});

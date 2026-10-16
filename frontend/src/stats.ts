import type { WorkDay } from './api';
import { addMonths, formatMonthShort, type YearMonth } from './dates';

export interface MonthTotal {
  year: number;
  month: number;
  /** "Oct" */
  label: string;
  hours: number;
}

export interface Stats {
  totalHours: number;
  totalDays: number;
  /** Average hours per logged day. */
  averageHours: number;
  monthHours: number;
  monthDays: number;
  yearHours: number;
  /** The day with the most hours (the earliest one if several tie). */
  longestDay: { date: string; hours: number } | null;
  /** Consecutive logged days up to today (or up to yesterday if today isn't logged yet). */
  currentStreak: number;
  longestStreak: number;
  /** The last few months, oldest first, ending with the current month. */
  recentMonths: MonthTotal[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Days since 1970-01-01 for a yyyy-MM-dd date; UTC based so daylight saving can't skew the differences. */
const dayNumber = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
};

export function computeStats(days: WorkDay[], today: string, monthsBack = 6): Stats {
  const thisMonthKey = today.slice(0, 7);
  const thisYear = today.slice(0, 4);

  let totalHours = 0;
  let monthHours = 0;
  let monthDays = 0;
  let yearHours = 0;
  let longestDay: Stats['longestDay'] = null;
  const hoursByMonth = new Map<string, number>();

  for (const day of [...days].sort((a, b) => a.date.localeCompare(b.date))) {
    totalHours += day.workedHours;
    if (day.date.startsWith(thisYear)) yearHours += day.workedHours;
    if (day.date.startsWith(thisMonthKey)) {
      monthHours += day.workedHours;
      monthDays += 1;
    }
    const key = day.date.slice(0, 7);
    hoursByMonth.set(key, (hoursByMonth.get(key) ?? 0) + day.workedHours);
    if (!longestDay || day.workedHours > longestDay.hours) longestDay = { date: day.date, hours: day.workedHours };
  }

  // streaks
  const numbers = [...new Set(days.map((d) => dayNumber(d.date)))].sort((a, b) => a - b);
  let longestStreak = 0;
  let run = 0;
  let previous = Number.NaN;
  for (const n of numbers) {
    run = n === previous + 1 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    previous = n;
  }

  const logged = new Set(numbers);
  const todayNumber = dayNumber(today);
  let cursor = logged.has(todayNumber) ? todayNumber : todayNumber - 1;
  let currentStreak = 0;
  while (logged.has(cursor)) {
    currentStreak += 1;
    cursor -= 1;
  }

  const currentMonth: YearMonth = { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 };
  const recentMonths: MonthTotal[] = [];
  for (let back = monthsBack - 1; back >= 0; back--) {
    const ym = addMonths(currentMonth, -back);
    const key = `${ym.year}-${String(ym.month + 1).padStart(2, '0')}`;
    recentMonths.push({ ...ym, label: formatMonthShort(ym), hours: round2(hoursByMonth.get(key) ?? 0) });
  }

  return {
    totalHours: round2(totalHours),
    totalDays: days.length,
    averageHours: days.length === 0 ? 0 : round2(totalHours / days.length),
    monthHours: round2(monthHours),
    monthDays,
    yearHours: round2(yearHours),
    longestDay,
    currentStreak,
    longestStreak,
    recentMonths,
  };
}

// Work days are plain calendar dates ("yyyy-MM-dd"), so everything here avoids time zones:
// dates are built from their parts and formatted in UTC.

export interface YearMonth {
  year: number;
  /** 0-based, like Date#getMonth */
  month: number;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar date of `date` as yyyy-MM-dd. */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

export function currentMonth(): YearMonth {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

export function monthRange({ year, month }: YearMonth): { from: string; to: string } {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return {
    from: `${year}-${pad(month + 1)}-01`,
    to: `${year}-${pad(month + 1)}-${pad(lastDay)}`,
  };
}

/** Every date of the month as yyyy-MM-dd, in order. */
export function daysInMonth({ year, month }: YearMonth): string[] {
  const count = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: count }, (_, i) => `${year}-${pad(month + 1)}-${pad(i + 1)}`);
}

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/** Empty cells before the 1st of the month when weeks start on Monday (Mon = 0 … Sun = 6). */
export function weekdayOffset({ year, month }: YearMonth): number {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

/** "2026-10-16" -> 16 */
export function dayOfMonth(iso: string): number {
  return Number(iso.slice(8, 10));
}

export function addMonths({ year, month }: YearMonth, delta: number): YearMonth {
  const index = year * 12 + month + delta;
  return { year: Math.floor(index / 12), month: ((index % 12) + 12) % 12 };
}

export function formatMonth({ year, month }: YearMonth): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month, 1)),
  );
}

/** "Fri, Oct 16" */
export function formatDayLabel(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

/** 8 -> "8", 7.5 -> "7.5", 0.1 + 0.2 -> "0.3" */
export function formatHours(hours: number): string {
  return String(Math.round(hours * 100) / 100);
}

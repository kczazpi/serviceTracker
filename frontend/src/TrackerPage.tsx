import { useEffect, useMemo, useState } from 'react';
import { ApiError, createWorkDay, deleteWorkDay, listWorkDays, updateWorkDay, type WorkDay } from './api';
import Calendar from './Calendar';
import {
  addMonths,
  currentMonth,
  formatHours,
  formatMonth,
  isCurrentOrFutureMonth,
  monthRange,
  todayIso,
  type YearMonth,
} from './dates';
import ErrorList from './ErrorList';

const errorMessages = (err: unknown) => (err instanceof ApiError ? err.messages : ['Something went wrong.']);
const sortByDate = (a: WorkDay, b: WorkDay) => a.date.localeCompare(b.date);

export default function TrackerPage() {
  const [month, setMonth] = useState<YearMonth>(currentMonth);
  const [days, setDays] = useState<WorkDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [openDate, setOpenDate] = useState<string | null>(null);

  const range = useMemo(() => monthRange(month), [month]);
  const daysByDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrors([]);
    listWorkDays(range.from, range.to)
      .then((items) => {
        if (!cancelled) setDays(items);
      })
      .catch((err) => {
        if (!cancelled) {
          setDays([]);
          setErrors(errorMessages(err));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  function changeMonth(delta: number) {
    setMonth((current) => addMonths(current, delta));
    setOpenDate(null);
  }

  // Picking hours on an empty day logs it; on a logged day it changes the hours.
  async function handleSelectHours(date: string, hours: number) {
    const existing = daysByDate.get(date);
    if (existing?.workedHours === hours) {
      setOpenDate(null);
      return;
    }

    setErrors([]);
    setSaving(true);
    try {
      const saved = existing ? await updateWorkDay(existing.id, hours) : await createWorkDay(date, hours);
      setDays((current) =>
        existing ? current.map((d) => (d.id === saved.id ? saved : d)) : [...current, saved].sort(sortByDate),
      );
      setOpenDate(null);
    } catch (err) {
      setErrors(errorMessages(err)); // the menu stays open so the user can pick again
    } finally {
      setSaving(false);
    }
  }

  async function handleClear(date: string) {
    const existing = daysByDate.get(date);
    if (!existing) return;

    setErrors([]);
    setSaving(true);
    try {
      await deleteWorkDay(existing.id);
      setDays((current) => current.filter((d) => d.id !== existing.id));
      setOpenDate(null);
    } catch (err) {
      setErrors(errorMessages(err));
    } finally {
      setSaving(false);
    }
  }

  const total = days.reduce((sum, d) => sum + d.workedHours, 0);

  const today = todayIso();
  const atCurrentMonth = isCurrentOrFutureMonth(month, today);

  return (
    <main className="card wide">
      <nav className="month-nav">
        <button type="button" aria-label="Previous month" disabled={saving} onClick={() => changeMonth(-1)}>
          ‹
        </button>
        <h2>{formatMonth(month)}</h2>
        <button type="button" aria-label="Next month" disabled={saving || atCurrentMonth} onClick={() => changeMonth(1)}>
          ›
        </button>
      </nav>

      <p className="hint">Click a day to log your hours. Days with hours turn green.</p>

      <ErrorList messages={errors} />

      <Calendar
        month={month}
        daysByDate={daysByDate}
        today={today}
        openDate={openDate}
        loading={loading}
        busy={saving}
        onOpen={setOpenDate}
        onSelectHours={handleSelectHours}
        onClear={handleClear}
      />

      <p className="summary">
        {loading
          ? 'Loading…'
          : `${days.length} ${days.length === 1 ? 'day' : 'days'} logged · ${formatHours(total)} h`}
      </p>
    </main>
  );
}

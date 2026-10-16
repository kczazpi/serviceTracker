import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ApiError, createWorkDay, deleteWorkDay, listWorkDays, updateWorkDay, type User, type WorkDay } from './api';
import {
  addMonths,
  currentMonth,
  defaultDateFor,
  formatDayLabel,
  formatHours,
  formatMonth,
  monthRange,
  type YearMonth,
} from './dates';
import ErrorList from './ErrorList';

interface Props {
  user: User;
  onLogout: () => void;
}

const errorMessages = (err: unknown) => (err instanceof ApiError ? err.messages : ['Something went wrong.']);
const byDate = (a: WorkDay, b: WorkDay) => a.date.localeCompare(b.date);

export default function TrackerPage({ user, onLogout }: Props) {
  const [month, setMonth] = useState<YearMonth>(currentMonth);
  const [days, setDays] = useState<WorkDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  const [date, setDate] = useState(() => defaultDateFor(month));
  const [hours, setHours] = useState('');
  const [saving, setSaving] = useState(false);

  const range = useMemo(() => monthRange(month), [month]);

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
    const next = addMonths(month, delta);
    setMonth(next);
    setDate(defaultDateFor(next));
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setErrors([]);
    setSaving(true);
    try {
      const created = await createWorkDay(date, Number(hours));
      setDays((current) => [...current, created].sort(byDate));
      setHours('');
    } catch (err) {
      setErrors(errorMessages(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string, workedHours: number): Promise<boolean> {
    setErrors([]);
    try {
      const updated = await updateWorkDay(id, workedHours);
      setDays((current) => current.map((d) => (d.id === id ? updated : d)));
      return true;
    } catch (err) {
      setErrors(errorMessages(err));
      return false;
    }
  }

  async function handleDelete(id: string) {
    setErrors([]);
    try {
      await deleteWorkDay(id);
      setDays((current) => current.filter((d) => d.id !== id));
    } catch (err) {
      setErrors(errorMessages(err));
    }
  }

  const total = days.reduce((sum, d) => sum + d.workedHours, 0);

  return (
    <div className="page">
      <header className="topbar">
        <strong>Service Tracker</strong>
        <span>
          {user.name} {user.surname}
        </span>
        <button type="button" onClick={onLogout}>
          Sign out
        </button>
      </header>

      <main className="card">
        <nav className="month-nav">
          <button type="button" aria-label="Previous month" onClick={() => changeMonth(-1)}>
            ‹
          </button>
          <h2>{formatMonth(month)}</h2>
          <button type="button" aria-label="Next month" onClick={() => changeMonth(1)}>
            ›
          </button>
        </nav>

        <form className="add-form" onSubmit={handleAdd}>
          <label>
            Date
            <input type="date" value={date} min={range.from} max={range.to} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label>
            Hours
            <input
              type="number"
              inputMode="decimal"
              min="0.01"
              max="24"
              step="any"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="primary" disabled={saving}>
            Add day
          </button>
        </form>

        <ErrorList messages={errors} />

        {loading ? (
          <p className="muted">Loading…</p>
        ) : days.length === 0 ? (
          <p className="muted">No work days logged for this month.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Hours</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <DayRow key={day.id} day={day} onSave={handleUpdate} onDelete={handleDelete} />
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th>
                  {days.length} {days.length === 1 ? 'day' : 'days'}
                </th>
                <th>{formatHours(total)} h</th>
                <th />
              </tr>
            </tfoot>
          </table>
        )}
      </main>
    </div>
  );
}

interface RowProps {
  day: WorkDay;
  onSave: (id: string, hours: number) => Promise<boolean>;
  onDelete: (id: string) => void;
}

function DayRow({ day, onSave, onDelete }: RowProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(day.workedHours));
  const label = formatDayLabel(day.date);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (await onSave(day.id, Number(value))) setEditing(false);
  }

  if (editing) {
    return (
      <tr>
        <td>{label}</td>
        <td colSpan={2}>
          <form className="inline-edit" onSubmit={save}>
            <input
              type="number"
              aria-label={`Hours for ${label}`}
              min="0.01"
              max="24"
              step="any"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
              autoFocus
            />
            <button type="submit" className="primary">
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setValue(String(day.workedHours));
              }}
            >
              Cancel
            </button>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td>{label}</td>
      <td>{formatHours(day.workedHours)} h</td>
      <td className="actions">
        <button type="button" aria-label={`Edit ${label}`} onClick={() => setEditing(true)}>
          Edit
        </button>
        <button type="button" aria-label={`Delete ${label}`} className="danger" onClick={() => onDelete(day.id)}>
          Delete
        </button>
      </td>
    </tr>
  );
}
